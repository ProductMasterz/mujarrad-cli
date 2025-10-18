# ApplySyncChangesRequestChangesInner


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**filePath** | **string** |  | [default to undefined]
**action** | **string** |  | [default to undefined]
**content** | **string** | File content (for create/update actions) | [optional] [default to undefined]
**nodeId** | **string** | Node ID (for update/delete actions) | [optional] [default to undefined]

## Example

```typescript
import { ApplySyncChangesRequestChangesInner } from './api';

const instance: ApplySyncChangesRequestChangesInner = {
    filePath,
    action,
    content,
    nodeId,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
