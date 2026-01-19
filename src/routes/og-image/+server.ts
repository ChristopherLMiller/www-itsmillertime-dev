import satori from 'satori';
import sharp from 'sharp';
import type { RequestHandler } from './$types';
import { readFileSync } from 'fs';
import { join } from 'path';

// Linen paper color (approximation since we can't use the texture image)
const LINEN_COLOR = '#EBE5D9';

// Cache fonts and logo
let impactLabelData: Buffer | null = null;
let logoBase64: string | null = null;

function loadFont() {
	if (!impactLabelData) {
		// Load ImpactLabel font from static folder
		const impactLabelPath = join(process.cwd(), 'static', 'ImpactLabel-lVYZ.ttf');
		impactLabelData = readFileSync(impactLabelPath);
	}

	return impactLabelData;
}

function loadLogo() {
	if (!logoBase64) {
		// Load logo from static folder
		const logoPath = join(process.cwd(), 'static', 'logo-new.png');
		const logoBuffer = readFileSync(logoPath);
		logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;
	}
	return logoBase64;
}

function createOGImage(text: string) {
	const logo = loadLogo();

	return {
		type: 'div',
		props: {
			style: {
				display: 'flex',
				width: '100%',
				height: '100%',
				background: LINEN_COLOR,
				alignItems: 'center',
				justifyContent: 'center',
				position: 'relative'
			},
			children: [
				// Centered logo
				{
					type: 'img',
					props: {
						src: logo,
						style: {
							maxWidth: '80%',
							maxHeight: '60%'
						}
					}
				},
				// Label maker tape at bottom
				{
					type: 'div',
					props: {
						style: {
							position: 'absolute',
							bottom: 80,
							left: '50%',
							transform: 'translateX(-50%) rotate(-2deg)',
							boxShadow: '0 4px 8px rgba(0,0,0,0.4), inset 0 2px 4px rgba(255,255,255,0.1)',
							borderRadius: 4,
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center'
						},
						children: {
							type: 'div',
							props: {
								style: {
									fontSize: 48,
									fontWeight: 'bold',
									backgroundColor: '#FFFFFF',
									textTransform: 'uppercase',
									textShadow: '0 2px 3px rgba(0,0,0,0.8), 0 -1px 1px rgba(255,255,255,0.3)',
									fontFamily: 'ImpactLabel'
								},
								children: text
							}
						}
					}
				}
			]
		}
	};
}

export const GET: RequestHandler = async ({ url }) => {
	const text = url.searchParams.get('text') || 'itsmillertime.dev';

	// Load font
	const impactLabelFont = loadFont();

	try {
		const markup = createOGImage(text);

		// Generate SVG with satori
		const svg = await satori(markup, {
			width: 1200,
			height: 630,
			fonts: [
				{
					name: 'ImpactLabel',
					data: impactLabelFont!,
					weight: 700,
					style: 'normal'
				}
			]
		});

		// Convert SVG to PNG using sharp
		const png = await sharp(Buffer.from(svg)).png().toBuffer();

		return new Response(png, {
			headers: {
				'Content-Type': 'image/png',
				'Cache-Control': 'public, max-age=31536000, immutable'
			}
		});
	} catch (error) {
		console.error('Error generating OG image:', error);
		return new Response('Error generating image', { status: 500 });
	}
};
