const providerUnavailableErrorPrefix = 'No reference providers returned references';

export function formatReferenceFeedErrorMessage(message: string): string {
	return message.startsWith(providerUnavailableErrorPrefix)
		? 'No reference providers are available right now. Try again shortly or enable another provider.'
		: message;
}
