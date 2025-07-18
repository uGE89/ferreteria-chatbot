// =======================================================================
// =================== SUITE DE PRUEBAS DEL BACKEND ======================
// =======================================================================

/**
 * IMPORTANTE: Antes de ejecutar, cambia este ID por un ID de usuario
 * que exista en tu hoja 'Usuarios' y que esté marcado como Activo (TRUE)
 * Y que tenga el ROL DE ADMINISTRADOR para probar el panel.
 */
const TEST_ADMIN_USER_ID = 'U001'; // <--- MODIFICA ESTE VALOR para un ADMIN
const TEST_NORMAL_USER_ID = 'U003'; // <--- MODIFICA ESTE VALOR para un usuario normal si existe

// Se asumen PINs de prueba para los usuarios configurados en Configuracion.gs
const TEST_ADMIN_PIN = '1111'; // PIN para U001
const TEST_NORMAL_PIN = '3333'; // PIN para U003
const TEST_VENDEDOR_USER_ID = 'U007';
const TEST_VENDEDOR_PIN = '7777';
const TEST_BODEGUERO_USER_ID = 'U004';
const TEST_BODEGUERO_PIN = '4444';


/**
 * Función principal que ejecuta todas las pruebas del backend.
 * Para usarla: selecciónala en el menú del editor y haz clic en 'Ejecutar'.
 * Luego, revisa el 'Registro de ejecuciones'.
 */
function testSuiteBackend() {
  Logger.log('--- INICIANDO SUITE DE PRUEBAS DEL BACKEND ---');
  Logger.log(`Fecha y Hora: ${new Date().toLocaleString('es-NI', { timeZone: 'America/Managua' })}`);
  Logger.log(`Probando con Admin ID: ${TEST_ADMIN_USER_ID}`);
  Logger.log(`Probando con Usuario Normal ID: ${TEST_NORMAL_USER_ID}`);
  Logger.log('==============================================\n');

  try {
    testConfiguracion();
    testHerramientasAI();
    testLoginAndChatLogic();
    testAdminPanelLogic();
    testRegistrarConteoAlias();
    testRegistrarConteoCaja();
    testResumenChatUsuario();
    testSimulacionLlamadaAI();
    testRegistrarArqueoCaja();
    testGenerarResumenAdmin();
    testEnviarMensajeAdministrador();
    testRevisionMetaConteo();
    testResumenConteo();
    testBuscarArticulo();
    testBuscarArticulosAvanzado();
    testAbrirModalDeConteo();
    testSumarPuntos();
    testAsignarInsignia();
    testObtenerRankingPuntos();
    testLimpiarSesionesInactivas();
    testMensajesPrimerInicio();

    Logger.log('\n==============================================');
    Logger.log('✅ SUITE DE PRUEBAS COMPLETADA SIN ERRORES CRÍTICOS.');
    Logger.log('==============================================');

  } catch (e) {
    Logger.log(`\n❌ ERROR FATAL DURANTE LA SUITE DE PRUEBAS: ${e.message}`);
    Logger.log(`Stack Trace: ${e.stack}`);
  }
}

/**
 * PRUEBA 1: Carga y muestra la configuración principal de la IA.
 */
function testConfiguracion() {
  Logger.log('--- [Prueba 1: Cargando Configuración...] ---');
  try {
    // loadAIConfig(); // Esta línea ha sido eliminada
    Logger.log('✅ Configuración se asume cargada al inicio del script o por constantes.');
    // Por seguridad, no mostramos la API Key completa
    Logger.log(`   - API Key: ...${OPENAI_API_KEY.slice(-4)}`);
    Logger.log(`   - Modelo Default: ${MODELO_DEFAULT}`);
    Logger.log(`   - Prompt del Sistema (primeros 50 caracteres): "${PROMPT_SISTEMA_GENERAL.substring(0, 50)}..."`);
    Logger.log(`   - ID Hoja Puente: ${ID_HOJA_PUENTE}`);
    Logger.log(`   - Nombres de Hojas Centralizados: ${JSON.stringify(SHEET_NAMES)}`);
  } catch (e) {
    Logger.log(`❌ ERROR en testConfiguracion: ${e.message}`);
  }
  Logger.log('--- [Fin Prueba 1] ---\n');
}

