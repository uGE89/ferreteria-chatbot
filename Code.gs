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

/**
 * Función maestra que se encarga de recopilar todos los datos 
 * necesarios para la carga inicial de la aplicación.
 * @param {string} usuarioId El ID del usuario que está iniciando sesión.
 * @returns {object} Un objeto con todos los datos necesarios para el frontend.
 */
function cargarDatosIniciales(usuarioId) {
  try {
    // 1. Validar al usuario (este es el primer paso crítico)
    const validacion = validarUsuario(usuarioId);
    if (!validacion.ok) {
      // Si la validación falla, no continuamos y devolvemos el error.
      return { ok: false, msg: validacion.msg };
    }

    // 2. Si la validación es exitosa, obtenemos el resto de los datos
    const perfil = validacion.perfil;
    const sesion = iniciarSesion(usuarioId);
    const mensajesAdmin = cargarMensajesParaAdministrador(); // Carga los mensajes para el admin
    const resumenDiario = generarResumenAdmin(); // Genera el resumen del día

    // 3. Devolvemos todo en un solo objeto
    return {
      ok: true,
      perfil: perfil,
      sesionId: sesion.sessionId,
      anuncio: sesion.mensajeAnuncio,
      mensajesParaAdmin: mensajesAdmin,
      resumenDiario: resumenDiario
    };

  } catch (e) {
    Logger.log("Error en cargarDatosIniciales: " + e.toString());
    return { ok: false, msg: "Ocurrió un error inesperado al cargar la aplicación." };
  }
}




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
    Logger.log(`[registrarMensaje] SesionID: ${sesionId}, UsuarioID: ${usuarioId}, Emisor: ${emisor}, Contenido: ${contenido}`);

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
      const esFunctionCall = String(row[6]).toUpperCase() === 'TRUE';
      const role = esFunctionCall ? 'function' : (emisor === 'user' || emisor === 'assistant' ? emisor : 'system');
      const msg = { role };

      if (esFunctionCall) {
        msg.name = row[7] || 'funcion_no_definida';
        try {
          msg.arguments = JSON.parse(row[8] || '{}');
        } catch (e) {
          msg.arguments = {};
        }
      } else {
        msg.content = String(row[5] || '');
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
/**
 * Orquesta la lógica de la conversación: maneja tareas, prepara y envía solicitudes
 * a OpenAI, y procesa la respuesta, incluyendo el flujo de 2 pasos para function calling.
 */
function enviarAOpenAI(sesionId, usuarioId, payload, tipoFuncion = '') {
    Logger.log(`[enviarAOpenAI - START] SesionId recibido: ${sesionId}`);
  Logger.log(`[enviarAOpenAI - START] UsuarioId recibido: ${usuarioId}`);
  Logger.log(`[enviarAOpenAI - START] Payload recibido: ${JSON.stringify(payload)}`);

  // --- 1. INICIALIZACIÓN Y MANEJO DEL PAYLOAD ---
  const textoUsuario = payload.texto || ''; // Asegurarse de que no sea null
    Logger.log(`[enviarAOpenAI - START] textoUsuario después de || '': ${textoUsuario}`);

  const claveProducto = payload.claveProducto;
  let mensajeParaRegistrar = textoUsuario;
    Logger.log(`[enviarAOpenAI - START] mensajeParaRegistrar (inicial): ${mensajeParaRegistrar}`);


  // --- 2. LÓGICA PRE-OPENAI (SOBRE EL TEXTO ORIGINAL DEL USUARIO) ---
  
  // Caso especial: El mensaje es una instrucción de inicio de sesión
  if (mensajeParaRegistrar === "__inicio") {
    mensajeParaRegistrar = "Acabas de iniciar sesión. Salúdame amablemente por mi nombre y pregúntame en qué puedo ayudarte hoy.";
  }

  // Detectar confirmación de tarea pendiente
  const pendiente = CacheService.getUserCache().get(`tareaPendiente-${sesionId}`);
  if (pendiente && textoUsuario.match(/^(sí|si|dale|ok|correcto|de acuerdo)/i)) {
    const args = JSON.parse(pendiente);
    const resultadoTarea = registrarEntrada(args, "Tarea", sesionId, usuarioId);
    CacheService.getUserCache().remove(`tareaPendiente-${sesionId}`);
    // No necesitamos devolver resultadoTarea.mensaje, la función ya lo registra. 
    // La respuesta final la dará OpenAI en el siguiente paso.
    // Devolvemos el objeto de respuesta de la función para que el front lo muestre.
    return { content: resultadoTarea }; 
  }

  // Detectar si el mensaje actual podría ser una nueva tarea
  const posibleTarea = detectaTareaPendiente(textoUsuario);
  if (posibleTarea) {
    const aviso = `Detecté que esto podría ser una tarea (“${posibleTarea.autoDescripcion}”). ¿La creo como pendiente?`;
    CacheService.getUserCache().put(`tareaPendiente-${sesionId}`, JSON.stringify(posibleTarea), 3600);
    registrarMensaje(sesionId, usuarioId, 'assistant', aviso);
    return { content: aviso };
  }
  
  // --- 3. PREPARACIÓN FINAL DEL MENSAJE Y LLAMADA A OPENAI ---

  // Inyectamos la clave de producto al mensaje que verá OpenAI, si existe
  if (claveProducto) {
    mensajeParaRegistrar = `[CLAVE DE PRODUCTO: ${claveProducto}] ${mensajeParaRegistrar}`;
  }

  // Registramos el mensaje del usuario (ya procesado) UNA SOLA VEZ
  registrarMensaje(sesionId, usuarioId, 'user', mensajeParaRegistrar);

  // Determinar el tipo de función a usar (si no se forzó uno)
  if (!tipoFuncion || tipoFuncion.trim() === '') {
    tipoFuncion = detectarTipoFuncion(textoUsuario); // Usar el texto original para la detección
  }
  
  const perfil = getPerfilActual();
  let systemPrompt = obtenerPromptSistema(tipoFuncion);

  if (perfil) {
    const perfilContexto = `Contexto del usuario:\n- ID: ${perfil.usuarioID}\n- Nombre: ${perfil.nombre}\n- Sucursal: ${perfil.sucursal}\n- Rol: ${perfil.rol}\nYa conocés la sucursal y el rol del trabajador. No vuelvas a preguntar por ellos. Respondé siempre en español con tono directo, estilo WhatsApp, como Carlos E. Flores.`;
    systemPrompt.content = perfilContexto + "\n\n---\n\n" + systemPrompt.content;
  }
  
  const historial = getHistorialParaOpenAI(sesionId);
  const messages = [systemPrompt].concat(historial);
  const config = leerConfiguracion();
  const functionsDefs = leerFunciones();

  // ELIMINAMOS COMPLETAMENTE la sobrescritura del historial. Ya no es necesaria.
  
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
  
  // --- 4. LLAMADAS A API Y MANEJO DE RESPUESTAS (Sin cambios en esta sección) ---
  const response = UrlFetchApp.fetch('https://api.openai.com/v1/chat/completions', options);
  const responseText = response.getContentText();
  const jsonResponse = JSON.parse(responseText);

  // Verificar si hay un error en la respuesta de OpenAI
  if (jsonResponse.error) {
    Logger.log("Error de OpenAI: " + responseText);
    return { content: "Hubo un error al contactar al asistente. Por favor, intenta de nuevo." };
  }

  const data = jsonResponse.choices[0].message;

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

    messages.push(data);
    messages.push({ role: "function", name: nombreFuncion, content: resultadoFuncion });

    const payloadPaso2 = { model: config.modelo_default, messages: messages, temperature: parseFloat(config.temperatura), max_tokens: parseInt(config.max_tokens, 10) };
    const optionsPaso2 = { ...options, payload: JSON.stringify(payloadPaso2) };

    const responsePaso2 = UrlFetchApp.fetch('https://api.openai.com/v1/chat/completions', optionsPaso2);
    const dataPaso2 = JSON.parse(responsePaso2.getContentText()).choices[0].message;

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
      });
    }
  }

  return mensajes;
}


