import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { heroui } from '@heroui/react'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss({
      plugins: [heroui()],
    }),
  ],
})
