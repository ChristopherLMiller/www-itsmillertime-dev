export type NsfwFiltering = 'hide' | 'blur' | 'show';

export type ProfileAlbum = {
	id: number;
	title: string;
	slug: string;
};

export type ProfileUserView = {
	id: string | number;
	email: string | null;
	name: string | null;
	displayName: string | null;
	nsfwFiltering: NsfwFiltering | null;
	bggUsername: string | null;
	image: string | null;
	role: string[];
	emailVerified: boolean | null;
	twoFactorEnabled: boolean | null;
	banned: boolean | null;
	createdAt: string | null;
	albums: ProfileAlbum[];
};

export type AuthSessionView = {
	id: string | null;
	token: string | null;
	createdAt: string | Date | null;
	expiresAt: string | Date | null;
	ipAddress: string | null;
	userAgent: string | null;
};

export type ShopLinkStatus = {
	linked: boolean;
	medusa_customer_id: string | null;
	medusa_customer_email: string | null;
	linked_at: string | null;
	error: string | null;
};
