import type { DrawingReference } from './types';
import {
	appendReferenceTimelineEntry,
	createReferenceTimelineEntry,
	maxReferenceTabTimelineEntries,
	parseReferenceTabTimelineState,
	serializeReferenceTabTimelineState,
	trimReferenceTabTimelineEntries,
	type ReferenceTimelineEntry
} from './timeline';
import { describe, expect, it } from 'vitest';

function makeReference(id: string): DrawingReference {
	return {
		id: `test:${id}`,
		provider: {
			id: 'test',
			name: 'Test provider',
			referenceId: id
		},
		title: `Reference ${id}`,
		category: 'still-life',
		image: {
			url: `https://example.com/${id}.jpg`,
			alt: `Reference ${id}`,
			width: 800,
			height: 600
		},
		attribution: {
			label: 'Example Creator',
			sourceName: 'Example',
			sourceUrl: `https://example.com/${id}`,
			creatorName: 'Example Creator',
			creatorUrl: 'https://example.com/creator',
			licenseName: 'Example License',
			licenseUrl: 'https://example.com/license'
		}
	};
}

function makeEntry(id: string): ReferenceTimelineEntry {
	return createReferenceTimelineEntry(
		makeReference(id),
		'tab-test',
		new Date(`2026-01-01T00:00:00.${id.padStart(3, '0')}Z`)
	);
}

describe('reference timeline helpers', () => {
	it('round-trips serialized per-tab timeline state', () => {
		const state = {
			tabId: 'tab-a',
			entryIds: ['entry-1', 'entry-2'],
			cursorEntryId: 'entry-1'
		};

		expect(parseReferenceTabTimelineState(serializeReferenceTabTimelineState(state))).toEqual(
			state
		);
	});

	it('ignores invalid serialized per-tab timeline state', () => {
		expect(parseReferenceTabTimelineState('not json')).toBeUndefined();
		expect(
			parseReferenceTabTimelineState(JSON.stringify({ tabId: '', entryIds: [] }))
		).toBeUndefined();
		expect(parseReferenceTabTimelineState(JSON.stringify({ tabId: 'tab-a' }))).toBeUndefined();
	});

	it('sanitizes duplicate and invalid entry IDs', () => {
		expect(
			parseReferenceTabTimelineState(
				JSON.stringify({
					tabId: ' tab-a ',
					entryIds: ['entry-1', '', ' ', 42, 'entry-1', 'entry-2'],
					cursorEntryId: 'entry-2'
				})
			)
		).toEqual({ tabId: 'tab-a', entryIds: ['entry-1', 'entry-2'], cursorEntryId: 'entry-2' });
	});

	it('drops a cursor entry ID that is not present in the timeline', () => {
		expect(
			parseReferenceTabTimelineState(
				JSON.stringify({
					tabId: 'tab-a',
					entryIds: ['entry-1'],
					cursorEntryId: 'entry-2'
				})
			)
		).toEqual({ tabId: 'tab-a', entryIds: ['entry-1'] });
	});

	it('creates entries with full reference snapshots', () => {
		const reference = makeReference('1');
		const entry = createReferenceTimelineEntry(
			reference,
			'tab-a',
			new Date('2026-01-01T00:00:00.000Z')
		);

		expect(entry).toMatchObject({
			referenceId: reference.id,
			seenAt: '2026-01-01T00:00:00.000Z',
			tabId: 'tab-a',
			reference
		});
		expect(entry.id.length).toBeGreaterThan(0);
	});

	it('appends new entries and avoids consecutive duplicate references', () => {
		const firstEntry = makeEntry('1');
		const duplicateEntry = createReferenceTimelineEntry(
			firstEntry.reference,
			'tab-test',
			new Date('2026-01-01T00:00:01.000Z')
		);
		const secondEntry = makeEntry('2');

		expect(appendReferenceTimelineEntry([], firstEntry)).toEqual([firstEntry]);
		expect(appendReferenceTimelineEntry([firstEntry], duplicateEntry)).toEqual([firstEntry]);
		expect(appendReferenceTimelineEntry([firstEntry], secondEntry)).toEqual([
			firstEntry,
			secondEntry
		]);
	});

	it('truncates forward per-tab navigation entries when appending after going back', () => {
		const entries = [makeEntry('1'), makeEntry('2'), makeEntry('3')];
		const nextEntry = makeEntry('4');

		expect(appendReferenceTimelineEntry(entries, nextEntry, 0)).toEqual([entries[0], nextEntry]);
	});

	it('trims per-tab timeline entries to the maximum retained count', () => {
		const entries = Array.from({ length: maxReferenceTabTimelineEntries + 5 }, (_, index) =>
			makeEntry(String(index).padStart(3, '0'))
		);

		expect(trimReferenceTabTimelineEntries(entries)).toEqual(entries.slice(5));
	});
});
