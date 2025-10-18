# ErrorResponseError


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**code** | **string** | Machine-readable error code | [default to undefined]
**message** | **string** | Human-readable error message | [default to undefined]
**details** | **{ [key: string]: any; }** | Additional error context (optional) | [optional] [default to undefined]
**timestamp** | **string** |  | [default to undefined]

## Example

```typescript
import { ErrorResponseError } from './api';

const instance: ErrorResponseError = {
    code,
    message,
    details,
    timestamp,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
