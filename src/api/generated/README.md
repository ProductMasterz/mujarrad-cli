## mujarrad-api-client@1.0.0

This generator creates TypeScript/JavaScript client that utilizes [axios](https://github.com/axios/axios). The generated Node module can be used in the following environments:

Environment
* Node.js
* Webpack
* Browserify

Language level
* ES5 - you must have a Promises/A+ library installed
* ES6

Module system
* CommonJS
* ES6 module system

It can be used in both TypeScript and JavaScript. In TypeScript, the definition will be automatically resolved via `package.json`. ([Reference](https://www.typescriptlang.org/docs/handbook/declaration-files/consumption.html))

### Building

To build and compile the typescript sources to javascript use:
```
npm install
npm run build
```

### Publishing

First build the package then run `npm publish`

### Consuming

navigate to the folder of your consuming project and run one of the following commands.

_published:_

```
npm install mujarrad-api-client@1.0.0 --save
```

_unPublished (not recommended):_

```
npm install PATH_TO_GENERATED_PACKAGE --save
```

### Documentation for API Endpoints

All URIs are relative to *https://api.example.com*

Class | Method | HTTP request | Description
------------ | ------------- | ------------- | -------------
*AuthenticationApi* | [**getCurrentUser**](docs/AuthenticationApi.md#getcurrentuser) | **GET** /api/auth/me | Get current user
*AuthenticationApi* | [**loginUser**](docs/AuthenticationApi.md#loginuser) | **POST** /api/auth/login | User login
*AuthenticationApi* | [**registerUser**](docs/AuthenticationApi.md#registeruser) | **POST** /api/auth/register | Register new user
*CloneApi* | [**downloadExport**](docs/CloneApi.md#downloadexport) | **GET** /api/spaces/{spaceId}/export/download | Download exported files
*CloneApi* | [**exportSpace**](docs/CloneApi.md#exportspace) | **POST** /api/spaces/{spaceId}/export | Export space to Obsidian format
*CloneApi* | [**getExportStatus**](docs/CloneApi.md#getexportstatus) | **GET** /api/spaces/{spaceId}/export/status | Check export progress
*SharingApi* | [**shareSpace**](docs/SharingApi.md#sharespace) | **POST** /api/spaces/{spaceId}/share | Share space (Future)
*SyncApi* | [**applySyncChanges**](docs/SyncApi.md#applysyncchanges) | **POST** /api/spaces/{spaceId}/sync/apply | Apply sync changes
*SyncApi* | [**detectSyncChanges**](docs/SyncApi.md#detectsyncchanges) | **POST** /api/spaces/{spaceId}/sync/detect | Detect sync changes
*TemplatesApi* | [**createTemplate**](docs/TemplatesApi.md#createtemplate) | **POST** /api/templates | Create template from space
*TemplatesApi* | [**deleteTemplate**](docs/TemplatesApi.md#deletetemplate) | **DELETE** /api/templates/{templateId} | Delete template
*TemplatesApi* | [**getTemplate**](docs/TemplatesApi.md#gettemplate) | **GET** /api/templates/{templateId} | Get template details
*TemplatesApi* | [**instantiateTemplate**](docs/TemplatesApi.md#instantiatetemplate) | **POST** /api/spaces/{spaceId}/instantiate | Instantiate space from template
*TemplatesApi* | [**listTemplates**](docs/TemplatesApi.md#listtemplates) | **GET** /api/templates | List space templates
*UploadApi* | [**getUploadLog**](docs/UploadApi.md#getuploadlog) | **GET** /api/spaces/{spaceId}/upload/log | Download upload log
*UploadApi* | [**getUploadStatus**](docs/UploadApi.md#getuploadstatus) | **GET** /api/spaces/{spaceId}/upload/status | Check upload progress
*UploadApi* | [**uploadBatch**](docs/UploadApi.md#uploadbatch) | **POST** /api/spaces/{spaceId}/upload/batch | Batch upload files to space
*VersionHistoryApi* | [**getNodeVersion**](docs/VersionHistoryApi.md#getnodeversion) | **GET** /api/nodes/{nodeId}/versions/{versionId} | Get specific version
*VersionHistoryApi* | [**listNodeVersions**](docs/VersionHistoryApi.md#listnodeversions) | **GET** /api/nodes/{nodeId}/versions | List node version history
*VersionHistoryApi* | [**rollbackNode**](docs/VersionHistoryApi.md#rollbacknode) | **POST** /api/nodes/{nodeId}/rollback | Rollback to previous version
*SpacesApi* | [**createSpace**](docs/SpacesApi.md#createspace) | **POST** /api/spaces | Create new space
*SpacesApi* | [**deleteSpace**](docs/SpacesApi.md#deletespace) | **DELETE** /api/spaces/{spaceId} | Delete space
*SpacesApi* | [**getSpace**](docs/SpacesApi.md#getspace) | **GET** /api/spaces/{spaceId} | Get space by ID
*SpacesApi* | [**instantiateTemplate**](docs/SpacesApi.md#instantiatetemplate) | **POST** /api/spaces/{spaceId}/instantiate | Instantiate space from template
*SpacesApi* | [**listSpaces**](docs/SpacesApi.md#listspaces) | **GET** /api/spaces | List all spaces
*SpacesApi* | [**updateSpace**](docs/SpacesApi.md#updatespace) | **PATCH** /api/spaces/{spaceId} | Update space


### Documentation For Models

 - [ApplySyncChanges200Response](docs/ApplySyncChanges200Response.md)
 - [ApplySyncChangesRequest](docs/ApplySyncChangesRequest.md)
 - [ApplySyncChangesRequestChangesInner](docs/ApplySyncChangesRequestChangesInner.md)
 - [CreateTemplate201Response](docs/CreateTemplate201Response.md)
 - [CreateSpace201Response](docs/CreateSpace201Response.md)
 - [DetectSyncChanges200Response](docs/DetectSyncChanges200Response.md)
 - [DetectSyncChangesRequest](docs/DetectSyncChangesRequest.md)
 - [DetectSyncChangesRequestLocalFilesInner](docs/DetectSyncChangesRequestLocalFilesInner.md)
 - [ErrorResponse](docs/ErrorResponse.md)
 - [ErrorResponseError](docs/ErrorResponseError.md)
 - [ExportSpace202Response](docs/ExportSpace202Response.md)
 - [ExportSpace202ResponseAllOfData](docs/ExportSpace202ResponseAllOfData.md)
 - [ExportSpaceRequest](docs/ExportSpaceRequest.md)
 - [GetExportStatus200Response](docs/GetExportStatus200Response.md)
 - [GetExportStatus200ResponseAllOfData](docs/GetExportStatus200ResponseAllOfData.md)
 - [GetNodeVersion200Response](docs/GetNodeVersion200Response.md)
 - [InstantiateTemplate200Response](docs/InstantiateTemplate200Response.md)
 - [InstantiateTemplate200ResponseAllOfData](docs/InstantiateTemplate200ResponseAllOfData.md)
 - [ListNodeVersions200Response](docs/ListNodeVersions200Response.md)
 - [ListNodeVersions200ResponseAllOfData](docs/ListNodeVersions200ResponseAllOfData.md)
 - [ListTemplates200Response](docs/ListTemplates200Response.md)
 - [ListTemplates200ResponseAllOfData](docs/ListTemplates200ResponseAllOfData.md)
 - [ListSpaces200Response](docs/ListSpaces200Response.md)
 - [ListSpaces200ResponseAllOfData](docs/ListSpaces200ResponseAllOfData.md)
 - [LoginUserRequest](docs/LoginUserRequest.md)
 - [NodeVersionResponse](docs/NodeVersionResponse.md)
 - [NodeVersionResponseGitMetadata](docs/NodeVersionResponseGitMetadata.md)
 - [RegisterUserRequest](docs/RegisterUserRequest.md)
 - [RollbackNode200Response](docs/RollbackNode200Response.md)
 - [RollbackNode200ResponseAllOfData](docs/RollbackNode200ResponseAllOfData.md)
 - [RollbackNodeRequest](docs/RollbackNodeRequest.md)
 - [ShareSpaceRequest](docs/ShareSpaceRequest.md)
 - [SuccessResponse](docs/SuccessResponse.md)
 - [SyncChangesResponse](docs/SyncChangesResponse.md)
 - [SyncChangesResponseConflictsInner](docs/SyncChangesResponseConflictsInner.md)
 - [SyncChangesResponseLocalChangesInner](docs/SyncChangesResponseLocalChangesInner.md)
 - [SyncChangesResponseRemoteChangesInner](docs/SyncChangesResponseRemoteChangesInner.md)
 - [SyncSessionResponse](docs/SyncSessionResponse.md)
 - [SyncSessionResponseConflictDetailsInner](docs/SyncSessionResponseConflictDetailsInner.md)
 - [TemplateCreateRequest](docs/TemplateCreateRequest.md)
 - [TemplateInstantiateRequest](docs/TemplateInstantiateRequest.md)
 - [UploadBatch202Response](docs/UploadBatch202Response.md)
 - [UploadSessionResponse](docs/UploadSessionResponse.md)
 - [SpaceCreateRequest](docs/SpaceCreateRequest.md)
 - [SpaceResponse](docs/SpaceResponse.md)
 - [SpaceTemplateResponse](docs/SpaceTemplateResponse.md)
 - [SpaceUpdateRequest](docs/SpaceUpdateRequest.md)


<a id="documentation-for-authorization"></a>
## Documentation For Authorization


Authentication schemes defined for the API:
<a id="bearerAuth"></a>
### bearerAuth

- **Type**: Bearer authentication (JWT)

