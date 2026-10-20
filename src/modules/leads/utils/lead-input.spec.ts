import {
  LeadValidationError,
  normalizePhone,
  validateRequestContactInput,
} from './lead-input';
import { PreferredContactMethod } from '../enums/lead-status.enum';

describe('validateRequestContactInput', () => {
  it('rejects input with neither phone nor email', () => {
    expect(() =>
      validateRequestContactInput({ name: 'Cheri', topic: 'coaching' }),
    ).toThrow(LeadValidationError);
    try {
      validateRequestContactInput({ name: 'Cheri' });
    } catch (err) {
      expect((err as LeadValidationError).errors).toContain(
        'at least one of phone or email is required',
      );
    }
  });

  it('rejects a missing name', () => {
    expect(() =>
      validateRequestContactInput({ phone: '416-555-0100' }),
    ).toThrow(/name is required/);
    expect(() =>
      validateRequestContactInput({ name: '   ', phone: '416-555-0100' }),
    ).toThrow(/name is required/);
  });

  it('rejects an invalid email', () => {
    expect(() =>
      validateRequestContactInput({ name: 'Cheri', email: 'not-an-email' }),
    ).toThrow(/not a valid email/);
  });

  it('rejects a phone that is clearly not a number but accepts a valid one', () => {
    expect(() =>
      validateRequestContactInput({ name: 'Cheri', phone: 'call me' }),
    ).toThrow(/does not look like a phone number/);
    expect(
      validateRequestContactInput({ name: 'Cheri', phone: '416-555-0100' })
        .phone,
    ).toBe('416-555-0100');
  });

  it('keeps the phone as entered and adds the E.164 form', () => {
    const lead = validateRequestContactInput({
      name: 'Cheri',
      phone: '(416) 555-0100',
    });
    expect(lead.phone).toBe('(416) 555-0100');
    expect(lead.phoneE164).toBe('+14165550100');
    expect(lead.email).toBeNull();
    expect(lead.preferredMethod).toBe(PreferredContactMethod.PHONE);
  });

  it('normalises email to lowercase and defaults preferred method to email', () => {
    const lead = validateRequestContactInput({
      name: 'Cheri',
      email: 'Cheri@Example.com',
    });
    expect(lead.email).toBe('cheri@example.com');
    expect(lead.preferredMethod).toBe(PreferredContactMethod.EMAIL);
  });

  it('honours an explicit preferred method and keeps optional fields', () => {
    const lead = validateRequestContactInput({
      name: 'Cheri',
      phone: '+1 416 555 0100',
      email: 'cheri@example.com',
      preferredMethod: 'email',
      bestTime: 'weekday mornings',
      topic: 'Sales coaching',
      conversationSummary: 'Line 1\nLine 2',
    });
    expect(lead.preferredMethod).toBe(PreferredContactMethod.EMAIL);
    expect(lead.bestTime).toBe('weekday mornings');
    expect(lead.topic).toBe('Sales coaching');
    expect(lead.conversationSummary).toBe('Line 1\nLine 2');
  });

  it('falls back to the channel the visitor actually provided', () => {
    const lead = validateRequestContactInput({
      name: 'Cheri',
      phone: '416-555-0100',
      preferredMethod: 'email',
    });
    expect(lead.preferredMethod).toBe(PreferredContactMethod.PHONE);
    const both = validateRequestContactInput({
      name: 'Cheri',
      phone: '416-555-0100',
      email: 'c@example.com',
    });
    expect(both.preferredMethod).toBe(PreferredContactMethod.EITHER);
  });
});

describe('normalizePhone', () => {
  it('parses Canadian numbers without a country code', () => {
    expect(normalizePhone('416 564 2261').phoneE164).toBe('+14165642261');
  });

  it('parses international numbers with a country code', () => {
    expect(normalizePhone('+44 20 7946 0958').phoneE164).toBe('+442079460958');
  });

  it('leaves E.164 null when the number cannot be parsed', () => {
    expect(normalizePhone('12345678').phoneE164).toBeNull();
  });
});
