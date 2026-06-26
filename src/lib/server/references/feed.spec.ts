import type { DrawingReference, ReferenceSubjectId } from '$lib/references';
import type { ProviderSearchRequest, ProviderSearchResult, ReferenceProvider } from './provider';
import { describe, expect, it, vi } from 'vitest';
import { getReferenceFeed } from './feed';
import type { ReferenceFeedPolicy } from './feed-policy';
import { localReferenceProvider } from './providers/local';
import { hasReferenceTrainingMetadata } from './reference-metadata';

function makeReference(
	id: string,
	primarySubject: ReferenceSubjectId = 'objects'
): DrawingReference {
	return {
		id: `test:${id}`,
		provider: {
			id: 'test',
			name: 'Test provider',
			referenceId: id
		},
		title: id,
		taxonomy: { primarySubject },
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
	search: (request: ProviderSearchRequest) => ProviderSearchResult,
	options: {
		id?: string;
		subjects?: readonly ReferenceSubjectId[];
		supportsSearch?: boolean;
	} = {}
): ReferenceProvider {
	return {
		id: options.id ?? 'test',
		name: 'Test provider',
		capabilities: {
			subjects: options.subjects ?? ['objects'],
			supportsSearch: options.supportsSearch ?? false,
			supportsPagination: false,
			supportsOrientation: false,
			attributionRequired: true
		},
		async search(request) {
			const result = search(request);

			return {
				...result,
				references: result.references.map((reference) => {
					const training = {
						...reference.training,
						focuses: request.focuses ?? reference.training?.focuses,
						sceneTypes: request.sceneTypes ?? reference.training?.sceneTypes,
						complexity: request.complexity ?? reference.training?.complexity
					};
					const selection =
						request.seed === undefined ? reference.selection : { seed: request.seed };

					return {
						...reference,
						taxonomy: {
							...reference.taxonomy,
							primarySubject: request.primarySubject ?? reference.taxonomy.primarySubject,
							...(request.topic === undefined ? {} : { topic: request.topic })
						},
						...(hasReferenceTrainingMetadata(training) ? { training } : {}),
						...(selection === undefined ? {} : { selection })
					};
				})
			};
		}
	};
}

describe('getReferenceFeed', () => {
	it('avoids recently seen references by trying another planned subject when possible', async () => {
		const firstFeed = await getReferenceFeed(
			{ count: 1 },
			{ providers: [localReferenceProvider], random: () => 0 }
		);
		const secondFeed = await getReferenceFeed(
			{ count: 1, recentReferenceIds: firstFeed.references.map((reference) => reference.id) },
			{ providers: [localReferenceProvider], random: () => 0 }
		);

		expect(secondFeed.references[0]?.id).not.toBe(firstFeed.references[0]?.id);
	});

	it('relaxes recent history after all compatible references have been seen', async () => {
		const feed = await getReferenceFeed(
			{
				count: 1,
				recentReferenceIds: [
					'local:room-interior',
					'local:street-corner',
					'local:hand-study',
					'local:still-life',
					'local:plant-window'
				]
			},
			{ providers: [localReferenceProvider], random: () => 0 }
		);

		expect(feed.references).toHaveLength(1);
	});

	it('avoids references supplied as recent context without requiring duplicate id history', async () => {
		const recentReference = makeReference('recent');
		const preferredReference = makeReference('preferred');
		const provider = makeProvider(() => ({ references: [recentReference, preferredReference] }));
		const feed = await getReferenceFeed(
			{
				count: 1,
				recentReferences: [
					{
						id: recentReference.id,
						taxonomy: recentReference.taxonomy,
						providerId: recentReference.provider.id
					}
				],
				preferences: { enabledSubjects: ['objects'] }
			},
			{ providers: [provider], random: () => 0 }
		);

		expect(feed.references.map((reference) => reference.id)).toEqual([preferredReference.id]);
	});

	it('avoids the current reference even when recent history is exhausted', async () => {
		const feed = await getReferenceFeed(
			{
				count: 1,
				currentReferenceId: 'local:hand-study',
				recentReferenceIds: [
					'local:room-interior',
					'local:street-corner',
					'local:hand-study',
					'local:still-life',
					'local:plant-window'
				]
			},
			{ providers: [localReferenceProvider], random: () => 0 }
		);

		expect(feed.references[0]?.id).not.toBe('local:hand-study');
	});

	it('allows the current reference only when it is the only compatible option', async () => {
		const feed = await getReferenceFeed(
			{
				count: 1,
				currentReferenceId: 'local:hand-study',
				preferences: { enabledSubjects: ['people'] }
			},
			{ providers: [localReferenceProvider], random: () => 0 }
		);

		expect(feed.references[0]?.id).toBe('local:hand-study');
	});

	it('relaxes soft recent references before hard current references', async () => {
		const currentReference = makeReference('current');
		const recentReference = makeReference('recent');
		const provider = makeProvider(() => ({ references: [currentReference, recentReference] }));
		const feed = await getReferenceFeed(
			{
				count: 1,
				currentReferenceId: currentReference.id,
				recentReferenceIds: [recentReference.id],
				preferences: { enabledSubjects: ['objects'] }
			},
			{ providers: [provider], random: () => 0 }
		);

		expect(feed.references.map((reference) => reference.id)).toEqual([recentReference.id]);
	});

	it('returns preferred references before soft and hard fallback references', async () => {
		const currentReference = makeReference('current');
		const recentReference = makeReference('recent');
		const preferredReference = makeReference('preferred');
		const provider = makeProvider(() => ({
			references: [currentReference, recentReference, preferredReference]
		}));
		const feed = await getReferenceFeed(
			{
				count: 3,
				currentReferenceId: currentReference.id,
				recentReferenceIds: [recentReference.id],
				preferences: { enabledSubjects: ['objects'] }
			},
			{ providers: [provider], random: () => 0 }
		);

		expect(feed.references.map((reference) => reference.id)).toEqual([
			preferredReference.id,
			recentReference.id,
			currentReference.id
		]);
	});

	it('falls back to the next compatible provider with available references', async () => {
		const emptyProvider = makeProvider(() => ({ references: [] }), { id: 'empty' });
		const availableProvider = makeProvider(() => ({ references: [makeReference('available')] }), {
			id: 'available'
		});
		const feed = await getReferenceFeed(
			{ count: 1, preferences: { enabledSubjects: ['objects'] } },
			{ providers: [emptyProvider, availableProvider], random: () => 0 }
		);

		expect(feed.references[0]?.id).toBe('test:available');
	});

	it('continues to local fallback when an external provider fails', async () => {
		const providerError = new Error('upstream unavailable');
		const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const failingProvider = makeProvider(
			() => {
				throw providerError;
			},
			{ id: 'failing', subjects: ['objects'] }
		);

		try {
			const feed = await getReferenceFeed(
				{ count: 1, preferences: { enabledSubjects: ['objects'] } },
				{ providers: [failingProvider, localReferenceProvider], random: () => 0 }
			);

			expect(feed.references[0]?.id).toBe('local:still-life');
			expect(warning).toHaveBeenCalledWith('Reference provider "failing" failed', providerError);
		} finally {
			warning.mockRestore();
		}
	});

	it('throws provider failures when no fallback returns references', async () => {
		const providerError = new Error('upstream unavailable');
		const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const failingProvider = makeProvider(
			() => {
				throw providerError;
			},
			{ id: 'failing' }
		);

		try {
			await expect(
				getReferenceFeed(
					{ count: 1, preferences: { enabledSubjects: ['objects'] } },
					{ providers: [failingProvider], random: () => 0 }
				)
			).rejects.toThrow(
				'No reference providers returned references. Provider failures: Test provider (failing): 1 failed search.'
			);
			expect(warning).toHaveBeenCalledWith('Reference provider "failing" failed', providerError);
		} finally {
			warning.mockRestore();
		}
	});

	it('restricts references to enabled subject preferences', async () => {
		const feed = await getReferenceFeed(
			{ count: 1, preferences: { enabledSubjects: ['nature'] } },
			{ providers: [localReferenceProvider], random: () => 0 }
		);

		expect(feed.references[0]?.id).toBe('local:plant-window');
		expect(feed.references[0]?.taxonomy.primarySubject).toBe('nature');
	});

	it('passes planned queries to search-capable providers', async () => {
		const requests: ProviderSearchRequest[] = [];
		const provider = makeProvider(
			(request) => {
				requests.push(request);
				return { references: [makeReference('available')] };
			},
			{ supportsSearch: true }
		);

		await getReferenceFeed(
			{ count: 1, preferences: { enabledSubjects: ['objects'] } },
			{ providers: [provider], random: () => 0 }
		);

		expect(requests[0]).toMatchObject({
			count: 10,
			primarySubject: 'objects',
			query: 'ordinary lamp chair household objects reference photo'
		});
	});

	it('requests enough provider results to account for current and recent references', async () => {
		const requests: ProviderSearchRequest[] = [];
		const provider = makeProvider((request) => {
			requests.push(request);
			return { references: [makeReference('available')] };
		});

		await getReferenceFeed(
			{
				count: 1,
				currentReferenceId: 'test:current',
				recentReferenceIds: ['test:current', 'test:recent-1', 'test:recent-2'],
				preferences: { enabledSubjects: ['objects'] }
			},
			{ providers: [provider], random: () => 0 }
		);

		expect(requests[0]?.count).toBe(10);
	});

	it('sequences batch results across subjects instead of clumping the first search subject', async () => {
		const provider = makeProvider(
			(request) => ({
				references: Array.from({ length: request.count }, (_, index) =>
					makeReference(`${request.primarySubject}-${index}`, request.primarySubject)
				)
			}),
			{
				subjects: ['people', 'objects', 'places', 'nature'],
				supportsSearch: true
			}
		);
		const feed = await getReferenceFeed({ count: 4 }, { providers: [provider], random: () => 0 });

		expect(feed.references.map((reference) => reference.taxonomy.primarySubject)).toEqual([
			'people',
			'objects',
			'places',
			'people'
		]);
	});

	it('uses multiple seeds even within a narrowed subcategory feed', async () => {
		const requests: ProviderSearchRequest[] = [];
		const provider = makeProvider(
			(request) => {
				requests.push(request);
				return { references: [makeReference(request.seed?.id ?? 'available', 'objects')] };
			},
			{ subjects: ['objects'], supportsSearch: true }
		);
		const policy: ReferenceFeedPolicy = {
			candidateCollection: {
				minimumSearchAttempts: 3,
				minimumUniqueSeedCount: 3,
				targetPreferredCandidateMultiplier: 1,
				minimumPreferredCandidateCount: 3
			},
			seeds: [
				{
					id: 'objects-household-one',
					label: 'Household one',
					query: 'ordinary household object reference photo',
					primarySubject: 'objects',
					topic: 'household-objects'
				},
				{
					id: 'objects-household-two',
					label: 'Household two',
					query: 'second household object reference photo',
					primarySubject: 'objects',
					topic: 'household-objects'
				},
				{
					id: 'objects-household-three',
					label: 'Household three',
					query: 'third household object reference photo',
					primarySubject: 'objects',
					topic: 'household-objects'
				}
			]
		};
		const feed = await getReferenceFeed(
			{
				count: 3,
				preferences: { enabledSubjects: ['objects'], enabledTopics: ['household-objects'] }
			},
			{ providers: [provider], policy, random: () => 0 }
		);

		expect(requests.map((request) => request.seed?.id)).toEqual([
			'objects-household-one',
			'objects-household-two',
			'objects-household-three'
		]);
		expect(new Set(feed.references.map((reference) => reference.selection?.seed?.id))).toEqual(
			new Set(['objects-household-one', 'objects-household-two', 'objects-household-three'])
		);
	});

	it('starts a refilled batch with a different subject than the visible queue tail when possible', async () => {
		const provider = makeProvider(
			(request) => ({
				references: Array.from({ length: request.count }, (_, index) =>
					makeReference(`${request.primarySubject}-${index}`, request.primarySubject)
				)
			}),
			{ subjects: ['objects', 'places'], supportsSearch: true }
		);
		const feed = await getReferenceFeed(
			{
				count: 2,
				precedingReferences: [
					{ id: 'test:queued', taxonomy: { primarySubject: 'objects' }, providerId: 'test' }
				]
			},
			{ providers: [provider], random: () => 0 }
		);

		expect(feed.references.map((reference) => reference.taxonomy.primarySubject)).toEqual([
			'places',
			'objects'
		]);
	});

	it('bounds provider search attempts using feed policy', async () => {
		const requests: ProviderSearchRequest[] = [];
		const provider = makeProvider(
			(request) => {
				requests.push(request);
				return { references: [] };
			},
			{
				id: 'empty',
				subjects: ['objects'],
				supportsSearch: true
			}
		);

		await getReferenceFeed(
			{ count: 1, preferences: { enabledSubjects: ['objects'] } },
			{
				providers: [provider],
				policy: {
					maxProviderSearchAttempts: 2,
					seeds: [
						{
							id: 'objects-household',
							label: 'Household',
							query: 'ordinary household object reference photo',
							primarySubject: 'objects',
							topic: 'household-objects'
						},
						{
							id: 'objects-tools',
							label: 'Tools',
							query: 'ordinary tools object reference photo',
							primarySubject: 'objects',
							topic: 'tools'
						},
						{
							id: 'objects-food',
							label: 'Food',
							query: 'ordinary food object reference photo',
							primarySubject: 'objects',
							topic: 'food'
						}
					]
				},
				random: () => 0
			}
		);

		expect(requests).toHaveLength(2);
	});

	it('rejects invalid counts', async () => {
		await expect(getReferenceFeed({ count: 0 })).rejects.toThrow(
			'count must be an integer between 1 and 10'
		);
	});
});
