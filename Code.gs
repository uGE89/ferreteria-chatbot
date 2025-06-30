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
 * Registra errores de la aplicación en la hoja de LogErrores.
 * @param {string} tipoError - Tipo de error (e.g., 'Backend', 'AI', 'Frontend').
 * @param {string} funcion - Nombre de la función donde ocurrió el error.
 * @param {string} mensajeError - Mensaje descriptivo del error.
 * @param {string} [stackTrace=''] - Stack trace del error.
 * @param {string} [payload=''] - Datos relevantes asociados al error (serializados).
 * @param {string} [userId='N/A'] - ID del usuario si aplica.
 */
function logError(tipoError, funcion, mensajeError, stackTrace = '', payload = '', userId = 'N/A') {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAMES.LOG_ERRORES);
    if (!sheet) {
      Logger.log(`ERROR: La hoja '${SHEET_NAMES.LOG_ERRORES}' no existe. Error no registrado: ${mensajeError}`);
      return;
    }
    const now = new Date();
    const dateStr = Utilities.formatDate(now, SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone(), 'yyyy-MM-dd HH:mm:ss');
    const logId = `LOG-${now.getTime()}-${Math.floor(Math.random() * 1000)}`;
    sheet.appendRow([logId, dateStr, userId, tipoError, funcion, mensajeError, stackTrace, payload]);
  } catch(e) {
    Logger.log(`Fallo crítico en logError: ${e.message}`);
  }
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


// --- LÓGICA DE NEGOCIO Y API DE IA ---

/**
 * Carga los datos iniciales para el login y la interfaz del chat.
 * Valida ID y PIN contra la constante USUARIOS, y configura la sesión.
 * @param {string} userId - El ID del usuario que intenta iniciar sesión.
 * @param {string} pin - El PIN del usuario para la autenticación.
 * @returns {object} Un objeto con el perfil del usuario, ID de sesión, mensajes iniciales y quick starters.
 */
