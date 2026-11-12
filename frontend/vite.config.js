import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Forward API calls to the FastAPI backend (uvicorn main:app --reload).
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
})