/**
 * PRUEBA 2: Carga y analiza las herramientas de la IA desde la hoja.
 */
function testHerramientasAI() {
  Logger.log('--- [Prueba 2: Cargando Herramientas AI...] ---');
  try {
    const tools = getAITools();
    if (tools.length > 0) {
      Logger.log(`✅ Se encontraron ${tools.length} herramientas.`);
      Logger.log(`   - Nombres: ${tools.map(t => t.function.name).join(', ')}`);
      Logger.log('   - Estructura de la primera herramienta (ejemplo):');
      Logger.log(JSON.stringify(tools[0], null, 2));
    } else {
      Logger.log(`⚠️ ADVERTENCIA: No se encontraron herramientas en la hoja "${SHEET_NAMES.HERRAMIENTAS_AI}".`);
    }
  } catch (e) {
    Logger.log(`❌ ERROR en testHerramientasAI: ${e.message}`);
  }
  Logger.log('--- [Fin Prueba 2] ---\n');
}

/**
 * PRUEBA 3: Simula la lógica de login y funciones básicas de chat/herramientas.
 */
function testLoginAndChatLogic() {
  Logger.log('--- [Prueba 3: Lógica de Login y Chat (Usuario Normal)] ---');
  const TEST_SESSION_ID = `SESS-CHAT-${Date.now()}`;

  // Prueba de cargarDatosIniciales (para un usuario normal)
  try {
    Logger.log('   - Probando: cargarDatosIniciales() con usuario normal.');
    const datosIniciales = cargarDatosIniciales(TEST_NORMAL_USER_ID, TEST_NORMAL_PIN); // Ahora requiere PIN
    if (datosIniciales.ok) {
      Logger.log(`     ✅ Éxito. Usuario normal encontrado: ${datosIniciales.perfil.Nombre}. Quick Starters: ${datosIniciales.quickStarters.length}`);
    } else {
      Logger.log(`     ❌ Falló. Mensaje: ${datosIniciales.msg}`);
    }
  } catch (e) {
    Logger.log(`     ❌ ERROR en cargarDatosIniciales (normal): ${e.message}`);
  }

  // Prueba de registrarMovimientoCaja
  try {
    Logger.log('   - Probando: registrarMovimientoCaja() (ejecución directa).');
    const resultadoMovimiento = registrarMovimientoCaja('Ingreso', 100.50, 'Ingreso de prueba desde test suite', 'Cliente Test', TEST_NORMAL_USER_ID);
    Logger.log(`     ✅ Éxito. Respuesta: "${resultadoMovimiento}"`);
  } catch (e) {
    Logger.log(`     ❌ ERROR en registrarMovimientoCaja: ${e.message}`);
  }

  // Prueba de ejecutarHerramienta (simulando una llamada de la IA)
  try {
    Logger.log('   - Probando: ejecutarHerramienta() para "registrarProblema" (simulado).');
    const mockArgs = { asunto: "Problema de prueba", detalle: "Detalle generado por la suite de pruebas" };
    const resultadoHerramienta = ejecutarHerramienta('registrarProblema', mockArgs, TEST_NORMAL_USER_ID, TEST_SESSION_ID);
    Logger.log(`     ✅ Éxito. Respuesta: "${resultadoHerramienta}"`);
  } catch (e) {
    Logger.log(`     ❌ ERROR en ejecutarHerramienta (Problema): ${e.message}`);
  }

  try {
    Logger.log('   - Probando: ejecutarHerramienta() para "registrarIngresoCaja" (simulado).');
    const mockArgsCaja = { monto: 75.25, concepto: "Reembolso de gastos de oficina" };
    const resultadoCaja = ejecutarHerramienta('registrarIngresoCaja', mockArgsCaja, TEST_NORMAL_USER_ID, TEST_SESSION_ID);
    Logger.log(`     ✅ Éxito. Respuesta: "${resultadoCaja}"`);
  } catch (e) {
    Logger.log(`     ❌ ERROR en ejecutarHerramienta (Caja): ${e.message}`);
  }
  Logger.log('--- [Fin Prueba 3] ---\n');
}

