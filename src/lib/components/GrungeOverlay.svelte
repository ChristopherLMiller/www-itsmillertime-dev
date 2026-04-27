<script lang="ts">
	import { onMount } from 'svelte';

	interface Props {
		/**
		 * When set, lock appearance. When omitted, follow `prefers-color-scheme`.
		 * 'dark' = light grunge on dark bg; 'light' = dark grunge on light bg.
		 */
		mode?: 'dark' | 'light';
		/** 0–1. How visible the grunge is. */
		opacity?: number;
		/** 0–1. Size of the noise structures. */
		scale?: number;
		/** 0–1. How fast it moves. */
		speed?: number;
	}

	let { mode: modeProp, opacity = 1, scale = 0.5, speed = 0.5 }: Props = $props();

	let canvas: HTMLCanvasElement;
	let host: HTMLDivElement;
	let mode = $state<'dark' | 'light'>('dark');
	let animId: number = 0;

	// ——— GLSL ———

	const VERT = `
		attribute vec2 a_pos;
		void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
	`;

	const FRAG = `
		precision highp float;
		uniform float u_time;
		uniform float u_opacity;
		uniform float u_scale;
		uniform float u_speed;
		uniform vec2  u_res;
		uniform float u_dark;

		float hash(vec2 p) {
			return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
		}

		float noise(vec2 p) {
			vec2 i = floor(p), f = fract(p);
			vec2 u = f * f * (3.0 - 2.0 * f);
			return mix(
				mix(hash(i),             hash(i + vec2(1,0)), u.x),
				mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x),
				u.y
			);
		}

		float fbm(vec2 p, int oct) {
			float v = 0.0, a = 0.5;
			mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
			for (int i = 0; i < 7; i++) {
				if (i >= oct) break;
				v += a * noise(p);
				p  = rot * p * 2.0 + vec2(1.7, 9.2);
				a *= 0.48;
			}
			return v;
		}

		vec2 curl(vec2 p, float t, float st) {
			float eps = 0.01;
			/* Curl offset: keep magnitude bounded — linear * t made motion accelerate forever */
			float offA = t * 0.11 + st * 0.55 + noise(vec2(6.0, st * 0.28)) * 0.6;
			float offR = 0.5 + 0.55 * sin(t * 0.32 + st * 0.04) + 0.25 * sin(t * 0.19);
			vec2 off = vec2(cos(offA), sin(offA)) * offR;
			float n1 = fbm(p + vec2(0.0, eps) + off, 4);
			float n2 = fbm(p - vec2(0.0, eps) + off, 4);
			float n3 = fbm(p + vec2(eps, 0.0) + off, 4);
			float n4 = fbm(p - vec2(eps, 0.0) + off, 4);
			return vec2((n1 - n2) / (2.0 * eps), -(n3 - n4) / (2.0 * eps));
		}

		void main() {
			vec2 uv   = gl_FragCoord.xy / u_res;
			float asp = u_res.x / u_res.y;
			float sc  = 0.6 + u_scale * 3.0;
			vec2 p    = vec2(uv.x * asp, uv.y) * sc;
			float spd = 0.04 + u_speed * 0.18;
			float t   = u_time * spd;

			float slowT = u_time * spd * 0.08;

			/* Whole-field rotation + slow wobble: dominant direction changes over time */
			float fieldRot = slowT * 0.32
				+ noise(vec2(slowT * 0.11, 0.81)) * 0.7
				+ noise(vec2(2.7, slowT * 0.14)) * 0.5;
			float cfr = cos(fieldRot);
			float sfr = sin(fieldRot);
			p = mat2(cfr, sfr, -sfr, cfr) * p;

			float driftAngle = noise(vec2(slowT * 0.7, 0.3)) * 6.2832
				+ slowT * 0.18
				+ noise(vec2(9.0, slowT * 0.22)) * 0.3;
			float driftAmt   = noise(vec2(0.5, slowT * 0.5)) * 0.6;
			vec2  drift      = vec2(cos(driftAngle), sin(driftAngle)) * driftAmt;

			float swirlAmt  = (noise(vec2(slowT * 0.4, 1.7)) * 2.0 - 1.0) * 0.8;
			float swirlFreq = noise(vec2(1.3, slowT * 0.3)) * 1.5 + 0.5;

			vec2 wp   = p + drift;
			vec2 flow = curl(wp * swirlFreq, t, slowT) * (0.4 + swirlAmt * 0.3);
			wp = wp + flow;

			float phase1 = noise(vec2(slowT * 0.6, 2.1)) * 6.28;
			float phase2 = noise(vec2(3.3, slowT * 0.5)) * 6.28;
			float phase3 = noise(vec2(slowT * 0.35, 5.7)) * 6.28;

			/* Rotating advection: bounded wobble — was t * v and ramped to infinity with session length */
			float angAd1   = slowT * 0.38 + noise(vec2(5.0, slowT * 0.2)) * 0.6;
			float a1c = cos(angAd1);
			float a1s = sin(angAd1);
			float wAdv1 = 1.5 + 0.85 * sin(t * 0.11) + 0.45 * sin(t * 0.19 + 0.4);
			vec2 advect1 = wAdv1 * 0.42 * (mat2(a1c, a1s, -a1s, a1c) * vec2(0.22, 0.13));
			float advectA3 = slowT * 0.26 + noise(vec2(4.0, slowT * 0.2)) * 0.45;
			float wAdvV = 0.5 + 0.5 * sin(slowT * 0.14) + 0.3 * sin(t * 0.16);
			vec2 advectV = wAdvV * 0.09 * vec2(sin(advectA3 + 0.2), cos(advectA3 - 0.15));

			vec2 q = vec2(
				fbm(wp + vec2(cos(phase1) * 0.5, sin(phase1) * 0.5) + advect1, 5),
				fbm(wp + vec2(5.2, 1.3) + vec2(cos(phase2) * 0.4, 0.0) + advectV, 5)
			);

			float angAd2   = slowT * 0.25 + noise(vec2(1.0, slowT * 0.3)) * 0.4;
			float a2c = cos(angAd2);
			float a2s = sin(angAd2);
			float wAdv2 = 0.4 + 0.35 * sin(slowT * 0.11) + 0.28 * sin(t * 0.21) + 0.2 * sin(slowT * 0.05 + t * 0.05);
			vec2 advect2 = wAdv2 * 0.06 * (mat2(a2c, a2s, -a2s, a2c) * vec2(0.88, 0.53));

			vec2 r = vec2(
				fbm(wp + 2.8 * q + vec2(1.7 + cos(phase3) * 0.3, 9.2), 5),
				fbm(wp + 2.8 * q + vec2(8.3, 2.8 + sin(phase1) * 0.3), 5)
			);

			float warpStrength = 1.8 + noise(vec2(slowT * 0.45, slowT * 0.3)) * 1.2;
			float n = fbm(wp + warpStrength * r + advect2, 6);

			/* Softer curve = brighter midtones; extra gain in dark mode so grain reads */
			float shaped = pow(max(0.0, n), 1.52);
			float alpha  = shaped * u_opacity * mix(1.0, 1.14, u_dark);

			float fg = u_dark > 0.5 ? 1.0 : 0.0;
			gl_FragColor = vec4(fg, fg, fg, alpha);
		}
	`;

	function compileShader(gl: WebGLRenderingContext, type: number, src: string) {
		const s = gl.createShader(type)!;
		gl.shaderSource(s, src);
		gl.compileShader(s);
		if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
			console.error('[GrungeOverlay] shader error:', gl.getShaderInfoLog(s));
		}
		return s;
	}

	onMount(() => {
		let offMql: (() => void) | undefined;
		if (modeProp === undefined) {
			mode = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
		} else {
			mode = modeProp;
		}

		const gl = (canvas.getContext('webgl', {
			alpha: true,
			premultipliedAlpha: false
		}) ??
			canvas.getContext('experimental-webgl', {
				alpha: true,
				premultipliedAlpha: false
			})) as WebGLRenderingContext | null;

		if (!gl) {
			console.warn('[GrungeOverlay] WebGL not available');
			offMql?.();
			return;
		}

		const g = gl;

		const prog = g.createProgram()!;
		const vs = compileShader(g, g.VERTEX_SHADER, VERT);
		const fs = compileShader(g, g.FRAGMENT_SHADER, FRAG);
		if (
			!g.getShaderParameter(vs, g.COMPILE_STATUS) ||
			!g.getShaderParameter(fs, g.COMPILE_STATUS)
		) {
			console.error('[GrungeOverlay] vertex or fragment shader failed to compile');
			g.deleteShader(vs);
			g.deleteShader(fs);
			g.deleteProgram(prog);
			offMql?.();
			return;
		}
		g.attachShader(prog, vs);
		g.attachShader(prog, fs);
		g.linkProgram(prog);
		if (!g.getProgramParameter(prog, g.LINK_STATUS)) {
			console.error('[GrungeOverlay] program link error:', g.getProgramInfoLog(prog));
			g.deleteShader(vs);
			g.deleteShader(fs);
			g.deleteProgram(prog);
			offMql?.();
			return;
		}
		g.deleteShader(vs);
		g.deleteShader(fs);
		g.useProgram(prog);

		const buf = g.createBuffer();
		g.bindBuffer(g.ARRAY_BUFFER, buf);
		g.bufferData(g.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), g.STATIC_DRAW);
		const aloc = g.getAttribLocation(prog, 'a_pos');
		if (aloc < 0) {
			console.error('[GrungeOverlay] a_pos not found in program');
			offMql?.();
			g.deleteProgram(prog);
			g.deleteBuffer(buf);
			return;
		}
		g.enableVertexAttribArray(aloc);
		g.vertexAttribPointer(aloc, 2, g.FLOAT, false, 0, 0);

		g.enable(g.BLEND);
		g.blendFunc(g.SRC_ALPHA, g.ONE_MINUS_SRC_ALPHA);

		const uTime = g.getUniformLocation(prog, 'u_time');
		const uOp = g.getUniformLocation(prog, 'u_opacity');
		const uSc = g.getUniformLocation(prog, 'u_scale');
		const uSp = g.getUniformLocation(prog, 'u_speed');
		const uRes = g.getUniformLocation(prog, 'u_res');
		const uDark = g.getUniformLocation(prog, 'u_dark');

		const mqMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

		function render(t: number) {
			g.useProgram(prog);
			g.bindBuffer(g.ARRAY_BUFFER, buf);
			g.enableVertexAttribArray(aloc);
			g.vertexAttribPointer(aloc, 2, g.FLOAT, false, 0, 0);
			g.clearColor(0, 0, 0, 0);
			g.clear(g.COLOR_BUFFER_BIT);
			g.uniform1f(uTime, t);
			g.uniform1f(uOp, opacity);
			g.uniform1f(uSc, scale);
			g.uniform1f(uSp, speed);
			g.uniform2f(uRes, canvas.width, canvas.height);
			g.uniform1f(uDark, mode === 'dark' ? 1.0 : 0.0);
			g.drawArrays(g.TRIANGLE_STRIP, 0, 4);
		}

		function redrawIfStatic() {
			if (mqMotion.matches) render(0);
		}

		const setSize = () => {
			const dpr = Math.min(2, devicePixelRatio || 1);
			const rect = host.getBoundingClientRect();
			let cssW = rect.width;
			let cssH = rect.height;
			if (cssW < 2 || cssH < 2) {
				cssW = window.innerWidth;
				cssH = window.innerHeight;
			}
			const w = Math.max(1, Math.floor(cssW * dpr));
			const h = Math.max(1, Math.floor(cssH * dpr));
			if (w !== canvas.width || h !== canvas.height) {
				canvas.width = w;
				canvas.height = h;
				g.viewport(0, 0, w, h);
			}
			redrawIfStatic();
		};

		const ro = new ResizeObserver(() => {
			setSize();
		});
		ro.observe(host);
		setSize();
		requestAnimationFrame(() => {
			setSize();
		});

		let tStart = performance.now();
		function tick() {
			if (mqMotion.matches) return;
			const t = (performance.now() - tStart) / 1000;
			render(t);
			animId = requestAnimationFrame(tick);
		}

		function onMotionChange() {
			cancelAnimationFrame(animId);
			if (mqMotion.matches) {
				render(0);
			} else {
				tStart = performance.now();
				tick();
			}
		}

		if (modeProp === undefined) {
			const mq = window.matchMedia('(prefers-color-scheme: dark)');
			const onScheme = () => {
				mode = mq.matches ? 'dark' : 'light';
				redrawIfStatic();
			};
			mq.addEventListener('change', onScheme);
			offMql = () => mq.removeEventListener('change', onScheme);
		}

		mqMotion.addEventListener('change', onMotionChange);

		if (mqMotion.matches) {
			render(0);
		} else {
			tick();
		}

		return () => {
			offMql?.();
			mqMotion.removeEventListener('change', onMotionChange);
			cancelAnimationFrame(animId);
			ro.disconnect();
			g.deleteProgram(prog);
			g.deleteBuffer(buf);
		};
	});
</script>

<div bind:this={host} class="grunge-overlay-host">
	<canvas bind:this={canvas} class="grunge-overlay" aria-hidden="true"></canvas>
</div>

<style>
	/* Behind all site UI: first in .site-foreground + z-0; siblings paint on top */
	.grunge-overlay-host {
		position: fixed;
		inset: 0;
		z-index: 0;
		width: 100vw;
		min-width: 100%;
		height: 100vh;
		height: 100dvh;
		min-height: 100%;
		pointer-events: none;
	}

	/**
	 * No mix-blend-mode: multiply — it tends to turn transparent GL pixels
	 * and canvas edges solid black in many browsers. The fragment shader
	 * already encodes light-on-dark (or dark-on-light) with alpha; normal
	 * SRC_ALPHA blending over the body background is enough.
	 */
	.grunge-overlay {
		display: block;
		width: 100%;
		height: 100%;
		max-width: none;
		max-height: none;
	}
</style>
