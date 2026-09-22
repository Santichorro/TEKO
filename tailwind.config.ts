import type { Config } from 'tailwindcss'

/**
 * TEKO V2 — Design tokens (Día 2: Sistema visual)
 * Paleta cerrada por especificación (sección 18): no agregar tintes ni colores nuevos.
 */
const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#252326',      // gris oscuro — fondo, texto principal, navegación, contraste
        surface: '#E9DDC9',  // beige — superficies, tarjetas, fondos secundarios
        accent: '#7951D8',   // violeta — acciones, estados activos, foco, acentos
      },
      fontFamily: {
        // Display: headers, títulos de sección, números grandes (Dashboard, ProgressBar)
        display: ['"Space Grotesk"', 'sans-serif'],
        // Body: texto de lectura normal en formularios, cards, descripciones
        sans: ['Inter', 'sans-serif'],
        // Mono: metadatos, badges, timestamps, labels — el "aire técnico" de las referencias
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      letterSpacing: {
        tightest: '-0.03em', // para display headers
        wideMono: '0.08em',  // para labels/badges en mono uppercase
      },
      lineHeight: {
        tightest: '0.9',
      },
      borderRadius: {
        none: '0px',
        DEFAULT: '2px', // radius casi nulo en todo el sistema; nunca "rounded-lg" o mayor
      },
      borderWidth: {
        DEFAULT: '2px',
        3: '3px',
      },
      boxShadow: {
        // Sombra dura desplazada, sin blur — reemplaza cualquier shadow-md/lg por defecto de Tailwind
        hard: '4px 4px 0 0 #252326',
        'hard-sm': '2px 2px 0 0 #252326',
        'hard-accent': '4px 4px 0 0 #7951D8', // para estados de foco/activo
        none: 'none',
      },
    },
  },
  plugins: [],
}

export default config