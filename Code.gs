/**
 * Proyecto: PlataformaConversacional - Backend en Google Apps Script
 * Archivo: Code.gs (Principal)
 * Descripción: Contiene la lógica principal de la aplicación, utilidades generales,
 * integración con la IA y la suite de pruebas.
 */

// Se asume que las constantes como OPENAI_API_KEY, MODELO_DEFAULT, etc.,
// y el objeto SHEET_NAMES están definidos en Configuracion.gs y son accesibles globalmente.

// --- FUNCIONES DE SERVICIO HTML Y UTILIDADES BÁSICAS ---

/**
 * Sirve el archivo index.html como la interfaz de usuario principal.
 * @returns {GoogleAppsScript.HTML.HtmlOutput} El objeto HTML para mostrar la interfaz.
 */
function doGet() {
  const htmlOutput = HtmlService.createTemplateFromFile('index');
  return htmlOutput.evaluate()
    .setTitle('Plataforma Conversacional Interna')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Devuelve la fecha y hora actual como un string en el formato estándar de la app.
 * @returns {string} La fecha en formato 'dd/MM/yyyy HH:mm:ss'.
 */
function getFormattedTimestamp() {
  const now = new Date();
  const timezone = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();
  return Utilities.formatDate(now, timezone, 'dd/MM/yyyy HH:mm:ss');
}

function limitarTexto(texto, limiteTokens = MAX_TOKENS_HISTORIAL) {
  const totalTokens = contarTokens(texto);
  if (totalTokens <= limiteTokens) return texto;
  Logging.logError('Code', 'limitarTexto', 'Texto recortado por exceso de tokens');
  const maxChars = limiteTokens * 4;
  return texto.slice(0, maxChars);
}

function obtenerHistorialReciente(userId, sesionActual) {
  try {
    const sesiones = getSheetData(SHEET_NAMES.SESIONES)
      .filter(s => s.UsuarioID === userId && s.SesionID !== sesionActual);
    const tz = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - 2);
    const historial = [];

    sesiones.forEach(s => {
      const f = parseSafeDate(s.FechaInicio);
      if (!f || f < fechaLimite) return;
      if (s.HistorialConversacion && s.HistorialConversacion.length > 2) {
        try {
          const hist = JSON.parse(s.HistorialConversacion);
          hist.forEach(m => {
            if (m.role === 'user' || m.role === 'assistant') {
              historial.push(m);
            }
          });
        } catch (e) {
          Logging.logError('Code', 'obtenerHistorialReciente', 'Historial corrupto', e.stack, s.HistorialConversacion, userId);
        }
      }
    });

    return limitarHistorial([{ role: 'system', content: '' }, ...historial]).slice(1);
  } catch (e) {
    Logging.logError('Code', 'obtenerHistorialReciente', e.message, e.stack, userId);
    return [];
  }
}

/**
 * Prepara el payload y el historial para la solicitud a OpenAI.
 * @param {object} userProfile - Perfil del usuario.
 * @param {object} roleDetails - Detalles del rol.
 * @param {object} branchDetails - Detalles de la sucursal.
 * @param {Array<object>} chatHistory - Historial de conversación actual.
 * @param {object} payload - Datos enviados por el usuario.
 * @param {string} sessionId - ID de la sesión.
 * @param {string} userId - ID del usuario.
 * @returns {{requestPayload: object, chatHistory: Array<object>}} Datos listos para la API.
 */
