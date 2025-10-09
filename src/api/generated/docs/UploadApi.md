# UploadApi

All URIs are relative to *https://api.example.com*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**getUploadLog**](#getuploadlog) | **GET** /api/workspaces/{workspaceId}/upload/log | Download upload log|
|[**getUploadStatus**](#getuploadstatus) | **GET** /api/workspaces/{workspaceId}/upload/status | Check upload progress|
|[**uploadBatch**](#uploadbatch) | **POST** /api/workspaces/{workspaceId}/upload/batch | Batch upload files to workspace|

# **getUploadLog**
> File getUploadLog()

Retrieve detailed log file for upload session (JSON Lines format).

### Example

```typescript
import {
    UploadApi,
    Configuration
} from 'mujarrad-api-client';

const configuration = new Configuration();
const apiInstance = new UploadApi(configuration);

let workspaceId: string; //Workspace UUID (default to undefined)
let sessionId: string; // (default to undefined)

const { status, data } = await apiInstance.getUploadLog(
    workspaceId,
    sessionId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **workspaceId** | [**string**] | Workspace UUID | defaults to undefined|
| **sessionId** | [**string**] |  | defaults to undefined|


### Return type

**File**

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/x-ndjson, application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Log file retrieved |  -  |
|**401** | Authentication required or token invalid |  -  |
|**403** | User does not have permission to access resource |  -  |
|**404** | Resource not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getUploadStatus**
> UploadBatch202Response getUploadStatus()

Retrieve status of ongoing or completed upload session.

### Example

```typescript
import {
    UploadApi,
    Configuration
} from 'mujarrad-api-client';

const configuration = new Configuration();
const apiInstance = new UploadApi(configuration);

let workspaceId: string; //Workspace UUID (default to undefined)
let sessionId: string; //Upload session ID (default to undefined)

const { status, data } = await apiInstance.getUploadStatus(
    workspaceId,
    sessionId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **workspaceId** | [**string**] | Workspace UUID | defaults to undefined|
| **sessionId** | [**string**] | Upload session ID | defaults to undefined|


### Return type

**UploadBatch202Response**

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Upload status retrieved |  -  |
|**401** | Authentication required or token invalid |  -  |
|**403** | User does not have permission to access resource |  -  |
|**404** | Resource not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **uploadBatch**
> UploadBatch202Response uploadBatch()

Upload multiple Obsidian files (notes, canvases) to workspace in batches.  **Process**: 1. Client sends batch of files (max 100 files per request) 2. Backend creates UploadSession to track progress 3. Backend processes files, creates Nodes/Attributes/Mappings 4. Backend commits batch to Git (one commit per batch) 5. Client polls `/upload/status` for progress 6. On failure, client resumes from last successful batch using log  **Performance Target**: 1000 files in <5 minutes (NFR-001) 

### Example

```typescript
import {
    UploadApi,
    Configuration
} from 'mujarrad-api-client';

const configuration = new Configuration();
const apiInstance = new UploadApi(configuration);

let workspaceId: string; //Workspace UUID (default to undefined)
let files: Array<File>; //Array of Obsidian files (.md, .canvas) (default to undefined)
let batchNumber: number; //Batch sequence number (for resume capability) (optional) (default to undefined)
let sessionId: string; //Upload session ID (for continuing previous upload) (optional) (default to undefined)
let commitMessage: string; //Git commit message for this batch (optional) (default to undefined)

const { status, data } = await apiInstance.uploadBatch(
    workspaceId,
    files,
    batchNumber,
    sessionId,
    commitMessage
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **workspaceId** | [**string**] | Workspace UUID | defaults to undefined|
| **files** | **Array&lt;File&gt;** | Array of Obsidian files (.md, .canvas) | defaults to undefined|
| **batchNumber** | [**number**] | Batch sequence number (for resume capability) | (optional) defaults to undefined|
| **sessionId** | [**string**] | Upload session ID (for continuing previous upload) | (optional) defaults to undefined|
| **commitMessage** | [**string**] | Git commit message for this batch | (optional) defaults to undefined|


### Return type

**UploadBatch202Response**

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: multipart/form-data
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**202** | Batch upload accepted and processing |  -  |
|**400** | Invalid request parameters or payload |  -  |
|**401** | Authentication required or token invalid |  -  |
|**403** | User does not have permission to access resource |  -  |
|**404** | Resource not found |  -  |
|**413** | Payload too large (&gt;100 files) |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

