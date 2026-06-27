// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
interface Rybbit {
	pageview: () => void;
	event: (name: string, properties?: Record<string, string | number>) => void;
	onReady?: (callback: (rybbit: Rybbit) => void) => void;
}

declare global {
	interface Window {
		rybbit?: Rybbit;
		__RYBBIT_OPTOUT__?: boolean;
	}

	namespace App {
		interface Platform {
			env: Env;
			ctx: ExecutionContext;
			caches: CacheStorage;
			cf?: IncomingRequestCfProperties;
		}

		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
	}
}

export {};
