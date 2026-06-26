import {
	isReferenceTopicForSubject,
	referencePracticeFocuses,
	referenceSceneTypes,
	referenceSubjects,
	referenceTopics,
	referenceVisualComplexities
} from '$lib/references';
import { referenceSeedCoverageTags, type ReferenceSearchSeed } from './reference-seed';

export interface ReferenceSeedValidationIssue {
	seedId?: string;
	message: string;
}

export interface ValidateReferenceSearchSeedsOptions {
	minimumTotalSeedCount?: number;
	minimumSeedCountPerTopic?: number;
	forbiddenQueryTerms?: readonly string[];
	requiredSceneTypes?: readonly string[];
	requiredPracticeFocuses?: readonly string[];
	requiredComplexities?: readonly string[];
	requiredCoverageTags?: readonly string[];
}

const defaultMinimumTotalSeedCount = 110;
const defaultMinimumSeedCountPerTopic = 2;
const defaultForbiddenQueryTerms = ['stock', 'aesthetic', 'beautiful', 'studio'] as const;

function normalizeQuery(query: string): string {
	return query.toLowerCase().trim().replaceAll(/\s+/g, ' ');
}

function addIssue(
	issues: ReferenceSeedValidationIssue[],
	message: string,
	seed: ReferenceSearchSeed | undefined
): void {
	issues.push(seed === undefined ? { message } : { seedId: seed.id, message });
}

function validateUniqueSeedIdentity(
	seeds: readonly ReferenceSearchSeed[],
	issues: ReferenceSeedValidationIssue[]
): void {
	const seedIds = new Set<string>();
	const normalizedQueries = new Set<string>();

	for (const seed of seeds) {
		if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(seed.id)) {
			addIssue(issues, 'seed id must be kebab-case lowercase alphanumeric text', seed);
		}

		if (seedIds.has(seed.id)) {
			addIssue(issues, 'seed id must be unique', seed);
		}

		seedIds.add(seed.id);

		const normalizedQuery = normalizeQuery(seed.query);

		if (normalizedQueries.has(normalizedQuery)) {
			addIssue(issues, 'seed query must be unique after normalization', seed);
		}

		normalizedQueries.add(normalizedQuery);
	}
}

function validateQueryQuality(
	seed: ReferenceSearchSeed,
	issues: ReferenceSeedValidationIssue[],
	forbiddenQueryTerms: readonly string[]
): void {
	if (seed.query.trim() !== seed.query) {
		addIssue(issues, 'query must not have leading or trailing whitespace', seed);
	}

	if (seed.query.split(/\s+/).length < 4) {
		addIssue(issues, 'query must contain at least four words', seed);
	}

	if (seed.query.length > 90) {
		addIssue(issues, 'query must be no longer than 90 characters', seed);
	}

	const queryWords = normalizeQuery(seed.query).split(/\s+/);

	for (const term of forbiddenQueryTerms) {
		if (queryWords.includes(term)) {
			addIssue(issues, `query must not contain low-quality term "${term}"`, seed);
		}
	}
}

function validateSeedShape(
	seed: ReferenceSearchSeed,
	issues: ReferenceSeedValidationIssue[],
	forbiddenQueryTerms: readonly string[]
): void {
	if (seed.label.trim() !== seed.label || seed.label.length <= 2) {
		addIssue(issues, 'label must be meaningful and trimmed', seed);
	}

	validateQueryQuality(seed, issues, forbiddenQueryTerms);

	if (!referenceSubjects.includes(seed.primarySubject)) {
		addIssue(issues, 'primary subject must be supported', seed);
	}

	if (seed.topic === undefined) {
		addIssue(issues, 'topic must be defined', seed);
	} else {
		if (!referenceTopics.includes(seed.topic)) {
			addIssue(issues, 'topic must be supported', seed);
		}

		if (!isReferenceTopicForSubject(seed.topic, seed.primarySubject)) {
			addIssue(issues, 'topic must belong to primary subject', seed);
		}
	}

	if (seed.secondarySubjects !== undefined) {
		if (new Set(seed.secondarySubjects).size !== seed.secondarySubjects.length) {
			addIssue(issues, 'secondary subjects must be unique', seed);
		}

		for (const subject of seed.secondarySubjects) {
			if (!referenceSubjects.includes(subject)) {
				addIssue(issues, 'secondary subject must be supported', seed);
			}

			if (subject === seed.primarySubject) {
				addIssue(issues, 'secondary subject must not equal primary subject', seed);
			}
		}
	}

	if (seed.sceneTypes !== undefined) {
		if (seed.sceneTypes.length === 0 || new Set(seed.sceneTypes).size !== seed.sceneTypes.length) {
			addIssue(issues, 'scene types must be non-empty and unique when present', seed);
		}

		for (const sceneType of seed.sceneTypes) {
			if (!referenceSceneTypes.includes(sceneType)) {
				addIssue(issues, 'scene type must be supported', seed);
			}
		}
	}

	if (seed.focuses !== undefined) {
		if (seed.focuses.length === 0 || new Set(seed.focuses).size !== seed.focuses.length) {
			addIssue(issues, 'focuses must be non-empty and unique when present', seed);
		}

		for (const focus of seed.focuses) {
			if (!referencePracticeFocuses.includes(focus)) {
				addIssue(issues, 'practice focus must be supported', seed);
			}
		}
	}

	if (seed.complexity !== undefined && !referenceVisualComplexities.includes(seed.complexity)) {
		addIssue(issues, 'complexity must be supported', seed);
	}

	if (seed.weight !== undefined && seed.weight <= 0) {
		addIssue(issues, 'weight must be positive when present', seed);
	}

	if (seed.coverageTags !== undefined) {
		if (
			seed.coverageTags.length === 0 ||
			new Set(seed.coverageTags).size !== seed.coverageTags.length
		) {
			addIssue(issues, 'coverage tags must be non-empty and unique when present', seed);
		}

		for (const tag of seed.coverageTags) {
			if (!referenceSeedCoverageTags.includes(tag)) {
				addIssue(issues, 'coverage tag must be supported', seed);
			}
		}
	}
}

