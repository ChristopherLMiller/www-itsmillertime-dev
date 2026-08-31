type ToastVariant = 'success' | 'error';

export type ToastItem = {
	id: number;
	message: string;
	variant: ToastVariant;
};

export const toastState = $state<{ items: ToastItem[] }>({ items: [] });

let nextId = 0;
const timers = new Map<number, ReturnType<typeof setTimeout>>();

export function showToast(
	message: string,
	variant: ToastVariant = 'success',
	durationMs = 4000
): void {
	const id = ++nextId;
	toastState.items = [...toastState.items, { id, message, variant }];
	const timer = setTimeout(() => dismissToast(id), durationMs);
	timers.set(id, timer);
}

export function dismissToast(id: number): void {
	const timer = timers.get(id);
	if (timer) {
		clearTimeout(timer);
		timers.delete(id);
	}
	toastState.items = toastState.items.filter((item) => item.id !== id);
}