/**
 * PRUEBA 4: Simula la lógica del Panel de Administración (solo para Admin).
 */
function testAdminPanelLogic() {
  Logger.log('--- [Prueba 4: Lógica del Panel de Administración (Usuario Admin)] ---');
  const ADMIN_SESSION_ID = `SESS-ADMIN-${Date.now()}`; // Sesión ficticia para admin

  // 4.1: Prueba de cargarDatosIniciales (para un administrador)
  try {
    Logger.log('   - Probando: cargarDatosIniciales() con usuario ADMIN.');
    const datosInicialesAdmin = cargarDatosIniciales(TEST_ADMIN_USER_ID, TEST_ADMIN_PIN); // Ahora requiere PIN
    if (datosInicialesAdmin.ok) {
      Logger.log(`     ✅ Éxito. Usuario ADMIN encontrado: ${datosInicialesAdmin.perfil.Nombre}.`);
    } else {
      Logger.log(`     ❌ Falló. Mensaje: ${datosInicialesAdmin.msg}`);
    }
  } catch (e) {
    Logger.log(`     ❌ ERROR en cargarDatosIniciales (Admin): ${e.message}`);
  }

  // 4.2: Prueba de obtenerPanelAdminData_SoloMensajes
  try {
    Logger.log('   - Probando: obtenerPanelAdminData_SoloMensajes()...');
    const mensajesAdminData = obtenerPanelAdminData_SoloMensajes();
    if (mensajesAdminData.length > 0) {
      Logger.log(`     ✅ Éxito. Se cargaron ${mensajesAdminData.length} ítems de mensajes para el panel.`);
      Logger.log(`     Primer mensaje: ${JSON.stringify(mensajesAdminData[0], null, 2)}`);
    } else {
      Logger.log('     ⚠️ No se encontraron mensajes para el panel (podría ser normal).');
    }
  } catch (e) {
    Logger.log(`     ❌ ERROR en obtenerPanelAdminData_SoloMensajes: ${e.message}`);
  }

  // 4.3: Prueba de obtenerMovimientosDeCaja
  try {
    Logger.log('   - Probando: obtenerMovimientosDeCaja()...');
    const cajaData = obtenerMovimientosDeCaja();
    if (cajaData.length > 0) {
      Logger.log(`     ✅ Éxito. Se cargaron ${cajaData.length} ítems de caja para el panel.`);
      Logger.log(`     Primer movimiento de caja: ${JSON.stringify(cajaData[0], null, 2)}`);
    } else {
      Logger.log('     ⚠️ No se encontraron movimientos de caja (podría ser normal).');
    }
  } catch (e) {
    Logger.log(`     ❌ ERROR en obtenerMovimientosDeCaja: ${e.message}`);
  }

  // 4.4: Prueba de actualizarEstadoItemAdmin (Esta función no fue provista para ser modificada)
  // Como no se proporcionó `actualizarEstadoItemAdmin`, la prueba se comenta o adapta
  // si es que esta función realmente existe en tu `Code.gs` fuera de lo compartido.
  /*
  try {
    Logger.log('   - Probando: actualizarEstadoItemAdmin()...');
    const allMessages = getSheetData(SHEET_NAMES.MENSAJES);
    const testMessage = allMessages.find(m => m.UsuarioRemitenteID === TEST_NORMAL_USER_ID && m.Estado === 'Pendiente');

    if (testMessage) {
      Logger.log(`     Encontrado mensaje para actualizar: ${testMessage.ID_Mensaje}`);
      const resultadoUpdate = actualizarEstadoItemAdmin(testMessage.ID_Mensaje, 'Revisado');
      Logger.log(`     ✅ Éxito. Respuesta: "${resultadoUpdate}"`);
    } else {
      Logger.log('     ⚠️ No se encontró ningún mensaje pendiente para actualizar en la prueba. Saltando.');
    }
  } catch (e) {
    Logger.log(`     ❌ ERROR en actualizarEstadoItemAdmin: ${e.message}`);
  }
  */

  // 4.5: (Opcional) Probar registrarMultiplesConteos
  try {
    Logger.log('   - Probando: registrarMultiplesConteos()...');
    const conteosDePrueba = [
      {
        clave: 'P001',
        descripcion: 'Producto A',
        stockSistema: 10,
        stockFisico: 9,
        cpi: 0,
        vpe: 0,
        razon: 'Ajuste de prueba',
        observacion: 'Faltante en prueba'
      },
      {
        clave: 'P002',
        descripcion: 'Producto B',
        stockSistema: 5,
        stockFisico: 5,
        cpi: 0,
        vpe: 0,
        razon: '',
        observacion: ''
      }
    ];
    const resultadoConteos = registrarMultiplesConteos(conteosDePrueba, TEST_ADMIN_USER_ID);
    Logger.log(`     ✅ Éxito. Respuesta: "${resultadoConteos}"`);
  } catch (e) {
    Logger.log(`     ❌ ERROR en registrarMultiplesConteos: ${e.message}`);
  }

  Logger.log('--- [Fin Prueba 4] ---\n');
}

