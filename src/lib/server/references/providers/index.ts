import { serverConfig, type ServerConfig } from '$lib/server/config';
import type { ReferenceProvider } from '../provider';
import { localReferenceProvider } from './local';
import { createOpenverseReferenceProvider } from './openverse';

export function createReferenceProviders(config: ServerConfig = serverConfig): ReferenceProvider[] {
	const providers: ReferenceProvider[] = [];

	if (config.references.openverse !== undefined) {
		providers.push(createOpenverseReferenceProvider(config.references.openverse));
	}

	providers.push(localReferenceProvider);

	return providers;
}

export const referenceProviders = createReferenceProviders();
