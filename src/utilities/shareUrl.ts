/**
 * Generates share URLs for various social platforms
 *
 * @param platform - The social platform to share to
 * @param url - The URL to share
 * @param title - Optional title for the share
 * @returns The formatted share URL for the specified platform
 */
export function generateShareUrl(
	platform: 'facebook' | 'twitter' | 'linkedin' | 'reddit',
	url: string,
	title?: string
): string {
	const encodedUrl = encodeURIComponent(url);
	const encodedTitle = title ? encodeURIComponent(title) : '';

	const shareUrls = {
		facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
		twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
		linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
		reddit: `https://reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`
	};

	return shareUrls[platform];
}

/**
 * Copies text to clipboard using the modern Clipboard API
 *
 * @param text - The text to copy to the clipboard
 * @returns Promise that resolves to true if successful, false otherwise
 */
export async function copyToClipboard(text: string): Promise<boolean> {
	try {
		await navigator.clipboard.writeText(text);
		return true;
	} catch (err) {
		console.error('Failed to copy to clipboard:', err);
		return false;
	}
}
