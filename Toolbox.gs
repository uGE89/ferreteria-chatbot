/**
 * Proyecto: PlataformaConversacional - Backend en Google Apps Script
 * Archivo: Toolbox.gs
 * Descripción: Contiene las funciones que la IA puede invocar como "herramientas".
 */

// Se asume que SHEET_NAMES e ID_HOJA_PUENTE están definidos globalmente en Configuracion.gs
// y que getSheetData, appendRowToSheet están disponibles (e.g., desde DAL.gs).

const PUNTOS_PROBLEMA = 10;
const PUNTOS_SUGERENCIA = 15;
const PUNTOS_CONTEO = 5;
const PUNTOS_ARQUEO = 10;

/**
 * Registra un mensaje del usuario en la hoja 'Mensajes'.
 * @param {string} tipo - Tipo de mensaje (Problema, Sugerencia, Tarea, etc.).
 * @param {string} userId - ID del usuario remitente.
 * @param {string} asunto - Asunto del mensaje.
 * @param {string} detalle - Detalle del mensaje.
 * @param {string} sessionId - ID de la sesión.
 * @param {number} puntos - Puntos a otorgar al usuario.
 * @returns {string} ID del mensaje creado.
 */
function registrarMensaje(tipo, userId, asunto, detalle, sessionId, puntos) {
  const userProfile = obtenerDetallesDeUsuario(userId);
  const userName = userProfile ? userProfile.Nombre : 'Desconocido';
  const messageId = generarId('MSG');

  appendRowToSheet(SHEET_NAMES.MENSAJES, {
    ID_Mensaje: messageId,
    FechaHora: getFormattedTimestamp(),
    UsuarioRemitenteID: userId,
    NombreRemitente: userName,
    SesionID: sessionId,
    TipoMensaje: tipo,
    Asunto: asunto,
    Detalle: detalle,
    Estado: 'Pendiente',
    RespuestaAdmin: '',
    FechaHoraRespuesta: '',
    AdminRespondiendoID: '',
    Aprobado: false,
    Visto: false,
    Destacado: false,
    Fijado: false
  });

  appendRowToSheet(SHEET_NAMES.MENSAJE_COLABORADOR, {
    ColaboradorID: userId,
    NombreColaborador: userName,
    ID_Mensaje: messageId,
    UsuarioRemitenteID: userId,
    NombreRemitente: userName
  });

  if (puntos) {
    sumarPuntos(userId, puntos);
  }

  return messageId;
}

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
    registrarMensaje('Problema', userId, asunto, detalle, sessionId, PUNTOS_PROBLEMA);
    return `Listo, registré tu problema: "${asunto}". Gracias.`;
  } catch (e) {
    Logging.logError('Toolbox', 'registrarProblema', e.message, e.stack, JSON.stringify({ userId, asunto, detalle, sessionId }));
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
    registrarMensaje('Sugerencia', userId, asunto, detalle, sessionId, PUNTOS_SUGERENCIA);
    return `Listo, registré tu sugerencia: "${asunto}". Gracias.`;
  } catch (e) {
    Logging.logError('Toolbox', 'registrarSugerencia', e.message, e.stack, JSON.stringify({ userId, asunto, detalle, sessionId }));
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
    const detalle = `Descripción: ${descripcion}` + (fechaLimite ? ` (Fecha límite: ${fechaLimite})` : '');
    registrarMensaje('Tarea', userId, titulo, detalle, sessionId, 0);
    return `¡Hecho! Dejé la tarea pendiente: "${titulo}".`;
  } catch (e) {
    Logging.logError('Toolbox', 'crearTareaPendiente', e.message, e.stack, JSON.stringify({ userId, titulo, descripcion, fechaLimite, sessionId }));
    throw new Error(`Error al crear tarea pendiente: ${e.message}`);
  }
}

/**
 * Registra un movimiento de caja (ingreso o egreso) en la hoja 'MovimientosPendientes'.
 * @param {string} tipo - El tipo de movimiento ('Ingreso' o 'Egreso').
 * @param {number} monto - La cantidad del dinero.
 * @param {string} concepto - La razón o descripción del movimiento.
 * @param {string} contacto - Persona o entidad relacionada con el movimiento.
 * @param {string} userId - ID del usuario que solicita el movimiento.
 * @returns {string} Mensaje de confirmación.
 */
function registrarMovimientoCaja(tipo, monto, concepto, contacto, userId) {
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
      contacto, // Contacto
      'Pendiente', // Estado
      sucursal, // Sucursal del usuario solicitante
      '', // FechaAprobacion (vacío)
      ''  // UsuarioAprobadorID (vacío)
    ]);

    return `¡Solicitud registrada! Un supervisor debe aprobar el ${tipo.toLowerCase()} de $${monto} para ${contacto} por "${concepto}".`;

  } catch (e) {
    Logging.logError('Toolbox', 'registrarMovimientoCaja', e.message, e.stack, JSON.stringify({ tipo, monto, concepto, contacto, userId }));
    throw new Error(`Error al registrar la solicitud de movimiento: ${e.message}`);
  }
}

