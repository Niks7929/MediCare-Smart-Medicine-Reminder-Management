// MediCare+ Service Worker for Background Dose Reminders & Web Push Notifications

const CACHE_NAME = 'medicare-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install Event: Cache essential shell assets
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('SW: Cache shell assets fallback', err);
      });
    })
  );
});

// Activate Event: Clean old caches and claim all clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Push Event: Handle server-sent or web push events
self.addEventListener('push', (event) => {
  let data = {
    title: 'MediCare+ Dose Reminder',
    body: 'Time to take your scheduled medication.',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'medicare-dose-reminder',
    data: { url: '/' }
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/favicon.ico',
    badge: data.badge || '/favicon.ico',
    tag: data.tag || 'medicare-dose-reminder',
    renotify: true,
    requireInteraction: true,
    vibrate: [200, 100, 200, 100, 200],
    data: data.data || { url: '/' },
    actions: [
      { action: 'take', title: '✓ Take Dose' },
      { action: 'snooze', title: '⏱ Snooze 10m' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification Click Event: Handle action buttons and app focus
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action;
  const notificationData = event.notification.data || {};
  const medId = notificationData.medicine_id;
  const targetUrl = notificationData.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If action is take dose or snooze, broadcast message to open clients
      if (action === 'take' && medId) {
        clientList.forEach((client) => {
          client.postMessage({
            type: 'SW_ACTION_LOG_DOSE',
            medicine_id: medId,
            status: 'TAKEN'
          });
        });
      } else if (action === 'snooze' && medId) {
        clientList.forEach((client) => {
          client.postMessage({
            type: 'SW_ACTION_SNOOZE',
            medicine_id: medId,
            snooze_minutes: 10
          });
        });
        // Schedule a follow-up notification in 10 minutes (600,000 ms)
        setTimeout(() => {
          self.registration.showNotification('MediCare+ Snooze Reminder', {
            body: `Reminder: Time to take your snoozed medication.`,
            tag: `medicare-snooze-${medId}`,
            renotify: true,
            requireInteraction: true,
            vibrate: [300, 150, 300],
            data: { medicine_id: medId, url: '/' },
            actions: [
              { action: 'take', title: '✓ Take Dose Now' }
            ]
          });
        }, 10 * 60 * 1000);
      }

      // Focus existing window or open new one
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// Message Event: Receive triggers from main thread to show reminders even when tab is backgrounded
self.addEventListener('message', (event) => {
  if (!event.data) return;

  const { type, payload } = event.data;

  if (type === 'SHOW_MEDICATION_REMINDER') {
    const { title, body, medicine_id, dosage, patient_name } = payload || {};
    self.registration.showNotification(title || 'MediCare+ Prescription Alert', {
      body: body || `Time to take ${dosage || 'scheduled dose'} for ${patient_name || 'patient'}.`,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: `dose-${medicine_id || Date.now()}`,
      renotify: true,
      requireInteraction: true,
      vibrate: [250, 100, 250, 100, 250],
      data: {
        medicine_id,
        url: '/'
      },
      actions: [
        { action: 'take', title: '✓ Take Dose' },
        { action: 'snooze', title: '⏱ Snooze 10m' }
      ]
    });
  } else if (type === 'SCHEDULE_BACKGROUND_ALARM') {
    const { delayMs, title, body, medicine_id } = payload || {};
    if (delayMs && delayMs > 0) {
      setTimeout(() => {
        self.registration.showNotification(title || 'MediCare+ Scheduled Dose', {
          body: body || 'Time to take your scheduled medication.',
          tag: `sched-${medicine_id || Date.now()}`,
          renotify: true,
          requireInteraction: true,
          vibrate: [300, 100, 300],
          data: { medicine_id, url: '/' },
          actions: [
            { action: 'take', title: '✓ Take Dose' }
          ]
        });
      }, delayMs);
    }
  }
});
