// MediCare+ Service Worker for Background Dose Reminders & Web Push Notifications

const CACHE_NAME = 'medicare-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/static/css/style.css'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE).catch(() => {}))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('push', (event) => {
  let data = {
    title: 'MediCare+ Dose Reminder',
    body: 'Time to take your scheduled medication.',
    icon: '/static/favicon.ico',
    tag: 'medicare-dose-reminder'
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      tag: data.tag || 'medicare-dose-reminder',
      renotify: true,
      requireInteraction: true,
      vibrate: [200, 100, 200],
      actions: [
        { action: 'take', title: '✓ Take Dose' },
        { action: 'snooze', title: '⏱ Snooze 10m' }
      ]
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow('/');
    })
  );
});

self.addEventListener('message', (event) => {
  if (!event.data) return;
  const { type, payload } = event.data;
  if (type === 'SHOW_MEDICATION_REMINDER') {
    self.registration.showNotification(payload.title || 'MediCare+ Prescription Alert', {
      body: payload.body || 'Time to take your scheduled dose.',
      tag: `dose-${payload.medicine_id || Date.now()}`,
      renotify: true,
      requireInteraction: true,
      vibrate: [250, 100, 250],
      actions: [
        { action: 'take', title: '✓ Take Dose' },
        { action: 'snooze', title: '⏱ Snooze 10m' }
      ]
    });
  }
});