/**
 * PRUEBA 5: Simula la creación del payload para la API de OpenAI (sin enviarlo).
 */
function testSimulacionLlamadaAI() {
  Logger.log('--- [Prueba 5: Simulación de Llamada a OpenAI...] ---');
  try {
    const historialSimulado = [
      { role: 'system', content: PROMPT_SISTEMA_GENERAL },
      { role: 'user', content: 'Quiero registrar un gasto de 50 pesos por un café' }
    ];
    const herramientas = getAITools();

    const payloadSimulado = {
      model: MODELO_DEFAULT,
      messages: historialSimulado,
      tools: herramientas,
      tool_choice: "auto"
    };

    Logger.log('✅ Payload para OpenAI generado correctamente.');
    Logger.log('   - (Este es el objeto que se enviaría a la IA):');
    Logger.log(JSON.stringify(payloadSimulado, null, 2));

  } catch (e) {
    Logger.log(`❌ ERROR en testSimulacionLlamadaAI: ${e.message}`);
  }
  Logger.log('--- [Fin Prueba 5] ---\n');
}

/**
 * PRUEBA 6: Verifica registrarConteo con alias y cálculo de diferencia.
 */
function testRegistrarConteoAlias() {
  Logger.log('--- [Prueba 6: registrarConteo con alias y diferencia] ---');
  try {
    Logger.log('   - Probando: registrarConteo() con descripción "Cemento gris"...');
    const respuesta = registrarConteo(TEST_ADMIN_USER_ID, 'Cemento gris', 20, 18, 1, 0, 'Prueba alias', 0, 0);
    Logger.log(`     Respuesta: ${respuesta}`);
    const registros = getSheetData(SHEET_NAMES.CONTEOS);
    const ultimo = registros[registros.length - 1];
    Logger.log(`     Último conteo registrado: ${JSON.stringify(ultimo, null, 2)}`);
    const aliasOk = ultimo.ClaveProducto === "'01";
    const diffEsperada = 18 - 20 - 1 - 0;
    const diffOk = parseFloat(ultimo.Diferencia) === diffEsperada;
    Logger.log(aliasOk ? '     ✅ Alias manejado correctamente.' : `     ❌ Alias incorrecto: ${ultimo.ClaveProducto}`);
    Logger.log(diffOk ? '     ✅ Diferencia calculada correctamente.' : `     ❌ Diferencia incorrecta: ${ultimo.Diferencia}`);
  } catch (e) {
    Logger.log(`     ❌ ERROR en testRegistrarConteoAlias: ${e.message}`);
  }
  Logger.log('--- [Fin Prueba 6] ---\n');
}

