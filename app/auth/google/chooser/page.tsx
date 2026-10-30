"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { grantMarketplaceAccess } from "@/lib/marketplaceAccess";

export default function GoogleChooserPage() {
  const router = useRouter();
  useEffect(() => {
    const token = localStorage.getItem("token");
    const rawUser = localStorage.getItem("user") || localStorage.getItem("shopply_user");
    if (token && rawUser) {
      try {
        const parsed = JSON.parse(rawUser);
        if (parsed?.id && parsed?.email_verified_at) {
          grantMarketplaceAccess(token);
          window.location.replace("/dashboard?notice=already_authenticated");
          return;
        }
      } catch {}
    }
    router.replace("/login");
  }, [router]);
  return null;
}
