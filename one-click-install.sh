#!/bin/bash

# ═══════════════════════════════════════════════════════════
#  Enterprise OpenClaw - ONE CLICK INSTALLER
#  Just run: curl -fsSL https://raw.githubusercontent.com/wjlgatech/enterprise-openclaw/main/one-click-install.sh | bash
# ═══════════════════════════════════════════════════════════

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m'

clear

echo -e "${BOLD}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                                                           ║"
echo "║     🚀 Enterprise OpenClaw - ONE CLICK INSTALLER 🚀      ║"
echo "║                                                           ║"
echo "║          DRIFT RAG Knowledge Graph Reasoning              ║"
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# Check if already in the repo directory
if [ -f "package.json" ] && grep -q "enterprise-openclaw" package.json 2>/dev/null; then
    echo -e "${YELLOW}📂 Already in enterprise-openclaw directory${NC}"
    SKIP_CLONE=true
else
    SKIP_CLONE=false
fi

# Function to check command
check_command() {
    if command -v "$1" &> /dev/null; then
        echo -e "${GREEN}✓${NC} $2"
        return 0
    else
        echo -e "${RED}✗${NC} $2 not found"
        return 1
    fi
}

# Check prerequisites
echo -e "${BLUE}📋 Checking system...${NC}"
echo ""

HAS_ERRORS=false

if ! check_command node "Node.js"; then
    echo -e "${YELLOW}   Install from: ${BOLD}https://nodejs.org${NC}"
    HAS_ERRORS=true
else
    NODE_VERSION=$(node --version)
    echo -e "   ${BLUE}Version: ${NODE_VERSION}${NC}"
fi

if ! check_command npm "npm"; then
    HAS_ERRORS=true
else
    NPM_VERSION=$(npm --version)
    echo -e "   ${BLUE}Version: ${NPM_VERSION}${NC}"
fi

if ! check_command git "Git"; then
    echo -e "${YELLOW}   Install from: ${BOLD}https://git-scm.com${NC}"
    HAS_ERRORS=true
fi

echo ""

if [ "$HAS_ERRORS" = true ]; then
    echo -e "${RED}❌ Missing required tools. Please install them first.${NC}"
    exit 1
fi

# Clone repository if needed
if [ "$SKIP_CLONE" = false ]; then
    echo -e "${BLUE}📥 Cloning repository...${NC}"
    
    # Remove old directory if exists
    if [ -d "enterprise-openclaw" ]; then
        echo -e "${YELLOW}   Removing old installation...${NC}"
        rm -rf enterprise-openclaw
    fi
    
    git clone --depth 1 https://github.com/wjlgatech/enterprise-openclaw.git
    cd enterprise-openclaw
    echo -e "${GREEN}✓ Repository cloned${NC}"
    echo ""
fi

# Install dependencies
echo -e "${BLUE}📦 Installing dependencies...${NC}"
echo -e "${YELLOW}   This may take 2-5 minutes...${NC}"
npm install --silent > /dev/null 2>&1 || npm install
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Build project
echo -e "${BLUE}🔧 Building project...${NC}"
npm run build > /dev/null 2>&1
echo -e "${GREEN}✓ Project built${NC}"
echo ""

# Quick test
echo -e "${BLUE}🧪 Running quick test...${NC}"
if npm test tests/knowledge-system/inference-engine.test.ts -- --run > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Tests passed${NC}"
else
    echo -e "${YELLOW}⚠ Tests had issues (but installation completed)${NC}"
fi
echo ""

# Success!
echo -e "${GREEN}${BOLD}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                                                           ║"
echo "║              ✨ INSTALLATION COMPLETE! ✨                 ║"
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""
echo -e "${GREEN}🎉 Enterprise OpenClaw with DRIFT RAG is ready!${NC}"
echo ""
echo -e "${BOLD}Try it now:${NC}"
echo ""
echo -e "  ${BLUE}npx tsx examples/drift-rag-example.ts${NC}"
echo "  ${BLUE}↑ Run this command to see DRIFT RAG in action!${NC}"
echo ""
echo -e "${BOLD}Or start coding:${NC}"
echo ""
echo -e "  ${BLUE}npx tsx${NC}  ${YELLOW}# Interactive TypeScript REPL${NC}"
echo ""
echo -e "${BOLD}Quick example:${NC}"
echo ""
echo -e "${YELLOW}import { DRIFTRAG, KnowledgeGraph } from './extensions/knowledge-system/rag-modes/drift-rag.js';
const graph = new KnowledgeGraph('./test.db');
await graph.initialize();
const rag = new DRIFTRAG({ knowledgeGraph: graph });
// Add nodes and query!${NC}"
echo ""
echo -e "${BOLD}📚 Documentation:${NC}"
echo -e "  ./QUICKSTART.md"
echo -e "  ./extensions/knowledge-system/rag-modes/DRIFT_RAG_README.md"
echo ""
echo -e "${GREEN}Happy building! 🚀${NC}"
echo ""