function cargarDatosIniciales(userId, pin) {
  try {
    // 1. Buscamos al usuario en nuestra constante de código (rápido y seguro).
    const userStaticData = USUARIOS.find(u => u.UsuarioID === userId && u.PIN === pin);

    // 2. Validación de credenciales.
    if (!userStaticData) {
      return { ok: false, msg: 'ID de usuario o PIN incorrecto.' };
    }

    // 3. Verificamos si el usuario está activo.
    if (!userStaticData.Activo) {
      return { ok: false, msg: 'Este usuario se encuentra inactivo.' };
    }
    
    // En este punto, `userStaticData` ya tiene el nombre si está bien definido en la constante USUARIOS.
    // Si necesitas que el nombre SIEMPRE venga de la hoja, deberías tener una columna 'Nombre' en tu hoja 'Usuarios'.
    // Asumiendo que la constante USUARIOS es la fuente primaria de datos del perfil:
    const perfil = { ...userStaticData };
    delete perfil.PIN; // Eliminar el PIN antes de enviar al frontend por seguridad.

    // --- El resto de la función para configurar la sesión y los quick starters ---
    const rolUsuario = perfil.Rol;
    const sessionId = 'SESS-' + Date.now() + '-' + Utilities.getUuid().substring(0, 8);

    appendRowToSheet(SHEET_NAMES.SESIONES, {
      SesionID: sessionId,
      UsuarioID: perfil.UsuarioID,
      FechaInicio: getFormattedTimestamp(),
      UltimaActividad: getFormattedTimestamp(),
      HistorialConversacion: '[]',
      EstadoSesion: 'Activa'
    });

    const welcomeMessage = PROMPT_SISTEMA_GENERAL.split('\n').filter(line => line.includes('¡Hola!') || line.includes('•'));
    
    const quickStarters = HERRAMIENTAS_AI
      .filter(tool => tool.EsQuickStarter === true)
      .filter(tool => {
        const rolesPermitidos = Array.isArray(tool.rolesPermitidos) ? tool.rolesPermitidos : ['Todos'];
        return rolesPermitidos.includes('Todos') || rolesPermitidos.includes(rolUsuario);
      })
      .map(tool => ({
        NombrePantalla: tool.NombrePantalla,
        NombreFuncion: tool.NombreFuncion
      }));
    
    let responseData = {
      ok: true,
      perfil: perfil,
      sesionId: sessionId,
      mensajeAnuncio: welcomeMessage,
      quickStarters: quickStarters
    };

    return responseData;

  } catch (e) {
    logError('Code', 'cargarDatosIniciales', e.message, e.stack, `userId: ${userId}`);
    return { ok: false, msg: `Error interno al cargar datos iniciales: ${e.message}.` };
  }
}

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
      } catch (e) {
        logError('Code', 'enviarAOpenAI', `Error parseando historial: ${e.message}`, e.stack, currentSession.HistorialConversacion, userId);
      }
    }

    if (chatHistory.length === 0) {
      chatHistory.push({ role: 'system', content: PROMPT_SISTEMA_GENERAL });
    }

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

    const tools = getAITools();

    const requestPayload = {
        model: MODELO_DEFAULT,
        messages: chatHistory,
        temperature: TEMPERATURA_AI,
        max_tokens: MAX_TOKENS_AI,
        tools: tools,
        tool_choice: "auto"
    };

    const options = {
        method: "post",
        contentType: "application/json",
        headers: { "Authorization": "Bearer " + OPENAI_API_KEY },
        payload: JSON.stringify(requestPayload),
        muteHttpExceptions: true
    };

    const apiResponse = UrlFetchApp.fetch(OPENAI_API_URL, options);
    const responseCode = apiResponse.getResponseCode();
    const responseText = apiResponse.getContentText();

    if (responseCode !== 200) {
        logError('Code', 'enviarAOpenAI', `API call failed (${responseCode}): ${responseText}`, null, JSON.stringify(requestPayload), userId);
        throw new Error(`El asistente no pudo responder (Error ${responseCode}).`);
    }

    const responseJson = JSON.parse(responseText);
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

    updateRowInSheet(SHEET_NAMES.SESIONES, 'SesionID', sessionId, {
      HistorialConversacion: JSON.stringify(chatHistory),
      UltimaActividad: getFormattedTimestamp()
    });

    return aiResponse;

  } catch (e) {
    logError('Code', 'enviarAOpenAI', e.message, e.stack, JSON.stringify({ sessionId, userId, payload }), userId);
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
    logError('Code', 'buscarArticulo', e.message, e.stack, query);
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
function buscarArticulosAvanzado(query) {
  try {
    // 1. Leemos directamente de la hoja, sin caché.
    const inventory = getSheetData(SHEET_NAMES.INVENTARIO); 

    // Si no hay búsqueda, devolvemos todo el inventario.
    if (!query || query.trim() === '') {
      // Antes de devolver, asegurémonos de que el primer item tenga las propiedades esperadas
      // Esto ayuda a depurar problemas de nombres de columna (ej. 'Descripcion' vs 'descripcion')
      if (inventory.length > 0 && inventory[0].Descripcion === undefined) {
         Logger.log(`ADVERTENCIA: El primer artículo del inventario no tiene la propiedad 'Descripcion'. Revisa los encabezados de la hoja. Propiedades encontradas: ${Object.keys(inventory[0]).join(', ')}`);
      }
      return inventory;
    }

    const searchTerms = query.toLowerCase().split(' ').filter(term => term.trim() !== '');
    if (searchTerms.length === 0) return [];

    return inventory.filter(item => {
      // 2. Usamos una validación más flexible.
      // Solo necesitamos que el item exista y tenga una descripción para ser buscable.
      if (!item || !item.Descripcion) {
        return false;
      }
      
      // 3. Construimos el texto de búsqueda de forma segura con template literals.
      const searchableText = `${item.Descripcion} ${item.Clave || ''}`.toLowerCase();
      
      return searchTerms.every(term => searchableText.includes(term));
    });

  } catch (e) {
    logError('DAL', 'buscarArticulosAvanzado', e.message, e.stack, query);
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
    logError('Code', 'abrirModalDeConteo', e.message, e.stack);
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
        return registrarMovimientoCaja('Ingreso', functionArgs.monto, functionArgs.concepto, userId);

      case 'registrarEgresoCaja':
        Logger.log('   - Entrando en el caso: "registrarEgresoCaja"');
        return registrarMovimientoCaja('Egreso', functionArgs.monto, functionArgs.concepto, userId);

      // Si `registrarConteo` y `generarResumenAdmin` se usaran en `ejecutarHerramienta`, también deberían ir aquí.
      // Por ahora, asumo que `registrarConteo` es llamada directamente desde el frontend del modal.
      case 'registrarConteo':
         Logger.log('   - Entrando en el caso: "registrarConteo" (Esta función típicamente se llama directo del frontend).');
         // Asume que los argumentos para registrarConteo son un array de conteos.
         // Esta parte puede requerir ajuste dependiendo de cómo se pase el payload del conteo.
         if (functionArgs.conteos && Array.isArray(functionArgs.conteos)) {
             return registrarMultiplesConteos(functionArgs.conteos, userId);
         } else {
             throw new Error('Argumentos inválidos para registrarConteo.');
         }

      case 'generarResumenAdmin':
         Logger.log('   - Entrando en el caso: "generarResumenAdmin".');
         return generarResumenAdmin();


      default:
        Logger.log(`   - ERROR: El caso para "${functionName}" no existe en el switch.`);
        throw new Error(`La lógica para llamar a la herramienta '${functionName}' no está implementada en el switch.`);
    }

  } catch (e) {
    Logger.log(`   - ❌ ERROR ATRAPADO DENTRO de ejecutarHerramienta: ${e.message}`);
    logError('Code', 'ejecutarHerramienta', e.message, e.stack, JSON.stringify({ functionName, functionArgs, userId }));
    return `Error al ejecutar la herramienta ${functionName}: ${e.message}`;
  }
}

/**
 * MODIFICADO: Adapta la definición de herramientas al formato que espera la API de OpenAI.
 * @returns {Array<object>} Un array de objetos de herramientas para OpenAI.
 */
/**
 * Obtiene las herramientas de IA desde la constante de configuración.
 * @returns {Array<object>} Un array de objetos de herramientas para OpenAI.
 */
/**
 * Obtiene las herramientas de IA desde la constante de configuración.
 * @returns {Array<object>} Un array de objetos de herramientas para OpenAI.
 */
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
      type: "function",
      function: {
        name: tool.NombreFuncion,
        description: tool.Descripcion,
        parameters: tool.SchemaParametros
      }
    };
  });

  Logger.log(`--- getAITools finalizado: Se configuraron ${tools.length} herramientas. ---`);
  return tools;
}

