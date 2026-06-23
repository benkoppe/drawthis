import { expect, test } from '@playwright/test';

test('advances through local drawing references', async ({ page }) => {
	await page.goto('/');

	const referenceHeading = page.getByRole('heading', { level: 1 });
	const referenceImage = page.getByRole('img');
	const nextButton = page.getByRole('button', { name: 'Next reference' });

	await expect(page).toHaveTitle('DrawThis');
	await expect(referenceHeading).toBeVisible();
	await expect(referenceImage).toBeVisible();
	await expect(nextButton).toBeEnabled();

	const firstReferenceTitle = await referenceHeading.textContent();

	await nextButton.click();

	await expect(referenceHeading).toBeVisible();
	await expect(referenceHeading).not.toHaveText(firstReferenceTitle ?? '');
	await expect(referenceImage).toBeVisible();
});
