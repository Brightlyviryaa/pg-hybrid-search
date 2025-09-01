import { jest } from '@jest/globals';
import { add, remove, search, destroy } from '../src/search.js';
import { mockPool, mockDbClient, mockInsertResult, mockSearchQueryResult, mockEmbeddingResponse, resetMocks } from './mocks.js';

// Mock the database module
jest.mock('../src/db.js', () => {
  // Require inside factory to avoid hoist/initialization issues
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { mockPool, mockDbClient } = require('./mocks.js');
  return {
    pool: mockPool,
    withClient: (jest.fn().mockImplementation(async (fn: any) => {
      const client = mockDbClient as any;
      return await (fn as any)(client);
    }) as any)
  };
});

// Mock the embedding module
jest.mock('../src/embedding.js', () => ({
  // Cast the mock function before chaining to avoid TS generic issues
  embedTextOpenAI: ((jest.fn() as any).mockResolvedValue(Array.from({ length: 1536 }, () => Math.random())))
}));

describe('Functional API - Search Module Tests', () => {
  beforeEach(() => {
    resetMocks();
    (global.fetch as any).mockResolvedValue(mockEmbeddingResponse);
    // Ensure embedding mock is reset to resolve by default
    const { embedTextOpenAI } = require('../src/embedding.js');
    (embedTextOpenAI as any).mockResolvedValue(Array.from({ length: 1536 }, () => Math.random()));
  });

  describe('add()', () => {
    beforeEach(() => {
      mockDbClient.query.mockResolvedValue(mockInsertResult);
    });

    test('should add document to default index', async () => {
      const content = 'Machine learning revolutionizes data analysis';
      
      const result = await add(content);
      
      expect(result).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(mockDbClient.query).toHaveBeenCalledWith(
        'INSERT INTO vector_table (index_name, raw_content, embedding) VALUES ($1, $2, $3::vector) RETURNING id',
        ['default', content, expect.any(String)]
      );
    });

    test('should add document to specified index', async () => {
      const content = 'PostgreSQL provides excellent search capabilities';
      const indexName = 'documents';
      
      const result = await add(content, indexName);
      
      expect(result).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(mockDbClient.query).toHaveBeenCalledWith(
        'INSERT INTO vector_table (index_name, raw_content, embedding) VALUES ($1, $2, $3::vector) RETURNING id',
        [indexName, content, expect.any(String)]
      );
    });

    test('should handle different content lengths', async () => {
      const testCases = [
        'Short text',
        'Medium length text with some more details about the content',
        'Very long text content that contains extensive information and detailed descriptions that would typically be found in comprehensive documentation or articles with multiple paragraphs and complex information structures'
      ];

      for (const content of testCases) {
        mockDbClient.query.mockResolvedValue({ rows: [{ id: `uuid-${content.length}` }] });
        
        const result = await add(content, 'test');
        
        expect(result).toBe(`uuid-${content.length}`);
        expect(mockDbClient.query).toHaveBeenCalledWith(
          'INSERT INTO vector_table (index_name, raw_content, embedding) VALUES ($1, $2, $3::vector) RETURNING id',
          ['test', content, expect.any(String)]
        );
      }
    });

    test('should handle database errors', async () => {
      const content = 'Test content';
      mockDbClient.query.mockRejectedValue(new Error('Database connection failed'));
      
      await expect(add(content)).rejects.toThrow('Database connection failed');
    });

    test('should handle embedding generation errors', async () => {
      const { embedTextOpenAI } = require('../src/embedding.js');
      embedTextOpenAI.mockRejectedValue(new Error('OpenAI API error'));
      
      const content = 'Test content';
      
      await expect(add(content)).rejects.toThrow('OpenAI API error');
    });
  });

  describe('remove()', () => {
    beforeEach(() => {
      mockDbClient.query.mockResolvedValue({ rowCount: 1 });
    });

    test('should remove document by ID only', async () => {
      const documentId = '123e4567-e89b-12d3-a456-426614174000';
      
      await remove(documentId);
      
      expect(mockDbClient.query).toHaveBeenCalledWith(
        'DELETE FROM vector_table WHERE id = $1',
        [documentId]
      );
    });

    test('should remove document by ID and index name', async () => {
      const documentId = '123e4567-e89b-12d3-a456-426614174000';
      const indexName = 'movies';
      
      await remove(documentId, indexName);
      
      expect(mockDbClient.query).toHaveBeenCalledWith(
        'DELETE FROM vector_table WHERE id = $1 AND index_name = $2',
        [documentId, indexName]
      );
    });

    test('should handle different UUID formats', async () => {
      const testUUIDs = [
        '123e4567-e89b-12d3-a456-426614174000',
        '00000000-0000-0000-0000-000000000000',
        'ffffffff-ffff-ffff-ffff-ffffffffffff',
        '987fcdeb-51a2-43d1-b678-123456789abc',
        'abcdefgh-1234-5678-9012-abcdefghijkl'
      ];

      for (const uuid of testUUIDs) {
        await remove(uuid, 'test');
        expect(mockDbClient.query).toHaveBeenCalledWith(
          'DELETE FROM vector_table WHERE id = $1 AND index_name = $2',
          [uuid, 'test']
        );
      }
    });

    test('should handle database errors', async () => {
      const documentId = '123e4567-e89b-12d3-a456-426614174000';
      mockDbClient.query.mockRejectedValue(new Error('Document not found'));
      
      await expect(remove(documentId)).rejects.toThrow('Document not found');
    });

    test('should not return any value', async () => {
      const documentId = '123e4567-e89b-12d3-a456-426614174000';
      
      const result = await remove(documentId);
      
      expect(result).toBeUndefined();
    });
  });

  describe('search()', () => {
    beforeEach(() => {
      mockDbClient.query.mockResolvedValue(mockSearchQueryResult);
    });

    test('should perform hybrid search with default parameters', async () => {
      const options = { query: 'machine learning algorithms' };
      
      const results = await search(options);
      
      expect(results).toEqual(mockSearchQueryResult.rows);
      expect(mockDbClient.query).toHaveBeenCalledWith(
        expect.stringContaining('WITH scored AS'),
        expect.arrayContaining([expect.any(String), 'machine learning algorithms', 'default', 0.7, 0.3, 10])
      );
    });

    test('should perform vector-only search', async () => {
      const options = {
        query: 'artificial intelligence',
        vectorOnly: true,
        limit: 15,
        indexName: 'articles'
      };
      
      const results = await search(options);
      
      expect(results).toEqual(mockSearchQueryResult.rows);
      expect(mockDbClient.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id, raw_content, created_at, updated_at'),
        [expect.any(String), 'articles', 15]
      );
    });

    test('should perform search with custom weights', async () => {
      const options = {
        query: 'space exploration',
        limit: 10,
        indexName: 'movies',
        weights: { vectorW: 0.9, textW: 0.1 }
      };
      
      const results = await search(options);
      
      expect(results).toEqual(mockSearchQueryResult.rows);
      expect(mockDbClient.query).toHaveBeenCalledWith(
        expect.stringContaining('WITH scored AS'),
        expect.arrayContaining([expect.any(String), 'space exploration', 'movies', 0.9, 0.1, 10])
      );
    });

    test('should handle different index names', async () => {
      const testIndexes = ['movies', 'books', 'products', 'documents', 'articles'];
      
      for (const indexName of testIndexes) {
        await search({ query: 'test query', indexName });
        expect(mockDbClient.query).toHaveBeenCalledWith(
          expect.stringContaining('WITH scored AS'),
          expect.arrayContaining([expect.any(String), 'test query', indexName, 0.7, 0.3, 10])
        );
      }
    });

    test('should handle embedding generation errors', async () => {
      const { embedTextOpenAI } = require('../src/embedding.js');
      embedTextOpenAI.mockRejectedValue(new Error('OpenAI API rate limit'));
      
      const options = { query: 'test query' };
      
      await expect(search(options)).rejects.toThrow('OpenAI API rate limit');
    });
  });

  describe('destroy()', () => {
    test('should delete all rows for a given index and return count', async () => {
      mockDbClient.query.mockResolvedValue({ rowCount: 12 });

      const count = await destroy('movies');

      expect(count).toBe(12);
      expect(mockDbClient.query).toHaveBeenCalledWith(
        'DELETE FROM vector_table WHERE index_name = $1',
        ['movies']
      );
    });

    test('should handle zero rows deleted', async () => {
      mockDbClient.query.mockResolvedValue({ rowCount: 0 });

      const count = await destroy('empty');
      expect(count).toBe(0);
    });

    test('should propagate database errors', async () => {
      mockDbClient.query.mockRejectedValue(new Error('permission denied'));
      await expect(destroy('restricted')).rejects.toThrow('permission denied');
    });
  });
});
