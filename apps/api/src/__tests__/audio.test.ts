import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import multipart from '@fastify/multipart';
import authPlugin from '../plugins/auth';
import audioRoutes from '../routes/audio';

// Mock the supabase module
vi.mock('../lib/supabase', () => ({
  getSupabase: vi.fn(),
}));

// Mock crypto.randomUUID for predictable file names
vi.mock('crypto', () => ({
  randomUUID: vi.fn(() => '12345678-1234-1234-1234-123456789abc'),
}));

// Import after mock setup
import { getSupabase } from '../lib/supabase';

// Test JWT secret - only used for testing
const TEST_JWT_SECRET = 'test-secret-key-for-jwt-testing-only';

// Create mock Supabase client with storage
const createMockSupabase = () => {
  const mockUpload = vi.fn();
  const mockGetPublicUrl = vi.fn();
  const mockFrom = vi.fn();

  mockFrom.mockReturnValue({
    upload: mockUpload,
    getPublicUrl: mockGetPublicUrl,
  });

  return {
    storage: {
      from: mockFrom,
    },
    _mocks: {
      upload: mockUpload,
      getPublicUrl: mockGetPublicUrl,
      from: mockFrom,
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

/**
 * Helper to create multipart form data payload for testing
 */
function createMultipartPayload(
  filename: string,
  content: Buffer,
  contentType: string
): { payload: string; boundary: string } {
  const boundary = '----FormBoundary' + Math.random().toString(36).slice(2);
  const CRLF = '\r\n';

  const payload =
    `--${boundary}${CRLF}` +
    `Content-Disposition: form-data; name="audio"; filename="${filename}"${CRLF}` +
    `Content-Type: ${contentType}${CRLF}${CRLF}` +
    content.toString('binary') +
    `${CRLF}--${boundary}--${CRLF}`;

  return { payload, boundary };
}

describe('POST /api/audio/upload', () => {
  let app: FastifyInstance;
  let mockSupabase: ReturnType<typeof createMockSupabase>;

  const testUser = {
    sub: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    role: 'authenticated',
  };

  beforeAll(async () => {
    app = Fastify();

    // Register multipart plugin
    await app.register(multipart, {
      limits: {
        fileSize: 52428800, // 50MB (server-wide, route validates 10MB)
      },
    });

    // Register auth plugin with test secret
    await app.register(authPlugin, {
      jwtSecret: TEST_JWT_SECRET,
    });

    // Register audio routes
    await app.register(audioRoutes, { prefix: '/api/audio' });

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

  it('returns 201 with upload info when uploading valid audio file', async () => {
    const audioContent = Buffer.from('fake audio content');

    // Mock successful upload
    mockSupabase._mocks.upload.mockResolvedValue({
      data: { path: `${testUser.sub}/12345678-1234-1234-1234-123456789abc.webm` },
      error: null,
    });

    // Mock public URL
    mockSupabase._mocks.getPublicUrl.mockReturnValue({
      data: {
        publicUrl:
          'https://storage.supabase.co/decision-audio/123e4567-e89b-12d3-a456-426614174000/12345678-1234-1234-1234-123456789abc.webm',
      },
    });

    const token = createTestToken(app, testUser);
    const { payload, boundary } = createMultipartPayload(
      'recording.webm',
      audioContent,
      'audio/webm'
    );

    const response = await app.inject({
      method: 'POST',
      url: '/api/audio/upload',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload: Buffer.from(payload, 'binary'),
    });

    expect(response.statusCode).toBe(201);

    const body = JSON.parse(response.body);
    expect(body.url).toBe(
      'https://storage.supabase.co/decision-audio/123e4567-e89b-12d3-a456-426614174000/12345678-1234-1234-1234-123456789abc.webm'
    );
    expect(body.path).toBe(`${testUser.sub}/12345678-1234-1234-1234-123456789abc.webm`);
    expect(body.size).toBe(audioContent.length);

    // Verify storage.from was called with correct bucket
    expect(mockSupabase.storage.from).toHaveBeenCalledWith('decision-audio');
  });

  it('returns 201 with correct extension for audio/mp4', async () => {
    const audioContent = Buffer.from('fake mp4 audio');

    mockSupabase._mocks.upload.mockResolvedValue({
      data: { path: `${testUser.sub}/12345678-1234-1234-1234-123456789abc.mp4` },
      error: null,
    });

    mockSupabase._mocks.getPublicUrl.mockReturnValue({
      data: { publicUrl: 'https://storage.supabase.co/decision-audio/test.mp4' },
    });

    const token = createTestToken(app, testUser);
    const { payload, boundary } = createMultipartPayload('recording.mp4', audioContent, 'audio/mp4');

    const response = await app.inject({
      method: 'POST',
      url: '/api/audio/upload',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload: Buffer.from(payload, 'binary'),
    });

    expect(response.statusCode).toBe(201);

    // Verify upload was called with correct path including .mp4 extension
    expect(mockSupabase._mocks.upload).toHaveBeenCalledWith(
      `${testUser.sub}/12345678-1234-1234-1234-123456789abc.mp4`,
      expect.any(Buffer),
      expect.objectContaining({ contentType: 'audio/mp4' })
    );
  });

  it('returns 201 with correct extension for audio/wav', async () => {
    const audioContent = Buffer.from('fake wav audio');

    mockSupabase._mocks.upload.mockResolvedValue({
      data: { path: `${testUser.sub}/12345678-1234-1234-1234-123456789abc.wav` },
      error: null,
    });

    mockSupabase._mocks.getPublicUrl.mockReturnValue({
      data: { publicUrl: 'https://storage.supabase.co/decision-audio/test.wav' },
    });

    const token = createTestToken(app, testUser);
    const { payload, boundary } = createMultipartPayload('recording.wav', audioContent, 'audio/wav');

    const response = await app.inject({
      method: 'POST',
      url: '/api/audio/upload',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload: Buffer.from(payload, 'binary'),
    });

    expect(response.statusCode).toBe(201);

    // Verify upload was called with correct path including .wav extension
    expect(mockSupabase._mocks.upload).toHaveBeenCalledWith(
      `${testUser.sub}/12345678-1234-1234-1234-123456789abc.wav`,
      expect.any(Buffer),
      expect.objectContaining({ contentType: 'audio/wav' })
    );
  });

  it('returns 400 when no file is provided', async () => {
    const token = createTestToken(app, testUser);
    const boundary = '----FormBoundary' + Math.random().toString(36).slice(2);

    // Empty multipart with no file
    const payload = `--${boundary}--\r\n`;

    const response = await app.inject({
      method: 'POST',
      url: '/api/audio/upload',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload: Buffer.from(payload),
    });

    expect(response.statusCode).toBe(400);

    const body = JSON.parse(response.body);
    expect(body.statusCode).toBe(400);
    expect(body.error).toBe('Bad Request');
    expect(body.message).toBe('No audio file provided');
  });

  it('returns 415 when file type is not audio', async () => {
    const textContent = Buffer.from('not an audio file');

    const token = createTestToken(app, testUser);
    const { payload, boundary } = createMultipartPayload('file.txt', textContent, 'text/plain');

    const response = await app.inject({
      method: 'POST',
      url: '/api/audio/upload',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload: Buffer.from(payload, 'binary'),
    });

    expect(response.statusCode).toBe(415);

    const body = JSON.parse(response.body);
    expect(body.statusCode).toBe(415);
    expect(body.error).toBe('Unsupported Media Type');
    expect(body.message).toContain('Invalid file type');
    expect(body.message).toContain('text/plain');
  });

  it('returns 415 when file type is image', async () => {
    const imageContent = Buffer.from('fake image content');

    const token = createTestToken(app, testUser);
    const { payload, boundary } = createMultipartPayload('image.png', imageContent, 'image/png');

    const response = await app.inject({
      method: 'POST',
      url: '/api/audio/upload',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload: Buffer.from(payload, 'binary'),
    });

    expect(response.statusCode).toBe(415);

    const body = JSON.parse(response.body);
    expect(body.statusCode).toBe(415);
    expect(body.error).toBe('Unsupported Media Type');
    expect(body.message).toContain('image/png');
  });

  it('returns 413 when file exceeds 10MB limit', async () => {
    // Create a buffer slightly over 10MB
    const largeContent = Buffer.alloc(10 * 1024 * 1024 + 100);

    const token = createTestToken(app, testUser);
    const { payload, boundary } = createMultipartPayload(
      'large.webm',
      largeContent,
      'audio/webm'
    );

    const response = await app.inject({
      method: 'POST',
      url: '/api/audio/upload',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload: Buffer.from(payload, 'binary'),
    });

    expect(response.statusCode).toBe(413);

    const body = JSON.parse(response.body);
    expect(body.statusCode).toBe(413);
    expect(body.error).toBe('Payload Too Large');
    expect(body.message).toContain('10MB');
  });

  it('returns 500 when Supabase upload fails', async () => {
    const audioContent = Buffer.from('fake audio content');

    // Mock upload failure
    mockSupabase._mocks.upload.mockResolvedValue({
      data: null,
      error: { message: 'Storage service unavailable' },
    });

    const token = createTestToken(app, testUser);
    const { payload, boundary } = createMultipartPayload(
      'recording.webm',
      audioContent,
      'audio/webm'
    );

    const response = await app.inject({
      method: 'POST',
      url: '/api/audio/upload',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload: Buffer.from(payload, 'binary'),
    });

    expect(response.statusCode).toBe(500);

    const body = JSON.parse(response.body);
    expect(body.statusCode).toBe(500);
    expect(body.error).toBe('Internal Server Error');
    expect(body.message).toBe('Failed to upload audio file to storage');
  });

  it('returns 401 when no token is provided', async () => {
    const audioContent = Buffer.from('fake audio content');
    const { payload, boundary } = createMultipartPayload(
      'recording.webm',
      audioContent,
      'audio/webm'
    );

    const response = await app.inject({
      method: 'POST',
      url: '/api/audio/upload',
      headers: {
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload: Buffer.from(payload, 'binary'),
    });

    expect(response.statusCode).toBe(401);

    const body = JSON.parse(response.body);
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 401 when invalid token is provided', async () => {
    const audioContent = Buffer.from('fake audio content');
    const { payload, boundary } = createMultipartPayload(
      'recording.webm',
      audioContent,
      'audio/webm'
    );

    const response = await app.inject({
      method: 'POST',
      url: '/api/audio/upload',
      headers: {
        authorization: 'Bearer invalid-token',
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload: Buffer.from(payload, 'binary'),
    });

    expect(response.statusCode).toBe(401);

    const body = JSON.parse(response.body);
    expect(body.error).toBe('Unauthorized');
  });

  it('uploads file to user-specific path in storage', async () => {
    const audioContent = Buffer.from('fake audio');

    mockSupabase._mocks.upload.mockResolvedValue({
      data: { path: `${testUser.sub}/12345678-1234-1234-1234-123456789abc.webm` },
      error: null,
    });

    mockSupabase._mocks.getPublicUrl.mockReturnValue({
      data: { publicUrl: 'https://storage.supabase.co/test.webm' },
    });

    const token = createTestToken(app, testUser);
    const { payload, boundary } = createMultipartPayload(
      'recording.webm',
      audioContent,
      'audio/webm'
    );

    await app.inject({
      method: 'POST',
      url: '/api/audio/upload',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload: Buffer.from(payload, 'binary'),
    });

    // Verify the upload path includes the user ID
    expect(mockSupabase._mocks.upload).toHaveBeenCalledWith(
      expect.stringContaining(testUser.sub),
      expect.any(Buffer),
      expect.any(Object)
    );

    // Verify correct bucket was used
    expect(mockSupabase.storage.from).toHaveBeenCalledWith('decision-audio');
  });

  it('sets correct content type in upload options', async () => {
    const audioContent = Buffer.from('fake audio');

    mockSupabase._mocks.upload.mockResolvedValue({
      data: { path: 'test.webm' },
      error: null,
    });

    mockSupabase._mocks.getPublicUrl.mockReturnValue({
      data: { publicUrl: 'https://storage.supabase.co/test.webm' },
    });

    const token = createTestToken(app, testUser);
    const { payload, boundary } = createMultipartPayload(
      'recording.webm',
      audioContent,
      'audio/webm'
    );

    await app.inject({
      method: 'POST',
      url: '/api/audio/upload',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload: Buffer.from(payload, 'binary'),
    });

    // Verify upload options include correct content type
    expect(mockSupabase._mocks.upload).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Buffer),
      expect.objectContaining({
        contentType: 'audio/webm',
        upsert: false,
      })
    );
  });

  it('accepts audio/mpeg (mp3) files', async () => {
    const audioContent = Buffer.from('fake mp3 audio');

    mockSupabase._mocks.upload.mockResolvedValue({
      data: { path: `${testUser.sub}/12345678-1234-1234-1234-123456789abc.mp3` },
      error: null,
    });

    mockSupabase._mocks.getPublicUrl.mockReturnValue({
      data: { publicUrl: 'https://storage.supabase.co/test.mp3' },
    });

    const token = createTestToken(app, testUser);
    const { payload, boundary } = createMultipartPayload('recording.mp3', audioContent, 'audio/mpeg');

    const response = await app.inject({
      method: 'POST',
      url: '/api/audio/upload',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload: Buffer.from(payload, 'binary'),
    });

    expect(response.statusCode).toBe(201);
  });

  it('accepts audio/x-wav files', async () => {
    const audioContent = Buffer.from('fake wav audio');

    mockSupabase._mocks.upload.mockResolvedValue({
      data: { path: `${testUser.sub}/12345678-1234-1234-1234-123456789abc.wav` },
      error: null,
    });

    mockSupabase._mocks.getPublicUrl.mockReturnValue({
      data: { publicUrl: 'https://storage.supabase.co/test.wav' },
    });

    const token = createTestToken(app, testUser);
    const { payload, boundary } = createMultipartPayload('recording.wav', audioContent, 'audio/x-wav');

    const response = await app.inject({
      method: 'POST',
      url: '/api/audio/upload',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload: Buffer.from(payload, 'binary'),
    });

    expect(response.statusCode).toBe(201);
  });

  it('returns correct file size in response', async () => {
    const audioContent = Buffer.from('audio content with known length');

    mockSupabase._mocks.upload.mockResolvedValue({
      data: { path: 'test.webm' },
      error: null,
    });

    mockSupabase._mocks.getPublicUrl.mockReturnValue({
      data: { publicUrl: 'https://storage.supabase.co/test.webm' },
    });

    const token = createTestToken(app, testUser);
    const { payload, boundary } = createMultipartPayload(
      'recording.webm',
      audioContent,
      'audio/webm'
    );

    const response = await app.inject({
      method: 'POST',
      url: '/api/audio/upload',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload: Buffer.from(payload, 'binary'),
    });

    expect(response.statusCode).toBe(201);

    const body = JSON.parse(response.body);
    expect(body.size).toBe(audioContent.length);
  });
});
