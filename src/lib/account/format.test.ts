import { describe, expect, it } from 'vitest';
import { accessRoleChips, formatAccessRoles } from './format';

describe('formatAccessRoles', () => {
	it('names family, friend, client, and admin', () => {
		expect(formatAccessRoles(['family', 'user'])).toBe('Family');
		expect(formatAccessRoles(['admin', 'family'])).toBe('Admin, Family');
		expect(formatAccessRoles(['friend'])).toBe('Friend');
		expect(formatAccessRoles(['client'])).toBe('Client');
	});

	it('calls a lone user role Member', () => {
		expect(formatAccessRoles(['user'])).toBe('Member');
	});

	it('returns null when there is nothing to show', () => {
		expect(formatAccessRoles([])).toBeNull();
	});
});

describe('accessRoleChips', () => {
	it('keeps a chip per group with readable labels', () => {
		expect(accessRoleChips(['user', 'family', 'admin'])).toEqual([
			{ id: 'admin', label: 'Admin' },
			{ id: 'family', label: 'Family' },
			{ id: 'user', label: 'Member' }
		]);
	});
});
