---
"@serafin/schema-builder": patch
---

`toTypescript` writes property names as string literals and titles as valid identifiers, "Book list" giving `bookListSchema`, so the code it generates always compiles and runs nothing else. It keeps the setters of an enum, such as `setId`.
