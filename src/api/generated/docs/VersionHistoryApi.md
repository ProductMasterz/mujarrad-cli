# VersionHistoryApi

All URIs are relative to *https://api.example.com*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**getNodeVersion**](#getnodeversion) | **GET** /api/nodes/{nodeId}/versions/{versionId} | Get specific version|
|[**listNodeVersions**](#listnodeversions) | **GET** /api/nodes/{nodeId}/versions | List node version history|
|[**rollbackNode**](#rollbacknode) | **POST** /api/nodes/{nodeId}/rollback | Rollback to previous version|

# **getNodeVersion**
> GetNodeVersion200Response getNodeVersion()

Retrieve content snapshot of node at specific version.

### Example

```typescript
import {
    VersionHistoryApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new VersionHistoryApi(configuration);

let nodeId: string; // (default to undefined)
let versionId: string; // (default to undefined)

const { status, data } = await apiInstance.getNodeVersion(
    nodeId,
    versionId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **nodeId** | [**string**] |  | defaults to undefined|
| **versionId** | [**string**] |  | defaults to undefined|


### Return type

**GetNodeVersion200Response**

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Version retrieved |  -  |
|**401** | Authentication required or token invalid |  -  |
|**403** | User does not have permission to access resource |  -  |
|**404** | Resource not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **listNodeVersions**
> ListNodeVersions200Response listNodeVersions()

Retrieve Git commit history for a specific node.

### Example

```typescript
import {
    VersionHistoryApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new VersionHistoryApi(configuration);

let nodeId: string; // (default to undefined)
let page: number; // (optional) (default to 0)
let size: number; // (optional) (default to 20)

const { status, data } = await apiInstance.listNodeVersions(
    nodeId,
    page,
    size
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **nodeId** | [**string**] |  | defaults to undefined|
| **page** | [**number**] |  | (optional) defaults to 0|
| **size** | [**number**] |  | (optional) defaults to 20|


### Return type

**ListNodeVersions200Response**

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Version history retrieved |  -  |
|**401** | Authentication required or token invalid |  -  |
|**403** | User does not have permission to access resource |  -  |
|**404** | Resource not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **rollbackNode**
> RollbackNode200Response rollbackNode(rollbackNodeRequest)

Restore node content to specific version and create new version record.

### Example

```typescript
import {
    VersionHistoryApi,
    Configuration,
    RollbackNodeRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new VersionHistoryApi(configuration);

let nodeId: string; // (default to undefined)
let rollbackNodeRequest: RollbackNodeRequest; //

const { status, data } = await apiInstance.rollbackNode(
    nodeId,
    rollbackNodeRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **rollbackNodeRequest** | **RollbackNodeRequest**|  | |
| **nodeId** | [**string**] |  | defaults to undefined|


### Return type

**RollbackNode200Response**

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Rollback successful |  -  |
|**400** | Invalid request parameters or payload |  -  |
|**401** | Authentication required or token invalid |  -  |
|**403** | User does not have permission to access resource |  -  |
|**404** | Resource not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

