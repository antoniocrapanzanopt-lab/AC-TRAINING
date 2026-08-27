import { supabase } from '../supabase';
import { NotificationPreferences } from '../../types/notification';

// Helper per convertire la VAPID public key in Uint8Array
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Chiave VAPID pubblica di fallback sicura (configurabile anche via VITE_VAPID_PUBLIC_KEY)
export const DEFAULT_VAPID_PUBLIC_KEY =
  (import.meta.env.VITE_VAPID_PUBLIC_KEY as string) ||
  'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBKr3qBUYIHBQFLXYp5Nksh8U';

export class WebPushService {
  private static swRegistration: ServiceWorkerRegistration | null = null;

  // 1. Registra il Service Worker
  public static async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return null;
    }

    try {
      if (!this.swRegistration) {
        this.swRegistration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });
      } else {
        this.swRegistration.update().catch(() => {});
      }
      return this.swRegistration;
    } catch (err) {
      console.warn('Registrazione Service Worker non riuscita:', err);
      return null;
    }
  }

  // 2. Controlla il supporto Web Push nel browser
  public static isPushSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  }

  // 3. Controlla lo stato attuale dei permessi
  public static getPermissionState(): NotificationPermission {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }
    return Notification.permission;
  }

  // 4. Sottoscrivi l'utente a Web Push
  public static async subscribeUser(userId: string): Promise<{ success: boolean; error?: string }> {
    if (!this.isPushSupported()) {
      return { success: false, error: 'Le notifiche Web Push non sono supportate da questo browser.' };
    }

    try {
      const reg = await this.registerServiceWorker();
      if (!reg) {
        return { success: false, error: 'Impossibile registrare il Service Worker per le notifiche.' };
      }

      // Richiedi permessi se non concessi
      let permission = Notification.permission;
      if (permission === 'default') {
        permission = await Notification.requestPermission();
      }

      if (permission !== 'granted') {
        return { success: false, error: 'Permesso per le notifiche rifiutato dall\'utente.' };
      }

      // Sottoscrivi a PushManager
      const applicationServerKey = urlBase64ToUint8Array(DEFAULT_VAPID_PUBLIC_KEY);
      let subscription = await reg.pushManager.getSubscription();

      if (!subscription) {
        subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        });
      }

      const subJson = subscription.toJSON();
      if (!subJson.endpoint || !subJson.keys?.p256dh || !subJson.keys?.auth) {
        return { success: false, error: 'Dati di sottoscrizione push incompleti.' };
      }

      // Salva nel database Supabase
      const { error: dbError } = await supabase.from('push_subscriptions').upsert(
        {
          user_id: userId,
          endpoint: subJson.endpoint,
          p256dh: subJson.keys.p256dh,
          auth: subJson.keys.auth,
          user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
          created_at: new Date().toISOString(),
          last_used_at: new Date().toISOString(),
        },
        { onConflict: 'endpoint' }
      );

      if (dbError) {
        console.warn('Errore salvataggio sottoscrizione push su DB:', dbError);
      }

      // Aggiorna anche notification_preferences: push_enabled = true
      await this.updatePreferences(userId, { push_enabled: true });

      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Errore sconosciuto durante la sottoscrizione push';
      return { success: false, error: msg };
    }
  }

  // 5. Disiscrivi l'utente da Web Push
  public static async unsubscribeUser(userId: string): Promise<{ success: boolean }> {
    try {
      if (this.isPushSupported()) {
        const reg = await this.registerServiceWorker();
        if (reg) {
          const subscription = await reg.pushManager.getSubscription();
          if (subscription) {
            const endpoint = subscription.endpoint;
            await subscription.unsubscribe();

            // Rimuovi dal database
            await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
          }
        }
      }

      // Aggiorna preferenze: push_enabled = false
      await this.updatePreferences(userId, { push_enabled: false });
      return { success: true };
    } catch (err) {
      console.warn('Errore disiscrizione push:', err);
      return { success: false };
    }
  }

  // 6. Carica preferenze notifiche utente
  public static async getPreferences(userId: string): Promise<NotificationPreferences | null> {
    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.warn('Errore lettura preferenze notifiche:', error);
        return null;
      }

      if (!data) {
        // Crea preferenze di default
        const defaultPrefs: Omit<NotificationPreferences, 'id'> = {
          user_id: userId,
          push_enabled: false,
          notify_high: true,
          notify_critical: true,
          quiet_hours_start: '22:00',
          quiet_hours_end: '07:00',
          timezone: 'Europe/Rome',
          categories_opt_out: [],
          updated_at: new Date().toISOString(),
        };

        const { data: created } = await supabase
          .from('notification_preferences')
          .insert(defaultPrefs)
          .select('*')
          .single();

        return created || (defaultPrefs as NotificationPreferences);
      }

      return data;
    } catch (err) {
      console.warn('Eccezione getPreferences:', err);
      return null;
    }
  }

  // 7. Aggiorna preferenze notifiche utente
  public static async updatePreferences(
    userId: string,
    updates: Partial<NotificationPreferences>
  ): Promise<boolean> {
    try {
      const { error } = await supabase.from('notification_preferences').upsert(
        {
          user_id: userId,
          ...updates,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

      return !error;
    } catch (err) {
      console.warn('Eccezione updatePreferences:', err);
      return false;
    }
  }

  // 8. Mostra una notifica nativa di sistema sul dispositivo
  public static async showLocalNotification(
    title: string,
    options?: NotificationOptions & { url?: string }
  ): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;
    if (Notification.permission !== 'granted') return false;

    try {
      if ('serviceWorker' in navigator) {
        const reg = (await navigator.serviceWorker.ready.catch(() => null)) || (await this.registerServiceWorker());
        if (reg && reg.showNotification) {
          await reg.showNotification(title, {
            icon: '/ac-logo-transparent.png',
            badge: '/ac-logo-transparent.png',
            data: { action_url: options?.url || '/' },
            ...options,
          });
          return true;
        }
      }

      // Fallback a Notification classica
      new Notification(title, {
        icon: '/ac-logo-transparent.png',
        ...options,
      });
      return true;
    } catch (err) {
      console.warn('Errore visualizzazione notifica locale:', err);
      return false;
    }
  }
}
