import { jest } from '@jest/globals';
import { createClient, PgHybridClient, PgHybridIndex } from '../src/client.js';
import { mockPool, mockDbClient, mockInsertResult, mockSearchQueryResult, mockEmbeddingResponse, mockVoyageResponse, resetMocks } from './mocks.js';

// Mock the database module
jest.mock('../src/db.js', () => {
  // Require inside factory to avoid hoist/initialization issues
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { mockPool, mockDbClient } = require('./mocks.js');
  return {
    pool: mockPool,
    // Loosen types to avoid TS 'unknown' issues in tests
    withClient: (jest.fn().mockImplementation(async (fn: any) => {
      const client = mockDbClient as any;
      return await (fn as any)(client);
    }) as any)
  };
});

// Mock the search module
jest.mock('../src/search.js', () => ({
  add: jest.fn(),
  remove: jest.fn(),
  search: jest.fn(),
  destroy: jest.fn()
}));

// Mock the rerank module
jest.mock('../src/rerank.js', () => ({
  searchHybridWithRerank: jest.fn()
}));

describe('Client API Tests', () => {
  beforeEach(() => {
    resetMocks();
    // Mock fetch for embedding and rerank APIs
    (global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('openai.com')) {
        return Promise.resolve(mockEmbeddingResponse);
      }
      if (url.includes('voyageai.com')) {
        return Promise.resolve(mockVoyageResponse);
      }
      return Promise.reject(new Error('Unknown URL'));
    });
  });

  describe('createClient()', () => {
    test('should create a new PgHybridClient instance', () => {
      const client = createClient();
      
      expect(client).toBeInstanceOf(PgHybridClient);
      expect(typeof client.index).toBe('function');
    });

    test('should return the same client type consistently', () => {
      const client1 = createClient();
      const client2 = createClient();
      
      expect(client1).toBeInstanceOf(PgHybridClient);
      expect(client2).toBeInstanceOf(PgHybridClient);
      expect(typeof client1.index).toBe('function');
      expect(typeof client2.index).toBe('function');
    });

    test('should create independent client instances', () => {
      const client1 = createClient();
      const client2 = createClient();
      
      expect(client1).not.toBe(client2);
    });

    test('should have index method available', () => {
      const client = createClient();
      
      expect(client.index).toBeDefined();
      expect(typeof client.index).toBe('function');
    });

    test('should not require any parameters', () => {
      expect(() => createClient()).not.toThrow();
      
      const client = createClient();
      expect(client).toBeDefined();
    });
  });

  describe('client.index()', () => {
    let client: PgHybridClient;

    beforeEach(() => {
      client = createClient();
    });

    test('should create a new PgHybridIndex instance', () => {
      const index = client.index('movies');
      
      expect(index).toBeInstanceOf(PgHybridIndex);
      expect(typeof index.add).toBe('function');
      expect(typeof index.remove).toBe('function');
      expect(typeof index.search).toBe('function');
    });

    test('should create index with correct name', () => {
      const moviesIndex = client.index('movies');
      const booksIndex = client.index('books');
      
      expect(moviesIndex).toBeInstanceOf(PgHybridIndex);
      expect(booksIndex).toBeInstanceOf(PgHybridIndex);
      expect(moviesIndex).not.toBe(booksIndex);
    });

    test('should accept different index names', () => {
      const testCases = ['movies', 'books', 'products', 'documents', 'articles'];
      
      testCases.forEach(indexName => {
        const index = client.index(indexName);
        expect(index).toBeInstanceOf(PgHybridIndex);
      });
    });

    test('should create new instances for each call', () => {
      const index1 = client.index('movies');
      const index2 = client.index('movies');
      
      expect(index1).not.toBe(index2);
    });

    test('should handle missing index name at runtime (not recommended)', () => {
      // Runtime does not throw; ensure method returns an index instance
      const idx = (client as any).index();
      expect(idx).toBeInstanceOf(PgHybridIndex);
    });
  });

  describe('index.add()', () => {
    let index: PgHybridIndex;
    const { add } = require('../src/search.js');

    beforeEach(() => {
      index = createClient().index('movies');
      add.mockResolvedValue('123e4567-e89b-12d3-a456-426614174000');
    });

    test('should add document and return UUID', async () => {
      const content = 'Star Wars: A space opera epic with Jedi knights';
      
      const result = await index.add(content);
      
      expect(result).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(add).toHaveBeenCalledWith(content, 'movies', undefined);
    });

    test('should handle different content types', async () => {
      const testContents = [
        'The Matrix: Virtual reality thriller',
        'Blade Runner: Cyberpunk dystopian future',
        'Interstellar: Space exploration sci-fi',
        'A short description',
        'A very long description that contains multiple sentences and detailed information about the content that needs to be indexed for search purposes'
      ];

      for (const content of testContents) {
        add.mockResolvedValue(`uuid-${content.length}`);
        
        const result = await index.add(content);
        
        expect(result).toBe(`uuid-${content.length}`);
        expect(add).toHaveBeenCalledWith(content, 'movies', undefined);
      }
    });

    test('should pass correct index name to add function', async () => {
      const moviesIndex = createClient().index('movies');
      const booksIndex = createClient().index('books');
      
      await moviesIndex.add('Movie content');
      await booksIndex.add('Book content');
      
      expect(add).toHaveBeenCalledWith('Movie content', 'movies', undefined);
      expect(add).toHaveBeenCalledWith('Book content', 'books', undefined);
    });

    test('should handle add function errors', async () => {
      add.mockRejectedValue(new Error('Database connection failed'));
      
      await expect(index.add('Test content')).rejects.toThrow('Database connection failed');
    });

    test('should return valid UUID format', async () => {
      const validUUID = '123e4567-e89b-12d3-a456-426614174000';
      add.mockResolvedValue(validUUID);
      
      const result = await index.add('Test content');
      
      expect(result).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });
  });

  describe('index.remove()', () => {
    let index: PgHybridIndex;
    const { remove } = require('../src/search.js');

    beforeEach(() => {
      index = createClient().index('movies');
      remove.mockResolvedValue(undefined);
    });

    test('should remove document by ID', async () => {
      const documentId = '123e4567-e89b-12d3-a456-426614174000';
      
      const result = await index.remove(documentId);
      
      expect(result).toBeUndefined();
      expect(remove).toHaveBeenCalledWith(documentId, 'movies');
    });

    test('should handle different UUID formats', async () => {
      const testUUIDs = [
        '123e4567-e89b-12d3-a456-426614174000',
        '987fcdeb-51a2-43d1-b678-123456789abc',
        'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        '00000000-0000-0000-0000-000000000000',
        'ffffffff-ffff-ffff-ffff-ffffffffffff'
      ];

      for (const uuid of testUUIDs) {
        await index.remove(uuid);
        expect(remove).toHaveBeenCalledWith(uuid, 'movies');
      }
    });

    test('should pass correct index name to remove function', async () => {
      const moviesIndex = createClient().index('movies');
      const booksIndex = createClient().index('books');
      const documentId = '123e4567-e89b-12d3-a456-426614174000';
      
      await moviesIndex.remove(documentId);
      await booksIndex.remove(documentId);
      
      expect(remove).toHaveBeenCalledWith(documentId, 'movies');
      expect(remove).toHaveBeenCalledWith(documentId, 'books');
    });

    test('should handle remove function errors', async () => {
      const documentId = '123e4567-e89b-12d3-a456-426614174000';
      remove.mockRejectedValue(new Error('Document not found'));
      
      await expect(index.remove(documentId)).rejects.toThrow('Document not found');
    });

    test('should not return any value', async () => {
      const documentId = '123e4567-e89b-12d3-a456-426614174000';
      
      const result = await index.remove(documentId);
      
      expect(result).toBeUndefined();
    });
  });

  describe('index.search()', () => {
    let index: PgHybridIndex;
    const { search } = require('../src/search.js');
    const { searchHybridWithRerank } = require('../src/rerank.js');

    beforeEach(() => {
      index = createClient().index('movies');
      search.mockResolvedValue(mockSearchQueryResult.rows);
      searchHybridWithRerank.mockResolvedValue(mockSearchQueryResult.rows);
    });

    test('should perform basic search', async () => {
      const options = {
        query: 'space opera with jedi',
        limit: 5
      };
      
      const results = await index.search(options);
      
      expect(results).toEqual(mockSearchQueryResult.rows);
      expect(search).toHaveBeenCalledWith({
        query: 'space opera with jedi',
        limit: 5,
        vectorOnly: false,
        weights: undefined,
        indexName: 'movies'
      });
    });

    test('should perform search with reranking', async () => {
      const options = {
        query: 'epic space battles',
        limit: 5,
        reranking: true,
        topNForRerank: 20
      };
      
      const results = await index.search(options);
      
      expect(results).toEqual(mockSearchQueryResult.rows);
      expect(searchHybridWithRerank).toHaveBeenCalledWith('epic space battles', 5, 20, 'movies');
      expect(search).not.toHaveBeenCalled();
    });

    test('should perform vector-only search', async () => {
      const options = {
        query: 'futuristic AI',
        limit: 10,
        vectorOnly: true
      };
      
      const results = await index.search(options);
      
      expect(results).toEqual(mockSearchQueryResult.rows);
      expect(search).toHaveBeenCalledWith({
        query: 'futuristic AI',
        limit: 10,
        vectorOnly: true,
        weights: undefined,
        indexName: 'movies'
      });
    });

    test('should perform search with custom weights', async () => {
      const options = {
        query: 'cyberpunk dystopian',
        limit: 8,
        weights: { vectorW: 0.8, textW: 0.2 }
      };
      
      const results = await index.search(options);
      
      expect(results).toEqual(mockSearchQueryResult.rows);
      expect(search).toHaveBeenCalledWith({
        query: 'cyberpunk dystopian',
        limit: 8,
        vectorOnly: false,
        weights: { vectorW: 0.8, textW: 0.2 },
        indexName: 'movies'
      });
    });

    test('should use default values for optional parameters', async () => {
      const options = {
        query: 'test query'
      };
      
      await index.search(options);
      
      expect(search).toHaveBeenCalledWith({
        query: 'test query',
        limit: 10,
        vectorOnly: false,
        weights: undefined,
        indexName: 'movies'
      });
    });
  });

  describe('index.destroy()', () => {
    const { destroy } = require('../src/search.js');

    beforeEach(() => {
      destroy.mockResolvedValue(7);
    });

    test('should destroy all documents in the index and return count', async () => {
      const index = createClient().index('movies');

      const deleted = await index.destroy();

      expect(deleted).toBe(7);
      expect(destroy).toHaveBeenCalledWith('movies');
    });

    test('should handle zero documents deleted', async () => {
      const index = createClient().index('empty');
      destroy.mockResolvedValue(0);

      const deleted = await index.destroy();

      expect(deleted).toBe(0);
      expect(destroy).toHaveBeenCalledWith('empty');
    });

    test('should propagate errors from destroy', async () => {
      const index = createClient().index('broken');
      destroy.mockRejectedValue(new Error('DB error'));

      await expect(index.destroy()).rejects.toThrow('DB error');
    });

    test('should work with different index names', async () => {
      const client = createClient();
      const a = client.index('a');
      const b = client.index('b');

      await a.destroy();
      await b.destroy();

      expect(destroy).toHaveBeenCalledWith('a');
      expect(destroy).toHaveBeenCalledWith('b');
    });
  });
});
