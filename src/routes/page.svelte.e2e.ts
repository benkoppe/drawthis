import { expect, test, type Browser, type Page } from '@playwright/test';

const referenceFeedSeedCookieName = 'drawthis_feed_seed';
const appUrl = 'http://127.0.0.1:4173';
const referenceTimelineSessionStorageKey = 'drawthis:reference-timeline';
const referenceHistoryDatabaseName = 'drawthis-reference-history';
const referenceHistoryDatabaseVersion = 1;
const referenceHistoryEntryStoreName = 'referenceHistoryEntries';

const categoryLabels = {
	interior: 'Interior',
	street: 'Street',
	'figure-study': 'Figure Study',
	'still-life': 'Still Life',
	plant: 'Plant'
} as const;

const categoryImageUrls = {
	interior: '/references/room-interior.svg',
	street: '/references/street-corner.svg',
	'figure-study': '/references/hand-study.svg',
	'still-life': '/references/still-life.svg',
	plant: '/references/plant-window.svg'
} as const;

type TestReferenceCategory = keyof typeof categoryLabels;

function makeE2eReference(category: TestReferenceCategory, title: string, id = title) {
	const imageUrl = categoryImageUrls[category];

	return {
		id: `e2e:${id}`,
		provider: {
			id: 'e2e',
			name: 'E2E references',
			referenceId: id
		},
		title,
		category,
		image: {
			url: imageUrl,
			alt: title
		},
		attribution: {
			label: 'E2E references',
			sourceName: 'E2E references',
			sourceUrl: imageUrl
		}
	};
}

async function getInitialReferenceTitleForSeed(browser: Browser, seed: string): Promise<string> {
	const context = await browser.newContext();

	try {
		await context.addCookies([
			{
				name: referenceFeedSeedCookieName,
				value: seed,
				url: appUrl,
				httpOnly: true,
				sameSite: 'Lax'
			}
		]);

		const page = await context.newPage();
		await page.goto('/');

		const referenceDescription = page.getByTestId('reference-description');
		await expect(page.getByRole('img')).toBeVisible();
		await expect(referenceDescription).toBeVisible();

		return (await referenceDescription.textContent()) ?? '';
	} finally {
		await context.close();
	}
}

function getCategoryFilterMenu(page: Page) {
	return page.locator('[aria-label="Limit reference categories"]');
}

function getCategoryFilterButton(page: Page) {
	return page.locator('header button[aria-haspopup="true"]');
}

function getCategoryFilterInput(page: Page, label: string) {
	return getCategoryFilterMenu(page).locator('label').filter({ hasText: label }).locator('input');
}

async function openCategoryFilter(page: Page): Promise<void> {
	const button = getCategoryFilterButton(page);
	const menu = getCategoryFilterMenu(page);

	await expect(button).toBeVisible();
	await expect(async () => {
		await button.click();
		await expect(menu).toBeVisible({ timeout: 500 });
	}).toPass();
}

async function chooseOnlyCategory(page: Page, category: TestReferenceCategory): Promise<void> {
	await openCategoryFilter(page);
	await getCategoryFilterInput(page, 'All categories').uncheck();
	await expect(page.getByRole('button', { name: /no categories/i })).toBeVisible();
	await getCategoryFilterInput(page, categoryLabels[category]).check();

	await expect(page.getByRole('button', { name: /1 of 5 categories/i })).toBeVisible();
	await expect(getCategoryFilterInput(page, categoryLabels[category])).toBeChecked();
	await page.keyboard.press('Escape');
	await expect(getCategoryFilterMenu(page)).toBeHidden();
}

async function mockReferenceFeedPosts(page: Page): Promise<unknown[]> {
	let responseIndex = 0;
	const requestBodies: unknown[] = [];

	await page.route('**/api/references', async (route) => {
		if (route.request().method() !== 'POST') {
			await route.continue();
			return;
		}

		const body = route.request().postDataJSON() as {
			preferences?: { enabledCategories?: TestReferenceCategory[] };
		};
		const [category = 'interior'] = body.preferences?.enabledCategories ?? ['interior'];
		requestBodies.push(body);
		responseIndex += 1;

		await route.fulfill({
			contentType: 'application/json',
			body: JSON.stringify({
				references: [
					makeE2eReference(
						category,
						`Mock ${categoryLabels[category]} ${responseIndex}`,
						`${category}-${responseIndex}`
					)
				]
			})
		});
	});

	return requestBodies;
}

