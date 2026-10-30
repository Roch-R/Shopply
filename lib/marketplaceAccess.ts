// Shopply marketplace is open to all visitors to browse catalog items.
// When signed in, session tokens are preserved for purchases and dashboard.
const ACCESS_KEY = "shopply_marketplace_session_v2";

export function grantMarketplaceAccess(token: string) {
  if (token && typeof window !== "undefined") {
    try {
      sessionStorage.setItem(ACCESS_KEY, token);
    } catch {}
  }
}

export function revokeMarketplaceAccess() {
  if (typeof window !== "undefined") {
    try {
      sessionStorage.removeItem(ACCESS_KEY);
    } catch {}
  }
}

export function hasMarketplaceAccess(_token?: string | null) {
  return true;
}
