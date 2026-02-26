import adapterNode from '@sveltejs/adapter-node';
import adapterAuto from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		adapter: process.env.VERCEL
			? adapterAuto()
			: adapterNode({
					// Build output directory
					out: 'build',
					// Precompress static assets
					precompress: true,
					// Environment variable prefix for runtime config
					envPrefix: ''
				})
	}
};

export default config;
