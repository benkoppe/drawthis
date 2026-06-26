import type { DrawingReference } from '$lib/references';
import { describe, expect, it, vi } from 'vitest';
import { collectReferenceCandidates } from './candidate-collector';
import type { PlannedProviderSearch } from './feed-planner';
import type { ProviderSearchRequest, ProviderSearchResult, ReferenceProvider } from './provider';
import type { ReferenceSearchSeed } from './reference-seed';

function makeReference(id: string): DrawingReference {
	return {
		id: `test:${id}`,
		provider: {
			id: 'test',
			name: 'Test provider',
			referenceId: id
		},
		title: id,
		taxonomy: { primarySubject: 'objects', topic: 'household-objects' },
		image: {
			url: `https://example.com/${id}.jpg`,
			alt: id
		},
		attribution: {
			label: 'Test provider',
			sourceName: 'Test provider',
			sourceUrl: `https://example.com/${id}`
		}
	};
}

function makeProvider(
	search: (request: ProviderSearchRequest) => ProviderSearchResult
): ReferenceProvider {
	return {
		id: 'test',
		name: 'Test provider',
		capabilities: {
			subjects: ['objects'],
			supportsSearch: true,
			supportsPagination: false,
			supportsOrientation: false,
			attributionRequired: true
		},
		async search(request) {
			return search(request);
		}
	};
}

function makeSearch(provider: ReferenceProvider, id: string): PlannedProviderSearch {
	const seed: ReferenceSearchSeed = {
		id,
		label: id,
		query: `${id} reference photo`,
		primarySubject: 'objects',
		topic: 'household-objects'
	};

	return {
		provider,
		seed,
		request: {
			count: 1,
			primarySubject: seed.primarySubject,
			topic: seed.topic,
			query: seed.query,
			seed: { id: seed.id, label: seed.label, query: seed.query }
		}
	};
}

describe('collectReferenceCandidates', () => {
	it('bounds provider search attempts', async () => {
		const requests: ProviderSearchRequest[] = [];
		const provider = makeProvider((request) => {
			requests.push(request);
			return { references: [] };
		});

		await expect(
			collectReferenceCandidates({
				searches: [
					makeSearch(provider, 'one'),
					makeSearch(provider, 'two'),
					makeSearch(provider, 'three')
				],
				count: 1,
				avoidancePolicy: { hardReferenceIds: new Set(), softReferenceIds: new Set() },
				maxProviderSearchAttempts: 2
			})
		).resolves.toEqual([]);
		expect(requests).toHaveLength(2);
	});

	it('skips a provider for the rest of the request after a failure', async () => {
		const providerError = new Error('upstream unavailable');
		const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
		let requestCount = 0;
		const provider = makeProvider(() => {
			requestCount += 1;
			throw providerError;
		});

		try {
			await expect(
				collectReferenceCandidates({
					searches: [
						makeSearch(provider, 'one'),
						makeSearch(provider, 'two'),
						makeSearch(provider, 'three')
					],
					count: 1,
					avoidancePolicy: { hardReferenceIds: new Set(), softReferenceIds: new Set() }
				})
			).rejects.toThrow(
				'No reference providers returned references. Provider failures: Test provider (test): 1 failed search.'
			);
			expect(requestCount).toBe(1);
			expect(warning).toHaveBeenCalledWith('Reference provider "test" failed', providerError);
		} finally {
			warning.mockRestore();
		}
	});

	it('adds planned seed selection context to references', async () => {
		const provider = makeProvider(() => ({ references: [makeReference('available')] }));
		const [candidate] = await collectReferenceCandidates({
			searches: [makeSearch(provider, 'seed-one')],
			count: 1,
			avoidancePolicy: { hardReferenceIds: new Set(), softReferenceIds: new Set() }
		});

		expect(candidate?.reference.selection?.seed?.id).toBe('seed-one');
	});
});
