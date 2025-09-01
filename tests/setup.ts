import 'dotenv/config';

// Force test environment variables (override any real .env) for deterministic tests
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/test_db';
process.env.OPENAI_API_KEY = 'sk-test-key';
process.env.VOYAGE_API_KEY = 'pa-test-key';

// Provide a typed jest mock for global.fetch
// Use any to avoid strict type issues across tests
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).fetch = (jest.fn() as any);

// Reset mocks before each test: clear calls but keep implementations
beforeEach(() => {
  jest.clearAllMocks();
});
