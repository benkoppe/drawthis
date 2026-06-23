import type { DrawingReference } from './types';

const localMockCredit = 'DrawThis local mock reference';

export const localReferences = [
	{
		id: 'room-interior',
		title: 'Room Interior',
		category: 'interior',
		imageUrl: '/references/room-interior.svg',
		alt: 'Line drawing of a room corner with a table, chair, window, lamp, and framed picture.',
		credit: localMockCredit,
		sourceUrl: '/references/room-interior.svg'
	},
	{
		id: 'street-corner',
		title: 'Street Corner',
		category: 'street',
		imageUrl: '/references/street-corner.svg',
		alt: 'Line drawing of a city street corner with buildings, sidewalk, crosswalk, and a parked car.',
		credit: localMockCredit,
		sourceUrl: '/references/street-corner.svg'
	},
	{
		id: 'hand-study',
		title: 'Hand Study',
		category: 'figure-study',
		imageUrl: '/references/hand-study.svg',
		alt: 'Line drawing of an open hand with separated fingers and palm construction lines.',
		credit: localMockCredit,
		sourceUrl: '/references/hand-study.svg'
	},
	{
		id: 'still-life',
		title: 'Still Life',
		category: 'still-life',
		imageUrl: '/references/still-life.svg',
		alt: 'Line drawing of a mug, bottle, apple, folded cloth, and spoon on a table.',
		credit: localMockCredit,
		sourceUrl: '/references/still-life.svg'
	},
	{
		id: 'plant-window',
		title: 'Plant By Window',
		category: 'plant',
		imageUrl: '/references/plant-window.svg',
		alt: 'Line drawing of a potted plant on a low table in front of a window with curtains.',
		credit: localMockCredit,
		sourceUrl: '/references/plant-window.svg'
	}
] satisfies readonly DrawingReference[];
