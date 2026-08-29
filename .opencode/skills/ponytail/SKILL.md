---
name: ponytail
description: Forces the agent to climb a decision ladder and find the simplest possible solution before writing any code. Slashes code bloat by preferring minimal, clean implementations.
license: MIT
compatibility: opencode
metadata:
  audience: developers
  workflow: planning
---
## What I do
- Before writing code, pause and enumerate at least 3 progressively simpler approaches
- Reject unnecessarily complex solutions (heavy frameworks, excessive abstraction)
- Prefer vanilla JS/CSS over libraries when the task is small
- Keep components under 100 lines; split only when patterns clearly repeat
- Challenge every import: "Do I actually need this?"
- Flag premature optimization and speculative abstractions

## When to use me
Use this skill when you are about to write new code, especially frontend features. Always ask: "What is the minimal change that achieves this?"
