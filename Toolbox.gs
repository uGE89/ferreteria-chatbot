/**
 * Proyecto: PlataformaConversacional - Backend en Google Apps Script
 * Archivo: Toolbox.gs
 * Descripción: Contiene las funciones que la IA puede invocar como "herramientas".
 */

// Se asume que SHEET_NAMES e ID_HOJA_PUENTE están definidos globalmente en Configuracion.gs
// y que getSheetData, appendRowToSheet están disponibles (e.g., desde DAL.gs).

/**
 * Registra un problema reportado por un usuario en la hoja 'Mensajes'.
 * @param {string} userId - ID del usuario que reportó el problema.
 * @param {string} asunto - Título breve del problema.
 * @param {string} detalle - Descripción detallada del problema.
 * @param {string} sessionId - ID de la sesión.
 * @returns {string} Mensaje de confirmación.
 */
function registrarProblema(userId, asunto, detalle, sessionId) {
  try {
const userProfile = obtenerDetallesDeUsuario(userId);
const userName = userProfile ? userProfile.Nombre : 'Desconocido';
    const messageId = `MSG-${new Date().getTime()}-${Math.floor(Math.random() * 1000)}`;

    appendRowToSheet(SHEET_NAMES.MENSAJES, {
      ID_Mensaje: messageId,
      FechaHora: getFormattedTimestamp(),
      UsuarioRemitenteID: userId,
      NombreRemitente: userName,
      SesionID: sessionId,
      TipoMensaje: 'Problema',
      Asunto: asunto,
      Detalle: detalle,
      Estado: 'Pendiente',
      RespuestaAdmin: '',
      FechaHoraRespuesta: '',
      AdminRespondiendoID: ''
    });
    return `Listo, registré tu problema: "${asunto}". Gracias.`;
  } catch (e) {
    logError('Toolbox', 'registrarProblema', e.message, e.stack, JSON.stringify({ userId, asunto, detalle, sessionId }));
    throw new Error(`Error al registrar problema: ${e.message}`);
  }
}

/**
 * Registra una sugerencia reportada por un usuario en la hoja 'Mensajes'.
 * @param {string} userId - ID del usuario que envió la sugerencia.
 * @param {string} asunto - Título breve de la sugerencia.
 * @param {string} detalle - Descripción detallada de la sugerencia.
 * @param {string} sessionId - ID de la sesión.
 * @returns {string} Mensaje de confirmación.
 */
function registrarSugerencia(userId, asunto, detalle, sessionId) {
  try {
const userProfile = obtenerDetallesDeUsuario(userId);
const userName = userProfile ? userProfile.Nombre : 'Desconocido';
    const messageId = `MSG-${new Date().getTime()}-${Math.floor(Math.random() * 1000)}`;

    appendRowToSheet(SHEET_NAMES.MENSAJES, {
      ID_Mensaje: messageId,
      FechaHora: getFormattedTimestamp(),
      UsuarioRemitenteID: userId,
      NombreRemitente: userName,
      SesionID: sessionId,
      TipoMensaje: 'Sugerencia',
      Asunto: asunto,
      Detalle: detalle,
      Estado: 'Pendiente',
      RespuestaAdmin: '',
      FechaHoraRespuesta: '',
      AdminRespondiendoID: ''
    });
    return `Listo, registré tu sugerencia: "${asunto}". Gracias.`;
  } catch (e) {
    logError('Toolbox', 'registrarSugerencia', e.message, e.stack, JSON.stringify({ userId, asunto, detalle, sessionId }));
    throw new Error(`Error al registrar sugerencia: ${e.message}`);
  }
}

/**
 * Crea una tarea pendiente en la hoja 'Mensajes' (clasificada como 'Tarea').
 * @param {string} userId - ID del usuario.
 * @param {string} titulo - Título de la tarea.
 * @param {string} descripcion - Descripción de la tarea.
 * @param {string} [fechaLimite=''] - Fecha límite opcional.
 * @param {string} sessionId - ID de la sesión.
 * @returns {string} Mensaje de confirmación.
 */
