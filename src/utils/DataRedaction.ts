/**
 * Data redaction utility for removing sensitive information from logs
 *
 * Provides high-performance redaction of sensitive fields using recursive traversal
 * Follows Constitution Principle V: Security by Default
 */

/**
 * List of sensitive field names to redact (case-insensitive matching)
 */
const SENSITIVE_FIELDS = [
  // Authentication & Authorization
  'password',
  'passwd',
  'pwd',
  'token',
  'apiToken',
  'api_token',
  'apiKey',
  'api_key',
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
  'jwt',
  'authorization',
  'auth',
  'bearer',

  // Credentials
  'secret',
  'privateKey',
  'private_key',
  'apiSecret',
  'api_secret',
  'clientSecret',
  'client_secret',

  // Personal Information
  'ssn',
  'creditCard',
  'credit_card',
  'cvv',
  'pin',
];


/**
 * DataRedaction utility for removing sensitive information
 */
export class DataRedaction {
  /**
   * Check if a field name is sensitive (case-insensitive)
   */
  private static isSensitiveField(fieldName: string): boolean {
    const lowerField = fieldName.toLowerCase();
    return SENSITIVE_FIELDS.some(sensitive =>
      lowerField === sensitive.toLowerCase() ||
      lowerField.includes(sensitive.toLowerCase())
    );
  }

  /**
   * Recursively redact sensitive fields, including null/undefined values
   */
  private static recursiveRedact(obj: any, visited = new WeakSet()): any {
    // Handle primitives
    if (obj === null || obj === undefined || typeof obj !== 'object') {
      return obj;
    }

    // Prevent circular references
    if (visited.has(obj)) {
      return obj;
    }
    visited.add(obj);

    // Handle arrays
    if (Array.isArray(obj)) {
      return obj.map(item => this.recursiveRedact(item, visited));
    }

    // Handle objects
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (this.isSensitiveField(key)) {
        // Redact sensitive fields, even if they're null/undefined
        result[key] = '[REDACTED]';
      } else if (value && typeof value === 'object') {
        // Recursively process nested objects/arrays
        result[key] = this.recursiveRedact(value, visited);
      } else {
        // Keep non-sensitive primitives as-is
        result[key] = value;
      }
    }
    return result;
  }

  /**
   * Deep clone that preserves undefined values (JSON.stringify removes them)
   */
  private static deepClone(obj: any): any {
    if (obj === null || obj === undefined || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.deepClone(item));
    }

    const cloned: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = this.deepClone(obj[key]);
      }
    }
    return cloned;
  }

  /**
   * Redact sensitive data from an object
   *
   * @param data - Data object to redact (can be any type)
   * @returns Redacted copy of the data
   *
   * @example
   * ```typescript
   * const data = { username: 'john', password: 'secret123' };
   * const redacted = DataRedaction.redactSensitiveData(data);
   * // Returns: { username: 'john', password: '[REDACTED]' }
   * ```
   */
  static redactSensitiveData<T = any>(data: T): T {
    // Handle primitive types
    if (data === null || data === undefined) {
      return data;
    }

    if (typeof data !== 'object') {
      return data;
    }

    // Create a deep copy that preserves undefined values
    const copy = this.deepClone(data);

    // Apply custom recursive redaction
    return this.recursiveRedact(copy);
  }

  /**
   * Redact sensitive data and return as JSON string for logging
   *
   * @param data - Data to redact and serialize
   * @returns JSON string with redacted sensitive fields
   *
   * @example
   * ```typescript
   * const data = { username: 'john', password: 'secret123' };
   * const json = DataRedaction.redactForLogging(data);
   * // Returns: '{"username":"john","password":"[REDACTED]"}'
   * ```
   */
  static redactForLogging(data: any): string {
    try {
      // First redact the data
      const redacted = this.redactSensitiveData(data);

      // Then serialize to JSON
      return JSON.stringify(redacted, null, 2);
    } catch (error) {
      // Handle circular references or other JSON serialization errors
      try {
        // Attempt to create a safe representation
        return JSON.stringify({
          error: 'Failed to serialize data',
          type: typeof data,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      } catch {
        return '{"error":"Failed to serialize data"}';
      }
    }
  }
}
