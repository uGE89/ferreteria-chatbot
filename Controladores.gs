// En: Controladores.gs

// La firma de la función ahora acepta un PIN
// En: Controladores.gs

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
    const usersFromSheet = getSheetData('Usuarios');
    const userDynamicData = usersFromSheet.find(u => u.UsuarioID === userId);

    if (!userDynamicData || !userDynamicData.Nombre) {
      logError('Backend', 'cargarDatosIniciales', `Usuario ${userId} validado, pero no encontrado en la hoja 'Usuarios' o sin Nombre asignado.`);
      return { ok: false, msg: 'Error al recuperar los detalles del perfil del usuario.' };
    }
    
    // 5. Creamos el perfil final combinando los datos.
    // ======> ¡AQUÍ ESTÁ LA CORRECCIÓN DEL TYPO! <======
    const perfil = {
        ...userStaticData,
        Nombre: userDynamicData.Nombre
    };

    // 6. Eliminamos el PIN del objeto antes de enviarlo al frontend.
    delete perfil.PIN;

    // --- El resto de la función para configurar la sesión y los quick starters ---
    const rolUsuario = perfil.Rol;
    const sessionId = 'SESS-' + Date.now() + '-' + Utilities.getUuid().substring(0, 8);

    appendRowToSheet('SesionesChat', {
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
        resumenChat,
        resumenInv,
        revision
      ];
    }

    return responseData;

  } catch (e) {
    logError('Backend', 'cargarDatosIniciales', e.message, e.stack, `userId: ${userId}`);
    return { ok: false, msg: `Error interno al cargar datos iniciales: ${e.message}.` };
  }
}
