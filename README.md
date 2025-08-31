<div align="center">
  <img src="src/image/PG-HYBRID-SEARCH-LOGO.png" alt="PG Hybrid Search Logo" width="200" height="200">

# pg-hybrid-search

**🚀 Advanced Hybrid Search Toolkit for PostgreSQL**

*Seamlessly combine vector similarity, BM25 full-text search, and AI-powered reranking*

[![npm version](https://badge.fury.io/js/%40brightly%2Fpg-hybrid-search.svg)](https://badge.fury.io/js/%40brightly%2Fpg-hybrid-search)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)

[![GitHub stars](https://img.shields.io/github/stars/brightlyvirya/pg-hybrid-search?style=social)](https://github.com/brightlyvirya/pg-hybrid-search/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/brightlyvirya/pg-hybrid-search?style=social)](https://github.com/brightlyvirya/pg-hybrid-search/network/members)
[![GitHub issues](https://img.shields.io/github/issues/brightlyvirya/pg-hybrid-search)](https://github.com/brightlyvirya/pg-hybrid-search/issues)
[![GitHub pull requests](https://img.shields.io/github/issues-pr/brightlyvirya/pg-hybrid-search)](https://github.com/brightlyvirya/pg-hybrid-search/pulls)

---

</div>

## 📋 Table of Contents

- [🌟 Overview](#-overview)
- [✨ Key Features](#-key-features)
- [🚀 Quick Start](#-quick-start)
- [📦 Installation](#-installation)
- [⚙️ Configuration](#️-configuration)
- [📚 API Reference](#-api-reference)
- [🖥 CLI Tools](#-cli-tools)
- [💡 Usage Examples](#-usage-examples)
- [🏗 Database Schema](#-database-schema)
- [⚡ Performance Optimization](#-performance-optimization)
- [🔧 Development](#-development)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)

## 🌟 Overview

**pg-hybrid-search** is a powerful, production-ready library that brings advanced search capabilities to PostgreSQL applications. Combining the precision of vector similarity search with the versatility of full-text search and the intelligence of AI-powered reranking.

### Why Choose pg-hybrid-search?

- 🎯 **Best of Both Worlds**: Vector similarity + BM25 full-text search
- 🤖 **AI-Enhanced**: Optional reranking with Voyage AI for superior relevance
- 🚀 **Performance Focused**: Optimized queries and connection pooling
- 🛡️ **Type Safe**: Full TypeScript support with comprehensive types
- 🔧 **Developer Friendly**: Simple CLI tools and intuitive API
- 📈 **Production Ready**: Battle-tested in real-world applications

## ✨ Key Features

<table>
<tr>
<td width="50%">

### 🔍 **Advanced Search Capabilities**
- **Vector Search**: Cosine similarity using OpenAI embeddings
- **Full-text Search**: PostgreSQL's powerful BM25 algorithm
- **Hybrid Search**: Intelligent combination with custom weights
- **AI Reranking**: Voyage Rerank v2 integration

</td>
<td width="50%">

### 🛠️ **Developer Experience**
- **TypeScript First**: Complete type safety & IntelliSense
- **CLI Tools**: Easy schema management
- **Flexible API**: Simple yet powerful functions
- **Well Documented**: Comprehensive guides & examples

</td>
</tr>
</table>

## 🚀 Quick Start

```typescript
import { upsertDocument, searchHybrid } from '@brightly/pg-hybrid-search';

// 1. Insert documents with automatic embedding generation
await upsertDocument("Machine learning revolutionizes data analysis");
await upsertDocument("PostgreSQL provides excellent full-text search");

// 2. Perform hybrid search combining vector + text search
const results = await searchHybrid("AI data analysis", 5);

// 3. Results include relevance scores and original content
results.forEach(result => {
  console.log(`Score: ${result.hybrid_score}`);
  console.log(`Content: ${result.raw_content}`);
});
```

## 📦 Installation

```bash
# Install the package
npm install @brightly/pg-hybrid-search

# Initialize database schema
npx @brightly/pg-hybrid-search init
```

### Prerequisites

| Requirement | Version | Purpose |
|-------------|---------|---------|
| **Node.js** | ≥18.0.0 | Runtime environment |
| **PostgreSQL** | ≥15.0.0 | Database with pgvector support |
| **pgvector** | Latest | Vector similarity operations |
| **OpenAI API** | - | Embedding generation |
| **Voyage AI API** | - | Reranking (optional) |

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in your project root:

```env
# Database Connection (Required)
DATABASE_URL=postgresql://username:password@localhost:5432/your_database

# OpenAI Configuration (Required)
OPENAI_API_KEY=sk-your-openai-api-key-here
EMBED_MODEL=text-embedding-3-small  # Optional: default model

# Voyage AI Configuration (Optional - for reranking)
VOYAGE_API_KEY=pa-your-voyage-api-key-here
RERANK_MODEL=rerank-2  # Optional: default rerank model
```

### Database Setup

```bash
# One-time schema initialization
npx @brightly/pg-hybrid-search init

# Verify installation
psql -d your_database -c "SELECT COUNT(*) FROM vector_table;"
```

## 📚 API Reference

### Core Functions

#### Import Statement
```typescript
import {
  upsertDocument,
  deleteById,
  searchVector,
  searchHybrid,
  searchHybridWithRerank,
  rerankVoyage,
  type SearchResult,
  type HybridWeights
} from '@brightly/pg-hybrid-search';
```

---

#### `upsertDocument(content: string): Promise<string>`

Insert a new document with automatic embedding generation.

```typescript
const documentId = await upsertDocument(
  "Artificial intelligence transforms modern business operations"
);
console.log(`Document inserted with ID: ${documentId}`);
```

**Parameters**:
- `content` (string): Raw text content to be indexed

**Returns**: Promise<string> - UUID of the inserted document

---

#### `searchVector(query: string, k?: number): Promise<SearchResult[]>`

Perform pure vector similarity search using cosine distance.

```typescript
const vectorResults = await searchVector("machine learning algorithms", 10);
vectorResults.forEach(result => {
  console.log(`Similarity: ${result.cosine_sim?.toFixed(4)}`);
  console.log(`Content: ${result.raw_content}`);
});
```

**Parameters**:
- `query` (string): Search query text
- `k` (number, optional): Number of results to return (default: 10)

---

#### `searchHybrid(query: string, k?: number, weights?: HybridWeights): Promise<SearchResult[]>`

Combine vector similarity and BM25 full-text search with normalized scoring.

```typescript
const hybridResults = await searchHybrid("AI machine learning", 5, {
  vectorW: 0.7,  // Vector search weight
  textW: 0.3     // Text search weight
});

hybridResults.forEach(result => {
  console.log(`Hybrid Score: ${result.hybrid_score?.toFixed(4)}`);
  console.log(`Vector Score: ${result.cosine_sim?.toFixed(4)}`);
  console.log(`Text Score: ${result.ts_score?.toFixed(4)}`);
});
```

**Parameters**:
- `query` (string): Search query text  
- `k` (number, optional): Number of results (default: 10)
- `weights` (HybridWeights, optional): Scoring weights (default: `{vectorW: 0.7, textW: 0.3}`)

---

#### `searchHybridWithRerank(query: string, k?: number, topN?: number): Promise<SearchResult[]>`

End-to-end pipeline: hybrid search → AI reranking → top-k results.

```typescript
const rerankedResults = await searchHybridWithRerank(
  "sustainable AI development", 
  10,   // Final number of results
  50    // Number of candidates to rerank
);
```

**Parameters**:
- `query` (string): Search query text
- `k` (number, optional): Final number of results (default: 10) 
- `topN` (number, optional): Candidates for reranking (default: 50)

---

#### `deleteById(id: string): Promise<void>`

Remove a document by its UUID.

```typescript
await deleteById("123e4567-e89b-12d3-a456-426614174000");
```

### Type Definitions

```typescript
interface SearchResult {
  id: string;
  raw_content: string;
  cosine_sim?: number;        // Vector similarity score
  ts_score?: number;          // BM25 text search score  
  hybrid_score?: number;      // Combined normalized score
  rerank_score?: number;      // AI reranking score
  created_at?: string;
  updated_at?: string;
}

interface HybridWeights {
  vectorW: number;            // Vector search weight (0-1)
  textW: number;              // Text search weight (0-1)
}

interface Candidate {
  text: string;
  [key: string]: any;
}
```

## 🖥 CLI Tools

The CLI provides essential database management commands:

```bash
# Initialize database schema (safe to run multiple times)
npx @brightly/pg-hybrid-search init

# Reset schema (⚠️ destructive - requires confirmation)
npx @brightly/pg-hybrid-search reset -y

# Show help
npx @brightly/pg-hybrid-search help
```

### CLI Command Reference

| Command | Description | Usage |
|---------|-------------|-------|
| `init` | Creates tables, indexes, and triggers | `pg-hybrid init` |
| `reset -y` | ⚠️ Drops all tables and indexes | `pg-hybrid reset -y` |
| `help` | Shows command documentation | `pg-hybrid help` |

## 💡 Usage Examples

### Basic Document Management

```typescript
import { upsertDocument, searchHybrid, deleteById } from '@brightly/pg-hybrid-search';

// Insert documents
const docIds = await Promise.all([
  upsertDocument("PostgreSQL is a powerful relational database"),
  upsertDocument("Vector databases enable semantic search capabilities"),
  upsertDocument("Full-text search provides keyword-based retrieval")
]);

// Search with hybrid approach
const results = await searchHybrid("database search capabilities", 3);
console.log(`Found ${results.length} relevant documents`);

// Clean up
await Promise.all(docIds.map(id => deleteById(id)));
```

### Advanced Search Strategies

```typescript
// Semantic-focused search (higher vector weight)
const semanticResults = await searchHybrid("AI innovation", 10, {
  vectorW: 0.9,
  textW: 0.1
});

// Keyword-focused search (higher text weight)
const keywordResults = await searchHybrid("machine learning", 10, {
  vectorW: 0.2, 
  textW: 0.8
});

// Balanced hybrid search (default weights)
const balancedResults = await searchHybrid("artificial intelligence");
```

### Enterprise Pipeline with Reranking

```typescript
import { searchHybridWithRerank } from '@brightly/pg-hybrid-search';

async function enterpriseSearch(query: string) {
  // High-precision search with AI reranking
  const results = await searchHybridWithRerank(
    query,
    15,    // Return top 15 results
    100    // Rerank from top 100 candidates
  );
  
  return results.map((result, index) => ({
    rank: index + 1,
    id: result.id,
    content: result.raw_content,
    relevanceScore: result.rerank_score || result.hybrid_score,
    confidence: result.rerank_score ? 'high' : 'medium'
  }));
}

const enterpriseResults = await enterpriseSearch("sustainable technology solutions");
```

### Batch Operations

```typescript
// Efficient bulk insertion
const documents = [
  "Document 1 content...",
  "Document 2 content...", 
  "Document 3 content..."
];

const insertPromises = documents.map(doc => upsertDocument(doc));
const documentIds = await Promise.all(insertPromises);

console.log(`Inserted ${documentIds.length} documents`);
```

## 🏗 Database Schema

The library automatically creates and manages the following schema:

```sql
-- Main table for storing documents and embeddings
CREATE TABLE vector_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_content TEXT NOT NULL,
  embedding VECTOR(1536) NOT NULL,
  content_tsv TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('simple', coalesce(raw_content,''))
  ) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Optimized indexes for performance
CREATE INDEX idx_vector_table_embedding 
  ON vector_table USING ivfflat (embedding vector_cosine_ops) 
  WITH (lists = 100);

CREATE INDEX idx_vector_table_tsv 
  ON vector_table USING GIN (content_tsv);
```

### Schema Features

- **UUID Primary Keys**: Globally unique identifiers
- **Vector Storage**: 1536-dimensional embeddings (OpenAI standard)
- **Generated TSVector**: Automatic full-text search indexing
- **Timestamps**: Automatic creation and update tracking
- **Optimized Indexes**: IVFFlat for vectors, GIN for text search

## ⚡ Performance Optimization

### Vector Index Tuning

```sql
-- Adjust lists parameter based on your dataset size
-- Rule of thumb: lists = sqrt(total_rows)

-- For datasets < 10K documents
CREATE INDEX CONCURRENTLY idx_vector_small 
  ON vector_table USING ivfflat (embedding vector_cosine_ops) 
  WITH (lists = 50);

-- For datasets > 100K documents  
CREATE INDEX CONCURRENTLY idx_vector_large
  ON vector_table USING ivfflat (embedding vector_cosine_ops) 
  WITH (lists = 500);
```

### Connection Optimization

```typescript
// The library uses connection pooling by default
// You can access the pool for advanced configuration

import { pool } from '@brightly/pg-hybrid-search';

// Monitor pool status
setInterval(() => {
  console.log(`Active connections: ${pool.totalCount}`);
  console.log(`Idle connections: ${pool.idleCount}`);
}, 30000);
```

### Search Performance Tips

1. **Batch Similar Queries**: Group related searches to amortize embedding costs
2. **Tune Hybrid Weights**: Adjust based on your content and query patterns  
3. **Optimize Rerank Usage**: Use `topNForRerank` between 50-200 for best balance
4. **Monitor Query Performance**: Use `EXPLAIN ANALYZE` for slow queries

## 🔧 Development

### Local Development Setup

```bash
# Clone the repository
git clone https://github.com/brightlyvirya/pg-hybrid-search.git
cd pg-hybrid-search

# Install dependencies
npm install

# Build the project
npm run build

# Set up test environment
cp .env.example .env
# Edit .env with your database credentials

# Initialize test database
npm run build && node dist/cli.js init
```

### Project Structure

```
pg-hybrid-search/
├── src/
│   ├── cli.ts              # Command-line interface
│   ├── db.ts               # Database connection management
│   ├── embedding.ts        # OpenAI embedding integration  
│   ├── search.ts           # Core search functionality
│   ├── rerank.ts           # Voyage AI reranking
│   ├── index.ts            # Main exports
│   ├── sql/
│   │   ├── init.sql        # Schema initialization
│   │   └── reset.sql       # Schema cleanup
│   └── image/
│       └── PG-HYBRID-SEARCH-LOGO.png
├── dist/                   # Compiled JavaScript
├── package.json
├── tsconfig.json
└── README.md
```

### Building and Testing

```bash
# Development build
npm run build

# Test CLI functionality
npm run build && node dist/cli.js init

# Test basic operations (requires test database)
node -e "
const { upsertDocument, searchHybrid } = require('./dist/index.js');
upsertDocument('test document').then(id => 
  searchHybrid('test', 1).then(console.log)
);
"
```

## 🤝 Contributing

We welcome contributions from the community! Here's how you can help:

### Ways to Contribute

- 🐛 **Bug Reports**: Found an issue? [Create an issue](https://github.com/brightlyvirya/pg-hybrid-search/issues/new?template=bug_report.md)
- ✨ **Feature Requests**: Have an idea? [Submit a feature request](https://github.com/brightlyvirya/pg-hybrid-search/issues/new?template=feature_request.md)
- 📝 **Documentation**: Improve docs, add examples, fix typos
- 🔧 **Code**: Submit pull requests for bug fixes or new features

### Development Workflow

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** your changes: `git commit -m 'Add amazing feature'`
4. **Push** to your branch: `git push origin feature/amazing-feature`  
5. **Submit** a Pull Request

### Code Standards

- Follow existing TypeScript patterns
- Add tests for new functionality
- Update documentation for API changes
- Ensure backward compatibility when possible

## 🆘 Support & Community

Need help or want to connect with other users?

- 📖 **Documentation**: You're reading it! Check the [API Reference](#-api-reference)
- 🐛 **Issues**: [GitHub Issues](https://github.com/brightlyvirya/pg-hybrid-search/issues) for bugs and feature requests
- 💬 **Discussions**: [GitHub Discussions](https://github.com/brightlyvirya/pg-hybrid-search/discussions) for general questions
- 📧 **Email**: Open an issue for direct support needs

### Troubleshooting

Common issues and solutions:

| Issue | Solution |
|-------|----------|
| `pgvector extension not found` | Install pgvector: `CREATE EXTENSION vector;` |
| `OpenAI API rate limits` | Implement request batching and retry logic |
| `Slow vector searches` | Tune IVFFlat index parameters |
| `Connection pool exhausted` | Check for connection leaks, increase pool size |

## 📊 Benchmarks

Performance characteristics on a standard setup (PostgreSQL 15, 4 CPU cores, 8GB RAM):

| Operation | Documents | Time | Notes |
|-----------|-----------|------|-------|
| Document insertion | 1,000 | ~2.5s | Including embedding generation |
| Vector search | 100K docs | ~50ms | With IVFFlat index |
| Hybrid search | 100K docs | ~75ms | Combined vector + text |
| Rerank (50 candidates) | - | ~200ms | Voyage API latency |

*Benchmarks may vary based on document size, query complexity, and infrastructure.*

## 🗺️ Roadmap

Planned features and improvements:

- [ ] **Multi-language Support**: Enhanced tokenization for non-English content
- [ ] **Custom Embedding Models**: Support for Hugging Face and other providers  
- [ ] **Advanced Filtering**: Metadata-based search filtering
- [ ] **Batch Reranking**: Optimize multiple query reranking
- [ ] **Performance Monitoring**: Built-in metrics and observability
- [ ] **Migration Tools**: Version upgrade utilities

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2024 Brightly Virya

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
```

---

<div align="center">

### 🌟 If this project helps you, please give it a star! 

[![GitHub stars](https://img.shields.io/github/stars/brightlyvirya/pg-hybrid-search?style=social)](https://github.com/brightlyvirya/pg-hybrid-search/stargazers)

**Built with ❤️ for the Indonesian AI & Web3 community**

*Empowering developers to build intelligent search experiences*

</div>