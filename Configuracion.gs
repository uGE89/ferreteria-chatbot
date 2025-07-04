// ===============================================================
// ==== CONFIGURACIÓN DEL MODELO DE IA ====
// Estos valores reemplazan la hoja 'ConfiguracionAI' y 'PromptsAI'
// ===============================================================

// En: Configuracion.gs
const OPENAI_API_KEY = PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');
const MODELO_DEFAULT = 'gpt-4o-mini';
const TEMPERATURA_AI = 0.7;
const MAX_TOKENS_AI = 1500; // Aumentado ligeramente para dar más espacio a las respuestas


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
  MOVIMIENTOS_PENDIENTES: 'MovimientosPendientes',
  CONFIGURACION_AI: 'ConfiguracionAI',
  PROMPTS_AI: 'PromptsAI',
  HERRAMIENTAS_AI: 'HerramientasAI'
};


// ===============================================================
// ==== PROMPT_SISTEMA_GENERAL ====

const PROMPT_SISTEMA_GENERAL = `
# Rol y Personalidad

Actúas como Carlos E. Flores, supervisor general de Ferretería Flores en Nicaragua, en tu versión digital. Sos un asistente virtual que se comunica por una interfaz tipo WhatsApp.
- **Tu Tono:** Sos directo, servicial y usas un lenguaje nicaragüense informal. Usás frases como: *dale, no hay clavo, fijate, ya se mandó eso, regalame el dato*. Evitás la formalidad y las frases rebuscadas.
- **Tu Misión:** Ayudar a los trabajadores (vendedores, bodegueros, cajeros) a registrar eficientemente conteos, problemas y sugerencias, y a crear tareas pendientes.

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
**¡NO te presentes de nuevo!** Si la conversación ya está activa, sé directo. Si un usuario que ya está en sesión dice "Hacer conteo", tu respuesta debe ser directa al grano: *Dale, decime qué producto va a contar y los números.* No repitas el saludo.

### Memoria y Recuerdo
- Cuando el usuario pregunte *¿en qué íbamos?* o *¿qué pasó?*, no te limites a la última acción. Resume brevemente los últimos 2 o 3 temas hablados. Ejemplo: *Claro, acabamos de registrar el conteo de cemento y antes reportaste un problema con el generador. ¿Seguimos con algo más?*
- Si el usuario intenta registrar algo que ya se hizo en la misma sesión (ej. contar el mismo producto), reconocelo: *Fijate, ya registramos el conteo de cemento canal hace un rato. ¿Querés corregirlo o es un conteo nuevo?*

## Flujo de Tareas (Captura de Datos)

### Para Conteos de Inventario (registrarConteo)
- La confirmación es obligatoria por la importancia de los números. Siempre preguntá: *¿Confirmás que contaste X en físico y el sistema dice Y?*
- **¡ATENCIÓN A LAS JUSTIFICACIONES!** Si el usuario da una razón para la diferencia en el mismo mensaje (ej: *...sobra por falta de ingreso de factura, ...la diferencia es la limosna*), DEBES capturar esa información en el parámetro \`observacion\` de la función.

- Si tiene dudas, mostrále la "Guía de Usuario: Nuevo Módulo de Registro de Conteo de Inventario".

### Para Problemas y Sugerencias (registrarProblema, registrarSugerencia)
- Sé más rápido y directo. En cuanto tengas el tema y el detalle, invoca la función directamente.
- **NO pidas una confirmación extra.** Después de llamar la función, simplemente informa al usuario lo que hiciste.

## Flujos de Tareas Específicos

- **Conteo de Cemento (01)**: si el mensaje incluye "cemento", "cemento canal" u otros alias relacionados, iniciá de inmediato el flujo guiado para \`registrarConteo\` usando \`claveProducto\` \`01\`.
- **Conteo de Caja (CCH)**: al detectar "caja", "caja chica", "cch" o cualquiera de sus alias, comenzá el flujo guiado para \`registrarConteo\` con \`claveProducto\` \`CCH\`.

### Pasos guiados (la IA los maneja, el usuario NO hace cuentas)

**Para Cemento (01)**
1. Preguntá solo la cantidad física. Antes de eso, mostrá la cantidad del sistema para contexto.  
2. Calculá internamente la diferencia.  
3. Si la diferencia ≠ 0, preguntá:  
   - *¿Hay compras pendientes de ingreso?* (sí/no)  
   - *¿Hay ventas pendientes de entregar?* (sí/no)  
4. Si ambas son **no**, registrá la diferencia sin pedir al usuario que la calcule.  
5. Capturá cualquier explicación extra en \`observacion\`.

**Para Caja (CCH)**
1. Preguntá la cantidad física de efectivo en caja.  
2. Calculá la diferencia.  
3. Si la diferencia ≠ 0, preguntá:  
   - *¿Hay pagos por transferencia por agregar?* (sí/no)  
   - *¿Hay pagos con tarjeta por agregar?* (sí/no)  
4. Si ambas son **no**, pedí una breve observación y registrá la diferencia.

Al captar cualquiera de estos alias en la conversación, arrancá el flujo correspondiente sin esperar un comando adicional.

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

const GUIA_USUARIO_CONTEO = `
Guía de Usuario: Nuevo Módulo de Registro de Conteo de Inventario
Anuncio Importante para todo el personal:
Para mejorar la precisión y el orden en nuestro control de inventario, el método de registro ha sido actualizado.

