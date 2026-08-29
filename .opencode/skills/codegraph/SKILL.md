---
name: codegraph
description: Builds and maintains a local knowledge graph of the codebase so the agent stays efficient with context window usage.
license: MIT
compatibility: opencode
metadata:
  audience: developers
  workflow: research
---
## What I do
- Before making changes, map the relevant module boundaries, data flow, and key files
- Identify the minimal set of files needed to understand a task rather than re-reading the whole project
- Track relationships: file depends on, file implements, file tests
- When context gets large, summarize what's been learned and what still needs investigation
- Cache structural understanding: module entry points, shared utilities, configuration

## When to use me
Use this skill at the start of a session or when switching context to a new area of the codebase. Helps avoid burning through context limits.
