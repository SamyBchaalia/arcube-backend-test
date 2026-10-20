import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { PreferredContactMethod } from '../enums/lead-status.enum';

/** Raw input as produced by the chat model's request_contact tool call. */
export interface RequestContactInput {
  name?: unknown;
  phone?: unknown;
  email?: unknown;
  preferredMethod?: unknown;
  bestTime?: unknown;
  topic?: unknown;
  conversationSummary?: unknown;
}

/** Validated and normalised lead details. */
export interface NormalizedLeadInput {
  name: string;
  phone: string | null;
  phoneE164: string | null;
  email: string | null;
  preferredMethod: PreferredContactMethod;
  bestTime: string | null;
  topic: string | null;
  conversationSummary: string | null;
}

export class LeadValidationError extends Error {
  constructor(public readonly errors: string[]) {
    super(errors.join('; '));
    this.name = 'LeadValidationError';
  }
}

// Same shape class-validator's IsEmail accepts for everyday addresses.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function asTrimmedString(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

/**
 * Keep the number as typed and add the E.164 form when it parses.
 * Canada is the default region because NBV Group's visitors are mostly Canadian;
 * numbers written with +country code are parsed as such regardless.
 */
export function normalizePhone(raw: string): {
  phone: string;
  phoneE164: string | null;
} {
  const phone = raw.trim();
  const parsed = parsePhoneNumberFromString(phone, 'CA');
  const phoneE164 = parsed && parsed.isValid() ? parsed.number : null;
  return { phone, phoneE164 };
}

/**
 * Validate the request_contact tool input.
 * Throws LeadValidationError listing every problem so the model can ask the
 * visitor for exactly what is missing.
 */
export function validateRequestContactInput(
  input: RequestContactInput,
): NormalizedLeadInput {
  const errors: string[] = [];

  const name = asTrimmedString(input?.name, 200);
  if (!name) errors.push('name is required');

  const phoneRaw = asTrimmedString(input?.phone, 50);
  const emailRaw = asTrimmedString(input?.email, 255);

  if (!phoneRaw && !emailRaw) {
    errors.push('at least one of phone or email is required');
  }

  let phone: string | null = null;
  let phoneE164: string | null = null;
  if (phoneRaw) {
    const digits = phoneRaw.replace(/\D/g, '');
    if (digits.length < 7) {
      errors.push(`phone "${phoneRaw}" does not look like a phone number`);
    } else {
      ({ phone, phoneE164 } = normalizePhone(phoneRaw));
    }
  }

  let email: string | null = null;
  if (emailRaw) {
    if (!EMAIL_RE.test(emailRaw)) {
      errors.push(`email "${emailRaw}" is not a valid email address`);
    } else {
      email = emailRaw.toLowerCase();
    }
  }

  const methodRaw = asTrimmedString(input?.preferredMethod, 10)?.toLowerCase();
  let preferredMethod: PreferredContactMethod;
  if (
    methodRaw === PreferredContactMethod.PHONE ||
    methodRaw === PreferredContactMethod.EMAIL
  ) {
    preferredMethod = methodRaw;
  } else if (phone && !email) {
    preferredMethod = PreferredContactMethod.PHONE;
  } else if (email && !phone) {
    preferredMethod = PreferredContactMethod.EMAIL;
  } else {
    preferredMethod = PreferredContactMethod.EITHER;
  }

  // A stated preference for a channel the visitor did not provide falls back to what they gave.
  if (preferredMethod === PreferredContactMethod.PHONE && !phone && email) {
    preferredMethod = PreferredContactMethod.EMAIL;
  }
  if (preferredMethod === PreferredContactMethod.EMAIL && !email && phone) {
    preferredMethod = PreferredContactMethod.PHONE;
  }

  if (errors.length) {
    throw new LeadValidationError(errors);
  }

  return {
    name: name as string,
    phone,
    phoneE164,
    email,
    preferredMethod,
    bestTime: asTrimmedString(input?.bestTime, 200),
    topic: asTrimmedString(input?.topic, 1000),
    conversationSummary: asTrimmedString(input?.conversationSummary, 2000),
  };
}
