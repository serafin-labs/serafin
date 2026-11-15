---
"@serafin/schema-builder": patch
"@serafin/pipeline": patch
"@serafin/open-api": patch
"@serafin/api": patch
"@serafin/mcp": patch
---

The package is an ES module only, so an application never loads two copies of it. CommonJS projects `require` it on Node.js 20.19, 22.12 or later, which `engines` now declares. The declarations type-check with `moduleResolution: nodenext` and `skipLibCheck: false`.
