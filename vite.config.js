import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
// import { viteStaticCopy } from 'vite-plugin-static-copy'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    {
      name: 'patch-pdfjs-mapper-bug',
      enforce: 'pre',
      transform(code, id) {
        if (id.includes('pdfjs-dist') && id.endsWith('.mjs')) {
          // pdfjs-dist uses a singleton pagesMapper which crashes when loading multiple documents sequentially.
          // By replacing the check with 'false', we bypass the artificial restriction.
          return code.replace('pageNumber > this.#pagesMapper.pagesNumber', 'false');
        }
      }
    }
  ],
  optimizeDeps: {
    exclude: ['pdfjs-dist']
  }
})
