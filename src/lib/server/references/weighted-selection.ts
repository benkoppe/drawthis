export interface WeightedItem<T> {
	item: T;
	weight: number | undefined;
}

interface ScoredItem<T> {
	item: T;
	score: number;
	order: number;
}

const defaultWeight = 1;

export function normalizeWeight(weight: number | undefined): number {
	if (weight === undefined) {
		return defaultWeight;
	}

	return weight > 0 ? weight : 0;
}

export function weightedShuffle<T>(items: readonly WeightedItem<T>[], random: () => number): T[] {
	const remaining = items
		.map(({ item, weight }) => ({ item, weight: normalizeWeight(weight) }))
		.filter(({ weight }) => weight > 0);
	const shuffled: T[] = [];

	while (remaining.length > 0) {
		const totalWeight = remaining.reduce((total, { weight }) => total + weight, 0);
		let target = random() * totalWeight;
		let selectedIndex = remaining.length - 1;

		for (let index = 0; index < remaining.length; index += 1) {
			target -= remaining[index].weight;

			if (target < 0) {
				selectedIndex = index;
				break;
			}
		}

		const [selected] = remaining.splice(selectedIndex, 1);
		shuffled.push(selected.item);
	}

	return shuffled;
}

export function orderByScore<T>(
	items: readonly T[],
	getScore: (item: T) => number,
	getWeight: (item: T) => number | undefined,
	random: () => number
): T[] {
	return weightedShuffle(
		items.map((item) => ({ item, weight: getWeight(item) })),
		random
	)
		.map((item, order): ScoredItem<T> => ({ item, order, score: getScore(item) }))
		.sort((left, right) => left.score - right.score || left.order - right.order)
		.map(({ item }) => item);
}