function crearTareaPendiente(userId, titulo, descripcion, fechaLimite = '', sessionId) {
  try {
const userProfile = obtenerDetallesDeUsuario(userId);
const userName = userProfile ? userProfile.Nombre : 'Desconocido';
    const messageId = `MSG-${new Date().getTime()}-${Math.floor(Math.random() * 1000)}`;

    appendRowToSheet(SHEET_NAMES.MENSAJES, {
      ID_Mensaje: messageId,
      FechaHora: getFormattedTimestamp(),
      UsuarioRemitenteID: userId,
      NombreRemitente: userName,
      SesionID: sessionId,
      TipoMensaje: 'Tarea',
      Asunto: titulo,
      Detalle: `Descripción: ${descripcion}` + (fechaLimite ? ` (Fecha límite: ${fechaLimite})` : ''),
      Estado: 'Pendiente',
      RespuestaAdmin: '',
      FechaHoraRespuesta: '',
      AdminRespondiendoID: ''
    });
    return `¡Hecho! Dejé la tarea pendiente: "${titulo}".`;
  } catch (e) {
    logError('Toolbox', 'crearTareaPendiente', e.message, e.stack, JSON.stringify({ userId, titulo, descripcion, fechaLimite, sessionId }));
    throw new Error(`Error al crear tarea pendiente: ${e.message}`);
  }
}

/**
 * Registra un movimiento de caja (ingreso o egreso) en la hoja 'MovimientosPendientes'.
 * @param {string} tipo - El tipo de movimiento ('Ingreso' o 'Egreso').
 * @param {number} monto - La cantidad del dinero.
 * @param {string} concepto - La razón o descripción del movimiento.
 * @param {string} userId - ID del usuario que solicita el movimiento.
 * @returns {string} Mensaje de confirmación.
 */
function registrarMovimientoCaja(tipo, monto, concepto, userId) {
  try {
    const spreadsheet = SpreadsheetApp.openById(ID_HOJA_PUENTE);
    const sheet = spreadsheet.getSheetByName(SHEET_NAMES.MOVIMIENTOS_PENDIENTES);
    const movimientoId = `MOV-${Date.now()}`; // ID simplificado

    const userProfile = obtenerDetallesDeUsuario(userId);
    const sucursal = userProfile ? userProfile.Sucursal : '';

    const nowFormatted = getFormattedTimestamp();
    const fecha = nowFormatted.split(' ')[0];
    const hora = nowFormatted.split(' ')[1];

    sheet.appendRow([
      movimientoId, // ID_Movimiento
      fecha, // FechaSolicitud
      hora, // HoraSolicitud
      userId, // UsuarioSolicitanteID
      tipo, // Tipo (será 'Ingreso' o 'Egreso')
      monto, // Monto
      concepto, // Concepto
      'Pendiente', // Estado
      sucursal, // Sucursal del usuario solicitante
      '', // FechaAprobacion (vacío)
      ''  // UsuarioAprobadorID (vacío)
    ]);

    return `¡Solicitud registrada! Un supervisor debe aprobar el ${tipo.toLowerCase()} de $${monto} por "${concepto}".`;

  } catch (e) {
    logError('Toolbox', 'registrarMovimientoCaja', e.message, e.stack, JSON.stringify({ tipo, monto, concepto, userId }));
    throw new Error(`Error al registrar la solicitud de movimiento: ${e.message}`);
  }
}

/**
 * Genera un resumen diario para el administrador a partir de los datos de las hojas.
 * @returns {string} El resumen diario.
 */
function generarResumenAdmin() {
  try {
    const today = Utilities.formatDate(new Date(), SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone(), 'yyyy-MM-dd');

    const allConteos = getSheetData(SHEET_NAMES.CONTEOS);
    const conteosHoy = allConteos.filter(c => Utilities.formatDate(new Date(c.Fecha), SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone(), 'yyyy-MM-dd') === today);
    const numConteos = conteosHoy.length;

    const allMessages = getSheetData(SHEET_NAMES.MENSAJES);
    const problemasPendientes = allMessages.filter(m => m.TipoMensaje === 'Problema' && m.Estado === 'Pendiente');
    const sugerenciasPendientes = allMessages.filter(m => m.TipoMensaje === 'Sugerencia' && m.Estado === 'Pendiente');
    const tareasPendientes = allMessages.filter(m => m.TipoMensaje === 'Tarea' && m.Estado === 'Pendiente');

    const resumen = `Resumen de Operaciones del día ${today}:\n\n` +
                    `🛒 Conteos de Inventario: ${numConteos} registros completados.\n` +
                    `⚠️ Problemas Pendientes: ${problemasPendientes.length} incidentes.\n` +
                    `💡 Sugerencias Pendientes: ${sugerenciasPendientes.length} nuevas ideas.\n` +
                    `📝 Tareas Pendientes: ${tareasPendientes.length} tareas por revisar.`;
    return resumen;
  } catch (e) {
    logError('Toolbox', 'generarResumenAdmin', e.message, e.stack);
    return `Error al generar resumen: ${e.message}`;
  }
}

