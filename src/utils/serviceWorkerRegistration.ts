// Service Worker Registration Utility
// Call this in your main App component

export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js')
        .then((registration) => {
          console.log('[SW] Registered:', registration.scope);
          
          // Check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New version available
                  showUpdatePrompt(registration);
                }
              });
            }
          });
        })
        .catch((error) => {
          console.log('[SW] Registration failed:', error);
        });
    });
  }
}

function showUpdatePrompt(registration: ServiceWorkerRegistration) {
  // Create update notification
  const updateBanner = document.createElement('div');
  updateBanner.id = 'sw-update-banner';
  updateBanner.innerHTML = `
    <style>
      #sw-update-banner {
        position: fixed;
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%);
        background: #5b763fff;
        color: white;
        padding: 12px 20px;
        border-radius: 12px;
        font-family: system-ui, sans-serif;
        font-size: 14px;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(34, 197, 94, 0.4);
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 12px;
        animation: slideUp 0.3s ease;
      }
      #sw-update-banner button {
        background: white;
        color: #245a37ff;
        border: none;
        padding: 6px 14px;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
        font-size: 13px;
      }
      #sw-update-banner button:hover {
        background: #f0fdf4;
      }
      @keyframes slideUp {
        from { transform: translateX(-50%) translateY(20px); opacity: 0; }
        to { transform: translateX(-50%) translateY(0); opacity: 1; }
      }
    </style>
    <span>🎉 New version available!</span>
    <button id="sw-update-btn">Update</button>
  `;
  
  document.body.appendChild(updateBanner);
  
  // Handle update button click
  document.getElementById('sw-update-btn')?.addEventListener('click', () => {
    // Tell service worker to skip waiting
    registration.active?.postMessage({ type: 'SKIP_WAITING' });
    
    // Reload the page
    window.location.reload();
  });
  
  // Auto-dismiss after 10 seconds
  setTimeout(() => {
    if (updateBanner.parentNode) {
      updateBanner.remove();
    }
  }, 10000);
}

// Check if there's a waiting service worker
export function checkForUpdate() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistration()
      .then((registration) => {
        if (registration?.waiting) {
          console.log('[SW] Waiting service worker found');
          showUpdatePrompt(registration);
        }
      });
  }
}

// Unregister service worker (for debugging)
export function unregisterServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations()
      .then((registrations) => {
        registrations.forEach((registration) => {
          registration.unregister();
        });
      });
  }
}

