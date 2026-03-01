import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    viteStaticCopy({
      targets: [
        {
          src: 'src/docs/TEST/*',
          dest: 'test-pdfs'
        }
      ]
    })
  ],
  optimizeDeps: {
    include: ['pdfjs-dist']
  }
})
