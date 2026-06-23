export class ReferenceProviderHttpError extends Error {
	readonly status: number;
	readonly retryAfterSeconds: number | undefined;

	constructor(
		message: string,
		options: { status: number; retryAfterSeconds?: number; cause?: unknown }
	) {
		super(message, { cause: options.cause });
		this.name = 'ReferenceProviderHttpError';
		this.status = options.status;
		this.retryAfterSeconds = options.retryAfterSeconds;
	}
}

export function parseRetryAfterSeconds(value: string | null): number | undefined {
	if (value === null || value.trim().length === 0) {
		return undefined;
	}

	const seconds = Number.parseInt(value, 10);

	if (Number.isFinite(seconds) && seconds > 0) {
		return seconds;
	}

	const retryDate = Date.parse(value);

	if (!Number.isFinite(retryDate)) {
		return undefined;
	}

	const remainingMilliseconds = retryDate - Date.now();
	return remainingMilliseconds > 0 ? Math.ceil(remainingMilliseconds / 1000) : undefined;
}

export function isReferenceProviderHttpError(cause: unknown): cause is ReferenceProviderHttpError {
	return cause instanceof ReferenceProviderHttpError;
}
