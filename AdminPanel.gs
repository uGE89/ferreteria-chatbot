/**
 * Proyecto: PlataformaConversacional - Backend en Google Apps Script
 * Archivo: AdminPanel.gs
 * Descripción: Funciones específicas para el panel de administración.
 */

// Se asume que SHEET_NAMES e ID_HOJA_PUENTE están definidos globalmente en Configuracion.gs
// y que getSheetData y getSheetDataById están disponibles (e.g., desde DAL.gs).


/**
 * Obtiene y procesa ÚNICAMENTE los mensajes de la hoja local 'Mensajes'.
 * @returns {Array<object>} Una lista de ítems de mensajes.
 */
function obtenerPanelAdminData_SoloMensajes(userId) {
  Logger.log('--- INICIANDO obtenerPanelAdminData_SoloMensajes ---');
  try {
    Logger.log('Paso 1: Leyendo datos de la hoja local "Mensajes"...');
    const todosMensajes = getSheetData(SHEET_NAMES.MENSAJES);
    Logger.log('Paso 1b: Leyendo datos de "MensajeColaborador"...');
    let relacion = getSheetData(SHEET_NAMES.MENSAJE_COLABORADOR);
    const perfil = obtenerDetallesDeUsuario(userId);
    const esAdmin = perfil && perfil.Rol === 'Administrador';
    if (!esAdmin) {
      relacion = relacion.filter(r => r.ColaboradorID === userId);
    }
    const idsPermitidos = relacion.map(r => r.ID_Mensaje);
    const mensajes = esAdmin ? todosMensajes
      : todosMensajes.filter(m => idsPermitidos.includes(m.ID_Mensaje));
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
    Logging.logError('AdminPanel', 'obtenerPanelAdminData_SoloMensajes', e.message, e.stack);
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
      const fechaObj = parseSafeDate(`${m.FechaSolicitud} ${m.HoraSolicitud}`);
      const item = {
        id: m.ID_Movimiento,
        tipo: 'Caja',
        fecha: fechaObj ? fechaObj.toISOString() : null,
        usuario: m.UsuarioSolicitanteID,
        asunto: m.Concepto,
        detalle: `Tipo: ${m.Tipo} - Monto: $${m.Monto}`,
        estado: m.Estado,
        sucursal: m.Sucursal
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
    Logging.logError('AdminPanel', 'obtenerMovimientosDeCaja', e.message, e.stack);
    return [];
  }
}

/**
 * Actualiza el estado de un mensaje en la hoja 'Mensajes'.
 * @param {string} itemId - El ID del mensaje a modificar.
 * @param {string} nuevoEstado - El nuevo estado que se asignará.
 * @returns {string} Mensaje de confirmación.
 */
function actualizarEstadoItemAdmin(itemId, nuevoEstado) {
  try {
    const ok = updateRowInSheet(
      SHEET_NAMES.MENSAJES,
      'ID_Mensaje',
      itemId,
      { Estado: nuevoEstado }
    );

    if (!ok) {
      throw new Error('No se encontró el item a actualizar.');
    }

    return `Estado actualizado a "${nuevoEstado}".`;
  } catch (e) {
    Logging.logError('AdminPanel', 'actualizarEstadoItemAdmin', e.message, e.stack, JSON.stringify({ itemId, nuevoEstado }));
    throw new Error(`Error al actualizar estado: ${e.message}`);
  }
}
