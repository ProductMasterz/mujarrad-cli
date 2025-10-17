# SpaceResponse


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **string** |  | [default to undefined]
**ownerId** | **string** |  | [default to undefined]
**title** | **string** |  | [default to undefined]
**description** | **string** |  | [optional] [default to undefined]
**gitRepositoryUrl** | **string** |  | [optional] [default to undefined]
**gitBranch** | **string** |  | [optional] [default to 'main']
**nodeCount** | **number** | Total number of nodes in space | [optional] [default to undefined]
**createdAt** | **string** |  | [default to undefined]
**updatedAt** | **string** |  | [default to undefined]

## Example

```typescript
import { SpaceResponse } from 'mujarrad-api-client';

const instance: SpaceResponse = {
    id,
    ownerId,
    title,
    description,
    gitRepositoryUrl,
    gitBranch,
    nodeCount,
    createdAt,
    updatedAt,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
