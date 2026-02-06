import devtoolsJson from 'vite-plugin-devtools-json';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => ({
	plugins: [sveltekit(), devtoolsJson()],
	build: {
		// Disable source maps in production for security
		sourcemap: mode !== 'production'
	}
}));
