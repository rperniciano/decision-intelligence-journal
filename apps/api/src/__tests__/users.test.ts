import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import authPlugin from '../plugins/auth';
import usersRoutes from '../routes/users';

// Mock the supabase module
vi.mock('../lib/supabase', () => ({
  getSupabase: vi.fn(),
}));

// Import after mock setup
import { getSupabase } from '../lib/supabase';

// Test JWT secret - only used for testing
const TEST_JWT_SECRET = 'test-secret-key-for-jwt-testing-only';

// Create mock Supabase client
const createMockSupabase = () => {
  const mockSelect = vi.fn();
  const mockInsert = vi.fn();
  const mockFrom = vi.fn();
  const mockSingle = vi.fn();
  const mockEq = vi.fn();

  // Chain methods
  mockFrom.mockReturnValue({
    select: mockSelect,
    insert: mockInsert,
  });

  mockSelect.mockReturnValue({
    eq: mockEq,
    single: mockSingle,
  });

  mockEq.mockReturnValue({
    single: mockSingle,
  });

  mockInsert.mockReturnValue({
    select: vi.fn().mockReturnValue({
      single: mockSingle,
    }),
  });

  return {
    from: mockFrom,
    _mocks: {
      select: mockSelect,
      insert: mockInsert,
      from: mockFrom,
      single: mockSingle,
      eq: mockEq,
    },
  };
};

/**
 * Helper function to create a test JWT token
 */
function createTestToken(
  app: FastifyInstance,
  payload: Record<string, unknown>,
  options?: { expiresIn?: string }
): string {
  return app.jwt.sign(payload, {
    expiresIn: options?.expiresIn || '1h',
  });
}

