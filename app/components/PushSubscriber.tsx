"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

const STORAGE_KEY = "kith-push-prompted";

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const output = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

async function postSubscription(sub: PushSubscription): Promise<void> {
  const json = sub.toJSON();
  const endpoint = json.endpoint;
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;
  if (!endpoint || !p256dh || !auth) return;
  await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint, p256dh, auth }),
    keepalive: true,
  }).catch(() => {});
}

export default function PushSubscriber() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (!("PushManager" in window)) return;
    if (!("Notification" in window)) return;

    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) return;

    let cancelled = false;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled || !user) return;

      const registration = await navigator.serviceWorker.ready.catch(() => null);
      if (cancelled || !registration) return;

      const existing = await registration.pushManager
        .getSubscription()
        .catch(() => null);
      if (existing) {
        await postSubscription(existing);
        return;
      }

      if (localStorage.getItem(STORAGE_KEY) === "true") return;
      if (Notification.permission === "denied") {
        localStorage.setItem(STORAGE_KEY, "true");
        return;
      }

      let permission: NotificationPermission = Notification.permission;
      if (permission === "default") {
        permission = await Notification.requestPermission();
      }
      localStorage.setItem(STORAGE_KEY, "true");
      if (permission !== "granted") return;

      const sub = await registration.pushManager
        .subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        })
        .catch(() => null);
      if (!sub || cancelled) return;
      await postSubscription(sub);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
