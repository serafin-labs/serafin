---
"@serafin/pipeline": patch
---

The schemas derived from the model, and the copies of a schema in relations, leave its `$id` out, so a model with an `$id` can be the target of several relations. Relations store resources in maps without prototype, so ids such as `__proto__` or `constructor` are keys like any other.
