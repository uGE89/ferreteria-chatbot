/**
 * Proyecto: PlataformaConversacional - Backend en Google Apps Script
 * Este archivo implementa todas las funciones para manejar sesiones,
 * historial y llamadas a OpenAI, leyendo definiciones de funciones
 * desde la hoja "Funciones" de Google Sheets.
 */

// Constantes con los nombres de las hojas
const ID_HOJA = SpreadsheetApp.getActive().getId();
const ID_HOJA_USUARIOS = '1GKjJQ-tJLFGammzYpsYO_YPanIByz-bMGIgMgEOgIho'; 

const NOMBRE_USUARIOS = 'Usuarios';
const NOMBRE_SESIONES = 'Sesiones';
const NOMBRE_HISTORIAL = 'HistorialConversaciones';
const NOMBRE_CONFIG = 'Configuración';
const NOMBRE_FUNCIONES = 'Funciones';
const NOMBRE_LOGCOSTES = 'LogCostes';
const NOMBRE_ANUNCIOS = 'Anuncios'; // <-- AÑADE ESTA LÍNEA
const NOMBRE_ARTICULOS = 'Articulos'; // <-- AÑADE ESTA TAMBIÉN
const NOMBRE_TAREAS = 'Tareas'; // <-- AÑADE ESTA TAMBIÉN




/* ---------- LOGIN Y PERFIL DE USUARIO ---------- */

/**
 * Valida un ID de usuario contra la hoja "Usuarios".
 * @param {string} id El ID del usuario a validar.
 * @returns {object} Un objeto con {ok: boolean, perfil?: object, msg?: string}.
 */
function validarUsuario(id) {
  try {
    const ss = SpreadsheetApp.openById(ID_HOJA_USUARIOS);
    const hoja = ss.getSheetByName(NOMBRE_USUARIOS);
    if (!hoja) throw new Error(`La hoja "${NOMBRE_USUARIOS}" no fue encontrada.`);
    
    const datos = hoja.getDataRange().getValues(); // fila 0 = encabezados
    const idBuscado = String(id).trim().toLowerCase();

    for (let i = 1; i < datos.length; i++) {
      const [usuarioID, nombre, sucursal, rol, activo] = datos[i];
      if (String(usuarioID).trim().toLowerCase() === idBuscado) {
        if (String(activo).toUpperCase() !== "TRUE") {
          return { ok: false, msg: "Usuario inactivo. Solicita alta a administración." };
        }
        // Éxito -> guarda en Cache 24 h
        const perfil = { usuarioID, nombre, sucursal, rol };
        CacheService.getUserCache().put("perfil", JSON.stringify(perfil), 86400); // 24 horas
        return { ok: true, perfil: perfil };
      }
    }
    return { ok: false, msg: "ID de usuario no encontrado." };
  } catch (e) {
    Logger.log(e);
    return { ok: false, msg: "Error del servidor al validar el usuario." };
  }
}

/**
 * Obtiene el perfil del usuario desde el caché.
 * @returns {object|null} El perfil del usuario o null si no existe.
 */
function getPerfilActual() {
  try {
    const cache = CacheService.getUserCache().get("perfil");
    return cache ? JSON.parse(cache) : null;
  } catch (e) {
    Logger.log("Error al obtener perfil del cache: " + e.toString());
    return null;
  }
}

/* ---------- GESTIÓN DE SESIONES Y CHAT ---------- */

/**
 * Inicia una sesión diaria única por usuario
 * @param {string} usuarioId
 * @return {string} sessionId existente o nuevo
 */
/**
 * Inicia una sesión diaria única por usuario y verifica si hay
 * anuncios nuevos que mostrarle.
 * @param {string} usuarioId El ID del usuario.
 * @returns {object} Un objeto que contiene el ID de la sesión y un posible mensaje de anuncio.
 */
function iniciarSesion(usuarioId) {
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(NOMBRE_SESIONES);
  const datos = hoja.getDataRange().getValues();
  const hoy = new Date();
  const hoyStr = hoy.toISOString().substring(0, 10);

  // 1. Usaremos una variable para guardar el ID de sesión
  let sessionId = null;

  // Busca una sesión existente para el día de hoy
  for (let i = 1; i < datos.length; i++) {
    const fila = datos[i];
    const sesionUsuario = fila[1];
    const fechaInicio = new Date(fila[2]);
    const fechaStr = fechaInicio.toISOString().substring(0, 10);

    if (sesionUsuario === usuarioId && fechaStr === hoyStr) {
      sessionId = fila[0]; // Se encontró la sesión, se guarda en la variable
      break; // Salimos del bucle, ya no necesitamos seguir buscando
    }
  }

  // Si no se encontró ninguna sesión, creamos una nueva
  if (!sessionId) {
    sessionId = "S" + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    hoja.appendRow([sessionId, usuarioId, hoy.toISOString(), hoy.toISOString(), 'Activa', '']);
  }
  
  // --- INICIO DE LA MODIFICACIÓN ---

  // 2. Ahora que ya tenemos el sessionId, verificamos si hay un anuncio
  const mensajeAnuncio = verificarYObtenerAnuncioParaUsuario(usuarioId);

  // 3. Devolvemos un OBJETO con ambos datos, listo para el frontend
  return { 
    sessionId: sessionId, 
    mensajeAnuncio: mensajeAnuncio 
  };
  
  // --- FIN DE LA MODIFICACIÓN ---
}

