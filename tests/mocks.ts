import { SearchResult } from '../src/search.js';

// Mock database client
export const mockDbClient = {
  query: jest.fn(),
  release: jest.fn()
};

// Mock database pool
export const mockPool = {
  connect: jest.fn().mockResolvedValue(mockDbClient),
  end: jest.fn()
};

// Mock OpenAI embedding response
export const mockEmbeddingResponse = {
  ok: true,
  json: jest.fn().mockResolvedValue({
    data: [{
      embedding: Array.from({ length: 1536 }, (_, i) => Math.random() - 0.5)
    }]
  })
};

// Mock Voyage rerank response
export const mockVoyageResponse = {
  ok: true,
  json: jest.fn().mockResolvedValue({
    object: 'list',
    data: [
      { index: 0, relevance_score: 0.9456 },
      { index: 1, relevance_score: 0.8234 }
    ],
    model: 'rerank-2.5-lite'
  })
};

// Mock search results
export const mockSearchResults: SearchResult[] = [
  {
    id: '123e4567-e89b-12d3-a456-426614174000',
    raw_content: 'Star Wars: A space opera epic with Jedi knights',
    cosine_sim: 0.8756,
    ts_score: 0.2341,
    hybrid_score: 0.7429,
    created_at: '2024-01-15T10:30:00Z',
    updated_at: '2024-01-15T10:30:00Z'
  },
  {
    id: '987fcdeb-51a2-43d1-b678-123456789abc',
    raw_content: 'The Matrix: Virtual reality and artificial intelligence',
    cosine_sim: 0.7234,
    ts_score: 0.1876,
    hybrid_score: 0.6123,
    created_at: '2024-01-15T11:45:00Z',
    updated_at: '2024-01-15T11:45:00Z'
  }
];

// Mock database query results
export const mockInsertResult = {
  rows: [{ id: '123e4567-e89b-12d3-a456-426614174000' }]
};

export const mockSearchQueryResult = {
  rows: mockSearchResults
};

// Reset all mocks
export function resetMocks() {
  jest.clearAllMocks();
  mockDbClient.query.mockClear();
  mockDbClient.release.mockClear();
  mockPool.connect.mockClear();
  mockPool.end.mockClear();
}
