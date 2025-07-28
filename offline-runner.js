// Capa de compatibilidad para ejecutar la interfaz fuera de Apps Script
(function() {
  if (window.google && window.google.script && window.google.script.run) {
    return;
  }

  if (!window.google) window.google = {};
  if (!window.google.script) window.google.script = {};

  const createProxy = url => new Proxy({}, {
    get(target, prop) {
      return async (...args) => {
        const servidor = window.OFFLINE_SERVER_URL || url;
        if (!servidor) {
          console.error('OFFLINE_SERVER_URL no está definido.');
          return Promise.reject('OFFLINE_SERVER_URL no está definido.');
        }
        const resp = await fetch(servidor, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ funcion: prop, parametros: args })
        });
        if (!resp.ok) throw new Error('Error en la petición');
        return resp.json();
      };
    }
  });

  window.google.script.run = createProxy('');
})();
