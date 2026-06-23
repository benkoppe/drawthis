import { describe, expect, it } from 'vitest';
import {
	readOrCreateReferenceFeedSeedCookie,
	referenceFeedSeedCookieName,
	writeReferenceFeedSeedCookie
} from './feed-seed-cookie';

describe('reference feed seed cookie helpers', () => {
	it('reads an existing valid feed seed', () => {
		const cookies = {
			get(name: string) {
				return name === referenceFeedSeedCookieName ? 'seed-alpha_1' : undefined;
			},
			set() {
				throw new Error('set should not be called for an existing valid seed');
			}
		};

		expect(readOrCreateReferenceFeedSeedCookie(cookies)).toBe('seed-alpha_1');
	});

	it('creates and writes a missing feed seed', () => {
		const writes: { name: string; value: string; options: unknown }[] = [];
		const cookies = {
			get() {
				return undefined;
			},
			set(name: string, value: string, options: unknown) {
				writes.push({ name, value, options });
			}
		};

		expect(readOrCreateReferenceFeedSeedCookie(cookies, () => 'generated-seed')).toBe(
			'generated-seed'
		);
		expect(writes).toEqual([
			{
				name: referenceFeedSeedCookieName,
				value: 'generated-seed',
				options: {
					httpOnly: true,
					maxAge: 31_536_000,
					path: '/',
					sameSite: 'lax'
				}
			}
		]);
	});

	it('replaces an invalid feed seed', () => {
		let writtenValue: string | undefined;
		const cookies = {
			get() {
				return 'not a valid seed!';
			},
			set(_name: string, value: string) {
				writtenValue = value;
			}
		};

		expect(readOrCreateReferenceFeedSeedCookie(cookies, () => 'replacement-seed')).toBe(
			'replacement-seed'
		);
		expect(writtenValue).toBe('replacement-seed');
	});

	it('writes a feed seed with server-only cookie settings', () => {
		const writes: { name: string; value: string; options: unknown }[] = [];
		const cookies = {
			set(name: string, value: string, options: unknown) {
				writes.push({ name, value, options });
			}
		};

		writeReferenceFeedSeedCookie(cookies, 'seed-beta');

		expect(writes).toEqual([
			{
				name: referenceFeedSeedCookieName,
				value: 'seed-beta',
				options: {
					httpOnly: true,
					maxAge: 31_536_000,
					path: '/',
					sameSite: 'lax'
				}
			}
		]);
	});
});
