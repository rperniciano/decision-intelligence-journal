import { describe, it, expect, beforeAll, afterAll, vi, beforeEach, afterEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import authPlugin from '../plugins/auth';
import transcriptionRoutes from '../routes/transcription';

// Mock the supabase module
vi.mock('../lib/supabase', () => ({
  getSupabase: vi.fn(),
}));

// Mock the transcription service module
vi.mock('../services/transcription', () => ({
  getTranscriptionService: vi.fn(),
  AssemblyAITranscriptionError: class AssemblyAITranscriptionError extends Error {
    code: string;
    retryable: boolean;
    constructor(message: string, code: string, retryable: boolean) {
      super(message);
      this.name = 'AssemblyAITranscriptionError';
      this.code = code;
      this.retryable = retryable;
    }
  },
}));

// Import after mock setup
import { getSupabase } from '../lib/supabase';
import { getTranscriptionService, AssemblyAITranscriptionError } from '../services/transcription';

// Test JWT secret - only used for testing
const TEST_JWT_SECRET = 'test-secret-key-for-jwt-testing-only';

// Create mock Supabase client with storage
const createMockSupabase = () => {
  const mockGetPublicUrl = vi.fn();
  const mockFrom = vi.fn();

  mockFrom.mockReturnValue({
    getPublicUrl: mockGetPublicUrl,
  });

  return {
    storage: {
      from: mockFrom,
    },
    _mocks: {
      getPublicUrl: mockGetPublicUrl,
      from: mockFrom,
    },
  };
};

// Create mock transcription service
const createMockTranscriptionService = () => ({
  transcribe: vi.fn(),
});

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

describe('POST /api/transcription', () => {
  let app: FastifyInstance;
  let mockSupabase: ReturnType<typeof createMockSupabase>;
  let mockTranscriptionService: ReturnType<typeof createMockTranscriptionService>;

  const testUser = {
    sub: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    role: 'authenticated',
  };

  // Different user for ownership tests
  const otherUser = {
    sub: '999e9999-e89b-12d3-a456-999999999999',
    email: 'other@example.com',
    role: 'authenticated',
  };

  beforeAll(async () => {
    app = Fastify();

    // Register auth plugin with test secret
    await app.register(authPlugin, {
      jwtSecret: TEST_JWT_SECRET,
    });

    // Register transcription routes
    await app.register(transcriptionRoutes, { prefix: '/api/transcription' });

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

    // Create fresh mock transcription service
    mockTranscriptionService = createMockTranscriptionService();
    vi.mocked(getTranscriptionService).mockReturnValue(mockTranscriptionService);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ============================================================================
  // Successful transcription tests
  // ============================================================================

  it('returns 200 with transcription result when using audioPath', async () => {
    const audioPath = `${testUser.sub}/test-audio.webm`;

    // Mock public URL generation
    mockSupabase._mocks.getPublicUrl.mockReturnValue({
      data: {
        publicUrl: `https://example.supabase.co/storage/v1/object/public/decision-audio/${audioPath}`,
      },
    });

    // Mock successful transcription
    mockTranscriptionService.transcribe.mockResolvedValue({
      text: 'Devo decidere se cambiare lavoro.',
      confidence: 0.95,
      words: [
        { text: 'Devo', start: 0, end: 200, confidence: 0.98 },
        { text: 'decidere', start: 200, end: 500, confidence: 0.95 },
      ],
    });

    const token = createTestToken(app, testUser);

    const response = await app.inject({
      method: 'POST',
      url: '/api/transcription',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      payload: JSON.stringify({ audioPath }),
    });

    expect(response.statusCode).toBe(200);

    const body = JSON.parse(response.body);
    expect(body.text).toBe('Devo decidere se cambiare lavoro.');
    expect(body.confidence).toBe(0.95);
  });

  it('returns 200 with transcription result when using audioUrl from our storage', async () => {
    const audioPath = `${testUser.sub}/test-audio.webm`;
    const audioUrl = `https://xxx.supabase.co/storage/v1/object/public/decision-audio/${audioPath}`;

    // Mock successful transcription
    mockTranscriptionService.transcribe.mockResolvedValue({
      text: 'Sto pensando di cambiare casa.',
      confidence: 0.92,
      words: [],
    });

    const token = createTestToken(app, testUser);

    const response = await app.inject({
      method: 'POST',
      url: '/api/transcription',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      payload: JSON.stringify({ audioUrl }),
    });

    expect(response.statusCode).toBe(200);

    const body = JSON.parse(response.body);
    expect(body.text).toBe('Sto pensando di cambiare casa.');
    expect(body.confidence).toBe(0.92);

    // Verify transcription service was called with the original URL
    expect(mockTranscriptionService.transcribe).toHaveBeenCalledWith(audioUrl);
  });

  it('returns 200 when using external audioUrl (not from our storage)', async () => {
    const externalUrl = 'https://external-storage.example.com/audio/recording.webm';

    // Mock successful transcription
    mockTranscriptionService.transcribe.mockResolvedValue({
      text: 'Audio from external source.',
      confidence: 0.88,
      words: [],
    });

    const token = createTestToken(app, testUser);

    const response = await app.inject({
      method: 'POST',
      url: '/api/transcription',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      payload: JSON.stringify({ audioUrl: externalUrl }),
    });

    expect(response.statusCode).toBe(200);

    const body = JSON.parse(response.body);
    expect(body.text).toBe('Audio from external source.');
    expect(body.confidence).toBe(0.88);

    // Verify transcription service was called with external URL
    expect(mockTranscriptionService.transcribe).toHaveBeenCalledWith(externalUrl);
  });

  // ============================================================================
  // Validation tests
  // ============================================================================

  it('returns 400 when neither audioUrl nor audioPath is provided', async () => {
    const token = createTestToken(app, testUser);

    const response = await app.inject({
      method: 'POST',
      url: '/api/transcription',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      payload: JSON.stringify({}),
    });

    expect(response.statusCode).toBe(400);

    const body = JSON.parse(response.body);
    expect(body.statusCode).toBe(400);
    expect(body.error).toBe('Bad Request');
    expect(body.message).toBe('Either audioUrl or audioPath must be provided');
  });

  it('returns 400 when both audioUrl and audioPath are empty strings', async () => {
    const token = createTestToken(app, testUser);

    const response = await app.inject({
      method: 'POST',
      url: '/api/transcription',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      payload: JSON.stringify({ audioUrl: '', audioPath: '' }),
    });

    expect(response.statusCode).toBe(400);

    const body = JSON.parse(response.body);
    expect(body.statusCode).toBe(400);
    expect(body.error).toBe('Bad Request');
  });

  // ============================================================================
  // Authorization/ownership tests
  // ============================================================================

  it('returns 403 when audioPath belongs to a different user', async () => {
    // Path belonging to a different user
    const audioPath = `${otherUser.sub}/test-audio.webm`;

    const token = createTestToken(app, testUser);

    const response = await app.inject({
      method: 'POST',
      url: '/api/transcription',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      payload: JSON.stringify({ audioPath }),
    });

    expect(response.statusCode).toBe(403);

    const body = JSON.parse(response.body);
    expect(body.statusCode).toBe(403);
    expect(body.error).toBe('Forbidden');
    expect(body.message).toBe('You do not have permission to access this audio file');
  });

  it('returns 403 when audioUrl from our storage belongs to a different user', async () => {
    // URL with path belonging to a different user
    const audioUrl = `https://xxx.supabase.co/storage/v1/object/public/decision-audio/${otherUser.sub}/test-audio.webm`;

    const token = createTestToken(app, testUser);

    const response = await app.inject({
      method: 'POST',
      url: '/api/transcription',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      payload: JSON.stringify({ audioUrl }),
    });

    expect(response.statusCode).toBe(403);

    const body = JSON.parse(response.body);
    expect(body.statusCode).toBe(403);
    expect(body.error).toBe('Forbidden');
    expect(body.message).toBe('You do not have permission to access this audio file');
  });

  it('returns 403 when audioPath has invalid format', async () => {
    // Invalid path with no user folder
    const audioPath = 'test-audio.webm';

    const token = createTestToken(app, testUser);

    const response = await app.inject({
      method: 'POST',
      url: '/api/transcription',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      payload: JSON.stringify({ audioPath }),
    });

    expect(response.statusCode).toBe(403);

    const body = JSON.parse(response.body);
    expect(body.statusCode).toBe(403);
    expect(body.error).toBe('Forbidden');
  });

  // ============================================================================
  // Authentication tests
  // ============================================================================

  it('returns 401 when no token is provided', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/transcription',
      headers: {
        'content-type': 'application/json',
      },
      payload: JSON.stringify({ audioPath: `${testUser.sub}/test.webm` }),
    });

    expect(response.statusCode).toBe(401);

    const body = JSON.parse(response.body);
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 401 when invalid token is provided', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/transcription',
      headers: {
        authorization: 'Bearer invalid-token',
        'content-type': 'application/json',
      },
      payload: JSON.stringify({ audioPath: `${testUser.sub}/test.webm` }),
    });

    expect(response.statusCode).toBe(401);

    const body = JSON.parse(response.body);
    expect(body.error).toBe('Unauthorized');
  });

  // ============================================================================
  // Transcription service error tests
  // ============================================================================

  it('returns 502 when transcription service throws AssemblyAITranscriptionError', async () => {
    const audioPath = `${testUser.sub}/test-audio.webm`;

    // Mock public URL generation
    mockSupabase._mocks.getPublicUrl.mockReturnValue({
      data: {
        publicUrl: `https://example.supabase.co/storage/v1/object/public/decision-audio/${audioPath}`,
      },
    });

    // Mock transcription error
    const error = new AssemblyAITranscriptionError(
      'Audio file could not be processed',
      'transcription_error',
      false
    );
    mockTranscriptionService.transcribe.mockRejectedValue(error);

    const token = createTestToken(app, testUser);

    const response = await app.inject({
      method: 'POST',
      url: '/api/transcription',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      payload: JSON.stringify({ audioPath }),
    });

    expect(response.statusCode).toBe(502);

    const body = JSON.parse(response.body);
    expect(body.statusCode).toBe(502);
    expect(body.error).toBe('Bad Gateway');
    expect(body.message).toContain('Audio file could not be processed');
    expect(body.details).toEqual({
      code: 'transcription_error',
      retryable: false,
    });
  });

  it('returns 502 with retryable flag when transcription service has network error', async () => {
    const audioPath = `${testUser.sub}/test-audio.webm`;

    // Mock public URL generation
    mockSupabase._mocks.getPublicUrl.mockReturnValue({
      data: {
        publicUrl: `https://example.supabase.co/storage/v1/object/public/decision-audio/${audioPath}`,
      },
    });

    // Mock network error
    const error = new AssemblyAITranscriptionError('Network request failed', 'network_error', true);
    mockTranscriptionService.transcribe.mockRejectedValue(error);

    const token = createTestToken(app, testUser);

    const response = await app.inject({
      method: 'POST',
      url: '/api/transcription',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      payload: JSON.stringify({ audioPath }),
    });

    expect(response.statusCode).toBe(502);

    const body = JSON.parse(response.body);
    expect(body.statusCode).toBe(502);
    expect(body.details.retryable).toBe(true);
  });

  it('returns 502 when transcription service throws generic Error', async () => {
    const audioPath = `${testUser.sub}/test-audio.webm`;

    // Mock public URL generation
    mockSupabase._mocks.getPublicUrl.mockReturnValue({
      data: {
        publicUrl: `https://example.supabase.co/storage/v1/object/public/decision-audio/${audioPath}`,
      },
    });

    // Mock generic error
    mockTranscriptionService.transcribe.mockRejectedValue(new Error('Something went wrong'));

    const token = createTestToken(app, testUser);

    const response = await app.inject({
      method: 'POST',
      url: '/api/transcription',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      payload: JSON.stringify({ audioPath }),
    });

    expect(response.statusCode).toBe(502);

    const body = JSON.parse(response.body);
    expect(body.statusCode).toBe(502);
    expect(body.error).toBe('Bad Gateway');
    expect(body.message).toContain('Something went wrong');
  });

  it('returns 502 when transcription service throws non-Error object', async () => {
    const audioPath = `${testUser.sub}/test-audio.webm`;

    // Mock public URL generation
    mockSupabase._mocks.getPublicUrl.mockReturnValue({
      data: {
        publicUrl: `https://example.supabase.co/storage/v1/object/public/decision-audio/${audioPath}`,
      },
    });

    // Mock non-Error thrown
    mockTranscriptionService.transcribe.mockRejectedValue('string error');

    const token = createTestToken(app, testUser);

    const response = await app.inject({
      method: 'POST',
      url: '/api/transcription',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      payload: JSON.stringify({ audioPath }),
    });

    expect(response.statusCode).toBe(502);

    const body = JSON.parse(response.body);
    expect(body.statusCode).toBe(502);
    expect(body.error).toBe('Bad Gateway');
    expect(body.message).toContain('Unknown transcription error');
  });

  // ============================================================================
  // Service integration tests
  // ============================================================================

  it('calls transcription service with correct URL from audioPath', async () => {
    const audioPath = `${testUser.sub}/my-recording.webm`;
    const expectedPublicUrl = `https://example.supabase.co/storage/v1/object/public/decision-audio/${audioPath}`;

    // Mock public URL generation
    mockSupabase._mocks.getPublicUrl.mockReturnValue({
      data: { publicUrl: expectedPublicUrl },
    });

    // Mock successful transcription
    mockTranscriptionService.transcribe.mockResolvedValue({
      text: 'Test transcription',
      confidence: 0.9,
      words: [],
    });

    const token = createTestToken(app, testUser);

    await app.inject({
      method: 'POST',
      url: '/api/transcription',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      payload: JSON.stringify({ audioPath }),
    });

    // Verify storage.from was called with correct bucket
    expect(mockSupabase.storage.from).toHaveBeenCalledWith('decision-audio');

    // Verify getPublicUrl was called with correct path
    expect(mockSupabase._mocks.getPublicUrl).toHaveBeenCalledWith(audioPath);

    // Verify transcription service was called with generated public URL
    expect(mockTranscriptionService.transcribe).toHaveBeenCalledWith(expectedPublicUrl);
  });

  it('prefers audioPath over audioUrl when both are provided', async () => {
    const audioPath = `${testUser.sub}/path-audio.webm`;
    const audioUrl = `https://example.com/url-audio.webm`;
    const expectedPublicUrl = `https://example.supabase.co/storage/v1/object/public/decision-audio/${audioPath}`;

    // Mock public URL generation
    mockSupabase._mocks.getPublicUrl.mockReturnValue({
      data: { publicUrl: expectedPublicUrl },
    });

    // Mock successful transcription
    mockTranscriptionService.transcribe.mockResolvedValue({
      text: 'Test',
      confidence: 0.9,
      words: [],
    });

    const token = createTestToken(app, testUser);

    await app.inject({
      method: 'POST',
      url: '/api/transcription',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      payload: JSON.stringify({ audioPath, audioUrl }),
    });

    // Verify transcription service was called with public URL from audioPath, not audioUrl
    expect(mockTranscriptionService.transcribe).toHaveBeenCalledWith(expectedPublicUrl);
  });

  it('only returns text and confidence in response (not words)', async () => {
    const audioPath = `${testUser.sub}/test-audio.webm`;

    // Mock public URL generation
    mockSupabase._mocks.getPublicUrl.mockReturnValue({
      data: {
        publicUrl: `https://example.supabase.co/storage/v1/object/public/decision-audio/${audioPath}`,
      },
    });

    // Mock transcription with words
    mockTranscriptionService.transcribe.mockResolvedValue({
      text: 'Hello world',
      confidence: 0.95,
      words: [
        { text: 'Hello', start: 0, end: 200, confidence: 0.98 },
        { text: 'world', start: 200, end: 400, confidence: 0.92 },
      ],
    });

    const token = createTestToken(app, testUser);

    const response = await app.inject({
      method: 'POST',
      url: '/api/transcription',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      payload: JSON.stringify({ audioPath }),
    });

    expect(response.statusCode).toBe(200);

    const body = JSON.parse(response.body);
    expect(body.text).toBe('Hello world');
    expect(body.confidence).toBe(0.95);
    // Words should NOT be in the response per PRD specification
    expect(body.words).toBeUndefined();
  });
});