/**
 * PRUEBA 7: Verifica registrarConteo para caja chica con pagos pendientes.
 */
function testRegistrarConteoCaja() {
  Logger.log('--- [Prueba 7: registrarConteo para caja] ---');
  try {
    const respuesta = registrarConteo(TEST_ADMIN_USER_ID, 'caja chica', 500, 480, 0, 0, 'test caja', 10, 5);
    Logger.log(`     Respuesta: ${respuesta}`);
    const registros = getSheetData(SHEET_NAMES.CONTEOS);
    const ultimo = registros[registros.length - 1];
    const aliasOk = ultimo.ClaveProducto === "'CCH";
    const diffEsperada = 480 - 500 - 0 - 0 - 10 - 5;
    const diffOk = parseFloat(ultimo.Diferencia) === diffEsperada;
    Logger.log(aliasOk ? '     ✅ Alias caja correcto.' : `     ❌ Alias incorrecto: ${ultimo.ClaveProducto}`);
    Logger.log(diffOk ? '     ✅ Diferencia caja correcta.' : `     ❌ Diferencia incorrecta: ${ultimo.Diferencia}`);
  } catch (e) {
    Logger.log(`     ❌ ERROR en testRegistrarConteoCaja: ${e.message}`);
  }
  Logger.log('--- [Fin Prueba 7] ---\n');
}

/**
 * PRUEBA 8: Invoca resumenChatUsuario y muestra el resumen.
 */
function testResumenChatUsuario() {
  Logger.log('--- [Prueba 8: resumenChatUsuario] ---');
  try {
    const resumen = resumenChatUsuario(TEST_NORMAL_USER_ID);
    Logger.log(`     Resumen obtenido: ${resumen}`);
  } catch (e) {
    Logger.log(`     ❌ ERROR en testResumenChatUsuario: ${e.message}`);
  }
  Logger.log('--- [Fin Prueba 8] ---\n');
}

/**
 * PRUEBA 9: Valida registrarArqueoCaja.
 */
function testRegistrarArqueoCaja() {
  Logger.log('--- [Prueba 9: registrarArqueoCaja] ---');
  try {
    const resp = registrarArqueoCaja(TEST_ADMIN_USER_ID, 1000, 995, 3, 2, 'Prueba');
    Logger.log(`     Respuesta: ${resp}`);
  } catch (e) {
    Logger.log(`     ❌ ERROR en testRegistrarArqueoCaja: ${e.message}`);
  }
  Logger.log('--- [Fin Prueba 9] ---\n');
}

/**
 * PRUEBA 10: Genera resumen para administrador.
 */
function testGenerarResumenAdmin() {
  Logger.log('--- [Prueba 10: generarResumenAdmin] ---');
  try {
    const texto = generarResumenAdmin(3);
    Logger.log(texto);
  } catch (e) {
    Logger.log(`     ❌ ERROR en testGenerarResumenAdmin: ${e.message}`);
  }
  Logger.log('--- [Fin Prueba 10] ---\n');
}

/**
 * PRUEBA 11: Envía un mensaje desde el administrador.
 */
function testEnviarMensajeAdministrador() {
  Logger.log('--- [Prueba 11: enviarMensajeAdministrador] ---');
  try {
    const mensajes = getSheetData(SHEET_NAMES.MENSAJES);
    const pendiente = mensajes.find(m => m.Estado === 'Pendiente');
    if (pendiente) {
      const resp = enviarMensajeAdministrador(pendiente.SesionID, pendiente.UsuarioRemitenteID, 'Respuesta de prueba', TEST_ADMIN_USER_ID);
      Logger.log(`     Respuesta: ${resp}`);
    } else {
      Logger.log('     ⚠️ No se encontró mensaje pendiente para responder.');
    }
  } catch (e) {
    Logger.log(`     ❌ ERROR en testEnviarMensajeAdministrador: ${e.message}`);
  }
  Logger.log('--- [Fin Prueba 11] ---\n');
}

