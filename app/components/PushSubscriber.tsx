"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const STORAGE_KEY = "kith-push-prompted";
const SESSION_DISMISS_KEY = "kith-push-dismissed";

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

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia?.("(display-mode: standalone)").matches) return true;
  const nav = navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true;
}

export default function PushSubscriber() {
  const [registration, setRegistration] =
    useState<ServiceWorkerRegistration | null>(null);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const hasWindow = typeof window !== "undefined";
    const hasSW = hasWindow && "serviceWorker" in navigator;
    const hasPush = hasWindow && "PushManager" in window;
    const hasNotif = hasWindow && "Notification" in window;
    const standalone = isStandalone();
    const permission = hasNotif ? Notification.permission : "unsupported";
    // eslint-disable-next-line no-console
    console.log("[PushSubscriber] mounted", {
      standalone,
      hasSW,
      hasPush,
      hasNotif,
      permission,
    });

    if (!hasWindow || !hasSW || !hasPush || !hasNotif) return;

    const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!key) {
      // eslint-disable-next-line no-console
      console.log("[PushSubscriber] missing NEXT_PUBLIC_VAPID_PUBLIC_KEY");
      return;
    }

    let cancelled = false;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled || !user) return;

      const reg = await navigator.serviceWorker.ready.catch(() => null);
      if (cancelled || !reg) return;

      const existing = await reg.pushManager.getSubscription().catch(() => null);
      if (existing) {
        await postSubscription(existing);
        return;
      }

      if (Notification.permission === "granted") {
        const sub = await reg.pushManager
          .subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(key),
          })
          .catch(() => null);
        if (sub && !cancelled) await postSubscription(sub);
        return;
      }

      if (Notification.permission === "denied") {
        localStorage.setItem(STORAGE_KEY, "true");
        return;
      }

      if (localStorage.getItem(STORAGE_KEY) === "true") return;
      if (sessionStorage.getItem(SESSION_DISMISS_KEY) === "true") return;

      setRegistration(reg);
      setPublicKey(key);
      setVisible(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleEnable() {
    if (!registration || !publicKey || busy) return;
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      localStorage.setItem(STORAGE_KEY, "true");
      if (permission !== "granted") {
        setVisible(false);
        return;
      }
      const sub = await registration.pushManager
        .subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        })
        .catch(() => null);
      if (sub) await postSubscription(sub);
    } finally {
      setBusy(false);
      setVisible(false);
    }
  }

  function handleDismiss() {
    sessionStorage.setItem(SESSION_DISMISS_KEY, "true");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Enable notifications"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-100 bg-white"
    >
      <div className="max-w-[680px] mx-auto px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-sm text-stone-700">
          Get notified when friends reach out on Kith.
        </p>
        <div className="flex items-center gap-3 sm:shrink-0">
          <button
            type="button"
            onClick={handleDismiss}
            disabled={busy}
            className="text-sm text-stone-500 hover:text-stone-700 transition-colors disabled:opacity-50"
          >
            Not now
          </button>
          <button
            type="button"
            onClick={handleEnable}
            disabled={busy}
            className="text-sm bg-stone-800 text-white px-4 py-1.5 rounded-full hover:bg-stone-700 transition-colors disabled:opacity-50"
          >
            Enable
          </button>
        </div>
      </div>
    </div>
  );
}
