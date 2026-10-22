// This is a navigation gate, not authentication. The shop still validates /api/me.
// Keep access in this tab and tie it to the current login instead of shared flags.
const ACCESS_KEY = "shopply_marketplace_session_v2";

export function grantMarketplaceAccess(token: string) {
  if (token) sessionStorage.setItem(ACCESS_KEY, token);
}

export function revokeMarketplaceAccess() {
  sessionStorage.removeItem(ACCESS_KEY);
}

export function hasMarketplaceAccess(token: string | null) {
  return Boolean(token && sessionStorage.getItem(ACCESS_KEY) === token);
}
