# API Client Regeneration Required

After Mujarrad Backend deploys Feature 014 + Batch 015, regenerate the API client:

```bash
npx @openapitools/openapi-generator-cli generate \
  -i https://mujarrad.onrender.com/v3/api-docs \
  -g typescript-axios \
  -o src/api/generated/
```

New endpoints available after regeneration:
- Context-scoped CRUD: /contexts/{slug}/nodes
- Blank (unorganized): /blank, /blank/{id}/assign, /blank/assign-bulk
- Node migration: /nodes/{id}/migrate
- Paginated responses: ?page=0&size=20

No code changes needed in CLI services — batch upload goes through
NodeService.createNode which auto-assigns to Blank.

