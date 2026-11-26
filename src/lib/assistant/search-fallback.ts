export interface PlaceSearchRpcError {
  code?: string | null;
}

export function shouldFallbackToLegacyPlaceSearch(
  error: PlaceSearchRpcError | null | undefined,
): boolean {
  return error?.code === "PGRST202" || error?.code === "42883";
}