/**
 * Registra múltiples conteos de inventario en la hoja 'Conteos'.
 * @param {Array<object>} conteos - Un array de objetos de conteo ({clave, producto, sistema, fisico}).
 * @param {string} userId - ID del usuario que realizó los conteos.
 * @returns {string} Mensaje de confirmación.
 */
function registrarMultiplesConteos(conteos, userId) {
  try {
    const userProfile = obtenerDetallesDeUsuario(userId);
    const userName = userProfile ? userProfile.Nombre : 'Desconocido';
    const userSucursal = userProfile ? userProfile.Sucursal : 'Desconocida';

    conteos.forEach(conteo => {
      const nowFormatted = getFormattedTimestamp();

      const conteoId = `CONTEO-${new Date().getTime()}-${Math.floor(Math.random() * 1000)}`;

      const diferencia =
        (parseFloat(conteo.stockFisico) || 0) -
        (parseFloat(conteo.stockSistema) || 0) -
        (parseFloat(conteo.vpe) || 0) -
        (parseFloat(conteo.cpi) || 0);

      appendRowToSheet(SHEET_NAMES.CONTEOS, {
        ID_Conteo: conteoId,
        Fecha: nowFormatted.split(' ')[0],
        Hora: nowFormatted.split(' ')[1],
        UsuarioID: userId,
        NombreUsuario: userName,
        ClaveProducto: "'" + String(conteo.clave),
        DescripcionProducto: conteo.descripcion,
        CantidadSistema: conteo.stockSistema,
        CantidadFisico: conteo.stockFisico,
        CPI: conteo.cpi,
        VPE: conteo.vpe,
        'Razón de Ajuste': conteo.razon,
        Diferencia: diferencia,
        Observacion: conteo.observacion || '',
        SucursalUsuario: userSucursal
      });
    });
    return `¡Listo! Se registraron ${conteos.length} conteos de inventario.`;
  }
  catch (e) {
    logError('Toolbox', 'registrarMultiplesConteos', e.message, e.stack, JSON.stringify({ conteos, userId }));
    throw new Error(`Error al registrar conteos: ${e.message}`);
  }
}

/**
 * Obtiene la descripción de un producto a partir de su clave.
 * @param {string} clave - La clave del producto.
 * @returns {string} La descripción encontrada o cadena vacía si no existe.
 */
function obtenerDescripcionPorClave(clave) {
  try {
    const inventario = getSheetData(SHEET_NAMES.INVENTARIO);
    const item = inventario.find(p => String(p.Clave) === String(clave));
    return item ? item.Descripcion : '';
  } catch (e) {
    logError('Toolbox', 'obtenerDescripcionPorClave', e.message, e.stack, clave);
    return '';
  }
}

/**
 * Registra un conteo individual de inventario en la hoja 'Conteos'.
 * Mapea nombres comunes de productos a claves específicas antes de registrar.
 * @param {string} userId - ID del usuario que realiza el conteo.
 * @param {string} claveProducto - La clave o descripción del producto.
 * @param {number} cantidadSistema - Cantidad existente en el sistema.
 * @param {number} cantidadFisico - Cantidad contada físicamente.
 * @param {number} cpi - Compras pendientes de ingreso.
 * @param {number} vpe - Ventas pendientes de entrega.
 * @param {string} observacion - Observaciones o justificación de la diferencia.
 * @param {number} pagosTransferencia - Pagos por transferencia pendientes (solo para caja).
 * @param {number} pagosTarjeta - Pagos con tarjeta pendientes (solo para caja).
 * @returns {string} Mensaje de confirmación.
 */