/**
 * Genera un resumen diario detallado para el administrador.
 * Se recopilan los mensajes del día y se envían a la IA para un resumen.
 * @returns {string} Resumen generado por la IA o mensaje de error.
 */
function resumenAdminPorFecha(fechaRef) {
  try {
    const tz = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();

    const conteos = getSheetData(SHEET_NAMES.CONTEOS).filter(c => {
      const f = parseSafeDate(c.Fecha);
      return f && Utilities.formatDate(f, tz, 'yyyy-MM-dd') === fechaRef;
    });

    const mensajes = getSheetData(SHEET_NAMES.MENSAJES).filter(m => {
      const f = parseSafeDate(m.FechaHora);
      return f && Utilities.formatDate(f, tz, 'yyyy-MM-dd') === fechaRef;
    });

    let listadoMensajes = '';
    mensajes.forEach(m => {
      const hora = Utilities.formatDate(parseSafeDate(m.FechaHora), tz, 'HH:mm');
      const perfil = obtenerDetallesDeUsuario(m.UsuarioRemitenteID) || {};
      const area = perfil.Sucursal || perfil.Rol || '';
      let linea = `${m.NombreRemitente} (${hora}`;
      linea += area ? `, ${area}` : '';
      linea += `): "${m.Detalle}"`;
      if (m.Estado) linea += ` [${m.Estado}]`;
      if (m.RespuestaAdmin) linea += ` Respuesta: ${m.RespuestaAdmin}`;
      listadoMensajes += linea + '\n';
    });

    listadoMensajes = limitarTexto(listadoMensajes);

    const conteosRealizados = conteos.length;
    const problemasPendientes = mensajes.filter(m => m.TipoMensaje === 'Problema' && m.Estado === 'Pendiente').length;
    const sugerenciasPendientes = mensajes.filter(m => m.TipoMensaje === 'Sugerencia' && m.Estado === 'Pendiente').length;
    const tareasPendientes = mensajes.filter(m => m.TipoMensaje === 'Tarea' && m.Estado === 'Pendiente').length;

    const resumenDatos =
      `Conteos realizados: ${conteosRealizados}\n` +
      `Problemas pendientes: ${problemasPendientes}\n` +
      `Sugerencias pendientes: ${sugerenciasPendientes}\n` +
      `Tareas pendientes: ${tareasPendientes}`;

    let instrucciones =
      'Eres el asistente virtual para el supervisor de Ferretería Flores. ' +
      'Aquí están los reportes y sugerencias enviados hoy por el personal:\n\n' +
      listadoMensajes;

    if (conteosRealizados !== 0 || problemasPendientes !== 0 || sugerenciasPendientes !== 0 || tareasPendientes !== 0) {
      instrucciones +=
        '\nAdemás, estos fueron los conteos completados y tareas pendientes:\n' +
        resumenDatos;
    }

    instrucciones +=
      '\n\nPor favor, genera un resumen para el supervisor destacando:\n' +
      '- Qué problemas y sugerencias se reportaron, quién los dijo y en qué área.\n' +
      '- Acciones o seguimientos sugeridos.\n' +
      '- Si hay reportes urgentes o repetidos.\n' +
      'Un cierre breve y cordial.';

    const payload = {
      model: MODELO_DEFAULT,
      messages: [
        { role: 'system', content: instrucciones }
      ],
      temperature: TEMPERATURA_AI,
      max_tokens: 400
    };

    const apiResult = llamarOpenAI(payload);
    if (apiResult.code !== 200) {
      Logging.logError('Toolbox', 'resumenAdminPorFecha', `Error API ${apiResult.code}`, null, JSON.stringify(payload));
      return 'Error al generar el resumen.';
    }
    const json = JSON.parse(apiResult.text);
    return json.choices?.[0]?.message?.content || 'No se pudo obtener resumen.';
  } catch (e) {
    Logging.logError('Toolbox', 'resumenAdminPorFecha', e.message, e.stack);
    return `Error al generar resumen: ${e.message}`;
  }
}

