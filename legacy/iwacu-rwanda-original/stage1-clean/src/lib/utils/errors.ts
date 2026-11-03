import type { LocationErrorCode } from "@/types/location";

const ERROR_CATALOGUE: Record<LocationErrorCode, { message_kiny: string; message_eng: string }> = {
  GPS_DENIED: {
    message_kiny: "Ugomba kwemera GPS kugira ngo tubone aho uri.",
    message_eng: "Please allow GPS access so we can locate you.",
  },
  GPS_ACCURACY_TOO_LOW: {
    message_kiny: "GPS ntabwo iri mu buryo bwizewe (accuracy > 150m). Gerageza mu kirere gifunguye.",
    message_eng: "GPS accuracy is too low (>150 m). Try outdoors.",
  },
  OUTSIDE_RWANDA: {
    message_kiny: "Aho uri ntabwo ari mu Rwanda. Iyi serivisi ikorera mu Rwanda gusa.",
    message_eng: "Your location is outside Rwanda. This service works only inside Rwanda.",
  },
  POINT_IN_GAP: {
    message_kiny: "Ntabwo twabonye umudugudu ku aho uri. Gerageza hafi cyangwa shakisha manuelle.",
    message_eng: "No village found at this point. Move slightly or search manually.",
  },
  POINT_IN_OVERLAP: {
    message_kiny: "Aho uri gihuza imirenge ibiri. Reba abayobozi bose.",
    message_eng: "Location sits on a boundary overlap. Showing all relevant leaders.",
  },
  CONFIDENCE_TOO_LOW: {
    message_kiny: "Icyizere gito cyane. Gerageza GPS cyangwa shakisha manuelle.",
    message_eng: "Confidence too low. Retry GPS or search manually.",
  },
  MISSING_LEADER_CONTACT: {
    message_kiny: "Umuyobozi abonetse ariko nta telefone. Vugana na serivisi y'abaturage.",
    message_eng: "Leader found but no phone number available.",
  },
  GPS_TIMEOUT: {
    message_kiny: "GPS yatinze gusubiza. Gerageza mu kirere gifunguye cyangwa wongere ugerageze.",
    message_eng: "GPS took too long to respond. Try outdoors or try again.",
  },
  GPS_UNAVAILABLE: {
    message_kiny: "Telefone ntiyashoboye kumenya aho uri. Reba ko GPS ifunguye hanyuma wongere ugerageze.",
    message_eng: "Your device could not determine your position. Check that location is on and try again.",
  },
  INVALID_COORDINATES: {
    message_kiny: "Imyanya yoherejwe ntabwo yemewe.",
    message_eng: "The coordinates sent are not valid.",
  },
  DATA_NOT_AVAILABLE: {
    message_kiny: "Imipaka y'aka gace ntiraboneka muri sisitemu. Si ikibazo cya GPS yawe.",
    message_eng: "Boundary data for this area is not available yet. This is not a GPS problem.",
  },
  DATABASE_ERROR: {
    message_kiny: "Seriveri ifite ikibazo. Si ikibazo cya GPS yawe. Ongera ugerageze nyuma.",
    message_eng: "The server had a problem. This is not a GPS issue. Please try again later.",
  },
  UNAUTHORIZED: {
    message_kiny: "Ugomba kubanza kwinjira muri sisitemu.",
    message_eng: "Please sign in first.",
  },
  FORBIDDEN: {
    message_kiny: "Nta burenganzira ufite kuri iki gikorwa.",
    message_eng: "You do not have permission for this action.",
  },
  NETWORK_ERROR: {
    message_kiny: "Ikibazo cy'urukurikirane. Ongera ugerageze.",
    message_eng: "Network error. Please try again.",
  },
  NOT_FOUND: {
    message_kiny: "Ntabwo byabonetse.",
    message_eng: "Not found.",
  },
  SLOW_NETWORK: {
    message_kiny: "Urukurikirane ruri gake. Tegereza gato.",
    message_eng: "Slow network. Please wait.",
  },
  OFFLINE_CACHE: {
    message_kiny: "Uri offline. Dukoresha amakuru yabitswe y'umurenge wawe.",
    message_eng: "You are offline. Using cached sector data.",
  },
  BROWSER_NOT_SUPPORTED: {
    message_kiny: "Browser yawe ntabwo ishyigikira GPS. Gerageza indi.",
    message_eng: "Your browser does not support geolocation.",
  },
  RATE_LIMIT: {
    message_kiny: "Wakoze ibisabwa byinshi. Tegereza gato hanyuma ugerageze.",
    message_eng: "Too many requests. Please wait a minute and try again.",
  },
  CONCURRENT_EDIT_CONFLICT: {
    message_kiny: "Ubundi mukoresha ahinduye amakuru. Reba itandukaniro.",
    message_eng: "Another user modified this record. Review the difference.",
  },
  VALIDATION_ERROR: {
    message_kiny: "Amakuru yoherejwe ntabwo yemewe. Reba imirima yagaragajwe.",
    message_eng: "The submitted data is not valid. Check the highlighted fields.",
  },
  DUPLICATE_LEADER: {
    message_kiny: "Uyu muyobozi asanzwe ariho cyangwa uwo mwanya urimo undi muyobozi.",
    message_eng: "This leader already exists, or the position is already held by another record.",
  },
  INVALID_STATE_TRANSITION: {
    message_kiny: "Iki gikorwa ntikemewe ku buryo uyu muyobozi ameze ubu.",
    message_eng: "This action is not allowed for the record's current status.",
  },
  LEADER_MISSING: {
    message_kiny:
      "Amakuru y'aho uri yabonetse. Abayobozi b'uyu mudugudu ntabwo barinjizwa muri sisitemu; bizashyirwaho n'ubuyobozi vuba.",
    message_eng:
      "Your location was found. Leaders for this village are not yet in the system; they will be added by administrators soon.",
  },
};

export function createLocateError(code: LocationErrorCode, details?: Record<string, unknown>) {
  const entry = ERROR_CATALOGUE[code] ?? ERROR_CATALOGUE.NETWORK_ERROR;
  return {
    status: "error" as const,
    code,
    message_kiny: entry.message_kiny,
    message_eng: entry.message_eng,
    details,
  };
}

export const LEADERS_NOT_YET_REGISTERED = {
  message_kiny:
    "Aho uri habonetse. Abayobozi b'uyu mudugudu ntabwo barinjizwa muri sisitemu, bizashyirwaho n'ubuyobozi vuba.",
  message_eng:
    "Your location was found. Leaders for this place are not yet registered; administrators will add them soon.",
};
