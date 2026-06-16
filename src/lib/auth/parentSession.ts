export type SessionShape = { user?: Record<string, unknown> } | null;

/** Read session from a parent layout load (universal +layout.ts). */
export async function getParentSession(parent: () => Promise<unknown>): Promise<SessionShape> {
	const data = (await parent()) as { session?: SessionShape };
	return data.session ?? null;
}
