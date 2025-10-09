# WorkspacesApi

All URIs are relative to *https://api.example.com*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**createWorkspace**](#createworkspace) | **POST** /api/workspaces | Create new workspace|
|[**deleteWorkspace**](#deleteworkspace) | **DELETE** /api/workspaces/{workspaceId} | Delete workspace|
|[**getWorkspace**](#getworkspace) | **GET** /api/workspaces/{workspaceId} | Get workspace by ID|
|[**instantiateTemplate**](#instantiatetemplate) | **POST** /api/workspaces/{workspaceId}/instantiate | Instantiate workspace from template|
|[**listWorkspaces**](#listworkspaces) | **GET** /api/workspaces | List all workspaces|
|[**updateWorkspace**](#updateworkspace) | **PATCH** /api/workspaces/{workspaceId} | Update workspace|

# **createWorkspace**
> CreateWorkspace201Response createWorkspace(workspaceCreateRequest)

Create empty workspace or from template.

### Example

```typescript
import {
    WorkspacesApi,
    Configuration,
    WorkspaceCreateRequest
} from 'mujarrad-api-client';

const configuration = new Configuration();
const apiInstance = new WorkspacesApi(configuration);

let workspaceCreateRequest: WorkspaceCreateRequest; //

const { status, data } = await apiInstance.createWorkspace(
    workspaceCreateRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **workspaceCreateRequest** | **WorkspaceCreateRequest**|  | |


### Return type

**CreateWorkspace201Response**

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**201** | Workspace created successfully |  -  |
|**400** | Invalid request parameters or payload |  -  |
|**401** | Authentication required or token invalid |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **deleteWorkspace**
> deleteWorkspace()

Soft delete workspace and all contained nodes, attributes, mappings.

### Example

```typescript
import {
    WorkspacesApi,
    Configuration
} from 'mujarrad-api-client';

const configuration = new Configuration();
const apiInstance = new WorkspacesApi(configuration);

let workspaceId: string; //Workspace UUID (default to undefined)

const { status, data } = await apiInstance.deleteWorkspace(
    workspaceId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **workspaceId** | [**string**] | Workspace UUID | defaults to undefined|


### Return type

void (empty response body)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**204** | Workspace deleted successfully |  -  |
|**401** | Authentication required or token invalid |  -  |
|**403** | User does not have permission to access resource |  -  |
|**404** | Resource not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getWorkspace**
> CreateWorkspace201Response getWorkspace()

Retrieve workspace details including node count and Git status.

### Example

```typescript
import {
    WorkspacesApi,
    Configuration
} from 'mujarrad-api-client';

const configuration = new Configuration();
const apiInstance = new WorkspacesApi(configuration);

let workspaceId: string; //Workspace UUID (default to undefined)

const { status, data } = await apiInstance.getWorkspace(
    workspaceId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **workspaceId** | [**string**] | Workspace UUID | defaults to undefined|


### Return type

**CreateWorkspace201Response**

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Workspace retrieved successfully |  -  |
|**401** | Authentication required or token invalid |  -  |
|**403** | User does not have permission to access resource |  -  |
|**404** | Resource not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **instantiateTemplate**
> InstantiateTemplate200Response instantiateTemplate(templateInstantiateRequest)

Clone template into existing workspace, replacing placeholders with values.

### Example

```typescript
import {
    WorkspacesApi,
    Configuration,
    TemplateInstantiateRequest
} from 'mujarrad-api-client';

const configuration = new Configuration();
const apiInstance = new WorkspacesApi(configuration);

let workspaceId: string; //Workspace UUID (default to undefined)
let templateInstantiateRequest: TemplateInstantiateRequest; //

const { status, data } = await apiInstance.instantiateTemplate(
    workspaceId,
    templateInstantiateRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **templateInstantiateRequest** | **TemplateInstantiateRequest**|  | |
| **workspaceId** | [**string**] | Workspace UUID | defaults to undefined|


### Return type

**InstantiateTemplate200Response**

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Template instantiated successfully |  -  |
|**400** | Invalid request parameters or payload |  -  |
|**401** | Authentication required or token invalid |  -  |
|**403** | User does not have permission to access resource |  -  |
|**404** | Resource not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **listWorkspaces**
> ListWorkspaces200Response listWorkspaces()

Retrieve all workspaces owned by authenticated user (excludes soft-deleted).

### Example

```typescript
import {
    WorkspacesApi,
    Configuration
} from 'mujarrad-api-client';

const configuration = new Configuration();
const apiInstance = new WorkspacesApi(configuration);

let page: number; //Page number (0-indexed) (optional) (default to 0)
let size: number; //Page size (optional) (default to 20)
let sort: 'createdAt' | 'asc' | 'createdAt' | 'desc' | 'updatedAt' | 'asc' | 'updatedAt' | 'desc' | 'title' | 'asc' | 'title' | 'desc'; //Sort field and direction (optional) (default to 'createdAt,desc')

const { status, data } = await apiInstance.listWorkspaces(
    page,
    size,
    sort
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **page** | [**number**] | Page number (0-indexed) | (optional) defaults to 0|
| **size** | [**number**] | Page size | (optional) defaults to 20|
| **sort** | [**&#39;createdAt&#39; | &#39;asc&#39; | &#39;createdAt&#39; | &#39;desc&#39; | &#39;updatedAt&#39; | &#39;asc&#39; | &#39;updatedAt&#39; | &#39;desc&#39; | &#39;title&#39; | &#39;asc&#39; | &#39;title&#39; | &#39;desc&#39;**]**Array<&#39;createdAt&#39; &#124; &#39;asc&#39; &#124; &#39;createdAt&#39; &#124; &#39;desc&#39; &#124; &#39;updatedAt&#39; &#124; &#39;asc&#39; &#124; &#39;updatedAt&#39; &#124; &#39;desc&#39; &#124; &#39;title&#39; &#124; &#39;asc&#39; &#124; &#39;title&#39; &#124; &#39;desc&#39;>** | Sort field and direction | (optional) defaults to 'createdAt,desc'|


### Return type

**ListWorkspaces200Response**

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Workspaces retrieved successfully |  -  |
|**401** | Authentication required or token invalid |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **updateWorkspace**
> CreateWorkspace201Response updateWorkspace(workspaceUpdateRequest)

Update workspace title, description, or Git configuration.

### Example

```typescript
import {
    WorkspacesApi,
    Configuration,
    WorkspaceUpdateRequest
} from 'mujarrad-api-client';

const configuration = new Configuration();
const apiInstance = new WorkspacesApi(configuration);

let workspaceId: string; //Workspace UUID (default to undefined)
let workspaceUpdateRequest: WorkspaceUpdateRequest; //

const { status, data } = await apiInstance.updateWorkspace(
    workspaceId,
    workspaceUpdateRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **workspaceUpdateRequest** | **WorkspaceUpdateRequest**|  | |
| **workspaceId** | [**string**] | Workspace UUID | defaults to undefined|


### Return type

**CreateWorkspace201Response**

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Workspace updated successfully |  -  |
|**400** | Invalid request parameters or payload |  -  |
|**401** | Authentication required or token invalid |  -  |
|**403** | User does not have permission to access resource |  -  |
|**404** | Resource not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

