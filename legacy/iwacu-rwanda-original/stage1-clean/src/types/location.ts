import type { EmergencyNumber } from "./emergency";
import type { ConfidenceMatch } from "./boundary";
import type { LeaderPublic } from "./leader";

/** All error states */
export type LocationErrorCode =
  | "GPS_DENIED"
  | "GPS_TIMEOUT"
  | "GPS_UNAVAILABLE"
  | "INVALID_COORDINATES"
  | "DATA_NOT_AVAILABLE"
  | "DATABASE_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "GPS_ACCURACY_TOO_LOW"
  | "OUTSIDE_RWANDA"
  | "POINT_IN_GAP"
  | "POINT_IN_OVERLAP"
  | "CONFIDENCE_TOO_LOW"
  | "MISSING_LEADER_CONTACT"
  | "NETWORK_ERROR"
  | "NOT_FOUND"
  | "SLOW_NETWORK"
  | "OFFLINE_CACHE"
  | "BROWSER_NOT_SUPPORTED"
  | "RATE_LIMIT"
  | "CONCURRENT_EDIT_CONFLICT"
  | "LEADER_MISSING"
  | "VALIDATION_ERROR"
  | "DUPLICATE_LEADER"
  | "INVALID_STATE_TRANSITION";

export interface LocateRequest {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export interface LocateSuccess {
  status: "success";
  matches: ConfidenceMatch[];
  hierarchy: {
    village?: ConfidenceMatch;
    cell?: ConfidenceMatch;
    sector?: ConfidenceMatch;
    district?: ConfidenceMatch;
  };
  leaders: LeaderPublic[];
  emergency?: EmergencyNumber[];
  source: "gps" | "ip" | "manual" | "offline";
  leaders_notice?: { message_kiny: string; message_eng: string };
  warning?: { code: string; message_kiny: string; message_eng: string };
}

export interface LocateError {
  status: "error";
  code: LocationErrorCode;
  message_kiny: string;
  message_eng: string;
  details?: Record<string, unknown>;
}

export type LocateResponse = LocateSuccess | LocateError;
