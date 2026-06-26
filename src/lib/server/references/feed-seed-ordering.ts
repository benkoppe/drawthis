import {
	referenceSubjects,
	type ReferenceFeedContextItem,
	type ReferenceSubjectId,
	type ReferenceTopicId
} from '$lib/references';
import {
	getSeedPlanningScore,
	getSubjectPlanningScore,
	getTopicPlanningScore
} from './feed-planning-context';
import type { ReferenceSearchSeed } from './reference-seed';
import { orderByScore } from './weighted-selection';

interface TopicSeedGroup {
	subject: ReferenceSubjectId;
	topic?: ReferenceTopicId;
	seeds: ReferenceSearchSeed[];
}

interface SubjectSeedGroup {
	subject: ReferenceSubjectId;
	topics: TopicSeedGroup[];
}

function getTopicKey(topic: ReferenceTopicId | undefined): string {
	return topic ?? '';
}

function groupSeedsByBalancedTaxonomy(seeds: readonly ReferenceSearchSeed[]): SubjectSeedGroup[] {
	const groups = new Map<ReferenceSubjectId, Map<string, TopicSeedGroup>>();

	for (const seed of seeds) {
		let subjectGroup = groups.get(seed.primarySubject);

		if (subjectGroup === undefined) {
			subjectGroup = new Map<string, TopicSeedGroup>();
			groups.set(seed.primarySubject, subjectGroup);
		}

		const topicKey = getTopicKey(seed.topic);
		let topicGroup = subjectGroup.get(topicKey);

		if (topicGroup === undefined) {
			topicGroup = { subject: seed.primarySubject, topic: seed.topic, seeds: [] };
			subjectGroup.set(topicKey, topicGroup);
		}

		topicGroup.seeds.push(seed);
	}

	return referenceSubjects.flatMap((subject) => {
		const topicGroups = groups.get(subject);

		return topicGroups === undefined
			? []
			: [{ subject, topics: [...topicGroups.values()] } satisfies SubjectSeedGroup];
	});
}

function makeSubjectSeedQueue(
	group: SubjectSeedGroup,
	context: readonly ReferenceFeedContextItem[],
	random: () => number,
	getSeedWeight: (seed: ReferenceSearchSeed) => number | undefined
): ReferenceSearchSeed[] {
	const topicQueues = orderByScore(
		group.topics,
		(topicGroup) => getTopicPlanningScore(topicGroup.topic, context),
		() => 1,
		random
	).map((topicGroup) => ({
		...topicGroup,
		seeds: orderByScore(
			topicGroup.seeds,
			(seed) => getSeedPlanningScore(seed, context),
			getSeedWeight,
			random
		)
	}));
	const queue: ReferenceSearchSeed[] = [];

	while (topicQueues.some((topicQueue) => topicQueue.seeds.length > 0)) {
		for (const topicQueue of topicQueues) {
			const seed = topicQueue.seeds.shift();

			if (seed !== undefined) {
				queue.push(seed);
			}
		}
	}

	return queue;
}

export function orderSeedsByBalancedTaxonomy(
	seeds: readonly ReferenceSearchSeed[],
	context: readonly ReferenceFeedContextItem[],
	random: () => number,
	getSeedWeight: (seed: ReferenceSearchSeed) => number | undefined = (seed) => seed.weight
): ReferenceSearchSeed[] {
	const subjectGroups = orderByScore(
		groupSeedsByBalancedTaxonomy(seeds),
		(group) => getSubjectPlanningScore(group.subject, context),
		() => 1,
		random
	).map((subjectGroup) => ({
		subject: subjectGroup.subject,
		seeds: makeSubjectSeedQueue(subjectGroup, context, random, getSeedWeight)
	}));
	const seedsInBalancedOrder: ReferenceSearchSeed[] = [];

	while (subjectGroups.some((subjectGroup) => subjectGroup.seeds.length > 0)) {
		for (const subjectGroup of subjectGroups) {
			const seed = subjectGroup.seeds.shift();

			if (seed !== undefined) {
				seedsInBalancedOrder.push(seed);
			}
		}
	}

	return seedsInBalancedOrder;
}
