/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export function resolveAzureUrl(modelId: string, url: string, useResponsesAPI?: boolean): string {
	// The fully resolved url was already passed in
	if (url.includes('/chat/completions') || url.includes('/responses')) {
		return url;
	}

	// Remove the trailing slash
	if (url.endsWith('/')) {
		url = url.slice(0, -1);
	}
	// if url ends with `/v1` remove it
	if (url.endsWith('/v1')) {
		url = url.slice(0, -3);
	}

	if (url.includes('models.ai.azure.com') || url.includes('inference.ml.azure.com')) {
		if (useResponsesAPI) {
			return `${url}/v1/responses`;
		}
		return `${url}/v1/chat/completions`;
	} else if (url.includes('openai.azure.com')) {
		if (useResponsesAPI) {
			// For o-series models and advanced features that require Responses API
			return `${url}/openai/v1/responses?api-version=2025-04-01-preview`;
		}
		// Standard chat completions with updated API version
		return `${url}/openai/deployments/${modelId}/chat/completions?api-version=2025-04-01-preview`;
	} else {
		throw new Error(`Unrecognized Azure deployment URL: ${url}`);
	}
}

/**
 * Determines if a model should use the Responses API based on Azure OpenAI documentation
 * @param modelId The model identifier
 * @returns true if the model should use Responses API, false for Chat Completions API
 */
export function shouldUseResponsesAPI(modelId: string): boolean {
	// Models that require or benefit from Responses API according to Azure docs
	const responsesAPIModels = [
		'o1', 'o3', 'o3-mini', 'o4-mini', 'codex-mini', 'o3-pro',
		'gpt-4.1', 'gpt-4.1-mini', 'gpt-4.1-nano', 'gpt-image-1',
		'computer-use-preview'
	];
	return responsesAPIModels.some(model => modelId.toLowerCase().includes(model));
}