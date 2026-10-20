/**
 * Integration test of the NBV chatbot lead capture flow with the Anthropic API and
 * the SMTP transport mocked, and in-memory repositories standing in for Postgres.
 */
import { ConfigService } from '@nestjs/config';
import { ShortenService } from './shorten.service';
import { ChatHistoryService } from '../../chat-history/services/chat-history.service';
import { LeadsService } from '../../leads/services/leads.service';
import { EmailService } from '../../email/services/email.service';
import { buildNbvSystemPrompt } from '../prompts/nbv-system-prompt';

const createMock = jest.fn();
jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: jest
    .fn()
    .mockImplementation(() => ({ messages: { create: createMock } })),
}));

const sendMailMock = jest.fn();
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({ sendMail: sendMailMock })),
}));

/** Minimal in-memory stand-in for a TypeORM repository. */
class FakeRepository<T extends { id?: string }> {
  rows: T[] = [];
  private seq = 0;

  create(obj: Partial<T>): T {
    return { ...obj } as T;
  }

  async save(entity: T): Promise<T> {
    if (!entity.id) {
      entity.id = `id-${++this.seq}`;
      (entity as any).createdAt = (entity as any).createdAt ?? new Date();
      this.rows.push(entity);
    }
    (entity as any).updatedAt = new Date();
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
    order?: Record<string, 'ASC' | 'DESC'>;
  }): Promise<T[]> {
    const rows = this.rows.filter((r) =>
      Object.entries(opts.where).every(([k, v]) => (r as any)[k] === v),
    );
    const [key, dir] = Object.entries(opts.order ?? {})[0] ?? [];
    if (key)
      rows.sort(
        (a, b) =>
          ((a as any)[key] - (b as any)[key]) * (dir === 'DESC' ? -1 : 1),
      );
    return rows;
  }
}

function textResponse(text: string) {
  return { stop_reason: 'end_turn', content: [{ type: 'text', text }] };
}

function toolUseResponse(input: Record<string, unknown>) {
  return {
    stop_reason: 'tool_use',
    content: [
      { type: 'text', text: 'One moment.' },
      { type: 'tool_use', id: 'toolu_1', name: 'request_contact', input },
    ],
  };
}

/** Second-round model stub: relays the confirmation returned by the tool. */
function relayToolResult(params: any) {
  const last = params.messages[params.messages.length - 1];
  const result = last.content.find((b: any) => b.type === 'tool_result');
  const payload = JSON.parse(result.content);
  if (!payload.ok) return textResponse(`Sorry: ${payload.error}`);
  return textResponse(payload.confirmation);
}

