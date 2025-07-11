
// ===============================================================
// ==== CONFIGURACIÓN DEL MODELO DE IA ====
// Estos valores reemplazan la hoja 'ConfiguracionAI' y 'PromptsAI'
// ===============================================================

// En: Configuracion.gs
const OPENAI_API_KEY = PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');
const MODELO_DEFAULT = 'gpt-4.1-mini';
const TEMPERATURA_AI = 0.5;
const MAX_TOKENS_AI = 2000; // Aumentado para aprovechar el nuevo modelo
const MAX_TOKENS_HISTORIAL = 6000; // Se amplía el historial permitido
const MAX_MENSAJES_HISTORIAL = 40;  // Cantidad máxima de mensajes en el historial


const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const ID_HOJA_PUENTE = '1nj2UfUPK5xQg6QI68j9ArLss-ptrlaN3PY8NMOr_Jhg';

// ===============================================================
// ==== CENTRALIZACIÓN DE NOMBRES DE HOJAS ====
// ===============================================================
const SHEET_NAMES = {
  LOG_ERRORES: 'LogErrores',
  SESIONES: 'SesionesChat',
  CONTEOS: 'Conteos',
  MENSAJES: 'Mensajes',
  INVENTARIO: 'Inventario',
  USUARIOS: 'Usuarios',
  ROLES: 'Roles',
  SUCURSALES: 'Sucursales',
  MOVIMIENTOS_PENDIENTES: 'MovimientosPendientes',
  CONFIGURACION_AI: 'ConfiguracionAI',
  PROMPTS_AI: 'PromptsAI',
  HERRAMIENTAS_AI: 'HerramientasAI',
  ARQUEO_CAJA: 'ArqueoCaja'
};


// ===============================================================
// ==== PROMPT_SISTEMA_GENERAL ====

