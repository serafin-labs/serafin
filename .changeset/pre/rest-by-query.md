---
"@serafin/api": patch
---

`PATCH` and `DELETE` on the collection need the new `byQuery` option, as in `McpTransport`: without it, a request without query string would change or delete every resource.
