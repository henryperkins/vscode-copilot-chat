/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable, lm } from 'vscode';
import { IChatModelInformation } from '../../../platform/endpoint/common/endpointProvider';
import { ILogService } from '../../../platform/log/common/logService';
import { IFetcherService } from '../../../platform/networking/common/fetcherService';
import { IInstantiationService } from '../../../util/vs/platform/instantiation/common/instantiation';
import { CopilotLanguageModelWrapper } from '../../conversation/vscode-node/languageModelAccess';
import { resolveAzureUrl, shouldUseResponsesAPI } from '../common/azureUtils';
import { BYOKAuthType, BYOKModelCapabilities, BYOKModelConfig, chatModelInfoToProviderMetadata, isPerModelConfig } from '../common/byokProvider';
import { AzureOpenAIEndpoint } from '../node/azureOpenAIEndpoint';
import { BaseOpenAICompatibleBYOKRegistry } from './baseOpenAICompatibleProvider';


/**
 * BYOK registry for Azure OpenAI deployments
 *
 * Azure is different from other providers because each model has its own deployment URL and key,
 * and there's no central listing API. The user needs to manually register each model they want to use.
 */

export class AzureBYOKModelRegistry extends BaseOpenAICompatibleBYOKRegistry {

	constructor(
		@IFetcherService _fetcherService: IFetcherService,
		@ILogService _logService: ILogService,
		@IInstantiationService _instantiationService: IInstantiationService,
	) {
		super(
			BYOKAuthType.PerModelDeployment,
			'Azure',
			'',
			_fetcherService,
			_logService,
			_instantiationService
		);
	}

	/**
	 * Checks if a model is part of the o-series (reasoning models)
	 */
	private isOSeriesModel(modelId: string): boolean {
		return /^(o1|o3|o4|codex-mini)/.test(modelId.toLowerCase());
	}

	/**
	 * Checks if a model supports the Responses API
	 */
	private supportsResponsesAPI(modelId: string): boolean {
		return shouldUseResponsesAPI(modelId);
	}

	/**
	 * Checks if a model supports vision capabilities
	 */
	private supportsVision(modelId: string): boolean {
		const visionModels = [
			'gpt-4o', 'gpt-4.1', 'gpt-image-1', 'o1', 'o3', 'o4-mini', 'codex-mini', 'o3-pro'
		];
		return visionModels.some(model => modelId.toLowerCase().includes(model));
	}

	override async getModelInfo(modelId: string, apiKey: string, modelCapabilities?: BYOKModelCapabilities): Promise<IChatModelInformation> {
		const baseInfo = await super.getModelInfo(modelId, apiKey, modelCapabilities);

		if (this.isOSeriesModel(modelId)) {
			// Enhanced capabilities for o-series models based on Azure documentation
			baseInfo.capabilities.supports = {
				...baseInfo.capabilities.supports,
				tool_calls: true,
				vision: this.supportsVision(modelId),
				// Note: These models should use the Responses API for optimal performance
				// Use shouldUseResponsesAPI(modelId) or this.supportsResponsesAPI(modelId) to determine API choice
			};

			// Updated context windows based on Azure documentation
			// o-series models support: Input: 200,000, Output: 100,000
			baseInfo.capabilities.limits = {
				max_context_window_tokens: 300000, // 200k input + 100k output
				max_prompt_tokens: 200000,
				max_output_tokens: 100000
			};
		} else if (modelId.toLowerCase().includes('gpt-4o') || modelId.toLowerCase().includes('gpt-4.1')) {
			// Enhanced capabilities for GPT-4o and GPT-4.1 models
			baseInfo.capabilities.supports = {
				...baseInfo.capabilities.supports,
				tool_calls: true,
				vision: true,
			};
		}

		return baseInfo;
	}

	override async getAllModels(_apiKey: string): Promise<{ id: string; name: string }[]> {
		// Azure doesn't have a central API for listing models
		// Each model has a unique deployment URL
		return [];
	}

	override async registerModel(config: BYOKModelConfig): Promise<Disposable> {
		if (!isPerModelConfig(config)) {
			throw new Error('Azure BYOK models require both deployment URL and API key');
		}

		const modelInfo: IChatModelInformation = await this.getModelInfo(config.modelId, config.apiKey, config.capabilities);
		const useResponsesAPI = this.supportsResponsesAPI(config.modelId);
		const modelUrl = resolveAzureUrl(config.modelId, config.deploymentUrl, useResponsesAPI);

		const lmModelMetadata = chatModelInfoToProviderMetadata(modelInfo);

		try {
			// Use Azure-specific endpoint for better parameter handling (especially for o-series models)
			const azureOpenAIEndpoint = this._instantiationService.createInstance(
				AzureOpenAIEndpoint,
				modelInfo,
				config.apiKey,
				modelUrl
			);
			const provider = this._instantiationService.createInstance(CopilotLanguageModelWrapper, azureOpenAIEndpoint, lmModelMetadata);

			const disposable = lm.registerChatModelProvider(
				`${this.name}-${config.modelId}`,
				provider,
				lmModelMetadata
			);

			return disposable;
		} catch (e) {
			this._logService.logger.error(`Error registering ${this.name} model ${config.modelId}`);
			throw e;
		}
	}
}
