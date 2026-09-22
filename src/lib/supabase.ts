import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY. Verifica que .env.local exista en la raíz del proyecto y que reinicies `npm run dev` después de crearlo/editarlo (Vite solo lee variables de entorno al arrancar).'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);