function generarResumenAdmin(dias) {
  try {
    const tz = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();
    let cantidad = parseInt(dias, 10);
    if (isNaN(cantidad) || cantidad < 1) cantidad = 1;
    if (cantidad > 7) cantidad = 7;

    const fechaFin = new Date();
    const fechaInicio = new Date();
    fechaInicio.setDate(fechaFin.getDate() - (cantidad - 1));

    const encabezado =
      `📰 Resumen del ${Utilities.formatDate(fechaInicio, tz, 'dd/MM')} al ${Utilities.formatDate(fechaFin, tz, 'dd/MM')}`;

    const mensajes = getSheetData(SHEET_NAMES.MENSAJES);
    const conteos = getSheetData(SHEET_NAMES.CONTEOS);

    const partes = [];
    const sinReportes = [];

    for (let i = 0; i < cantidad; i++) {
      const fecha = new Date(fechaFin);
      fecha.setDate(fechaFin.getDate() - i);
      const fechaStr = Utilities.formatDate(fecha, tz, 'yyyy-MM-dd');

      const mensajesDia = mensajes.filter(m => {
        const f = parseSafeDate(m.FechaHora);
        return f && Utilities.formatDate(f, tz, 'yyyy-MM-dd') === fechaStr;
      });

      const conteosDia = conteos.filter(c => {
        const f = parseSafeDate(c.Fecha);
        return f && Utilities.formatDate(f, tz, 'yyyy-MM-dd') === fechaStr;
      });

      if (mensajesDia.length === 0 && conteosDia.length === 0) {
        sinReportes.push(Utilities.formatDate(fecha, tz, 'dd/MM'));
        continue;
      }

      const resumen = resumenAdminPorFecha(fechaStr);
      const fechaLabel = Utilities.formatDate(fecha, tz, 'dd/MM');
      partes.push(`📅 ${fechaLabel}\n${resumen}`);
    }

    let resultado = encabezado;
    if (partes.length > 0) {
      resultado += '\n\n' + partes.join('\n\n');
    }
    if (sinReportes.length > 0) {
      resultado += `\n\nDías sin reportes: ${sinReportes.join(', ')}`;
    }
    return resultado;
  } catch (e) {
    Logging.logError('Toolbox', 'generarResumenAdmin', e.message, e.stack);
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

      const conteoId = generarId('CONTEO');

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
    sumarPuntos(userId, PUNTOS_CONTEO * conteos.length);
    return `¡Listo! Se registraron ${conteos.length} conteos de inventario.`;
  }
  catch (e) {
    Logging.logError('Toolbox', 'registrarMultiplesConteos', e.message, e.stack, JSON.stringify({ conteos, userId }));
    throw new Error(`Error al registrar conteos: ${e.message}`);
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
  let descripcion = String(claveProducto);

  if (claveLower.includes('cemento')) {
      claveFinal = '01';
      descripcion = 'Cemento canal 42.5kg';
  } else if (claveLower.includes('caja') || claveLower.includes('arqueo')) {
      claveFinal = 'CCH';
      descripcion = 'Caja chica';
  }

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

    const conteoId = generarId('CONTEO');

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

    sumarPuntos(userId, PUNTOS_CONTEO);

  return `Conteo registrado para el producto ${claveFinal}.`;
  } catch (e) {
    Logging.logError('Toolbox', 'registrarConteo', e.message, e.stack, JSON.stringify({ claveProducto, cantidadSistema, cantidadFisico, cpi, vpe, observacion }));
    throw new Error(`Error al registrar conteo: ${e.message}`);
  }
}

/**
 * Registra un arqueo de caja en la hoja 'ArqueoCaja'.
 * @param {string} userId - ID del usuario que realiza el arqueo.
 * @param {number} saldoSistema - Monto que debería haber según el sistema.
 * @param {number} contado - Total contado en efectivo.
 * @param {number} transferencia - Pagos por transferencia.
 * @param {number} tarjeta - Pagos con tarjeta.
 * Calcula la diferencia y la registra en la hoja 'ArqueoCaja'.
 * @param {string} razon - Razón de la diferencia.
 * @returns {string} Mensaje de confirmación.
 */
function registrarArqueoCaja(userId, saldoSistema, contado, transferencia, tarjeta, razon) {
  let diferencia;
  try {
    const now = getFormattedTimestamp();
    const userProfile = obtenerDetallesDeUsuario(userId);
    const userName = userProfile ? userProfile.Nombre : 'Desconocido';
    const conteoId = generarId('ARQ');

    diferencia =
      (parseFloat(saldoSistema) || 0) -
      (parseFloat(contado) || 0) -
      (parseFloat(transferencia) || 0) -
      (parseFloat(tarjeta) || 0);

    if (Math.abs(diferencia) > 5 && (!razon || razon.trim() === '')) {
      throw new Error('Se requiere una justificación cuando la diferencia supera 5.');
    }

    appendRowToSheet(SHEET_NAMES.ARQUEO_CAJA, {
      ID_Conteo: conteoId,
      Fecha: now.split(' ')[0],
      Hora: now.split(' ')[1],
      UsuarioID: userId,
      NombreUsuario: userName,
      'Saldo sistema': saldoSistema,
      Contado: contado,
      Transferencia: transferencia,
      Tarjeta: tarjeta,
      Diferencia: diferencia,
      'Razón diferencia': razon || ''
    });

    sumarPuntos(userId, PUNTOS_ARQUEO);

    return `Arqueo registrado correctamente. Diferencia: ${diferencia}.`;
  } catch (e) {
    Logging.logError('Toolbox', 'registrarArqueoCaja', e.message, e.stack, JSON.stringify({ userId, saldoSistema, contado, transferencia, tarjeta, diferencia, razon }));
    throw new Error(`Error al registrar el arqueo: ${e.message}`);
  }
}

