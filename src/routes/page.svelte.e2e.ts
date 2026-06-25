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

		const referenceDescription = page.getByTestId('reference-description');
		await expect(page.getByRole('img')).toBeVisible();
		await expect(referenceDescription).toBeVisible();

		return (await referenceDescription.textContent()) ?? '';
	} finally {
		await context.close();
	}
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

test('uses anonymous feed seeds to vary initial references across devices', async ({ browser }) => {
	const firstTitle = await getInitialReferenceTitleForSeed(browser, 'device-a');
	const secondTitle = await getInitialReferenceTitleForSeed(browser, 'device-b');

	expect(firstTitle).not.toBe(secondTitle);
});
