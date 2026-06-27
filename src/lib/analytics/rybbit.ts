import type { DrawingReference } from '$lib/references';

export const referenceImageViewedEventName = 'reference_image_viewed';

type RybbitEventProperties = Record<string, string | number>;

export function trackReferenceImageViewed(
	reference: DrawingReference,
	resolvedImageUrl: string
): void {
	const properties = createReferenceImageViewedEventProperties(reference, resolvedImageUrl);

	sendRybbitEvent(referenceImageViewedEventName, properties);
}

export function createReferenceImageViewedEventProperties(
	reference: DrawingReference,
	resolvedImageUrl: string
): RybbitEventProperties {
	const properties: RybbitEventProperties = {
		reference_id: reference.id,
		image_url: resolvedImageUrl,
		provider_id: reference.provider.id,
		provider_reference_id: reference.provider.referenceId,
		subject: reference.taxonomy.primarySubject,
		source_name: reference.attribution.sourceName
	};

	if (reference.taxonomy.topic !== undefined) {
		properties.topic = reference.taxonomy.topic;
	}

	if (reference.image.width !== undefined) {
		properties.image_width = reference.image.width;
	}

	if (reference.image.height !== undefined) {
		properties.image_height = reference.image.height;
	}

	return properties;
}

function sendRybbitEvent(eventName: string, properties: RybbitEventProperties): void {
	if (typeof window === 'undefined') {
		return;
	}

	const rybbit = window.rybbit;

	if (rybbit === undefined) {
		return;
	}

	if (typeof rybbit.event === 'function') {
		rybbit.event(eventName, properties);
		return;
	}

	rybbit.onReady?.((readyRybbit) => {
		readyRybbit.event(eventName, properties);
	});
}