/**
 * Registra la recepción de una compra y guarda la factura en Drive.
 * @param {string} userId - ID del usuario que registra la compra.
 * @param {string} fecha - Fecha de la factura.
 * @param {string} sucursal - Sucursal que recibe la mercadería.
 * @param {string} proveedor - Nombre del proveedor.
 * @param {string} transporte - Transporte utilizado.
 * @param {number} total - Monto total de la factura.
 * @param {string} faltantes - Productos faltantes o diferencias.
 * @param {string} fileUrl - Enlace o ID del archivo subido.
 * @param {string} sessionId - ID de la sesión actual.
 * @returns {string} Mensaje de confirmación.
 */
function registrarRecepcionCompra(userId, fecha, sucursal, proveedor, transporte, total, faltantes, fileUrl, sessionId) {
  try {
    const idMatch = /id=([^&]+)/.exec(fileUrl);
    const fileId = idMatch ? idMatch[1] : fileUrl;
    const file = DriveApp.getFileById(fileId);
    const ext = file.getName().split('.').pop();
    const folder = DriveApp.getFolderById(FOLDER_IMAGENES);
    const nuevoNombre = `${fecha}_Factura_${proveedor}_${sucursal}.${ext}`;
    file.setName(nuevoNombre);
    folder.addFile(file);
    const parents = file.getParents();
    while (parents.hasNext()) {
      const p = parents.next();
      if (p.getId() !== folder.getId()) p.removeFile(file);
    }

    const asunto = `Factura ${proveedor} ${sucursal}`;
    const detalle = `Fecha: ${fecha}\nProveedor: ${proveedor}\nTransporte: ${transporte}\nTotal: ${total}\nFaltantes: ${faltantes}\nArchivo: ${fileUrl}`;
    registrarMensaje('Recepción Compra', userId, asunto, detalle, sessionId, 0);
    return 'Recepción de compra registrada.';
  } catch (e) {
    Logging.logError('Toolbox', 'registrarRecepcionCompra', e.message, e.stack, JSON.stringify({ userId, fecha, sucursal, proveedor, transporte, total, faltantes, fileUrl, sessionId }));
    throw new Error(`Error al registrar la recepción: ${e.message}`);
  }
}

/**
 * Registra una solicitud de traspaso enviada por un usuario.
 * @param {string} userId - ID del usuario que envía la captura.
 * @param {string} fileUrl - Enlace o ID de la imagen subida.
 * @param {string} comentario - Comentario del usuario.
 * @param {string} sessionId - ID de la sesión.
 * @returns {string} Mensaje de confirmación.
 */
function registrarTraspaso(userId, fileUrl, comentario, sessionId) {
  try {
    const idMatch = /id=([^&]+)/.exec(fileUrl);
    const fileId = idMatch ? idMatch[1] : fileUrl;
    const file = DriveApp.getFileById(fileId);
    const ext = file.getName().split('.').pop();
    const folder = DriveApp.getFolderById(FOLDER_IMAGENES);
    const nuevoNombre = `Traspaso_${Date.now()}.${ext}`;
    file.setName(nuevoNombre);
    folder.addFile(file);
    const parents = file.getParents();
    while (parents.hasNext()) {
      const p = parents.next();
      if (p.getId() !== folder.getId()) p.removeFile(file);
    }

    const asunto = 'Solicitud de traspaso';
    const detalle = `Comentario: ${comentario}\nArchivo: ${fileUrl}`;
    registrarMensaje('Traspaso', userId, asunto, detalle, sessionId, 0);
    return 'Traspaso registrado correctamente.';
  } catch (e) {
    Logging.logError('Toolbox', 'registrarTraspaso', e.message, e.stack, JSON.stringify({ userId, fileUrl, comentario, sessionId }));
    throw new Error(`Error al registrar traspaso: ${e.message}`);
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
        Logging.logError('Toolbox', 'enviarMensajeAdministrador', `No se encontró el mensaje pendiente para SesionID: ${destinoSesion}, Usuario: ${destinoUsuarioId}`, null, JSON.stringify({ destinoSesion, destinoUsuarioId, contenido }), adminUserId);
        throw new Error('No se pudo encontrar el mensaje original para responder.');
    }

  } catch (e) {
    Logging.logError('Toolbox', 'enviarMensajeAdministrador', e.message, e.stack, JSON.stringify({ destinoSesion, destinoUsuarioId, contenido, adminUserId }));
    throw new Error(`Error al enviar mensaje: ${e.message}`);
  }
}

/**
 * Devuelve la fecha más reciente de la hoja 'Conteos'.
 * @returns {string} Fecha en formato 'yyyy-MM-dd' o cadena vacía.
 */
