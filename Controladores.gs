// En: Controladores.gs

// La firma de la función ahora acepta un PIN
// En: Controladores.gs

/**
 * Obtiene los anuncios activos de la hoja 'Anuncios'.
 * @returns {Array<string>} Lista de anuncios con título y mensaje.
 */
function obtenerAnunciosActivos() {
  try {
    const anuncios = getSheetData(SHEET_NAMES.ANUNCIOS);
    return anuncios
      .filter(a => String(a.Activo).toUpperCase() === 'TRUE')
      .map(a => `${a.Titulo}\n${a.Mensaje}`);
  } catch (e) {
    Logging.logError('Backend', 'obtenerAnunciosActivos', e.message, e.stack);
    return [];
  }
}

/**
 * Carga los datos iniciales para el login y la interfaz del chat.
 * VERSIÓN HÍBRIDA FINAL: Valida ID y PIN contra el código, y obtiene el Nombre desde la hoja.
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

    // 4. Leemos la hoja SÓLO para obtener el Nombre.
    const usersFromSheet = getSheetData(SHEET_NAMES.USUARIOS);
    const userDynamicData = usersFromSheet.find(u => u.UsuarioID === userId);

    if (!userDynamicData || !userDynamicData.Nombre) {
      Logging.logError('Backend', 'cargarDatosIniciales', `Usuario ${userId} validado, pero no encontrado en la hoja 'Usuarios' o sin Nombre asignado.`);
      return { ok: false, msg: 'Error al recuperar los detalles del perfil del usuario.' };
    }

    // 5. Creamos el perfil final combinando los datos.
    const perfil = {
        ...userStaticData,
        Nombre: userDynamicData.Nombre
    };

    // 6. Eliminamos el PIN del objeto antes de enviarlo al frontend.
    delete perfil.PIN;

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
    const anunciosActivos = obtenerAnunciosActivos();

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
      mensajeAnuncio: [...welcomeMessage, ...anunciosActivos],
      quickStarters: quickStarters
    };

    const tz = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();
    const today = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
    const props = PropertiesService.getScriptProperties();
    const propKey = 'LAST_DAILY_START_' + perfil.UsuarioID;
    const lastStart = props.getProperty(propKey);
    if (lastStart !== today) {
      props.setProperty(propKey, today);
      const resumenChat = resumenChatUsuario(perfil.UsuarioID);
      const resumenInv = resumenConteo(perfil.UsuarioID);
      const revision = revisionMetaConteo(perfil.UsuarioID);
      responseData.mensajeAnuncio = [
        ...welcomeMessage,
        ...anunciosActivos,
        resumenChat,
        resumenInv,
        revision
      ];
    }

    return responseData;

  } catch (e) {
    Logging.logError('Backend', 'cargarDatosIniciales', e.message, e.stack, `userId: ${userId}`);
    return { ok: false, msg: `Error interno al cargar datos iniciales: ${e.message}.` };
  }
}

/**
 * Reutiliza la sesión activa si no ha expirado.
 * Se considera expirada después de doce horas sin actividad.
 * @param {string} userId - ID del usuario.
 * @param {string} sessionId - ID de la sesión.
 * @returns {object} Datos para inicializar la interfaz.
 */
function reutilizarSesionActiva(userId, sessionId) {
  try {
    const sesiones = getSheetData(SHEET_NAMES.SESIONES);
    const sesion = sesiones.find(s =>
      s.UsuarioID === userId &&
      s.SesionID === sessionId &&
      s.EstadoSesion === 'Activa'
    );
    if (!sesion) return { ok: false };

    const ultima = parseSafeDate(sesion.UltimaActividad);
    if (!ultima) return { ok: false };
    const horas = (new Date() - ultima) / (1000 * 60 * 60);
    if (horas > 12) return { ok: false };

    const usersSheet = getSheetData(SHEET_NAMES.USUARIOS);
    const dynamicData = usersSheet.find(u => u.UsuarioID === userId);
    const staticData = USUARIOS.find(u => u.UsuarioID === userId);
    if (!dynamicData || !staticData) return { ok: false };

    const perfil = { ...staticData, Nombre: dynamicData.Nombre };
    delete perfil.PIN;

    const rolUsuario = perfil.Rol;
    const quickStarters = HERRAMIENTAS_AI
      .filter(tool => tool.EsQuickStarter === true)
      .filter(tool => {
        const rolesPermitidos = Array.isArray(tool.rolesPermitidos)
          ? tool.rolesPermitidos
          : ['Todos'];
        return rolesPermitidos.includes('Todos') ||
          rolesPermitidos.includes(rolUsuario);
      })
      .map(tool => ({
        NombrePantalla: tool.NombrePantalla,
        NombreFuncion: tool.NombreFuncion
      }));

    updateRowInSheet(SHEET_NAMES.SESIONES, 'SesionID', sessionId, {
      UltimaActividad: getFormattedTimestamp()
    });

    return { ok: true, perfil: perfil, sesionId: sessionId, quickStarters: quickStarters, mensajeAnuncio: [] };
  } catch (e) {
    Logging.logError('Backend', 'reutilizarSesionActiva', e.message, e.stack, `userId: ${userId}, sessionId: ${sessionId}`);
    return { ok: false, msg: 'Error al verificar la sesión.' };
  }
}
