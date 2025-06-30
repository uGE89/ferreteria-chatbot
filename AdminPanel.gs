/**
 * Proyecto: PlataformaConversacional - Backend en Google Apps Script
 * Archivo: AdminPanel.gs
 * Descripción: Funciones específicas para el panel de administración.
 */

// Se asume que SHEET_NAMES e ID_HOJA_PUENTE están definidos globalmente en Configuracion.gs
// y que getSheetData y getSheetDataById están disponibles (e.g., desde DAL.gs).

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

/**
 * Obtiene y procesa ÚNICAMENTE los mensajes de la hoja local 'Mensajes'.
 * @returns {Array<object>} Una lista de ítems de mensajes.
 */
function obtenerPanelAdminData_SoloMensajes() {
  Logger.log('--- INICIANDO obtenerPanelAdminData_SoloMensajes ---');
  try {
    Logger.log('Paso 1: Leyendo datos de la hoja local "Mensajes"...');
    const mensajes = getSheetData(SHEET_NAMES.MENSAJES);
    Logger.log(` -> Se encontraron ${mensajes.length} mensajes brutos.`);

    Logger.log('Paso 2: Mapeando y estandarizando ítems de Mensajes...');
    const itemsMensajes = mensajes.map(m => {
      const fechaObj = parseSafeDate(m.FechaHora);
      const item = {
        id: m.ID_Mensaje,
        tipo: m.TipoMensaje,
        fecha: fechaObj ? fechaObj.toISOString() : null, // Convertir a ISO String para envío al frontend
        usuario: `${m.NombreRemitente} (${m.UsuarioRemitenteID})`,
        asunto: m.Asunto,
        detalle: m.Detalle,
        estado: m.Estado
      };
      return item;
    });
    Logger.log(` -> Se mapearon ${itemsMensajes.length} ítems de Mensajes estandarizados.`);

    Logger.log('Paso 3: Ordenando ítems de Mensajes por fecha...');
    itemsMensajes.sort((a, b) => {
      const dateA = a.fecha ? new Date(a.fecha) : null;
      const dateB = b.fecha ? new Date(b.fecha) : null;

      if (!dateA || isNaN(dateA.getTime())) return 1; // Manejar fechas inválidas
      if (!dateB || isNaN(dateB.getTime())) return -1; // Manejar fechas inválidas
      return dateB.getTime() - dateA.getTime();
    });
    Logger.log(' -> Ordenamiento de Mensajes completado.');

    Logger.log(`--- FINALIZANDO obtenerPanelAdminData_SoloMensajes: Se devolverán ${itemsMensajes.length} ítems. ---`);
    return itemsMensajes;
  } catch(e) {
    Logger.log(`--- ❌ ERROR en obtenerPanelAdminData_SoloMensajes ---`);
    Logger.log(`   - Mensaje: ${e.message}`);
    Logger.log(`   - Stack: ${e.stack}`);
    logError('AdminPanel', 'obtenerPanelAdminData_SoloMensajes', e.message, e.stack);
    return [];
  }
}

/**
 * Obtiene y procesa ÚNICAMENTE los movimientos de la hoja externa 'MovimientosPendientes'.
 * @returns {Array<object>} Una lista de ítems de movimientos de caja.
 */
function obtenerMovimientosDeCaja() {
  Logger.log('--- INICIANDO obtenerMovimientosDeCaja ---');
  try {
    Logger.log(`Paso 1: Leyendo datos de la hoja externa "MovimientosPendientes" (ID: ${ID_HOJA_PUENTE})...`);
    const movimientosCaja = getSheetDataById(ID_HOJA_PUENTE, SHEET_NAMES.MOVIMIENTOS_PENDIENTES);
    Logger.log(` -> Se encontraron ${movimientosCaja.length} movimientos brutos de caja.`);

    Logger.log('Paso 2: Mapeando y estandarizando ítems de Caja...');
    const itemsCaja = movimientosCaja.map(m => {
      const fechaObj = parseSafeDate(m.FechaSolicitud); // Asumo que la columna de fecha en MovimientosPendientes se llama FechaSolicitud
      const item = {
        id: m.ID_Movimiento,
        tipo: 'Caja', // Tipo fijo
        fecha: fechaObj ? fechaObj.toISOString() : null, // Convertir a ISO String para envío al frontend
        usuario: m.UsuarioSolicitanteID,
        asunto: m.Concepto,
        detalle: `Tipo: ${m.Tipo} - Monto: $${m.Monto}`,
        estado: m.Estado
      };
      return item;
    });
    Logger.log(` -> Se mapearon ${itemsCaja.length} ítems de Caja estandarizados.`);

    Logger.log(`--- FINALIZANDO obtenerMovimientosDeCaja: Se devolverán ${itemsCaja.length} ítems. ---`);
    return itemsCaja;
  } catch (e) {
    Logger.log(`--- ❌ ERROR en obtenerMovimientosDeCaja ---`);
    Logger.log(`   - Mensaje: ${e.message}`);
    Logger.log(`   - Stack: ${e.stack}`);
    logError('AdminPanel', 'obtenerMovimientosDeCaja', e.message, e.stack);
    return [];
  }
}
