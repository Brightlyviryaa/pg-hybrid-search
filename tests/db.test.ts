import { jest } from '@jest/globals';
import { mockPool, mockDbClient, resetMocks } from './mocks.js';

// Mock the pg module (require mocks inside factory to avoid hoist issues)
let __lastPoolArgs: any;
jest.mock('pg', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { mockPool } = require('./mocks.js');
  return {
    Pool: jest.fn().mockImplementation((opts: any) => { __lastPoolArgs = opts; return mockPool; })
  };
});

// Import db module after mocking 'pg'
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { pool, withClient } = require('../src/db.js');

describe('Database Module Tests', () => {
  beforeEach(() => {
    resetMocks();
  });
  afterEach(() => {
    // Ensure pool.connect resolves by default for unrelated tests
    mockPool.connect.mockResolvedValue(mockDbClient);
  });

  describe('pool', () => {
    test('should create pool instance', () => {
      expect(pool).toBeDefined();
      expect(typeof pool.connect).toBe('function');
      expect(typeof pool.end).toBe('function');
    });

    test('should use DATABASE_URL from environment', () => {
      expect(__lastPoolArgs).toEqual({
        connectionString: process.env.DATABASE_URL
      });
    });

    test('should handle missing DATABASE_URL', () => {
      const originalUrl = process.env.DATABASE_URL;
      const originalDotenvPath = process.env.DOTENV_CONFIG_PATH;
      delete process.env.DATABASE_URL;
      // Prevent dotenv/config from loading project .env on re-require
      process.env.DOTENV_CONFIG_PATH = '/dev/null';

      // Reimport to test without DATABASE_URL
      jest.resetModules();
      // Re-require db module to trigger Pool construction with updated env
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('../src/db.js');

      expect(__lastPoolArgs).toEqual({
        connectionString: undefined
      });

      // Restore
      if (originalUrl) {
        process.env.DATABASE_URL = originalUrl;
      }
      if (originalDotenvPath) {
        process.env.DOTENV_CONFIG_PATH = originalDotenvPath;
      } else {
        delete process.env.DOTENV_CONFIG_PATH;
      }
    });

    test('should be reusable across multiple calls', async () => {
      await pool.connect();
      await pool.connect();
      
      expect(mockPool.connect).toHaveBeenCalledTimes(2);
    });

    test('should handle pool connection errors', async () => {
      mockPool.connect.mockRejectedValue(new Error('Connection failed'));

      await expect(pool.connect()).rejects.toThrow('Connection failed');
    });

    test('should handle pool end correctly', async () => {
      await pool.end();
      
      expect(mockPool.end).toHaveBeenCalledTimes(1);
    });
  });

  describe('withClient()', () => {
    test('should execute function with database client', async () => {
      const testFunction = (jest.fn() as any).mockResolvedValue('test result');
      
      const result = await withClient(testFunction as any);
      
      expect(result).toBe('test result');
      expect(mockPool.connect).toHaveBeenCalledTimes(1);
      expect(testFunction).toHaveBeenCalledWith(mockDbClient);
      expect(mockDbClient.release).toHaveBeenCalledTimes(1);
    });

    test('should release client even if function throws error', async () => {
      const testFunction = (jest.fn() as any).mockRejectedValue(new Error('Test error'));
      
      await expect(withClient(testFunction as any)).rejects.toThrow('Test error');
      
      expect(mockPool.connect).toHaveBeenCalledTimes(1);
      expect(testFunction).toHaveBeenCalledWith(mockDbClient);
      expect(mockDbClient.release).toHaveBeenCalledTimes(1);
    });

    test('should handle different return types', async () => {
      const testCases = [
        { fn: (jest.fn() as any).mockResolvedValue(42), expected: 42 },
        { fn: (jest.fn() as any).mockResolvedValue('string'), expected: 'string' },
        { fn: (jest.fn() as any).mockResolvedValue([1, 2, 3]), expected: [1, 2, 3] },
        { fn: (jest.fn() as any).mockResolvedValue({ key: 'value' }), expected: { key: 'value' } },
        { fn: (jest.fn() as any).mockResolvedValue(null), expected: null },
        { fn: (jest.fn() as any).mockResolvedValue(undefined), expected: undefined }
      ];

      for (const testCase of testCases) {
        const result = await withClient(testCase.fn as any);
        expect(result).toEqual(testCase.expected);
        expect(mockDbClient.release).toHaveBeenCalled();
      }
    });

    test('should handle connection acquisition errors', async () => {
      mockPool.connect.mockRejectedValue(new Error('Pool exhausted'));
      const testFunction = jest.fn();

      await expect(withClient(testFunction as any)).rejects.toThrow('Pool exhausted');
      expect(testFunction).not.toHaveBeenCalled();
    });

    test('should handle async functions correctly', async () => {
      const asyncFunction = jest.fn().mockImplementation(async (client) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'async result';
      });

      const result = await withClient(asyncFunction as any);

      expect(result).toBe('async result');
      expect(asyncFunction).toHaveBeenCalledWith(mockDbClient);
      expect(mockDbClient.release).toHaveBeenCalledTimes(1);
    });

    test('should maintain proper client lifecycle with multiple operations', async () => {
      const multiOperationFunction = jest.fn().mockImplementation(async (client: any) => {
        await client.query('SELECT 1');
        await client.query('SELECT 2');
        return 'multi-op result';
      });

      mockDbClient.query.mockResolvedValue({ rows: [] });

      const result = await withClient(multiOperationFunction as any);

      expect(result).toBe('multi-op result');
      expect(mockDbClient.query).toHaveBeenCalledTimes(2);
      expect(mockDbClient.query).toHaveBeenCalledWith('SELECT 1');
      expect(mockDbClient.query).toHaveBeenCalledWith('SELECT 2');
      expect(mockDbClient.release).toHaveBeenCalledTimes(1);
    });

    test('should handle concurrent withClient calls', async () => {
      const fn1 = (jest.fn() as any).mockResolvedValue('result1');
      const fn2 = (jest.fn() as any).mockResolvedValue('result2');
      const fn3 = (jest.fn() as any).mockResolvedValue('result3');

      const results = await Promise.all([
        withClient(fn1 as any),
        withClient(fn2 as any),
        withClient(fn3 as any)
      ]);

      expect(results).toEqual(['result1', 'result2', 'result3']);
      expect(mockPool.connect).toHaveBeenCalledTimes(3);
      expect(mockDbClient.release).toHaveBeenCalledTimes(3);
    });
  });
});
