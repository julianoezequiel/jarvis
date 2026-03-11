Automated memory tests

Run the test which posts a `remember_fact` then queries `search_memory`.

Requirements:
- Dev server running (Next.js) on http://localhost:3000
- Node 18+ (native fetch) or install `node-fetch` for older Node

Run:

```powershell
node tests/auto_memory_test.js
```

You can override base URL:

```powershell
$env:BASE_URL = 'http://localhost:3000'; node tests/auto_memory_test.js
```
