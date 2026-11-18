---
"@pitter-patter/shuffle": patch
---

Prevent children of inline nodes (nodes with at least one non-empty text node sibling) from being
positioned relative to their _grandparents_ during layout animations, instead of their parents