function generarSessionId() {
  const random = Math.random().toString(36).substring(2, 6);
  return "S" + Date.now().toString(36) + random;
}

function doGet() {
  return HtmlService.createHtmlOutputFromFile('index').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function registrarMensaje(sesionId, usuarioId, emisor, contenido, functionCall = false, funcion = '', argsJson = '', paraAdmin = false) {
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(NOMBRE_HISTORIAL);
  // Asegúrate que el orden coincida con tus columnas
  hoja.appendRow(['', new Date(), usuarioId, sesionId, emisor, contenido, functionCall, funcion, argsJson, paraAdmin]); 
}



function getHistorialParaOpenAI(sesionId) {
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(NOMBRE_HISTORIAL);
  const datos = hoja.getDataRange().getValues();
  const messages = [];
  for (let i = 1; i < datos.length; i++) {
    const row = datos[i];
    if (row[3] === sesionId) {
      const emisor = row[4];
      const role = (emisor === 'user' || emisor === 'assistant') ? emisor : 'function';
      const msg = { role };
      if (role !== 'function') {
        msg.content = String(row[5] || '');
      }
      if (String(row[6]).toUpperCase() === 'TRUE') {
        msg.name = row[7];
        try {
          msg.arguments = JSON.parse(row[8] || '{}');
        } catch (e) {
          msg.arguments = {};
        }
      }
      messages.push(msg);
    }
  }
  return messages;
}

function detectarTipoFuncion(mensaje) {
  const texto = mensaje.toLowerCase();

  if (texto.includes("problema") || texto.includes("reporte") || texto.includes("sugerencia") || texto.includes("vendedor") || texto.includes("queja")) {
    return "registrarProblema";
  }

  if (texto.includes("contar") || texto.includes("conteo") || texto.includes("inventario") || texto.includes("unidades")) {
    return "registrarConteo";
  }

  if (texto.includes("idea") || texto.includes("mejorar") || texto.includes("podría funcionar mejor") || texto.includes("propongo")) {
    return "registrarSugerencia";
  }

  return ""; // sin función específica
}

/**
 * Orquesta toda la lógica de la conversación: maneja tareas pendientes,
 * prepara y envía la solicitud a OpenAI, y procesa la respuesta,
 * incluyendo la ejecución de funciones locales.
 * * @param {string} sesionId El ID de la sesión actual.
 * @param {string} usuarioId El ID del usuario.
 * @param {string} textoUsuario El mensaje enviado por el usuario.
 * @param {string} [tipoFuncion=''] Un tipo de función opcional para forzar un prompt específico.
 * @returns {object} Un objeto de respuesta para el frontend (ej. { content: "..." }).
 */
/**
 * Orquesta la lógica de la conversación: maneja tareas, prepara y envía solicitudes
 * a OpenAI, y procesa la respuesta, incluyendo el flujo de 2 pasos para function calling
 * que permite al asistente analizar resultados y hacer preguntas de seguimiento.
 */
function enviarAOpenAI(sesionId, usuarioId, payload, tipoFuncion = '') {
  // --- INICIALIZACIÓN Y MANEJO DEL PAYLOAD ---
  const textoUsuario = payload.texto;
  const claveProducto = payload.claveProducto;
  let mensaje = textoUsuario;

  if (mensaje === "__inicio") {
    mensaje = "Inicio de sesión del trabajador.";
  }
  // Registramos el mensaje original del usuario en el historial
  registrarMensaje(sesionId, usuarioId, 'user', mensaje);

  // --- LÓGICA PRE-OPENAI (TAREAS PENDIENTES) ---
  const pendiente = CacheService.getUserCache().get(`tareaPendiente-${sesionId}`);
  if (pendiente && mensaje.match(/^(sí|si|dale|ok|correcto|de acuerdo)/i)) {
    const args = JSON.parse(pendiente);
    const resultadoTarea = registrarEntrada(args, "Tarea", sesionId, usuarioId);
    CacheService.getUserCache().remove(`tareaPendiente-${sesionId}`);
    return { content: resultadoTarea.mensaje }; // Devuelve solo el mensaje de la tarea creada
  }

  const posibleTarea = detectaTareaPendiente(mensaje);
  if (posibleTarea) {
    const aviso = `Detecté que esto podría ser una tarea (“${posibleTarea.autoDescripcion}”). ¿La creo como pendiente?`;
    CacheService.getUserCache().put(`tareaPendiente-${sesionId}`, JSON.stringify(posibleTarea), 3600);
    registrarMensaje(sesionId, usuarioId, 'assistant', aviso);
    return { content: aviso };
  }
  
  // --- PREPARACIÓN PARA LLAMADA #1 A OPENAI ---
  if (!tipoFuncion || tipoFuncion.trim() === '') {
    tipoFuncion = detectarTipoFuncion(mensaje);
  }

  let systemPrompt = obtenerPromptSistema(tipoFuncion);
  const perfil = getPerfilActual();

  if (perfil) {
    const perfilContexto = `Contexto del usuario:\n- ID: ${perfil.usuarioID}\n- Nombre: ${perfil.nombre}\n- Sucursal: ${perfil.sucursal}\n- Rol: ${perfil.rol}\nYa conocés la sucursal y el rol del trabajador. No vuelvas a preguntar por ellos. Respondé siempre en español con tono directo, estilo WhatsApp, como Carlos E. Flores.`;
    systemPrompt.content = perfilContexto + "\n\n---\n\n" + systemPrompt.content;
  }
  
  // Inyectamos la clave si existe, para que OpenAI la use al llamar a la función
  if (claveProducto) {
    mensaje = `[CLAVE DE PRODUCTO: ${claveProducto}] ${mensaje}`;
  }

  const historial = getHistorialParaOpenAI(sesionId);
  // Re-registramos el mensaje del usuario, esta vez con la posible clave inyectada para la IA
  historial[historial.length -1].content = mensaje; 
  
  const messages = [systemPrompt].concat(historial);
  const config = leerConfiguracion();
  const functionsDefs = leerFunciones();

  const payloadAPI = {
    model: config.modelo_default,
    messages: messages,
    temperature: parseFloat(config.temperatura),
    max_tokens: parseInt(config.max_tokens, 10),
    functions: functionsDefs.length > 0 ? functionsDefs : undefined,
    function_call: functionsDefs.length > 0 ? "auto" : undefined,
  };

  const options = {
    method: 'post',
    muteHttpExceptions: true,
    headers: { 'Authorization': 'Bearer ' + config.openai_api_key, 'Content-Type': 'application/json' },
    payload: JSON.stringify(payloadAPI)
  };
  
  // --- 🧠 LLAMADA #1 A OPENAI ---
  const response = UrlFetchApp.fetch('https://api.openai.com/v1/chat/completions', options);
  const data = JSON.parse(response.getContentText()).choices[0].message;

  // --- MANEJO DE RESPUESTA ---

  // CASO A: LA IA PIDE LLAMAR A UNA FUNCIÓN (FLUJO DE 2 PASOS)
  if (data.function_call) {
    registrarMensaje(sesionId, usuarioId, 'assistant', '', true, data.function_call.name, data.function_call.arguments);
    
    const nombreFuncion = data.function_call.name;
    const args = JSON.parse(data.function_call.arguments);
    let resultadoFuncion;

    switch (nombreFuncion) {
      case "registrarConteo":
        resultadoFuncion = registrarConteo(args, sesionId, usuarioId);
        break;
      case "registrarProblema":
        resultadoFuncion = registrarEntrada(args, "Problema", sesionId, usuarioId);
        break;
      case "registrarSugerencia":
        resultadoFuncion = registrarEntrada(args, "Sugerencia", sesionId, usuarioId);
        break;
      case "anotarRegistro":
         resultadoFuncion = anotarRegistro(args);
         break;
      default:
        resultadoFuncion = JSON.stringify({ status: "error", message: `Función desconocida: ${nombreFuncion}` });
    }

    // AÑADIMOS EL RESULTADO DE LA FUNCIÓN AL HISTORIAL PARA LA SEGUNDA LLAMADA
    messages.push(data); // El mensaje de la IA que decidió llamar a la función
    messages.push({ role: "function", name: nombreFuncion, content: resultadoFuncion });

    // Preparamos la segunda llamada
    const payloadPaso2 = { model: config.modelo_default, messages: messages, temperature: parseFloat(config.temperatura), max_tokens: parseInt(config.max_tokens, 10) };
    const optionsPaso2 = { ...options, payload: JSON.stringify(payloadPaso2) };

    // --- 🧠 LLAMADA #2 A OPENAI ---
    const responsePaso2 = UrlFetchApp.fetch('https://api.openai.com/v1/chat/completions', optionsPaso2);
    const dataPaso2 = JSON.parse(responsePaso2.getContentText()).choices[0].message;

    // Esta es la respuesta final, conversacional e inteligente
    registrarMensaje(sesionId, usuarioId, 'assistant', dataPaso2.content || '');
    return dataPaso2;
  }

  // CASO B: LA IA DEVUELVE UNA RESPUESTA DE TEXTO NORMAL
  const contenido = data.content || '';
  registrarMensaje(sesionId, usuarioId, 'assistant', contenido);
  return data;
}



function getPromptBase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet(); // <--- AÑADE ESTA LÍNEA
  // Lógica para leer el prompt base de la hoja Configuración
  const hojaConfig = ss.getSheetByName(NOMBRE_CONFIG);
  const config = hojaConfig.getDataRange().getValues();
  let promptBase = '';
  // ... resto del código sin cambios
  return promptBase;
}


