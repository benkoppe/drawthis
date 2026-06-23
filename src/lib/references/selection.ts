export function getNextReferenceIndex(currentIndex: number, referenceCount: number): number {
	if (!Number.isInteger(referenceCount) || referenceCount < 1) {
		throw new Error('referenceCount must be a positive integer');
	}

	if (!Number.isInteger(currentIndex)) {
		throw new Error('currentIndex must be an integer');
	}

	if (referenceCount === 1) {
		return 0;
	}

	const normalizedIndex = ((currentIndex % referenceCount) + referenceCount) % referenceCount;

	return (normalizedIndex + 1) % referenceCount;
}
