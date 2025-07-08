# Ferretería Chatbot

Este proyecto implementa un backend para una plataforma conversacional interna utilizada por **Ferretería Flores**. El código está escrito en **Google Apps Script** y se integra con la API de OpenAI para asistir a los trabajadores con tareas como registros de conteos de inventario y recepción de problemas o sugerencias.

## Archivos principales

- `Code.gs` – Lógica principal, manejo de historial y llamadas a la API de OpenAI.
- `Configuracion.gs` – Constantes globales, prompts del asistente y lista estática de usuarios.
- `Controladores.gs` – Funciones de inicio de sesión y control del flujo de chat.
- `AdminPanel.gs` – Utilidades específicas para el panel de administración.
- `Toolbox.gs` – Funciones que la IA puede invocar (registrar problemas, sugerencias, conteos, etc.).
- `DAL.gs` – Capa de acceso a datos para las hojas de cálculo.
- `Memoria.gs` – Gestión de memoria vectorial y búsqueda de contexto en la hoja `MemoriaVectorial`.
- `Test.gs` – Suite de pruebas del backend.
- `index.html` – Interfaz principal que se sirve con `doGet()`.
- `conteo-modal.html` – Ventana modal usada para registrar conteos desde la interfaz.

La hoja `MemoriaVectorial` se utiliza para almacenar los embeddings de conversaciones.

## Despliegue

1. Crea un proyecto nuevo en [Google Apps Script](https://script.google.com/) y vincúlalo con la hoja de cálculo que actuará como base de datos. Los nombres de las hojas deben coincidir con los definidos en `SHEET_NAMES` dentro de `Configuracion.gs`.
   Asegúrate de incluir una pestaña llamada `MemoriaVectorial` con las columnas `VectorID`, `UserID`, `Timestamp`, `TextoOriginal` y `EmbeddingVector`.
2. Copia todos los archivos `.gs` y `.html` de este repositorio en tu proyecto de Apps Script.
3. Define una **propiedad de script** llamada `OPENAI_API_KEY` con tu clave de OpenAI.
4. Ajusta el valor de `ID_HOJA_PUENTE` en `Configuracion.gs` para que apunte al ID de tu hoja principal.
5. Desde el editor de Apps Script selecciona **Deploy > New deployment** y elige "Web app" para publicar la aplicación. `doGet()` sirve la interfaz `index.html`.

## Ejecución de la suite de pruebas

1. Abre `Test.gs` en el editor de Apps Script.
2. Selecciona la función `testSuiteBackend` en el menú desplegable de la barra de herramientas y ejecútala.
3. Revisa la salida en el registro de ejecuciones para verificar los resultados de cada prueba.

