/**
 * SlugValidator utility
 * Feature: 010-alter-the-init
 * Task: T007 - Implement SlugValidator to pass T006 tests
 *
 * Purpose: Client-side slug validation before API calls
 * Implements FR-003, FR-004 (slug format and reserved slugs)
 */

export interface SlugValidationResult {
    valid: boolean;
    errors: string[];
    format: string;
    minLength: number;
    maxLength: number;
}

/**
 * SlugValidator validates space slugs before API calls
 * Implements FR-003: Slug format validation
 * Implements FR-004: Reserved slug prevention
 *
 * Validation Rules:
 * - Format: lowercase letters, numbers, hyphens only
 * - Length: 1-50 characters
 * - Reserved: Cannot use system reserved slugs
 * - Edge cases: Cannot start/end with hyphen, no consecutive hyphens
 */
export class SlugValidator {
    private static readonly FORMAT_PATTERN = /^[a-z0-9-]+$/;
    private static readonly RESERVED_SLUGS: Set<string> = new Set([
        'admin',
        'api',
        'auth',
        'system',
        'public',
        'private',
        'space',
        'user',
        'settings'
    ]);
    private static readonly MIN_LENGTH = 1;
    private static readonly MAX_LENGTH = 50;

    /**
     * Validate a space slug
     * @param slug - The slug to validate
     * @returns SlugValidationResult with validation status and errors
     */
    public validate(slug: string): SlugValidationResult {
        const errors: string[] = [];

        // Check required
        if (!slug || slug.length === 0) {
            errors.push('Slug is required');
            return {
                valid: false,
                errors,
                format: 'lowercase-alphanumeric-hyphen',
                minLength: SlugValidator.MIN_LENGTH,
                maxLength: SlugValidator.MAX_LENGTH
            };
        }

        // Check length
        if (slug.length > SlugValidator.MAX_LENGTH) {
            errors.push(`Slug must be ${SlugValidator.MAX_LENGTH} characters or less (got ${slug.length})`);
        }

        // Check format (lowercase alphanumeric + hyphens only)
        if (!SlugValidator.FORMAT_PATTERN.test(slug)) {
            if (/[A-Z]/.test(slug)) {
                errors.push('Slug must be lowercase only');
            } else {
                errors.push('Slug must contain only lowercase letters, numbers, and hyphens (alphanumeric characters)');
            }
        }

        // Check edge cases
        if (slug.startsWith('-')) {
            errors.push('Slug cannot start with a hyphen');
        }

        if (slug.endsWith('-')) {
            errors.push('Slug cannot end with a hyphen');
        }

        if (slug.includes('--')) {
            errors.push('Slug cannot contain consecutive hyphens');
        }

        // Check reserved slugs
        if (this.isReserved(slug)) {
            errors.push(`Slug "${slug}" is reserved and cannot be used`);
        }

        return {
            valid: errors.length === 0,
            errors,
            format: 'lowercase-alphanumeric-hyphen',
            minLength: SlugValidator.MIN_LENGTH,
            maxLength: SlugValidator.MAX_LENGTH
        };
    }

    /**
     * Check if a slug is reserved
     * @param slug - The slug to check
     * @returns true if reserved, false otherwise
     * @private
     */
    private isReserved(slug: string): boolean {
        return SlugValidator.RESERVED_SLUGS.has(slug.toLowerCase());
    }

}
