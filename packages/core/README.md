# @enterprise-openclaw/core

Open-source core features for Enterprise OpenClaw.

## Features

- **Basic DRIFT RAG**: Simplified DRIFT RAG implementation (max depth=2, single-threaded)
- **Knowledge Graph**: Vector-based knowledge storage and retrieval with LanceDB
- **Orchestrator**: Multi-agent task orchestration (core features only)
- **Anthropic Provider**: Integration with Claude models

## Installation

```bash
npm install @enterprise-openclaw/core
```

## Usage

```typescript
import { KnowledgeGraph, DriftRAGBasic } from '@enterprise-openclaw/core';

// Initialize knowledge graph
const kg = new KnowledgeGraph({
  vectorStorePath: './data/vectors'
});

// Use basic DRIFT RAG
const rag = new DriftRAGBasic({ knowledgeGraph: kg });
const results = await rag.retrieve('query', { maxDepth: 2 });
```

## License

Apache-2.0

## Contributing

See the main repository for contribution guidelines.
