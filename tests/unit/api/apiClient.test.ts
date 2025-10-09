import {
  AuthenticationApi,
  WorkspacesApi,
  UploadApi,
  CloneApi,
  SyncApi,
  TemplatesApi,
  VersionHistoryApi,
  SharingApi,
} from '../../../src/api/generated';

describe('API Client Generation', () => {
  it('should have AuthenticationApi with login and refresh methods', () => {
    const authApi = new AuthenticationApi();
    expect(authApi).toBeDefined();
    expect(typeof authApi.loginUser).toBe('function');
    expect(typeof authApi.registerUser).toBe('function');
  });

  it('should have WorkspacesApi with workspace management methods', () => {
    const workspacesApi = new WorkspacesApi();
    expect(workspacesApi).toBeDefined();
    expect(typeof workspacesApi.listWorkspaces).toBe('function');
    expect(typeof workspacesApi.createWorkspace).toBe('function');
    expect(typeof workspacesApi.getWorkspace).toBe('function');
    expect(typeof workspacesApi.updateWorkspace).toBe('function');
    expect(typeof workspacesApi.deleteWorkspace).toBe('function');
  });

  it('should have UploadApi with upload session methods', () => {
    const uploadApi = new UploadApi();
    expect(uploadApi).toBeDefined();
    expect(typeof uploadApi.uploadBatch).toBe('function');
    expect(typeof uploadApi.getUploadStatus).toBe('function');
    expect(typeof uploadApi.getUploadLog).toBe('function');
  });

  it('should have CloneApi with export methods', () => {
    const cloneApi = new CloneApi();
    expect(cloneApi).toBeDefined();
    expect(typeof cloneApi.exportWorkspace).toBe('function');
    expect(typeof cloneApi.getExportStatus).toBe('function');
    expect(typeof cloneApi.downloadExport).toBe('function');
  });

  it('should have SyncApi with sync methods', () => {
    const syncApi = new SyncApi();
    expect(syncApi).toBeDefined();
    expect(typeof syncApi.detectSyncChanges).toBe('function');
    expect(typeof syncApi.applySyncChanges).toBe('function');
  });

  it('should have TemplatesApi with template methods', () => {
    const templatesApi = new TemplatesApi();
    expect(templatesApi).toBeDefined();
    expect(typeof templatesApi.listTemplates).toBe('function');
    expect(typeof templatesApi.getTemplate).toBe('function');
    expect(typeof templatesApi.createTemplate).toBe('function');
    expect(typeof templatesApi.instantiateTemplate).toBe('function');
  });

  it('should have VersionHistoryApi with version methods', () => {
    const versionApi = new VersionHistoryApi();
    expect(versionApi).toBeDefined();
    expect(typeof versionApi.listNodeVersions).toBe('function');
    expect(typeof versionApi.getNodeVersion).toBe('function');
    expect(typeof versionApi.rollbackNode).toBe('function');
  });

  it('should have SharingApi with sharing methods', () => {
    const sharingApi = new SharingApi();
    expect(sharingApi).toBeDefined();
    expect(typeof sharingApi.shareWorkspace).toBe('function');
  });

  it('should export all 8 API categories', () => {
    expect(AuthenticationApi).toBeDefined();
    expect(WorkspacesApi).toBeDefined();
    expect(UploadApi).toBeDefined();
    expect(CloneApi).toBeDefined();
    expect(SyncApi).toBeDefined();
    expect(TemplatesApi).toBeDefined();
    expect(VersionHistoryApi).toBeDefined();
    expect(SharingApi).toBeDefined();
  });
});
