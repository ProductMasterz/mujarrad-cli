# Error Handling

The SDK provides typed error classes that map directly from HTTP status codes. This makes it easy to catch specific failures and respond appropriately.

## Error Hierarchy

All SDK errors extend `MujarradError`:

```
MujarradError (base)
├── AuthenticationError  (401)
├── ValidationError      (400)
├── NotFoundError        (404)
├── RateLimitError       (429)
├── ServerError          (5xx)
└── NetworkError         (no response)
```

## Error Classes

### `MujarradError`

The base class for all SDK errors.

```typescript
class MujarradError extends Error {
  readonly statusCode?: number;  // HTTP status code (undefined for network errors)
  readonly canRetry: boolean;    // Whether the operation can be retried
}
```

### `AuthenticationError` (401)

Thrown when API key credentials are invalid or expired.

```typescript
try {
  await client.nodes.list();
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.error('Bad credentials — check your API key and secret');
    // error.statusCode === 401
    // error.canRetry === false
  }
}
```

**Common causes:**
- Wrong `apiKey` or `secretKey`
- Deleted or rotated API key
- Key not authorized for this space

### `ValidationError` (400)

Thrown when input data is invalid. Contains an `errors` array with details.

```typescript
try {
  await client.createEntity('Task', { status: 'invalid' });
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Validation failed:');
    for (const err of error.errors) {
      console.error(`  - ${err}`);
    }
    // error.errors === ['Task.title is required', 'Task.status must be one of: ...']
    // error.statusCode === 400
    // error.canRetry === false
  }
}
```

**Two sources of validation errors:**
1. **Client-side** — Schema validation catches errors before the API call (thrown by `createEntity()`)
2. **Server-side** — The API returns 400 with error details

### `NotFoundError` (404)

Thrown when a requested resource doesn't exist.

```typescript
try {
  await client.nodes.get('nonexistent-id');
} catch (error) {
  if (error instanceof NotFoundError) {
    console.error('Node not found');
    // error.statusCode === 404
    // error.canRetry === false
  }
}
```

### `RateLimitError` (429)

Thrown when you've exceeded the API rate limit. Includes a `retryAfter` hint.

```typescript
try {
  await client.nodes.list();
} catch (error) {
  if (error instanceof RateLimitError) {
    console.error(`Rate limited. Retry after ${error.retryAfter} seconds`);
    // error.retryAfter — seconds to wait (may be undefined)
    // error.statusCode === 429
    // error.canRetry === true
  }
}
```

The SDK's built-in retry mechanism handles rate limits automatically (see [Retry Behavior](#retry-behavior) below). You'll only see this error if all retries are exhausted.

### `ServerError` (5xx)

Thrown when the Mujarrad backend encounters an internal error.

```typescript
try {
  await client.nodes.create({ title: 'Test' });
} catch (error) {
  if (error instanceof ServerError) {
    console.error(`Server error (${error.statusCode}): ${error.message}`);
    // error.canRetry === true
  }
}
```

### `NetworkError`

Thrown when the SDK can't reach the server at all — no HTTP response.

```typescript
try {
  await client.nodes.list();
} catch (error) {
  if (error instanceof NetworkError) {
    console.error('Network error — check your connection');
    // error.statusCode === undefined
    // error.canRetry === true
  }
}
```

**Common causes:**
- No internet connection
- DNS resolution failure
- Request timeout
- Server unreachable

## Catching Errors

### Catch a Specific Error Type

```typescript
import {
  AuthenticationError,
  ValidationError,
  NotFoundError,
} from '@mujarrad/sdk';

try {
  const node = await client.nodes.get(nodeId);
} catch (error) {
  if (error instanceof NotFoundError) {
    // Handle missing node
  } else if (error instanceof AuthenticationError) {
    // Handle auth failure
  } else {
    throw error; // Re-throw unexpected errors
  }
}
```

### Catch All SDK Errors

```typescript
import { MujarradError } from '@mujarrad/sdk';

try {
  await client.nodes.create({ title: 'Test' });
} catch (error) {
  if (error instanceof MujarradError) {
    console.error(`SDK error [${error.statusCode}]: ${error.message}`);
    console.error(`Retryable: ${error.canRetry}`);
  } else {
    // Not an SDK error — something else went wrong
    throw error;
  }
}
```

### Pattern: Error Handler Function

```typescript
import {
  MujarradError,
  AuthenticationError,
  ValidationError,
  NotFoundError,
  RateLimitError,
  ServerError,
  NetworkError,
} from '@mujarrad/sdk';

function handleError(error: unknown): void {
  if (error instanceof ValidationError) {
    console.error('Invalid input:', error.errors.join(', '));
  } else if (error instanceof AuthenticationError) {
    console.error('Auth failed — regenerate your API keys');
  } else if (error instanceof NotFoundError) {
    console.error('Resource not found');
  } else if (error instanceof RateLimitError) {
    console.error(`Rate limited — wait ${error.retryAfter ?? '?'}s`);
  } else if (error instanceof ServerError) {
    console.error('Server error — try again later');
  } else if (error instanceof NetworkError) {
    console.error('Network error — check your connection');
  } else if (error instanceof MujarradError) {
    console.error(`Unexpected SDK error: ${error.message}`);
  } else {
    throw error;
  }
}

// Usage
try {
  await client.nodes.create({ title: 'Test' });
} catch (error) {
  handleError(error);
}
```

## Retry Behavior

The SDK automatically retries **retryable** errors (those with `canRetry === true`):

| Error Type | Retried? |
|-----------|----------|
| `AuthenticationError` (401) | No |
| `ValidationError` (400) | No |
| `NotFoundError` (404) | No |
| `RateLimitError` (429) | Yes |
| `ServerError` (5xx) | Yes |
| `NetworkError` | Yes |

### Default Configuration

- **Max attempts**: 3 (1 initial + 2 retries)
- **Base delay**: 1000ms
- **Backoff**: Exponential — 1s, 2s, 4s
- **Retry-After**: If the server sends a `Retry-After` header, the SDK respects it

### Custom Retry Configuration

```typescript
const client = new Mujarrad({
  apiKey: '...',
  secretKey: '...',
  space: 'my-space',
  retryOptions: {
    maxAttempts: 5,     // More retries for unreliable networks
    baseDelay: 2000,    // Start with 2s delay
  },
});
```

### Disable Retries

```typescript
const client = new Mujarrad({
  apiKey: '...',
  secretKey: '...',
  space: 'my-space',
  retryOptions: {
    maxAttempts: 1,     // No retries
  },
});
```

## Timeouts

The default timeout is 30 seconds. Configure it per client:

```typescript
const client = new Mujarrad({
  apiKey: '...',
  secretKey: '...',
  space: 'my-space',
  timeout: 10000,       // 10 seconds
});
```

If a request exceeds the timeout, it throws a `NetworkError`.

## What's Next

- [Building a Todo App](./07-tutorial-todo-app.md) — Error handling in a real app
- [API Reference](./08-api-reference.md) — All error types and properties