function obtenerPromptSistema(tipoFuncion) {
    const ss = SpreadsheetApp.getActiveSpreadsheet(); // <--- AÑADE ESTA LÍNEA


const promptBase = getPromptBase();

  // Leer prompt personalizado desde hoja Funciones (si existe)
  const hojaFunciones = ss.getSheetByName(NOMBRE_FUNCIONES);
  const datos = hojaFunciones.getDataRange().getValues();
  let promptFuncion = '';

  for (let i = 1; i < datos.length; i++) {
    const funcionID = String(datos[i][0]).toLowerCase();
    const activa = String(datos[i][2]).toUpperCase();
    const promptPersonalizado = datos[i][4];

    if (funcionID === tipoFuncion.toLowerCase() && activa === 'TRUE') {
      promptFuncion = promptPersonalizado || '';
      break;
    }
  }

  // Combinar los prompts: base + función (si aplica)
  const contenidoFinal = promptFuncion
    ? `${promptBase.trim()}\n\n---\n\n${promptFuncion.trim()}`
    : promptBase.trim();

  return {
    role: 'system',
    content: contenidoFinal
  };
}


function leerConfiguracion() {
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(NOMBRE_CONFIG);
  const datos = hoja.getDataRange().getValues();
  const cfg = {};
  datos.forEach(r => { cfg[r[0]] = r[1]; });
  return cfg;
}

