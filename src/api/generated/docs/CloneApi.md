# CloneApi

All URIs are relative to *https://api.example.com*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**downloadExport**](#downloadexport) | **GET** /api/workspaces/{workspaceId}/export/download | Download exported files|
|[**exportWorkspace**](#exportworkspace) | **POST** /api/workspaces/{workspaceId}/export | Export workspace to Obsidian format|
|[**getExportStatus**](#getexportstatus) | **GET** /api/workspaces/{workspaceId}/export/status | Check export progress|

# **downloadExport**
> File downloadExport()

Download workspace exported as ZIP archive.

### Example

```typescript
import {
    CloneApi,
    Configuration
} from 'mujarrad-api-client';

const configuration = new Configuration();
const apiInstance = new CloneApi(configuration);

let workspaceId: string; //Workspace UUID (default to undefined)
let exportJobId: string; // (default to undefined)

const { status, data } = await apiInstance.downloadExport(
    workspaceId,
    exportJobId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **workspaceId** | [**string**] | Workspace UUID | defaults to undefined|
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

# **exportWorkspace**
> ExportWorkspace202Response exportWorkspace(exportWorkspaceRequest)

Clone Mujarrad workspace to Obsidian vault format.  **Process**: 1. Client requests export 2. Backend creates export job 3. Backend generates .md files, .canvas files, folder structure 4. Backend creates `.mujarrad/mappings.json` centralized mapping file 5. Client polls `/export/status` for progress 6. Client downloads exported files in batches  **Performance Target**: 1000 nodes in <3 minutes (NFR-002) 

### Example

```typescript
import {
    CloneApi,
    Configuration,
    ExportWorkspaceRequest
} from 'mujarrad-api-client';

const configuration = new Configuration();
const apiInstance = new CloneApi(configuration);

let workspaceId: string; //Workspace UUID (default to undefined)
let exportWorkspaceRequest: ExportWorkspaceRequest; //

const { status, data } = await apiInstance.exportWorkspace(
    workspaceId,
    exportWorkspaceRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **exportWorkspaceRequest** | **ExportWorkspaceRequest**|  | |
| **workspaceId** | [**string**] | Workspace UUID | defaults to undefined|


### Return type

**ExportWorkspace202Response**

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

let workspaceId: string; //Workspace UUID (default to undefined)
let exportJobId: string; // (default to undefined)

const { status, data } = await apiInstance.getExportStatus(
    workspaceId,
    exportJobId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **workspaceId** | [**string**] | Workspace UUID | defaults to undefined|
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

