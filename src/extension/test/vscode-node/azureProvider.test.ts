/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { resolveAzureUrl, shouldUseResponsesAPI } from '../../byok/common/azureUtils';

suite('Azure Provider', () => {

	suite('resolveAzureUrl', () => {

		test('should use updated API version for Azure OpenAI deployments', () => {
			const modelId = 'gpt-4';
			const url = 'https://test.openai.azure.com';
			const result = resolveAzureUrl(modelId, url);

			assert.strictEqual(result, 'https://test.openai.azure.com/openai/deployments/gpt-4/chat/completions?api-version=2025-04-01-preview');
		});

		test('should support Responses API for o-series models', () => {
			const modelId = 'o1-preview';
			const url = 'https://test.openai.azure.com';
			const result = resolveAzureUrl(modelId, url, true);

			assert.strictEqual(result, 'https://test.openai.azure.com/openai/v1/responses?api-version=2025-04-01-preview');
		});

		test('should handle Azure ML endpoints correctly', () => {
			const modelId = 'gpt-4o';
			const url = 'https://test.models.ai.azure.com';
			const result = resolveAzureUrl(modelId, url);

			assert.strictEqual(result, 'https://test.models.ai.azure.com/v1/chat/completions');
		});

		test('should handle Azure ML endpoints with Responses API', () => {
			const modelId = 'o3-mini';
			const url = 'https://test.models.ai.azure.com';
			const result = resolveAzureUrl(modelId, url, true);

			assert.strictEqual(result, 'https://test.models.ai.azure.com/v1/responses');
		});

		test('should handle already resolved URLs', () => {
			const resolvedUrl = 'https://test.openai.azure.com/openai/deployments/gpt-4/chat/completions?api-version=2025-04-01-preview';
			const result = resolveAzureUrl('gpt-4', resolvedUrl);

			assert.strictEqual(result, resolvedUrl);
		});

		test('should throw error for unrecognized URLs', () => {
			const url = 'https://unknown-endpoint.com';

			assert.throws(() => resolveAzureUrl('gpt-4', url), /Unrecognized Azure deployment URL/);
		});

	});

	suite('shouldUseResponsesAPI', () => {

		test('should return true for o-series models', () => {
			assert.strictEqual(shouldUseResponsesAPI('o1'), true);
			assert.strictEqual(shouldUseResponsesAPI('o1-preview'), true);
			assert.strictEqual(shouldUseResponsesAPI('o3'), true);
			assert.strictEqual(shouldUseResponsesAPI('o3-mini'), true);
			assert.strictEqual(shouldUseResponsesAPI('o4-mini'), true);
			assert.strictEqual(shouldUseResponsesAPI('codex-mini'), true);
			assert.strictEqual(shouldUseResponsesAPI('o3-pro'), true);
		});

		test('should return true for advanced models', () => {
			assert.strictEqual(shouldUseResponsesAPI('gpt-4.1'), true);
			assert.strictEqual(shouldUseResponsesAPI('gpt-4.1-mini'), true);
			assert.strictEqual(shouldUseResponsesAPI('gpt-4.1-nano'), true);
			assert.strictEqual(shouldUseResponsesAPI('gpt-image-1'), true);
			assert.strictEqual(shouldUseResponsesAPI('computer-use-preview'), true);
		});

		test('should return false for standard models', () => {
			assert.strictEqual(shouldUseResponsesAPI('gpt-4'), false);
			assert.strictEqual(shouldUseResponsesAPI('gpt-4o'), false);
			assert.strictEqual(shouldUseResponsesAPI('gpt-3.5-turbo'), false);
			assert.strictEqual(shouldUseResponsesAPI('text-davinci-003'), false);
		});

		test('should be case insensitive', () => {
			assert.strictEqual(shouldUseResponsesAPI('O1'), true);
			assert.strictEqual(shouldUseResponsesAPI('O3-MINI'), true);
			assert.strictEqual(shouldUseResponsesAPI('GPT-4.1'), true);
		});

	});

});

suite('Azure Provider Integration', () => {

	test('should configure URLs correctly for different model types', () => {
		const testCases = [
			{
				modelId: 'gpt-4',
				url: 'https://test.openai.azure.com',
				useResponsesAPI: false,
				expected: 'https://test.openai.azure.com/openai/deployments/gpt-4/chat/completions?api-version=2025-04-01-preview'
			},
			{
				modelId: 'o1-preview',
				url: 'https://test.openai.azure.com',
				useResponsesAPI: true,
				expected: 'https://test.openai.azure.com/openai/v1/responses?api-version=2025-04-01-preview'
			},
			{
				modelId: 'gpt-4.1',
				url: 'https://test.models.ai.azure.com',
				useResponsesAPI: true,
				expected: 'https://test.models.ai.azure.com/v1/responses'
			}
		];

		testCases.forEach(({ modelId, url, useResponsesAPI, expected }) => {
			const result = resolveAzureUrl(modelId, url, useResponsesAPI);
			assert.strictEqual(result, expected);
		});
	});

});
