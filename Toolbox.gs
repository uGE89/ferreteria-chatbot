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
    logError('Toolbox', 'registrarMovimientoCaja', e.message, e.stack, JSON.stringify({ tipo, monto, concepto, contacto, userId }));
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
    logError('Toolbox', 'ultimaFecha', e.message, e.stack);
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
    let fechaBase = ultimaFecha();
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
        fechaBase = Utilities.formatDate(fechaMax, tz, 'yyyy-MM-dd');
      }
    }

    if (!fechaBase) {
      return 'No se encontró historial para resumir.';
    }

    const sesionesFiltradas = sesiones.filter(s => {
      const f = parseSafeDate(s.FechaInicio);
      if (!f) return false;
      const fStr = Utilities.formatDate(f, tz, 'yyyy-MM-dd');
      return fStr === fechaBase;
    });

    let texto = '';
    sesionesFiltradas.forEach(s => {
      if (s.HistorialConversacion && s.HistorialConversacion.length > 2) {
        try {
          const hist = JSON.parse(s.HistorialConversacion);
          hist.forEach(m => {
            if (m.content) texto += m.content + '\n';
          });
        } catch (e) {
          logError('Toolbox', 'resumenChatUsuario', 'Historial corrupto', e.stack, s.HistorialConversacion, userId);
        }
      }
    });

    if (texto.trim() === '') {
      return 'No se encontró historial para resumir.';
    }

    const mensajes = [
      {
        role: 'system',
        content: 'Eres un supervisor en "Ferretería Flores" en Nicaragua. Tu asistente virtual se llama "Carlos E. Flores". Al inicio de la jornada, estás haciendo un recuento con uno de tus trabajadores sobre las novedades que él reportó el día anterior a través de Carlos.\n\nTu tarea es resumir la conversación que te pasarán a continuación.\n\nInstrucciones:\n1. Empieza con un saludo matutino y casual (ej. "¡Buenas!", "¡Qué tal, oye...!").\n2. Dirígete al trabajador de "vos".\n3. Menciona que revisaste sus reportes con "Carlos".\n4. Resume de forma clara y concisa los puntos que él trató (problemas, conteos, sugerencias, solicitudes).\n5. Mantén un tono de jefe cercano pero profesional. No des soluciones ni autorizaciones, solo confirma que recibiste la información.\n6. Termina con una frase para cerrar el recuento (ej. "Ok, lo tengo presente.", "Gracias, lo revisamos en el día.")'
      },
      { role: 'user', content: texto }
    ];
    const payload = {
      model: MODELO_DEFAULT,
      messages: mensajes,
      temperature: TEMPERATURA_AI,
      max_tokens: 150
    };
    const opciones = {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + OPENAI_API_KEY },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    const respuesta = UrlFetchApp.fetch(OPENAI_API_URL, opciones);
    const codigo = respuesta.getResponseCode();
    if (codigo !== 200) {
      logError('Toolbox', 'resumenChatUsuario', `Error API ${codigo}`, null, texto, userId);
      return 'Error al generar el resumen.';
    }
    const json = JSON.parse(respuesta.getContentText());
    return json.choices?.[0]?.message?.content || 'No se pudo obtener resumen.';
  } catch (e) {
    logError('Toolbox', 'resumenChatUsuario', e.message, e.stack, userId);
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
    const fechaRef = ultimaFecha();
    if (!fechaRef) {
      return 'No se encontró una fecha reciente de conteos.';
    }

    const tz = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();
    const registros = getSheetData(SHEET_NAMES.CONTEOS).filter(r => {
      if (r.UsuarioID !== userId) return false;
      const f = parseSafeDate(r.Fecha);
      if (!f) return false;
      const fStr = Utilities.formatDate(f, tz, 'yyyy-MM-dd');
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
    logError('Toolbox', 'resumenConteo', e.message, e.stack, userId);
    return `Error al generar el resumen de conteo: ${e.message}`;
  }
}

/**
 * Revisa si el usuario cumplió la meta diaria de conteos.
 * Se evalúan las claves 01 y CCH en la fecha más reciente.
 * @param {string} userId - ID del usuario.
 * @returns {string} Mensaje sobre el estado de los conteos.
 */
function revisionMetaConteo(userId) {
  try {
    // --- 1. CONFIGURACIÓN CENTRALIZADA DE REGLAS ---
    // Aquí defines qué productos revisar y sus horarios. Fácil de modificar y añadir más.
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
    const fechaRef = ultimaFecha();
    if (!fechaRef) return 'No se encontró una fecha reciente de conteos.';

    const tz = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();
    const clavesARevisar = Object.keys(REGLAS_DE_CONTEO);

    const registros = getSheetData(SHEET_NAMES.CONTEOS).filter(r => {
      if (r.UsuarioID !== userId) return false;
      const f = parseSafeDate(r.Fecha);
      if (!f) return false;
      const fStr = Utilities.formatDate(f, tz, 'yyyy-MM-dd');
      if (fStr !== fechaRef) return false;
      const clave = String(r.ClaveProducto).replace(/^'/, '');
      return clavesARevisar.includes(clave);
    });

    // Agrupamos los tiempos de conteo por clave para fácil acceso
    const tiemposPorClave = {};
    registros.forEach(r => {
      const clave = String(r.ClaveProducto).replace(/^'/, '');
      if (!tiemposPorClave[clave]) {
        tiemposPorClave[clave] = [];
      }
      const fechaHora = parseSafeDate(`${r.Fecha} ${r.Hora}`);
      if (fechaHora) {
        const minutosDelDia = fechaHora.getHours() * 60 + fechaHora.getMinutes();
        tiemposPorClave[clave].push(minutosDelDia);
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
    logError('Toolbox', 'revisionMetaConteo', e.message, e.stack, userId);
    return `Error al revisar la meta de conteo: ${e.message}`;
  }
}

