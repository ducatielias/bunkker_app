let newWorker;
let updateNotificationVisible = false;

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Definimos dinámicamente el scope finalizando en '/' para atrapar solo esta subcarpeta
    const scope = new URL('./', location.href).pathname;

    navigator.serviceWorker.register('./sw.js', { scope: scope })
      .then(reg => {
        const notifyAboutWaitingWorker = worker => {
          if (worker && navigator.serviceWorker.controller) {
            newWorker = worker;
            showUpdateNotification();
          }
        };

        // Una actualización encontrada en una visita anterior puede estar ya
        // esperando antes de que esta página complete el registro.
        notifyAboutWaitingWorker(reg.waiting);

        reg.addEventListener('updatefound', () => {
          const installingWorker = reg.installing;
          if (!installingWorker) return;

          installingWorker.addEventListener('statechange', () => {
            if (installingWorker.state === 'installed') {
              notifyAboutWaitingWorker(reg.waiting);
            }
          });
        });

        // Fuerza una comprobación del script del worker en cada visita online,
        // pero no activa una versión nueva sin la confirmación del usuario.
        reg.update().catch(() => {
          // Estar sin conexión no es un error de la aplicación: la versión
          // activa y su caché siguen sirviendo la visita actual.
        });
      })
      .catch(err => console.error('Error registrando Service Worker aisaldo:', err));
  });

  // Escuchar cuando el nuevo SW tome el control para recargar la página y aplicar los cambios
  let refreshing;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });
}

function showUpdateNotification() {
  if (updateNotificationVisible) return;
  updateNotificationVisible = true;

  const updateDiv = document.createElement('div');
  updateDiv.style.cssText = 'position:fixed; bottom:20px; left:50%; transform:translateX(-50%); background:rgba(28, 28, 30, 0.95); backdrop-filter:blur(10px); color:white; padding:12px 20px; border-radius:14px; z-index:9999; display:flex; align-items:center; gap:15px; box-shadow:0 4px 12px rgba(0,0,0,0.3); font-family:-apple-system, sans-serif; white-space:nowrap;';
  
  updateDiv.innerHTML = `
    <span style="font-size:14px;">Hay una actualización de la App</span>
    <button id="pwa-update-btn" style="background:var(--blue-ios, #007aff); color:white; border:none; padding:8px 14px; border-radius:10px; font-weight:600; cursor:pointer; font-size:14px;">Actualizar</button>
  `;
  document.body.appendChild(updateDiv);

  document.getElementById('pwa-update-btn').addEventListener('click', () => {
    if (newWorker) {
      newWorker.postMessage({ type: 'SKIP_WAITING' });
    }
  });
}
