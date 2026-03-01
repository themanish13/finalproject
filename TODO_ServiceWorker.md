# Service Worker Implementation TODO

## Task: Make app a real PWA by fixing service worker registration

### Steps:
- [x] 1. Update vite.config.ts to use TypeScript service worker (src/service-worker.ts)
- [x] 2. Create src/service-worker.ts with proper TypeScript types
- [x] 3. Call registerServiceWorker() in src/main.tsx
- [x] 4. Verify the build works and service-worker.js is generated

## Summary of Changes:
1. **vite.config.ts**: Added `srcDir: "src"` and `filename: "service-worker.ts"` to generate from TypeScript
2. **src/service-worker.ts**: Created TypeScript service worker with proper types
3. **src/utils/serviceWorkerRegistration.ts**: Updated registration path to `/service-worker.js`
4. **src/main.tsx**: Added import and call to `registerServiceWorker()`

## Additional: Changed green theme to red
- Updated primary color from `#00FF85` to `#FF0040` (red)
- Updated accent, ring, gradients, box-shadows, and animations
- Updated PWA manifest theme_color
- Updated CSS HSL values in src/index.css
- Updated tailwind.config.ts color values

