/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { describe, expect, it } from 'vitest';
import { resolveAzureUrl, shouldUseResponsesAPI } from '../../../src/extension/byok/common/azureUtils';

describe('Azure Provider', () => {

	describe('resolveAzureUrl', () => {

		it('should use updated API version for Azure OpenAI deployments', () => {
			const modelId = 'gpt-4';
			const url = 'https://test.openai.azure.com';
			const result = resolveAzureUrl(modelId, url);

			expect(result).toBe('https://test.openai.azure.com/openai/deployments/gpt-4/chat/completions?api-version=2025-04-01-preview');
		});

		it('should support Responses API for o-series models', () => {
			const modelId = 'o1-preview';
			const url = 'https://test.openai.azure.com';
			const result = resolveAzureUrl(modelId, url, true);

			expect(result).toBe('https://test.openai.azure.com/openai/v1/responses?api-version=2025-04-01-preview');
		});

		it('should handle Azure ML endpoints correctly', () => {
			const modelId = 'gpt-4o';
			const url = 'https://test.models.ai.azure.com';
			const result = resolveAzureUrl(modelId, url);

			expect(result).toBe('https://test.models.ai.azure.com/v1/chat/completions');
		});

		it('should handle Azure ML endpoints with Responses API', () => {
			const modelId = 'o3-mini';
			const url = 'https://test.models.ai.azure.com';
			const result = resolveAzureUrl(modelId, url, true);

			expect(result).toBe('https://test.models.ai.azure.com/v1/responses');
		});

		it('should handle already resolved URLs', () => {
			const resolvedUrl = 'https://test.openai.azure.com/openai/deployments/gpt-4/chat/completions?api-version=2025-04-01-preview';
			const result = resolveAzureUrl('gpt-4', resolvedUrl);

			expect(result).toBe(resolvedUrl);
		});

		it('should throw error for unrecognized URLs', () => {
			const url = 'https://unknown-endpoint.com';

			expect(() => resolveAzureUrl('gpt-4', url)).toThrow('Unrecognized Azure deployment URL');
		});

	});

	describe('shouldUseResponsesAPI', () => {

		it('should return true for o-series models', () => {
			expect(shouldUseResponsesAPI('o1')).toBe(true);
			expect(shouldUseResponsesAPI('o1-preview')).toBe(true);
			expect(shouldUseResponsesAPI('o3')).toBe(true);
			expect(shouldUseResponsesAPI('o3-mini')).toBe(true);
			expect(shouldUseResponsesAPI('o4-mini')).toBe(true);
			expect(shouldUseResponsesAPI('codex-mini')).toBe(true);
			expect(shouldUseResponsesAPI('o3-pro')).toBe(true);
		});

		it('should return true for advanced models', () => {
			expect(shouldUseResponsesAPI('gpt-4.1')).toBe(true);
			expect(shouldUseResponsesAPI('gpt-4.1-mini')).toBe(true);
			expect(shouldUseResponsesAPI('gpt-4.1-nano')).toBe(true);
			expect(shouldUseResponsesAPI('gpt-image-1')).toBe(true);
			expect(shouldUseResponsesAPI('computer-use-preview')).toBe(true);
		});

		it('should return false for standard models', () => {
			expect(shouldUseResponsesAPI('gpt-4')).toBe(false);
			expect(shouldUseResponsesAPI('gpt-4o')).toBe(false);
			expect(shouldUseResponsesAPI('gpt-3.5-turbo')).toBe(false);
			expect(shouldUseResponsesAPI('text-davinci-003')).toBe(false);
		});

		it('should be case insensitive', () => {
			expect(shouldUseResponsesAPI('O1')).toBe(true);
			expect(shouldUseResponsesAPI('O3-MINI')).toBe(true);
			expect(shouldUseResponsesAPI('GPT-4.1')).toBe(true);
		});

	});

	describe('AzureBYOKModelRegistry', () => {

		// Note: These tests would require mocking the dependencies
		// For now, we'll test the logic through integration tests

		it('should identify o-series models correctly', () => {
			// This would test the private isOSeriesModel method
			// Implementation depends on how we want to expose this for testing
		});

		it('should set correct capabilities for o-series models', () => {
			// This would test the getModelInfo method with o-series models
			// to ensure they get the correct context window limits and capabilities
		});

	});

});

describe('Azure Provider Integration', () => {

	it('should configure URLs correctly for different model types', () => {
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
			expect(result).toBe(expected);
		});
	});

});
