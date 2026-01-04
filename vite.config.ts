import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Charge les variables d'environnement basées sur le mode
  // Casting process to any pour éviter les erreurs TypeScript
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      // Clé pour l'IA (Gemini)
      'process.env.API_KEY': JSON.stringify(env.VITE_API_KEY),
      // Clé pour l'affichage visuel (Google Maps JS) - Optionnelle
      'process.env.GOOGLE_MAPS_API_KEY': JSON.stringify(env.VITE_GOOGLE_MAPS_API_KEY)
    }
  }
})