describe('POST /api/users/profile', () => {
  let app: FastifyInstance;
  let mockSupabase: ReturnType<typeof createMockSupabase>;

  const testUser = {
    sub: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    role: 'authenticated',
  };

  beforeAll(async () => {
    app = Fastify();

    // Register auth plugin with test secret
    await app.register(authPlugin, {
      jwtSecret: TEST_JWT_SECRET,
    });

    // Register users routes
    await app.register(usersRoutes, { prefix: '/api' });

    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();

    // Create fresh mock Supabase for each test
    mockSupabase = createMockSupabase();
    vi.mocked(getSupabase).mockReturnValue(mockSupabase as unknown as ReturnType<typeof getSupabase>);
  });

  it('returns 201 with profile when creating new profile with displayName', async () => {
    const createdAt = new Date().toISOString();
    const updatedAt = createdAt;

    // Mock: profile doesn't exist
    mockSupabase._mocks.single.mockResolvedValueOnce({
      data: null,
      error: { code: 'PGRST116', message: 'No rows found' },
    });

    // Mock: insert succeeds
    const insertSingle = vi.fn().mockResolvedValue({
      data: {
        id: testUser.sub,
        display_name: 'John Doe',
        avatar_url: null,
        onboarding_completed: false,
        created_at: createdAt,
        updated_at: updatedAt,
      },
      error: null,
    });

    mockSupabase._mocks.insert.mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: insertSingle,
      }),
    });

    const token = createTestToken(app, testUser);

    const response = await app.inject({
      method: 'POST',
      url: '/api/users/profile',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      payload: { displayName: 'John Doe' },
    });

    expect(response.statusCode).toBe(201);

    const body = JSON.parse(response.body);
    expect(body.id).toBe(testUser.sub);
    expect(body.displayName).toBe('John Doe');
    expect(body.avatarUrl).toBeUndefined();
    expect(body.onboardingCompleted).toBe(false);
    expect(body.createdAt).toBe(createdAt);
    expect(body.updatedAt).toBe(updatedAt);
  });

  it('returns 201 with profile when creating new profile without displayName', async () => {
    const createdAt = new Date().toISOString();
    const updatedAt = createdAt;

    // Mock: profile doesn't exist
    mockSupabase._mocks.single.mockResolvedValueOnce({
      data: null,
      error: { code: 'PGRST116', message: 'No rows found' },
    });

    // Mock: insert succeeds
    const insertSingle = vi.fn().mockResolvedValue({
      data: {
        id: testUser.sub,
        display_name: null,
        avatar_url: null,
        onboarding_completed: false,
        created_at: createdAt,
        updated_at: updatedAt,
      },
      error: null,
    });

    mockSupabase._mocks.insert.mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: insertSingle,
      }),
    });

    const token = createTestToken(app, testUser);

    const response = await app.inject({
      method: 'POST',
      url: '/api/users/profile',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      payload: {},
    });

    expect(response.statusCode).toBe(201);

    const body = JSON.parse(response.body);
    expect(body.id).toBe(testUser.sub);
    expect(body.displayName).toBeUndefined();
    expect(body.onboardingCompleted).toBe(false);
  });

  it('returns 409 Conflict when profile already exists (from select)', async () => {
    // Mock: profile already exists
    mockSupabase._mocks.single.mockResolvedValueOnce({
      data: { id: testUser.sub },
      error: null,
    });

    const token = createTestToken(app, testUser);

    const response = await app.inject({
      method: 'POST',
      url: '/api/users/profile',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      payload: { displayName: 'John Doe' },
    });

    expect(response.statusCode).toBe(409);

    const body = JSON.parse(response.body);
    expect(body.statusCode).toBe(409);
    expect(body.error).toBe('Conflict');
    expect(body.message).toBe('Profile already exists for this user');
  });

  it('returns 409 Conflict when profile exists (race condition via insert)', async () => {
    // Mock: profile doesn't exist in select
    mockSupabase._mocks.single.mockResolvedValueOnce({
      data: null,
      error: { code: 'PGRST116', message: 'No rows found' },
    });

    // Mock: insert fails with unique constraint violation (race condition)
    const insertSingle = vi.fn().mockResolvedValue({
      data: null,
      error: { code: '23505', message: 'Unique constraint violation' },
    });

    mockSupabase._mocks.insert.mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: insertSingle,
      }),
    });

    const token = createTestToken(app, testUser);

    const response = await app.inject({
      method: 'POST',
      url: '/api/users/profile',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      payload: { displayName: 'John Doe' },
    });

    expect(response.statusCode).toBe(409);

    const body = JSON.parse(response.body);
    expect(body.statusCode).toBe(409);
    expect(body.error).toBe('Conflict');
    expect(body.message).toBe('Profile already exists for this user');
  });

  it('returns 500 when select query fails with unexpected error', async () => {
    // Mock: select fails with unexpected error
    mockSupabase._mocks.single.mockResolvedValueOnce({
      data: null,
      error: { code: 'UNEXPECTED', message: 'Database connection failed' },
    });

    const token = createTestToken(app, testUser);

    const response = await app.inject({
      method: 'POST',
      url: '/api/users/profile',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      payload: { displayName: 'John Doe' },
    });

    expect(response.statusCode).toBe(500);

    const body = JSON.parse(response.body);
    expect(body.statusCode).toBe(500);
    expect(body.error).toBe('Internal Server Error');
    expect(body.message).toBe('Failed to check existing profile');
  });

  it('returns 500 when insert fails with unexpected error', async () => {
    // Mock: profile doesn't exist
    mockSupabase._mocks.single.mockResolvedValueOnce({
      data: null,
      error: { code: 'PGRST116', message: 'No rows found' },
    });

    // Mock: insert fails with unexpected error
    const insertSingle = vi.fn().mockResolvedValue({
      data: null,
      error: { code: 'UNEXPECTED', message: 'Insert failed' },
    });

    mockSupabase._mocks.insert.mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: insertSingle,
      }),
    });

    const token = createTestToken(app, testUser);

    const response = await app.inject({
      method: 'POST',
      url: '/api/users/profile',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      payload: { displayName: 'John Doe' },
    });

    expect(response.statusCode).toBe(500);

    const body = JSON.parse(response.body);
    expect(body.statusCode).toBe(500);
    expect(body.error).toBe('Internal Server Error');
    expect(body.message).toBe('Failed to create profile');
  });

  it('returns 401 when no token is provided', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/users/profile',
      headers: {
        'content-type': 'application/json',
      },
      payload: { displayName: 'John Doe' },
    });

    expect(response.statusCode).toBe(401);

    const body = JSON.parse(response.body);
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 401 when invalid token is provided', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/users/profile',
      headers: {
        authorization: 'Bearer invalid-token',
        'content-type': 'application/json',
      },
      payload: { displayName: 'John Doe' },
    });

    expect(response.statusCode).toBe(401);

    const body = JSON.parse(response.body);
    expect(body.error).toBe('Unauthorized');
  });

  it('handles empty body gracefully', async () => {
    const createdAt = new Date().toISOString();
    const updatedAt = createdAt;

    // Mock: profile doesn't exist
    mockSupabase._mocks.single.mockResolvedValueOnce({
      data: null,
      error: { code: 'PGRST116', message: 'No rows found' },
    });

    // Mock: insert succeeds
    const insertSingle = vi.fn().mockResolvedValue({
      data: {
        id: testUser.sub,
        display_name: null,
        avatar_url: null,
        onboarding_completed: false,
        created_at: createdAt,
        updated_at: updatedAt,
      },
      error: null,
    });

    mockSupabase._mocks.insert.mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: insertSingle,
      }),
    });

    const token = createTestToken(app, testUser);

    // Send request without any body
    const response = await app.inject({
      method: 'POST',
      url: '/api/users/profile',
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(response.statusCode).toBe(201);

    const body = JSON.parse(response.body);
    expect(body.id).toBe(testUser.sub);
    expect(body.displayName).toBeUndefined();
  });

  it('correctly maps response fields from snake_case to camelCase', async () => {
    const createdAt = '2024-01-15T10:00:00.000Z';
    const updatedAt = '2024-01-15T10:00:00.000Z';

    // Mock: profile doesn't exist
    mockSupabase._mocks.single.mockResolvedValueOnce({
      data: null,
      error: { code: 'PGRST116', message: 'No rows found' },
    });

    // Mock: insert succeeds with full snake_case response
    const insertSingle = vi.fn().mockResolvedValue({
      data: {
        id: testUser.sub,
        display_name: 'Test Name',
        avatar_url: 'https://example.com/avatar.jpg',
        onboarding_completed: true,
        created_at: createdAt,
        updated_at: updatedAt,
      },
      error: null,
    });

    mockSupabase._mocks.insert.mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: insertSingle,
      }),
    });

    const token = createTestToken(app, testUser);

    const response = await app.inject({
      method: 'POST',
      url: '/api/users/profile',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      payload: { displayName: 'Test Name' },
    });

    expect(response.statusCode).toBe(201);

    const body = JSON.parse(response.body);
    // Verify camelCase fields
    expect(body.displayName).toBe('Test Name');
    expect(body.avatarUrl).toBe('https://example.com/avatar.jpg');
    expect(body.onboardingCompleted).toBe(true);
    expect(body.createdAt).toBe(createdAt);
    expect(body.updatedAt).toBe(updatedAt);
    // Verify snake_case fields are NOT present
    expect(body.display_name).toBeUndefined();
    expect(body.avatar_url).toBeUndefined();
    expect(body.onboarding_completed).toBeUndefined();
    expect(body.created_at).toBeUndefined();
    expect(body.updated_at).toBeUndefined();
  });
});
