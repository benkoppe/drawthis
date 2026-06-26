import { animalSeeds } from './animals';
import { natureSeeds } from './nature';
import { objectSeeds } from './objects';
import { peopleSeeds } from './people';
import { placeSeeds } from './places';
import { vehicleMachineSeeds } from './vehicles-machines';
import type { ReferenceSearchSeed } from '../reference-seed';

export { animalSeeds, natureSeeds, objectSeeds, peopleSeeds, placeSeeds, vehicleMachineSeeds };

export const defaultReferenceSearchSeeds = [
	...peopleSeeds,
	...animalSeeds,
	...objectSeeds,
	...placeSeeds,
	...natureSeeds,
	...vehicleMachineSeeds
] satisfies readonly ReferenceSearchSeed[];
