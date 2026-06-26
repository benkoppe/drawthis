import { expect, test, type Browser, type Page } from '@playwright/test';

const referenceFeedSeedCookieName = 'drawthis_feed_seed';
const appUrl = 'http://127.0.0.1:4173';
const referenceTimelineSessionStorageKey = 'drawthis:reference-timeline:v2';
const referenceHistoryDatabaseName = 'drawthis-reference-history-v3';
const referenceHistoryDatabaseVersion = 1;
const referenceHistoryEntryStoreName = 'referenceHistoryEntries';

const subjectLabels = {
	people: 'People',
	animals: 'Animals',
	objects: 'Objects',
	places: 'Places',
	nature: 'Nature',
	'vehicles-machines': 'Vehicles & Machines'
} as const;

const subjectImageUrls = {
	people: '/references/hand-study.svg',
	animals: '/references/plant-window.svg',
	objects: '/references/still-life.svg',
	places: '/references/room-interior.svg',
	nature: '/references/plant-window.svg',
	'vehicles-machines': '/references/street-corner.svg'
} as const;

type TestReferenceSubject = keyof typeof subjectLabels;

function makeE2eReference(
	subject: TestReferenceSubject,
	title: string,
	id = title,
	topic?: string
) {
	const imageUrl = subjectImageUrls[subject];

	return {
		id: `e2e:${id}`,
		provider: {
			id: 'e2e',
			name: 'E2E references',
			referenceId: id
		},
		title,
		taxonomy: {
			primarySubject: subject,
			...(topic === undefined ? {} : { topic })
		},
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

async function resetCategoryFilter(page: Page): Promise<void> {
	await openCategoryFilter(page);
	const allCategoriesInput = getCategoryFilterInput(page, 'All categories');

	await allCategoriesInput.check();
	await allCategoriesInput.uncheck();
}

async function closeCategoryFilter(page: Page): Promise<void> {
	await page.keyboard.press('Escape');
	await expect(getCategoryFilterMenu(page)).toBeHidden();
}

async function expandSubjectTopics(page: Page, subjectLabel: string): Promise<void> {
	await getCategoryFilterMenu(page)
		.getByRole('button', { name: new RegExp(`expand ${subjectLabel} subcategories`, 'i') })
		.click();
}

async function chooseOnlySubject(page: Page, subject: TestReferenceSubject): Promise<void> {
	await resetCategoryFilter(page);
	await getCategoryFilterInput(page, subjectLabels[subject]).check();

	await expect(getCategoryFilterButton(page)).toHaveText(subjectLabels[subject]);
	await expect(getCategoryFilterInput(page, subjectLabels[subject])).toBeChecked();
	await closeCategoryFilter(page);
}

async function chooseOnlyTopic(
	page: Page,
	subjectLabel: string,
	topicLabel: string
): Promise<void> {
	await resetCategoryFilter(page);
	await expandSubjectTopics(page, subjectLabel);
	await getCategoryFilterInput(page, topicLabel).check();
	await closeCategoryFilter(page);
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
			count?: number;
			preferences?: { enabledSubjects?: TestReferenceSubject[]; enabledTopics?: string[] };
		};
		const [subject = 'places'] = body.preferences?.enabledSubjects ?? ['places'];
		const [topic] = body.preferences?.enabledTopics ?? [];
		const count = body.count ?? 1;
		requestBodies.push(body);
		responseIndex += 1;

		await route.fulfill({
			contentType: 'application/json',
			body: JSON.stringify({
				references: Array.from({ length: count }, (_, index) =>
					makeE2eReference(
						subject,
						`Mock ${subjectLabels[subject]} ${topic ?? 'all'} ${responseIndex}-${index + 1}`,
						`${subject}-${topic ?? 'all'}-${responseIndex}-${index + 1}`,
						topic
					)
				)
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
			reference: makeE2eReference('places', 'Seed A', 'a')
		},
		{
			id: 'entry-b',
			referenceId: 'e2e:b',
			seenAt: '2026-01-01T00:00:01.000Z',
			tabId,
			reference: makeE2eReference('people', 'Seed B', 'b')
		},
		{
			id: 'entry-c',
			referenceId: 'e2e:c',
			seenAt: '2026-01-01T00:00:02.000Z',
			tabId,
			reference: makeE2eReference('places', 'Seed C', 'c')
		},
		{
			id: 'entry-d',
			referenceId: 'e2e:d',
			seenAt: '2026-01-01T00:00:03.000Z',
			tabId,
			reference: makeE2eReference('objects', 'Seed D', 'd')
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

test('supports keyboard shortcuts for previous and next reference navigation', async ({ page }) => {
	await page.goto('/');

	const referenceDescription = page.getByTestId('reference-description');
	await expect(referenceDescription).toBeVisible();

	const firstReferenceTitle = (await referenceDescription.textContent()) ?? '';

	await page.keyboard.press('Space');
	await expect(referenceDescription).not.toHaveText(firstReferenceTitle);
	const secondReferenceTitle = (await referenceDescription.textContent()) ?? '';

	await page.keyboard.press('h');
	await expect(referenceDescription).toHaveText(firstReferenceTitle);

	await page.keyboard.press('l');
	await expect(referenceDescription).toHaveText(secondReferenceTitle);
});

test('applies the selected subject to the next reference even when references are already queued', async ({
	page
}) => {
	const requestBodies = await mockReferenceFeedPosts(page);
	await page.goto('/');

	const heading = page.getByRole('heading', { level: 1 });
	await expect(heading).toBeVisible();

	const visibleSubject = (await heading.textContent())?.split(' · ')[0];
	const selectedSubject = (Object.entries(subjectLabels).find(
		([, label]) => label !== visibleSubject
	)?.[0] ?? 'nature') as TestReferenceSubject;

	await chooseOnlySubject(page, selectedSubject);
	await expect
		.poll(() =>
			requestBodies.some((body) => {
				const subjects = (body as { preferences?: { enabledSubjects?: string[] } }).preferences
					?.enabledSubjects;

				return subjects?.length === 1 && subjects[0] === selectedSubject;
			})
		)
		.toBe(true);

	await page.getByRole('button', { name: 'Next' }).click();

	await expect(heading).toContainText(subjectLabels[selectedSubject]);
});

test('discards queued subcategory references after changing category selection', async ({
	page
}) => {
	const requestBodies = await mockReferenceFeedPosts(page);
	await page.goto('/');

	const heading = page.getByRole('heading', { level: 1 });
	const nextButton = page.getByRole('button', { name: 'Next' });
	await expect(heading).toBeVisible();

	await chooseOnlyTopic(page, 'Objects', 'Tools');
	await expect
		.poll(() =>
			requestBodies.some((body) => {
				const preferences = (
					body as {
						preferences?: { enabledSubjects?: string[]; enabledTopics?: string[] };
					}
				).preferences;

				return (
					preferences?.enabledSubjects?.length === 1 &&
					preferences.enabledSubjects[0] === 'objects' &&
					preferences.enabledTopics?.length === 1 &&
					preferences.enabledTopics[0] === 'tools'
				);
			})
		)
		.toBe(true);

	for (let index = 0; index < 3; index += 1) {
		await expect(nextButton).toBeEnabled();
		await nextButton.click();
		await expect(heading).toContainText('Objects · Tools');
	}

	await chooseOnlyTopic(page, 'Nature', 'Plants / Flowers');
	await expect
		.poll(() =>
			requestBodies.some((body) => {
				const preferences = (
					body as {
						preferences?: { enabledSubjects?: string[]; enabledTopics?: string[] };
					}
				).preferences;

				return (
					preferences?.enabledSubjects?.length === 1 &&
					preferences.enabledSubjects[0] === 'nature' &&
					preferences.enabledTopics?.length === 1 &&
					preferences.enabledTopics[0] === 'plants-flowers'
				);
			})
		)
		.toBe(true);

	for (let index = 0; index < 4; index += 1) {
		await expect(nextButton).toBeEnabled();
		await nextButton.click();
		await expect(heading).toContainText('Nature · Plants / Flowers');
		await expect(heading).not.toContainText('Objects · Tools');
	}
});

test('branches the active tab timeline after Back and subject changes without deleting durable history', async ({
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
	await expect(heading).toHaveText('People');
	await expect.poll(async () => (await readStoredHistoryEntryIds(page)).length).toBe(4);

	await chooseOnlySubject(page, 'nature');
	await page.getByRole('button', { name: 'Next' }).click();

	await expect(heading).toContainText('Nature');
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
	await expect(page.getByRole('button', { name: 'Next' })).toBeDisabled();
	await expect(getCategoryFilterInput(page, 'Nature')).toBeEnabled();
	await expect(getCategoryFilterInput(page, 'Nature')).not.toBeChecked();

	await getCategoryFilterInput(page, 'Nature').check();
	await expect(getCategoryFilterButton(page)).toHaveText('Nature');
	await expect(page.getByRole('button', { name: 'Next' })).toBeEnabled();
});

test('keeps the category filter selection after reload', async ({ page }) => {
	await page.goto('/');
	await chooseOnlySubject(page, 'nature');

	await page.reload();

	await expect(getCategoryFilterButton(page)).toHaveText(/Nature/i);
	await openCategoryFilter(page);
	await expect(getCategoryFilterInput(page, 'Nature')).toBeChecked();
	await expect(getCategoryFilterInput(page, 'Places')).not.toBeChecked();
});

test('keeps the empty invalid category selection state after reload', async ({ page }) => {
	await page.goto('/');
	await openCategoryFilter(page);
	await getCategoryFilterInput(page, 'All categories').uncheck();

	await page.reload();

	await expect(getCategoryFilterButton(page)).toHaveText(/no categories/i);
	await expect(page.getByRole('button', { name: 'Next' })).toBeDisabled();
});

test('uses anonymous feed seeds to vary initial references across devices', async ({ browser }) => {
	test.skip(
		process.env.DRAWTHIS_LOCAL_REFERENCES_ENABLED === 'true' &&
			process.env.DRAWTHIS_PEXELS_ENABLED !== 'true' &&
			process.env.DRAWTHIS_OPENVERSE_ENABLED !== 'true',
		'local-only references are deterministic enough that different feed seeds may choose the same initial reference'
	);

	const firstTitle = await getInitialReferenceTitleForSeed(browser, 'device-a');
	const secondTitle = await getInitialReferenceTitleForSeed(browser, 'device-b');

	expect(firstTitle).not.toBe(secondTitle);
});
