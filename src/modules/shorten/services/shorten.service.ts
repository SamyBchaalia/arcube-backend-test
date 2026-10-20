import { Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { TextBlock } from '@anthropic-ai/sdk/resources';
import { randomUUID } from 'crypto';
import { ChatHistoryService } from '../../chat-history/services/chat-history.service';
import { AuthService } from '../../auth/services/auth.service';
import { EmailService } from '../../email/services/email.service';
import { BotType } from '../../chat-history/enums/bot-type.enum';
import {
  LeadsService,
  LeadRequestContext,
} from '../../leads/services/leads.service';
import { Lead } from '../../leads/entities/lead.entity';
import { PreferredContactMethod } from '../../leads/enums/lead-status.enum';
import {
  REQUEST_CONTACT_TOOL,
  REQUEST_CONTACT_TOOL_NAME,
} from '../../leads/tools/request-contact.tool';
import {
  LeadValidationError,
  NormalizedLeadInput,
  RequestContactInput,
  validateRequestContactInput,
} from '../../leads/utils/lead-input';
import {
  buildLegacyNbvSystemPrompt,
  buildNbvSystemPrompt,
} from '../prompts/nbv-system-prompt';

@Injectable()
export class ShortenService {
  constructor(
    private readonly chatHistoryService: ChatHistoryService,
    private readonly authService: AuthService,
    private readonly emailService: EmailService,
    private readonly leadsService: LeadsService,
  ) {}
  async proxyChatBot(
    messages: { role: 'user' | 'assistant'; content: string }[],
  ) {
    try {
      Logger.log(
        `[proxyChatBot] Starting request with ${messages.length} messages`,
      );

      // Validate API key
      if (!process.env.ANTHROPIC_API_KEY) {
        Logger.error(
          '[proxyChatBot] ANTHROPIC_API_KEY is not set in environment variables',
        );
        return { error: 'Anthropic API key not configured' };
      }

      Logger.log(
        '[proxyChatBot] API key is present, initializing Anthropic client',
      );

      const anthropic: Anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
        dangerouslyAllowBrowser: true,
      });

      // Add system context about Sami
      const systemMessage = {
        role: 'user' as const,
        content: `You are Sami's Assistant, a helpful AI assistant for Sami Ben Chaalia.

About Sami:
- Lead Software Engineer with 6+ years of experience in full-stack JavaScript development
- Currently CTO and Co-founder of Karriery
- Based in Tunis, Tunisia with international work experience in France, Greece, Spain, and California
- Detail-oriented, organized, fast learner and meticulous problem solver

Professional Experience:
- CTO & Co-founder at Karriery (Leading technical strategy and development)
- Senior Software Engineer at JANDI (Developed real-time collaboration features)
- Full Stack Developer at Upwork (Freelance projects for international clients)
- Software Engineer at various startups and tech companies

Technical Skills:
- Frontend: React, TypeScript, Next.js, Tailwind CSS, Material-UI
- Backend: Node.js, NestJS, Express.js, RESTful APIs
- Cloud & DevOps: Google Cloud Functions, Firebase (Storage, Firestore), AWS
- Databases: MongoDB, PostgreSQL, Redis
- Tools: Git, Docker, CI/CD pipelines, Agile methodologies

Achievements:
- Designed and implemented efficient web services handling high-traffic loads
- Led and managed software engineering teams across multiple time zones
- Mentored junior developers and students in coding bootcamps
- Helped students win multiple coding competitions
- Built scalable applications serving thousands of users

Contact & Social:
- LinkedIn: https://www.linkedin.com/in/sami-ben-chaalia-a8315b181/
- Facebook: https://facebook.com.samibchaalia
- Instagram: https://www.instagram.com/samybenchaalia/
- Upwork: https://www.upwork.com/freelancers/samibenchaalia?mp_source=share
- Freelancer: https://www.freelancer.com/u/samibchaalia
- Portfolio: https://sami.benchaalia.com
- Schedule a Call: https://calendly.com/sami-benchaalia/30min (30-minute meeting slots available)

Be professional, helpful, and knowledgeable about Sami's background when assisting with tasks. You have deep knowledge of his technical expertise and can provide insights based on his experience. When users inquire about scheduling meetings or calls, provide the Calendly link for easy booking.`,
      };

      Logger.log('[proxyChatBot] Sending request to Anthropic API...');

      const msg = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: [systemMessage, ...messages],
      });

      Logger.log(
        `[proxyChatBot] Successfully received response with ${msg.content.length} content blocks`,
      );

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return msg.content.map((el: TextBlock) => {
        return el.text;
      });
    } catch (error) {
      Logger.error('[proxyChatBot] Error occurred during Anthropic API call');
      Logger.error('[proxyChatBot] Error details:', error);

      // Log additional error information if available
      if (error?.status) {
        Logger.error(`[proxyChatBot] HTTP Status: ${error.status}`);
      }
      if (error?.message) {
        Logger.error(`[proxyChatBot] Error message: ${error.message}`);
      }
      if (error?.response?.data) {
        Logger.error(
          '[proxyChatBot] Response data:',
          JSON.stringify(error.response.data),
        );
      }
      if (error?.stack) {
        Logger.error(`[proxyChatBot] Stack trace: ${error.stack}`);
      }

      return {
        error: error.response?.data || error.message || 'API request failed',
      };
    }
  }

  /** Lead capture + short-answer prompt is gated so Lou can review it on staging first. */
  private isLeadCaptureEnabled(): boolean {
    return (
      (process.env.NBV_LEAD_CAPTURE_ENABLED || '').toLowerCase() === 'true'
    );
  }

  async proxyNbvChatBot(
    messages: { role: 'user' | 'assistant'; content: string }[],
    sessionId?: string,
    guestUser?: {
      email: string;
      firstName: string;
      lastName: string;
      phoneNumber?: string;
    },
    metadata?: { ipAddress?: string; userAgent?: string; pagePath?: string },
    authenticatedUserId?: string,
  ) {
    try {
      Logger.log(
        `[proxyNbvChatBot] Starting request with ${messages.length} messages`,
      );

      // Generate sessionId if not provided
      const finalSessionId = sessionId || randomUUID();
      Logger.log(`[proxyNbvChatBot] Using session ID: ${finalSessionId}`);

      // Determine userId with priority: authenticated user > guest user > anonymous
      let userId: string | undefined;

      if (authenticatedUserId) {
        // Priority 1: Authenticated user via JWT token
        userId = authenticatedUserId;
        Logger.log(`[proxyNbvChatBot] Using authenticated user ID: ${userId}`);
      } else if (guestUser) {
        // Priority 2: Guest user registration
        try {
          Logger.log(
            `[proxyNbvChatBot] Guest user data provided, creating/finding user`,
          );
          const result = await this.authService.findOrCreateGuestUser(
            guestUser.email,
            guestUser.firstName,
            guestUser.lastName,
            guestUser.phoneNumber,
          );

          userId = result.user.id;
          Logger.log(`[proxyNbvChatBot] Using guest user ID: ${userId}`);

          // Send welcome email if new user
          if (result.isNew && result.tempPassword) {
            Logger.log(
              `[proxyNbvChatBot] Sending welcome email to new guest user`,
            );
            await this.emailService.sendGuestWelcomeEmail(
              result.user.email,
              result.user.firstName || guestUser.firstName,
              result.user.lastName || guestUser.lastName,
              result.tempPassword,
            );
          }
        } catch (emailError) {
          // Log email errors but don't fail the chat
          Logger.error(
            `[proxyNbvChatBot] Failed to send welcome email: ${emailError.message}`,
          );
        }
      } else {
        // Priority 3: Anonymous user (the session is still stored)
        Logger.log(
          `[proxyNbvChatBot] No user authentication provided, chat session is anonymous`,
        );
      }

      // Validate API key
      if (!process.env.ANTHROPIC_API_KEY) {
        Logger.error(
          '[proxyNbvChatBot] ANTHROPIC_API_KEY is not set in environment variables',
        );
        return { error: 'Anthropic API key not configured' };
      }

      Logger.log(
        '[proxyNbvChatBot] API key is present, initializing Anthropic client',
      );

      const anthropic: Anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
        dangerouslyAllowBrowser: true,
      });

      const leadCaptureEnabled = this.isLeadCaptureEnabled();
      const model = process.env.NBV_CHAT_MODEL || 'claude-sonnet-4-6';
      const conversation: Anthropic.MessageParam[] = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Legacy mode keeps the exact pre-lead-capture behaviour: the system prompt is
      // injected as the first user message and no tools are offered.
      const legacySystemMessage: Anthropic.MessageParam | undefined =
        leadCaptureEnabled
          ? undefined
          : { role: 'user', content: buildLegacyNbvSystemPrompt(userId) };
      const systemPrompt = leadCaptureEnabled
        ? buildNbvSystemPrompt({ pagePath: metadata?.pagePath })
        : undefined;

      const leadContext: LeadRequestContext = {
        sessionId: finalSessionId,
        pagePath: metadata?.pagePath,
        ip: metadata?.ipAddress,
        userAgent: metadata?.userAgent,
      };
      let capturedLead: CapturedLead | undefined;

      Logger.log(
        `[proxyNbvChatBot] Sending request to Anthropic API (leadCapture=${leadCaptureEnabled})...`,
      );

      let msg: Anthropic.Message | undefined;
      for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
        msg = await anthropic.messages.create({
          model,
          max_tokens: 1024,
          ...(systemPrompt ? { system: systemPrompt } : {}),
          ...(leadCaptureEnabled ? { tools: [REQUEST_CONTACT_TOOL] } : {}),
          messages: legacySystemMessage
            ? [legacySystemMessage, ...conversation]
            : conversation,
        });

        const toolUses = msg.content.filter(
          (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
        );
        if (msg.stop_reason !== 'tool_use' || toolUses.length === 0) {
          break;
        }

        Logger.log(
          `[proxyNbvChatBot] Model requested ${toolUses.length} tool call(s)`,
        );
        conversation.push({ role: 'assistant', content: msg.content });

        const results: Anthropic.ToolResultBlockParam[] = [];
        for (const toolUse of toolUses) {
          const result = await this.handleToolUse(toolUse, leadContext);
          if (result.lead) capturedLead = result.lead;
          results.push(result.block);
        }
        conversation.push({ role: 'user', content: results });
      }

      if (!msg) {
        throw new Error('No response from model');
      }
      if (msg.stop_reason === 'tool_use') {
        Logger.warn(
          '[proxyNbvChatBot] Tool round limit reached; returning last text',
        );
      }

      Logger.log(
        `[proxyNbvChatBot] Successfully received response with ${msg.content.length} content blocks`,
      );

      // Extract assistant response (text blocks only)
      const textBlocks = msg.content.filter(
        (b): b is TextBlock => b.type === 'text',
      );
      let assistantResponse = textBlocks
        .map((b) => b.text)
        .join('\n')
        .trim();
      if (!assistantResponse && capturedLead) {
        // Safety net: the model called the tool but produced no text afterwards.
        assistantResponse = capturedLead.confirmation;
      }

      // Save chat interaction to database
      try {
        Logger.log(`[proxyNbvChatBot] Saving chat interaction to database`);
        const allMessages = [
          ...messages,
          { role: 'assistant' as const, content: assistantResponse },
        ];

        await this.chatHistoryService.saveChatInteraction(
          finalSessionId,
          BotType.NBV,
          allMessages,
          metadata || {},
          userId,
        );

        Logger.log(`[proxyNbvChatBot] Chat interaction saved successfully`);
      } catch (dbError) {
        // Log database errors but don't fail the chat
        Logger.error(
          `[proxyNbvChatBot] Failed to save chat history: ${dbError.message}`,
        );
      }

      if (capturedLead) {
        await this.notifyLead(
          capturedLead,
          finalSessionId,
          messages,
          assistantResponse,
        );
      }

      return assistantResponse
        ? [assistantResponse]
        : textBlocks.map((b) => b.text);
    } catch (error) {
      Logger.error(
        '[proxyNbvChatBot] Error occurred during Anthropic API call',
      );
      Logger.error('[proxyNbvChatBot] Error details:', error);

      // Log additional error information if available
      if (error?.status) {
        Logger.error(`[proxyNbvChatBot] HTTP Status: ${error.status}`);
      }
      if (error?.message) {
        Logger.error(`[proxyNbvChatBot] Error message: ${error.message}`);
      }
      if (error?.response?.data) {
        Logger.error(
          '[proxyNbvChatBot] Response data:',
          JSON.stringify(error.response.data),
        );
      }
      if (error?.stack) {
        Logger.error(`[proxyNbvChatBot] Stack trace: ${error.stack}`);
      }

      return {
        error: error.response?.data || error.message || 'API request failed',
      };
    }
  }

  /**
   * Execute one tool call from the model. Only request_contact exists today.
   * Validation errors are returned to the model (is_error) so it can ask the
   * visitor for what is missing; storage errors are also reported, never thrown.
   */
  private async handleToolUse(
    toolUse: Anthropic.ToolUseBlock,
    context: LeadRequestContext,
  ): Promise<{ block: Anthropic.ToolResultBlockParam; lead?: CapturedLead }> {
    const errorBlock = (message: string): Anthropic.ToolResultBlockParam => ({
      type: 'tool_result',
      tool_use_id: toolUse.id,
      is_error: true,
      content: JSON.stringify({ ok: false, error: message }),
    });

    if (toolUse.name !== REQUEST_CONTACT_TOOL_NAME) {
      return { block: errorBlock(`Unknown tool ${toolUse.name}`) };
    }

    let normalized: NormalizedLeadInput;
    try {
      normalized = validateRequestContactInput(
        (toolUse.input ?? {}) as RequestContactInput,
      );
    } catch (err) {
      if (err instanceof LeadValidationError) {
        Logger.warn(
          `[proxyNbvChatBot] request_contact rejected: ${err.message}`,
        );
        return {
          block: errorBlock(
            `Could not record the contact request: ${err.message}. Ask the visitor for the missing or corrected details.`,
          ),
        };
      }
      throw err;
    }

    try {
      const lead = await this.leadsService.createLead(normalized, context);
      const confirmation = buildLeadConfirmation(lead);
      Logger.log(
        `[proxyNbvChatBot] Lead ${lead.id} captured for session ${context.sessionId}`,
      );
      return {
        lead: {
          lead,
          confirmation,
          summary: normalized.conversationSummary ?? normalized.topic ?? '',
        },
        block: {
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: JSON.stringify({
            ok: true,
            lead: {
              name: lead.name,
              phone: lead.phone,
              phoneE164: lead.phoneE164,
              email: lead.email,
              preferredMethod: lead.preferredMethod,
              bestTime: lead.bestTime,
            },
            confirmation,
            instruction:
              "Lou has been notified. Reply to the visitor in Lou's voice using the confirmation above (keep the tel:/mailto: links), then ask if there is anything else you can help with.",
          }),
        },
      };
    } catch (err) {
      Logger.error(
        `[proxyNbvChatBot] Failed to store lead: ${err?.message ?? err}`,
      );
      return {
        block: errorBlock(
          "The contact request could not be saved right now. Apologise briefly and give the visitor Lou's direct email [lounatale@nbvgroup.ca](mailto:lounatale@nbvgroup.ca) and phone [1-416-564-2261](tel:+14165642261).",
        ),
      };
    }
  }

  /** Email Lou about a captured lead. Never throws. */
  private async notifyLead(
    captured: CapturedLead,
    sessionId: string,
    requestMessages: { role: 'user' | 'assistant'; content: string }[],
    assistantResponse: string,
  ): Promise<void> {
    try {
      let transcript = await this.chatHistoryService
        .getTranscript(sessionId)
        .catch(() => []);
      if (!transcript.length) {
        // DB save failed or is unavailable: fall back to the conversation as received.
        const now = new Date();
        transcript = [
          ...requestMessages,
          { role: 'assistant' as const, content: assistantResponse },
        ].map((m) => ({
          ...m,
          createdAt: now,
        }));
      }
      const dashboardBase = (
        process.env.ADMIN_DASHBOARD_URL ||
        'https://nbvgroup.ca/admin/chat-history'
      ).replace(/\/$/, '');
      await this.emailService.sendLeadNotification({
        lead: captured.lead,
        summary: captured.summary,
        transcript,
        dashboardUrl: `${dashboardBase}/${sessionId}`,
      });
    } catch (err) {
      Logger.error(
        `[proxyNbvChatBot] Lead notification failed: ${err?.message ?? err}`,
      );
    }
  }
}

