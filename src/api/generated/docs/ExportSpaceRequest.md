# ExportSpaceRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**format** | **string** | Export format (currently only Obsidian supported) | [optional] [default to FormatEnum_Obsidian]
**includeVersionHistory** | **boolean** | Include Git history in export | [optional] [default to false]
**includeCanvases** | **boolean** | Include canvas files | [optional] [default to true]

## Example

```typescript
import { ExportSpaceRequest } from './api';

const instance: ExportSpaceRequest = {
    format,
    includeVersionHistory,
    includeCanvases,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
