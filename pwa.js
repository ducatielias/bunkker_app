let newWorker;

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Definimos dinámicamente el scope finalizando en '/' para atrapar solo esta subcarpeta
    const scope = new URL('./', location.href).pathname;

    navigator.serviceWorker.register('./sw.js', { scope: scope })
      .then(reg => {
        reg.addEventListener('updatefound', () => {
          newWorker = reg.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              showUpdateNotification();
            }
          });
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