# NBV chatbot lead capture

Visitors who ask the nbvgroup.ca chatbot to be contacted by Lou are now captured
as **leads**: the details are stored, Lou is emailed immediately with the
conversation, and the visitor gets a confirmation in Lou's voice. Nobody is
asked to create an account.

## Feature flag (review on staging first)

| Variable | Default | Purpose |
|---|---|---|
| `NBV_LEAD_CAPTURE_ENABLED` | `false` | `true` turns on the new prompt (short answers, site links, lead capture tool, no account prompts). `false` keeps the previous production prompt byte for byte, with no tool. |
| `NBV_CHAT_MODEL` | `claude-sonnet-4-6` | Model used by `POST /shorten/nbv`. |
| `LEAD_NOTIFY_TO` | `lounatale@nbvgroup.ca` | Recipient of "Website lead" emails. |
| `LEAD_NOTIFY_CC` | `CONTACT_RECIPIENT` | Copy recipient (Sami). |
| `ADMIN_DASHBOARD_URL` | `https://nbvgroup.ca/admin/chat-history` | Base of the dashboard session link in the email; the session id is appended. |

Everything else (IP fix, `pagePath`, `leads` table, admin leads API, lead
counts on sessions) is active regardless of the flag.

## How a lead is captured

1. The chat model is given one tool, `request_contact`, with fields `name`
   (required), `phone`, `email`, `preferredMethod` (`phone | email | either`),
   `bestTime`, `topic` and `conversationSummary` (3-5 lines for Lou).
2. The prompt tells the model: when a visitor asks to be contacted, called, or
   for Lou to reach out, or volunteers a phone number or email, reply with
   "Lou would be happy to contact you, how would you like to be reached?",
   collect name plus phone or email, then call the tool in the same turn.
3. `validateRequestContactInput` (`src/modules/leads/utils/lead-input.ts`)
   requires a name and at least one of phone or email, validates the email
   format, and keeps the phone as typed plus an E.164 form (`phoneE164`) when
   it parses (default region CA). Validation errors go back to the model as a
   tool error so it asks the visitor for what is missing.
4. A row is inserted in `leads` with the session id, page path, IP and user agent.
5. After the final reply is produced and the chat is saved, Lou is emailed
   (`EmailService.sendLeadNotification`): subject
   `Website lead: {name} wants to be contacted`, tel/mailto links, preferred
   method, best time, topic, page, time, the model's conversation summary, the
   full timestamped transcript, and a dashboard link. One retry after 1.5 s;
   failures are logged and never break the chat reply.
6. The tool returns a confirmation sentence that the model relays: details
   confirmed back as links, "Lou will contact you directly ... typically within
   one business day", and "anything else?".

Up to three model round trips are allowed per request (tool call + answer).

## Prompt changes when the flag is on

- No "create a free account" / "log in" / "chat isn't being saved" lines.
- Never says it cannot pass information to Lou.
- At most 3-4 sentences per answer; one specific point from the relevant
  service, a link to the matching page as a full `https://nbvgroup.ca/...`
  URL, and the offer "I can also have Lou contact you with details."
- Markdown link rules unchanged (`[text](url)`, `mailto:`, `tel:`, `https://`,
  "Phone: number" on one line).
- If the request carries `pagePath`, the model is told
  "The visitor is currently on page {pagePath}".

The prompt lives in `src/modules/shorten/prompts/` (`nbv-knowledge.ts` is the
shared company content, `nbv-system-prompt.ts` holds the legacy and new
behaviour rules).

## Request changes: `POST /shorten/nbv`

```json
{
  "messages": [{ "role": "user", "content": "Can Lou call me?" }],
  "sessionId": "optional uuid",
  "pagePath": "/services/Sales_Coaching"
}
```

`pagePath` is optional, max 200 characters, stored on
`chat_sessions.lastPagePath` and `leads.pagePath`.

The response is unchanged: a JSON array whose first element is the reply.

## IP address and user agent

`main.ts` sets `trust proxy` to 1 on the Express adapter and the controller
reads the first address of `X-Forwarded-For`, then `X-Real-IP`, then
`request.ip` (`src/common/utils/client-ip.ts`). The user agent is stored on
the session on creation and back-filled if missing.

## Message storage fix

The widget resends the whole conversation every turn and the service used to
store all of it again, so sessions contained duplicate rows. The service now
stores only the messages beyond the session's current `messageCount`.
Existing sessions keep their duplicates; new turns are stored once.

## Admin API (JWT, admin role, same guards as chat-history)

### `GET /admin/leads`

Query: `page` (default 1), `limit` (default 20, max 100), `status`
(`new | contacted | closed`), `startDate`, `endDate` (ISO 8601).

```json
{
  "leads": [
    {
      "id": "...", "sessionId": "...", "name": "Cheri",
      "phone": "416-555-0100", "phoneE164": "+14165550100", "email": null,
      "preferredMethod": "phone", "bestTime": "mornings",
      "topic": "Coaching for her sales team", "pagePath": "/services/Sales_Coaching",
      "ip": "203.0.113.7", "userAgent": "...", "status": "new", "notes": null,
      "createdAt": "...", "updatedAt": "...", "messageCount": 4
    }
  ],
  "total": 1, "page": 1, "limit": 20, "totalPages": 1
}
```

Newest first.

### `PATCH /admin/leads/:id`

Body: `{ "status"?: "new" | "contacted" | "closed", "notes"?: string }`.
Returns the updated lead. 404 when the id is unknown.

### `GET /admin/chat-history/sessions`

Still sorted by `lastMessageAt` descending; each session now includes
`leadCount` and `lastPagePath`. The session detail endpoint includes the same
two fields.

## Tests

`npm test` covers:

- tool validation (missing both phone and email is rejected, email format,
  phone normalisation);
- the anonymous conversation "Can Lou call me? Cheri, 416-555-0100" producing
  one lead row, one email (mocked transport, to Lou with a copy to Sami) and a
  reply containing the number and "Lou will contact you";
- an ordinary question producing no lead and no email;
- the reply still being delivered when the email fails twice;
- the message de-duplication;
- the legacy prompt being used with no tools when the flag is off;
- `ipAddress` differing between two requests with different
  `X-Forwarded-For` headers.

## Sample transcripts for Lou

`docs/NBV_LEAD_CAPTURE_SAMPLES.md` holds three conversations generated against
the real model with the flag on (contact request, service questions, no
contact intent) plus the email Lou would have received. Regenerate with:

```bash
npx ts-node -r tsconfig-paths/register scripts/nbv-sample-transcripts.ts > docs/NBV_LEAD_CAPTURE_SAMPLES.md
```

The script stubs the database and email, so nothing is stored or sent.

## Rollout

1. Deploy with `NBV_LEAD_CAPTURE_ENABLED=false` (default). TypeORM
   `synchronize` creates the `leads` table and the `lastPagePath` column.
2. On staging set `NBV_LEAD_CAPTURE_ENABLED=true` and, if emails should not
   reach Lou yet, `LEAD_NOTIFY_TO` to Sami's address.
3. Once Lou approves, set the flag to `true` in production.
