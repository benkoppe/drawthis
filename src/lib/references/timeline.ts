import type { DrawingReference } from './types';

export const referenceTimelineSessionStorageKey = 'drawthis:reference-timeline';
export const maxReferenceTabTimelineEntries = 200;
export const maxReferenceHistoryEntries = 500;

const referenceHistoryDatabaseName = 'drawthis-reference-history';
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

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
	return new Promise((resolve, reject) => {
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
	});
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
	return new Promise((resolve, reject) => {
		transaction.oncomplete = () => resolve();
		transaction.onabort = () =>
			reject(transaction.error ?? new Error('IndexedDB transaction aborted'));
		transaction.onerror = () =>
			reject(transaction.error ?? new Error('IndexedDB transaction failed'));
	});
}

function openReferenceHistoryDatabase(): Promise<IDBDatabase | undefined> {
	const indexedDb = globalThis.indexedDB;

	if (indexedDb === undefined) {
		return Promise.resolve(undefined);
	}

	return new Promise((resolve, reject) => {
		const request = indexedDb.open(referenceHistoryDatabaseName, referenceHistoryDatabaseVersion);

		request.onupgradeneeded = () => {
			const database = request.result;

			if (!database.objectStoreNames.contains(referenceHistoryEntryStoreName)) {
				const entryStore = database.createObjectStore(referenceHistoryEntryStoreName, {
					keyPath: 'id'
				});
				entryStore.createIndex(referenceHistorySeenAtIndexName, 'seenAt');
				entryStore.createIndex('referenceId', 'referenceId');
			}

			if (!database.objectStoreNames.contains(referenceHistoryMetaStoreName)) {
				database.createObjectStore(referenceHistoryMetaStoreName, { keyPath: 'key' });
			}
		};

		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error ?? new Error('Could not open reference history'));
	});
}

function getObjectStore(
	database: IDBDatabase,
	storeName: string,
	mode: IDBTransactionMode
): { transaction: IDBTransaction; store: IDBObjectStore } {
	const transaction = database.transaction(storeName, mode);
	return { transaction, store: transaction.objectStore(storeName) };
}

async function withReferenceHistoryDatabase<T>(
	callback: (database: IDBDatabase) => Promise<T>
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

async function trimReferenceHistoryEntries(database: IDBDatabase): Promise<void> {
	const transaction = database.transaction(referenceHistoryEntryStoreName, 'readwrite');
	const transactionCompleted = transactionDone(transaction);
	const store = transaction.objectStore(referenceHistoryEntryStoreName);
	const seenAtIndex = store.index(referenceHistorySeenAtIndexName);
	let retainedCount = 0;

	await new Promise<void>((resolve, reject) => {
		const request = seenAtIndex.openCursor(null, 'prev');

		request.onsuccess = () => {
			const cursor = request.result;

			if (cursor === null) {
				resolve();
				return;
			}

			retainedCount += 1;

			if (retainedCount > maxReferenceHistoryEntries) {
				cursor.delete();
			}

			cursor.continue();
		};

		request.onerror = () => reject(request.error ?? new Error('Could not read reference history'));
	});

	await transactionCompleted;
}

export async function appendReferenceHistoryEntry(entry: ReferenceTimelineEntry): Promise<void> {
	await withReferenceHistoryDatabase(async (database) => {
		const transaction = database.transaction(
			[referenceHistoryEntryStoreName, referenceHistoryMetaStoreName],
			'readwrite'
		);
		transaction.objectStore(referenceHistoryEntryStoreName).put(entry);
		transaction.objectStore(referenceHistoryMetaStoreName).put({
			key: lastViewedEntryMetaKey,
			value: entry.id
		} satisfies ReferenceHistoryMetaRecord);
		await transactionDone(transaction);
		await trimReferenceHistoryEntries(database);
	});
}

export async function setLastViewedReferenceHistoryEntryId(entryId: string): Promise<void> {
	await withReferenceHistoryDatabase(async (database) => {
		const { transaction, store } = getObjectStore(
			database,
			referenceHistoryMetaStoreName,
			'readwrite'
		);
		store.put({ key: lastViewedEntryMetaKey, value: entryId } satisfies ReferenceHistoryMetaRecord);
		await transactionDone(transaction);
	});
}

export async function getReferenceHistoryEntriesByIds(
	entryIds: readonly string[]
): Promise<Map<string, ReferenceTimelineEntry>> {
	return (
		(await withReferenceHistoryDatabase(async (database) => {
			const { transaction, store } = getObjectStore(
				database,
				referenceHistoryEntryStoreName,
				'readonly'
			);
			const transactionCompleted = transactionDone(transaction);
			const entryRequests = entryIds.map((entryId) => ({
				entryId,
				request: requestToPromise<ReferenceTimelineEntry | undefined>(store.get(entryId))
			}));
			const entriesById = new Map<string, ReferenceTimelineEntry>();

			for (const { entryId, request } of entryRequests) {
				const entry = await request;

				if (entry !== undefined) {
					entriesById.set(entryId, entry);
				}
			}

			await transactionCompleted;

			return entriesById;
		})) ?? new Map()
	);
}

export async function getRecentReferenceHistoryEntries(
	limit = maxReferenceTabTimelineEntries
): Promise<ReferenceTimelineEntry[]> {
	return (
		(await withReferenceHistoryDatabase(async (database) => {
			const { transaction, store } = getObjectStore(
				database,
				referenceHistoryEntryStoreName,
				'readonly'
			);
			const transactionCompleted = transactionDone(transaction);
			const index = store.index(referenceHistorySeenAtIndexName);
			const entries: ReferenceTimelineEntry[] = [];
			const clampedLimit = Math.max(0, Math.min(limit, maxReferenceTabTimelineEntries));

			await new Promise<void>((resolve, reject) => {
				const request = index.openCursor(null, 'prev');

				request.onsuccess = () => {
					const cursor = request.result;

					if (cursor === null || entries.length >= clampedLimit) {
						resolve();
						return;
					}

					entries.push(cursor.value as ReferenceTimelineEntry);
					cursor.continue();
				};

				request.onerror = () =>
					reject(request.error ?? new Error('Could not read reference history'));
			});

			await transactionCompleted;

			return entries.reverse();
		})) ?? []
	);
}

export async function getLastViewedReferenceHistoryEntry(): Promise<
	ReferenceTimelineEntry | undefined
> {
	return await withReferenceHistoryDatabase(async (database) => {
		const metaTransaction = database.transaction(referenceHistoryMetaStoreName, 'readonly');
		const metaTransactionCompleted = transactionDone(metaTransaction);
		const metaRecord = await requestToPromise<ReferenceHistoryMetaRecord | undefined>(
			metaTransaction.objectStore(referenceHistoryMetaStoreName).get(lastViewedEntryMetaKey)
		);
		await metaTransactionCompleted;

		if (metaRecord === undefined) {
			return undefined;
		}

		const entryTransaction = database.transaction(referenceHistoryEntryStoreName, 'readonly');
		const entryTransactionCompleted = transactionDone(entryTransaction);
		const entry = await requestToPromise<ReferenceTimelineEntry | undefined>(
			entryTransaction.objectStore(referenceHistoryEntryStoreName).get(metaRecord.value)
		);
		await entryTransactionCompleted;

		return entry;
	});
}
