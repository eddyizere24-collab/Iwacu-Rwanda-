"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bell, BellOff, BellRing } from "lucide-react";
import type { LocateSuccess } from "@/types/location";
import type { LocationStatus } from "@/hooks/useLocation";
import { getLocationNotificationTarget } from "@/lib/location-notifications";

const STORAGE_KEY = "iwacu-location-notifications-enabled-v1";

type PermissionState = NotificationPermission | "unsupported";

interface LocationChangeNotificationsProps {
  data: LocateSuccess | null;
  status: LocationStatus;
}

async function showPersistentNotification(title: string, body: string): Promise<void> {
  if (!("serviceWorker" in navigator)) {
    throw new Error("service_worker_unavailable");
  }

  const registration = await navigator.serviceWorker.ready;
  await registration.showNotification(title, {
    body,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: "iwacu-location-change",
    renotify: true,
    data: { url: "/" },
  });
}

export function LocationChangeNotifications({
  data,
  status,
}: LocationChangeNotificationsProps) {
  const [permission, setPermission] = useState<PermissionState>("default");
  const [enabled, setEnabled] = useState(false);
  const [notice, setNotice] = useState("");
  const lastLocationKeyRef = useRef<string | null>(null);

  const target = useMemo(() => getLocationNotificationTarget(data), [data]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const supported =
      window.isSecureContext &&
      "Notification" in window &&
      "serviceWorker" in navigator;

    if (!supported) {
      setPermission("unsupported");
      return;
    }

    const currentPermission = Notification.permission;
    setPermission(currentPermission);

    try {
      setEnabled(
        currentPermission === "granted" &&
        window.localStorage.getItem(STORAGE_KEY) === "true"
      );
    } catch {
      setEnabled(false);
    }
  }, []);

  const sendNotification = useCallback(async (body: string) => {
    try {
      await showPersistentNotification("IWACU RWANDA — Aho uri hahindutse", body);
    } catch {
      setNotice("Ntibyashobotse kohereza ubutumwa. Reba niba browser yemera Notifications.");
    }
  }, []);

  useEffect(() => {
    if (!target || status !== "success") return;

    const previousKey = lastLocationKeyRef.current;
    lastLocationKeyRef.current = target.key;

    // Notifications are only sent when the supported administrative path changes.
    // GPS jitter and estimated lower-level guesses do not produce notifications.
    if (
      !enabled ||
      permission !== "granted" ||
      !previousKey ||
      previousKey === target.key ||
      (data?.source !== "gps" && data?.source !== "network")
    ) {
      return;
    }

    void sendNotification(target.body);
  }, [data?.source, enabled, permission, sendNotification, status, target]);

  const enableNotifications = async () => {
    setNotice("");

    if (permission === "unsupported") {
      setNotice("Iyi browser ntiyemera ubutumwa bwa Notification muri ubu buryo. Gerageza Chrome igezweho kuri HTTPS.");
      return;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result !== "granted") {
        setEnabled(false);
        setNotice(
          result === "denied"
            ? "Ubutumwa bwanzwe na browser. Bwemere muri Site settings → Notifications."
            : "Ntabwo uratanga uburenganzira bwo kwakira ubutumwa."
        );
        return;
      }

      window.localStorage.setItem(STORAGE_KEY, "true");
      setEnabled(true);
      lastLocationKeyRef.current = target?.key ?? null;
      setNotice("Byemewe. Iwacu Rwanda izakumenyesha igihe aho uri hazaba hahindutse.");
      await showPersistentNotification(
        "IWACU RWANDA — Ubutumwa bwemewe",
        target?.body ?? "Kumenyesha impinduka z'aho uri byatangiye."
      );
    } catch {
      setNotice("Ntibyashobotse gufungura ubutumwa. Ongera ugerageze muri browser settings.");
    }
  };

  const disableNotifications = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, "false");
    } catch {
      // The in-memory preference still takes effect for this page session.
    }
    setEnabled(false);
    setNotice("Ubutumwa bw'aho uri bwahagaritswe.");
  };

  return (
    <section
      aria-label="Ubutumwa bw'impinduka z'aho uri"
      className="mx-auto my-5 flex max-w-3xl flex-col gap-3 rounded-2xl border border-emerald-200 bg-white/95 p-4 text-left shadow-sm sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-800">
          {enabled ? <BellRing className="h-5 w-5" aria-hidden /> : <Bell className="h-5 w-5" aria-hidden />}
        </span>
        <div>
          <h2 className="text-sm font-bold text-slate-900">Ubutumwa bw'impinduka z'aho uri</h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">
            {permission === "unsupported"
              ? "Browser yawe ntiyemera ubu buryo bw'ubutumwa."
              : enabled
                ? "Burakora. Uzakira ubutumwa igihe urwego rw'aho uri ruhindutse kandi Location ikomeje gukurikirana telefone."
                : "Emera ubutumwa bwa browser kugira ngo umenye igihe aho uri hahindutse."}
          </p>
          {notice && <p role="status" aria-live="polite" className="mt-2 text-xs font-medium text-emerald-800">{notice}</p>}
        </div>
      </div>

      {enabled ? (
        <button
          type="button"
          onClick={disableNotifications}
          className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <BellOff className="h-4 w-4" aria-hidden />
          Hagarika
        </button>
      ) : (
        <button
          type="button"
          onClick={enableNotifications}
          disabled={permission === "unsupported"}
          className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-xl bg-[#20603D] px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-[#17492D] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Bell className="h-4 w-4" aria-hidden />
          Emera ubutumwa
        </button>
      )}
    </section>
  );
}
