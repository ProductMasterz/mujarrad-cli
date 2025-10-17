# SyncApi

All URIs are relative to *https://api.example.com*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**applySyncChanges**](#applysyncchanges) | **POST** /api/spaces/{spaceId}/sync/apply | Apply sync changes|
|[**detectSyncChanges**](#detectsyncchanges) | **POST** /api/spaces/{spaceId}/sync/detect | Detect sync changes|

# **applySyncChanges**
> ApplySyncChanges200Response applySyncChanges(applySyncChangesRequest)

Apply detected changes with conflict resolution.  **Conflict Resolution Strategy**: Last-write-wins using timestamp.  **Process**: 1. Backend applies changes in order: delete → update → create 2. Conflicts resolved automatically using most recent timestamp 3. Backend commits changes to Git per batch 4. Backend returns list of applied changes and resolved conflicts 

### Example

```typescript
import {
    SyncApi,
    Configuration,
    ApplySyncChangesRequest
} from 'mujarrad-api-client';

const configuration = new Configuration();
const apiInstance = new SyncApi(configuration);

let spaceId: string; //Space UUID (default to undefined)
let applySyncChangesRequest: ApplySyncChangesRequest; //

const { status, data } = await apiInstance.applySyncChanges(
    spaceId,
    applySyncChangesRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **applySyncChangesRequest** | **ApplySyncChangesRequest**|  | |
| **spaceId** | [**string**] | Space UUID | defaults to undefined|


### Return type

**ApplySyncChanges200Response**

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Changes applied successfully |  -  |
|**400** | Invalid request parameters or payload |  -  |
|**401** | Authentication required or token invalid |  -  |
|**403** | User does not have permission to access resource |  -  |
|**404** | Resource not found |  -  |
|**409** | Unresolvable conflicts detected |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **detectSyncChanges**
> DetectSyncChanges200Response detectSyncChanges(detectSyncChangesRequest)

Compare local vault state with remote space to detect changes.  **Process**: 1. Client sends local file hashes and timestamps 2. Backend compares with NodeVersion history 3. Backend returns list of changes (create, update, delete) in each direction 4. Client reviews conflicts and confirms sync 

### Example

```typescript
import {
    SyncApi,
    Configuration,
    DetectSyncChangesRequest
} from 'mujarrad-api-client';

const configuration = new Configuration();
const apiInstance = new SyncApi(configuration);

let spaceId: string; //Space UUID (default to undefined)
let detectSyncChangesRequest: DetectSyncChangesRequest; //

const { status, data } = await apiInstance.detectSyncChanges(
    spaceId,
    detectSyncChangesRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **detectSyncChangesRequest** | **DetectSyncChangesRequest**|  | |
| **spaceId** | [**string**] | Space UUID | defaults to undefined|


### Return type

**DetectSyncChanges200Response**

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Changes detected |  -  |
|**400** | Invalid request parameters or payload |  -  |
|**401** | Authentication required or token invalid |  -  |
|**403** | User does not have permission to access resource |  -  |
|**404** | Resource not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