/**
 * ESTA ES LA VERSIÓN FINAL Y CORREGIDA
 * Genera un resumen diario y maneja de forma segura el caso de que el historial esté vacío.
 */
/**
 * ESTA ES LA VERSIÓN FINAL Y CORREGIDA
 * Genera un resumen diario y maneja de forma segura el caso de que el historial esté vacío.
 */
function generarResumenAdmin(fechaReferencia) {
  const hojaHistorial = SpreadsheetApp.openById(ID_HOJA).getSheetByName(NOMBRE_HISTORIAL);
  const datos = hojaHistorial.getDataRange().getValues();

  if (datos.length <= 1) return "No hay historial para generar un resumen.";

  /* 1. Mapeo seguro de encabezados */
  const encabezados = datos[0].map(h => String(h).toLowerCase());

  const idxFecha     = encabezados.indexOf('fechahora');
  const idxRol       = encabezados.indexOf('emisor');
  const idxContenido = encabezados.indexOf('contenido');
  const idxUsuario   = encabezados.indexOf('usuarioid');
  const idxNombre    = encabezados.indexOf('nombre');

  if (idxFecha === -1 || idxRol === -1 || idxContenido === -1) {
    return 'Faltan columnas obligatorias (FechaHora / Emisor / Contenido) en HistorialConversaciones.';
  }

  /* 2. Prepara caché de perfiles para obtener sucursal si la necesitás */
  const cache = CacheService.getUserCache();

  const fechaFiltro = fechaReferencia ||
        Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");

  const resumen = { conteos: [], problemas: [], tareas: [], otras: [] };

  /* 3. Recorremos las filas de conversación */
  for (let i = 1; i < datos.length; i++) {
    const fila = datos[i];

    const fechaCell = fila[idxFecha];
    if (!fechaCell) continue;
    const fechaFila = Utilities.formatDate(new Date(fechaCell), Session.getScriptTimeZone(), "yyyy-MM-dd");
    if (fechaFila !== fechaFiltro) continue;

    const rol       = fila[idxRol];
    if (rol === 'Administrador') continue;  // omite mensajes del admin

    const contenido = String(fila[idxContenido] || '');
    const usuarioId = fila[idxUsuario];
    const nombre    = fila[idxNombre] || usuarioId;

    /* Obtener sucursal — si existe en caché */
    let sucursal = 'SinSucursal';
    const perfilStr = cache.get(usuarioId);
    if (perfilStr) {
      try {
        const p = JSON.parse(perfilStr);
        sucursal = p.sucursal || sucursal;
      } catch (_) {}
    }

    const item = `- ${sucursal}: ${contenido} (${nombre})`;

    if (/conteo|sistema hay/i.test(contenido)) {
      resumen.conteos.push(item);
    } else if (/problema|queja/i.test(contenido)) {
      resumen.problemas.push(item);
    } else if (/dejalo como pendiente|tarea creada/i.test(contenido)) {
      resumen.tareas.push(item);
    } else {
      resumen.otras.push(item);
    }
  }

  /* 4. Formatear salida */
  const salida = [
    "📝 Resumen Diario – Ferretería Flores",
    `📅 Fecha: ${fechaFiltro}`,
    "",
    `🔢 Conteos registrados:\n${resumen.conteos.join("\n") || "- Sin registros"}`,
    "",
    `⚠️ Problemas reportados:\n${resumen.problemas.join("\n") || "- Ninguno"}`,
    "",
    `🕒 Tareas pendientes:\n${resumen.tareas.join("\n") || "- Ninguna"}`,
    "",
    `📌 Otras notas:\n${resumen.otras.join("\n") || "- Sin información adicional"}`
  ].join("\n");

  return salida;
}





