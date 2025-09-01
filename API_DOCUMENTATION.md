# 📖 pg-hybrid-search API Documentation

NPM: https://www.npmjs.com/package/@brightly/pg-hybrid-search

> Comprehensive API reference for pg-hybrid-search library

## 📋 Table of Contents

- [🚀 Quick Start](#-quick-start)
- [🏗️ Client API](#️-client-api)
  - [createClient()](#createclient)
  - [client.index()](#clientindex)
  - [index.add()](#indexadd)
  - [index.remove()](#indexremove)
  - [index.search()](#indexsearch)
- [📊 Sequence Diagrams](#-sequence-diagrams)
- [🙏 Feedback & Saran](#-feedback--saran)
- [🎯 Error Handling](#-error-handling)

---

## 🚀 Quick Start

```typescript
import { createClient } from '@brightly/pg-hybrid-search';

// Initialize client
const client = createClient();
const movies = client.index("movies");

// Add document
const docId = await movies.add("Star Wars: A space opera epic");

// Search with AI reranking
const results = await movies.search({
  query: "space opera",
  limit: 5,
  reranking: true
});
```

---

## 🏗️ Client API

### `createClient()`

Creates a new pg-hybrid-search client instance.

#### **Function Name**: `createClient`
#### **Description**: Initializes and returns a new PgHybridClient instance for managing multiple indexes.

#### **Payload**: 
```typescript
// No parameters required
createClient(): PgHybridClient
```

#### **Response Example**:
```typescript
PgHybridClient {
  index: (indexName: string) => PgHybridIndex
}
```

#### **Usage Example**:
```typescript
import { createClient } from '@brightly/pg-hybrid-search';

const client = createClient();
console.log('Client created successfully');
```

#### **Sequence Diagram**:
```mermaid
sequenceDiagram
    participant App as Application
    participant Client as PgHybridClient
    
    App->>Client: createClient()
    Client-->>App: PgHybridClient instance
    
    Note over App,Client: Client ready to create indexes
```

---

### `client.index()`

Creates or gets reference to a named index.

#### **Function Name**: `client.index`
#### **Description**: Returns a PgHybridIndex instance for the specified index name, allowing isolated document collections.

#### **Payload**:
```typescript
client.index(indexName: string): PgHybridIndex

// Parameters:
// - indexName: string - Name of the index (e.g., "movies", "documents", "products")
```

#### **Response Example**:
```typescript
PgHybridIndex {
  add: (content: string, lang?: string) => Promise<string>,
  remove: (id: string) => Promise<void>,
  delete: (id: string) => Promise<void>,   // alias of remove
  destroy: () => Promise<number>,          // delete all rows in this index
  search: (options: ClientSearchOptions) => Promise<SearchResult[]>
}
```

#### **Usage Example**:
```typescript
const client = createClient();

// Create different indexes for different content types
const movies = client.index("movies");
const books = client.index("books");
const products = client.index("products");

console.log('Indexes created: movies, books, products');
```

#### **Sequence Diagram**:
```mermaid
sequenceDiagram
    participant App as Application
    participant Client as PgHybridClient
    participant Index as PgHybridIndex
    
    App->>Client: index("movies")
    Client->>Index: new PgHybridIndex("movies")
    Index-->>Client: PgHybridIndex instance
    Client-->>App: movies index
    
    Note over App,Index: Index ready for operations
```

---

### `index.add()`

Adds a new document to the specified index.

#### **Function Name**: `index.add`
#### **Description**: Inserts a document into the index, automatically generating embeddings and preparing for search.

#### **Payload**:
```typescript
index.add(content: string): Promise<string>

// Parameters:
// - content: string - Raw text content to be indexed and made searchable
```

#### **Response Example**:
```typescript
// Returns: UUID string
"123e4567-e89b-12d3-a456-426614174000"
```

#### **Usage Example**:
```typescript
const movies = client.index("movies");

const docId = await movies.add("Star Wars: A space opera epic with Jedi knights and galactic battles");
console.log(`Document added with ID: ${docId}`);

// Add multiple documents
const movieIds = await Promise.all([
  movies.add("The Matrix: A cyberpunk thriller about virtual reality"),
  movies.add("Blade Runner: Dystopian future with replicants and noir atmosphere"),
  movies.add("Interstellar: Space exploration and time dilation sci-fi drama")
]);
console.log(`Added ${movieIds.length} movies`);
```

#### **Sequence Diagram**:
```mermaid
sequenceDiagram
    participant App as Application
    participant Index as PgHybridIndex
    participant Embed as OpenAI API
    participant DB as PostgreSQL
    
    App->>Index: add("Star Wars: A space opera...")
    Index->>Embed: embedTextOpenAI(content)
    Embed-->>Index: embedding vector [1536 dimensions]
    Index->>DB: INSERT INTO vector_table (index_name, content, embedding)
    DB-->>Index: UUID
    Index-->>App: "123e4567-e89b-12d3-a456-426614174000"
    
    Note over App,DB: Document stored with embeddings
```

---

### `index.remove()`

Removes a document from the specified index.

#### **Function Name**: `index.remove`
#### **Description**: Deletes a document from the index by its UUID, permanently removing it from search results.

#### **Payload**:
```typescript
index.remove(id: string): Promise<void>

// Parameters:
// - id: string - UUID of the document to remove
```

#### **Response Example**:
```typescript
// Returns: void (no return value)
undefined
```

#### **Usage Example**:
```typescript
const movies = client.index("movies");

// Remove a specific document
await movies.remove("123e4567-e89b-12d3-a456-426614174000");
console.log('Document removed successfully');

// Remove multiple documents
const idsToRemove = [
  "123e4567-e89b-12d3-a456-426614174000",
  "987fcdeb-51a2-43d1-b678-123456789abc"
];

await Promise.all(idsToRemove.map(id => movies.remove(id)));
console.log(`Removed ${idsToRemove.length} documents`);
```

#### **Sequence Diagram**:
```mermaid
sequenceDiagram
    participant App as Application
    participant Index as PgHybridIndex
    participant DB as PostgreSQL
    
    App->>Index: remove("123e4567-e89b-12d3-a456-426614174000")
    Index->>DB: DELETE FROM vector_table WHERE id = $1 AND index_name = $2
    DB-->>Index: Query result
    Index-->>App: void
    
    Note over App,DB: Document permanently removed
```

---

### `index.destroy()`

Removes all documents from the specified index (by `index_name`).

#### **Function Name**: `index.destroy`
#### **Description**: Deletes all documents belonging to the index; useful for resetting a collection.

#### **Payload**:
```typescript
index.destroy(): Promise<number>
```

#### **Response Example**:
```typescript
// Returns number of rows deleted
42
```

#### **Usage Example**:
```typescript
const products = client.index("products");
const deleted = await products.destroy();
console.log(`Cleared products index: ${deleted} rows removed`);
```

#### **Sequence Diagram**:
```mermaid
sequenceDiagram
    participant App as Application
    participant Index as PgHybridIndex
    participant DB as PostgreSQL
    
    App->>Index: destroy()
    Index->>DB: DELETE FROM vector_table WHERE index_name = $1
    DB-->>Index: rowCount
    Index-->>App: number of deleted rows
```

---

### `index.search()`

Performs search operations on the specified index.

#### **Function Name**: `index.search`
#### **Description**: Executes hybrid search (vector + BM25) or vector-only search with optional AI reranking for enhanced relevance.

#### **Payload**:
```typescript
index.search(options: ClientSearchOptions): Promise<SearchResult[]>

interface ClientSearchOptions {
  query: string;           // Search query text
  limit?: number;          // Number of results to return (default: 10)
  reranking?: boolean;     // Enable AI-powered reranking (default: false)
  vectorOnly?: boolean;    // Use vector search only (default: false)
  weights?: SearchWeights; // Custom scoring weights
  topNForRerank?: number;  // Candidates for reranking (default: 50)
}

interface SearchWeights {
  vectorW: number;         // Vector search weight (0-1)
  textW: number;           // Text search weight (0-1)
}
```

#### **Response Example**:
```typescript
[
  {
    id: "123e4567-e89b-12d3-a456-426614174000",
    raw_content: "Star Wars: A space opera epic with Jedi knights",
    cosine_sim: 0.8756,
    ts_score: 0.2341,
    hybrid_score: 0.7429,
    rerank_score: 0.9234, // Only present if reranking was used
    created_at: "2024-01-15T10:30:00Z",
    updated_at: "2024-01-15T10:30:00Z"
  },
  {
    id: "987fcdeb-51a2-43d1-b678-123456789abc",
    raw_content: "The Matrix: Virtual reality and artificial intelligence",
    cosine_sim: 0.7234,
    ts_score: 0.1876,
    hybrid_score: 0.6123,
    created_at: "2024-01-15T11:45:00Z",
    updated_at: "2024-01-15T11:45:00Z"
  }
]
```

#### **Usage Example**:
```typescript
const movies = client.index("movies");

// Basic hybrid search
const basicResults = await movies.search({
  query: "space opera with jedi",
  limit: 5
});

// Vector-only search
const vectorResults = await movies.search({
  query: "futuristic AI rebellion",
  limit: 10,
  vectorOnly: true
});

// Custom weighted search
const customResults = await movies.search({
  query: "cyberpunk dystopian future",
  limit: 8,
  weights: { vectorW: 0.8, textW: 0.2 }
});

// AI-enhanced search with reranking
const aiResults = await movies.search({
  query: "epic space battles and heroic journeys",
  limit: 5,
  reranking: true,
  topNForRerank: 20
});

console.log(`Found ${aiResults.length} highly relevant results`);
```

#### **Sequence Diagram**:
```mermaid
sequenceDiagram
    participant App as Application
    participant Index as PgHybridIndex
    participant Embed as OpenAI API
    participant DB as PostgreSQL
    participant Voyage as Voyage AI
    
    App->>Index: search({ query, reranking: true })
    Index->>Embed: embedTextOpenAI(query)
    Embed-->>Index: query vector
    Index->>DB: Hybrid search SQL query
    DB-->>Index: Top N candidates
    
    alt Reranking enabled
        Index->>Voyage: rerankVoyage(query, candidates)
        Voyage-->>Index: Reranked results
    end
    
    Index-->>App: Final search results
    
    Note over App,Voyage: AI-enhanced search results
```

---

## 🔧 Functional API

Legacy functional API (add/remove/search, direct rerank) has been removed in v0.5.0-beta.
Use the Modern Client API (`createClient().index(...).search({ ... })`) with `reranking: true` and `topNForRerank`.

### `searchHybridWithRerank()`

End-to-end search with AI reranking.

#### **Function Name**: `searchHybridWithRerank`
#### **Description**: Complete pipeline that performs hybrid search and automatically applies AI reranking for maximum relevance.

#### **Payload**:
```typescript
searchHybridWithRerank(
  query: string, 
  k?: number, 
  topNForRerank?: number,
  indexName?: string
): Promise<SearchResult[]>

// Parameters:
// - query: string - Search query text
// - k: number - Final number of results to return (default: 10)
// - topNForRerank: number - Candidates to consider for reranking (default: 50)
// - indexName: string - Index to search (default: 'default')
```

#### **Response Example**:
```typescript
[
  {
    id: "123e4567-e89b-12d3-a456-426614174000",
    raw_content: "Star Wars: A space opera epic with Jedi knights and galactic battles",
    cosine_sim: 0.8756,
    ts_score: 0.2341,
    hybrid_score: 0.7429,
    rerank_score: 0.9456,  // AI reranking score (highest relevance)
    created_at: "2024-01-15T10:30:00Z",
    updated_at: "2024-01-15T10:30:00Z"
  }
]
```

#### **Usage Example**:
```typescript
import { searchHybridWithRerank } from '@brightly/pg-hybrid-search';

// High-precision search for movie recommendations
const movieResults = await searchHybridWithRerank(
  "epic space battles with heroic characters",
  5,        // Return top 5 results
  30,       // Consider top 30 for reranking
  "movies"  // Search in movies index
);

// Enterprise search with maximum accuracy
const enterpriseResults = await searchHybridWithRerank(
  "sustainable technology solutions for climate change",
  10,       // Return top 10 results
  100,      // Consider top 100 for reranking
  "articles"
);

console.log('AI-enhanced search results:');
enterpriseResults.forEach((result, index) => {
  console.log(`${index + 1}. ${result.raw_content.substring(0, 100)}...`);
  console.log(`   Relevance: ${(result.rerank_score * 100).toFixed(1)}%`);
});
```

#### **Sequence Diagram**:
```mermaid
sequenceDiagram
    participant App as Application
    participant Func as searchHybridWithRerank()
    participant Search as search()
    participant Embed as OpenAI API
    participant DB as PostgreSQL
    participant Voyage as Voyage AI
    
    App->>Func: searchHybridWithRerank(query, k, topN, index)
    Func->>Search: search({ query, limit: topN, indexName })
    Search->>Embed: embedTextOpenAI(query)
    Embed-->>Search: query vector
    Search->>DB: Hybrid search query
    DB-->>Search: Top N candidates
    Search-->>Func: Search results
    Func->>Voyage: rerankVoyage(query, candidates)
    Voyage-->>Func: Reranked results
    Func->>Func: slice(0, k) - Take top k
    Func-->>App: Final AI-enhanced results
    
    Note over App,Voyage: End-to-end AI-powered search
```

---

## 📊 Sequence Diagrams

### Complete Search Flow with All Components

```mermaid
sequenceDiagram
    participant User as User Application
    participant Client as PgHybridClient
    participant Index as PgHybridIndex
    participant Search as Search Functions
    participant OpenAI as OpenAI API
    participant DB as PostgreSQL
    participant Voyage as Voyage AI
    
    %% Initialization
    User->>Client: createClient()
    Client-->>User: client instance
    User->>Client: index("movies")
    Client->>Index: new PgHybridIndex("movies")
    Index-->>User: movies index
    
    %% Adding Documents
    User->>Index: add("Star Wars: space opera...")
    Index->>OpenAI: Generate embedding
    OpenAI-->>Index: [0.1, 0.2, ..., 0.9] (1536 dims)
    Index->>DB: INSERT document + embedding
    DB-->>Index: UUID
    Index-->>User: document ID
    
    %% Searching
    User->>Index: search({ query, reranking: true })
    Index->>Search: search(options)
    Search->>OpenAI: Generate query embedding
    OpenAI-->>Search: query vector
    Search->>DB: Hybrid search (vector + BM25)
    DB-->>Search: Top 50 candidates
    Search-->>Index: search results
    Index->>Voyage: rerank(query, candidates)
    Voyage-->>Index: reranked with scores
    Index-->>User: final results (top k)
    
    Note over User,Voyage: Complete hybrid search with AI enhancement
```

### Error Handling Flow

```mermaid
sequenceDiagram
    participant App as Application
    participant API as pg-hybrid-search
    participant OpenAI as OpenAI API
    participant DB as PostgreSQL
    participant Voyage as Voyage AI
    
    App->>API: search({ query: "test" })
    
    alt OpenAI API Error
        API->>OpenAI: embedTextOpenAI()
        OpenAI-->>API: ❌ API Error (rate limit/auth)
        API-->>App: ❌ Error: "Gagal ambil embedding: ..."
    else Database Error
        API->>DB: Search query
        DB-->>API: ❌ Connection/Query Error
        API-->>App: ❌ Database Error
    else Voyage AI Error (if reranking)
        API->>Voyage: rerank request
        Voyage-->>API: ❌ API Error
        API-->>App: ❌ Error: "Gagal rerank dengan Voyage: ..."
    else Success
        API->>OpenAI: embedTextOpenAI()
        OpenAI-->>API: ✅ embedding
        API->>DB: search query
        DB-->>API: ✅ results
        API-->>App: ✅ search results
    end
```

---

## 🙏 Feedback & Saran

Ini adalah pertama kalinya saya membuat open‑source library dan mempublikasikannya ke npm. Jika ada senior/teman yang menemukan kekurangan, bug, atau ada saran perbaikan, mohon bantu tinggalkan komentar lewat GitHub Issues — saya sangat terbuka untuk belajar dan memperbaiki kualitas proyek ini.

- Versi saat ini: v0.5.0‑beta — terbuka untuk feedback sebanyak‑banyaknya
- GitHub Issues: https://github.com/Brightlyviryaa/pg-hybrid-search/issues

Terima kasih atas semua masukan dan dukungannya! 🙌

---

## 🎯 Error Handling

### Common Error Scenarios

#### **Authentication Errors**
```typescript
// OpenAI API Key missing
try {
  await movies.add("content");
} catch (error) {
  // Error: "OPENAI_API_KEY tidak di-set"
  console.error('OpenAI API key required');
}

// Voyage API Key missing (for reranking)
try {
  await movies.search({ query: "test", reranking: true });
} catch (error) {
  // Error: "VOYAGE_API_KEY tidak di-set"
  console.error('Voyage API key required for reranking');
}
```

#### **Database Connection Errors**
```typescript
try {
  await movies.search({ query: "test" });
} catch (error) {
  // Database connection or query errors
  console.error('Database error:', error.message);
  // Check DATABASE_URL configuration
}
```

#### **API Rate Limiting**
```typescript
// Implement retry logic for rate limits
async function addWithRetry(content: string, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await movies.add(content);
    } catch (error) {
      if (error.message.includes('rate limit') && i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
        continue;
      }
      throw error;
    }
  }
}
```

#### **Best Practices**
```typescript
import { createClient } from '@brightly/pg-hybrid-search';

// Always wrap API calls in try-catch
async function safeSearch(query: string) {
  try {
    const client = createClient();
    const index = client.index("movies");
    
    const results = await index.search({
      query,
      limit: 10,
      reranking: true
    });
    
    return {
      success: true,
      data: results,
      count: results.length
    };
  } catch (error) {
    console.error('Search failed:', error);
    return {
      success: false,
      error: error.message,
      data: []
    };
  }
}

// Usage with error handling
const result = await safeSearch("space opera");
if (result.success) {
  console.log(`Found ${result.count} results`);
  result.data.forEach(item => console.log(item.raw_content));
} else {
  console.error('Search error:', result.error);
}
```

---

## 🔧 Environment Configuration

### Required Environment Variables

```bash
# Database Connection (Required)
DATABASE_URL=postgresql://username:password@localhost:5432/your_database

# OpenAI Configuration (Required)
OPENAI_API_KEY=sk-your-openai-api-key-here
EMBED_MODEL=text-embedding-3-small  # Optional, default model

# Voyage AI Configuration (Optional - for reranking)
VOYAGE_API_KEY=pa-your-voyage-api-key-here
RERANK_MODEL=rerank-2.5-lite  # Optional, default rerank model
```

### Database Initialization

```bash
# One-time schema setup
npx @brightly/pg-hybrid-search init

# Verify setup
psql -d your_database -c "SELECT COUNT(*) FROM vector_table;"
```

---

*This documentation covers all available functions in the pg-hybrid-search library. For more examples and advanced usage, see the main README.md file.*
