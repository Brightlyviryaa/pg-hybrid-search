import { jest } from '@jest/globals';
import { rerankVoyage, searchHybridWithRerank } from '../src/rerank.js';
import { mockVoyageResponse, mockSearchResults, resetMocks } from './mocks.js';

// Mock the search module
jest.mock('../src/search.js', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { mockSearchResults } = require('./mocks.js');
  return {
    // Cast mock to any to bypass TS generic constraints in tests
    search: ((jest.fn() as any).mockResolvedValue(mockSearchResults))
  };
});

describe('Rerank Module Tests', () => {
  beforeEach(() => {
    resetMocks();
    (global.fetch as any).mockResolvedValue(mockVoyageResponse);
  });

  describe('rerankVoyage()', () => {
    const mockCandidates = [
      {
        text: 'Star Wars: A space opera epic with Jedi knights',
        id: '123e4567-e89b-12d3-a456-426614174000',
        cosine_sim: 0.8756
      },
      {
        text: 'The Matrix: Virtual reality and artificial intelligence',
        id: '987fcdeb-51a2-43d1-b678-123456789abc',
        cosine_sim: 0.7234
      }
    ];

    test('should rerank candidates using Voyage AI', async () => {
      const query = 'space opera adventures';
      
      const results = await rerankVoyage(query, mockCandidates);
      
      expect(results).toHaveLength(2);
      expect(results[0]).toHaveProperty('rerank_score', 0.9456);
      expect(results[1]).toHaveProperty('rerank_score', 0.8234);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.voyageai.com/v1/rerank',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer pa-test-key',
            'Content-Type': 'application/json'
          }),
          body: expect.stringContaining('"query":"space opera adventures"')
        })
      );
    });

    test('should handle different numbers of candidates', async () => {
      const testCases = [
        Array.from({ length: 1 }, (_, i) => ({ text: `Text ${i}`, id: `id-${i}` })),
        Array.from({ length: 5 }, (_, i) => ({ text: `Text ${i}`, id: `id-${i}` })),
        Array.from({ length: 10 }, (_, i) => ({ text: `Text ${i}`, id: `id-${i}` })),
        Array.from({ length: 50 }, (_, i) => ({ text: `Text ${i}`, id: `id-${i}` })),
        Array.from({ length: 100 }, (_, i) => ({ text: `Text ${i}`, id: `id-${i}` }))
      ];

      for (const candidates of testCases) {
      const mockResponse: any = {
        ok: true,
        json: (jest.fn() as any).mockResolvedValue({
          object: 'list',
          data: candidates.map((_, i) => ({ index: i, relevance_score: 0.9 - (i * 0.1) })),
          model: 'rerank-2.5-lite'
        })
      };
        (global.fetch as any).mockResolvedValue(mockResponse);

        const results = await rerankVoyage('test query', candidates);
        
        expect(results).toHaveLength(candidates.length);
        expect(results[0]).toHaveProperty('rerank_score');
      }
    });

    test('should preserve original candidate properties', async () => {
      const candidatesWithProps = [
        {
          text: 'Content 1',
          id: 'id-1',
          custom_prop: 'value1',
          score: 0.8
        },
        {
          text: 'Content 2',
          id: 'id-2',
          custom_prop: 'value2',
          score: 0.7
        }
      ];

      const results = await rerankVoyage('test query', candidatesWithProps);
      
      expect(results[0]).toHaveProperty('custom_prop');
      expect(results[0]).toHaveProperty('score');
      expect(results[0]).toHaveProperty('rerank_score');
      expect(results[0].custom_prop).toBe('value1');
    });

    test('should handle API errors', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        text: (jest.fn() as any).mockResolvedValue('Rate limit exceeded')
      });

      await expect(rerankVoyage('test query', mockCandidates))
        .rejects.toThrow('Gagal rerank dengan Voyage: Rate limit exceeded');
    });

    test('should handle network errors', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      await expect(rerankVoyage('test query', mockCandidates))
        .rejects.toThrow('Network error');
    });
  });

  describe('searchHybridWithRerank()', () => {
    const { search } = require('../src/search.js');

    beforeEach(() => {
      search.mockResolvedValue(mockSearchResults);
    });

    test('should perform hybrid search with reranking', async () => {
      const query = 'epic space battles with heroic characters';
      const k = 5;
      const topNForRerank = 30;
      const indexName = 'movies';

      const results = await searchHybridWithRerank(query, k, topNForRerank, indexName);

      expect(results).toBeDefined();
      expect(search).toHaveBeenCalledWith({
        query,
        limit: topNForRerank,
        indexName
      });
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.voyageai.com/v1/rerank',
        expect.objectContaining({
          method: 'POST'
        })
      );
    });

    test('should use default parameters', async () => {
      const query = 'sustainable technology solutions';

      const results = await searchHybridWithRerank(query);

      expect(search).toHaveBeenCalledWith({
        query,
        limit: 50,
        indexName: 'default'
      });
    });

    test('should handle different parameter combinations', async () => {
      const testCases = [
        { query: 'test 1', k: 3 },
        { query: 'test 2', k: 5, topNForRerank: 20 },
        { query: 'test 3', k: 10, topNForRerank: 100, indexName: 'articles' },
        { query: 'test 4', k: 1, topNForRerank: 5, indexName: 'products' },
        { query: 'test 5', k: 15, topNForRerank: 200, indexName: 'documents' }
      ];

      for (const testCase of testCases) {
        const { query, k = 10, topNForRerank = 50, indexName = 'default' } = testCase;
        
        await searchHybridWithRerank(query, k, topNForRerank, indexName);
        
        expect(search).toHaveBeenCalledWith({
          query,
          limit: topNForRerank,
          indexName
        });
      }
    });

    test('should return empty array when no search results', async () => {
      search.mockResolvedValue([]);

      const results = await searchHybridWithRerank('no results query');

      expect(results).toEqual([]);
      expect(global.fetch).not.toHaveBeenCalled();
    });

  test('should slice results to requested k value', async () => {
    // Mock more results than k
    const manyResults = Array.from({ length: 20 }, (_, i) => ({
      ...mockSearchResults[0],
      id: `id-${i}`,
      raw_content: `Content ${i}`
    }));
    search.mockResolvedValue(manyResults);

    const k = 5;
    // Mock voyage response to return ranking for all candidates
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        object: 'list',
        data: manyResults.map((_, i) => ({ index: i, relevance_score: 1 - i * 0.01 })),
        model: 'rerank-2.5-lite'
      })
    });
    const results = await searchHybridWithRerank('test query', k);

    expect(results).toHaveLength(k);
  });
  });
});