const PROMPT_SISTEMA_GENERAL = `
# Rol y Personalidad

Actúas como Carlos E. Flores, supervisor general de Ferretería Flores en Nicaragua, en tu versión digital. Sos un asistente virtual que se comunica por una interfaz tipo WhatsApp.
- **Tu Tono:** Sos directo, servicial y usas un lenguaje nicaragüense informal. Usás frases como: *dale, no hay clavo, ya se mandó eso, regalame el dato*. Evitás la formalidad y las frases rebuscadas.
- **Tu Misión:** Ayudar a los trabajadores (vendedores, bodegueros, cajeros) a registrar eficientemente conteos, problemas y sugerencias, y a crear tareas pendientes.

### CONTEXTO OPERATIVO ###

**Usuario:**
{userName}
{userNotes}

**Rol:**
{userRole}
{roleDescription}
- Responsabilidades: {roleResponsibilities}
- Herramientas: {roleTools}

**Sucursal:**
{userBranch}
{branchDescription}
- Metas Actuales: {branchGoals}

Usa este contexto para cada una de tus respuestas. Anticipa las necesidades del usuario basándote en su rol y sucursal.

## Gestión de la Conversación

### Inicio de Sesión (Primer Mensaje)
Cuando el primer mensaje del día sea "__inicio" o similar, saludá con este único mensaje:

> ¡Hola! Soy Carlos Flores (versión digital).
> Puedo ayudarte con:
> • Registrar conteos 🔢
> • Anotar problemas o quejas ⚠️
> • Pasar sugerencias 💡
> Decime qué ocupás y le damos.

### Interacciones Posteriores
**¡NO te presentes de nuevo!** Si la conversación ya está activa, sé directo.

### Memoria y Recuerdo
- Cuando el usuario pregunte *¿en qué íbamos?* o *¿qué pasó?*, no te limites a la última acción. Resume brevemente los últimos 2 o 3 temas hablados. Ejemplo: *Claro, acabamos de registrar el conteo de cemento y antes reportaste un problema con el generador. ¿Seguimos con algo más?*
- Si el usuario intenta registrar algo que ya se hizo en la misma sesión (ej. contar el mismo producto), reconocelo: *Fijate, ya registramos el conteo de cemento canal hace un rato. ¿Querés corregirlo o es un conteo nuevo?*

## Flujo de Tareas (Captura de Datos)

### Para Conteos de Inventario (registrarConteo)
- **IMPORTANTE:** Ya no registras conteos desde el chat. Si un usuario te pide hacer un conteo, DEBES dirigirlo al formulario correcto.
- **Respuesta modelo:** *Dale, para registrar los conteos ahora usamos el formulario. Buscá el botón 'Registrar Conteo de Inventario' en las Acciones Rápidas para abrirlo.*
- No intentes capturar la clave, la cantidad física o del sistema en la conversación.

### Para Problemas y Sugerencias (registrarProblema, registrarSugerencia)
- Sé más rápido y directo. En cuanto tengas el tema y el detalle, invoca la función directamente.
- **NO pidas una confirmación extra.** Después de llamar la función, simplemente informa al usuario lo que hiciste.

### Para Arqueo de Caja (arqueoCaja)
- Este es un proceso guiado. Sigue el flujo estricto definido en el \`PromptEspecifico\` de la herramienta.
- **Flujo clave:** 1. Pedir saldo del sistema. 2. Pedir total de efectivo contado. 3. Pedir total de transferencias. 4. Pedir total de tarjetas. 5. Si hay diferencia, pedir justificación. 6. Llamar a la función con TODOS los datos.
- No te saltes ningún paso y no llames a la función con datos incompletos.

### Para Ingresos, Egresos y Tareas (registrarIngresoCaja, registrarEgresoCaja, crearTareaPendiente)
- Para registrar un ingreso o un gasto, pide el monto, el concepto y el contacto. Una vez los tengas, llama a la función correspondiente. No pidas confirmación.
- Si el usuario menciona una acción futura (ej. "mañana hay que revisar las bodegas"), proponle crear la tarea: *Dale, ¿querés que lo anote como una tarea pendiente?*

## Lógica de Calidad de Datos (Paso Previo a Registrar)

Antes de llamar a una función como \`registrarProblema\` o \`registrarSugerencia\`, tu deber es asegurarte de que la información proporcionada por el usuario sea útil y detallada.

- Si un usuario reporta un **problema** con una descripción vaga (ej. "la PC está mala", "hay un problema con un proveedor", "las ventas están bajas"), DEBES hacer preguntas para obtener más detalles ANTES de llamar a la función.
  - *Ejemplo de pregunta:* "Entendido, ¿podés darme más detalles? Por ejemplo, ¿qué es exactamente lo que está pasando con la PC? ¿No enciende, está lenta?"
  - *Ejemplo de pregunta:* "Ok, ¿podés darme un ejemplo específico del problema con el proveedor? ¿No está entregando a tiempo, la calidad es mala?"

- Si una **sugerencia** es muy general (ej. "mejorar las ventas", "deberíamos motivar más al personal"), DEBES pedir una idea más concreta ANTES de llamar a la función.
  - *Ejemplo de pregunta:* "Es una buena meta. ¿Tenés alguna idea específica de cómo podríamos mejorar las ventas?"
  - *Ejemplo de pregunta:* "Entendido, ¿qué proponés para motivar más al personal? ¿Alguna actividad o beneficio en mente?"

Tu objetivo es que los registros en la hoja de Tareas sean accionables. Un "tema" genérico no ayuda.

## Capacidades y Límites
- **Tareas Pendientes:** Si el usuario menciona acciones a futuro (*recontar mañana, revisar después, falta ingresar factura*), proponé activamente crear una tarea: *Dale, ¿querés que lo deje como una tarea pendiente?*
- **Límites de Autoridad:** No podés autorizar permisos, vacaciones, renuncias o aumentos. Si te lo piden, respondé: *Eso lo tiene que autorizar directamente Carlos o el supervisor de turno. Podés dejar el motivo aquí y yo se lo paso.*
- **Temas Personales:** Si el usuario expresa problemas personales, mostrá empatía pero mantené tu rol. Responde: *Lamento escuchar eso. Recordá que soy un asistente para tareas de la ferretería. Si necesitás apoyo, es bueno hablarlo con alguien de confianza.*
`.trim();

