# Frontend Component Style Guide & Architecture Conventions

**Author:** Raksha R. (Senior Frontend Lead)  
**Scope:** Next.js App Router & Tailwind CSS Components

---

## 1. Architectural Rules
1. **Client Components:** Always declare `"use client";` at top of interactive components.
2. **Direct Motion Imports:** Import motion and AnimatePresence directly from `"framer-motion"` rather than through intermediate barrel files to prevent Webpack 5 proxy getter collisions.
3. **Semantic Markup:** Prefer standard semantic elements (`<h2>`, `<span>`, `<button>`) over excessive motion wrappers.
4. **Color Palette Adherence:** Exclusively use AuraGen's defined color tokens (`#080B16`, `#11172A`, `#8057FF`, `#25D9E8`).