function prepararPayload(userProfile, roleDetails, branchDetails, chatHistory, payload, sessionId, userId) {
  const finalSystemPrompt = PROMPT_SISTEMA_GENERAL
    .replace('{userName}', userProfile.Nombre)
    .replace('{userNotes}', userProfile.NotasAdicionales || 'N/A')
    .replace('{userRole}', userProfile.Rol)
    .replace('{roleDescription}', roleDetails.DescripcionGeneral || 'N/A')
    .replace('{roleResponsibilities}', roleDetails.ResponsabilidadesClave || 'N/A')
    .replace('{roleTools}', roleDetails.HerramientasComunes || 'N/A')
    .replace('{userBranch}', userProfile.Sucursal)
    .replace('{branchDescription}', branchDetails.Descripcion || 'N/A')
    .replace('{branchGoals}', branchDetails.MetasActuales || 'N/A');

  if (payload.texto) {
    chatHistory.push({ role: 'user', content: payload.texto });
  } else if (payload.tool_response) {
    const toolResponse = payload.tool_response;
    chatHistory.push({
      role: 'tool',
      tool_call_id: toolResponse.tool_call_id,
      name: toolResponse.function_name,
      content: toolResponse.result
    });
  }

  const selectedToolName = payload.tool_name;
  let tools = [];
  let promptExtra = '';

  if (selectedToolName) {
    const tool = getAIToolByName(selectedToolName);
    if (tool) {
      tools.push(tool);
      if (tool.PromptEspecifico) promptExtra += tool.PromptEspecifico;
      if (tool.ComportamientoAdicional) {
        if (promptExtra) promptExtra += '\n';
        promptExtra += tool.ComportamientoAdicional;
      }
    }
  }

  const historialExtra = obtenerHistorialReciente(userId, sessionId);
  chatHistory = limitarHistorial([
    { role: 'system', content: finalSystemPrompt + (promptExtra ? '\n' + promptExtra : '') },
    ...historialExtra,
    ...chatHistory
  ]);
  const historyForRequest = chatHistory.map(m => Object.assign({}, m));

  const requestPayload = {
    model: MODELO_DEFAULT,
    messages: historyForRequest,
    temperature: TEMPERATURA_AI,
    max_tokens: MAX_TOKENS_AI,
    tools: tools,
    tool_choice: 'auto'
  };

  return { requestPayload: requestPayload, chatHistory: chatHistory };
}


// --- LÓGICA DE NEGOCIO Y API DE IA ---

// La implementación oficial de `cargarDatosIniciales` se encuentra en Controladores.gs

/**
 * Envía una solicitud al modelo de IA de OpenAI y maneja su respuesta.
 * @param {string} sessionId - ID de la sesión actual.
 * @param {string} userId - ID del usuario.
 * @param {object} payload - Puede contener 'texto' del usuario o 'tool_response' con el resultado de una herramienta.
 * @returns {object} La respuesta del AI (content) o la llamada a herramienta (tool_call).
 */
function enviarAOpenAI(sessionId, userId, payload) {
  try {
    if (!sessionId || !userId) throw new Error('Sesión de usuario inválida. Por favor, reinicia tu sesión.');

    const sessions = getSheetData(SHEET_NAMES.SESIONES);
    const currentSession = sessions.find(s => String(s.SesionID) === String(sessionId));

    if (!currentSession) throw new Error('Sesión no encontrada. Por favor, reinicia tu sesión.');

    let chatHistory = [];
    if (currentSession.HistorialConversacion && currentSession.HistorialConversacion.length > 2) {
      try {
        chatHistory = JSON.parse(currentSession.HistorialConversacion);
        if (chatHistory[0] && chatHistory[0].role === 'system') {
          chatHistory.shift();
        }
      } catch (e) {
        Logging.logError('Code', 'enviarAOpenAI', `Error parseando historial: ${e.message}`, e.stack, currentSession.HistorialConversacion, userId);
      }
    }

    const userProfile = getUserProfile(userId);
    const roleDetails = getRoleDetails(userProfile.Rol);
    const branchDetails = getBranchDetails(userProfile.Sucursal);

    const preparacion = prepararPayload(
      userProfile,
      roleDetails,
      branchDetails,
      chatHistory,
      payload,
      sessionId,
      userId
    );
    const requestPayload = preparacion.requestPayload;
    chatHistory = preparacion.chatHistory;

    const responseJson = enviarSolicitudOpenAI(requestPayload, userId);
    if (responseJson.error) {
      return { content: responseJson.error };
    }
    const message = responseJson.choices?.[0]?.message;
    let aiResponse = {};

    if (message?.tool_calls) {
      aiResponse.tool_call = message.tool_calls[0];
      chatHistory.push(message);
    } else if (message?.content) {
      aiResponse.content = message.content;
      chatHistory.push({ role: 'assistant', content: message.content });
    } else {
      throw new Error("La respuesta de la IA no tuvo un formato esperado.");
    }

    const historyToSave = chatHistory.filter(m => m.role !== 'system');
    updateRowInSheet(SHEET_NAMES.SESIONES, 'SesionID', sessionId, {
      HistorialConversacion: JSON.stringify(historyToSave),
      UltimaActividad: getFormattedTimestamp()
    });

    return aiResponse;

  } catch (e) {
    Logging.logError('Code', 'enviarAOpenAI', e.message, e.stack, JSON.stringify({ sessionId, userId, payload }), userId);
    return { content: `Hubo un error al procesar tu solicitud: ${e.message}` };
  }
}

