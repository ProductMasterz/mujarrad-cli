# SpacesApi

All URIs are relative to *https://api.example.com*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**createSpace**](#createspace) | **POST** /api/spaces | Create new space|
|[**deleteSpace**](#deletespace) | **DELETE** /api/spaces/{spaceId} | Delete space|
|[**getSpace**](#getspace) | **GET** /api/spaces/{spaceId} | Get space by ID|
|[**instantiateTemplate**](#instantiatetemplate) | **POST** /api/spaces/{spaceId}/instantiate | Instantiate space from template|
|[**listSpaces**](#listspaces) | **GET** /api/spaces | List all spaces|
|[**updateSpace**](#updatespace) | **PATCH** /api/spaces/{spaceId} | Update space|

# **createSpace**
> CreateSpace201Response createSpace(spaceCreateRequest)

Create empty space or from template.

### Example

```typescript
import {
    SpacesApi,
    Configuration,
    SpaceCreateRequest
} from 'mujarrad-api-client';

const configuration = new Configuration();
const apiInstance = new SpacesApi(configuration);

let spaceCreateRequest: SpaceCreateRequest; //

const { status, data } = await apiInstance.createSpace(
    spaceCreateRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **spaceCreateRequest** | **SpaceCreateRequest**|  | |


### Return type

**CreateSpace201Response**

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**201** | Space created successfully |  -  |
|**400** | Invalid request parameters or payload |  -  |
|**401** | Authentication required or token invalid |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **deleteSpace**
> deleteSpace()

Soft delete space and all contained nodes, attributes, mappings.

### Example

```typescript
import {
    SpacesApi,
    Configuration
} from 'mujarrad-api-client';

const configuration = new Configuration();
const apiInstance = new SpacesApi(configuration);

let spaceId: string; //Space UUID (default to undefined)

const { status, data } = await apiInstance.deleteSpace(
    spaceId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **spaceId** | [**string**] | Space UUID | defaults to undefined|


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
|**204** | Space deleted successfully |  -  |
|**401** | Authentication required or token invalid |  -  |
|**403** | User does not have permission to access resource |  -  |
|**404** | Resource not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getSpace**
> CreateSpace201Response getSpace()

Retrieve space details including node count and Git status.

### Example

```typescript
import {
    SpacesApi,
    Configuration
} from 'mujarrad-api-client';

const configuration = new Configuration();
const apiInstance = new SpacesApi(configuration);

let spaceId: string; //Space UUID (default to undefined)

const { status, data } = await apiInstance.getSpace(
    spaceId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **spaceId** | [**string**] | Space UUID | defaults to undefined|


### Return type

**CreateSpace201Response**

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Space retrieved successfully |  -  |
|**401** | Authentication required or token invalid |  -  |
|**403** | User does not have permission to access resource |  -  |
|**404** | Resource not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **instantiateTemplate**
> InstantiateTemplate200Response instantiateTemplate(templateInstantiateRequest)

Clone template into existing space, replacing placeholders with values.

### Example

```typescript
import {
    SpacesApi,
    Configuration,
    TemplateInstantiateRequest
} from 'mujarrad-api-client';

const configuration = new Configuration();
const apiInstance = new SpacesApi(configuration);

let spaceId: string; //Space UUID (default to undefined)
let templateInstantiateRequest: TemplateInstantiateRequest; //

const { status, data } = await apiInstance.instantiateTemplate(
    spaceId,
    templateInstantiateRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **templateInstantiateRequest** | **TemplateInstantiateRequest**|  | |
| **spaceId** | [**string**] | Space UUID | defaults to undefined|


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

# **listSpaces**
> ListSpaces200Response listSpaces()

Retrieve all spaces owned by authenticated user (excludes soft-deleted).

### Example

```typescript
import {
    SpacesApi,
    Configuration
} from 'mujarrad-api-client';

const configuration = new Configuration();
const apiInstance = new SpacesApi(configuration);

let page: number; //Page number (0-indexed) (optional) (default to 0)
let size: number; //Page size (optional) (default to 20)
let sort: 'createdAt' | 'asc' | 'createdAt' | 'desc' | 'updatedAt' | 'asc' | 'updatedAt' | 'desc' | 'title' | 'asc' | 'title' | 'desc'; //Sort field and direction (optional) (default to 'createdAt,desc')

const { status, data } = await apiInstance.listSpaces(
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

**ListSpaces200Response**

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Spaces retrieved successfully |  -  |
|**401** | Authentication required or token invalid |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **updateSpace**
> CreateSpace201Response updateSpace(spaceUpdateRequest)

Update space title, description, or Git configuration.

### Example

```typescript
import {
    SpacesApi,
    Configuration,
    SpaceUpdateRequest
} from 'mujarrad-api-client';

const configuration = new Configuration();
const apiInstance = new SpacesApi(configuration);

let spaceId: string; //Space UUID (default to undefined)
let spaceUpdateRequest: SpaceUpdateRequest; //

const { status, data } = await apiInstance.updateSpace(
    spaceId,
    spaceUpdateRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **spaceUpdateRequest** | **SpaceUpdateRequest**|  | |
| **spaceId** | [**string**] | Space UUID | defaults to undefined|


### Return type

**CreateSpace201Response**

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Space updated successfully |  -  |
|**400** | Invalid request parameters or payload |  -  |
|**401** | Authentication required or token invalid |  -  |
|**403** | User does not have permission to access resource |  -  |
|**404** | Resource not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

