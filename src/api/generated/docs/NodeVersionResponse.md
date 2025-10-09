# NodeVersionResponse


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **string** |  | [default to undefined]
**nodeId** | **string** |  | [default to undefined]
**versionNumber** | **number** | Sequential version number (starts at 1) | [default to undefined]
**contentSnapshot** | **string** | Full content at this version | [optional] [default to undefined]
**gitMetadata** | [**NodeVersionResponseGitMetadata**](NodeVersionResponseGitMetadata.md) |  | [optional] [default to undefined]
**createdAt** | **string** |  | [default to undefined]

## Example

```typescript
import { NodeVersionResponse } from 'mujarrad-api-client';

const instance: NodeVersionResponse = {
    id,
    nodeId,
    versionNumber,
    contentSnapshot,
    gitMetadata,
    createdAt,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