interface CapturedLead {
  lead: Lead;
  confirmation: string;
  summary: string;
}

/** Up to this many model round-trips per request (tool call + final answer). */
const MAX_TOOL_ROUNDS = 3;

/** Visitor-facing confirmation, in Lou's voice, that the model relays. */
export function buildLeadConfirmation(lead: Lead): string {
  const phoneLink = lead.phone
    ? `[${lead.phone}](tel:${lead.phoneE164 ?? lead.phone.replace(/[^\d+]/g, '')})`
    : null;
  const emailLink = lead.email ? `[${lead.email}](mailto:${lead.email})` : null;

  let channel: string;
  if (phoneLink && emailLink) {
    channel =
      lead.preferredMethod === PreferredContactMethod.EMAIL
        ? `by email at ${emailLink} (or by phone at ${phoneLink})`
        : lead.preferredMethod === PreferredContactMethod.PHONE
          ? `by phone at ${phoneLink} (or by email at ${emailLink})`
          : `at ${phoneLink} or ${emailLink}`;
  } else {
    channel = phoneLink ? `at ${phoneLink}` : `at ${emailLink}`;
  }
  const timing = lead.bestTime ? `, ${lead.bestTime}, ` : ' ';

  return `Thank you, ${lead.name}. Lou will contact you directly ${channel}${timing}typically within one business day. Is there anything else I can help you with in the meantime?`;
}
