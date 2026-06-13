import type { SiteNavigation, User } from '$lib/types/payload-types';

type NavItem = NonNullable<SiteNavigation['navItems']>[number];
type ChildNode = NonNullable<NavItem['childNodes']>[number];
type NavNode = NavItem | ChildNode;

interface SessionUser {
	id: number;
	role: User['role'];
}

function isNodeVisible(node: NavNode, user: SessionUser | null): boolean {
	switch (node.visibility) {
		case 'ALL':
			return true;
		case 'AUTHENTICATED':
			return !!user;
		case 'ANONYMOUS':
			return !user;
		case 'PRIVILEGED':
			return isPrivilegedVisible(node, user);
		default:
			return false;
	}
}

function isPrivilegedVisible(node: NavNode, user: SessionUser | null): boolean {
	if (!user) return false;

	if (node.allowedUsers?.length) {
		const match = node.allowedUsers.some((entry) => {
			const id = typeof entry === 'number' ? entry : entry.id;
			return id === user.id;
		});
		if (match) return true;
	}

	if (node.permittedRoles?.length) {
		return node.permittedRoles.some((role) => user.role.includes(role));
	}

	return false;
}

export function filterNavItems(
	navItems: SiteNavigation['navItems'],
	user: SessionUser | null
): NavItem[] {
	if (!navItems) return [];

	return navItems
		.filter((item) => isNodeVisible(item, user))
		.map((item) => {
			if (!item.childNodes?.length) return item;

			const visibleChildren = item.childNodes.filter((child) => isNodeVisible(child, user));
			return { ...item, childNodes: visibleChildren };
		});
}
