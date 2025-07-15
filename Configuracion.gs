
// ===============================================================
// ==== CONFIGURACIÓN DEL MODELO DE IA ====
// Estos valores reemplazan la hoja 'ConfiguracionAI' y 'PromptsAI'
// ===============================================================

// En: Configuracion.gs
const OPENAI_API_KEY = PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');
const MODELO_DEFAULT = 'gpt-4.1-mini';
const TEMPERATURA_AI = 0.5;
const MAX_TOKENS_AI = 4000; // Aumentado para aprovechar el nuevo modelo
const MAX_TOKENS_HISTORIAL = 6000; // Se amplía el historial permitido
const MAX_MENSAJES_HISTORIAL = 80;  // Cantidad máxima de mensajes en el historial


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
  ANUNCIOS: 'Anuncios',
  CONFIGURACION_AI: 'ConfiguracionAI',
  PROMPTS_AI: 'PromptsAI',
  HERRAMIENTAS_AI: 'HerramientasAI',
  ARQUEO_CAJA: 'ArqueoCaja'
};


// ===============================================================

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
  rolesPermitidos: ['Administrador', 'Cajero', 'Todo en uno']

  },

  // ===============================================================
  // ==== HERRAMIENTA: Arqueo de Caja ====
  // ===============================================================
  {
    NombreFuncion: 'arqueoCaja',
    NombrePantalla: '🧮 Arqueo de Caja',
    Descripcion: 'Inicia y gestiona un proceso de conversación guiado para realizar un arqueo de caja, recopilando todos los montos necesarios para luego llamar a la función de registro.',
    SchemaParametros: {
      type: 'object',
      properties: {
        saldoSistema: {
          type: 'number',
          description: "El monto total que el sistema indica que debería haber en caja."
        },
        contado: {
          type: 'number',
          description: "El monto total contado en efectivo (billetes y monedas)."
        },
        transferencia: {
          type: 'number',
          description: "El monto total de pagos por transferencia."
        },
        tarjeta: {
          type: 'number',
          description: "El monto total de pagos con tarjeta."
        },
        razonDiferencia: {
          type: 'string',
          description: "La justificación obligatoria si existe una diferencia entre el saldo del sistema y el total contado. Si no hay diferencia, este valor debe ser 'Sin diferencia'."
        }
      },
      required: ['saldoSistema', 'contado', 'transferencia', 'tarjeta', 'razonDiferencia']
    },
    ComportamientoAdicional: 'Esta función se invoca al final de un proceso de conversación. El asistente debe guiar al usuario para obtener todos los valores antes de llamar a esta herramienta.',
    EsQuickStarter: true,
    // --- PROMPT ESPECÍFICO MEJORADO ---
Objetivo: Guiar paso a paso al usuario para registrar el arqueo de caja, obteniendo todos los montos y la justificación si hay diferencia, asegurando que el registro sea completo y según los procedimientos internos de Ferretería Flores. Parámetros requeridos: saldoSistema (monto total que el sistema indica que debería haber en caja), contado (monto total contado en efectivo), transferencia (monto total de pagos por transferencia), tarjeta (monto total de pagos con tarjeta), razonDiferencia (justificación obligatoria si hay diferencia entre saldoSistema y la suma de contado, transferencia y tarjeta; si no hay diferencia usar #Sin diferencia#). Flujo guiado: 1) Pedí saldoSistema: Ejemplo: 'Dale, vamos a hacer el arqueo. Para empezar, pasame el saldo que el sistema dice que debería haber.' 2) Pedí contado: 'Ok, ya tengo el del sistema. Ahora, ¿cuánto contaste en efectivo?' 3) Pedí transferencia: '¿Y cuánto tenés en transferencias? (Si no hay, respondé 0)' 4) Pedí tarjeta: '¿Cuánto hay en pagos con tarjeta? (Si no hay, respondé 0)' 5) Calculá diferencia: saldoSistema - (contado + transferencia + tarjeta). Si diferencia es 0, usá #Sin diferencia# como razonDiferencia y decí 'Perfecto, todo cuadra. Voy a registrar el arqueo.' Si hay diferencia, indicá el monto y pedí justificación: 'Ok, veo una diferencia sobrante/faltante de X. ¿Podés darme la justificación para ese monto?' Si el usuario corrige algún dato, retomá el flujo desde ese punto y recalculá la diferencia. ***ATENCIÓN: Una vez que tengas los 5 parámetros, tu ÚNICA RESPUESTA debe ser la llamada a la herramienta arqueoCaja con el JSON de argumentos. NO respondás con texto, NO escribás mensajes tipo “listo, ya lo registré”, SOLO ejecutá la función. Si respondés con texto y no ejecutás la función, el registro NO será válido.*** No permitás avanzar si falta algún dato, no aceptés valores ambiguos o vacíos. Si el usuario repite o corrige datos, ajustá y recalculá. Ejemplo de interacción: Asistente: Dale, vamos a hacer el arqueo de caja. Primero, pasame el saldo que el sistema indica que debería haber en caja. Usuario: 5000 en sistema, 4500 en efectivo, 400 en transferencia y 50 en tarjeta. Asistente: Perfecto, ya tengo esos datos. Saldo sistema: 5,000, Efectivo contado: 4,500, Transferencias: 400, Tarjetas: 50. La diferencia es: 5,000 - (4,500 + 400 + 50) = 50. Faltan 50, ¿podés darme una justificación para esa diferencia? Usuario: ya encontré, tengo 4550 en efectivo. Asistente: Perfecto, entonces el efectivo contado es 4,550. ¿Querés que corrija ese dato para calcular la diferencia y seguir con el arqueo? Usuario: sí. Asistente: Ejecutando: arqueoCaja... Resultado: Arqueo registrado correctamente. Diferencia: 0.`
,
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
    rolesPermitidos: ['Administrador']

  }
];


// ===============================================================
// ==== LISTA DE USUARIOS DE LA APLICACIÓN ====
// Reemplaza la lectura de la hoja 'Usuarios' para mayor velocidad.
// La constante USUARIOS se define en Usuarios.gs
// ===============================================================
