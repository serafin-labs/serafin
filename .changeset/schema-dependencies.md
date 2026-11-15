---
"@serafin/schema-builder": patch
---

`dependentRequired` and `dependentSchemas` follow the properties that are picked, omitted or renamed, and `toOptionals` and `toDeepOptionals` drop `dependentRequired`. `toNullable` turns a `const` into an enum of its value and `null`.
