# TemplateCreateRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**workspaceId** | **string** | Workspace to create template from | [default to undefined]
**name** | **string** |  | [default to undefined]
**description** | **string** |  | [optional] [default to undefined]
**tags** | **Array&lt;string&gt;** |  | [optional] [default to undefined]
**isPublic** | **boolean** |  | [optional] [default to false]

## Example

```typescript
import { TemplateCreateRequest } from 'mujarrad-api-client';

const instance: TemplateCreateRequest = {
    workspaceId,
    name,
    description,
    tags,
    isPublic,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
