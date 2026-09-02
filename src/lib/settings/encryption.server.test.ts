import { env } from '$env/dynamic/private';
import { afterEach, describe, expect, it } from 'vitest';

import {
	decryptSecret,
	encryptSecret,
	isEncryptedSecret,
	SETTINGS_ENC_PREFIX
} from './encryption.server';

const KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

describe('settings encryption', () => {
	afterEach(() => {
		env.SETTINGS_ENCRYPTION_KEY = '';
	});

	it('round-trips a secret', () => {
		env.SETTINGS_ENCRYPTION_KEY = KEY;
		const encrypted = encryptSecret('sk-live-example');
		expect(isEncryptedSecret(encrypted)).toBe(true);
		expect(encrypted.startsWith(SETTINGS_ENC_PREFIX)).toBe(true);
		expect(decryptSecret(encrypted)).toBe('sk-live-example');
	});

	it('leaves plaintext and empty values alone on decrypt', () => {
		env.SETTINGS_ENCRYPTION_KEY = KEY;
		expect(decryptSecret('sk-plain')).toBe('sk-plain');
		expect(encryptSecret('')).toBe('');
		expect(encryptSecret(` ${SETTINGS_ENC_PREFIX}already`)).toBe(`${SETTINGS_ENC_PREFIX}already`);
	});

	it('throws when the key is missing', () => {
		env.SETTINGS_ENCRYPTION_KEY = '';
		expect(() => encryptSecret('sk-live-example')).toThrow(/SETTINGS_ENCRYPTION_KEY/);
	});
});
