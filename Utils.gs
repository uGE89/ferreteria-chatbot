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

/**
 * Parsea de forma segura una cadena de fecha de diferentes formatos.
 * Si la fecha es inválida o vacía, devuelve null.
 * @param {string} dateString - La cadena de fecha de la hoja de cálculo.
 * @returns {Date|null} Un objeto Date válido o null.
 */
function parseSafeDate(dateString) {
  if (!dateString || typeof dateString !== 'string') {
    return null;
  }

  // Intento 1: Parseo directo. Funciona para ISO 8601 ("2025-06-27T...").
  let date = new Date(dateString);
  if (!isNaN(date.getTime())) {
    return date;
  }

  // Intento 2: Parseo manual para el formato "DD/M/YYYY HH:mm:ss".
  try {
    const parts = dateString.split(' '); // Separa fecha y hora: ["27/6/2025", "13:58:48"]
    const dateParts = parts[0].split('/'); // Separa la fecha: ["27", "6", "2025"]
    const timeParts = parts[1] ? parts[1].split(':') : [0, 0, 0]; // Separa la hora

    // Extraemos los componentes como números enteros
    const day = parseInt(dateParts[0], 10);
    const month = parseInt(dateParts[1], 10);
    const year = parseInt(dateParts[2], 10);
    const hours = parseInt(timeParts[0] || 0, 10);
    const minutes = parseInt(timeParts[1] || 0, 10);
    const seconds = parseInt(timeParts[2] || 0, 10);

    // Creamos la fecha. OJO: Los meses en JavaScript son 0-indexados (Enero=0, Diciembre=11).
    date = new Date(year, month - 1, day, hours, minutes, seconds);

    // Verificamos que la fecha creada manualmente sea válida
    if (!isNaN(date.getTime())) {
      return date;
    }
  } catch (e) {
    // Si el parseo manual falla, simplemente continuamos para devolver null.
  }

  // Si todos los intentos fallan, devolvemos null para no romper la aplicación.
  return null;
}