function leerFunciones() {
    const ss = SpreadsheetApp.getActiveSpreadsheet(); // <--- AÑADE ESTA LÍNEA

const promptBase = getPromptBase();

  const hojaFunciones = ss.getSheetByName(NOMBRE_FUNCIONES);
  const datos = hojaFunciones.getDataRange().getValues();
  const defs = [];

  for (let i = 1; i < datos.length; i++) {
    const [funcionID, descripcion, activaRaw, schemaRaw, promptPersonalizado] = datos[i];
    if (String(activaRaw).toUpperCase() !== 'TRUE') continue;

    let schema = {};
    try { schema = JSON.parse(schemaRaw || '{}'); } catch (e) { schema = {}; }

    const properties = {};
    Object.keys(schema).forEach(key => {
      properties[key] = { type: schema[key] };
    });

    const promptFinal = promptPersonalizado
      ? `${promptBase.trim()}\n\n---\n\n${promptPersonalizado.trim()}`
      : promptBase.trim();

    defs.push({
      name: String(funcionID),
      description: String(descripcion),
      parameters: {
        type: 'object',
        properties: properties,
        required: Object.keys(properties)
      },
      promptFinal: promptFinal
    });
  }

  return defs;
}


function generarResumenDeSesion(sesionId) {
  const historial = getHistorialParaOpenAI(sesionId);
  const promptResumen = {
    model: "gpt-4o",
    messages: [
      { role: "system", content: "Resume esta conversación entre trabajador y supervisor en una frase clara y breve." },
      ...historial
    ],
    max_tokens: 100,
    temperature: 0.3
  };

  const config = leerConfiguracion();

  const response = UrlFetchApp.fetch("https://api.openai.com/v1/chat/completions", {
    method: "post",
    contentType: "application/json",
    headers: {
      Authorization: "Bearer " + config.openai_api_key
    },
    payload: JSON.stringify(promptResumen),
    muteHttpExceptions: true
  });

  const data = JSON.parse(response.getContentText());
  const resumen = data.choices?.[0]?.message?.content || "";
  guardarResumenEnSesion(sesionId, resumen);
  return resumen;
}