¿Cómo usar el nuevo módulo de conteo?
1. Acceso al Módulo
En la pantalla principal, dentro de los "Iniciadores rápidos", encontrarás un botón para esta función. Al presionarlo, se abrirá la nueva pantalla de registro.

2. Buscar Artículos
Barra de Búsqueda: Para encontrar un producto, simplemente escribe su nombre o clave en la barra de búsqueda superior y presiona Enter.

Filtros:

Conteos hoy: Muestra una lista sugerida de artículos para contar durante el día. Esta lista puede variar diariamente.

Todos: Muestra el catálogo completo de artículos.

3. Entendiendo la Tabla de Conteo
Una vez que buscas un artículo, verás varias columnas. Es crucial que entiendas qué significa cada una:

Sistema: Es la cantidad de unidades que teóricamente existen en el sistema. Este campo se puede editar si es necesario.

Físico: Aquí debes registrar las unidades que contaste físicamente en la bodega o estante.

CPI (Compras Pendientes de Ingreso): Anota aquí los productos que ya recibiste pero que aún no han sido ingresados al inventario del sistema (ej. una compra o traspaso pendiente).

VPE (Venta Pendiente de Entrega): Utilízalo para productos que ya fueron vendidos pero que el cliente aún no ha retirado.

Diferencia: Esta columna se calcula sola y te muestra si hay un sobrante o faltante.

Razón: Si existe una diferencia, selecciona aquí la causa que mejor la explique. Puedes dejarlo en blanco si lo desconoces.

4. Guardar tu Trabajo
Cuando hayas terminado de ingresar los datos de uno o varios artículos, haz clic en el botón verde "Registrar Conteos Completados" en la parte inferior.

Aparecerá un mensaje para que confirmes la acción antes de guardar definitivamente.

Puntos Clave a Recordar
No pierdes tu progreso: Si ya ingresaste conteos para un artículo y luego buscas otro, los datos del primero se mantienen en memoria hasta que decidas guardarlos.

Limpiar una fila: Si te equivocaste, puedes limpiar todos los campos que escribiste en una fila usando el ícono de flecha circular a la derecha.

Cerrar sin guardar: Si intentas cerrar el módulo con cambios pendientes, el sistema te mostrará una advertencia. Si no deseas registrar los cambios, simplemente selecciona la opción para cerrar.

Artículos nuevos: La base de datos de artículos se actualiza manualmente. Si un producto es muy reciente, es posible que no aparezca en la lista de inmediato.

¿Para qué sirve el chat ahora?
El chat sigue siendo tu asistente principal para consultas rápidas, reportar problemas, hacer sugerencias o solicitar tareas. Aunque no tenga todas las respuestas, cada pregunta que haces nos ayuda a entrenarlo para que sea más útil en el futuro.
`;


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
    ComportamientoAdicional: 'Calcula la diferencia entre sistema y físico. Si es distinta de cero solicita datos de CPI o VPE. Para la clave CCH pregunta si hay pagos por transferencia o tarjeta. Siempre confirma antes de registrar y guarda cualquier explicación en `observacion`.',
    EsQuickStarter: true,
    PromptEspecifico: 'Guía al usuario para obtener clave, cantidades en sistema y físico. Si la diferencia supera ±10 pide CPI o VPE y cualquier observación. Para la caja consulta por pagos con transferencia o tarjeta antes de registrar.',
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
        }
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
        }
      },
      required: ['monto', 'concepto', 'contacto']
    },
    ComportamientoAdicional: '', // Sin comportamiento adicional específico para esta.
    EsQuickStarter: true,
    PromptEspecifico: 'Has determinado que el usuario quiere registrar un gasto. Tu siguiente paso es pedirle el monto y el concepto del gasto. Sé directo y eficiente.',
    rolesPermitidos: ['Administrador', 'Cajero', 'Todo en uno'] 

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
    PIN: '1111'
  },
  {
    UsuarioID: 'U002',
    Rol: 'Todo en uno',
    Sucursal: 'Bodegon',
    Activo: true,
    PIN: '2222'
  },
  {
    UsuarioID: 'U003',
    Rol: 'Bodeguero',
    Sucursal: 'Central',
    Activo: true,
    PIN: '3333'
  },
  {
    UsuarioID: 'U004',
    Rol: 'Bodeguero',
    Sucursal: 'Cotran',
    Activo: true,
    PIN: '4444'
  },
  {
    UsuarioID: 'U005',
    Rol: 'Todo en uno',
    Sucursal: 'Coperna',
    Activo: true,
    PIN: '5555'
  },
  {
    UsuarioID: 'U006',
    Rol: 'Todo en uno',
    Sucursal: 'SucursalPrueba',
    Activo: true,
    PIN: '6666'
  },
  {
    UsuarioID: 'U007',
    Rol: 'Vendedor',
    Sucursal: 'Cotran',
    Activo: true,
    PIN: '7777'
  },
  {
    UsuarioID: 'U008',
    Rol: 'Supervisor',
    Sucursal: 'Central',
    Activo: true,
    PIN: '8888'
  },
  {
    UsuarioID: 'U009',
    Rol: 'Vendedor',
    Sucursal: 'Cotran',
    Activo: true,
    PIN: '9999'
  },
  {
    UsuarioID: 'U010',
    Rol: 'Vendedor',
    Sucursal: 'Central',
    Activo: true,
    PIN: '1010'
  }
];
