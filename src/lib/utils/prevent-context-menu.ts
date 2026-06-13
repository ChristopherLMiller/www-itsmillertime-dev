/** Blocks the browser image context menu (save/copy). */
export function preventContextMenu(event: Event): void {
	event.preventDefault();
}
