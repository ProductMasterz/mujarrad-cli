# RollbackNodeRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**versionId** | **string** | Version ID to rollback to | [default to undefined]
**commitMessage** | **string** | Git commit message for rollback | [optional] [default to undefined]

## Example

```typescript
import { RollbackNodeRequest } from 'mujarrad-api-client';

const instance: RollbackNodeRequest = {
    versionId,
    commitMessage,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