async function seedReferenceTimeline(page: Page): Promise<void> {
	const tabId = 'tab-e2e-branch';
	const entries = [
		{
			id: 'entry-a',
			referenceId: 'e2e:a',
			seenAt: '2026-01-01T00:00:00.000Z',
			tabId,
			reference: makeE2eReference('interior', 'Seed A', 'a')
		},
		{
			id: 'entry-b',
			referenceId: 'e2e:b',
			seenAt: '2026-01-01T00:00:01.000Z',
			tabId,
			reference: makeE2eReference('street', 'Seed B', 'b')
		},
		{
			id: 'entry-c',
			referenceId: 'e2e:c',
			seenAt: '2026-01-01T00:00:02.000Z',
			tabId,
			reference: makeE2eReference('interior', 'Seed C', 'c')
		},
		{
			id: 'entry-d',
			referenceId: 'e2e:d',
			seenAt: '2026-01-01T00:00:03.000Z',
			tabId,
			reference: makeE2eReference('still-life', 'Seed D', 'd')
		}
	];

	await page.evaluate(
		async ({ databaseName, databaseVersion, entriesToStore, sessionStorageKey, tabIdToStore }) => {
			const database = await new Promise<IDBDatabase>((resolve, reject) => {
				const request = indexedDB.open(databaseName, databaseVersion);

				request.onupgradeneeded = () => {
					const database = request.result;

					if (!database.objectStoreNames.contains('referenceHistoryEntries')) {
						const entryStore = database.createObjectStore('referenceHistoryEntries', {
							keyPath: 'id'
						});
						entryStore.createIndex('seenAt', 'seenAt');
					}

					if (!database.objectStoreNames.contains('referenceHistoryMeta')) {
						database.createObjectStore('referenceHistoryMeta', { keyPath: 'key' });
					}
				};

				request.onerror = () => reject(request.error);
				request.onsuccess = () => resolve(request.result);
			});

			await new Promise<void>((resolve, reject) => {
				const transaction = database.transaction(
					['referenceHistoryEntries', 'referenceHistoryMeta'],
					'readwrite'
				);
				const entryStore = transaction.objectStore('referenceHistoryEntries');
				const metaStore = transaction.objectStore('referenceHistoryMeta');

				for (const entry of entriesToStore) {
					entryStore.put(entry);
				}

				metaStore.put({ key: 'lastViewedEntryId', value: 'entry-d' });
				transaction.oncomplete = () => resolve();
				transaction.onerror = () => reject(transaction.error);
			});
			database.close();

			sessionStorage.setItem(
				sessionStorageKey,
				JSON.stringify({
					tabId: tabIdToStore,
					entryIds: ['entry-a', 'entry-b', 'entry-c', 'entry-d'],
					cursorEntryId: 'entry-d'
				})
			);
		},
		{
			databaseName: referenceHistoryDatabaseName,
			databaseVersion: referenceHistoryDatabaseVersion,
			entriesToStore: entries,
			sessionStorageKey: referenceTimelineSessionStorageKey,
			tabIdToStore: tabId
		}
	);
}

async function readStoredHistoryEntryIds(page: Page): Promise<string[]> {
	return await page.evaluate(
		async ({ databaseName, databaseVersion, storeName }) => {
			const database = await new Promise<IDBDatabase>((resolve, reject) => {
				const request = indexedDB.open(databaseName, databaseVersion);
				request.onerror = () => reject(request.error);
				request.onsuccess = () => resolve(request.result);
			});
			const ids = await new Promise<string[]>((resolve, reject) => {
				const transaction = database.transaction(storeName, 'readonly');
				const request = transaction.objectStore(storeName).getAllKeys();
				request.onerror = () => reject(request.error);
				request.onsuccess = () => resolve(request.result.map(String));
			});
			database.close();

			return ids;
		},
		{
			databaseName: referenceHistoryDatabaseName,
			databaseVersion: referenceHistoryDatabaseVersion,
			storeName: referenceHistoryEntryStoreName
		}
	);
}

test('advances through drawing references and restores per-tab reference navigation', async ({
	page
}) => {
	await page.goto('/');

	const referenceDescription = page.getByTestId('reference-description');
	const referenceImage = page.getByRole('img');
	const backButton = page.getByRole('button', { name: 'Back' });
	const nextButton = page.getByRole('button', { name: 'Next' });

	await expect(page).toHaveTitle('DrawThis');
	await expect(referenceDescription).toBeVisible();
	await expect(referenceImage).toBeVisible();
	await expect(backButton).toBeDisabled();
	await expect(nextButton).toBeEnabled();

	const firstReferenceTitle = (await referenceDescription.textContent()) ?? '';

	await nextButton.click();

	await expect(referenceDescription).toBeVisible();
	await expect(referenceDescription).not.toHaveText(firstReferenceTitle);
	await expect(referenceImage).toBeVisible();
	await expect(backButton).toBeEnabled();

	const secondReferenceTitle = (await referenceDescription.textContent()) ?? '';

	await backButton.click();

	await expect(referenceDescription).toHaveText(firstReferenceTitle);
	await expect(backButton).toBeDisabled();

	await nextButton.click();

	await expect(referenceDescription).toHaveText(secondReferenceTitle);

	await page.reload();

	await expect(referenceDescription).toHaveText(secondReferenceTitle);
	await expect(referenceImage).toBeVisible();
	await expect(backButton).toBeEnabled();
});

