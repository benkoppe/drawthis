import { describe, expect, it } from 'vitest';
import { getNextReferenceIndex } from './selection';

describe('getNextReferenceIndex', () => {
	it('advances to the next reference', () => {
		expect(getNextReferenceIndex(0, 5)).toBe(1);
	});

	it('wraps from the final reference to the first reference', () => {
		expect(getNextReferenceIndex(4, 5)).toBe(0);
	});

	it('does not repeat unless there is only one reference', () => {
		expect(getNextReferenceIndex(0, 1)).toBe(0);
	});

	it('normalizes out-of-range current indexes', () => {
		expect(getNextReferenceIndex(7, 5)).toBe(3);
	});

	it('rejects invalid reference counts', () => {
		expect(() => getNextReferenceIndex(0, 0)).toThrow('referenceCount must be a positive integer');
	});
});
