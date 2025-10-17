# TemplatesApi

All URIs are relative to *https://api.example.com*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**createTemplate**](#createtemplate) | **POST** /api/templates | Create template from space|
|[**deleteTemplate**](#deletetemplate) | **DELETE** /api/templates/{templateId} | Delete template|
|[**getTemplate**](#gettemplate) | **GET** /api/templates/{templateId} | Get template details|
|[**instantiateTemplate**](#instantiatetemplate) | **POST** /api/spaces/{spaceId}/instantiate | Instantiate space from template|
|[**listTemplates**](#listtemplates) | **GET** /api/templates | List space templates|

# **createTemplate**
> CreateTemplate201Response createTemplate(templateCreateRequest)

Convert existing space into reusable template with placeholders.

### Example

```typescript
import {
    TemplatesApi,
    Configuration,
    TemplateCreateRequest
} from 'mujarrad-api-client';

const configuration = new Configuration();
const apiInstance = new TemplatesApi(configuration);

let templateCreateRequest: TemplateCreateRequest; //

const { status, data } = await apiInstance.createTemplate(
    templateCreateRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **templateCreateRequest** | **TemplateCreateRequest**|  | |


### Return type

**CreateTemplate201Response**

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**201** | Template created successfully |  -  |
|**400** | Invalid request parameters or payload |  -  |
|**401** | Authentication required or token invalid |  -  |
|**404** | Resource not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **deleteTemplate**
> deleteTemplate()

Delete space template (does not affect spaces created from it).

### Example

```typescript
import {
    TemplatesApi,
    Configuration
} from 'mujarrad-api-client';

const configuration = new Configuration();
const apiInstance = new TemplatesApi(configuration);

let templateId: string; // (default to undefined)

const { status, data } = await apiInstance.deleteTemplate(
    templateId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **templateId** | [**string**] |  | defaults to undefined|


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
|**204** | Template deleted successfully |  -  |
|**401** | Authentication required or token invalid |  -  |
|**403** | User does not have permission to access resource |  -  |
|**404** | Resource not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getTemplate**
> CreateTemplate201Response getTemplate()

Retrieve template structure including context templates.

### Example

```typescript
import {
    TemplatesApi,
    Configuration
} from 'mujarrad-api-client';

const configuration = new Configuration();
const apiInstance = new TemplatesApi(configuration);

let templateId: string; // (default to undefined)

const { status, data } = await apiInstance.getTemplate(
    templateId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **templateId** | [**string**] |  | defaults to undefined|


### Return type

**CreateTemplate201Response**

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Template retrieved successfully |  -  |
|**401** | Authentication required or token invalid |  -  |
|**404** | Resource not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **instantiateTemplate**
> InstantiateTemplate200Response instantiateTemplate(templateInstantiateRequest)

Clone template into existing space, replacing placeholders with values.

### Example

```typescript
import {
    TemplatesApi,
    Configuration,
    TemplateInstantiateRequest
} from 'mujarrad-api-client';

const configuration = new Configuration();
const apiInstance = new TemplatesApi(configuration);

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

# **listTemplates**
> ListTemplates200Response listTemplates()

Retrieve public templates and user\'s private templates.

### Example

```typescript
import {
    TemplatesApi,
    Configuration
} from 'mujarrad-api-client';

const configuration = new Configuration();
const apiInstance = new TemplatesApi(configuration);

let scope: 'all' | 'public' | 'private'; //Filter by visibility (optional) (default to 'all')
let tags: string; //Filter by tags (comma-separated) (optional) (default to undefined)
let page: number; // (optional) (default to 0)
let size: number; // (optional) (default to 20)

const { status, data } = await apiInstance.listTemplates(
    scope,
    tags,
    page,
    size
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **scope** | [**&#39;all&#39; | &#39;public&#39; | &#39;private&#39;**]**Array<&#39;all&#39; &#124; &#39;public&#39; &#124; &#39;private&#39;>** | Filter by visibility | (optional) defaults to 'all'|
| **tags** | [**string**] | Filter by tags (comma-separated) | (optional) defaults to undefined|
| **page** | [**number**] |  | (optional) defaults to 0|
| **size** | [**number**] |  | (optional) defaults to 20|


### Return type

**ListTemplates200Response**

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Templates retrieved successfully |  -  |
|**401** | Authentication required or token invalid |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

