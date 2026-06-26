import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { DrawingReference } from './types';

export const referenceTimelineSessionStorageKey = 'drawthis:reference-timeline:v2';
export const maxReferenceTabTimelineEntries = 200;
export const maxReferenceHistoryEntries = 500;

const referenceHistoryDatabaseName = 'drawthis-reference-history-v3';
const referenceHistoryDatabaseVersion = 1;
const referenceHistoryEntryStoreName = 'referenceHistoryEntries';
const referenceHistoryMetaStoreName = 'referenceHistoryMeta';
const referenceHistorySeenAtIndexName = 'seenAt';
const lastViewedEntryMetaKey = 'lastViewedEntryId';

export interface ReferenceTimelineEntry {
	id: string;
	referenceId: string;
	seenAt: string;
	tabId: string;
	reference: DrawingReference;
}

export interface ReferenceTabTimelineState {
	tabId: string;
	entryIds: string[];
	cursorEntryId?: string;
}

interface ReferenceHistoryMetaRecord {
	key: string;
	value: string;
}

interface ReferenceHistoryDatabase extends DBSchema {
	[referenceHistoryEntryStoreName]: {
		key: string;
		value: ReferenceTimelineEntry;
		indexes: {
			[referenceHistorySeenAtIndexName]: string;
		};
	};
	[referenceHistoryMetaStoreName]: {
		key: string;
		value: ReferenceHistoryMetaRecord;
	};
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function sanitizeNonEmptyString(value: unknown): string | undefined {
	if (typeof value !== 'string') {
		return undefined;
	}

	const trimmed = value.trim();

	return trimmed.length > 0 ? trimmed : undefined;
}

function createRandomIdSegment(): string {
	const crypto = globalThis.crypto;

	if (crypto?.randomUUID !== undefined) {
		return crypto.randomUUID();
	}

	if (crypto?.getRandomValues !== undefined) {
		const values = new Uint32Array(4);
		crypto.getRandomValues(values);
		return [...values].map((value) => value.toString(36)).join('-');
	}

	return Math.random().toString(36).slice(2);
}

function createTimelineEntryId(now: Date): string {
	return `${now.getTime().toString(36)}-${createRandomIdSegment()}`;
}

export function createReferenceTimelineTabId(): string {
	return `tab-${Date.now().toString(36)}-${createRandomIdSegment()}`;
}

export function createReferenceTimelineEntry(
	reference: DrawingReference,
	tabId: string,
	now = new Date()
): ReferenceTimelineEntry {
	return {
		id: createTimelineEntryId(now),
		referenceId: reference.id,
		seenAt: now.toISOString(),
		tabId,
		reference
	};
}

export function trimReferenceTabTimelineEntries(
	entries: readonly ReferenceTimelineEntry[]
): ReferenceTimelineEntry[] {
	return entries.slice(-maxReferenceTabTimelineEntries);
}

export function appendReferenceTimelineEntry(
	entries: readonly ReferenceTimelineEntry[],
	entry: ReferenceTimelineEntry,
	cursorIndex = entries.length - 1
): ReferenceTimelineEntry[] {
	const retainedEntries = entries.slice(0, Math.max(cursorIndex + 1, 0));
	const previousEntry = retainedEntries.at(-1);

	if (previousEntry?.referenceId === entry.referenceId) {
		return trimReferenceTabTimelineEntries(retainedEntries);
	}

	return trimReferenceTabTimelineEntries([...retainedEntries, entry]);
}

export function parseReferenceTabTimelineState(
	value: string | null | undefined
): ReferenceTabTimelineState | undefined {
	if (value === null || value === undefined || value.length === 0) {
		return undefined;
	}

	let parsed: unknown;

	try {
		parsed = JSON.parse(value);
	} catch {
		return undefined;
	}

	if (!isRecord(parsed)) {
		return undefined;
	}

	const tabId = sanitizeNonEmptyString(parsed.tabId);

	if (tabId === undefined || !Array.isArray(parsed.entryIds)) {
		return undefined;
	}

	const entryIds: string[] = [];

	for (const entryIdValue of parsed.entryIds) {
		const entryId = sanitizeNonEmptyString(entryIdValue);

		if (entryId === undefined || entryIds.includes(entryId)) {
			continue;
		}

		entryIds.push(entryId);
	}

	const trimmedEntryIds = entryIds.slice(-maxReferenceTabTimelineEntries);
	const cursorEntryId = sanitizeNonEmptyString(parsed.cursorEntryId);
	const state: ReferenceTabTimelineState = { tabId, entryIds: trimmedEntryIds };

	if (cursorEntryId !== undefined && trimmedEntryIds.includes(cursorEntryId)) {
		state.cursorEntryId = cursorEntryId;
	}

	return state;
}

export function serializeReferenceTabTimelineState(state: ReferenceTabTimelineState): string {
	const entryIds = [...new Set(state.entryIds)].slice(-maxReferenceTabTimelineEntries);
	const serializedState: ReferenceTabTimelineState = {
		tabId: state.tabId,
		entryIds
	};

	if (state.cursorEntryId !== undefined && entryIds.includes(state.cursorEntryId)) {
		serializedState.cursorEntryId = state.cursorEntryId;
	}

	return JSON.stringify(serializedState);
}

function createLastViewedEntryRecord(entryId: string): ReferenceHistoryMetaRecord {
	return { key: lastViewedEntryMetaKey, value: entryId };
}

async function openReferenceHistoryDatabase(): Promise<
	IDBPDatabase<ReferenceHistoryDatabase> | undefined
> {
	if (globalThis.indexedDB === undefined) {
		return undefined;
	}

	return await openDB<ReferenceHistoryDatabase>(
		referenceHistoryDatabaseName,
		referenceHistoryDatabaseVersion,
		{
			upgrade(database) {
				if (!database.objectStoreNames.contains(referenceHistoryEntryStoreName)) {
					const entryStore = database.createObjectStore(referenceHistoryEntryStoreName, {
						keyPath: 'id'
					});
					entryStore.createIndex(referenceHistorySeenAtIndexName, 'seenAt');
				}

				if (!database.objectStoreNames.contains(referenceHistoryMetaStoreName)) {
					database.createObjectStore(referenceHistoryMetaStoreName, { keyPath: 'key' });
				}
			}
		}
	);
}

async function withReferenceHistoryDatabase<T>(
	callback: (database: IDBPDatabase<ReferenceHistoryDatabase>) => Promise<T>
): Promise<T | undefined> {
	const database = await openReferenceHistoryDatabase();

	if (database === undefined) {
		return undefined;
	}

	try {
		return await callback(database);
	} finally {
		database.close();
	}
}

async function trimReferenceHistoryEntries(
	database: IDBPDatabase<ReferenceHistoryDatabase>
): Promise<void> {
	const transaction = database.transaction(referenceHistoryEntryStoreName, 'readwrite');
	const seenAtIndex = transaction.store.index(referenceHistorySeenAtIndexName);
	let retainedCount = 0;
	let cursor = await seenAtIndex.openCursor(null, 'prev');

	while (cursor !== null) {
		retainedCount += 1;

		if (retainedCount > maxReferenceHistoryEntries) {
			await cursor.delete();
		}

		cursor = await cursor.continue();
	}

	await transaction.done;
}

export async function appendReferenceHistoryEntry(entry: ReferenceTimelineEntry): Promise<void> {
	await withReferenceHistoryDatabase(async (database) => {
		const transaction = database.transaction(
			[referenceHistoryEntryStoreName, referenceHistoryMetaStoreName],
			'readwrite'
		);

		await Promise.all([
			transaction.objectStore(referenceHistoryEntryStoreName).put(entry),
			transaction
				.objectStore(referenceHistoryMetaStoreName)
				.put(createLastViewedEntryRecord(entry.id))
		]);
		await transaction.done;
		await trimReferenceHistoryEntries(database);
	});
}

export async function setLastViewedReferenceHistoryEntryId(entryId: string): Promise<void> {
	await withReferenceHistoryDatabase(async (database) => {
		await database.put(referenceHistoryMetaStoreName, createLastViewedEntryRecord(entryId));
	});
}

export async function getReferenceHistoryEntriesByIds(
	entryIds: readonly string[]
): Promise<Map<string, ReferenceTimelineEntry>> {
	return (
		(await withReferenceHistoryDatabase(async (database) => {
			const entries = await Promise.all(
				entryIds.map(async (entryId) => ({
					entryId,
					entry: await database.get(referenceHistoryEntryStoreName, entryId)
				}))
			);

			return new Map(
				entries.flatMap(({ entryId, entry }) => (entry === undefined ? [] : [[entryId, entry]]))
			);
		})) ?? new Map()
	);
}

export async function getRecentReferenceHistoryEntries(
	limit = maxReferenceTabTimelineEntries
): Promise<ReferenceTimelineEntry[]> {
	return (
		(await withReferenceHistoryDatabase(async (database) => {
			const transaction = database.transaction(referenceHistoryEntryStoreName, 'readonly');
			const index = transaction.store.index(referenceHistorySeenAtIndexName);
			const entries: ReferenceTimelineEntry[] = [];
			const clampedLimit = Math.max(0, Math.min(limit, maxReferenceTabTimelineEntries));
			let cursor = await index.openCursor(null, 'prev');

			while (cursor !== null && entries.length < clampedLimit) {
				entries.push(cursor.value);
				cursor = await cursor.continue();
			}

			await transaction.done;

			return entries.reverse();
		})) ?? []
	);
}

export async function getLastViewedReferenceHistoryEntry(): Promise<
	ReferenceTimelineEntry | undefined
> {
	return await withReferenceHistoryDatabase(async (database) => {
		const metaRecord = await database.get(referenceHistoryMetaStoreName, lastViewedEntryMetaKey);

		return metaRecord === undefined
			? undefined
			: await database.get(referenceHistoryEntryStoreName, metaRecord.value);
	});
}
