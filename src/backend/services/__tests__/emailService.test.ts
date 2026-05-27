import { it, describe, expect } from 'vitest';
import { testSmtpConnection } from '../emailService';

describe('Email Service', () => {
    it('Should return connection error for invalid credentials', async () => {
        const config = {
            host: 'smtps.aruba.it',
            port: 465,
            secure: true,
            username: 'wronguser',
            password: 'wrongpassword',
            rejectUnauthorized: false
        };
        // This will attempt to connect and fail
        const res = await testSmtpConnection(config);
        expect(res.ok).toBe(false);
    });
});
