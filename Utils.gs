/**
 * Genera un ID único basado en un prefijo, timestamp y número aleatorio.
 * @param {string} prefijo - Prefijo para el ID.
 * @returns {string} ID generado.
 */
function generarId(prefijo) {
  const timestamp = Date.now();
  const aleatorio = Math.floor(Math.random() * 1000);
  return `${prefijo}-${timestamp}-${aleatorio}`;
}

