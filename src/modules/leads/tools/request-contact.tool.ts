import Anthropic from '@anthropic-ai/sdk';

export const REQUEST_CONTACT_TOOL_NAME = 'request_contact';

/**
 * Tool the chat model calls when a visitor wants Lou to contact them.
 * Validation of the input happens in validateRequestContactInput; the schema
 * here only guides the model.
 */
export const REQUEST_CONTACT_TOOL: Anthropic.Tool = {
  name: REQUEST_CONTACT_TOOL_NAME,
  description:
    "Pass a website visitor's contact details to Lou Natale so Lou can contact them directly. " +
    'Call this as soon as the visitor has given their name and at least one of a phone number or an email address, ' +
    'and has asked to be contacted, called, emailed, or for Lou to reach out (or volunteered their number/email). ' +
    'Do not ask the visitor to confirm before calling. Call it once per contact request. ' +
    'The tool stores the lead, notifies Lou by email with the conversation, and returns a confirmation you should relay to the visitor.',
  input_schema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: "The visitor's name as they gave it.",
      },
      phone: {
        type: 'string',
        description:
          "The visitor's phone number exactly as they typed it. Omit if not given.",
      },
      email: {
        type: 'string',
        description: "The visitor's email address. Omit if not given.",
      },
      preferredMethod: {
        type: 'string',
        enum: ['phone', 'email', 'either'],
        description:
          'How the visitor prefers to be reached. Use "either" if they did not say.',
      },
      bestTime: {
        type: 'string',
        description:
          'Best time or days to reach them, if they mentioned one (e.g. "weekday mornings").',
      },
      topic: {
        type: 'string',
        description:
          'One short sentence on what the visitor wants to discuss with Lou (e.g. "Sales coaching for a 6-person SaaS team").',
      },
      conversationSummary: {
        type: 'string',
        description:
          '3-5 short lines summarising the conversation so far for Lou: who the visitor is, what they asked about, any company/size/timing details, and what they want next.',
      },
    },
    required: ['name', 'topic', 'conversationSummary'],
  },
};
