"use client";

import {
  AlertTriangle,
  MapPinOff,
  WifiOff,
  ShieldOff,
  SearchX,
  Clock,
  RefreshCw,
  Smartphone,
  Ban,
  Users,
  HelpCircle,
} from "lucide-react";
import type { LocationErrorCode } from "@/types/location";

interface ErrorDisplayProps {
  code: LocationErrorCode | string;
  message?: string;
  messageKiny?: string;
  messageEng?: string | null;
  onRetry?: () => void;
  className?: string;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  GPS_DENIED: ShieldOff,
  GPS_TIMEOUT: Clock,
  GPS_UNAVAILABLE: MapPinOff,
  INVALID_COORDINATES: AlertTriangle,
  DATA_NOT_AVAILABLE: SearchX,
  DATABASE_ERROR: AlertTriangle,
  UNAUTHORIZED: ShieldOff,
  FORBIDDEN: Ban,
  GPS_ACCURACY_TOO_LOW: MapPinOff,
  OUTSIDE_RWANDA: MapPinOff,
  POINT_IN_GAP: SearchX,
  POINT_IN_OVERLAP: AlertTriangle,
  CONFIDENCE_TOO_LOW: MapPinOff,
  MISSING_LEADER_CONTACT: Users,
  NETWORK_ERROR: WifiOff,
  NOT_FOUND: SearchX,
  SLOW_NETWORK: Clock,
  OFFLINE_CACHE: WifiOff,
  BROWSER_NOT_SUPPORTED: Smartphone,
  RATE_LIMIT: Ban,
  RATE_LIMITED: Ban,
  CONCURRENT_EDIT_CONFLICT: RefreshCw,
  VALIDATION_ERROR: AlertTriangle,
  DUPLICATE_LEADER: Users,
  INVALID_STATE_TRANSITION: Ban,
  LEADER_MISSING: Users,
  PERMISSION_DENIED: ShieldOff,
  POSITION_UNAVAILABLE: MapPinOff,
  TIMEOUT: Clock,
  OUT_OF_SCOPE: MapPinOff,
  UNKNOWN: HelpCircle,
  SUPABASE_NOT_CONFIGURED: AlertTriangle,
};

const TITLE_KINY: Record<string, string> = {
  GPS_DENIED: "GPS yanze",
  GPS_TIMEOUT: "GPS yatinze",
  GPS_UNAVAILABLE: "GPS ntiboneka",
  INVALID_COORDINATES: "Imyanya ntiyemewe",
  DATA_NOT_AVAILABLE: "Amakuru y'aka gace ntaraboneka",
  DATABASE_ERROR: "Seriveri ifite ikibazo",
  UNAUTHORIZED: "Ugomba kwinjira",
  FORBIDDEN: "Nta burenganzira",
  GPS_ACCURACY_TOO_LOW: "GPS ntabwo iri ku buryo bwiza",
  OUTSIDE_RWANDA: "Uri hanze y'u Rwanda",
  POINT_IN_GAP: "Ahantu hatabonetse",
  POINT_IN_OVERLAP: "Ahantu hagaragara mu bice byinshi",
  CONFIDENCE_TOO_LOW: "Icyizere gito cyane",
  MISSING_LEADER_CONTACT: "Nta numero ya telefone",
  NETWORK_ERROR: "Ikibazo cy'urukurikirane",
  NOT_FOUND: "Nticyabonetse",
  SLOW_NETWORK: "Urukurikirane rurasize",
  OFFLINE_CACHE: "Uri offline",
  BROWSER_NOT_SUPPORTED: "Browser ntabwo ishyigikiwe",
  RATE_LIMIT: "Byinshi cyane",
  RATE_LIMITED: "Wageze ku gipimo",
  CONCURRENT_EDIT_CONFLICT: "Impinduka zihuye",
  VALIDATION_ERROR: "Amakuru ntiyemewe",
  DUPLICATE_LEADER: "Uyu muyobozi asanzwe ahari",
  INVALID_STATE_TRANSITION: "Iki gikorwa ntikemewe",
  LEADER_MISSING: "Nta muyobozi uhari",
  PERMISSION_DENIED: "Uruhushya rwa GPS ntirwahabwe",
  POSITION_UNAVAILABLE: "Ahantu ntibashoboye kuboneka",
  TIMEOUT: "Igihe cyarangiye",
  OUT_OF_SCOPE: "Uri hanze y'u Rwanda",
  UNKNOWN: "Ikibazo kitazwi",
  SUPABASE_NOT_CONFIGURED: "Serivisi ntiyateguwe",
};

export function ErrorDisplay({
  code,
  message,
  messageKiny,
  messageEng,
  onRetry,
  className = "",
}: ErrorDisplayProps) {
  const Icon = ICON_MAP[code] ?? HelpCircle;
  const title = TITLE_KINY[code] ?? TITLE_KINY.UNKNOWN;
  const body = messageKiny || message || TITLE_KINY[code] || "Habaye ikibazo.";

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`mx-auto w-full max-w-md rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center shadow-sm ${className}`}
    >
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
        <Icon className="h-6 w-6 text-destructive" />
      </div>
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
      {messageEng && messageEng !== body && (
        <p className="mt-1 text-xs text-muted-foreground/80">{messageEng}</p>
      )}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <RefreshCw className="h-4 w-4" />
          Ongera ugerageze
        </button>
      )}
    </div>
  );
}
