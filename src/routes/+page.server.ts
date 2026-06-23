import { getReferenceFeed } from '$lib/server/references/feed';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return getReferenceFeed({ count: 1 });
};
