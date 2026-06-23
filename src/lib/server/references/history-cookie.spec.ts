import { referenceHistoryCookieName } from '$lib/references';
import { describe, expect, it } from 'vitest';
import { readRecentReferenceIdsCookie, writeRecentReferenceIdsCookie } from './history-cookie';

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
});