function guardarResumenEnSesion(sesionId, resumen) {
  const hoja = SpreadsheetApp.openById(ID_HOJA).getSheetByName(NOMBRE_SESIONES);
  const datos = hoja.getDataRange().getValues();
  for (let i = 1; i < datos.length; i++) {
    if (datos[i][0] === sesionId) {
      hoja.getRange(i + 1, 7).setValue(resumen);
      break;
    }
  }
}

function obtenerUltimoConteo(producto) {
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Conteos");
  const datos = hoja.getDataRange().getValues();
  let ultimo = null;

  for (let i = datos.length - 1; i >= 1; i--) {
    if (String(datos[i][2]).toLowerCase() === producto.toLowerCase()) {
      ultimo = {
        fecha: datos[i][0],
        producto: datos[i][2],
        sistema: Number(datos[i][3]),
        fisico: Number(datos[i][4]),
        diferencia: Number(datos[i][5])
      };
      break;
    }
  }

  return ultimo;
}

function guardarConteoEnHoja(producto, fisico, sistema, usuarioId, claveProducto = '', fecha = new Date()) {
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Conteos");
  if (!hoja) throw new Error("No existe la hoja 'Conteos'");

  const diferencia = Number(fisico) - Number(sistema);
  const confirmado = false;

  hoja.appendRow([
    new Date(fecha),       // A: Fecha
    usuarioId,             // B: UsuarioID
    claveProducto,         // C: Clave producto
    producto,              // D: Producto
    Number(sistema),       // E: Cantidad sistema
    Number(fisico),        // F: Cantidad físico
    diferencia,            // G: Diferencia
    confirmado,            // H: Confirmado
    ""                     // I: Observación (por ahora vacío)
  ]);

  const ultimo = obtenerUltimoConteo(producto);
  let variacionSospechosa = false;
  if (ultimo && Math.abs(fisico - ultimo.fisico) >= 10) {
    variacionSospechosa = true;
  }

  return {
    registrado: true,
    diferencia,
    variacionSospechosa,
    ultimo
  };
}



function registrarConteo(args, sesionId, usuarioId) {
  const producto = args.producto;
  const sistema = args.sistema;
  const fisico = args.fisico;
  const clave = args.claveProducto || ''; // opcional

  const resultado = guardarConteoEnHoja(producto, fisico, sistema, usuarioId, clave);

  let mensaje = `✅ Conteo registrado: ${producto}, sistema: ${sistema}, físico: ${fisico} (dif: ${resultado.diferencia}).`;

  if (resultado.variacionSospechosa && resultado.ultimo) {
    mensaje += `\n🧐 Ojo: el conteo anterior fue ${resultado.ultimo.fisico} el ${Utilities.formatDate(new Date(resultado.ultimo.fecha), Session.getScriptTimeZone(), 'yyyy-MM-dd')}. ¿Estás seguro que este conteo es correcto?`;
  }

  registrarMensaje(sesionId, usuarioId, 'assistant', mensaje);
  return mensaje;
}

/**
 * Registra una entrada genérica (Tarea, Problema o Sugerencia) en la hoja "Tareas".
 * @param {object} args Los argumentos extraídos por OpenAI (ej. {tema, detalle} o {titulo, descripcion}).
 * @param {string} tipoEntrada El tipo de entrada: "Tarea", "Problema" o "Sugerencia".
 * @param {string} sesionId El ID de la sesión actual.
 * @param {string} usuarioId El ID del usuario que registra.
 * @returns {string} Un mensaje de confirmación para el usuario.
 */
function registrarEntrada(args, tipoEntrada, sesionId, usuarioId) {
  const hoja = SpreadsheetApp.getActive().getSheetByName("Tareas");
  if (!hoja) throw new Error("La hoja 'Tareas' no fue encontrada.");

  const ahora = new Date();
  const id = tipoEntrada.charAt(0) + Utilities.formatDate(ahora, Session.getScriptTimeZone(), "yyyyMMddHHmmss");

  let referencia = "";
  let descripcion = "";
  let icono = "📝"; // Icono por defecto

  // Asignamos los campos y el icono según el tipo de entrada
  switch (tipoEntrada) {
    case "Problema":
      referencia = args.tema || "Sin tema";
      descripcion = args.detalle || "Sin detalle";
      icono = "⚠️";
      break;
    case "Sugerencia":
      referencia = args.titulo || "Sin título";
      descripcion = args.descripcion || "Sin descripción";
      icono = "💡";
      break;
    case "Tarea":
      referencia = args.referencia || "Tarea sin referencia";
      descripcion = args.descripcion || "Sin descripción";
      icono = "✅";
      break;
  }

  // Guardamos la fila en la hoja de Tareas
  hoja.appendRow([
    id,             // ID (ej. P20240624..., S20240624...)
    ahora,          // Fecha creación
    usuarioId,      // UsuarioID
    tipoEntrada,    // Tipo (Problema, Sugerencia, Tarea)
    referencia,     // Referencia (Tema, Título, etc.)
    descripcion,    // Descripción (Detalle, etc.)
    "pendiente",    // Estado
    args.nota || "",// Nota (si la hubiera)
    ""              // Fecha cierre
  ]);

  // Creamos el mensaje de confirmación unificado
  const mensajeConfirmacion = `${icono} ${tipoEntrada} registrada: “${referencia}”.`;
  
  // Registramos el mensaje del asistente en el historial
  registrarMensaje(sesionId, usuarioId, 'assistant', mensajeConfirmacion);

  // Devolvemos el mensaje para que se muestre en el chat
  return mensajeConfirmacion;
}



