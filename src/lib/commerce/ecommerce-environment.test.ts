import { describe, expect, it } from 'vitest';

import { parseEcommerceEnvironment, sandboxWarningCopy } from './ecommerce-environment';

const sandboxBoth = {
	environment: 'sandbox',
	is_sandbox: true,
	prodigi: {
		environment: 'sandbox',
		api_url: 'https://api.sandbox.prodigi.com'
	},
	stripe: { environment: 'sandbox' }
};

describe('parseEcommerceEnvironment', () => {
	it('reads the Medusa store payload', () => {
		expect(parseEcommerceEnvironment(sandboxBoth)).toEqual(sandboxBoth);
	});

	it('rejects a live flag that is not a boolean', () => {
		expect(parseEcommerceEnvironment({ ...sandboxBoth, is_sandbox: 'true' })).toBeNull();
	});

	it('rejects unknown environments', () => {
		expect(
			parseEcommerceEnvironment({
				...sandboxBoth,
				stripe: { environment: 'test' }
			})
		).toBeNull();
	});
});

describe('sandboxWarningCopy', () => {
	it('explains test mode in plain language', () => {
		expect(sandboxWarningCopy()).toBe(
			"I'm still trying the shop out. You can add things to your cart, but you won't be charged, and nothing will print or ship."
		);
	});
});
