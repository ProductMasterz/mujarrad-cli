# SyncSessionResponse


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **string** |  | [default to undefined]
**spaceId** | **string** |  | [default to undefined]
**status** | **string** |  | [default to undefined]
**syncDirection** | **string** |  | [optional] [default to undefined]
**changesDetected** | **number** |  | [default to undefined]
**changesApplied** | **number** |  | [default to undefined]
**conflictsResolved** | **number** |  | [optional] [default to undefined]
**conflictDetails** | [**Array&lt;SyncSessionResponseConflictDetailsInner&gt;**](SyncSessionResponseConflictDetailsInner.md) |  | [optional] [default to undefined]
**createdAt** | **string** |  | [optional] [default to undefined]
**updatedAt** | **string** |  | [optional] [default to undefined]
**completedAt** | **string** |  | [optional] [default to undefined]

## Example

```typescript
import { SyncSessionResponse } from 'mujarrad-api-client';

const instance: SyncSessionResponse = {
    id,
    spaceId,
    status,
    syncDirection,
    changesDetected,
    changesApplied,
    conflictsResolved,
    conflictDetails,
    createdAt,
    updatedAt,
    completedAt,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