function detectaTareaPendiente(mensaje) {
  const t = mensaje.toLowerCase();

  // - Reconteo prometido
  if (t.includes("recontar") || (t.includes("contar") && t.includes("mañana"))) {
    return {
      autoTipo: "conteo",
      autoReferencia: extraerProducto(t),
      autoDescripcion: "Reconteo pendiente"
    };
  }

  // - Problema sin solución (“lo vemos luego”, “hay que revisar”)
  if (t.includes("problema") && (t.includes("revisar") || t.includes("luego"))) {
    return {
      autoTipo: "problema",
      autoReferencia: "Incidente general",
      autoDescripcion: "Seguimiento a problema reportado"
    };
  }

  // - Queja de vendedor / cliente
  if (t.match(/vendedor|cliente/gi) && t.includes("queja")) {
    return {
      autoTipo: "seguimiento",
      autoReferencia: "Queja vendedor/cliente",
      autoDescripcion: "Dar seguimiento a queja"
    };
  }

  return null;
}

function extraerProducto(texto) {
  // naive: toma palabra tras “recontar” o “contar”
  const m = texto.match(/(?:recontar|contar)\s+([\w\s\-]+)/i);
  return m ? m[1].trim() : "Producto no identificado";
}

/**
 * Envía un mensaje “oficial” del Administrador a la sesión indicada.
 *
 * @param {string} sesionId   ID de la sesión del trabajador
 * @param {string} adminId    ID del administrador (p.e. "ADMIN")
 * @param {string} texto      Texto que querés enviar
 */
function enviarMensajeAdministrador(sesionId, adminId, texto) {
  const hoja = SpreadsheetApp.getActiveSpreadsheet()
                             .getSheetByName(NOMBRE_HISTORIAL);

  // ① Lo registrás igual que cualquier otro mensaje
  hoja.appendRow([
    '',                       // ID (auto, si usás fórmula)
    new Date(),               // Fecha-hora
    adminId,                  // Usuario (ADMIN)
    sesionId,                 // Sesión destino
    'admin',                  // Emisor / rol
    `Mensaje del administrador: ${texto}`, // Contenido
    false, '', ''             // no es function_call
  ]);
}

