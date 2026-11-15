# @serafin/mcp

## 1.0.0-alpha.2

### Patch Changes

- 22ccd18: The package is an ES module only, so an application never loads two copies of it. CommonJS projects `require` it on Node.js 20.19, 22.12 or later, which `engines` now declares. The declarations type-check with `moduleResolution: nodenext` and `skipLibCheck: false`.
- 22ccd18: The express peer dependency starts at 4.21.2, which fixes the path-to-regexp ReDoS of earlier versions of express 4 (CVE-2024-52798).

## 1.0.0-alpha.1

### Major Changes

- 33c2d39: First alpha: `McpTransport` exposes pipelines to AI agents as Model Context Protocol tools.
