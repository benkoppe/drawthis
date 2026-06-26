import { describe, expect, it } from 'vitest';
import type { DrawingReference } from './types';
import {
	createReferenceCategorySelectionSnapshot,
	filterReferencesByCategorySelectionSnapshot,
	getReferenceCategorySelectionKey,
	isReferenceInCategorySelectionSnapshot
} from './category-selection';

function makeReference(
	primarySubject: DrawingReference['taxonomy']['primarySubject'],
	topic?: DrawingReference['taxonomy']['topic']
): DrawingReference {
	return {
		id: `test:${primarySubject}:${topic ?? 'none'}`,
		provider: {
			id: 'test',
			name: 'Test provider',
			referenceId: `${primarySubject}:${topic ?? 'none'}`
		},
		title: 'Test reference',
		taxonomy: { primarySubject, ...(topic === undefined ? {} : { topic }) },
		image: {
			url: 'https://example.com/reference.jpg',
			alt: 'Test reference'
		},
		attribution: {
			label: 'Test provider',
			sourceName: 'Test provider',
			sourceUrl: 'https://example.com/reference'
		}
	};
}

describe('reference category selection snapshots', () => {
	it('normalizes subjects and topics into stable taxonomy order', () => {
		const selection = createReferenceCategorySelectionSnapshot(
			['nature', 'objects', 'objects'],
			['plants-flowers', 'tools', 'tools']
		);

		expect(selection.subjects).toEqual(['objects', 'nature']);
		expect(selection.topics).toEqual(['tools', 'plants-flowers']);
	});

	it('creates stable keys regardless of input order and duplicates', () => {
		expect(
			getReferenceCategorySelectionKey(
				['nature', 'objects', 'objects'],
				['plants-flowers', 'tools']
			)
		).toBe(getReferenceCategorySelectionKey(['objects', 'nature'], ['tools', 'plants-flowers']));
	});

	it('drops topics outside the enabled subject set', () => {
		const selection = createReferenceCategorySelectionSnapshot(
			['objects'],
			['tools', 'plants-flowers']
		);

		expect(selection.topics).toEqual(['tools']);
	});

	it('matches and filters references by selected subject and topic', () => {
		const selection = createReferenceCategorySelectionSnapshot(['objects'], ['tools']);
		const toolReference = makeReference('objects', 'tools');
		const foodReference = makeReference('objects', 'food');
		const plantReference = makeReference('nature', 'plants-flowers');

		expect(isReferenceInCategorySelectionSnapshot(toolReference, selection)).toBe(true);
		expect(isReferenceInCategorySelectionSnapshot(foodReference, selection)).toBe(false);
		expect(isReferenceInCategorySelectionSnapshot(plantReference, selection)).toBe(false);
		expect(
			filterReferencesByCategorySelectionSnapshot(
				[toolReference, foodReference, plantReference],
				selection
			)
		).toEqual([toolReference]);
	});

	it('creates a stable empty selection key', () => {
		expect(createReferenceCategorySelectionSnapshot([], [])).toEqual({
			subjects: [],
			topics: [],
			key: ':'
		});
	});
});