function cargarMensajesParaAdministrador() {
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(NOMBRE_HISTORIAL);
  const datos = hoja.getDataRange().getValues();
  const mensajes = [];

  const regexCarlos = /mensaje\s+para\s+(carlos|el jefe)|avisale\s+a\s+(carlos|el jefe)|decile\s+a\s+(carlos|el jefe)/i;

  for (let i = 1; i < datos.length; i++) {
    const fila = datos[i];
    const emisor = fila[4];
    const contenido = String(fila[5] || '');
    const usuarioID = fila[2];
    const fecha = Utilities.formatDate(new Date(fila[1]), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm");

    if (emisor === "user" && regexCarlos.test(contenido)) {
      mensajes.push({
        usuario: usuarioID,
        texto: contenido,
        fecha: fecha,
        sesionId: sesionId
      });
    }
  }

  return mensajes;
}


function generarResumenAdmin(fechaReferencia) {
  const hojaHistorial = SpreadsheetApp.openById(ID_HOJA).getSheetByName(NOMBRE_HISTORIAL);
  const datos = hojaHistorial.getDataRange().getValues();
  const encabezados = datos[0];
  const idxFecha = encabezados.indexOf("Fecha");
  const idxRol = encabezados.indexOf("Rol");
  const idxContenido = encabezados.indexOf("Contenido");
  const idxSucursal = encabezados.indexOf("Sucursal");
  const idxUsuario = encabezados.indexOf("Nombre");

  const fechaFiltro = fechaReferencia || Utilities.formatDate(new Date(), "GMT-6", "yyyy-MM-dd");
  const resumen = {
    conteos: [],
    problemas: [],
    tareas: [],
    otras: []
  };

  for (let i = 1; i < datos.length; i++) {
    const fila = datos[i];
    const fecha = fila[idxFecha].toString().split("T")[0];
    const rol = fila[idxRol];
    const contenido = fila[idxContenido];
    const sucursal = fila[idxSucursal];
    const nombre = fila[idxUsuario];

    if (fecha !== fechaFiltro || rol === "Administrador") continue;

    const item = `- ${sucursal}: ${contenido} (${nombre})`;

    if (contenido.includes("conteo") || contenido.includes("sistema hay")) {
      resumen.conteos.push(item);
    } else if (contenido.includes("problema") || contenido.includes("queja")) {
      resumen.problemas.push(item);
    } else if (contenido.includes("dejalo como pendiente") || contenido.includes("tarea creada")) {
      resumen.tareas.push(item);
    } else {
      resumen.otras.push(item);
    }
  }

  const salida = [
    `📝 Resumen Diario – Ferretería Flores`,
    `📅 Fecha: ${fechaFiltro}`,
    ``,
    `🔢 Conteos registrados:\n${resumen.conteos.join("\n") || "- Sin registros"}`,
    ``,
    `⚠️ Problemas reportados:\n${resumen.problemas.join("\n") || "- Ninguno"}`,
    ``,
    `🕒 Tareas pendientes:\n${resumen.tareas.join("\n") || "- Ninguna"}`,
    ``,
    `📌 Otras notas:\n${resumen.otras.join("\n") || "- Sin información adicional"}`
  ].join("\n");

  return salida;
}




function testFlujoInteligente() {
  const usuarioId = 'U001';
  const sesion = iniciarSesion(usuarioId);
  Logger.log('🟢 Sesión iniciada: ' + sesion);

  // Lista de entradas simuladas
  const mensajesDePrueba = [
    "quiero hacer mi reporte del día",
    "tuve problemas con un vendedor que pasa en el celular",
    "también conté 10 sacos de cemento hoy",
    "tengo una idea para mejorar cómo despachamos los pedidos"
  ];

  for (let i = 0; i < mensajesDePrueba.length; i++) {
    const mensaje = mensajesDePrueba[i];
    const tipoFuncion = detectarTipoFuncion(mensaje);
    Logger.log(`📩 Mensaje: "${mensaje}"`);
    Logger.log(`🔍 Función detectada: ${tipoFuncion || "ninguna (respuesta general)"}`);

    const respuesta = enviarAOpenAI(sesion, usuarioId, mensaje, tipoFuncion);
    Logger.log(`🤖 Respuesta GPT:\n${JSON.stringify(respuesta, null, 2)}`);
  }

  // Ver las últimas líneas del historial
  const hojaHist = SpreadsheetApp.openById(ID_HOJA).getSheetByName(NOMBRE_HISTORIAL);
  const ultimas = hojaHist.getRange(Math.max(2, hojaHist.getLastRow() - 9), 1, 10, hojaHist.getLastColumn()).getValues();
  Logger.log('📝 Últimos 10 registros en Historial:\n' + JSON.stringify(ultimas));
}

/**
 * Busca artículos en la hoja "Articulos" por Clave (Col A) o por Descripcion (Col B).
 * @param {string} textoBusqueda El texto parcial para buscar (ej. "cem" o "010a").
 * @returns {string[]} Un array con las descripciones de los hasta 5 mejores resultados.
 */
function buscarArticulo(textoBusqueda) {
  if (!textoBusqueda || textoBusqueda.trim().length < 2) {
    return [];
  }
  
  try {
    const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(NOMBRE_ARTICULOS); 
    if (!hoja) return ["Error: Hoja 'Articulos' no encontrada."];

    // Leemos ambas columnas, A y B, al mismo tiempo.
    const rangoDatos = hoja.getRange(2, 1, hoja.getLastRow() - 1, 2).getValues();
    const busquedaMinusculas = textoBusqueda.toLowerCase();
    
    const coincidencias = rangoDatos
      .filter(fila => {
        const clave = fila[0].toString().toLowerCase();
        const descripcion = fila[1].toString().toLowerCase();
        // Devuelve la fila si la búsqueda coincide con la clave O con la descripción
        return clave.includes(busquedaMinusculas) || descripcion.includes(busquedaMinusculas);
      })
      .map(fila => fila[1]); // Devuelve solo la descripción (Columna B) para mostrarla al usuario
      
    return coincidencias.slice(0, 5);
  } catch (e) {
    Logger.log("Error en buscarArticulo: " + e.toString());
    return ["Error al buscar."];
  }
}

/**
 * Obtiene el anuncio más reciente que esté marcado como "Activo".
 * @returns {object|null} Un objeto con los datos del anuncio o null si no hay ninguno.
 */
function obtenerUltimoAnuncioActivo() {
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Anuncios");
  if (!hoja) return null;

  const datos = hoja.getDataRange().getValues();
  // Recorremos desde el final hacia el principio para encontrar el último activo
  for (let i = datos.length - 1; i >= 1; i--) {
    const [id, fecha, titulo, mensaje, activo] = datos[i];
    if (activo === true || activo.toString().toUpperCase() === 'TRUE') {
      return { id, fecha, titulo, mensaje };
    }
  }
  return null;
}

/**
 * Verifica si hay un anuncio nuevo para un usuario y lo devuelve si no lo ha visto.
 * Usa PropertiesService para recordar qué anuncios ha visto cada usuario.
 * @param {string} usuarioId El ID del usuario.
 * @returns {string|null} El mensaje del anuncio formateado o null.
 */
/**
 * Verifica si hay un anuncio nuevo para un usuario y lo devuelve
 * como un array de mensajes si no lo ha visto.
 * @param {string} usuarioId El ID del usuario.
 * @returns {string[]|null} Un array con los mensajes del anuncio o null.
 */
function verificarYObtenerAnuncioParaUsuario(usuarioId) {
  const anuncio = obtenerUltimoAnuncioActivo();
  if (!anuncio) return null;

  const userProperties = PropertiesService.getUserProperties();
  const propertyKey = 'anuncio_visto_' + anuncio.id;
  const yaVisto = userProperties.getProperty(propertyKey);

  if (!yaVisto) {
    userProperties.setProperty(propertyKey, 'true');
    
    // --- ¡CAMBIO CLAVE AQUÍ! ---
    // 1. Unimos el título y el mensaje en un solo bloque.
    const textoCompleto = `📢 **${anuncio.titulo}**\n\n${anuncio.mensaje}`;

    // 2. Dividimos el texto completo usando el doble salto de línea como separador.
    // Esto crea un array de strings.
    const mensajesSeparados = textoCompleto.split('\n\n');

    // 3. Devolvemos el array de mensajes.
    return mensajesSeparados;
  }
  
  return null;
}

function abrirModalDeConteo() {
  return HtmlService.createHtmlOutputFromFile('conteo-modal').getContent();
}

/**
 * Busca artículos filtrando por múltiples palabras clave.
 * @param {string} textoBusqueda El string de búsqueda, ej: "cem 42".
 * @returns {object[]} Un array de objetos {clave, desc}.
 */
function buscarArticulosAvanzado(textoBusqueda) {
  const terminos = textoBusqueda.toLowerCase().split(' ').filter(Boolean); // Divide "cem 42" en ['cem', '42']
  if (terminos.length === 0) return [];

  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Articulos");
  if (!hoja) return [];

  const rangoDatos = hoja.getRange(2, 1, hoja.getLastRow() - 1, 2).getValues();
  
  const coincidencias = rangoDatos
    .map(fila => ({ clave: fila[0].toString(), desc: fila[1].toString() }))
    .filter(item => {
      const descripcionMinusculas = item.desc.toLowerCase();
      // Devuelve true solo si la descripción contiene TODOS los términos de búsqueda
      return terminos.every(termino => descripcionMinusculas.includes(termino));
    });
      
  return coincidencias.slice(0, 50); // Devolvemos hasta 50 resultados para la tabla
}

/**
 * Recibe un array de conteos y los registra en la hoja "Conteos".
 * @param {object[]} conteosArray El array de objetos de conteo.
 * @returns {string} Un mensaje de confirmación con el número de registros guardados.
 */
function registrarMultiplesConteos(conteosArray) {
  if (!conteosArray || conteosArray.length === 0) {
    return "No se recibieron datos para registrar.";
  }
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Conteos");
  const usuarioId = Session.getActiveUser().getEmail(); // Obtenemos el usuario actual
  const ahora = new Date();

  const filasParaAñadir = conteosArray.map(conteo => {
    const diferencia = Number(conteo.fisico) - Number(conteo.sistema);
    const id = "C" + Date.now() + Math.random().toString(36).substring(2, 6);
    return [ id, ahora, usuarioId, conteo.clave, conteo.producto, Number(conteo.sistema), Number(conteo.fisico), diferencia, true, 'Registro masivo' ];
  });

  // Usamos setValues para añadir todas las filas en una sola operación (mucho más rápido)
  hoja.getRange(hoja.getLastRow() + 1, 1, filasParaAñadir.length, filasParaAñadir[0].length).setValues(filasParaAñadir);
  
  return `${filasParaAñadir.length} conteos registrados exitosamente.`;
}