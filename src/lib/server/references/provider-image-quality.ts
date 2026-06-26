export interface ProviderImageQualityInput {
	url: string;
	width?: number;
	height?: number;
}

const minimumKnownImageWidth = 320;
const minimumKnownImageHeight = 320;
const maximumKnownAspectRatio = 5;

function isHttpImageUrl(url: string): boolean {
	try {
		const parsedUrl = new URL(url);

		return parsedUrl.protocol === 'https:' || parsedUrl.protocol === 'http:';
	} catch {
		return false;
	}
}

export function isProviderImageUsable(image: ProviderImageQualityInput): boolean {
	if (!isHttpImageUrl(image.url)) {
		return false;
	}

	if (image.width !== undefined && image.width < minimumKnownImageWidth) {
		return false;
	}

	if (image.height !== undefined && image.height < minimumKnownImageHeight) {
		return false;
	}

	if (image.width !== undefined && image.height !== undefined) {
		const aspectRatio = Math.max(image.width / image.height, image.height / image.width);

		if (aspectRatio > maximumKnownAspectRatio) {
			return false;
		}
	}

	return true;
}