/**
 * PRUEBA 12: Revisa la meta diaria de conteos.
 */
function testRevisionMetaConteo() {
  Logger.log('--- [Prueba 12: revisionMetaConteo] ---');
  try {
    const resultado = revisionMetaConteo(TEST_ADMIN_USER_ID);
    Logger.log(resultado);
  } catch (e) {
    Logger.log(`     ❌ ERROR en testRevisionMetaConteo: ${e.message}`);
  }
  Logger.log('--- [Fin Prueba 12] ---\n');
}

/**
 * PRUEBA 13: Obtiene el resumen de conteo.
 */
function testResumenConteo() {
  Logger.log('--- [Prueba 13: resumenConteo] ---');
  try {
    const texto = resumenConteo(TEST_ADMIN_USER_ID);
    Logger.log(texto);
  } catch (e) {
    Logger.log(`     ❌ ERROR en testResumenConteo: ${e.message}`);
  }
  Logger.log('--- [Fin Prueba 13] ---\n');
}

/**
 * PRUEBA 14: Busca un artículo simple.
 */
function testBuscarArticulo() {
  Logger.log('--- [Prueba 14: buscarArticulo] ---');
  try {
    const res = buscarArticulo('cemento');
    Logger.log(`     Resultados: ${JSON.stringify(res)}`);
  } catch (e) {
    Logger.log(`     ❌ ERROR en testBuscarArticulo: ${e.message}`);
  }
  Logger.log('--- [Fin Prueba 14] ---\n');
}

/**
 * PRUEBA 15: Busca artículos avanzados.
 */
function testBuscarArticulosAvanzado() {
  Logger.log('--- [Prueba 15: buscarArticulosAvanzado] ---');
  try {
    const res = buscarArticulosAvanzado('cemento');
    Logger.log(`     Resultado ejemplo: ${JSON.stringify(res[0], null, 2)}`);
  } catch (e) {
    Logger.log(`     ❌ ERROR en testBuscarArticulosAvanzado: ${e.message}`);
  }
  Logger.log('--- [Fin Prueba 15] ---\n');
}

/**
 * PRUEBA 16: Abre el modal de conteo.
 */
function testAbrirModalDeConteo() {
  Logger.log('--- [Prueba 16: abrirModalDeConteo] ---');
  try {
    const html = abrirModalDeConteo();
    Logger.log(`     HTML: ${html.slice(0, 30)}...`);
  } catch (e) {
    Logger.log(`     ❌ ERROR en testAbrirModalDeConteo: ${e.message}`);
  }
  Logger.log('--- [Fin Prueba 16] ---\n');
}

/**
 * PRUEBA 17: Suma puntos a un usuario.
 */
function testSumarPuntos() {
  Logger.log('--- [Prueba 17: sumarPuntos] ---');
  try {
    const antes = obtenerDetallesDeUsuario(TEST_NORMAL_USER_ID)?.Puntos;
    sumarPuntos(TEST_NORMAL_USER_ID, 5);
    const despues = obtenerDetallesDeUsuario(TEST_NORMAL_USER_ID)?.Puntos;
    Logger.log(`     Puntos antes: ${antes}, después: ${despues}`);
  } catch (e) {
    Logger.log(`     ❌ ERROR en testSumarPuntos: ${e.message}`);
  }
  Logger.log('--- [Fin Prueba 17] ---\n');
}

/**
 * PRUEBA 18: Asigna una insignia de prueba.
 */
function testAsignarInsignia() {
  Logger.log('--- [Prueba 18: asignarInsignia] ---');
  try {
    const antes = obtenerDetallesDeUsuario(TEST_NORMAL_USER_ID)?.Insignias || '';
    asignarInsignia(TEST_NORMAL_USER_ID, 'Prueba');
    const despues = obtenerDetallesDeUsuario(TEST_NORMAL_USER_ID)?.Insignias || '';
    Logger.log(`     Insignias antes: ${antes} | después: ${despues}`);
  } catch (e) {
    Logger.log(`     ❌ ERROR en testAsignarInsignia: ${e.message}`);
  }
  Logger.log('--- [Fin Prueba 18] ---\n');
}