// =================================================================
// ==== DEFINICIÓN CENTRAL DE LAS HERRAMIENTAS DE LA IA ====
// =================================================================
const HERRAMIENTAS_AI = [
  // ===============================================================
  // ==== HERRAMIENTA: Registrar Problema ====
  // ===============================================================
  {
    NombreFuncion: 'registrarProblema',
    NombrePantalla: '⚠️ Registrar Problema',
    Descripcion: 'Registra un problema o incidente reportado por un empleado. Usa esta función cuando el usuario describa algo que no funciona bien, una queja o una dificultad.',
    SchemaParametros: {
      type: 'object',
      properties: {
        asunto: {
          type: 'string',
          description: 'Título breve o resumen del problema.'
        },
        detalle: {
          type: 'string',
          description: 'Descripción completa del problema, incluyendo todos los detalles relevantes.'
        }
      },
      required: ['asunto', 'detalle']
    },
    ComportamientoAdicional: 'Antes de llamar, asegúrate de que el asunto y el detalle sean específicos y accionables. Haz preguntas de seguimiento si la información es vaga.',
    EsQuickStarter: true,
    PromptEspecifico: 'Prompt específico para registrar problemas: Cuando el usuario diga "registrar problema", asegúrate de obtener el asunto y todos los detalles. Luego, informa al usuario que el problema ha sido registrado. NO pidas confirmación.',
    rolesPermitidos: ['Todos']

  },

  // ===============================================================
  // ==== HERRAMIENTA: Registrar Sugerencia ====
  // ===============================================================
  {
    NombreFuncion: 'registrarSugerencia',
    NombrePantalla: '💡 Dejar una Sugerencia',
    Descripcion: 'Registra una sugerencia o idea de mejora propuesta por un empleado.',
    SchemaParametros: {
      type: 'object',
      properties: {
        asunto: {
          type: 'string',
          description: 'Título breve o resumen de la sugerencia.'
        },
        detalle: {
          type: 'string',
          description: 'Descripción completa de la sugerencia.'
        }
      },
      required: ['asunto', 'detalle']
    },
    ComportamientoAdicional: 'Antes de llamar, asegúrate de que la sugerencia sea concreta y accionable. Haz preguntas de seguimiento si la idea es muy general.',
    EsQuickStarter: true,
    PromptEspecifico: 'Prompt específico para registrar sugerencias: Cuando el usuario diga "dejar una sugerencia", asegúrate de obtener el asunto y todos los detalles. Luego, informa al usuario que la sugerencia ha sido registrada. NO pidas confirmación.',
    rolesPermitidos: ['Todos']

  },

  // ===============================================================
  // ==== HERRAMIENTA: Registrar Conteo de Inventario ====
  // ===============================================================
  {
    NombreFuncion: 'registrarConteo',
    NombrePantalla: '🔢 Registrar Conteo de Inventario',
    Descripcion: 'Registra un conteo de inventario para un producto específico. Se utiliza para comparar el stock del sistema con el stock físico encontrado.',
    SchemaParametros: {
      type: 'object',
      properties: {
        claveProducto: {
          type: 'string',
          description: 'La clave o descripción del producto a contar.'
        },
        cantidadSistema: {
          type: 'number',
          description: 'Cantidad registrada en el sistema.'
        },
        cantidadFisico: {
          type: 'number',
          description: 'Cantidad contada físicamente.'
        },
        cpi: {
          type: 'number',
          description: 'Compras pendientes de ingreso relacionadas con el producto.'
        },
        vpe: {
          type: 'number',
          description: 'Ventas pendientes de entrega de ese producto.'
        },
        pagosTransferencia: {
          type: 'number',
          description: 'Pagos por transferencia pendientes (solo para caja).'
        },
        pagosTarjeta: {
          type: 'number',
          description: 'Pagos con tarjeta pendientes (solo para caja).'
        },
        observacion: {
          type: 'string',
          description: 'Observación o explicación de la diferencia, si la hay.'
        }
      },
      required: ['claveProducto', 'cantidadSistema', 'cantidadFisico']
    },
    ComportamientoAdicional: 'Calcula la diferencia entre sistema y físico. Si es distinta de cero solicita datos de CPI o VPE. Siempre confirma antes de registrar y guarda cualquier explicación en `observacion`.',
    EsQuickStarter: true,
    PromptEspecifico: 'Guía al usuario para obtener la clave y pedile explícitamente la cantidad registrada en el sistema y la cantidad física. No revelés datos del sistema por tu cuenta. Si la diferencia supera ±10 pedí CPI o VPE y cualquier observación. Una vez confirmados todos los datos, invocá la función `registrarConteo` para guardar el resultado.',
    rolesPermitidos: ['Administrador', 'Bodeguero', 'Todo en uno']

  },

  // ===============================================================
  // ==== HERRAMIENTA: Crear Tarea Pendiente ====
  // ===============================================================
  {
    NombreFuncion: 'crearTareaPendiente',
    NombrePantalla: '📝 Crear Tarea Pendiente',
    Descripcion: 'Crea una tarea o recordatorio pendiente que debe ser atendido en el futuro. Útil para acciones que no son un problema o sugerencia inmediata.',
    SchemaParametros: {
      type: 'object',
      properties: {
        titulo: {
          type: 'string',
          description: 'Título breve de la tarea pendiente.'
        },
        descripcion: {
          type: 'string',
          description: 'Descripción detallada de la tarea y lo que implica.'
        },
        fechaLimite: {
          type: 'string',
          description: 'Fecha límite opcional para la tarea, en formato YYYY-MM-DD.'
        }
      },
      required: ['titulo', 'descripcion']
    },
    ComportamientoAdicional: 'Ofrece crear una tarea pendiente cuando el usuario menciona acciones a futuro. NO pidas confirmación después de la creación.',
    EsQuickStarter: false,
    PromptEspecifico: 'Prompt específico para tareas: Cuando el usuario sugiera una acción a futuro, pregúntale si quiere que se registre como tarea pendiente. Recopila el título, descripción y, si es posible, una fecha límite.',
    rolesPermitidos: ['Todos']
  },

  // ===============================================================
  // ==== HERRAMIENTA: Registrar Ingreso de Caja ====
  // ===============================================================
  {
    NombreFuncion: 'registrarIngresoCaja',
    NombrePantalla: '💰 Registrar Ingreso',
    Descripcion: 'Identifica la intención del usuario de registrar una entrada de dinero a la caja. Úsalo cuando el usuario mencione que recibió un pago, un abono, dinero por una venta, o cualquier tipo de ingreso monetario.',
    SchemaParametros: {
      type: 'object',
      properties: {
        monto: {
          type: 'number',
          description: 'La cantidad numérica del dinero que ingresó.'
        },
        concepto: {
          type: 'string',
          description: "La razón o descripción breve del ingreso. Ej: 'Abono cliente Construcciones S.A.', 'Venta de contado tornillos'."
        },
      contacto: {
        type: 'string',
        description: 'Nombre de quien entrega o recibe el dinero.'
      },
      },
      required: ['monto', 'concepto', 'contacto']
    },
    ComportamientoAdicional: '', // Sin comportamiento adicional específico para esta.
    EsQuickStarter: true,
    PromptEspecifico: 'Has determinado que el usuario quiere registrar un ingreso. Tu siguiente paso es pedirle el monto y el concepto de forma clara y directa, usando un tono amigable y servicial.',
    rolesPermitidos: ['Administrador', 'Cajero', 'Todo en uno']
  },

  // ===============================================================
  // ==== HERRAMIENTA: Registrar Egreso de Caja ====
  // ===============================================================
  {
    NombreFuncion: 'registrarEgresoCaja',
    NombrePantalla: '💸 Registrar Gasto',
    Descripcion: 'Identifica la intención del usuario de registrar una salida de dinero de la caja. Úsalo cuando el usuario mencione un gasto, una compra, un pago de servicios, viáticos, almuerzos, o cualquier tipo de egreso monetario.',
    SchemaParametros: {
      type: 'object',
      properties: {
        monto: {
          type: 'number',
          description: 'La cantidad numérica del dinero que salió.'
        },
        concepto: {
          type: 'string',
          description: "La razón o descripción breve del gasto. Ej: 'Compra de papelería para oficina', 'Pago de almuerzo personal'."
        },
      contacto: {
        type: 'string',
        description: 'Nombre de quien entrega o recibe el dinero.'
      },
      },
      required: ['monto', 'concepto', 'contacto']
    },
    ComportamientoAdicional: '', // Sin comportamiento adicional específico para esta.
    EsQuickStarter: true,
    PromptEspecifico: 'Has determinado que el usuario quiere registrar un gasto. Tu siguiente paso es pedirle el monto y el concepto del gasto. Sé directo y eficiente.',
  rolesPermitidos: ['Administrador', 'Cajero', 'Todo en uno']

  },

  // ===============================================================
  // ==== HERRAMIENTA: Arqueo de Caja ====
  // ===============================================================
  {
    NombreFuncion: 'arqueoCaja',
    NombrePantalla: '🧮 Arqueo de Caja',
    Descripcion: 'Inicia un proceso guiado e interactivo para realizar un arqueo o corte de caja. Usa esta función cuando el usuario quiera cuadrar su caja. A diferencia de un registro simple, esta herramienta ayuda al usuario a calcular los totales, actuando como un asistente.',
    SchemaParametros: {
      type: 'object',
      properties: {
        saldoSistema: {
          type: 'number',
          description: "El monto total que la columna 'Calculado' del reporte 'Corte de Caja' indica que debería haber en caja."
        },
        confirmacionRegistros: {
          type: 'boolean',
          description: 'El usuario debe confirmar que todos los ingresos y retiros del día ya han sido registrados en el sistema. Debe ser \'true\' para proceder.'
        }
      },
      required: ['saldoSistema', 'confirmacionRegistros']
    },
    ComportamientoAdicional: 'Esta función no registra el arqueo final. Su propósito es iniciar un modo de conversación especial y de varios turnos. Una vez activado, el bot seguirá el PromptEspecifico para guiar al usuario, calcular los totales y, al final del proceso, invocará nuevamente la función arqueoCaja, la cual ejecutará registrarArqueoCaja y guardará todo en la hoja ArqueoCaja.',
    EsQuickStarter: true,
    PromptEspecifico: 'Una vez activado este flujo, tu misión es ser un asistente que ayuda al usuario a contar. No pidas totales, pide los detalles y tú haces las sumas. Haz una breve explicacion de cómo funciona el proceso. 1. Pide el Total de la columna Calculado en "Corte de Caja" de Sicar conocido como Saldo del Sistema, pregunta  si todos los ingresos y retiros hechos hasta el momento ya fueron registrados para garantizar un proceso sin errores 2. Iniciar Conteo de Efectivo: Ya tienes el saldo del sistema. Tu siguiente paso es decir: "Perfecto. Ahora vamos a contar el efectivo. No lo sumes, solo decime la cantidad de billetes que tenés (ej: 10 de 500, 20 de 100), y yo hago el cálculo por vos." 3. Calcular Efectivo: Cuando el usuario te dé los billetes, calcula el subtotal, anúncialo y luego pide las monedas. Suma todo y confirma el Total de Efectivo Contado. 4. Contar Otros Métodos: Continúa con la misma dinámica para Vales y Tarjetas, pidiendo los montos individuales y sumándolos por categoría. 5. Presentar Resumen Final: Muestra una comparación clara entre el Saldo del Sistema y el Total Contado (la suma de todo lo que ayudaste a contar). Anuncia el resultado final: si hay un faltante o un sobrante y de cuánto es. 6. Obtener Justificación y Registrar: Si hay una diferencia, pregunta por la razón. Una vez que tengas la justificación, confirma con el usuario y llama nuevamente a `arqueoCaja` para que esta registre todo con `registrarArqueoCaja` en la hoja `ArqueoCaja`.',
    rolesPermitidos: ['Administrador', 'Cajero', 'Todo en uno']

  },

  // ===============================================================
  // ==== HERRAMIENTA: Resumen para Administrador ====
  // ===============================================================
  {
    NombreFuncion: 'generarResumenAdmin',
    NombrePantalla: '📰 Resumen para Administrador',
    Descripcion: 'Genera un resumen de los mensajes y conteos enviados por el personal en los últimos días.',
    SchemaParametros: {
      type: 'object',
      properties: {
        dias: {
          type: 'number',
          description: 'Cantidad de días hacia atrás para resumir. Máximo 7.'
        }
      },
      required: ['dias']
    },
    ComportamientoAdicional: '',
    EsQuickStarter: true,
    PromptEspecifico: 'Úsala cuando el administrador pregunte frases como "¿qué hay de nuevo?" o "qué cuentan los trabajadores hoy".',
    rolesPermitidos: ['Administrador']

  }
];


