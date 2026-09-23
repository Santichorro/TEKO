import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY. Revisa tu archivo .env'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Mantiene la sesión en localStorage y la refresca sola -> "recargar manteniendo la sesión"
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true, // necesario para el link de recuperación de contraseña
  },
});