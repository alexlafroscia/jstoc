---
"@alexlafroscia/jstoc": minor
---

Wildcard subpaths in `exports` (e.g. `"./components/*"`) are now enumerated against the files that match them on disk, instead of being skipped with a warning.
