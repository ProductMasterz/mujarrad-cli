# SharingApi

All URIs are relative to *https://api.example.com*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**shareWorkspace**](#shareworkspace) | **POST** /api/workspaces/{workspaceId}/share | Share workspace (Future)|

# **shareWorkspace**
> shareWorkspace()

Share workspace with another user (not implemented in first release).

### Example

```typescript
import {
    SharingApi,
    Configuration,
    ShareWorkspaceRequest
} from 'mujarrad-api-client';

const configuration = new Configuration();
const apiInstance = new SharingApi(configuration);

let workspaceId: string; //Workspace UUID (default to undefined)
let shareWorkspaceRequest: ShareWorkspaceRequest; // (optional)

const { status, data } = await apiInstance.shareWorkspace(
    workspaceId,
    shareWorkspaceRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **shareWorkspaceRequest** | **ShareWorkspaceRequest**|  | |
| **workspaceId** | [**string**] | Workspace UUID | defaults to undefined|


### Return type

void (empty response body)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**501** | Not implemented |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

