/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Raw } from '@vscode/prompt-tsx';
import type { CancellationToken } from 'vscode';
import { IAuthenticationService } from '../../../platform/authentication/common/authentication';
import { IChatMLFetcher, IntentParams, Source } from '../../../platform/chat/common/chatMLFetcher';
import { ChatLocation, ChatResponse } from '../../../platform/chat/common/commonTypes';
import { ICAPIClientService } from '../../../platform/endpoint/common/capiClient';
import { IDomainService } from '../../../platform/endpoint/common/domainService';
import { IChatModelInformation } from '../../../platform/endpoint/common/endpointProvider';
import { IEnvService } from '../../../platform/env/common/envService';
import { FinishedCallback, OptionalChatRequestParams } from '../../../platform/networking/common/fetch';
import { IFetcherService } from '../../../platform/networking/common/fetcherService';
import { IChatEndpoint, IEndpointBody } from '../../../platform/networking/common/networking';
import { ITelemetryService, TelemetryProperties } from '../../../platform/telemetry/common/telemetry';
import { IThinkingDataService } from '../../../platform/thinking/node/thinkingDataService';
import { ITokenizerProvider } from '../../../platform/tokenizer/node/tokenizer';
import { IInstantiationService } from '../../../util/vs/platform/instantiation/common/instantiation';
import { OpenAIEndpoint } from './openAIEndpoint';

/**
 * Azure OpenAI endpoint with specific handling for o-series models and parameter restrictions
 */
export class AzureOpenAIEndpoint extends OpenAIEndpoint {
	private readonly _azureInstantiationService: IInstantiationService;

	constructor(
		private readonly _azureModelInfo: IChatModelInformation,
		private readonly _azureApiKey: string,
		private readonly _azureModelUrl: string,
		@IFetcherService fetcherService: IFetcherService,
		@IDomainService domainService: IDomainService,
		@ICAPIClientService capiClientService: ICAPIClientService,
		@IEnvService envService: IEnvService,
		@ITelemetryService telemetryService: ITelemetryService,
		@IAuthenticationService authService: IAuthenticationService,
		@IChatMLFetcher chatMLFetcher: IChatMLFetcher,
		@ITokenizerProvider tokenizerProvider: ITokenizerProvider,
		@IInstantiationService instantiationService: IInstantiationService,
		@IThinkingDataService thinkingDataService: IThinkingDataService
	) {
		super(
			_azureModelInfo,
			_azureApiKey,
			_azureModelUrl,
			fetcherService,
			domainService,
			capiClientService,
			envService,
			telemetryService,
			authService,
			chatMLFetcher,
			tokenizerProvider,
			instantiationService,
			thinkingDataService
		);
		this._azureInstantiationService = instantiationService;
	}

	/**
	 * Checks if a model is part of the o-series (reasoning models)
	 */
	private isOSeriesModel(modelId: string): boolean {
		return /^(o1|o3|o4|codex-mini)/.test(modelId.toLowerCase());
	}

	/**
	 * Determines if the model should use the Responses API
	 * Inlined to avoid import restrictions
	 */
	private shouldUseResponsesAPI(modelId: string): boolean {
		// O-series models benefit from Responses API
		return this.isOSeriesModel(modelId);
	}

	override interceptBody(body: IEndpointBody | undefined): void {
		super.interceptBody(body);

		if (body && this.isOSeriesModel(this.model)) {
			// O-series models in Azure OpenAI only support temperature = 1 (default)
			// Remove temperature parameter to avoid the "Unsupported value: 'temperature' does not support 0.1" error
			if ('temperature' in body) {
				console.info(`Azure o-series model ${this.model}: Removing temperature parameter (${body.temperature}) - o-series models only support default temperature=1`);
				delete body.temperature;
			}

			// O-series models also have restrictions on other parameters
			if ('top_p' in body && body.top_p !== undefined && body.top_p !== 1) {
				console.info(`Azure o-series model ${this.model}: Removing top_p parameter (${body.top_p}) - o-series models only support default top_p=1`);
				delete body.top_p;
			}

			// O-series models should use Responses API when available
			if (this.shouldUseResponsesAPI(this.model)) {
				console.info(`Azure o-series model ${this.model}: Model should use Responses API for optimal performance`);
			}
		}
	}

	override cloneWithTokenOverride(modelMaxPromptTokens: number): IChatEndpoint {
		const newModelInfo = { ...this._azureModelInfo, maxInputTokens: modelMaxPromptTokens };
		return this._azureInstantiationService.createInstance(AzureOpenAIEndpoint, newModelInfo, this._azureApiKey, this._azureModelUrl);
	}

	// Override the chat request method to ensure we don't use Copilot-specific authentication
	override async makeChatRequest(
		debugName: string,
		messages: Raw.ChatMessage[],
		finishedCb: FinishedCallback | undefined,
		token: CancellationToken,
		location: ChatLocation,
		source?: Source,
		requestOptions?: Omit<OptionalChatRequestParams, 'n'>,
		userInitiatedRequest?: boolean,
		telemetryProperties?: TelemetryProperties,
		intentParams?: IntentParams
	): Promise<ChatResponse> {
		try {
			// For Azure BYOK, we use the OpenAI endpoint's chat request method
			// which handles BYOK authentication properly
			return await super.makeChatRequest(
				debugName,
				messages,
				finishedCb,
				token,
				location,
				source,
				requestOptions,
				userInitiatedRequest,
				telemetryProperties,
				intentParams
			);
		} catch (error) {
			// Add specific error handling for auth-related issues
			if (error && typeof error === 'object' && 'message' in error) {
				const errorMessage = String(error.message);
				if (errorMessage.includes('auth') || errorMessage.includes('authentication')) {
					throw new Error(`Azure OpenAI authentication failed: ${errorMessage}. Please check your API key configuration.`);
				}
			}
			throw error;
		}
	}
}
