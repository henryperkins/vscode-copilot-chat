# Azure Provider Updates for BYOK System

## Overview

This document outlines the critical updates made to the Azure provider in the BYOK (Bring Your Own Key) system to support the latest Azure OpenAI API features and models, particularly the o-series reasoning models.

## Key Changes Made

### 1. API Version Update

**Changed**: Updated from `2025-01-01-preview` to `2025-04-01-preview`

**Impact**: Ensures compatibility with the latest Azure OpenAI features including:
- o-series models (`o1`, `o3`, `o3-mini`, `o4-mini`, `codex-mini`, `o3-pro`)
- Enhanced tool calling capabilities
- Structured outputs
- Developer messages
- Reasoning effort parameters

### 2. Responses API Support

**Added**: Support for Azure OpenAI Responses API alongside Chat Completions API

**New Functions**:
- `shouldUseResponsesAPI(modelId: string): boolean` - Determines which API to use based on model
- Enhanced `resolveAzureUrl()` with `useResponsesAPI` parameter

**Models using Responses API**:
- o-series models: `o1`, `o3`, `o3-mini`, `o4-mini`, `codex-mini`, `o3-pro`
- Advanced models: `gpt-4.1`, `gpt-4.1-mini`, `gpt-4.1-nano`, `gpt-image-1`, `computer-use-preview`

### 3. Enhanced Model Capabilities

**Updated**: `AzureBYOKModelRegistry.getModelInfo()` method

**o-series Model Enhancements**:
- Context window: 300,000 tokens (200k input + 100k output)
- Tool calling: Enabled
- Vision: Conditional based on model
- Reasoning capabilities: Supported

**GPT-4o/4.1 Model Enhancements**:
- Tool calling: Enabled
- Vision: Enabled
- Enhanced performance characteristics

### 4. URL Resolution Improvements

**Enhanced**: `resolveAzureUrl()` function now handles:
- Standard Azure OpenAI endpoints with updated API version
- Azure ML inference endpoints (`models.ai.azure.com`, `inference.ml.azure.com`)
- Responses API endpoints for compatible models
- Proper error handling for unrecognized endpoints

## Usage Examples

### Standard Chat Completions (GPT-4)
```typescript
const url = resolveAzureUrl('gpt-4', 'https://mydeployment.openai.azure.com');
// Result: https://mydeployment.openai.azure.com/openai/deployments/gpt-4/chat/completions?api-version=2025-04-01-preview
```

### Responses API (o-series models)
```typescript
const url = resolveAzureUrl('o1-preview', 'https://mydeployment.openai.azure.com', true);
// Result: https://mydeployment.openai.azure.com/openai/v1/responses?api-version=2025-04-01-preview
```

### Automatic API Selection
```typescript
const useResponsesAPI = shouldUseResponsesAPI('o3-mini'); // true
const url = resolveAzureUrl('o3-mini', 'https://mydeployment.openai.azure.com', useResponsesAPI);
```

## Model Support Matrix

| Model Category | Chat Completions API | Responses API | Enhanced Capabilities |
|----------------|---------------------|---------------|----------------------|
| o-series (o1, o3, o4) | ✅ | ✅ (Recommended) | Reasoning, 200k context |
| GPT-4.1 series | ✅ | ✅ (Recommended) | Enhanced tools, vision |
| GPT-4o series | ✅ | ❌ | Standard tools, vision |
| GPT-4 series | ✅ | ❌ | Standard capabilities |

## Breaking Changes

### None for Existing Users
- Existing model configurations continue to work
- API version updated automatically
- Backward compatibility maintained

### New Features Available
- o-series model support with proper capabilities
- Responses API access for supported models
- Enhanced context windows for reasoning models

## Migration Guide

### For Existing Azure BYOK Users
1. **No action required** - existing models continue to work with updated API version
2. **Optional**: Configure o-series models to leverage Responses API benefits
3. **Recommended**: Update model capabilities for o-series models to use expanded context windows

### For New o-series Model Users
1. Use `shouldUseResponsesAPI(modelId)` to determine optimal API
2. Configure models with enhanced context limits (200k input, 100k output)
3. Leverage reasoning capabilities and structured outputs

## Testing

Comprehensive tests added in `/src/extension/test/vscode-node/azureProvider.test.ts`:
- API version validation
- URL resolution for different model types
- Responses API detection logic
- Error handling for edge cases

## Future Considerations

### Potential Enhancements
1. **Background Mode Support**: For long-running o-series tasks
2. **MCP Integration**: Model Context Protocol for enhanced tool calling
3. **Reasoning Effort Parameters**: Fine-grained control over reasoning depth
4. **Streaming Optimization**: Enhanced streaming for Responses API

### Monitoring Points
1. **API Rate Limits**: Monitor usage patterns with new API version
2. **Performance**: Track response times for different APIs
3. **Error Rates**: Monitor compatibility issues with model deployments

## Compliance Notes

- All changes maintain existing security patterns
- No changes to authentication mechanisms
- API key handling remains unchanged
- Error messages enhanced for better debugging

---

*Last Updated: 2025-07-16*
*Version: 1.0.0*
