# AuthenticationApi

All URIs are relative to *https://api.example.com*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**getCurrentUser**](#getcurrentuser) | **GET** /api/auth/me | Get current user|
|[**loginUser**](#loginuser) | **POST** /api/auth/login | User login|
|[**registerUser**](#registeruser) | **POST** /api/auth/register | Register new user|

# **getCurrentUser**
> SuccessResponse getCurrentUser()

Retrieve authenticated user\'s profile information.

### Example

```typescript
import {
    AuthenticationApi,
    Configuration
} from 'mujarrad-api-client';

const configuration = new Configuration();
const apiInstance = new AuthenticationApi(configuration);

const { status, data } = await apiInstance.getCurrentUser();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**SuccessResponse**

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | User profile retrieved |  -  |
|**401** | Authentication required or token invalid |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **loginUser**
> SuccessResponse loginUser(loginUserRequest)

Authenticate user and receive JWT token for subsequent requests.

### Example

```typescript
import {
    AuthenticationApi,
    Configuration,
    LoginUserRequest
} from 'mujarrad-api-client';

const configuration = new Configuration();
const apiInstance = new AuthenticationApi(configuration);

let loginUserRequest: LoginUserRequest; //

const { status, data } = await apiInstance.loginUser(
    loginUserRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **loginUserRequest** | **LoginUserRequest**|  | |


### Return type

**SuccessResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Login successful |  -  |
|**401** | Authentication required or token invalid |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **registerUser**
> SuccessResponse registerUser(registerUserRequest)

Create a new user account with email and password.

### Example

```typescript
import {
    AuthenticationApi,
    Configuration,
    RegisterUserRequest
} from 'mujarrad-api-client';

const configuration = new Configuration();
const apiInstance = new AuthenticationApi(configuration);

let registerUserRequest: RegisterUserRequest; //

const { status, data } = await apiInstance.registerUser(
    registerUserRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **registerUserRequest** | **RegisterUserRequest**|  | |


### Return type

**SuccessResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**201** | User registered successfully |  -  |
|**400** | Invalid request parameters or payload |  -  |
|**409** | Resource already exists or conflict detected |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

