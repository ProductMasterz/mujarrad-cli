# GetExportStatus200ResponseAllOfData


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**exportJobId** | **string** |  | [optional] [default to undefined]
**status** | **string** |  | [optional] [default to undefined]
**totalNodes** | **number** |  | [optional] [default to undefined]
**processedNodes** | **number** |  | [optional] [default to undefined]
**downloadUrl** | **string** | URL to download exported files (available when status&#x3D;COMPLETED) | [optional] [default to undefined]
**errorMessage** | **string** |  | [optional] [default to undefined]

## Example

```typescript
import { GetExportStatus200ResponseAllOfData } from './api';

const instance: GetExportStatus200ResponseAllOfData = {
    exportJobId,
    status,
    totalNodes,
    processedNodes,
    downloadUrl,
    errorMessage,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
