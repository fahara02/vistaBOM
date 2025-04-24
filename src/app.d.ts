// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		interface Locals {
			user: import('@prisma/client').User | null;
		}
		interface PageData {
			user: import('@prisma/client').User | null;
		}
		interface Error {}
		interface PageState {}
		interface Platform {}
	}
}

export {};