function registrarConteo(userId, claveProducto, cantidadSistema, cantidadFisico, cpi, vpe, observacion, pagosTransferencia, pagosTarjeta) {
  try {
    const nowFormatted = getFormattedTimestamp();

    const userProfile = obtenerDetallesDeUsuario(userId);
    const userName = userProfile ? userProfile.Nombre : 'Desconocido';
    const userSucursal = userProfile ? userProfile.Sucursal : 'Desconocida';

    // Normaliza y mapea descripciones a claves conocidas
    const claveLower = String(claveProducto).toLowerCase();
    let claveFinal = claveProducto;
    if (claveLower.includes('cemento')) {
      claveFinal = '01';
    } else if (claveLower.includes('caja')) {
      claveFinal = 'CCH';
    }

    const descripcion = obtenerDescripcionPorClave(claveFinal) || String(claveProducto);

    let diferencia =
      (parseFloat(cantidadFisico) || 0) -
      (parseFloat(cantidadSistema) || 0) -
      (parseFloat(cpi) || 0) -
      (parseFloat(vpe) || 0);

    // Ajuste especial para caja chica
    if (claveFinal === 'CCH') {
      const trans = parseFloat(pagosTransferencia) || 0;
      const tarjeta = parseFloat(pagosTarjeta) || 0;
      diferencia -= trans;
      diferencia -= tarjeta;
    }

    const conteoId = `CONTEO-${new Date().getTime()}-${Math.floor(Math.random() * 1000)}`;

    appendRowToSheet(SHEET_NAMES.CONTEOS, {
      ID_Conteo: conteoId,
      Fecha: nowFormatted.split(' ')[0],
      Hora: nowFormatted.split(' ')[1],
      UsuarioID: userId,
      NombreUsuario: userName,
      ClaveProducto: "'" + String(claveFinal),
      DescripcionProducto: descripcion,
      CantidadSistema: cantidadSistema,
      CantidadFisico: cantidadFisico,
      CPI: cpi,
      VPE: vpe,
      Diferencia: diferencia,
      Observacion: observacion || '',
      SucursalUsuario: userSucursal
    });

    return `Conteo registrado para el producto ${claveFinal}.`;
  } catch (e) {
    logError('Toolbox', 'registrarConteo', e.message, e.stack, JSON.stringify({ claveProducto, cantidadSistema, cantidadFisico, cpi, vpe, observacion }));
    throw new Error(`Error al registrar conteo: ${e.message}`);
  }
}

/**
 * Envía una respuesta de un administrador a un mensaje específico.
 * Se ha modificado para recibir el adminUserId del frontend.
 * @param {string} destinoSesion - ID de la sesión del mensaje original.
 * @param {string} destinoUsuarioId - ID del usuario al que se le responde.
 * @param {string} contenido - El texto de la respuesta del administrador.
 * @param {string} adminUserId - El ID del usuario administrador que está respondiendo.
 * @returns {string} Mensaje de confirmación.
 */
function enviarMensajeAdministrador(destinoSesion, destinoUsuarioId, contenido, adminUserId) {
  try {
    Logger.log(`enviarMensajeAdministrador: destinoSesion=${destinoSesion}, destinoUsuarioId=${destinoUsuarioId}, contenido=${contenido}, adminUserId=${adminUserId}`);

    const userProfile = getSheetData(SHEET_NAMES.USUARIOS).find(u => u.UsuarioID === destinoUsuarioId);
    const userName = userProfile ? userProfile.Nombre : 'Desconocido';

    const messages = getSheetData(SHEET_NAMES.MENSAJES);
    let messageToUpdate = messages.find(m => String(m.SesionID) === String(destinoSesion) && String(m.UsuarioRemitenteID) === String(destinoUsuarioId) && m.Estado === 'Pendiente');

    if (messageToUpdate) {
        updateRowInSheet(SHEET_NAMES.MENSAJES, 'ID_Mensaje', messageToUpdate.ID_Mensaje, {
            Estado: 'Respondido',
            RespuestaAdmin: contenido,
            FechaHoraRespuesta: getFormattedTimestamp(),
            AdminRespondiendoID: adminUserId
        });

        return `Mensaje enviado a ${userName} correctamente.`;
    } else {
        logError('Toolbox', 'enviarMensajeAdministrador', `No se encontró el mensaje pendiente para SesionID: ${destinoSesion}, Usuario: ${destinoUsuarioId}`, null, JSON.stringify({ destinoSesion, destinoUsuarioId, contenido }), adminUserId);
        throw new Error('No se pudo encontrar el mensaje original para responder.');
    }

  } catch (e) {
    logError('Toolbox', 'enviarMensajeAdministrador', e.message, e.stack, JSON.stringify({ destinoSesion, destinoUsuarioId, contenido, adminUserId }));
    throw new Error(`Error al enviar mensaje: ${e.message}`);
  }
}
