import { getServerConfig, type ServerConfig } from '$lib/server/config';
import type { ReferenceProvider } from '../provider';
import { localReferenceProvider } from './local';
import { createOpenverseReferenceProvider } from './openverse';
import { createPexelsReferenceProvider } from './pexels';

export function createReferenceProviders(
	config: ServerConfig = getServerConfig()
): ReferenceProvider[] {
	const providers: ReferenceProvider[] = [];

	if (config.references.pexels !== undefined) {
		providers.push(createPexelsReferenceProvider(config.references.pexels));
	}

	if (config.references.openverse !== undefined) {
		providers.push(createOpenverseReferenceProvider(config.references.openverse));
	}

	if (config.references.local !== undefined) {
		providers.push(localReferenceProvider);
	}

	return providers;
}
