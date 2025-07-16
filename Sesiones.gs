/**
 * Funciones de mantenimiento para las sesiones de chat.
 */

/**
 * Revisa las sesiones y marca como inactivas las que superen
 * HORAS_INACTIVIDAD_SESION sin actividad. También limpia su historial.
 */
function limpiarSesionesInactivas() {
  try {
    const sesiones = getSheetData(SHEET_NAMES.SESIONES);
    const ahora = new Date();
    const limiteMs = HORAS_INACTIVIDAD_SESION * 60 * 60 * 1000;

    sesiones.forEach(s => {
      const ultima = parseSafeDate(s.UltimaActividad);
      if (!ultima) return;

      if (ahora.getTime() - ultima.getTime() > limiteMs && s.EstadoSesion !== 'Inactiva') {
        updateRowInSheet(SHEET_NAMES.SESIONES, 'SesionID', s.SesionID, {
          EstadoSesion: 'Inactiva',
          HistorialConversacion: ''
        });
      }
    });
  } catch (e) {
    Logging.logError('Backend', 'limpiarSesionesInactivas', e.message, e.stack);
  }
}

/**
 * Instala un disparador horario para limpiar sesiones inactivas.
 */
function instalarTriggerLimpiezaSesiones() {
  ScriptApp.newTrigger('limpiarSesionesInactivas')
    .timeBased()
    .everyHours(1)
    .create();
}
