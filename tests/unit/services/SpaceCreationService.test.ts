/**
 * SpaceCreationService unit tests
 * Feature: 010-alter-the-init
 * Task: T008 - Write tests for SpaceCreationService core logic BEFORE implementation (TDD)
 *
 * Purpose: Test space creation service with mocked API responses
 * Tests FR-002, FR-005, FR-007 (space creation, defaults, error handling)
 *
 * TDD approach: These tests are written BEFORE implementation and should FAIL initially
 */

import { SpaceCreationService } from '../../../src/services/SpaceCreationService.js';
import { Logger } from '../../../src/utils/Logger.js';
import nock from 'nock';

// Mock Logger
jest.mock('../../../src/utils/Logger.js');

describe('SpaceCreationService - Core Logic', () => {
    let service: SpaceCreationService;
    let mockLogger: jest.Mocked<Logger>;
    const API_BASE_URL = 'https://mujarrad.onrender.com';

    beforeEach(() => {
        // Clear all HTTP mocks
        nock.cleanAll();
        jest.clearAllMocks();

        // Create mock Logger
        mockLogger = {
            logSpaceCreationAttempt: jest.fn(),
            logSpaceCreationSuccess: jest.fn(),
            logSpaceCreationFailure: jest.fn(),
            logNetworkRetry: jest.fn(),
            info: jest.fn(),
            error: jest.fn(),
        } as any;

        // Create service instance
        service = new SpaceCreationService(mockLogger);
    });

    afterEach(() => {
        nock.cleanAll();
    });

    describe('createSpace() - success scenarios', () => {
        it('should create space with minimal fields (slug only)', async () => {
            const request = {
                slug: 'my-space'
            };

            const expectedResponse = {
                spaceId: 'd591becc-de18-47bf-8260-37a8fd911c45',
                slug: 'my-space',
                displayName: 'my-space', // Should default to slug
                description: '', // Should default to empty string
                createdAt: '2025-10-17T10:00:00Z',
                owner: {
                    userId: '5b70649b-826e-404a-9e61-03575ccb75dd',
                    username: 'testuser'
                }
            };

            // Mock successful API response
            nock(API_BASE_URL)
                .post('/api/spaces', {
                    slug: 'my-space',
                    displayName: 'my-space',
                    description: '',
                    isPublic: false
                })
                .reply(201, expectedResponse);

            const result = await service.createSpace(request);

            expect(result).toEqual(expectedResponse);
            expect(result.slug).toBe('my-space');
            expect(result.displayName).toBe('my-space');
            expect(result.description).toBe('');

            // Verify logging
            expect(mockLogger.logSpaceCreationAttempt).toHaveBeenCalledWith('my-space', 1);
            expect(mockLogger.logSpaceCreationSuccess).toHaveBeenCalledWith('my-space', expectedResponse.spaceId);
        });

        it('should create space with full metadata', async () => {
            const request = {
                slug: 'kb',
                displayName: 'Knowledge Base',
                description: 'My personal notes',
                isPublic: false
            };

            const expectedResponse = {
                spaceId: 'd591becc-de18-47bf-8260-37a8fd911c45',
                slug: 'kb',
                displayName: 'Knowledge Base',
                description: 'My personal notes',
                createdAt: '2025-10-17T10:00:00Z',
                owner: {
                    userId: '5b70649b-826e-404a-9e61-03575ccb75dd',
                    username: 'testuser'
                }
            };

            nock(API_BASE_URL)
                .post('/api/spaces', request)
                .reply(201, expectedResponse);

            const result = await service.createSpace(request);

            expect(result).toEqual(expectedResponse);
            expect(result.displayName).toBe('Knowledge Base');
            expect(result.description).toBe('My personal notes');
        });
    });

    describe('createSpace() - client defaults', () => {
        it('should default displayName to slug if not provided', async () => {
            const request = {
                slug: 'test-space'
            };

            nock(API_BASE_URL)
                .post('/api/spaces', body => {
                    expect(body.displayName).toBe('test-space');
                    return true;
                })
                .reply(201, {
                    spaceId: 'test-id',
                    slug: 'test-space',
                    displayName: 'test-space',
                    description: '',
                    createdAt: '2025-10-17T10:00:00Z',
                    owner: { userId: 'user-id', username: 'user' }
                });

            await service.createSpace(request);
        });

        it('should default description to empty string if not provided', async () => {
            const request = {
                slug: 'test-space'
            };

            nock(API_BASE_URL)
                .post('/api/spaces', body => {
                    expect(body.description).toBe('');
                    return true;
                })
                .reply(201, {
                    spaceId: 'test-id',
                    slug: 'test-space',
                    displayName: 'test-space',
                    description: '',
                    createdAt: '2025-10-17T10:00:00Z',
                    owner: { userId: 'user-id', username: 'user' }
                });

            await service.createSpace(request);
        });

        it('should default isPublic to false if not provided', async () => {
            const request = {
                slug: 'test-space'
            };

            nock(API_BASE_URL)
                .post('/api/spaces', body => {
                    expect(body.isPublic).toBe(false);
                    return true;
                })
                .reply(201, {
                    spaceId: 'test-id',
                    slug: 'test-space',
                    displayName: 'test-space',
                    description: '',
                    createdAt: '2025-10-17T10:00:00Z',
                    owner: { userId: 'user-id', username: 'user' }
                });

            await service.createSpace(request);
        });
    });

    describe('createSpace() - error handling', () => {
        it('should throw error on 400 (invalid slug format)', async () => {
            const request = {
                slug: 'Invalid Slug'
            };

            nock(API_BASE_URL)
                .post('/api/spaces')
                .reply(400, {
                    error: 'Invalid slug format',
                    code: 'INVALID_SLUG_FORMAT',
                    details: 'Slug must contain only lowercase letters, numbers, and hyphens'
                });

            await expect(service.createSpace(request)).rejects.toThrow('Invalid slug format');

            expect(mockLogger.logSpaceCreationFailure).toHaveBeenCalledWith(
                'Invalid Slug',
                400,
                expect.stringContaining('Invalid slug format')
            );
        });

        it('should throw error on 409 (duplicate slug)', async () => {
            const request = {
                slug: 'taken-slug'
            };

            nock(API_BASE_URL)
                .post('/api/spaces')
                .reply(409, {
                    error: "Space 'taken-slug' already exists",
                    code: 'SPACE_ALREADY_EXISTS',
                    conflictingSlug: 'taken-slug'
                });

            await expect(service.createSpace(request)).rejects.toThrow('already exists');

            expect(mockLogger.logSpaceCreationFailure).toHaveBeenCalledWith(
                'taken-slug',
                409,
                expect.stringContaining('already exists')
            );
        });

        it('should throw error on 403 (account limit reached)', async () => {
            const request = {
                slug: 'new-space'
            };

            nock(API_BASE_URL)
                .post('/api/spaces')
                .reply(403, {
                    error: 'Space creation failed: account limit reached',
                    code: 'SPACE_LIMIT_REACHED',
                    currentSpaces: 5,
                    maxSpaces: 5
                });

            await expect(service.createSpace(request)).rejects.toThrow('account limit reached');

            expect(mockLogger.logSpaceCreationFailure).toHaveBeenCalledWith(
                'new-space',
                403,
                expect.stringContaining('account limit')
            );
        });

        it('should throw error on 500 (server error)', async () => {
            const request = {
                slug: 'test-space'
            };

            nock(API_BASE_URL)
                .post('/api/spaces')
                .reply(500, {
                    error: 'Internal server error',
                    code: 'INTERNAL_SERVER_ERROR'
                });

            await expect(service.createSpace(request)).rejects.toThrow('Internal server error');
        });

        it('should throw error on network failure (ECONNREFUSED)', async () => {
            const request = {
                slug: 'test-space'
            };

            nock(API_BASE_URL)
                .post('/api/spaces')
                .replyWithError({ code: 'ECONNREFUSED', message: 'Connection refused' });

            await expect(service.createSpace(request)).rejects.toThrow();
        });

        it('should throw error on network timeout (ETIMEDOUT)', async () => {
            const request = {
                slug: 'test-space'
            };

            nock(API_BASE_URL)
                .post('/api/spaces')
                .replyWithError({ code: 'ETIMEDOUT', message: 'Request timeout' });

            await expect(service.createSpace(request)).rejects.toThrow();
        });
    });

    describe('applyDefaults() - internal method verification', () => {
        it('should return complete request with all defaults applied', async () => {
            const request = {
                slug: 'test'
            };

            // We verify defaults through the actual API call
            nock(API_BASE_URL)
                .post('/api/spaces', body => {
                    // Verify all defaults were applied
                    expect(body.slug).toBe('test');
                    expect(body.displayName).toBe('test');
                    expect(body.description).toBe('');
                    expect(body.isPublic).toBe(false);
                    return true;
                })
                .reply(201, {
                    spaceId: 'test-id',
                    slug: 'test',
                    displayName: 'test',
                    description: '',
                    createdAt: '2025-10-17T10:00:00Z',
                    owner: { userId: 'user-id', username: 'user' }
                });

            await service.createSpace(request);
        });

        it('should not override provided values', async () => {
            const request = {
                slug: 'test',
                displayName: 'Test Space',
                description: 'A test',
                isPublic: true
            };

            nock(API_BASE_URL)
                .post('/api/spaces', body => {
                    // Verify provided values were kept
                    expect(body.displayName).toBe('Test Space');
                    expect(body.description).toBe('A test');
                    expect(body.isPublic).toBe(true);
                    return true;
                })
                .reply(201, {
                    spaceId: 'test-id',
                    slug: 'test',
                    displayName: 'Test Space',
                    description: 'A test',
                    createdAt: '2025-10-17T10:00:00Z',
                    owner: { userId: 'user-id', username: 'user' }
                });

            await service.createSpace(request);
        });
    });
});

