# SyncChangesResponse


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**localChanges** | [**Array&lt;SyncChangesResponseLocalChangesInner&gt;**](SyncChangesResponseLocalChangesInner.md) | Changes detected in local vault | [default to undefined]
**remoteChanges** | [**Array&lt;SyncChangesResponseRemoteChangesInner&gt;**](SyncChangesResponseRemoteChangesInner.md) | Changes detected in remote space | [default to undefined]
**conflicts** | [**Array&lt;SyncChangesResponseConflictsInner&gt;**](SyncChangesResponseConflictsInner.md) | Files with conflicting changes | [default to undefined]

## Example

```typescript
import { SyncChangesResponse } from './api';

const instance: SyncChangesResponse = {
    localChanges,
    remoteChanges,
    conflicts,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