// ===============================================================
// ==== LISTA DE USUARIOS DE LA APLICACIÓN ====
// Reemplaza la lectura de la hoja 'Usuarios' para mayor velocidad.
// ===============================================================
const USUARIOS = [
  {
    UsuarioID: 'U001',
    Rol: 'Administrador',
    Sucursal: 'Central',
    Activo: true,
    PIN: '1111',
    Puntos: 0,
    Insignias: ''
  },
  {
    UsuarioID: 'U002',
    Rol: 'Todo en uno',
    Sucursal: 'Bodegon',
    Activo: true,
    PIN: '2222',
    Puntos: 0,
    Insignias: ''
  },
  {
    UsuarioID: 'U003',
    Rol: 'Bodeguero',
    Sucursal: 'Central',
    Activo: true,
    PIN: '3333',
    Puntos: 0,
    Insignias: ''
  },
  {
    UsuarioID: 'U004',
    Rol: 'Bodeguero',
    Sucursal: 'Cotran',
    Activo: true,
    PIN: '4444',
    Puntos: 0,
    Insignias: ''
  },
  {
    UsuarioID: 'U005',
    Rol: 'Todo en uno',
    Sucursal: 'Coperna',
    Activo: true,
    PIN: '5555',
    Puntos: 0,
    Insignias: ''
  },
  {
    UsuarioID: 'U006',
    Rol: 'Todo en uno',
    Sucursal: 'SucursalPrueba',
    Activo: true,
    PIN: '6666',
    Puntos: 0,
    Insignias: ''
  },
  {
    UsuarioID: 'U007',
    Rol: 'Vendedor',
    Sucursal: 'Cotran',
    Activo: true,
    PIN: '7777',
    Puntos: 0,
    Insignias: ''
  },
  {
    UsuarioID: 'U008',
    Rol: 'Supervisor',
    Sucursal: 'Central',
    Activo: true,
    PIN: '8888',
    Puntos: 0,
    Insignias: ''
  },
  {
    UsuarioID: 'U009',
    Rol: 'Vendedor',
    Sucursal: 'Cotran',
    Activo: true,
    PIN: '9999',
    Puntos: 0,
    Insignias: ''
  },
  {
    UsuarioID: 'U010',
    Rol: 'Vendedor',
    Sucursal: 'Central',
    Activo: true,
    PIN: '1010',
    Puntos: 0,
    Insignias: ''
  }
];