test('applies the selected category to the next reference even when references are already queued', async ({
	page
}) => {
	const requestBodies = await mockReferenceFeedPosts(page);
	await page.goto('/');

	const heading = page.getByRole('heading', { level: 1 });
	await expect(heading).toBeVisible();

	const visibleCategory = await heading.textContent();
	const selectedCategory = (Object.entries(categoryLabels).find(
		([, label]) => label !== visibleCategory
	)?.[0] ?? 'plant') as TestReferenceCategory;

	await chooseOnlyCategory(page, selectedCategory);
	await expect
		.poll(() =>
			requestBodies.some((body) => {
				const categories = (body as { preferences?: { enabledCategories?: string[] } }).preferences
					?.enabledCategories;

				return categories?.length === 1 && categories[0] === selectedCategory;
			})
		)
		.toBe(true);

	await page.getByRole('button', { name: 'Next' }).click();

	await expect(heading).toHaveText(categoryLabels[selectedCategory]);
});

test('branches the active tab timeline after Back and category changes without deleting durable history', async ({
	page
}) => {
	await mockReferenceFeedPosts(page);
	await page.goto('/');
	await seedReferenceTimeline(page);
	await page.reload();

	const heading = page.getByRole('heading', { level: 1 });
	const referenceDescription = page.getByTestId('reference-description');

	await expect(referenceDescription).toHaveText('Seed D');
	await page.getByRole('button', { name: 'Back' }).click();
	await expect(referenceDescription).toHaveText('Seed C');
	await page.getByRole('button', { name: 'Back' }).click();
	await expect(referenceDescription).toHaveText('Seed B');
	await expect(heading).toHaveText('Street');
	await expect.poll(async () => (await readStoredHistoryEntryIds(page)).length).toBe(4);

	await chooseOnlyCategory(page, 'plant');
	await page.getByRole('button', { name: 'Next' }).click();

	await expect(heading).toHaveText('Plant');
	await expect(referenceDescription).not.toHaveText('Seed C');
	await expect(referenceDescription).not.toHaveText('Seed D');

	await expect.poll(async () => (await readStoredHistoryEntryIds(page)).length).toBe(5);
	await expect
		.poll(async () => await readStoredHistoryEntryIds(page))
		.toEqual(expect.arrayContaining(['entry-a', 'entry-b', 'entry-c', 'entry-d']));

	const sessionTimeline = await page.evaluate((sessionStorageKey) => {
		const value = sessionStorage.getItem(sessionStorageKey);
		return value === null ? undefined : (JSON.parse(value) as { entryIds: string[] });
	}, referenceTimelineSessionStorageKey);

	expect(sessionTimeline?.entryIds).toEqual(expect.not.arrayContaining(['entry-c', 'entry-d']));
});

test('allows no selected categories as an invalid state until a category is selected', async ({
	page
}) => {
	await page.goto('/');
	await openCategoryFilter(page);
	await getCategoryFilterInput(page, 'All categories').uncheck();

	await expect(page.getByRole('button', { name: /no categories/i })).toBeVisible();
	await expect(
		getCategoryFilterMenu(page).getByText('Select at least one category to continue.')
	).toHaveCount(0);
	await expect(page.getByText('Select at least one category to continue.')).toHaveCount(0);
	await expect(page.getByRole('button', { name: 'Next' })).toBeDisabled();
	await expect(getCategoryFilterInput(page, 'Plant')).toBeEnabled();
	await expect(getCategoryFilterInput(page, 'Plant')).not.toBeChecked();

	await getCategoryFilterInput(page, 'Plant').check();
	await expect(page.getByRole('button', { name: /1 of 5 categories/i })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Next' })).toBeEnabled();
});

test('uses anonymous feed seeds to vary initial references across devices', async ({ browser }) => {
	const firstTitle = await getInitialReferenceTitleForSeed(browser, 'device-a');
	const secondTitle = await getInitialReferenceTitleForSeed(browser, 'device-b');

	expect(firstTitle).not.toBe(secondTitle);
});
