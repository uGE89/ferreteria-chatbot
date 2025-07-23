# Ferretería Chatbot

Este proyecto implementa un backend para una plataforma conversacional interna utilizada por **Ferretería Flores**. El código está escrito en **Google Apps Script** y se integra con la API de OpenAI para asistir a los trabajadores con tareas como registros de conteos de inventario y recepción de problemas o sugerencias.

## Archivos principales

- `Code.gs` – Lógica principal, manejo de historial y llamadas a la API de OpenAI.
- `Configuracion.gs` – Constantes globales, prompts del asistente y lista estática de usuarios.
- `Controladores.gs` – Funciones de inicio de sesión y control del flujo de chat.
- `AdminPanel.gs` – Utilidades específicas para el panel de administración.
- `Toolbox.gs` – Funciones que la IA puede invocar (registrar problemas, sugerencias, conteos, etc.).
- `DAL.gs` – Capa de acceso a datos para las hojas de cálculo.
- `Test.gs` – Suite de pruebas del backend.
- `index.html` – Interfaz principal que se sirve con `doGet()`.
- `conteo-modal.html` – Ventana modal usada para registrar conteos desde la interfaz.

## Sistema de gamificación

Cada usuario tiene campos de **Puntos** e **Insignias** en la hoja `Usuarios`.
Al registrar problemas, sugerencias, arqueos o conteos se otorgan 10, 15, 10 y 5 puntos respectivamente.
Las insignias se guardan con la función `asignarInsignia(userId, nombreInsignia)`.
En la interfaz se muestra el puntaje actual y una tabla de clasificación,
obtenida con `obtenerRankingPuntos()`.

## Subida de imágenes

Para adjuntar capturas desde la interfaz seguí estos pasos:

1. Hacé clic en el botón **Seleccionar archivo** debajo del cuadro de texto.
2. Elegí la imagen a cargar y presioná **Enviar imagen**.
3. La aplicación comprime la imagen, la convierte a base64 y llama a
   `subirImagen`.
4. La función guarda el archivo en la carpeta de Drive **ImagenesFerrebot** y
   devuelve un enlace directo para mostrarlo en el chat.

La carpeta **ImagenesFerrebot** debe existir en tu Google Drive y su ID se
configura en `FOLDER_IMAGENES`. La cuenta que ejecuta el script necesita permiso
de edición sobre esa carpeta y autorizar el acceso a Drive al desplegar la
aplicación.

## Acciones rápidas en el chat

Cada burbuja de conversación incluye cuatro iconos:

- **check** para aprobar un mensaje.
- **visibility** para marcarlo como visto.
- **lightbulb** para destacarlo como idea.
- **push_pin** para fijarlo en la lista.

Al hacer clic se llaman las funciones correspondientes en el backend,
por ejemplo `marcarMensajeAprobado(id)` o `fijarMensaje(id)`.


## Despliegue

1. Crea un proyecto nuevo en [Google Apps Script](https://script.google.com/) y vincúlalo con la hoja de cálculo que actuará como base de datos. Los nombres de las hojas deben coincidir con los definidos en `SHEET_NAMES` dentro de `Configuracion.gs`.
2. Copia todos los archivos `.gs` y `.html` de este repositorio en tu proyecto de Apps Script.
3. Define una **propiedad de script** llamada `OPENAI_API_KEY` con tu clave de OpenAI.
4. Ajusta el valor de `ID_HOJA_PUENTE` en `Configuracion.gs` para que apunte al ID de tu hoja principal.
5. Configura `FOLDER_IMAGENES` en `Configuracion.gs` con el ID de la carpeta de Drive donde se subirán las imágenes.
6. Desde el editor de Apps Script selecciona **Deploy > New deployment** y elige "Web app" para publicar la aplicación. `doGet()` sirve la interfaz `index.html`.
7. Ejecuta `instalarTriggerLimpiezaSesiones` para programar la limpieza de sesiones.

## Ejecución de la suite de pruebas

1. Abre `Test.gs` en el editor de Apps Script.
2. Selecciona la función `testSuiteBackend` en el menú desplegable de la barra de herramientas y ejecútala.
3. Revisa la salida en el registro de ejecuciones para verificar los resultados de cada prueba.

Tras realizar cambios se debe ejecutar:

```bash
echo "Sin pruebas automáticas"
```

## Errores comunes

- **HTTP 429** – Generalmente indica que se alcanzó un límite de cuota o de tasa. El sistema realiza varios reintentos automáticos. Si el problema persiste, revisá la configuración de la clave y la cuota disponible en OpenAI.


## Contribución

Las colaboraciones se aceptan mediante pull requests.
Abre un issue para proponer cambios de gran alcance antes de iniciar el desarrollo.

## Licencia

Este proyecto se distribuye bajo la licencia MIT. Consulta el archivo [LICENSE](LICENSE) para más detalles.
