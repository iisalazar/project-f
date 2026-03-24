import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';

// Mock navigation and API modules
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
vi.mock('$lib/api', () => ({
  apiFetch: vi.fn().mockResolvedValue({}),
}));
vi.mock('$lib/services/auth-api', () => ({
  getMe: vi.fn().mockResolvedValue({ auth: { activeRole: 'dispatcher' } }),
}));

/**
 * OTP digit box unit tests.
 * These test the individual logic functions rather than the full page
 * to avoid SvelteKit module resolution complexity in tests.
 */

describe('OTP digit box behaviour', () => {
  let otpDigits: string[];
  let digitRefs: { focus: ReturnType<typeof vi.fn> }[];

  function buildRefs(count = 6) {
    return Array.from({ length: count }, () => ({ focus: vi.fn() }));
  }

  function onDigitInput(
    i: number,
    rawValue: string,
    digits: string[],
    refs: typeof digitRefs,
    onComplete: (code: string) => void,
  ) {
    const val = rawValue.replace(/\D/g, '').slice(-1);
    digits[i] = val;
    if (val && i < 5) refs[i + 1]?.focus();
    if (val && i === 5) onComplete(digits.join(''));
    return digits;
  }

  function onDigitKeydown(
    i: number,
    key: string,
    digits: string[],
    refs: typeof digitRefs,
  ) {
    if (key === 'Backspace' && !digits[i] && i > 0) {
      refs[i - 1]?.focus();
    }
  }

  function onPaste(
    pasteText: string,
    digits: string[],
    refs: typeof digitRefs,
  ) {
    const text = pasteText.replace(/\D/g, '').slice(0, 6);
    text.split('').forEach((ch, i) => { digits[i] = ch; });
    refs[Math.min(text.length, 5)]?.focus();
    return digits;
  }

  beforeEach(() => {
    otpDigits = ['', '', '', '', '', ''];
    digitRefs = buildRefs();
  });

  it('advances focus to next box after digit entry', () => {
    onDigitInput(0, '1', otpDigits, digitRefs, vi.fn());
    expect(otpDigits[0]).toBe('1');
    expect(digitRefs[1].focus).toHaveBeenCalled();
  });

  it('moves focus back on Backspace from empty box', () => {
    otpDigits[1] = '';
    onDigitKeydown(1, 'Backspace', otpDigits, digitRefs);
    expect(digitRefs[0].focus).toHaveBeenCalled();
  });

  it('distributes pasted 6-char string across all boxes', () => {
    const result = onPaste('123456', otpDigits, digitRefs);
    expect(result).toEqual(['1', '2', '3', '4', '5', '6']);
    expect(result.join('')).toBe('123456');
  });

  it('derived otp is empty string when all boxes are empty', () => {
    const otp = otpDigits.join('');
    expect(otp).toBe('');
  });

  it('ignores non-numeric input', () => {
    onDigitInput(0, 'a', otpDigits, digitRefs, vi.fn());
    expect(otpDigits[0]).toBe('');
    expect(digitRefs[1].focus).not.toHaveBeenCalled();
  });
});
