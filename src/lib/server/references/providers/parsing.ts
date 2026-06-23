export function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function getNonEmptyString(
	record: Record<string, unknown>,
	key: string
): string | undefined {
	const value = record[key];

	if (typeof value !== 'string') {
		return undefined;
	}

	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
}

export function getPositiveNumber(
	record: Record<string, unknown>,
	key: string
): number | undefined {
	const value = record[key];

	return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined;
}

export function getPositiveInteger(value: unknown): number | undefined {
	return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : undefined;
}

export function getBoolean(record: Record<string, unknown>, key: string): boolean | undefined {
	const value = record[key];

	return typeof value === 'boolean' ? value : undefined;
}

export function normalizePageCursor(cursor: string | undefined): string {
	if (cursor === undefined) {
		return '1';
	}

	const page = Number.parseInt(cursor, 10);
	return Number.isInteger(page) && page > 0 ? String(page) : '1';
}
