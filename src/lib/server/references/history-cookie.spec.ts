import {
	parseRecentReferenceContexts,
	referenceContextHistoryCookieName,
	referenceHistoryCookieName
} from '$lib/references';
import { describe, expect, it } from 'vitest';
import {
	readRecentReferenceIdsCookie,
	writeRecentReferenceContextsCookie,
	writeRecentReferenceIdsCookie
} from './history-cookie';

describe('reference history cookie helpers', () => {
	it('reads recent reference IDs from the configured cookie', () => {
		const cookies = {
			get(name: string) {
				return name === referenceHistoryCookieName
					? encodeURIComponent(JSON.stringify(['pexels:1', 'pexels:2']))
					: undefined;
			}
		};

		expect(readRecentReferenceIdsCookie(cookies)).toEqual(['pexels:1', 'pexels:2']);
	});

	it('writes recent reference IDs with server-readable refresh settings', () => {
		const writes: { name: string; value: string; options: unknown }[] = [];
		const cookies = {
			set(name: string, value: string, options: unknown) {
				writes.push({ name, value, options });
			}
		};

		writeRecentReferenceIdsCookie(cookies, ['pexels:1']);

		expect(writes).toEqual([
			{
				name: referenceHistoryCookieName,
				value: encodeURIComponent(JSON.stringify(['pexels:1'])),
				options: {
					httpOnly: true,
					maxAge: 2_592_000,
					path: '/',
					sameSite: 'lax'
				}
			}
		]);
	});

	it('trims recent reference contexts to fit browser cookie limits', () => {
		const writes: { name: string; value: string }[] = [];
		const cookies = {
			set(name: string, value: string) {
				writes.push({ name, value });
			}
		};

		writeRecentReferenceContextsCookie(
			cookies,
			Array.from({ length: 20 }, (_, index) => ({
				id: `pexels:${index}:${'x'.repeat(120)}`,
				providerId: 'pexels',
				taxonomy: { primarySubject: 'places', topic: 'public-interiors' },
				selection: { seedId: `places-public-interiors-${index}` },
				training: {
					sceneTypes: ['interior', 'public-space', 'everyday-life'],
					focuses: ['perspective', 'composition', 'value'],
					complexity: 'dense'
				}
			}))
		);

		const write = writes[0];
		expect(write?.name).toBe(referenceContextHistoryCookieName);
		expect(write?.value.length).toBeLessThanOrEqual(1_500);
		expect(parseRecentReferenceContexts(write?.value)).not.toEqual([]);
	});
});
