import type { EnvVarConfig } from '@sveltejs/kit';
import { defineEnvVars } from '@sveltejs/kit/hooks';

const optionalStringSchema: NonNullable<EnvVarConfig<string | undefined>['schema']> = {
	'~standard': {
		version: 1,
		vendor: 'drawthis',
		validate(value: unknown) {
			if (typeof value === 'string' || value === undefined) {
				return { value };
			}

			return { issues: [{ message: 'Expected a string environment variable value' }] };
		}
	}
};

export const variables = defineEnvVars({
	DRAWTHIS_OPENVERSE_ENABLED: {
		schema: optionalStringSchema,
		description: 'Enable the server-side Openverse reference provider when set to true.'
	},
	DRAWTHIS_OPENVERSE_API_BASE_URL: {
		schema: optionalStringSchema,
		description: 'Optional Openverse-compatible API base URL override.'
	}
});