/**
 * Busca artículos por clave o descripción y devuelve SÓLO la descripción.
 * @param {string} query - El texto de búsqueda.
 * @returns {Array<string>} Un array de descripciones de productos que coinciden.
 */
/**
 * Busca artículos de inventario por clave o descripción y devuelve solo los nombres.
 * VERSIÓN CORREGIDA Y ROBUSTA
 * @param {string} query - El texto de búsqueda.
 * @returns {Array<string>} Un array de descripciones de productos que coinciden.
 */
function buscarArticulo(query) {
  try {
    // 1. Leemos directamente de la hoja, sin caché.
    const inventory = getSheetData(SHEET_NAMES.INVENTARIO);

    if (!query || query.trim() === '') return [];

    const searchTerms = query.toLowerCase().split(' ').filter(term => term.trim() !== '');
    if (searchTerms.length === 0) return [];

    return inventory
      .filter(item => {
        // 2. Usamos una validación más flexible.
        if (!item || !item.Descripcion) {
          return false;
        }

        // 3. Construimos el texto de búsqueda de forma segura.
        const searchableText = `${item.Descripcion} ${item.Clave || ''}`.toLowerCase();

        return searchTerms.every(term => searchableText.includes(term));
      })
      // Se mantiene el .map() porque el propósito de esta función es devolver solo las descripciones.
      .map(item => item.Descripcion);

  } catch (e) {
    Logging.logError('Code', 'buscarArticulo', e.message, e.stack, query);
    return [];
  }
}

/**
 * Busca artículos de inventario avanzados (con todos los detalles).
 * Utilizado por el modal de conteo.
 * @param {string} query - El texto de búsqueda.
 * @returns {Array<object>} Un array de objetos de productos que coinciden.
 */
/**
 * Busca artículos de inventario avanzados (con todos los detalles).
 * VERSIÓN CORREGIDA Y ROBUSTA
 * @param {string} query - El texto de búsqueda.
 * @returns {Array<object>} Un array de objetos de productos que coinciden.
 */
const INVENTARIO_COLUMNS = ['Clave','Descripcion','StockSistema','Ubicacion','Precio Costo','Precio Venta','Inversion','Participación','Acumulado','Periodo','Dia','tocaConteoHoy'];

function buscarArticulosAvanzado(query, filter = 'todos') {
  try {
    const inventory = getSheetData(SHEET_NAMES.INVENTARIO)
      .sort((a, b) => String(a.Descripcion).localeCompare(String(b.Descripcion), 'es', {sensitivity: 'base'}));

    let filteredInventory = inventory;

    // 1. Filtrado por conteo de hoy utilizando la columna pre calculada
    if (filter === 'hoy') {
      filteredInventory = filteredInventory.filter(item => String(item.tocaConteoHoy).toUpperCase() === 'TRUE');
    }

    // 2. Filtrar por término de búsqueda
    if (query && query.trim() !== '') {
      const searchTerms = query.toLowerCase().split(' ').filter(term => term.trim() !== '');
      if (searchTerms.length > 0) {
        filteredInventory = filteredInventory.filter(item => {
          if (!item || !item.Descripcion) return false;
          const searchableText = `${item.Descripcion} ${item.Clave || ''}`.toLowerCase();
          return searchTerms.every(term => searchableText.includes(term));
        });
      }
    }

    return filteredInventory.map(r => ({
      Clave: r.Clave,
      Descripcion: r.Descripcion,
      StockSistema: r.StockSistema,
      Ubicacion: r.Ubicacion,
      Periodo: r.Periodo,
      Dia: r.Dia
    }));

  } catch (e) {
    Logging.logError('Code.gs', 'buscarArticulosAvanzado', e.message, e.stack, JSON.stringify({query, filter}));
    return [];
  }
}

/**
 * Abre el modal de conteo de inventario (sirve el HTML del modal).
 * @returns {string} El contenido HTML del modal.
 */
function abrirModalDeConteo() {
  try {
    return HtmlService.createHtmlOutputFromFile('conteo-modal').getContent();
  } catch (e) {
    Logging.logError('Code', 'abrirModalDeConteo', e.message, e.stack);
    throw new Error('Error al cargar el formulario de conteo: ' + e.message);
  }
}