function ultimaFecha() {
  try {
    const registros = getSheetData(SHEET_NAMES.CONTEOS);
    if (!registros || registros.length === 0) {
      return '';
    }

    // Función interna para parsear fechas de forma segura
    const parseDateRobust = (textoFecha) => {
      if (!textoFecha) return null;
      let fecha = parseSafeDate(textoFecha);
      if (!fecha) {
        try {
          fecha = new Date(textoFecha.split('/').reverse().join('-'));
          if (isNaN(fecha.getTime())) fecha = null;
        } catch (e) {
          fecha = null;
        }
      }
      return fecha;
    };

    // Usamos map y filter para procesar las fechas de forma más limpia
    const fechasValidas = registros
      .map(r => parseDateRobust(r.Fecha))
      .filter(d => d);

    if (fechasValidas.length === 0) {
      return '';
    }

    // Encontramos el valor máximo usando Math.max sobre los timestamps
    const fechaMax = new Date(Math.max(...fechasValidas.map(d => d.getTime())));

    const tz = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();
    return Utilities.formatDate(fechaMax, tz, 'yyyy-MM-dd');

  } catch (e) {
    Logging.logError('Toolbox', 'ultimaFecha', e.message, e.stack);
    return '';
  }
}

/**
 * Devuelve la fecha más reciente de conteos para un usuario.
 * @param {string} userId - ID del usuario.
 * @returns {string} Fecha en formato 'dd-MM-yyyy' o cadena vacía.
 */
function ultimaFechaUsuario(userId) {
  try {
    const registros = getSheetData(SHEET_NAMES.CONTEOS)
      .filter(r => r.UsuarioID === userId);
    if (!registros || registros.length === 0) {
      return '';
    }

    const parseDateRobust = (textoFecha) => {
      if (!textoFecha) return null;
      let fecha = parseSafeDate(textoFecha);
      if (!fecha) {
        try {
          fecha = new Date(textoFecha.split('/').reverse().join('-'));
          if (isNaN(fecha.getTime())) fecha = null;
        } catch (e) {
          fecha = null;
        }
      }
      return fecha;
    };

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const fechasValidas = registros
      .map(r => parseDateRobust(r.Fecha))
      .filter(d => d && d.getTime() <= hoy.getTime());

    if (fechasValidas.length === 0) {
      return '';
    }

    const fechaMax = new Date(Math.max(...fechasValidas.map(d => d.getTime())));

    const tz = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();
    return Utilities.formatDate(fechaMax, tz, 'dd-MM-yyyy');

  } catch (e) {
    Logging.logError('Toolbox', 'ultimaFechaUsuario', e.message, e.stack, userId);
    return '';
  }
}

/**
 * Genera un resumen corto del chat de un usuario en la fecha previa.
 * Usa la fecha obtenida con ultimaFecha o la última sesión registrada.
 * @param {string} userId - ID del usuario a resumir.
 * @returns {string} Resumen generado por la IA o mensaje de error.
 */
function resumenChatUsuario(userId) {
  try {
    let fechaBase = ultimaFechaUsuario(userId);
    const sesiones = getSheetData(SHEET_NAMES.SESIONES).filter(s => s.UsuarioID === userId);
    const tz = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();

    if (!fechaBase) {
      let fechaMax = null;
      sesiones.forEach(s => {
        const f = parseSafeDate(s.FechaInicio);
        if (f && (!fechaMax || f.getTime() > fechaMax.getTime())) {
          fechaMax = f;
        }
      });
      if (fechaMax) {
        fechaBase = Utilities.formatDate(fechaMax, tz, 'dd-MM-yyyy');
      }
    }

    if (!fechaBase) {
      return 'No se encontró historial para resumir.';
    }

    const sesionesFiltradas = sesiones.filter(s => {
      const f = parseSafeDate(s.FechaInicio);
      if (!f) return false;
      const fStr = Utilities.formatDate(f, tz, 'dd-MM-yyyy');
      return fStr === fechaBase;
    });

    let conversationMessages = [];
    sesionesFiltradas.forEach(s => {
      if (s.HistorialConversacion && s.HistorialConversacion.length > 2) {
        try {
          const hist = JSON.parse(s.HistorialConversacion);
          conversationMessages.push(...hist.filter(m => m.role === 'user' || m.role === 'assistant'));
        } catch (e) {
          Logging.logError('Toolbox', 'resumenChatUsuario', 'Historial corrupto', e.stack, s.HistorialConversacion, userId);
        }
      }
    });

    conversationMessages = limitarHistorial([{ role: 'system', content: '' }, ...conversationMessages]).slice(1);

    if (conversationMessages.length === 0) {
      return 'No se encontró historial para resumir.';
    }

    const systemPrompt = 'Eres un supervisor en "Ferretería Flores" en Nicaragua. Tu asistente virtual se llama "Carlos E. Flores". Al inicio de la jornada, estás haciendo un recuento con uno de tus trabajadores sobre las novedades que él reportó el día anterior a través de Carlos.\n\nTu tarea es resumir la conversación que te pasarán a continuación.\n\nInstrucciones:\n1. Empieza con un saludo matutino y casual (ej. "¡Buenas!", "¡Qué tal, oye...!").\n2. Dirígete al trabajador de "vos".\n3. Menciona que revisaste sus reportes con "Carlos".\n4. Resume de forma clara y concisa los puntos que él trató (problemas, conteos, sugerencias, solicitudes).\n5. Mantén un tono de jefe cercano pero profesional. No des soluciones ni autorizaciones, solo confirma que recibiste la información.\n6. Termina con una frase para cerrar el recuento (ej. "Ok, lo tengo presente.", "Gracias, lo revisamos en el día.")';

    const mensajes = [
      { role: 'system', content: systemPrompt },
      ...conversationMessages
    ];
    const payload = {
      model: MODELO_DEFAULT,
      messages: mensajes,
      temperature: TEMPERATURA_AI,
      max_tokens: 150
    };
    const apiResult = llamarOpenAI(payload);
    const codigo = apiResult.code;
    if (codigo !== 200) {
      Logging.logError('Toolbox', 'resumenChatUsuario', `Error API ${codigo}`, null, JSON.stringify(conversationMessages), userId);
      return 'Error al generar el resumen.';
    }
    const json = JSON.parse(apiResult.text);
    return json.choices?.[0]?.message?.content || 'No se pudo obtener resumen.';
  } catch (e) {
    Logging.logError('Toolbox', 'resumenChatUsuario', e.message, e.stack, userId);
    return `Error al generar el resumen: ${e.message}`;
  }
}

