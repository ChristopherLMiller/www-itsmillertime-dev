/** True when Payload (`role: ['admin']`) or Better Auth (`role: 'admin'`) says admin. */
export function isAdminRole(user: { role?: unknown } | null | undefined): boolean {
	const role = user?.role;
	if (Array.isArray(role)) return role.includes('admin');
	return role === 'admin';
}
