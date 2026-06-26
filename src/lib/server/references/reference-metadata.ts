import type {
	ReferenceSelectionMetadata,
	ReferenceTaxonomy,
	ReferenceTrainingMetadata
} from '$lib/references';
import type { ProviderSearchRequest } from './provider';

function hasValues<T>(values: readonly T[] | undefined): values is readonly T[] {
	return values !== undefined && values.length > 0;
}

export function hasReferenceTrainingMetadata(
	training: ReferenceTrainingMetadata | undefined
): training is ReferenceTrainingMetadata {
	return (
		training !== undefined &&
		(hasValues(training.focuses) ||
			hasValues(training.sceneTypes) ||
			training.complexity !== undefined)
	);
}

export function hasReferenceSelectionMetadata(
	selection: ReferenceSelectionMetadata | undefined
): selection is ReferenceSelectionMetadata {
	return selection?.seed !== undefined;
}

export function createReferenceTaxonomyFromProviderRequest(
	request: ProviderSearchRequest
): ReferenceTaxonomy {
	if (request.primarySubject === undefined) {
		throw new Error('Provider request requires a planned reference subject');
	}

	const taxonomy: ReferenceTaxonomy = {
		primarySubject: request.primarySubject
	};

	if (request.topic !== undefined) {
		taxonomy.topic = request.topic;
	}

	if (hasValues(request.secondarySubjects)) {
		taxonomy.secondarySubjects = request.secondarySubjects;
	}

	return taxonomy;
}

export function createReferenceTrainingFromProviderRequest(
	request: ProviderSearchRequest
): ReferenceTrainingMetadata | undefined {
	const training: ReferenceTrainingMetadata = {};

	if (hasValues(request.practiceFocuses)) {
		training.focuses = request.practiceFocuses;
	}

	if (hasValues(request.sceneTypes)) {
		training.sceneTypes = request.sceneTypes;
	}

	if (request.complexity !== undefined) {
		training.complexity = request.complexity;
	}

	return hasReferenceTrainingMetadata(training) ? training : undefined;
}

export function createReferenceSelectionFromProviderRequest(
	request: ProviderSearchRequest
): ReferenceSelectionMetadata | undefined {
	const selection: ReferenceSelectionMetadata | undefined =
		request.seed === undefined ? undefined : { seed: request.seed };

	return hasReferenceSelectionMetadata(selection) ? selection : undefined;
}
