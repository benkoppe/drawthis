import { expect, test, type Browser } from '@playwright/test';

const referenceFeedSeedCookieName = 'drawthis_feed_seed';
const appUrl = 'http://127.0.0.1:4173';

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

		const referenceHeading = page.getByRole('heading', { level: 1 });
		await expect(referenceHeading).toBeVisible();

		return (await referenceHeading.textContent()) ?? '';
	} finally {
		await context.close();
	}
}

test('advances through local drawing references and avoids recent references after reload', async ({
	page
}) => {
	await page.goto('/');

	const referenceHeading = page.getByRole('heading', { level: 1 });
	const referenceImage = page.getByRole('img');
	const nextButton = page.getByRole('button', { name: 'Next reference' });

	await expect(page).toHaveTitle('DrawThis');
	await expect(referenceHeading).toBeVisible();
	await expect(referenceImage).toBeVisible();
	await expect(nextButton).toBeEnabled();

	const seenReferenceTitles = new Set<string>();
	const firstReferenceTitle = (await referenceHeading.textContent()) ?? '';
	seenReferenceTitles.add(firstReferenceTitle);

	await nextButton.click();

	await expect(referenceHeading).toBeVisible();
	await expect(referenceHeading).not.toHaveText(firstReferenceTitle);
	await expect(referenceImage).toBeVisible();

	const secondReferenceTitle = (await referenceHeading.textContent()) ?? '';
	seenReferenceTitles.add(secondReferenceTitle);

	await page.reload();

	await expect(referenceHeading).toBeVisible();
	await expect(referenceImage).toBeVisible();
	expect(seenReferenceTitles.has((await referenceHeading.textContent()) ?? '')).toBe(false);
});

test('uses anonymous feed seeds to vary initial references across devices', async ({ browser }) => {
	const firstTitle = await getInitialReferenceTitleForSeed(browser, 'device-a');
	const secondTitle = await getInitialReferenceTitleForSeed(browser, 'device-b');

	expect(firstTitle).not.toBe(secondTitle);
});
