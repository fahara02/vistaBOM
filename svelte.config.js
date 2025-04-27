import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { mdsvex } from 'mdsvex';

const config = {
	preprocess: [vitePreprocess(), mdsvex()],
	kit: {
		adapter: adapter(),
		env: {
			publicPrefix: 'VITE_'
		}
	},
	extensions: ['.svelte', '.svx']
};

export default config;
