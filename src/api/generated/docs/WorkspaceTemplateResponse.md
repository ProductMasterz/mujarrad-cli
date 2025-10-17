# SpaceTemplateResponse


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **string** |  | [default to undefined]
**creatorId** | **string** |  | [default to undefined]
**name** | **string** |  | [default to undefined]
**description** | **string** |  | [optional] [default to undefined]
**tags** | **Array&lt;string&gt;** |  | [optional] [default to undefined]
**isPublic** | **boolean** |  | [default to undefined]
**usageCount** | **number** | Number of times template has been instantiated | [default to undefined]
**contextTemplatesCount** | **number** | Number of nodes in template | [optional] [default to undefined]
**createdAt** | **string** |  | [default to undefined]
**updatedAt** | **string** |  | [optional] [default to undefined]

## Example

```typescript
import { SpaceTemplateResponse } from 'mujarrad-api-client';

const instance: SpaceTemplateResponse = {
    id,
    creatorId,
    name,
    description,
    tags,
    isPublic,
    usageCount,
    contextTemplatesCount,
    createdAt,
    updatedAt,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
