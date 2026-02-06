import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		adapter: adapter({
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
