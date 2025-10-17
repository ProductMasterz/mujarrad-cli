# SharingApi

All URIs are relative to *https://api.example.com*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**shareSpace**](#sharespace) | **POST** /api/spaces/{spaceId}/share | Share space (Future)|

# **shareSpace**
> shareSpace()

Share space with another user (not implemented in first release).

### Example

```typescript
import {
    SharingApi,
    Configuration,
    ShareSpaceRequest
} from 'mujarrad-api-client';

const configuration = new Configuration();
const apiInstance = new SharingApi(configuration);

let spaceId: string; //Space UUID (default to undefined)
let shareSpaceRequest: ShareSpaceRequest; // (optional)

const { status, data } = await apiInstance.shareSpace(
    spaceId,
    shareSpaceRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **shareSpaceRequest** | **ShareSpaceRequest**|  | |
| **spaceId** | [**string**] | Space UUID | defaults to undefined|


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