function testFlujoInteligente() {
  const usuarioId = 'U001';
  const sesionObj = iniciarSesion(usuarioId); // Renombrado para mayor claridad
  const sessionId = sesionObj.sessionId; // Extraer el ID de la sesión
  Logger.log('🟢 Sesión iniciada: ' + sessionId);
  if (sesionObj.mensajeAnuncio) {
      Logger.log('📢 Anuncio: ' + sesionObj.mensajeAnuncio.join('\n'));
  }

  const mensajesDePrueba = [
    { texto: "quiero hacer mi reporte del día" },
    { texto: "tuve problemas con un vendedor que pasa en el celular" },
    { texto: "también conté 10 sacos de cemento hoy" },
    { texto: "tengo una idea para mejorar cómo despachamos los pedidos" }
  ];

  for (let i = 0; i < mensajesDePrueba.length; i++) {
    const payload = mensajesDePrueba[i]; // 'payload' ahora es un objeto
    const tipoFuncion = detectarTipoFuncion(payload.texto);
    Logger.log(`📩 Mensaje: "${payload.texto}"`);
    Logger.log(`🔍 Función detectada: ${tipoFuncion || "ninguna (respuesta general)"}`);

    // LLAMADA CORRECTA
    const respuesta = enviarAOpenAI(sessionId, usuarioId, payload, tipoFuncion);
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
/**
 * ESTA ES LA VERSIÓN CORRECTA Y VALIDADA
 * Recibe un array de conteos del modal y los registra en la hoja "Conteos",
 * asegurando que el formato y el orden de las columnas sean correctos.
 * @param {object[]} conteosArray El array de objetos de conteo.
 * @returns {string} Un mensaje de confirmación.
 */
function registrarMultiplesConteos(conteosArray, usuarioId) {
  if (!conteosArray || conteosArray.length === 0) {
    return "No se recibieron datos para registrar.";
  }
  
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Conteos");
  if (!hoja) {
    return "Error: No se encontró la hoja 'Conteos'.";
  }

  const ahora = new Date();

  // Mapeamos el array de conteos para que cada uno se convierta en una fila para la hoja
  const filasParaAñadir = conteosArray.map(conteo => {
    // Nos aseguramos de que las cantidades sean números para poder calcular
    const sistema = Number(conteo.sistema);
    const fisico = Number(conteo.fisico);
    const diferencia = fisico - sistema;
    
    // El array ahora tiene 9 elementos que coinciden con tus 9 columnas
    return [
      ahora,                      // Columna A: Fecha
      usuarioId,                  // Columna B: UsuarioID
      conteo.clave,               // Columna C: Clave producto
      conteo.producto,            // Columna D: Producto
      sistema,                    // Columna E: Cantidad Sistema
      fisico,                     // Columna F: Cantidad Físico
      diferencia,                 // Columna G: Diferencia
      false,                      // Columna H: Confirmado (lo ponemos en 'false' por defecto)
      'Registro masivo'           // Columna I: Observación
    ];
  });

  // Usamos setValues para escribir todas las filas de una sola vez (es más eficiente)
  hoja.getRange(hoja.getLastRow() + 1, 1, filasParaAñadir.length, filasParaAñadir[0].length).setValues(filasParaAñadir);
  
  return `${filasParaAñadir.length} conteos registrados exitosamente.`;
}

/**
 * Procesa el mensaje del usuario, lo busca en la base de datos de la hoja de cálculo
 * y devuelve una respuesta.
 * @param {string} mensaje El texto enviado por el usuario.
 * @return {string} La respuesta del chatbot.
 */
function testRegistroHistorial() {
  const usuarioId = "U001"; // <- Ajustá aquí si querés probar con otro
  const hojaHistorial = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(NOMBRE_HISTORIAL);
  const hojaSesiones = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(NOMBRE_SESIONES);

  Logger.log("🔍 Iniciando test de flujo completo...");

  // 1. Iniciar sesión
  const sesionInfo = iniciarSesion(usuarioId);
  const sessionId = sesionInfo.sessionId;
  Logger.log(`🆔 Sesión iniciada: ${sessionId}`);

  // 2. Enviar un mensaje de prueba
  const mensajePrueba = "Hola, quiero hacer un conteo de inventario hoy.";
  const payload = { texto: mensajePrueba, claveProducto: null };

  // 3. Enviar a OpenAI y registrar todo el flujo
  const respuesta = enviarAOpenAI(sessionId, usuarioId, payload);

  // 4. Buscar el último registro en el historial
  const datosHistorial = hojaHistorial.getDataRange().getValues();
  const ultFila = datosHistorial[datosHistorial.length - 1];

  const sesionRegistrada = ultFila[3];
  const emisor = ultFila[4];
  const contenido = ultFila[5];

  Logger.log("📝 Último mensaje registrado:");
  Logger.log("SesionID: " + sesionRegistrada);
  Logger.log("Emisor: " + emisor);
  Logger.log("Contenido: " + contenido);

  // 5. Validar
  if (sesionRegistrada === sessionId) {
    Logger.log("✅ El SessionID se registró correctamente en la hoja HistorialConversaciones.");
  } else {
    Logger.log("❌ ERROR: El SessionID no coincide. Revisa si fue definido correctamente antes del envío.");
  }

  // 6. Mostrar respuesta del asistente
  Logger.log("🤖 Respuesta del asistente:");
  Logger.log(JSON.stringify(respuesta, null, 2));
}