function validateTopicCoverage(
	seeds: readonly ReferenceSearchSeed[],
	minimumSeedCountPerTopic: number,
	issues: ReferenceSeedValidationIssue[]
): void {
	for (const topic of referenceTopics) {
		const seedsForTopic = seeds.filter((seed) => seed.topic === topic);

		if (seedsForTopic.length < minimumSeedCountPerTopic) {
			addIssue(
				issues,
				`topic "${topic}" must have at least ${minimumSeedCountPerTopic} seeds`,
				undefined
			);
		}
	}
}

function validateSetCoverage<T extends string>(
	actual: ReadonlySet<T>,
	required: readonly T[],
	label: string,
	issues: ReferenceSeedValidationIssue[]
): void {
	for (const value of required) {
		if (!actual.has(value)) {
			addIssue(issues, `${label} "${value}" must be represented`, undefined);
		}
	}
}

export function validateReferenceSearchSeeds(
	seeds: readonly ReferenceSearchSeed[],
	options: ValidateReferenceSearchSeedsOptions = {}
): ReferenceSeedValidationIssue[] {
	const issues: ReferenceSeedValidationIssue[] = [];
	const minimumTotalSeedCount = options.minimumTotalSeedCount ?? defaultMinimumTotalSeedCount;
	const minimumSeedCountPerTopic =
		options.minimumSeedCountPerTopic ?? defaultMinimumSeedCountPerTopic;
	const forbiddenQueryTerms = options.forbiddenQueryTerms ?? defaultForbiddenQueryTerms;
	const requiredSceneTypes = options.requiredSceneTypes ?? referenceSceneTypes;
	const requiredPracticeFocuses = options.requiredPracticeFocuses ?? referencePracticeFocuses;
	const requiredComplexities = options.requiredComplexities ?? referenceVisualComplexities;
	const requiredCoverageTags = options.requiredCoverageTags ?? referenceSeedCoverageTags;

	if (seeds.length < minimumTotalSeedCount) {
		addIssue(issues, `catalog must contain at least ${minimumTotalSeedCount} seeds`, undefined);
	}

	validateUniqueSeedIdentity(seeds, issues);

	for (const seed of seeds) {
		validateSeedShape(seed, issues, forbiddenQueryTerms);
	}

	validateTopicCoverage(seeds, minimumSeedCountPerTopic, issues);
	validateSetCoverage(
		new Set(seeds.flatMap((seed) => seed.sceneTypes ?? [])),
		requiredSceneTypes,
		'scene type',
		issues
	);
	validateSetCoverage(
		new Set(seeds.flatMap((seed) => seed.focuses ?? [])),
		requiredPracticeFocuses,
		'practice focus',
		issues
	);
	validateSetCoverage(
		new Set(seeds.flatMap((seed) => (seed.complexity === undefined ? [] : [seed.complexity]))),
		requiredComplexities,
		'complexity',
		issues
	);
	validateSetCoverage(
		new Set(seeds.flatMap((seed) => seed.coverageTags ?? [])),
		requiredCoverageTags,
		'coverage tag',
		issues
	);

	return issues;
}
