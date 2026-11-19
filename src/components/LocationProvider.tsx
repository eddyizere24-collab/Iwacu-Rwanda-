"use client";

import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import { useLocation } from "@/hooks/useLocation";

type LocationContextValue = ReturnType<typeof useLocation>;

const LocationContext = createContext<LocationContextValue | null>(null);

export function LocationProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const autoLocateStartedRef = useRef(false);

  // Keep the location engine and its movement watch mounted across App Router
  // navigation. Returning from Notifications or Ishakiro must not restart GPS.
  useEffect(() => {
    let cancelled = false;
    if (typeof navigator === "undefined" || !navigator.geolocation || !navigator.permissions) {
      return () => { cancelled = true; };
    }

    void navigator.permissions.query({ name: "geolocation" as PermissionName })
      .then((permission) => {
        if (cancelled || permission.state !== "granted" || autoLocateStartedRef.current) return;
        autoLocateStartedRef.current = true;
        void location.locate();
      })
      .catch(() => {
        // Browsers without the Permissions API keep the explicit location button.
      });

    return () => { cancelled = true; };
  }, [location.locate]);

  return <LocationContext.Provider value={location}>{children}</LocationContext.Provider>;
}

export function useSharedLocation(): LocationContextValue {
  const value = useContext(LocationContext);
  if (!value) throw new Error("useSharedLocation must be used within LocationProvider");
  return value;
}
