/**
 * SlugValidator unit tests
 * Feature: 010-alter-the-init
 * Task: T006 - Write tests for SlugValidator BEFORE implementation (TDD)
 *
 * Purpose: Test client-side slug validation logic
 * Tests FR-003, FR-004 (slug format and reserved slugs)
 *
 * TDD approach: These tests are written BEFORE implementation and should FAIL initially
 */

import { SlugValidator } from '../../../src/utils/SlugValidator.js';

describe('SlugValidator', () => {
    let validator: SlugValidator;

    beforeEach(() => {
        validator = new SlugValidator();
    });

    describe('validate() - valid slugs', () => {
        it('should accept lowercase alphanumeric with hyphens', () => {
            const result = validator.validate('my-space');
            expect(result.valid).toBe(true);
            expect(result.errors).toEqual([]);
        });

        it('should accept slug with numbers and hyphens', () => {
            const result = validator.validate('kb-2025');
            expect(result.valid).toBe(true);
            expect(result.errors).toEqual([]);
        });

        it('should accept single character slug', () => {
            const result = validator.validate('a');
            expect(result.valid).toBe(true);
            expect(result.errors).toEqual([]);
        });

        it('should accept slug with multiple parts', () => {
            const result = validator.validate('a-b-c-1-2-3');
            expect(result.valid).toBe(true);
            expect(result.errors).toEqual([]);
        });

        it('should accept 50 character slug (max length)', () => {
            const slug = 'a'.repeat(50);
            const result = validator.validate(slug);
            expect(result.valid).toBe(true);
            expect(result.errors).toEqual([]);
        });
    });

    describe('validate() - invalid characters', () => {
        it('should reject slug with uppercase letters', () => {
            const result = validator.validate('My-Space');
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('lowercase'))).toBe(true);
        });

        it('should reject slug with spaces', () => {
            const result = validator.validate('my space');
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('alphanumeric'))).toBe(true);
        });

        it('should reject slug with underscores', () => {
            const result = validator.validate('my_space');
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('alphanumeric'))).toBe(true);
        });

        it('should reject slug with dots', () => {
            const result = validator.validate('my.space');
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('alphanumeric'))).toBe(true);
        });

        it('should reject slug with special characters', () => {
            const result = validator.validate('my@space');
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('alphanumeric'))).toBe(true);
        });
    });

    describe('validate() - length violations', () => {
        it('should reject empty string', () => {
            const result = validator.validate('');
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('required'))).toBe(true);
        });

        it('should reject slug longer than 50 characters', () => {
            const slug = 'a'.repeat(51);
            const result = validator.validate(slug);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('50 characters'))).toBe(true);
        });
    });

    describe('validate() - reserved slugs', () => {
        const reservedSlugs = ['admin', 'api', 'auth', 'system', 'public', 'private', 'space', 'user', 'settings'];

        reservedSlugs.forEach(slug => {
            it(`should reject reserved slug: "${slug}"`, () => {
                const result = validator.validate(slug);
                expect(result.valid).toBe(false);
                expect(result.errors.some(e => e.includes('reserved'))).toBe(true);
            });
        });

        it('should accept slug that contains reserved word but is not exact match', () => {
            const result = validator.validate('my-admin-space');
            expect(result.valid).toBe(true);
            expect(result.errors).toEqual([]);
        });
    });

    describe('validate() - edge cases', () => {
        it('should reject slug with only hyphens', () => {
            const result = validator.validate('---');
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
        });

        it('should accept slug with only numbers', () => {
            const result = validator.validate('123');
            expect(result.valid).toBe(true);
            expect(result.errors).toEqual([]);
        });

        it('should reject slug starting with hyphen', () => {
            const result = validator.validate('-abc');
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('start with'))).toBe(true);
        });

        it('should reject slug ending with hyphen', () => {
            const result = validator.validate('abc-');
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('end with'))).toBe(true);
        });

        it('should reject slug with consecutive hyphens', () => {
            const result = validator.validate('my--space');
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('consecutive'))).toBe(true);
        });
    });

    describe('validate() - return value structure', () => {
        it('should return validation result with correct structure', () => {
            const result = validator.validate('valid-slug');
            expect(result).toHaveProperty('valid');
            expect(result).toHaveProperty('errors');
            expect(result).toHaveProperty('format');
            expect(result).toHaveProperty('minLength');
            expect(result).toHaveProperty('maxLength');
        });

        it('should return format description', () => {
            const result = validator.validate('test');
            expect(result.format).toBe('lowercase-alphanumeric-hyphen');
        });

        it('should return correct min and max lengths', () => {
            const result = validator.validate('test');
            expect(result.minLength).toBe(1);
            expect(result.maxLength).toBe(50);
        });

        it('should return multiple errors for multiple violations', () => {
            const result = validator.validate('My_Invalid_Slug_That_Is_Way_Too_Long_For_A_Space_Slug_Name_Exceeding_Max');
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(1);
        });
    });

    describe('validate() - performance', () => {
        it('should validate slug in less than 10ms (NFR-002)', () => {
            const start = performance.now();
            validator.validate('my-test-space-123');
            const duration = performance.now() - start;
            expect(duration).toBeLessThan(10);
        });

        it('should validate reserved slug in less than 1ms', () => {
            const start = performance.now();
            validator.validate('admin');
            const duration = performance.now() - start;
            expect(duration).toBeLessThan(1);
        });

        it('should have consistent timing for valid and invalid slugs', () => {
            const validStart = performance.now();
            validator.validate('valid-slug');
            const validDuration = performance.now() - validStart;

            const invalidStart = performance.now();
            validator.validate('Invalid Slug!!!');
            const invalidDuration = performance.now() - invalidStart;

            // Both should be very fast and similar
            expect(validDuration).toBeLessThan(10);
            expect(invalidDuration).toBeLessThan(10);
        });
    });
});
