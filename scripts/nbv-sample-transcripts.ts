/**
 * Generates three sample transcripts against the real Anthropic API with the lead
 * capture flag ON, using in-memory repositories and a captured (not sent) email.
 * Run from the project root (no email is sent, nothing is written to the database):
 *   npx ts-node -r tsconfig-paths/register scripts/nbv-sample-transcripts.ts > docs/NBV_LEAD_CAPTURE_SAMPLES.md
 */
import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.join(__dirname, '..');
// Load .env manually (only ANTHROPIC_API_KEY is needed)
for (const line of fs
  .readFileSync(path.join(ROOT, '.env'), 'utf8')
  .split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
process.env.NBV_LEAD_CAPTURE_ENABLED = 'true';

import { ShortenService } from '../src/modules/shorten/services/shorten.service';
import { ChatHistoryService } from '../src/modules/chat-history/services/chat-history.service';
import { LeadsService } from '../src/modules/leads/services/leads.service';
import { LeadNotificationData } from '../src/modules/email/services/email.service';

class FakeRepository<T extends { id?: string }> {
  rows: T[] = [];
  private seq = 0;
  create(obj: Partial<T>): T {
    return { ...obj } as T;
  }
  async save(entity: T): Promise<T> {
    if (!entity.id) {
      entity.id = `id-${++this.seq}`;
      (entity as any).createdAt = new Date();
      this.rows.push(entity);
    }
    return entity;
  }
  async findOne(opts: { where: Partial<T> }): Promise<T | null> {
    return (
      this.rows.find((r) =>
        Object.entries(opts.where).every(([k, v]) => (r as any)[k] === v),
      ) ?? null
    );
  }
  async find(opts: {
    where: Partial<T>;
    order?: Record<string, string>;
  }): Promise<T[]> {
    const rows = this.rows.filter((r) =>
      Object.entries(opts.where).every(([k, v]) => (r as any)[k] === v),
    );
    const [key] = Object.entries(opts.order ?? {})[0] ?? [];
    if (key) rows.sort((a, b) => (a as any)[key] - (b as any)[key]);
    return rows;
  }
}

const emails: LeadNotificationData[] = [];
let conversationCount = 0;
const emailService: any = {
  sendLeadNotification: async (d: LeadNotificationData) => {
    emails.push(d);
    return true;
  },
  sendGuestWelcomeEmail: async () => undefined,
};

async function runConversation(
  title: string,
  turns: string[],
  pagePath?: string,
): Promise<string> {
  const sessions = new FakeRepository<any>();
  const messagesRepo = new FakeRepository<any>();
  const leads = new FakeRepository<any>();
  const leadsService = new LeadsService(leads as any, sessions as any);
  const chatHistory = new ChatHistoryService(
    sessions as any,
    messagesRepo as any,
    leadsService,
  );
  const service = new ShortenService(
    chatHistory,
    { findOrCreateGuestUser: async () => ({}) } as any,
    emailService,
    leadsService,
  );

  const history: { role: 'user' | 'assistant'; content: string }[] = [];
  const out: string[] = [
    `## ${title}`,
    '',
    pagePath ? `Visitor page: \`${pagePath}\`` : 'Visitor page: (none sent)',
    '',
  ];
  const sessionId = '00000000-0000-4000-8000-00000000000' + ++conversationCount;
  for (const turn of turns) {
    history.push({ role: 'user', content: turn });
    const result = await service.proxyNbvChatBot(
      history,
      sessionId,
      undefined,
      { ipAddress: '203.0.113.7', userAgent: 'sample-script', pagePath },
    );
    const reply = Array.isArray(result)
      ? result.join('\n')
      : `ERROR: ${JSON.stringify(result)}`;
    history.push({ role: 'assistant', content: reply });
    out.push(
      `**Visitor:** ${turn}`,
      '',
      `**Assistant:**`,
      '',
      reply
        .split('\n')
        .map((l) => `> ${l}`)
        .join('\n'),
      '',
    );
  }
  out.push(`Leads created: ${leads.rows.length}`, '');
  if (leads.rows.length) {
    const l = leads.rows[0];
    out.push(
      'Lead row:',
      '```json',
      JSON.stringify(
        {
          name: l.name,
          phone: l.phone,
          phoneE164: l.phoneE164,
          email: l.email,
          preferredMethod: l.preferredMethod,
          bestTime: l.bestTime,
          topic: l.topic,
          pagePath: l.pagePath,
          status: l.status ?? 'new',
        },
        null,
        2,
      ),
      '```',
      '',
    );
  }
  return out.join('\n');
}

(async () => {
  const sections: string[] = [
    '# NBV chatbot lead capture: sample transcripts',
    '',
    `Generated ${new Date().toISOString()} against model \`${process.env.NBV_CHAT_MODEL || 'claude-sonnet-4-6'}\` with \`NBV_LEAD_CAPTURE_ENABLED=true\`. Database and email were stubbed; no email was sent.`,
    '',
  ];
  sections.push(
    await runConversation(
      '1. Contact request',
      [
        'Can Lou call me?',
        'Cheri, 416-555-0100. Mornings are best. I want to talk about coaching for my sales team.',
      ],
      '/services/Sales_Coaching',
    ),
  );
  sections.push(
    await runConversation(
      '2. Service questions',
      ['tell me about sales training', 'tell me about business development'],
      '/services/Sales_Training',
    ),
  );
  sections.push(
    await runConversation(
      '3. No contact intent',
      ['What industries has Lou worked in?', 'How much does a workshop cost?'],
      '/about-us',
    ),
  );

  sections.push('## Email Lou would have received (plain-text version)', '');
  for (const e of emails) {
    const svc =
      new (require('../src/modules/email/services/email.service').EmailService)(
        new (require('@nestjs/config').ConfigService)({
          SMTP_HOST: 'localhost',
        }),
      );
    sections.push(
      '```',
      `Subject: Website lead: ${e.lead.name} wants to be contacted`,
      `To: lounatale@nbvgroup.ca  Cc: <CONTACT_RECIPIENT>`,
      '',
      (svc as any).renderLeadNotificationText(e),
      '```',
      '',
    );
  }
  process.stdout.write(sections.join('\n'));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
