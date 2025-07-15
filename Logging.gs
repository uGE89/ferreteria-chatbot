/**
 * Módulo de registro y utilidades para errores.
 */
const Logging = {
  /**
   * Registra errores de la aplicación en la hoja de LogErrores.
   * @param {string} tipoError - Tipo de error (e.g., 'Backend', 'AI', 'Frontend').
   * @param {string} funcion - Nombre de la función donde ocurrió el error.
   * @param {string} mensajeError - Mensaje descriptivo del error.
   * @param {string} [stackTrace=''] - Stack trace del error.
   * @param {string} [payload=''] - Datos relevantes asociados al error (serializados).
   * @param {string} [userId='N/A'] - ID del usuario si aplica.
   */
  logError: function(tipoError, funcion, mensajeError, stackTrace = '', payload = '', userId = 'N/A') {
    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const sheet = ss.getSheetByName(SHEET_NAMES.LOG_ERRORES);
      if (!sheet) {
        Logger.log(`ERROR: La hoja '${SHEET_NAMES.LOG_ERRORES}' no existe. Error no registrado: ${mensajeError}`);
        return;
      }
      const now = new Date();
      const dateStr = Utilities.formatDate(now, SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone(), 'yyyy-MM-dd HH:mm:ss');
      const logId = generarId('LOG');
      sheet.appendRow([logId, dateStr, userId, tipoError, funcion, mensajeError, stackTrace, payload]);
    } catch (e) {
      Logger.log(`Fallo crítico en logError: ${e.message}`);
    }
  }
};

