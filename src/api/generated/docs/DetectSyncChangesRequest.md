# DetectSyncChangesRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**localFiles** | [**Array&lt;DetectSyncChangesRequestLocalFilesInner&gt;**](DetectSyncChangesRequestLocalFilesInner.md) |  | [default to undefined]
**lastSyncTimestamp** | **string** | Timestamp of last successful sync | [optional] [default to undefined]

## Example

```typescript
import { DetectSyncChangesRequest } from 'mujarrad-api-client';

const instance: DetectSyncChangesRequest = {
    localFiles,
    lastSyncTimestamp,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