/**
 * PRUEBA 19: Obtiene el ranking de puntos.
 */
function testObtenerRankingPuntos() {
  Logger.log('--- [Prueba 19: obtenerRankingPuntos] ---');
  try {
    const ranking = obtenerRankingPuntos();
    Logger.log(`     Top 3: ${JSON.stringify(ranking.slice(0, 3), null, 2)}`);
  } catch (e) {
    Logger.log(`     ❌ ERROR en testObtenerRankingPuntos: ${e.message}`);
  }
  Logger.log('--- [Fin Prueba 19] ---\n');
}

/**
 * PRUEBA 20: Ejecuta limpiarSesionesInactivas.
 */
function testLimpiarSesionesInactivas() {
  Logger.log('--- [Prueba 20: limpiarSesionesInactivas] ---');
  try {
    limpiarSesionesInactivas();
    Logger.log('     ✅ Ejecución completada sin errores.');
  } catch (e) {
    Logger.log(`     ❌ ERROR en testLimpiarSesionesInactivas: ${e.message}`);
  }
  Logger.log('--- [Fin Prueba 20] ---\n');
}

/**
 * PRUEBA 21: Verifica mensajes de bienvenida y anuncios en el primer inicio.
 */
function testMensajesPrimerInicio() {
  Logger.log('--- [Prueba 21: mensajes de primer inicio de sesión] ---');
  const usuarios = [
    { id: TEST_ADMIN_USER_ID, pin: TEST_ADMIN_PIN, rol: 'Admin' },
    { id: TEST_VENDEDOR_USER_ID, pin: TEST_VENDEDOR_PIN, rol: 'Vendedor' },
    { id: TEST_BODEGUERO_USER_ID, pin: TEST_BODEGUERO_PIN, rol: 'Bodeguero' }
  ];
  usuarios.forEach(u => {
    try {
      Logger.log(`   - Probando con ${u.rol} (${u.id})`);
      PropertiesService.getScriptProperties()
        .deleteProperty('LAST_DAILY_START_' + u.id);
      const datos = cargarDatosIniciales(u.id, u.pin);
      if (datos.ok) {
        const mensajes = datos.mensajeAnuncio || [];
        Logger.log(`     Mensajes recibidos: ${mensajes.length}`);
        const tieneSaludo = mensajes.some(m => m.includes('¡Hola!'));
        const tienePersonalizado =
          mensajes.some(m => m.includes('bienvenido seas el día de hoy'));
        Logger.log(tieneSaludo ?
          '     ✅ Saludo presente.' :
          '     ❌ Falta saludo.');
        Logger.log(tienePersonalizado ?
          '     ✅ Mensaje personalizado presente.' :
          '     ❌ Falta mensaje personalizado.');
      } else {
        Logger.log(`     ❌ Falló: ${datos.msg}`);
      }
    } catch (e) {
      Logger.log(`     ❌ ERROR con usuario ${u.id}: ${e.message}`);
    }
  });
  Logger.log('--- [Fin Prueba 21] ---\n');
}

/**
 * PRUEBA 6 (VERSIÓN MEJORADA): Verifica que la función de caché para artículos funcione.
 * Esta prueba no depende de los datos existentes en la hoja.
 */
// Agrega esta función auxiliar al final de tu archivo Code.gs,
// cerca de las demás funciones auxiliares o dentro de la suite de pruebas si lo prefieres.
// Agrega esta función auxiliar al final de tu archivo Code.gs,
// cerca de las demás funciones auxiliares o dentro de la suite de pruebas si lo prefieres.
function clearCacheForSheet(sheetName) {
  const cache = CacheService.getScriptCache();
  const cachedKey = `SHEET_DATA_${sheetName}`;
  cache.remove(cachedKey);
  Logger.log(`   - Caché para '${sheetName}' limpiado.`);
}
