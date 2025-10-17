# CloneApi

All URIs are relative to *https://api.example.com*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**downloadExport**](#downloadexport) | **GET** /api/spaces/{spaceId}/export/download | Download exported files|
|[**exportSpace**](#exportspace) | **POST** /api/spaces/{spaceId}/export | Export space to Obsidian format|
|[**getExportStatus**](#getexportstatus) | **GET** /api/spaces/{spaceId}/export/status | Check export progress|

# **downloadExport**
> File downloadExport()

Download space exported as ZIP archive.

### Example

```typescript
import {
    CloneApi,
    Configuration
} from 'mujarrad-api-client';

const configuration = new Configuration();
const apiInstance = new CloneApi(configuration);

let spaceId: string; //Space UUID (default to undefined)
let exportJobId: string; // (default to undefined)

const { status, data } = await apiInstance.downloadExport(
    spaceId,
    exportJobId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **spaceId** | [**string**] | Space UUID | defaults to undefined|
| **exportJobId** | [**string**] |  | defaults to undefined|


### Return type

**File**

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/zip, application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | ZIP file downloaded |  -  |
|**401** | Authentication required or token invalid |  -  |
|**403** | User does not have permission to access resource |  -  |
|**404** | Resource not found |  -  |
|**409** | Export not yet completed |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **exportSpace**
> ExportSpace202Response exportSpace(exportSpaceRequest)

Clone Mujarrad space to Obsidian vault format.  **Process**: 1. Client requests export 2. Backend creates export job 3. Backend generates .md files, .canvas files, folder structure 4. Backend creates `.mujarrad/mappings.json` centralized mapping file 5. Client polls `/export/status` for progress 6. Client downloads exported files in batches  **Performance Target**: 1000 nodes in <3 minutes (NFR-002) 

### Example

```typescript
import {
    CloneApi,
    Configuration,
    ExportSpaceRequest
} from 'mujarrad-api-client';

const configuration = new Configuration();
const apiInstance = new CloneApi(configuration);

let spaceId: string; //Space UUID (default to undefined)
let exportSpaceRequest: ExportSpaceRequest; //

const { status, data } = await apiInstance.exportSpace(
    spaceId,
    exportSpaceRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **exportSpaceRequest** | **ExportSpaceRequest**|  | |
| **spaceId** | [**string**] | Space UUID | defaults to undefined|


### Return type

**ExportSpace202Response**

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**202** | Export job created |  -  |
|**401** | Authentication required or token invalid |  -  |
|**403** | User does not have permission to access resource |  -  |
|**404** | Resource not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getExportStatus**
> GetExportStatus200Response getExportStatus()

Retrieve status of ongoing export job.

### Example

```typescript
import {
    CloneApi,
    Configuration
} from 'mujarrad-api-client';

const configuration = new Configuration();
const apiInstance = new CloneApi(configuration);

let spaceId: string; //Space UUID (default to undefined)
let exportJobId: string; // (default to undefined)

const { status, data } = await apiInstance.getExportStatus(
    spaceId,
    exportJobId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **spaceId** | [**string**] | Space UUID | defaults to undefined|
| **exportJobId** | [**string**] |  | defaults to undefined|


### Return type

**GetExportStatus200Response**

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Export status retrieved |  -  |
|**401** | Authentication required or token invalid |  -  |
|**403** | User does not have permission to access resource |  -  |
|**404** | Resource not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

