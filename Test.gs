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
    testSimulacionLlamadaAI();

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
    const resultadoMovimiento = registrarMovimientoCaja('Ingreso', 100.50, 'Ingreso de prueba desde test suite', TEST_NORMAL_USER_ID);
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
    const respuesta = registrarConteo('Cemento gris', 20, 18, 1, 0, 'Prueba alias');
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


