import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      clientPort: 8080,
      port: 8080,
    },
    // Fix WebSocket issues with Supabase realtime
    allowedHosts: true,
  },

  // Build configuration with proper cache busting
  build: {
    outDir: "dist",
    sourcemap: false,
    minify: "terser",
    // Add content hash to filenames for cache busting
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          ui: ["framer-motion", "@radix-ui/react-dialog", "@radix-ui/react-select"],
        },
      },
    },
  },

  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "apple-touch-icon.png"],
      srcDir: "src",
      filename: "service-worker.ts",
      manifest: {
        name: "CrushRadar",
        short_name: "CrushRadar",
        description: "Discover mutual crushes anonymously and safely",
        theme_color: "#00FF85",
        background_color: "#0a0a0a",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png"
          }
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        // Disable all caching during development
        maximumFileSizeToCacheInBytes: mode === 'production' ? 5 * 1024 * 1024 : 0,
        // Don't cache HTML - always get fresh version
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'html-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 0 // No cache for HTML
              },
              cacheableResponse: {
                statuses: [200]
              },
              networkTimeoutSeconds: 3
            }
          },
          {
            // Cache JS/CSS - fetch from network first
            urlPattern: ({ request }) => 
              request.destination === 'script' || 
              request.destination === 'style',
            handler: 'NetworkFirst', // Changed to NetworkFirst for freshest content
            options: {
              cacheName: 'static-resources',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 // 1 day max
              }
            }
          },
          {
            // Cache images
            urlPattern: ({ request }) => 
              request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
              }
            }
          }
        ]
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));

