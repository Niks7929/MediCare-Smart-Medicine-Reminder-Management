/**
 * Service Worker & Browser Push Notification Manager for MediCare+
 */

export interface MedicationReminderPayload {
  medicine_id: number;
  name: string;
  dosage: string;
  instructions?: string;
  patient_name?: string;
  schedule_time?: string;
}

let swRegistration: ServiceWorkerRegistration | null = null;

/**
 * Registers the root service worker (/sw.js)
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.log('[SW] Service Workers not supported in this browser.');
    return null;
  }

  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    swRegistration = reg;
    console.log('[SW] Service Worker registered successfully with scope:', reg.scope);

    // Check for updates
    reg.onupdatefound = () => {
      const installingWorker = reg.installing;
      if (installingWorker) {
        installingWorker.onstatechange = () => {
          if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('[SW] New content is available; please refresh.');
          }
        };
      }
    };

    return reg;
  } catch (err) {
    console.warn('[SW] Service Worker registration failed:', err);
    return null;
  }
}

/**
 * Returns current notification permission state ('granted', 'denied', 'default')
 */
export function getNotificationPermission(): NotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
}

/**
 * Requests browser notification permission from the user
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (err) {
    console.error('Error requesting notification permission:', err);
    return false;
  }
}

/**
 * Dispatches a native browser notification via Service Worker
 * Works even if the tab is inactive, minimized, or in background.
 */
export async function triggerMedicationNotification(med: MedicationReminderPayload): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission !== 'granted') {
    return false;
  }

  const title = `💊 Time for ${med.name} (${med.dosage})`;
  const body = `Scheduled Dose Alert: ${med.name} (${med.dosage})${
    med.patient_name ? ` for ${med.patient_name}` : ''
  }.${med.instructions ? ` Note: ${med.instructions}` : ''}`;

  try {
    // 1. Try via active Service Worker registration
    if (swRegistration && swRegistration.active) {
      swRegistration.active.postMessage({
        type: 'SHOW_MEDICATION_REMINDER',
        payload: {
          title,
          body,
          medicine_id: med.medicine_id,
          dosage: med.dosage,
          patient_name: med.patient_name
        }
      });
      return true;
    }

    // 2. Fallback to navigator.serviceWorker.ready
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      if (reg.showNotification) {
        await reg.showNotification(title, {
          body,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: `dose-${med.medicine_id}`,
          requireInteraction: true,
          vibrate: [250, 100, 250, 100, 250],
          data: { medicine_id: med.medicine_id, url: '/' },
          actions: [
            { action: 'take', title: '✓ Take Dose' },
            { action: 'snooze', title: '⏱ Snooze 10m' }
          ]
        } as any);
        return true;
      }
    }

    // 3. Fallback to standard window Notification
    new Notification(title, {
      body,
      icon: '/favicon.ico',
      tag: `dose-${med.medicine_id}`,
      requireInteraction: true
    });
    return true;
  } catch (err) {
    console.error('Error triggering notification:', err);
    return false;
  }
}

/**
 * Sends an immediate test notification to verify background push delivery
 */
export async function sendTestNotification(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission !== 'granted') {
    const granted = await requestNotificationPermission();
    if (!granted) return false;
  }

  const title = '🔔 MediCare+ Background Push Verified';
  const body = 'Background Service Worker is active! You will receive scheduled dose alerts even when this tab is closed or in the background.';

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      if (reg.showNotification) {
        await reg.showNotification(title, {
          body,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: 'medicare-test-alert',
          vibrate: [200, 100, 200],
          actions: [
            { action: 'take', title: '✓ Got It' }
          ]
        } as any);
        return true;
      }
    }

    new Notification(title, { body, icon: '/favicon.ico' });
    return true;
  } catch (e) {
    console.error('Test notification error:', e);
    return false;
  }
}

/**
 * Sets up listener for messages from Service Worker (e.g. user clicked 'Take Dose' in notification)
 */
export function setupServiceWorkerListener(
  onLogDose: (medId: number, status: 'TAKEN') => void,
  onSnoozeDose?: (medId: number, mins: number) => void
) {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return () => {};
  }

  const handler = (event: MessageEvent) => {
    if (!event.data) return;
    const { type, medicine_id, snooze_minutes } = event.data;

    if (type === 'SW_ACTION_LOG_DOSE' && medicine_id) {
      console.log('[SW] Received TAKE DOSE action from notification:', medicine_id);
      onLogDose(Number(medicine_id), 'TAKEN');
    } else if (type === 'SW_ACTION_SNOOZE' && medicine_id && onSnoozeDose) {
      console.log('[SW] Received SNOOZE action from notification:', medicine_id);
      onSnoozeDose(Number(medicine_id), snooze_minutes || 10);
    }
  };

  navigator.serviceWorker.addEventListener('message', handler);
  return () => {
    navigator.serviceWorker.removeEventListener('message', handler);
  };
}
