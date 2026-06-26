import type { ReferenceSearchSeed } from '../reference-seed';

export const animalSeeds = [
	{
		id: 'animals-pets-cat-sleeping',
		label: 'Sleeping cat',
		query: 'sleeping cat curled pose reference photo',
		primarySubject: 'animals',
		topic: 'pets',
		sceneTypes: ['isolated-subject', 'everyday-life'],
		focuses: ['gesture', 'shape', 'texture'],
		complexity: 'moderate',
		coverageTags: ['organic-form', 'mundane']
	},
	{
		id: 'animals-pets-dog-sitting',
		label: 'Sitting dog',
		query: 'dog sitting pose full body reference photo',
		primarySubject: 'animals',
		topic: 'pets',
		sceneTypes: ['isolated-subject'],
		focuses: ['proportion', 'construction', 'gesture'],
		complexity: 'moderate',
		coverageTags: ['organic-form', 'construction-practice']
	},
	{
		id: 'animals-pets-playing',
		label: 'Pet playing motion',
		query: 'cat dog playing motion reference photo',
		primarySubject: 'animals',
		topic: 'pets',
		focuses: ['gesture', 'shape', 'proportion'],
		complexity: 'complex',
		coverageTags: ['animal-motion', 'gesture']
	},
	{
		id: 'animals-wildlife-deer-standing',
		label: 'Standing deer',
		query: 'deer standing full body wildlife reference photo',
		primarySubject: 'animals',
		topic: 'wildlife',
		sceneTypes: ['landscape', 'isolated-subject'],
		focuses: ['proportion', 'gesture', 'construction'],
		complexity: 'moderate',
		coverageTags: ['organic-form', 'landscape']
	},
	{
		id: 'animals-wildlife-fox-crouch',
		label: 'Fox crouching',
		query: 'fox crouching wildlife pose reference photo',
		primarySubject: 'animals',
		topic: 'wildlife',
		focuses: ['gesture', 'shape', 'texture'],
		complexity: 'moderate',
		coverageTags: ['organic-form', 'gesture']
	},
	{
		id: 'animals-wildlife-large-mammal',
		label: 'Large mammal form',
		query: 'large mammal standing side view reference photo',
		primarySubject: 'animals',
		topic: 'wildlife',
		focuses: ['construction', 'proportion', 'value'],
		complexity: 'complex',
		coverageTags: ['organic-form', 'construction-practice']
	},
	{
		id: 'animals-birds-perched',
		label: 'Perched bird',
		query: 'bird perched branch reference photo',
		primarySubject: 'animals',
		topic: 'birds',
		secondarySubjects: ['nature'],
		sceneTypes: ['isolated-subject'],
		focuses: ['shape', 'proportion', 'texture'],
		complexity: 'moderate',
		coverageTags: ['organic-form', 'negative-space']
	},
	{
		id: 'animals-birds-flying',
		label: 'Bird in flight',
		query: 'bird flying wings spread reference photo',
		primarySubject: 'animals',
		topic: 'birds',
		focuses: ['gesture', 'shape', 'negative-space'],
		complexity: 'moderate',
		coverageTags: ['animal-motion', 'negative-space']
	},
	{
		id: 'animals-birds-water-bird',
		label: 'Water bird',
		query: 'duck heron water bird reference photo',
		primarySubject: 'animals',
		topic: 'birds',
		secondarySubjects: ['nature'],
		sceneTypes: ['landscape'],
		focuses: ['shape', 'value', 'composition'],
		complexity: 'complex',
		coverageTags: ['organic-form', 'water']
	},
	{
		id: 'animals-small-frog',
		label: 'Frog or toad',
		query: 'frog close up body reference photo',
		primarySubject: 'animals',
		topic: 'insects-small-animals',
		sceneTypes: ['close-up'],
		focuses: ['shape', 'texture', 'construction'],
		complexity: 'moderate',
		coverageTags: ['organic-form', 'texture-study']
	},
	{
		id: 'animals-small-lizard',
		label: 'Lizard body',
		query: 'lizard body close up reference photo',
		primarySubject: 'animals',
		topic: 'insects-small-animals',
		sceneTypes: ['close-up'],
		focuses: ['construction', 'texture', 'proportion'],
		complexity: 'complex',
		coverageTags: ['organic-form', 'texture-study']
	},
	{
		id: 'animals-small-insect',
		label: 'Insect close-up',
		query: 'insect close up legs wings reference photo',
		primarySubject: 'animals',
		topic: 'insects-small-animals',
		sceneTypes: ['close-up'],
		focuses: ['construction', 'texture', 'negative-space'],
		complexity: 'dense',
		coverageTags: ['animal-detail', 'negative-space']
	},
	{
		id: 'animals-head-dog-cat',
		label: 'Pet head close-up',
		query: 'dog cat head close up reference photo',
		primarySubject: 'animals',
		topic: 'animal-heads',
		sceneTypes: ['close-up'],
		focuses: ['construction', 'value', 'texture'],
		complexity: 'moderate',
		coverageTags: ['animal-detail', 'texture-study']
	},
	{
		id: 'animals-head-horse-cow',
		label: 'Large animal head',
		query: 'horse cow head profile reference photo',
		primarySubject: 'animals',
		topic: 'animal-heads',
		sceneTypes: ['close-up'],
		focuses: ['proportion', 'construction', 'shape'],
		complexity: 'moderate',
		coverageTags: ['animal-detail', 'construction-practice']
	},
	{
		id: 'animals-details-paws-claws',
		label: 'Paws and claws',
		query: 'animal paws claws close up reference photo',
		primarySubject: 'animals',
		topic: 'paws-details',
		sceneTypes: ['close-up'],
		focuses: ['anatomy', 'shape', 'texture'],
		complexity: 'moderate',
		coverageTags: ['animal-detail', 'body-parts']
	},
	{
		id: 'animals-details-hooves-fur',
		label: 'Hooves and fur detail',
		query: 'animal hooves fur texture detail reference photo',
		primarySubject: 'animals',
		topic: 'paws-details',
		sceneTypes: ['close-up'],
		focuses: ['texture', 'material', 'value'],
		complexity: 'complex',
		coverageTags: ['animal-detail', 'texture-study', 'material-study']
	},
	{
		id: 'animals-motion-running-dog',
		label: 'Running dog',
		query: 'dog running motion full body reference photo',
		primarySubject: 'animals',
		topic: 'motion-poses',
		focuses: ['gesture', 'proportion', 'anatomy'],
		complexity: 'moderate',
		coverageTags: ['animal-motion', 'gesture']
	},
	{
		id: 'animals-motion-jumping-cat',
		label: 'Jumping cat',
		query: 'cat jumping motion pose reference photo',
		primarySubject: 'animals',
		topic: 'motion-poses',
		focuses: ['gesture', 'shape', 'negative-space'],
		complexity: 'complex',
		coverageTags: ['animal-motion', 'negative-space']
	},
	{
		id: 'animals-motion-bird-takeoff',
		label: 'Bird takeoff motion',
		query: 'bird taking off motion wings reference photo',
		primarySubject: 'animals',
		topic: 'motion-poses',
		focuses: ['gesture', 'composition', 'shape'],
		complexity: 'complex',
		coverageTags: ['animal-motion', 'gesture']
	}
] satisfies readonly ReferenceSearchSeed[];