describe('ShortenService.proxyNbvChatBot (lead capture)', () => {
  let service: ShortenService;
  let sessions: FakeRepository<any>;
  let messagesRepo: FakeRepository<any>;
  let leads: FakeRepository<any>;

  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    process.env.NBV_LEAD_CAPTURE_ENABLED = 'true';
    createMock.mockReset();
    sendMailMock
      .mockReset()
      .mockResolvedValue({ accepted: ['lounatale@nbvgroup.ca'] });

    sessions = new FakeRepository();
    messagesRepo = new FakeRepository();
    leads = new FakeRepository();

    const config = new ConfigService({
      SMTP_HOST: 'localhost',
      EMAIL_FROM_ADDRESS: 'info@benchaalia.com',
      CONTACT_RECIPIENT: 'sami@example.com',
    });
    const leadsService = new LeadsService(leads as any, sessions as any);
    const chatHistory = new ChatHistoryService(
      sessions as any,
      messagesRepo as any,
      leadsService,
    );
    const emailService = new EmailService(config);
    const authService = { findOrCreateGuestUser: jest.fn() } as any;

    service = new ShortenService(
      chatHistory,
      authService,
      emailService,
      leadsService,
    );
  });

  afterAll(() => {
    delete process.env.NBV_LEAD_CAPTURE_ENABLED;
  });

  it('captures a lead, emails Lou once and confirms to the visitor', async () => {
    createMock
      .mockResolvedValueOnce(
        toolUseResponse({
          name: 'Cheri',
          phone: '416-555-0100',
          preferredMethod: 'phone',
          topic: 'Wants Lou to call',
          conversationSummary:
            'Cheri asked for a call back.\nNo other details given.',
        }),
      )
      .mockImplementationOnce(async (params) => relayToolResult(params));

    const reply = await service.proxyNbvChatBot(
      [{ role: 'user', content: 'Can Lou call me? Cheri, 416-555-0100' }],
      undefined,
      undefined,
      {
        ipAddress: '203.0.113.7',
        userAgent: 'jest',
        pagePath: '/services/Sales_Coaching',
      },
    );

    // Reply
    expect(Array.isArray(reply)).toBe(true);
    const text = (reply as string[])[0];
    expect(text).toContain('416-555-0100');
    expect(text).toContain('Lou will contact you');
    expect(text).not.toMatch(/create a free account|log in/i);

    // Request shape: system prompt + tool offered, lead-capture prompt in use
    const firstCall = createMock.mock.calls[0][0];
    expect(firstCall.tools.map((t: any) => t.name)).toEqual([
      'request_contact',
    ]);
    expect(firstCall.system).toContain(
      'The visitor is currently on page /services/Sales_Coaching',
    );
    expect(firstCall.messages[0].content).toBe(
      'Can Lou call me? Cheri, 416-555-0100',
    );

    // Exactly one lead row with normalised data and request context
    expect(leads.rows).toHaveLength(1);
    const lead = leads.rows[0];
    expect(lead).toMatchObject({
      name: 'Cheri',
      phone: '416-555-0100',
      phoneE164: '+14165550100',
      email: null,
      preferredMethod: 'phone',
      pagePath: '/services/Sales_Coaching',
      ip: '203.0.113.7',
      userAgent: 'jest',
    });
    expect(lead.sessionId).toBe(sessions.rows[0].sessionId);

    // Exactly one email, to Lou with a copy to Sami, containing the transcript
    expect(sendMailMock).toHaveBeenCalledTimes(1);
    const mail = sendMailMock.mock.calls[0][0];
    expect(mail.to).toBe('lounatale@nbvgroup.ca');
    expect(mail.cc).toBe('sami@example.com');
    expect(mail.subject).toBe('Website lead: Cheri wants to be contacted');
    expect(mail.html).toContain('tel:+14165550100');
    expect(mail.html).toContain('Can Lou call me? Cheri, 416-555-0100');
    expect(mail.html).toContain('Cheri asked for a call back.');
    expect(mail.html).toContain(
      `https://nbvgroup.ca/admin/chat-history/${lead.sessionId}`,
    );

    // Session stored with page path, user and assistant turns, no duplicates
    expect(sessions.rows[0]).toMatchObject({
      lastPagePath: '/services/Sales_Coaching',
      ipAddress: '203.0.113.7',
      messageCount: 2,
    });
    expect(messagesRepo.rows).toHaveLength(2);
  });

  it('asks again when the model omits both phone and email, without creating a lead', async () => {
    createMock
      .mockResolvedValueOnce(
        toolUseResponse({
          name: 'Cheri',
          topic: 'call back',
          conversationSummary: 'x',
        }),
      )
      .mockImplementationOnce(async (params) => relayToolResult(params));

    const reply = (await service.proxyNbvChatBot([
      { role: 'user', content: 'Have Lou call me, I am Cheri' },
    ])) as string[];

    expect(reply[0]).toMatch(/at least one of phone or email/);
    expect(leads.rows).toHaveLength(0);
    expect(sendMailMock).not.toHaveBeenCalled();
    const secondCall = createMock.mock.calls[1][0];
    const toolResult =
      secondCall.messages[secondCall.messages.length - 1].content[0];
    expect(toolResult.is_error).toBe(true);
  });

  it('does not create a lead or send email for an ordinary question', async () => {
    createMock.mockResolvedValueOnce(
      textResponse(
        'Sales Coaching pairs field accompaniment with real-time feedback. [Sales Coaching](https://nbvgroup.ca/services/Sales_Coaching). I can also have Lou contact you with details.',
      ),
    );

    const reply = (await service.proxyNbvChatBot([
      { role: 'user', content: 'Tell me about sales coaching' },
    ])) as string[];

    expect(reply[0]).toContain('https://nbvgroup.ca/services/Sales_Coaching');
    expect(createMock).toHaveBeenCalledTimes(1);
    expect(leads.rows).toHaveLength(0);
    expect(sendMailMock).not.toHaveBeenCalled();
    expect(messagesRepo.rows).toHaveLength(2);
  });

  it('still answers the visitor when the lead email fails twice', async () => {
    sendMailMock.mockRejectedValue(new Error('SMTP down'));
    jest.useFakeTimers({ advanceTimers: true });
    createMock
      .mockResolvedValueOnce(
        toolUseResponse({
          name: 'Cheri',
          email: 'cheri@example.com',
          topic: 't',
          conversationSummary: 's',
        }),
      )
      .mockImplementationOnce(async (params) => relayToolResult(params));

    const reply = (await service.proxyNbvChatBot([
      { role: 'user', content: 'Email me, cheri@example.com' },
    ])) as string[];
    jest.useRealTimers();

    expect(reply[0]).toContain('cheri@example.com');
    expect(reply[0]).toContain('Lou will contact you');
    expect(leads.rows).toHaveLength(1);
    expect(sendMailMock).toHaveBeenCalledTimes(2);
  });

  it('stores only the new messages when the widget resends the whole history', async () => {
    createMock.mockResolvedValue(textResponse('Answer'));
    const first = await service.proxyNbvChatBot(
      [{ role: 'user', content: 'Q1' }],
      'a4d2b7c8-1234-4b0a-9c1e-000000000001',
    );
    expect(first).toEqual(['Answer']);
    await service.proxyNbvChatBot(
      [
        { role: 'user', content: 'Q1' },
        { role: 'assistant', content: 'Answer' },
        { role: 'user', content: 'Q2' },
      ],
      'a4d2b7c8-1234-4b0a-9c1e-000000000001',
    );
    expect(messagesRepo.rows.map((m) => m.content)).toEqual([
      'Q1',
      'Answer',
      'Q2',
      'Answer',
    ]);
    expect(sessions.rows[0].messageCount).toBe(4);
  });

  it('uses the legacy prompt without tools when the feature flag is off', async () => {
    process.env.NBV_LEAD_CAPTURE_ENABLED = 'false';
    createMock.mockResolvedValueOnce(textResponse('Legacy answer'));

    await service.proxyNbvChatBot([{ role: 'user', content: 'Hi' }]);

    const call = createMock.mock.calls[0][0];
    expect(call.tools).toBeUndefined();
    expect(call.system).toBeUndefined();
    expect(call.messages[0].content).toContain(
      "You are NBV Group's Digital Assistant",
    );
    expect(call.messages[0].content).toContain('Create a free account');
  });
});

describe('buildNbvSystemPrompt', () => {
  it('drops account prompts and includes lead capture, brevity and site links', () => {
    const prompt = buildNbvSystemPrompt();
    expect(prompt).not.toMatch(
      /create a free account|nbvgroup\.ca\/register|nbvgroup\.ca\/login|is anonymous and not tracked|save conversation history/i,
    );
    expect(prompt).toContain('Never say the conversation is not being saved');
    expect(prompt).toContain(
      'Lou would be happy to contact you, how would you like to be reached?',
    );
    expect(prompt).toContain('request_contact');
    expect(prompt).toContain('at most 3-4 sentences');
    expect(prompt).toContain('I can also have Lou contact you with details.');
    expect(prompt).toContain(
      'https://nbvgroup.ca/services/Sales_Team_Evaluations',
    );
    expect(prompt).toContain(
      '[lounatale@nbvgroup.ca](mailto:lounatale@nbvgroup.ca)',
    );
    expect(prompt).not.toContain('The visitor is currently on page');
  });
});
