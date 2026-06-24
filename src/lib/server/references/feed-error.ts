export interface ReferenceProviderFailureAttempt {
	providerId: string;
	providerName: string;
	cause: unknown;
}

export interface ReferenceProviderFailureSummary {
	providerId: string;
	providerName: string;
	attempts: number;
	causes: readonly unknown[];
}

function pluralizeAttempt(count: number): string {
	return count === 1 ? '1 failed search' : `${count} failed searches`;
}

function getProviderLabel(failure: ReferenceProviderFailureSummary): string {
	return failure.providerName === failure.providerId
		? failure.providerId
		: `${failure.providerName} (${failure.providerId})`;
}

function makeReferenceFeedUnavailableMessage(
	providerFailures: readonly ReferenceProviderFailureSummary[]
): string {
	const providerSummary = providerFailures
		.map((failure) => `${getProviderLabel(failure)}: ${pluralizeAttempt(failure.attempts)}`)
		.join('; ');

	return `No reference providers returned references. Provider failures: ${providerSummary}.`;
}

function summarizeReferenceProviderFailures(
	attempts: readonly ReferenceProviderFailureAttempt[]
): ReferenceProviderFailureSummary[] {
	const summariesByProviderId = new Map<string, ReferenceProviderFailureSummary>();

	for (const attempt of attempts) {
		const existingSummary = summariesByProviderId.get(attempt.providerId);

		if (existingSummary === undefined) {
			summariesByProviderId.set(attempt.providerId, {
				providerId: attempt.providerId,
				providerName: attempt.providerName,
				attempts: 1,
				causes: [attempt.cause]
			});
			continue;
		}

		summariesByProviderId.set(attempt.providerId, {
			...existingSummary,
			attempts: existingSummary.attempts + 1,
			causes: [...existingSummary.causes, attempt.cause]
		});
	}

	return [...summariesByProviderId.values()];
}

export class ReferenceFeedUnavailableError extends Error {
	readonly providerFailures: readonly ReferenceProviderFailureSummary[];

	constructor(providerFailures: readonly ReferenceProviderFailureSummary[]) {
		super(makeReferenceFeedUnavailableMessage(providerFailures), {
			cause: new AggregateError(
				providerFailures.flatMap((failure) => failure.causes),
				'Reference provider search failures'
			)
		});
		this.name = 'ReferenceFeedUnavailableError';
		this.providerFailures = providerFailures;
	}
}

export function createReferenceFeedUnavailableError(
	attempts: readonly ReferenceProviderFailureAttempt[]
): ReferenceFeedUnavailableError {
	return new ReferenceFeedUnavailableError(summarizeReferenceProviderFailures(attempts));
}

export function isReferenceFeedUnavailableError(
	cause: unknown
): cause is ReferenceFeedUnavailableError {
	return cause instanceof ReferenceFeedUnavailableError;
}
