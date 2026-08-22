/** Same-origin return URL, or a fallback path on this origin. */
export function sameOriginReturnUrl(
	raw: string | null | undefined,
	origin: string,
	fallbackPath: string
): string {
	const fallback = `${origin}${fallbackPath.startsWith('/') ? fallbackPath : `/${fallbackPath}`}`;
	if (!raw) return fallback;
	try {
		const target = new URL(raw, origin);
		if (target.origin !== origin) return fallback;
		if (target.protocol !== 'http:' && target.protocol !== 'https:') return fallback;
		return target.toString();
	} catch {
		return fallback;
	}
}

export function redirectHtml(dest: string, message: string): string {
	const jsonDest = JSON.stringify(dest);
	const escaped = dest
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;');
	return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="referrer" content="no-referrer" />
  <meta http-equiv="refresh" content="0;url=${escaped}" />
  <title>Redirecting…</title>
</head>
<body>
  <p>${message} <a href="${escaped}">Continue</a></p>
  <script>location.replace(${jsonDest});</script>
</body>
</html>`;
}
