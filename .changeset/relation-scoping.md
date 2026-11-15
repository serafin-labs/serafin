---
"@serafin/pipeline": patch
---

The query of a relation can no longer change what the relation sets itself: those properties are left out of its `with<Name>` option, and win over the query. A resource whose key is `null` relates to nothing, rather than failing the read of the whole page.
