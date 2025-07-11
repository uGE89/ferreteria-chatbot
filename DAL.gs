/**
 * Proyecto: PlataformaConversacional - Backend en Google Apps Script
 * Archivo: DAL.gs
 * Descripción: Capa de Acceso a Datos (Data Access Layer).
 * Contiene funciones para interactuar directamente con las hojas de cálculo.
 */

// Se asume que SHEET_NAMES está definido globalmente en Configuracion.gs
// y es accesible aquí. Si no lo está, necesitarás importarlo o definirlo nuevamente.


/**
 * Obtiene todos los datos de una hoja específica como un array de objetos.
 * Utiliza getDisplayValues() para leer todos los datos como texto, preservando
 * formatos, ceros iniciales y asegurando que los booleanos se lean como "TRUE" o "FALSE".
 * @param {string} sheetName - El nombre de la hoja.
 * @returns {Array<object>} Un array de objetos, donde cada objeto es una fila.
 */
function getSheetData(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    logError('DAL', 'getSheetData', `Hoja '${sheetName}' no encontrada.`);
    return [];
  }

  const range = sheet.getDataRange();

  // El cambio clave: lee los valores tal como se muestran en la hoja.
  const values = range.getDisplayValues();

  if (values.length < 2) return []; // Si no hay datos además de la cabecera

  const headers = values[0];
  const data = [];
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const rowObject = {};
    for (let j = 0; j < headers.length; j++) {
      // Se asegura de que la cabecera no esté vacía antes de asignarla
      if (headers[j]) {
        rowObject[headers[j]] = row[j];
      }
    }
    data.push(rowObject);
  }
  return data;
}

/**
 * Agrega una nueva fila a una hoja específica.
 * Los datos deben ser un objeto donde las claves coincidan con los encabezados de la hoja.
 * @param {string} sheetName - El nombre de la hoja.
 * @param {object} rowData - El objeto con los datos a añadir.
 */
function appendRowToSheet(sheetName, rowData) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    logError('DAL', 'appendRowToSheet', `Hoja '${sheetName}' no encontrada.`);
    return false;
  }

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = [];
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i];
    let value = rowData[header];
    if (typeof value === 'object' && value !== null) {
      try {
        value = JSON.stringify(value);
      } catch (e) {
        logError('DAL', 'appendRowToSheet', `Error al serializar JSON para ${header}: ${e.message}`, e.stack, JSON.stringify(rowData));
        value = String(value);
      }
    }
    row.push(value !== undefined ? value : '');
  }
  sheet.appendRow(row);
  return true;
}

/**
 * Actualiza una fila existente en una hoja basada en una columna clave y su valor.
 * @param {string} sheetName - El nombre de la hoja.
 * @param {string} keyColumn - El nombre de la columna que sirve como clave de búsqueda.
 * @param {*} keyValue - El valor de la clave a buscar.
 * @param {object} updatedData - Un objeto con los datos a actualizar (solo las columnas a cambiar).
 */
function updateRowInSheet(sheetName, keyColumn, keyValue, updatedData) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    logError('DAL', 'updateRowInSheet', `Hoja '${sheetName}' no encontrada.`);
    return false;
  }

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const keyColumnIndex = headers.indexOf(keyColumn);
  if (keyColumnIndex === -1) {
    logError('DAL', 'updateRowInSheet', `Columna clave '${keyColumn}' no encontrada en la hoja '${sheetName}'.`);
    return false;
  }

  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();

  for (let i = 1; i < values.length; i++) {
if (String(values[i][keyColumnIndex]) === String(keyValue)) {      const row = values[i];
      for (const prop in updatedData) {
        const headerIndex = headers.indexOf(prop);
        if (headerIndex !== -1) {
          let valueToUpdate = updatedData[prop];
          if (typeof valueToUpdate === 'object' && valueToUpdate !== null) {
            try {
              valueToUpdate = JSON.stringify(valueToUpdate);
            } catch (e) {
              logError('DAL', 'updateRowInSheet', `Error al serializar JSON para ${prop}: ${e.message}`, e.stack, JSON.stringify(updatedData));
              valueToUpdate = String(valueToUpdate);
            }
          }
          row[headerIndex] = valueToUpdate;
        }
      }
      sheet.getRange(i + 1, 1, 1, row.length).setValues([row]);
      return true;
    }
  }
  return false;
}

/**
 * Obtiene datos de una HOJA ESPECÍFICA en un ARCHIVO DE SPREADSHEET ESPECÍFICO por su ID.
 * @param {string} spreadsheetId - El ID del archivo de Google Sheets.
 * @param {string} sheetName - El nombre de la pestaña (hoja) dentro de ese archivo.
 * @returns {Array<object>} Un array de objetos con los datos.
 */
function getSheetDataById(spreadsheetId, sheetName) {
  try {
    const ss = SpreadsheetApp.openById(spreadsheetId);
    if (!ss) {
      throw new Error(`No se pudo abrir el archivo con ID: ${spreadsheetId}`);
    }

    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      Logger.log(`Advertencia: No se encontró la hoja '${sheetName}' en el archivo con ID '${spreadsheetId}'.`);
      return [];
    }

    const range = sheet.getDataRange();
    const values = range.getDisplayValues();
    if (values.length < 2) return [];

    const headers = values[0];
    const data = [];
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      const rowObject = {};
      for (let j = 0; j < headers.length; j++) {
        if (headers[j]) {
          rowObject[headers[j]] = row[j];
        }
      }
      data.push(rowObject);
    }
    return data;
  } catch (e) {
    logError('DAL', 'getSheetDataById', `Error leyendo la hoja '${sheetName}' del archivo ID '${spreadsheetId}'.`, e.stack);
    return [];
  }
}



// Variable para guardar los usuarios en memoria durante una sola ejecución
var _usersDataCache = null;

/**
 * Obtiene los detalles de un usuario específico. Usa un caché en memoria
 * para evitar leer la hoja de 'Usuarios' múltiples veces en la misma ejecución.
 * @param {string} userId - El ID del usuario a buscar.
 * @returns {object|null} El objeto del perfil del usuario o null si no se encuentra.
 */
function obtenerDetallesDeUsuario(userId) {
  // Si no hemos cargado los usuarios en esta ejecución, los leemos de la hoja.
  if (_usersDataCache === null) {
    _usersDataCache = getSheetData(SHEET_NAMES.USUARIOS);
  }

  // Buscamos en los datos ya cargados en memoria.
  const userProfile = _usersDataCache.find(u => u.UsuarioID === userId);

  return userProfile || null;
}
