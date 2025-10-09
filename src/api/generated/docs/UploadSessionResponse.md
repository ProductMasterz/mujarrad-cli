# UploadSessionResponse


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **string** |  | [default to undefined]
**workspaceId** | **string** |  | [default to undefined]
**status** | **string** |  | [default to undefined]
**totalFiles** | **number** |  | [default to undefined]
**processedFiles** | **number** |  | [default to undefined]
**failedFiles** | **number** |  | [optional] [default to undefined]
**logFileUrl** | **string** | URL to download log file | [optional] [default to undefined]
**errorMessage** | **string** |  | [optional] [default to undefined]
**createdAt** | **string** |  | [default to undefined]
**updatedAt** | **string** |  | [optional] [default to undefined]
**completedAt** | **string** |  | [optional] [default to undefined]

## Example

```typescript
import { UploadSessionResponse } from 'mujarrad-api-client';

const instance: UploadSessionResponse = {
    id,
    workspaceId,
    status,
    totalFiles,
    processedFiles,
    failedFiles,
    logFileUrl,
    errorMessage,
    createdAt,
    updatedAt,
    completedAt,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
