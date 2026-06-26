import { describe, expect, it } from 'vitest';
import {
	createReferenceSelectionFromProviderRequest,
	createReferenceTaxonomyFromProviderRequest,
	createReferenceTrainingFromProviderRequest,
	hasReferenceTrainingMetadata
} from './reference-metadata';

import type { ProviderSearchRequest } from './provider';

const baseRequest = {
	count: 1,
	primarySubject: 'places'
} satisfies ProviderSearchRequest;

describe('reference metadata helpers', () => {
	it('creates taxonomy metadata from provider requests', () => {
		expect(
			createReferenceTaxonomyFromProviderRequest({
				...baseRequest,
				topic: 'kitchens-workspaces',
				secondarySubjects: ['objects']
			})
		).toEqual({
			primarySubject: 'places',
			topic: 'kitchens-workspaces',
			secondarySubjects: ['objects']
		});
	});

	it('throws when provider taxonomy cannot be created without a primary subject', () => {
		expect(() => createReferenceTaxonomyFromProviderRequest({ count: 1 })).toThrow(
			'Provider request requires a planned reference subject'
		);
	});

	it('omits empty training metadata', () => {
		expect(createReferenceTrainingFromProviderRequest(baseRequest)).toBeUndefined();
		expect(hasReferenceTrainingMetadata({})).toBe(false);
	});

	it('creates populated training metadata from provider requests', () => {
		expect(
			createReferenceTrainingFromProviderRequest({
				...baseRequest,
				focuses: ['perspective'],
				sceneTypes: ['interior'],
				complexity: 'complex'
			})
		).toEqual({
			focuses: ['perspective'],
			sceneTypes: ['interior'],
			complexity: 'complex'
		});
	});

	it('omits empty selection metadata and creates seed selection metadata', () => {
		expect(createReferenceSelectionFromProviderRequest(baseRequest)).toBeUndefined();
		expect(
			createReferenceSelectionFromProviderRequest({
				...baseRequest,
				seed: { id: 'places-room-corner', label: 'Room corner', query: 'ordinary room corner' }
			})
		).toEqual({
			seed: { id: 'places-room-corner', label: 'Room corner', query: 'ordinary room corner' }
		});
	});
});
