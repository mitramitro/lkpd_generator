import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { apiPlugin } from './server/viteApiPlugin.js'

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), apiPlugin(mode)],
}))
