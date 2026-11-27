/**
 * Lee ?redirect= de la URL y solo lo acepta si es una ruta interna
 * (empieza por "/" y no por "//"), para evitar redirecciones a otros sitios.
 */
export function getSafeRedirect(search: string): string | null {
  const value = new URLSearchParams(search).get('redirect')
  if (!value || !value.startsWith('/') || value.startsWith('//')) return null
  return value
}
