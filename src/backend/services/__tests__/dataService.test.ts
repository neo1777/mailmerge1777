import { it, describe, expect } from 'vitest';

describe('MailMerge Logic', () => {
    it('Should normalize CAP', () => {
        const val = '123';
        const normalized = val.padStart(5, '0');
        expect(normalized).toBe('00123');
    });

    it('Should extract address correctly', () => {
        const val = "VIA ANTICO IPPODROMO 25";
        const match = val.match(/^(.*)\s+(\d+[a-zA-Z]*)$/);
        expect(match?.[1].trim()).toBe('VIA ANTICO IPPODROMO');
        expect(match?.[2]).toBe('25');
    });

    it('Should detect valid emails', () => {
        const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
        expect(emailRegex.test('test@example.com')).toBe(true);
        expect(emailRegex.test('invalid email')).toBe(false);
    });
});