/**
 * SpaceCreationService Retry Logic Tests
 * Feature: 010-alter-the-init
 * Task: T009 - Write tests for SpaceCreationService retry logic BEFORE implementation (TDD)
 *
 * Purpose: Test retry behavior with exponential backoff
 * Tests FR-006 (retry logic with exponential backoff)
 */

describe('SpaceCreationService - Retry Logic', () => {
    let service: SpaceCreationService;
    let mockLogger: jest.Mocked<Logger>;
    const API_BASE_URL = 'https://mujarrad.onrender.com';

    beforeEach(() => {
        nock.cleanAll();
        jest.clearAllMocks();

        mockLogger = {
            logSpaceCreationAttempt: jest.fn(),
            logSpaceCreationSuccess: jest.fn(),
            logSpaceCreationFailure: jest.fn(),
            logNetworkRetry: jest.fn(),
            info: jest.fn(),
            error: jest.fn(),
        } as any;

        service = new SpaceCreationService(mockLogger);
    });

    afterEach(() => {
        nock.cleanAll();
    });

    describe('retry on 500+ errors', () => {
        it('should retry on 500 server error', async () => {
            const request = { slug: 'test-space' };

            // First 3 attempts fail with 500, 4th succeeds
            nock(API_BASE_URL)
                .post('/api/spaces')
                .reply(500, { error: 'Server error' })
                .post('/api/spaces')
                .reply(500, { error: 'Server error' })
                .post('/api/spaces')
                .reply(500, { error: 'Server error' })
                .post('/api/spaces')
                .reply(201, {
                    spaceId: 'test-id',
                    slug: 'test-space',
                    displayName: 'test-space',
                    description: '',
                    createdAt: '2025-10-17T10:00:00Z',
                    owner: { userId: 'user-id', username: 'user' }
                });

            const result = await service.createSpace(request);

            expect(result.spaceId).toBe('test-id');
            expect(mockLogger.logNetworkRetry).toHaveBeenCalledTimes(3);
            expect(mockLogger.logSpaceCreationSuccess).toHaveBeenCalled();
        });

        it('should retry on 502 bad gateway', async () => {
            const request = { slug: 'test-space' };

            nock(API_BASE_URL)
                .post('/api/spaces')
                .reply(502, { error: 'Bad gateway' })
                .post('/api/spaces')
                .reply(201, {
                    spaceId: 'test-id',
                    slug: 'test-space',
                    displayName: 'test-space',
                    description: '',
                    createdAt: '2025-10-17T10:00:00Z',
                    owner: { userId: 'user-id', username: 'user' }
                });

            const result = await service.createSpace(request);

            expect(result.spaceId).toBe('test-id');
            expect(mockLogger.logNetworkRetry).toHaveBeenCalledTimes(1);
        });

        it('should retry on 503 service unavailable', async () => {
            const request = { slug: 'test-space' };

            nock(API_BASE_URL)
                .post('/api/spaces')
                .reply(503, { error: 'Service unavailable' })
                .post('/api/spaces')
                .reply(201, {
                    spaceId: 'test-id',
                    slug: 'test-space',
                    displayName: 'test-space',
                    description: '',
                    createdAt: '2025-10-17T10:00:00Z',
                    owner: { userId: 'user-id', username: 'user' }
                });

            await service.createSpace(request);
            expect(mockLogger.logNetworkRetry).toHaveBeenCalledTimes(1);
        });
    });

    describe('retry on network errors', () => {
        it('should retry on ECONNREFUSED', async () => {
            const request = { slug: 'test-space' };

            nock(API_BASE_URL)
                .post('/api/spaces')
                .replyWithError({ code: 'ECONNREFUSED', message: 'Connection refused' })
                .post('/api/spaces')
                .reply(201, {
                    spaceId: 'test-id',
                    slug: 'test-space',
                    displayName: 'test-space',
                    description: '',
                    createdAt: '2025-10-17T10:00:00Z',
                    owner: { userId: 'user-id', username: 'user' }
                });

            const result = await service.createSpace(request);
            expect(result.spaceId).toBe('test-id');
            expect(mockLogger.logNetworkRetry).toHaveBeenCalledTimes(1);
        });

        it('should retry on ETIMEDOUT', async () => {
            const request = { slug: 'test-space' };

            nock(API_BASE_URL)
                .post('/api/spaces')
                .replyWithError({ code: 'ETIMEDOUT', message: 'Request timeout' })
                .post('/api/spaces')
                .reply(201, {
                    spaceId: 'test-id',
                    slug: 'test-space',
                    displayName: 'test-space',
                    description: '',
                    createdAt: '2025-10-17T10:00:00Z',
                    owner: { userId: 'user-id', username: 'user' }
                });

            await service.createSpace(request);
            expect(mockLogger.logNetworkRetry).toHaveBeenCalledTimes(1);
        });
    });

    describe('no retry on client errors', () => {
        it('should NOT retry on 400 bad request', async () => {
            const request = { slug: 'Invalid Slug' };

            nock(API_BASE_URL)
                .post('/api/spaces')
                .reply(400, { error: 'Invalid slug format' });

            await expect(service.createSpace(request)).rejects.toThrow('Invalid slug format');
            expect(mockLogger.logNetworkRetry).not.toHaveBeenCalled();
        });

        it('should NOT retry on 409 conflict', async () => {
            const request = { slug: 'taken-slug' };

            nock(API_BASE_URL)
                .post('/api/spaces')
                .reply(409, { error: 'Space already exists' });

            await expect(service.createSpace(request)).rejects.toThrow('already exists');
            expect(mockLogger.logNetworkRetry).not.toHaveBeenCalled();
        });

        it('should NOT retry on 403 forbidden', async () => {
            const request = { slug: 'new-space' };

            nock(API_BASE_URL)
                .post('/api/spaces')
                .reply(403, { error: 'Account limit reached' });

            await expect(service.createSpace(request)).rejects.toThrow('Account limit reached');
            expect(mockLogger.logNetworkRetry).not.toHaveBeenCalled();
        });

        it('should NOT retry on 401 unauthorized', async () => {
            const request = { slug: 'new-space' };

            nock(API_BASE_URL)
                .post('/api/spaces')
                .reply(401, { error: 'Unauthorized' });

            await expect(service.createSpace(request)).rejects.toThrow();
            expect(mockLogger.logNetworkRetry).not.toHaveBeenCalled();
        });
    });

    describe('exponential backoff timing', () => {
        it('should use exponential backoff delays [1000ms, 2000ms, 4000ms]', async () => {
            const request = { slug: 'test-space' };
            const startTime = Date.now();

            // First 3 attempts fail, 4th succeeds
            nock(API_BASE_URL)
                .post('/api/spaces')
                .reply(500, { error: 'Server error' })
                .post('/api/spaces')
                .reply(500, { error: 'Server error' })
                .post('/api/spaces')
                .reply(500, { error: 'Server error' })
                .post('/api/spaces')
                .reply(201, {
                    spaceId: 'test-id',
                    slug: 'test-space',
                    displayName: 'test-space',
                    description: '',
                    createdAt: '2025-10-17T10:00:00Z',
                    owner: { userId: 'user-id', username: 'user' }
                });

            await service.createSpace(request);
            const elapsed = Date.now() - startTime;

            // Total delay: 1000 + 2000 + 4000 = 7000ms minimum
            expect(elapsed).toBeGreaterThanOrEqual(7000);
            expect(mockLogger.logNetworkRetry).toHaveBeenCalledTimes(3);
        });

        it('should log retry attempts with correct attempt numbers', async () => {
            const request = { slug: 'test-space' };

            nock(API_BASE_URL)
                .post('/api/spaces')
                .reply(500, { error: 'Server error' })
                .post('/api/spaces')
                .reply(500, { error: 'Server error' })
                .post('/api/spaces')
                .reply(201, {
                    spaceId: 'test-id',
                    slug: 'test-space',
                    displayName: 'test-space',
                    description: '',
                    createdAt: '2025-10-17T10:00:00Z',
                    owner: { userId: 'user-id', username: 'user' }
                });

            await service.createSpace(request);

            expect(mockLogger.logNetworkRetry).toHaveBeenNthCalledWith(1, 'space creation', 1, 4);
            expect(mockLogger.logNetworkRetry).toHaveBeenNthCalledWith(2, 'space creation', 2, 4);
        });
    });

    describe('max retry attempts', () => {
        it('should make 4 total attempts (initial + 3 retries)', async () => {
            const request = { slug: 'test-space' };

            // All 4 attempts fail
            nock(API_BASE_URL)
                .post('/api/spaces')
                .times(4)
                .reply(500, { error: 'Server error' });

            await expect(service.createSpace(request)).rejects.toThrow();

            // Should have logged initial attempt + 3 retries = 4 total
            expect(mockLogger.logSpaceCreationAttempt).toHaveBeenCalledTimes(4);
            expect(mockLogger.logNetworkRetry).toHaveBeenCalledTimes(3);
        });

        it('should throw error after 3 retries exhausted with retry count in message', async () => {
            const request = { slug: 'test-space' };

            nock(API_BASE_URL)
                .post('/api/spaces')
                .times(4)
                .reply(500, { error: 'Server error' });

            await expect(service.createSpace(request)).rejects.toThrow(/after 3 retries/);

            expect(mockLogger.logSpaceCreationFailure).toHaveBeenCalledWith(
                'test-space',
                500,
                expect.stringContaining('after 3 retries')
            );
        });
    });

    describe('successful creation after retries', () => {
        it('should return response on eventual success after retries', async () => {
            const request = { slug: 'resilient-space' };

            nock(API_BASE_URL)
                .post('/api/spaces')
                .reply(503, { error: 'Service unavailable' })
                .post('/api/spaces')
                .reply(502, { error: 'Bad gateway' })
                .post('/api/spaces')
                .reply(201, {
                    spaceId: 'resilient-id',
                    slug: 'resilient-space',
                    displayName: 'resilient-space',
                    description: '',
                    createdAt: '2025-10-17T10:00:00Z',
                    owner: { userId: 'user-id', username: 'user' }
                });

            const result = await service.createSpace(request);

            expect(result.spaceId).toBe('resilient-id');
            expect(result.slug).toBe('resilient-space');
            expect(mockLogger.logSpaceCreationSuccess).toHaveBeenCalledWith('resilient-space', 'resilient-id');
        });
    });
});
