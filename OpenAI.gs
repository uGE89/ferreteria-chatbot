/**
 * Funciones utilitarias para la integración con OpenAI.
 */

/**
 * Realiza la llamada HTTP a la API de OpenAI.
 * @param {object} payload - Datos para enviar a la API.
 * @returns {{code: number, text: string}} Código y texto de respuesta.
 */
function llamarOpenAI(payload) {
  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + OPENAI_API_KEY },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  const resp = UrlFetchApp.fetch(OPENAI_API_URL, options);
  return { code: resp.getResponseCode(), text: resp.getContentText() };
}

/**
 * Envía el payload a OpenAI aplicando reintentos y validaciones.
 * @param {object} requestPayload - Datos para enviar a la API.
 * @param {string} userId - ID del usuario para registro de errores.
 * @returns {object} JSON de respuesta o un objeto con la propiedad 'error'.
 */
function enviarSolicitudOpenAI(requestPayload, userId) {
  let attempt = 0;
  let apiResult = llamarOpenAI(requestPayload);
  while (apiResult.code === 429 && attempt < 2) {
    Utilities.sleep(2000);
    attempt++;
    apiResult = llamarOpenAI(requestPayload);
  }

  const responseCode = apiResult.code;
  const responseText = apiResult.text;

  if (responseCode === 429) {
    logError('Code', 'enviarSolicitudOpenAI', `Error 429: ${responseText}`, null, JSON.stringify(requestPayload), userId);
    return { error: 'Demasiadas solicitudes a la API. Intentá nuevamente en unos minutos.' };
  }

  if (responseCode !== 200) {
    logError('Code', 'enviarSolicitudOpenAI', `API call failed (${responseCode}): ${responseText}`, null, JSON.stringify(requestPayload), userId);
    let userMessage = `El asistente no pudo responder (Error ${responseCode}).`;
    try {
      const parsed = JSON.parse(responseText);
      const apiMsg = parsed.error?.message;
      if (apiMsg) userMessage = `El asistente no pudo responder (${responseCode}): ${apiMsg}`;
    } catch (e) {}
    throw new Error(userMessage);
  }

  return JSON.parse(responseText);
}

function contarTokens(texto) {
  const chars = String(texto || '').length;
  return Math.ceil(chars / 4);
}

function limitarHistorial(historial, limiteTokens = MAX_TOKENS_HISTORIAL, limiteMensajes = MAX_MENSAJES_HISTORIAL) {
  if (!Array.isArray(historial) || historial.length === 0) return [];

  // --- NUEVA LÓGICA DE SANITIZACIÓN ---
  // Filtramos el historial para eliminar secuencias de tool_calls rotas ANTES de limitar.
  const historialSano = [];
  for (let i = 0; i < historial.length; i++) {
    const mensajeActual = historial[i];
    // Si un mensaje del asistente tiene un tool_call...
    if (mensajeActual.role === 'assistant' && mensajeActual.tool_calls) {
      const siguienteMensaje = historial[i + 1];
      // ...verificamos si el siguiente mensaje es una respuesta válida de la herramienta.
      if (siguienteMensaje && siguienteMensaje.role === 'tool' && siguienteMensaje.tool_call_id === mensajeActual.tool_calls[0].id) {
        // Si la secuencia es válida, agregamos ambos mensajes.
        historialSano.push(mensajeActual);
        historialSano.push(siguienteMensaje);
        i++; // Saltamos el siguiente mensaje ya que lo hemos procesado.
      } else {
        // Si no hay una respuesta de herramienta válida, descartamos el tool_call roto.
        // Desactivado para evitar saturar el log de errores
        // logError('Code', 'limitarHistorial (Sanitización)', 'Se encontró y eliminó un tool_call sin respuesta válida.', '', JSON.stringify(mensajeActual));
      }
    } else {
      // Si no es un tool_call, simplemente lo agregamos.
      historialSano.push(mensajeActual);
    }
  }
  // --- FIN DE LA LÓGICA DE SANITIZACIÓN ---

  // Ahora, el resto de la función trabaja con el historial ya sanitizado.
  const result = [];
  let tokens = 0;
  const systemMsg = historialSano[0];
  tokens += contarTokens(systemMsg.content || '');
  result.unshift(systemMsg);

  for (let i = historialSano.length - 1; i > 0; i--) {
    const m = historialSano[i];
    const t = contarTokens(m.content || JSON.stringify(m.tool_calls || ''));

    if (result.length >= limiteMensajes || tokens + t > limiteTokens) {
      break;
    }
    tokens += t;
    result.splice(1, 0, m);
  }

  return result;
}

function getAITools() {
  Logger.log('--- Iniciando getAITools ---');

  if (!HERRAMIENTAS_AI || HERRAMIENTAS_AI.length === 0) {
    Logger.log('Advertencia: La constante HERRAMIENTAS_AI está vacía o no definida. No se configurarán herramientas.');
    return [];
  }

  const tools = HERRAMIENTAS_AI.map((tool, index) => {
    Logger.log(`Procesando herramienta [${index}]: NombreFuncion: ${tool.NombreFuncion}`);
    Logger.log(`  Descripción: ${tool.Descripcion.substring(0, 50)}...`); // Log parcial para evitar truncamiento
    // No loguear el SchemaParametros completo si es muy grande, o si contiene datos sensibles.
    // Logger.log(`  SchemaParametros: ${JSON.stringify(tool.SchemaParametros)}`);

    return {
      type: 'function',
      function: {
        name: tool.NombreFuncion,
        description: tool.Descripcion,
        parameters: tool.SchemaParametros
      },
      ComportamientoAdicional: tool.ComportamientoAdicional,
      PromptEspecifico: tool.PromptEspecifico
    };
  });

  Logger.log(`--- getAITools finalizado: Se configuraron ${tools.length} herramientas. ---`);
  return tools;
}

function getAIToolByName(name) {
  const tool = HERRAMIENTAS_AI.find(t => t.NombreFuncion === name);
  if (!tool) return null;
  return {
    type: 'function',
    function: {
      name: tool.NombreFuncion,
      description: tool.Descripcion,
      parameters: tool.SchemaParametros
    },
    ComportamientoAdicional: tool.ComportamientoAdicional,
    PromptEspecifico: tool.PromptEspecifico
  };
}

