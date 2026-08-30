import { describe, expect, it } from 'vitest';
import { canAccessAdmin, isAdminRole, isProtectedAdminPath } from './requireAdmin.server';

describe('isAdminRole', () => {
	it('accepts an admin role array or string', () => {
		expect(isAdminRole({ role: ['admin'] })).toBe(true);
		expect(isAdminRole({ role: 'admin' })).toBe(true);
		expect(isAdminRole({ role: ['contributor'] })).toBe(false);
		expect(isAdminRole({ role: 'contributor' })).toBe(false);
		expect(isAdminRole(null)).toBe(false);
		expect(isAdminRole({})).toBe(false);
	});
});

describe('canAccessAdmin', () => {
	it('allows anyone on the Vite dev server', () => {
		expect(canAccessAdmin(null, true)).toBe(true);
		expect(canAccessAdmin({ role: ['contributor'] }, true)).toBe(true);
	});

	it('requires an admin role in production builds', () => {
		expect(canAccessAdmin(null, false)).toBe(false);
		expect(canAccessAdmin({ role: ['contributor'] }, false)).toBe(false);
		expect(canAccessAdmin({ role: ['admin'] }, false)).toBe(true);
	});
});

describe('isProtectedAdminPath', () => {
	it('matches admin pages and APIs only', () => {
		expect(isProtectedAdminPath('/admin')).toBe(true);
		expect(isProtectedAdminPath('/admin/settings/ai')).toBe(true);
		expect(isProtectedAdminPath('/api/admin/settings')).toBe(true);
		expect(isProtectedAdminPath('/account/profile')).toBe(false);
		expect(isProtectedAdminPath('/api/auth/get-session')).toBe(false);
		expect(isProtectedAdminPath('/administrator')).toBe(false);
	});
});
