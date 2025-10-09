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
*CloneApi* | [**downloadExport**](docs/CloneApi.md#downloadexport) | **GET** /api/workspaces/{workspaceId}/export/download | Download exported files
*CloneApi* | [**exportWorkspace**](docs/CloneApi.md#exportworkspace) | **POST** /api/workspaces/{workspaceId}/export | Export workspace to Obsidian format
*CloneApi* | [**getExportStatus**](docs/CloneApi.md#getexportstatus) | **GET** /api/workspaces/{workspaceId}/export/status | Check export progress
*SharingApi* | [**shareWorkspace**](docs/SharingApi.md#shareworkspace) | **POST** /api/workspaces/{workspaceId}/share | Share workspace (Future)
*SyncApi* | [**applySyncChanges**](docs/SyncApi.md#applysyncchanges) | **POST** /api/workspaces/{workspaceId}/sync/apply | Apply sync changes
*SyncApi* | [**detectSyncChanges**](docs/SyncApi.md#detectsyncchanges) | **POST** /api/workspaces/{workspaceId}/sync/detect | Detect sync changes
*TemplatesApi* | [**createTemplate**](docs/TemplatesApi.md#createtemplate) | **POST** /api/templates | Create template from workspace
*TemplatesApi* | [**deleteTemplate**](docs/TemplatesApi.md#deletetemplate) | **DELETE** /api/templates/{templateId} | Delete template
*TemplatesApi* | [**getTemplate**](docs/TemplatesApi.md#gettemplate) | **GET** /api/templates/{templateId} | Get template details
*TemplatesApi* | [**instantiateTemplate**](docs/TemplatesApi.md#instantiatetemplate) | **POST** /api/workspaces/{workspaceId}/instantiate | Instantiate workspace from template
*TemplatesApi* | [**listTemplates**](docs/TemplatesApi.md#listtemplates) | **GET** /api/templates | List workspace templates
*UploadApi* | [**getUploadLog**](docs/UploadApi.md#getuploadlog) | **GET** /api/workspaces/{workspaceId}/upload/log | Download upload log
*UploadApi* | [**getUploadStatus**](docs/UploadApi.md#getuploadstatus) | **GET** /api/workspaces/{workspaceId}/upload/status | Check upload progress
*UploadApi* | [**uploadBatch**](docs/UploadApi.md#uploadbatch) | **POST** /api/workspaces/{workspaceId}/upload/batch | Batch upload files to workspace
*VersionHistoryApi* | [**getNodeVersion**](docs/VersionHistoryApi.md#getnodeversion) | **GET** /api/nodes/{nodeId}/versions/{versionId} | Get specific version
*VersionHistoryApi* | [**listNodeVersions**](docs/VersionHistoryApi.md#listnodeversions) | **GET** /api/nodes/{nodeId}/versions | List node version history
*VersionHistoryApi* | [**rollbackNode**](docs/VersionHistoryApi.md#rollbacknode) | **POST** /api/nodes/{nodeId}/rollback | Rollback to previous version
*WorkspacesApi* | [**createWorkspace**](docs/WorkspacesApi.md#createworkspace) | **POST** /api/workspaces | Create new workspace
*WorkspacesApi* | [**deleteWorkspace**](docs/WorkspacesApi.md#deleteworkspace) | **DELETE** /api/workspaces/{workspaceId} | Delete workspace
*WorkspacesApi* | [**getWorkspace**](docs/WorkspacesApi.md#getworkspace) | **GET** /api/workspaces/{workspaceId} | Get workspace by ID
*WorkspacesApi* | [**instantiateTemplate**](docs/WorkspacesApi.md#instantiatetemplate) | **POST** /api/workspaces/{workspaceId}/instantiate | Instantiate workspace from template
*WorkspacesApi* | [**listWorkspaces**](docs/WorkspacesApi.md#listworkspaces) | **GET** /api/workspaces | List all workspaces
*WorkspacesApi* | [**updateWorkspace**](docs/WorkspacesApi.md#updateworkspace) | **PATCH** /api/workspaces/{workspaceId} | Update workspace


### Documentation For Models

 - [ApplySyncChanges200Response](docs/ApplySyncChanges200Response.md)
 - [ApplySyncChangesRequest](docs/ApplySyncChangesRequest.md)
 - [ApplySyncChangesRequestChangesInner](docs/ApplySyncChangesRequestChangesInner.md)
 - [CreateTemplate201Response](docs/CreateTemplate201Response.md)
 - [CreateWorkspace201Response](docs/CreateWorkspace201Response.md)
 - [DetectSyncChanges200Response](docs/DetectSyncChanges200Response.md)
 - [DetectSyncChangesRequest](docs/DetectSyncChangesRequest.md)
 - [DetectSyncChangesRequestLocalFilesInner](docs/DetectSyncChangesRequestLocalFilesInner.md)
 - [ErrorResponse](docs/ErrorResponse.md)
 - [ErrorResponseError](docs/ErrorResponseError.md)
 - [ExportWorkspace202Response](docs/ExportWorkspace202Response.md)
 - [ExportWorkspace202ResponseAllOfData](docs/ExportWorkspace202ResponseAllOfData.md)
 - [ExportWorkspaceRequest](docs/ExportWorkspaceRequest.md)
 - [GetExportStatus200Response](docs/GetExportStatus200Response.md)
 - [GetExportStatus200ResponseAllOfData](docs/GetExportStatus200ResponseAllOfData.md)
 - [GetNodeVersion200Response](docs/GetNodeVersion200Response.md)
 - [InstantiateTemplate200Response](docs/InstantiateTemplate200Response.md)
 - [InstantiateTemplate200ResponseAllOfData](docs/InstantiateTemplate200ResponseAllOfData.md)
 - [ListNodeVersions200Response](docs/ListNodeVersions200Response.md)
 - [ListNodeVersions200ResponseAllOfData](docs/ListNodeVersions200ResponseAllOfData.md)
 - [ListTemplates200Response](docs/ListTemplates200Response.md)
 - [ListTemplates200ResponseAllOfData](docs/ListTemplates200ResponseAllOfData.md)
 - [ListWorkspaces200Response](docs/ListWorkspaces200Response.md)
 - [ListWorkspaces200ResponseAllOfData](docs/ListWorkspaces200ResponseAllOfData.md)
 - [LoginUserRequest](docs/LoginUserRequest.md)
 - [NodeVersionResponse](docs/NodeVersionResponse.md)
 - [NodeVersionResponseGitMetadata](docs/NodeVersionResponseGitMetadata.md)
 - [RegisterUserRequest](docs/RegisterUserRequest.md)
 - [RollbackNode200Response](docs/RollbackNode200Response.md)
 - [RollbackNode200ResponseAllOfData](docs/RollbackNode200ResponseAllOfData.md)
 - [RollbackNodeRequest](docs/RollbackNodeRequest.md)
 - [ShareWorkspaceRequest](docs/ShareWorkspaceRequest.md)
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
 - [WorkspaceCreateRequest](docs/WorkspaceCreateRequest.md)
 - [WorkspaceResponse](docs/WorkspaceResponse.md)
 - [WorkspaceTemplateResponse](docs/WorkspaceTemplateResponse.md)
 - [WorkspaceUpdateRequest](docs/WorkspaceUpdateRequest.md)


<a id="documentation-for-authorization"></a>
## Documentation For Authorization


Authentication schemes defined for the API:
<a id="bearerAuth"></a>
### bearerAuth

- **Type**: Bearer authentication (JWT)