/**
 * Genera un resumen de sobrantes y faltantes del último conteo de un usuario.
 * @param {string} userId - ID del usuario.
 * @returns {string} Texto con las claves y diferencias encontradas.
 */
function resumenConteo(userId) {
  try {
    const fechaRef = ultimaFechaUsuario(userId);
    if (!fechaRef) {
      return 'No se encontró una fecha reciente de conteos.';
    }

    const tz = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();
    const registros = getSheetData(SHEET_NAMES.CONTEOS).filter(r => {
      if (r.UsuarioID !== userId) return false;
      const f = parseSafeDate(r.Fecha);
      if (!f) return false;
      const fStr = Utilities.formatDate(f, tz, 'dd-MM-yyyy');
      return fStr === fechaRef;
    });

    if (registros.length === 0) {
      return `No tienes conteos registrados para la fecha ${fechaRef}.`;
    }

    const diferenciasAgrupadas = {};
    registros.forEach(r => {
      const clave = String(r.ClaveProducto).replace(/^'/, '');
      const descripcion = r.DescripcionProducto || '';
      const diferencia = parseFloat(r.Diferencia) || 0;

      if (diferencia === 0) return;

      if (diferenciasAgrupadas[clave]) {
        diferenciasAgrupadas[clave].total += diferencia;
      } else {
        diferenciasAgrupadas[clave] = {
          total: diferencia,
          descripcion: descripcion
        };
      }
    });

    const sobrantes = [];
    const faltantes = [];

    for (const clave in diferenciasAgrupadas) {
      const producto = diferenciasAgrupadas[clave];
      const totalDiferencia = producto.total;

      if (totalDiferencia === 0) continue;

      const nombreProducto = producto.descripcion || clave;
      let textoDiferencia = String(totalDiferencia);

      if (Math.abs(totalDiferencia) > 1) {
        textoDiferencia = `*${textoDiferencia}*`;
      }

      if (totalDiferencia > 0) {
        sobrantes.push(`${nombreProducto} (+${textoDiferencia})`);
      } else {
        faltantes.push(`${nombreProducto} (${textoDiferencia})`);
      }
    }

    let resumen = `📝 *Resumen de Conteo del Día ${fechaRef}*\n\n`;

    if (sobrantes.length === 0 && faltantes.length === 0) {
      return `✅ *Resumen de Conteo del Día ${fechaRef}*\n\n¡Excelente! No se encontraron diferencias en tu conteo.`;
    }

    if (sobrantes.length > 0) {
      resumen += `🟢 *Sobrantes:*\n${sobrantes.join('\n')}\n\n`;
    }
    if (faltantes.length > 0) {
      resumen += `🔴 *Faltantes:*\n${faltantes.join('\n')}`;
    }

    return resumen.trim();

  } catch (e) {
    Logging.logError('Toolbox', 'resumenConteo', e.message, e.stack, userId);
    return `Error al generar el resumen de conteo: ${e.message}`;
  }
}

/**
 * Revisa si el usuario cumplió la meta diaria de conteos.
 * Cemento se toma de la hoja Conteos con las claves 01 y 011.
 * Caja chica se toma de la hoja ArqueoCaja sin buscar por clave.
 * @param {string} userId - ID del usuario.
 * @returns {string} Mensaje sobre el estado de los conteos.
 */
function revisionMetaConteo(userId) {
  try {
    // --- 1. CONFIGURACIÓN CENTRALIZADA DE REGLAS ---
    // Aquí defines qué productos revisar y sus horarios. Fácil de modificar y añadir más.
    const CLAVES_CEMENTO = ['01', '011'];

    const REGLAS_DE_CONTEO = {
      '01': {
        nombre: 'Cemento',
        horarios: [
          { etiqueta: 'matutino', limite: 620, tipo: 'antes_de' },
          { etiqueta: 'mediodía', limite: 840, tipo: 'alrededor_de', tolerancia: 20 },
          { etiqueta: 'vespertino', limite: 1080, tipo: 'antes_de' }
        ]
      },
      'CCH': {
        nombre: 'Caja Chica',
        horarios: [
          { etiqueta: 'matutino', limite: 620, tipo: 'antes_de' },
          { etiqueta: 'mediodía', limite: 840, tipo: 'alrededor_de', tolerancia: 20 },
          { etiqueta: 'vespertino', limite: 1080, tipo: 'antes_de' }
        ]
      }
    };

    // --- 2. OBTENCIÓN Y PREPARACIÓN DE DATOS ---
    const fechaRef = ultimaFechaUsuario(userId);
    if (!fechaRef) return 'No se encontró una fecha reciente de conteos.';

    const tz = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();
    const registrosConteos = getSheetData(SHEET_NAMES.CONTEOS).filter(r => {
      if (r.UsuarioID !== userId) return false;
      const f = parseSafeDate(r.Fecha);
      if (!f) return false;
      const fStr = Utilities.formatDate(f, tz, 'dd-MM-yyyy');
      if (fStr !== fechaRef) return false;
      const clave = String(r.ClaveProducto).replace(/^'/, '');
      return CLAVES_CEMENTO.includes(clave);
    });

    const registrosCaja = getSheetData(SHEET_NAMES.ARQUEO_CAJA).filter(r => {
      if (r.UsuarioID !== userId) return false;
      const f = parseSafeDate(r.Fecha);
      if (!f) return false;
      const fStr = Utilities.formatDate(f, tz, 'dd-MM-yyyy');
      return fStr === fechaRef;
    });

    const registros = [];

    registrosConteos.forEach(r => {
      const clave = String(r.ClaveProducto).replace(/^'/, '');
      registros.push({
        clave: clave === '011' ? '01' : clave,
        fecha: r.Fecha,
        hora: r.Hora
      });
    });

    registrosCaja.forEach(r => {
      registros.push({
        clave: 'CCH',
        fecha: r.Fecha,
        hora: r.Hora
      });
    });

    // Agrupamos los tiempos de conteo por clave para fácil acceso
    const tiemposPorClave = {};
    registros.forEach(r => {
      if (!tiemposPorClave[r.clave]) {
        tiemposPorClave[r.clave] = [];
      }
      const fechaHora = parseSafeDate(`${r.fecha} ${r.hora}`);
      if (fechaHora) {
        const minutosDelDia = fechaHora.getHours() * 60 + fechaHora.getMinutes();
        tiemposPorClave[r.clave].push(minutosDelDia);
      }
    });

    // --- 3. EVALUACIÓN BASADA EN REGLAS Y GENERACIÓN DE RESULTADOS ---
    const resultadosFinales = [];

    for (const clave in REGLAS_DE_CONTEO) {
      const regla = REGLAS_DE_CONTEO[clave];
      const tiempos = (tiemposPorClave[clave] || []).sort((a, b) => a - b);
      const mensajesDeError = [];

      resultadosFinales.push(`\n--- Revisión de ${regla.nombre} ---`);

      if (tiempos.length === 0) {
        mensajesDeError.push(`❌ No se encontró ningún conteo.`);
      } else {
        // Revisa cada horario definido en la regla
        regla.horarios.forEach((horario, index) => {
          const tiempoRealizado = tiempos[index];

          if (tiempoRealizado === undefined) {
            mensajesDeError.push(`⚠️ Falta el conteo ${horario.etiqueta}.`);
            return;
          }

          if (horario.tipo === 'antes_de') {
            if (tiempoRealizado > horario.limite) {
              mensajesDeError.push(`⏱️ El conteo ${horario.etiqueta} fue tardío.`);
            }
          } else if (horario.tipo === 'alrededor_de') {
            if (Math.abs(tiempoRealizado - horario.limite) > horario.tolerancia) {
              mensajesDeError.push(`⏱️ El conteo ${horario.etiqueta} está fuera del horario permitido.`);
            }
          }
        });

        if (tiempos.length > regla.horarios.length) {
          mensajesDeError.push(`⚠️ Se realizaron ${tiempos.length} conteos, más de los ${regla.horarios.length} esperados.`);
        }
      }

      if (mensajesDeError.length === 0) {
        resultadosFinales.push(`✅ ¡Meta cumplida! Todos los conteos en orden.`);
      } else {
        resultadosFinales.push(...mensajesDeError);
      }
    }

    return resultadosFinales.join('\n');

  } catch (e) {
    Logging.logError('Toolbox', 'revisionMetaConteo', e.message, e.stack, userId);
    return `Error al revisar la meta de conteo: ${e.message}`;
  }
}

/**
 * Suma puntos al usuario indicado.
 * @param {string} userId - ID del usuario.
 * @param {number} cantidad - Puntos a añadir.
 */
function sumarPuntos(userId, cantidad) {
  try {
    const perfil = obtenerDetallesDeUsuario(userId);
    const puntosActuales = parseInt(perfil?.Puntos, 10) || 0;
    const nuevosPuntos = puntosActuales + Number(cantidad);
    const ok = updateRowInSheet(SHEET_NAMES.USUARIOS, 'UsuarioID', userId, {
      Puntos: nuevosPuntos
    });
    if (ok && _usersDataCache) {
      const u = _usersDataCache.find(us => us.UsuarioID === userId);
      if (u) u.Puntos = nuevosPuntos;
    }
  } catch (e) {
    Logging.logError('Toolbox', 'sumarPuntos', e.message, e.stack, JSON.stringify({ userId, cantidad }));
  }
}

/**
 * Registra una insignia alcanzada por el usuario.
 * @param {string} userId - ID del usuario.
 * @param {string} nombreInsignia - Nombre de la insignia.
 */
function asignarInsignia(userId, nombreInsignia) {
  try {
    const perfil = obtenerDetallesDeUsuario(userId);
    const lista = perfil?.Insignias ? perfil.Insignias.split(',').map(s => s.trim()).filter(s => s) : [];
    if (lista.indexOf(nombreInsignia) === -1) {
      lista.push(nombreInsignia);
      const texto = lista.join(', ');
      const ok = updateRowInSheet(SHEET_NAMES.USUARIOS, 'UsuarioID', userId, {
        Insignias: texto
      });
      if (ok && _usersDataCache) {
        const u = _usersDataCache.find(us => us.UsuarioID === userId);
        if (u) u.Insignias = texto;
      }
    }
  } catch (e) {
    Logging.logError('Toolbox', 'asignarInsignia', e.message, e.stack, JSON.stringify({ userId, nombreInsignia }));
  }
}

/**
 * Marca un mensaje como aprobado.
 * @param {string} messageId - ID del mensaje.
 * @returns {string} Confirmación.
 */
function marcarMensajeAprobado(messageId) {
  const ok = updateRowInSheet(SHEET_NAMES.MENSAJES, 'ID_Mensaje', messageId, {
    Aprobado: true
  });
  if (!ok) {
    throw new Error('No se encontró el mensaje.');
  }
  return 'Mensaje aprobado.';
}

/**
 * Marca un mensaje como visto.
 * @param {string} messageId - ID del mensaje.
 * @returns {string} Confirmación.
 */
function marcarMensajeVisto(messageId) {
  const ok = updateRowInSheet(SHEET_NAMES.MENSAJES, 'ID_Mensaje', messageId, {
    Visto: true
  });
  if (!ok) {
    throw new Error('No se encontró el mensaje.');
  }
  return 'Mensaje marcado como visto.';
}

/**
 * Destaca un mensaje como idea.
 * @param {string} messageId - ID del mensaje.
 * @returns {string} Confirmación.
 */
function marcarMensajeDestacado(messageId) {
  const ok = updateRowInSheet(SHEET_NAMES.MENSAJES, 'ID_Mensaje', messageId, {
    Destacado: true
  });
  if (!ok) {
    throw new Error('No se encontró el mensaje.');
  }
  return 'Mensaje destacado.';
}

/**
 * Fija un mensaje en la lista.
 * @param {string} messageId - ID del mensaje.
 * @returns {string} Confirmación.
 */
function fijarMensaje(messageId) {
  const ok = updateRowInSheet(SHEET_NAMES.MENSAJES, 'ID_Mensaje', messageId, {
    Fijado: true
  });
  if (!ok) {
    throw new Error('No se encontró el mensaje.');
  }
  return 'Mensaje fijado.';
}

/**
 * Marca que de este mensaje se creó una tarea.
 * @param {string} messageId - ID del mensaje origen.
 * @returns {string} Confirmación.
 */
function marcarMensajeConTarea(messageId) {
  const ok = updateRowInSheet(SHEET_NAMES.MENSAJES, 'ID_Mensaje', messageId, {
    Estado: 'Con Tarea'
  });
  if (!ok) {
    throw new Error('No se encontró el mensaje.');
  }
  return 'Mensaje marcado con tarea.';
}

/**
 * Obtiene el ranking de usuarios ordenado por puntaje.
 * @returns {Array<object>} Lista de usuarios con puntos e insignias.
 */
function obtenerRankingPuntos() {
  try {
    const usuarios = getSheetData(SHEET_NAMES.USUARIOS);
    return usuarios
      .map(u => ({
        UsuarioID: u.UsuarioID,
        Nombre: u.Nombre,
        Puntos: parseInt(u.Puntos, 10) || 0,
        Insignias: u.Insignias || ''
      }))
      .sort((a, b) => b.Puntos - a.Puntos);
  } catch (e) {
    Logging.logError('Toolbox', 'obtenerRankingPuntos', e.message, e.stack);
    return [];
  }
}
