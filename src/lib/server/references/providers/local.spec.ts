import { describe, expect, it } from 'vitest';
import { localReferenceProvider } from './local';

describe('localReferenceProvider', () => {
	it('normalizes local catalog items into drawing references', async () => {
		const result = await localReferenceProvider.search({ count: 1 });
		const [reference] = result.references;

		expect(reference).toMatchObject({
			id: 'local:room-interior',
			provider: {
				id: 'local',
				name: 'DrawThis local references',
				referenceId: 'room-interior'
			},
			title: 'Room Interior',
			category: 'interior',
			image: {
				url: '/references/room-interior.svg',
				alt: expect.stringContaining('room corner')
			},
			attribution: {
				label: 'DrawThis local mock reference',
				sourceName: 'DrawThis',
				sourceUrl: '/references/room-interior.svg'
			}
		});
	});

	it('filters references by category', async () => {
		const result = await localReferenceProvider.search({ count: 5, category: 'street' });

		expect(result.references).toHaveLength(1);
		expect(result.references[0]?.id).toBe('local:street-corner');
	});
});
