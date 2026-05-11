import 'server-only';
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';
import * as Sentry from '@sentry/nextjs';
import { supabaseUrl } from '@/lib/supabase';

let vapidConfigured = false;

function configureVapid(): boolean {
  if (vapidConfigured) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(
    'mailto:hello@kith.support',
    publicKey,
    privateKey,
  );
  vapidConfigured = true;
  return true;
}

export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
): Promise<void> {
  if (!configureVapid()) return;

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) return;

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: subs, error } = await admin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', userId);

  if (error) {
    Sentry.withScope((scope) => {
      scope.setTags({ lib: 'webpush', op: 'select', table: 'push_subscriptions' });
      scope.setContext('webpush', { userId });
      Sentry.captureException(error);
    });
    return;
  }

  if (!subs || subs.length === 0) return;

  const payload = JSON.stringify({ title, body });
  const staleIds: string[] = [];

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload,
        );
      } catch (err: unknown) {
        const statusCode =
          typeof err === 'object' && err !== null && 'statusCode' in err
            ? (err as { statusCode?: number }).statusCode
            : undefined;
        if (statusCode === 404 || statusCode === 410) {
          staleIds.push(sub.id);
          return;
        }
        Sentry.withScope((scope) => {
          scope.setTags({ lib: 'webpush', op: 'sendNotification' });
          scope.setContext('webpush', { userId, endpoint: sub.endpoint, statusCode });
          Sentry.captureException(err);
        });
      }
    }),
  );

  if (staleIds.length > 0) {
    await admin.from('push_subscriptions').delete().in('id', staleIds);
  }
}