/**
 * Ejecuta una función de herramienta específica y devuelve el resultado.
 * El frontend llamará a esta función cuando la IA solicite usar una herramienta.
 * @param {string} functionName - El nombre de la función a ejecutar (ej. "registrarProblema").
 * @param {object} functionArgs - Los argumentos para la función.
 * @param {string} userId - El ID del usuario actual.
 * @param {string} sessionId - El ID de la sesión actual.
 * @returns {string} El resultado de la ejecución de la función, como un string.
 */
function ejecutarHerramienta(functionName, functionArgs, userId, sessionId) {
  Logger.log(`--- ejecutarHerramienta FUE LLAMADA ---`);
  Logger.log(`   - Intentando ejecutar: "${functionName}"`);
  Logger.log(`   - Con argumentos: ${JSON.stringify(functionArgs)}`);
  Logger.log(`   - Para el usuario: ${userId}`);

  try {
    // Estas funciones ahora están en Toolbox.gs
    switch (functionName) {
      case 'registrarProblema':
        Logger.log('   - Entrando en el caso: "registrarProblema"');
        return registrarProblema(userId, functionArgs.asunto, functionArgs.detalle, sessionId);

      case 'registrarSugerencia':
        Logger.log('   - Entrando en el caso: "registrarSugerencia"');
        return registrarSugerencia(userId, functionArgs.asunto, functionArgs.detalle, sessionId);

      case 'crearTareaPendiente':
        Logger.log('   - Entrando en el caso: "crearTareaPendiente"');
        return crearTareaPendiente(userId, functionArgs.titulo, functionArgs.descripcion, functionArgs.fechaLimite || '', sessionId);

      case 'registrarIngresoCaja':
        Logger.log('   - Entrando en el caso: "registrarIngresoCaja"');
        return registrarMovimientoCaja('Ingreso', functionArgs.monto, functionArgs.concepto, functionArgs.contacto, userId);

      case 'registrarEgresoCaja':
        Logger.log('   - Entrando en el caso: "registrarEgresoCaja"');
        return registrarMovimientoCaja('Egreso', functionArgs.monto, functionArgs.concepto, functionArgs.contacto, userId);

      case 'registrarConteo':
        Logger.log('   - Entrando en el caso: "registrarConteo"');
        return registrarConteo(
          userId,
          functionArgs.claveProducto,
          functionArgs.cantidadSistema,
          functionArgs.cantidadFisico,
          functionArgs.cpi,
          functionArgs.vpe,
          functionArgs.observacion,
          functionArgs.pagosTransferencia,
          functionArgs.pagosTarjeta
        );

      case 'arqueoCaja':
        Logger.log('   - Entrando en el caso: "arqueoCaja"');
        return registrarArqueoCaja(
          userId,
          functionArgs.saldoSistema,
          functionArgs.contado,
          functionArgs.transferencia,
          functionArgs.tarjeta,
          functionArgs.razonDiferencia
        );

      case 'generarResumenAdmin':
         Logger.log('   - Entrando en el caso: "generarResumenAdmin".');
         return generarResumenAdmin(functionArgs.dias);


      default:
        Logger.log(`   - ERROR: El caso para "${functionName}" no existe en el switch.`);
        throw new Error(`La lógica para llamar a la herramienta '${functionName}' no está implementada en el switch.`);
    }

  } catch (e) {
    Logger.log(`   - ❌ ERROR ATRAPADO DENTRO de ejecutarHerramienta: ${e.message}`);
    Logging.logError('Code', 'ejecutarHerramienta', e.message, e.stack, JSON.stringify({ functionName, functionArgs, userId }));
    return `Error al ejecutar la herramienta ${functionName}: ${e.message}`;
  }
}

// --- LÓGICA DE CALENDARIO DE CONTEO Y REGISTRO DE CONTEOS ---

/**
 * NUEVA FUNCIÓN: Registra múltiples conteos de inventario en la hoja de Conteos.
 * @param {Array<object>} conteos - Un array de objetos, cada uno representando un conteo.
 * @returns {string} Un mensaje de confirmación.
 */
// registrarMultiplesConteos se define de forma completa en Toolbox.gs

/**
 * Determina si un producto debe ser contado hoy basado en su ciclo.
 * @param {object} producto - El objeto del producto con las propiedades 'Periodo' y 'Dia'.
 * @returns {boolean} - True si debe contarse hoy.
 */

// --- FUNCIONES DE AYUDA PARA CONTEXTO ---
// Las funciones getUserProfile, getRoleDetails y getBranchDetails
// se encuentran ahora en DataHelpers.gs
