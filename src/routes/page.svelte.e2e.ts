import { expect, test } from '@playwright/test';

test('advances through local drawing references', async ({ page }) => {
	await page.goto('/');

	await expect(page).toHaveTitle('DrawThis');
	await expect(page.getByRole('heading', { level: 1, name: 'Room Interior' })).toBeVisible();
	await expect(page.getByRole('img', { name: /room corner/i })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Next reference' })).toBeEnabled();

	await page.getByRole('button', { name: 'Next reference' }).click();

	await expect(page.getByRole('heading', { level: 1, name: 'Street Corner' })).toBeVisible();
	await expect(page.getByRole('img', { name: /city street corner/i })).toBeVisible();
});
