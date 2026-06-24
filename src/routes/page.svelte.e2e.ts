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

test('advances through drawing references and restores per-tab reference navigation', async ({
	page
}) => {
	await page.goto('/');

	const referenceHeading = page.getByRole('heading', { level: 1 });
	const referenceImage = page.getByRole('img');
	const backButton = page.getByRole('button', { name: 'Back' });
	const nextButton = page.getByRole('button', { name: 'Next' });

	await expect(page).toHaveTitle('DrawThis');
	await expect(referenceHeading).toBeVisible();
	await expect(referenceImage).toBeVisible();
	await expect(backButton).toBeDisabled();
	await expect(nextButton).toBeEnabled();

	const firstReferenceTitle = (await referenceHeading.textContent()) ?? '';

	await nextButton.click();

	await expect(referenceHeading).toBeVisible();
	await expect(referenceHeading).not.toHaveText(firstReferenceTitle);
	await expect(referenceImage).toBeVisible();
	await expect(backButton).toBeEnabled();

	const secondReferenceTitle = (await referenceHeading.textContent()) ?? '';

	await backButton.click();

	await expect(referenceHeading).toHaveText(firstReferenceTitle);
	await expect(backButton).toBeDisabled();

	await nextButton.click();

	await expect(referenceHeading).toHaveText(secondReferenceTitle);

	await page.reload();

	await expect(referenceHeading).toHaveText(secondReferenceTitle);
	await expect(referenceImage).toBeVisible();
	await expect(backButton).toBeEnabled();
});

test('uses anonymous feed seeds to vary initial references across devices', async ({ browser }) => {
	const firstTitle = await getInitialReferenceTitleForSeed(browser, 'device-a');
	const secondTitle = await getInitialReferenceTitleForSeed(browser, 'device-b');

	expect(firstTitle).not.toBe(secondTitle);
});
