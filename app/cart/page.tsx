"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getApiCache } from "@/lib/apiCache";
import { hasMarketplaceAccess, revokeMarketplaceAccess } from "@/lib/marketplaceAccess";
import { SkeletonCartItem } from "@/components/Skeleton";
import { db } from "@/lib/firebase";
import { doc, getDoc, getDocs, collection } from "firebase/firestore";

interface CartItem {
  id: number;
  user_id: number;
  item_id: number;
  quantity: number;
  price?: string;
  variation?: string;
  item: {
    id: number;
    name: string;
    description: string | null;
    price: string;
    stock: number;
    image: string | null;
    attributes?: any;
    user: {
      id: number;
      name: string;
    };
  };
}

export default function CartPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [checkingOut, setCheckingOut] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Voucher / Promo Code State
  const [voucherInput, setVoucherInput] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState<{
    code: string;
    discountType: string;
    discountValue: number;
    minSpend: number;
    discountAmount: number;
  } | null>(null);
  const [availableCoupons, setAvailableCoupons] = useState<
    {
      code: string;
      badge?: string;
      discount_type?: string;
      discount_value?: number;
      min_spend?: number;
      title?: string;
    }[]
  >([]);
  const [validatingVoucher, setValidatingVoucher] = useState(false);
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const [usedVouchers, setUsedVouchers] = useState<string[]>([]);

  const API = "/api";
  const STORAGE_URL = "/storage";

  const getImageUrl = (path?: string | null) => {
    if (!path) return "";
    const clean = path.trim();
    if (clean.includes("data:image/")) {
      const idx = clean.indexOf("data:image/");
      return clean.slice(idx);
    }
    if (
      clean.startsWith("data:") ||
      clean.startsWith("blob:") ||
      clean.startsWith("http://") ||
      clean.startsWith("https://")
    ) {
      return clean;
    }
    if (clean.startsWith("/")) {
      return clean;
    }
    return `${STORAGE_URL}/${clean}`;
  };

  const fetchCart = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login?redirect=/cart");
      return;
    }
    try {
      const cache = getApiCache();
      const data: any = await cache.fetch(`${API}/cart`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      if (data.cart_items) {
        setCartItems(data.cart_items);
        setSelectedItems((prev) => (prev.length === 0 ? data.cart_items.map((i: any) => i.id) : prev));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const loadCoupons = async () => {
      try {
        const snap = await getDocs(collection(db, "coupons"));
        const list: any[] = [];
        snap.forEach((d) => {
          const data = d.data();
          if (data && data.is_active !== false) {
            list.push({
              code: (data.code || d.id).toUpperCase(),
              badge: data.badge || "PROMO",
              discount_type: data.discount_type || "fixed",
              discount_value: Number(data.discount_value ?? data.discount ?? 0),
              min_spend: Number(data.min_spend || 0),
              title: data.title || "",
            });
          }
        });
        if (cancelled) return;
        setAvailableCoupons(list);

        // Load user's past orders to find already used single-use vouchers
        const token = localStorage.getItem("token");
        let pastUsedVouchers: string[] = [];
        if (token) {
          try {
            const ordersRes = await fetch(`${API}/orders`, {
              headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }
            });
            if (ordersRes.ok) {
              const ordersData = await ordersRes.json();
              const orderList = Array.isArray(ordersData.orders) ? ordersData.orders : Array.isArray(ordersData) ? ordersData : [];
              pastUsedVouchers = orderList
                .filter((o: any) => o.status !== "cancelled" && o.coupon_code)
                .map((o: any) => String(o.coupon_code).trim().toUpperCase());
              if (!cancelled) {
                setUsedVouchers(Array.from(new Set(pastUsedVouchers)));
              }
            }
          } catch (e) {
            console.warn("Could not load user order voucher history in cart:", e);
          }
        }

        const savedVoucher = typeof window !== "undefined" ? localStorage.getItem("claimed_voucher") : null;
        if (savedVoucher) {
          const clean = savedVoucher.trim().toUpperCase();
          if (pastUsedVouchers.includes(clean)) {
            localStorage.removeItem("claimed_voucher");
          } else {
            let exists = list.some((c) => c.code === clean);
            if (!exists) {
              try {
                const flashSnap = await getDoc(doc(db, "settings", "flash_deals"));
                if (flashSnap.exists()) {
                  const fData = flashSnap.data();
                  const notExpired = !fData.end_time || new Date(fData.end_time).getTime() > Date.now();
                  if (fData.is_active !== false && notExpired && fData.coupon_code && fData.coupon_code.trim().toUpperCase() === clean) {
                    exists = true;
                  }
                }
              } catch {}
            }
            if (exists) {
              setVoucherInput(clean);
              applyVoucherCode(clean, pastUsedVouchers);
            } else {
              localStorage.removeItem("claimed_voucher");
            }
          }
        }
      } catch (e) {
        console.error("Error loading coupons in cart:", e);
      }
    };

    const verifyAndLoadCart = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setAuthorized(false);
        router.replace("/login?redirect=/cart");
        return;
      }

      try {
        const res = await fetch(`${API}/me`, {
          cache: "no-store",
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        });
        if (cancelled) return;

        if (res.status === 401 || res.status === 403) {
          revokeMarketplaceAccess();
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          localStorage.removeItem("shopply_user");
          localStorage.removeItem("shopply_dashboard_access");
          getApiCache().invalidateAll();
          setAuthorized(false);
          router.replace("/login?redirect=/cart");
          return;
        }

        if (!res.ok) {
          setAuthorized(false);
          window.location.replace("/");
          return;
        }

        setAuthorized(true);
        fetchCart();
        loadCoupons();
      } catch {
        if (!cancelled) {
          setAuthorized(false);
          window.location.replace("/");
        }
      }
    };

    verifyAndLoadCart();

    const handlePageCheck = () => {
      const curToken = localStorage.getItem("token");
      if (!hasMarketplaceAccess(curToken)) {
        setAuthorized(false);
        window.location.replace("/");
      }
    };
    window.addEventListener("pageshow", handlePageCheck);
    window.addEventListener("storage", handlePageCheck);

    return () => {
      cancelled = true;
      window.removeEventListener("pageshow", handlePageCheck);
      window.removeEventListener("storage", handlePageCheck);
    };
  }, []);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const updateQuantity = async (id: number, newQty: number, maxStock: number) => {
    if (newQty < 1 || newQty > maxStock) return;

    setCartItems((items) => items.map((i) => (i.id === id ? { ...i, quantity: newQty } : i)));

    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API}/cart/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        body: JSON.stringify({ quantity: newQty }),
      });
      if (!res.ok) {
        fetchCart();
        showToast("Failed to update quantity", "error");
      }
    } catch {
      fetchCart();
    }
  };

  const removeCartItem = async (id: number) => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API}/cart/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      if (res.ok) {
        setCartItems((items) => items.filter((i) => i.id !== id));
        setSelectedItems((selected) => selected.filter((selId) => selId !== id));
        showToast("Item removed");
      }
    } catch {
      showToast("Failed to remove item", "error");
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedItems((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const toggleSelectAll = () => {
    if (selectedItems.length === cartItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(cartItems.map((i) => i.id));
    }
  };

  const subtotalPrice = cartItems
    .filter((i) => selectedItems.includes(i.id))
    .reduce((sum, item) => sum + parseFloat(item.price || item.item.price) * item.quantity, 0);

  const applyVoucherCode = async (codeToApply?: string, knownUsed?: string[]) => {
    const code = (codeToApply || voucherInput).trim().toUpperCase();
    if (!code) {
      setVoucherError("Please enter a voucher code.");
      return;
    }

    const checkUsed = knownUsed || usedVouchers;
    if (checkUsed.includes(code)) {
      setVoucherError(`You have already used voucher "${code}". Each voucher can only be used once per account.`);
      showToast("Voucher already used", "error");
      setValidatingVoucher(false);
      return;
    }

    setValidatingVoucher(true);
    setVoucherError(null);

    try {
      let data: any = null;
      const voucherRef = doc(db, "coupons", code);
      const voucherSnap = await getDoc(voucherRef);

      if (voucherSnap.exists()) {
        data = voucherSnap.data();
      } else {
        const flashRef = doc(db, "settings", "flash_deals");
        const flashSnap = await getDoc(flashRef);
        if (flashSnap.exists()) {
          const fData = flashSnap.data();
          if (fData.coupon_code && fData.coupon_code.trim().toUpperCase() === code && fData.is_active !== false) {
            data = {
              code,
              discount_type: fData.discount_type || "percent",
              discount_value: fData.discount_value !== undefined ? Number(fData.discount_value) : 20,
              min_spend: 0,
              is_active: true,
            };
          }
        }
      }

      if (!data) {
        setVoucherError(`Voucher "${code}" was not found.`);
        showToast("Voucher not found", "error");
        setValidatingVoucher(false);
        return;
      }

      if (data.is_active === false) {
        setVoucherError(`Voucher "${code}" is inactive or expired.`);
        showToast("Voucher is inactive", "error");
        setValidatingVoucher(false);
        return;
      }

      const minSpend = Number(data.min_spend || 0);
      if (minSpend > 0 && subtotalPrice > 0 && subtotalPrice < minSpend) {
        setVoucherError(`Minimum spend of ₱${minSpend.toLocaleString()} required to use this voucher.`);
        showToast(`Minimum spend of ₱${minSpend.toLocaleString()} required`, "error");
        setValidatingVoucher(false);
        return;
      }

      const discountType = data.discount_type || (data.discount_value ? "fixed" : "percent");
      const discountValue = Number(data.discount_value ?? data.discount ?? 0);

      let calcDiscount = 0;
      if (discountType === "percent") {
        calcDiscount = subtotalPrice > 0 ? (subtotalPrice * discountValue) / 100 : discountValue;
      } else {
        calcDiscount = discountValue;
      }
      if (subtotalPrice > 0) {
        calcDiscount = Math.min(calcDiscount, subtotalPrice);
      }

      setAppliedVoucher({
        code,
        discountType,
        discountValue,
        minSpend,
        discountAmount: calcDiscount,
      });
      setVoucherInput(code);
      if (typeof window !== "undefined") {
        localStorage.setItem("claimed_voucher", code);
      }

      showToast(`Voucher ${code} applied`);
    } catch (err: any) {
      console.error("Voucher validation error:", err);
      setVoucherError("Failed to validate voucher.");
      showToast("Error validating voucher", "error");
    } finally {
      setValidatingVoucher(false);
    }
  };

  const removeVoucher = () => {
    setAppliedVoucher(null);
    setVoucherError(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("claimed_voucher");
    }
    showToast("Voucher removed");
  };

  let currentDiscount = 0;
  if (appliedVoucher) {
    if (appliedVoucher.minSpend > 0 && subtotalPrice < appliedVoucher.minSpend) {
      currentDiscount = 0;
    } else if (appliedVoucher.discountType === "percent") {
      currentDiscount = (subtotalPrice * appliedVoucher.discountValue) / 100;
    } else {
      currentDiscount = appliedVoucher.discountValue;
    }
    currentDiscount = Math.min(currentDiscount, subtotalPrice);
  }

  const finalPrice = Math.max(0, subtotalPrice - currentDiscount);
  const totalItemsCount = cartItems.reduce(
    (acc, item) => acc + (selectedItems.includes(item.id) ? item.quantity : 0),
    0
  );

  const handleCheckout = async () => {
    if (selectedItems.length === 0) return;
    setCheckingOut(true);
    const token = localStorage.getItem("token");

    try {
      const res = await fetch(`${API}/cart/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        body: JSON.stringify({
          cart_item_ids: selectedItems,
          coupon_code: appliedVoucher ? appliedVoucher.code : undefined,
          discount_amount: appliedVoucher ? currentDiscount : 0,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setCartItems((items) => items.filter((i) => !selectedItems.includes(i.id)));
        setSelectedItems([]);
        if (appliedVoucher) {
          setUsedVouchers((prev) => Array.from(new Set([...prev, appliedVoucher.code])));
        }
        setAppliedVoucher(null);
        if (typeof window !== "undefined") {
          localStorage.removeItem("claimed_voucher");
        }
        localStorage.setItem("last_order_time", Date.now().toString());
        window.dispatchEvent(new Event("order_placed"));
        getApiCache().invalidate("/cart");
        getApiCache().invalidate("/orders");
        getApiCache().invalidate("/shop/items");
        showToast("Order placed successfully");
      } else {
        showToast(data.message || "Checkout failed", "error");
      }
    } catch (err: any) {
      console.error("[cart checkout error]:", err);
      showToast(err?.message || "An error occurred during checkout.", "error");
    } finally {
      setCheckingOut(false);
    }
  };

  if (!authorized) {
    return <main style={{ minHeight: "100vh", background: "#F8F9FA" }} />;
  }

  return (
    <>
      <style suppressHydrationWarning>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          background: #F8F9FA;
          color: #111827;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          -webkit-font-smoothing: antialiased;
        }

        /* Clean Navigation */
        .nav {
          background: #FFFFFF;
          border-bottom: 1px solid #E5E7EB;
          padding: 0 32px;
          height: 68px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: sticky;
          top: 0;
          z-index: 50;
        }
        .nav-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
        }
        .logo-text {
          font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
          font-size: 18px;
          font-weight: 800;
          color: #111827;
          letter-spacing: -0.03em;
        }
        .nav-right {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .shop-link {
          font-size: 13.5px;
          font-weight: 600;
          color: #111827;
          text-decoration: none;
          padding: 8px 14px;
          border-radius: 8px;
          background: #FFFFFF;
          border: 1px solid #D1D5DB;
          transition: background 0.15s, border-color 0.15s;
          display: inline-flex;
          align-items: center;
          gap: 7px;
        }
        .shop-link:hover {
          background: #F3F4F6;
          border-color: #9CA3AF;
        }
        .login-btn {
          padding: 8px 16px;
          background: #111827;
          border: 1px solid #111827;
          border-radius: 8px;
          color: #FFFFFF;
          font-size: 13.5px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s;
          text-decoration: none;
        }
        .login-btn:hover {
          background: #1F2937;
        }

        /* Layout */
        .container {
          max-width: 1160px;
          margin: 28px auto 48px;
          padding: 0 24px;
        }

        /* Cart Grid System */
        .cart-grid {
          display: grid;
          grid-template-columns: 40px 4fr 1fr 1.4fr 1fr 84px;
          gap: 16px;
          align-items: center;
        }

        /* Cart Header Row */
        .cart-header {
          background: #FFFFFF;
          padding: 14px 20px;
          border-radius: 10px;
          margin-bottom: 14px;
          color: #6B7280;
          font-size: 12.5px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          border: 1px solid #E5E7EB;
        }

        /* Cart Items */
        .cart-card {
          background: #FFFFFF;
          border-radius: 12px;
          margin-bottom: 14px;
          display: flex;
          flex-direction: column;
          border: 1px solid #E5E7EB;
          box-shadow: 0 1px 2px rgba(17, 24, 39, 0.03);
        }
        .seller-header {
          padding: 12px 20px;
          border-bottom: 1px solid #F3F4F6;
          font-size: 13.5px;
          font-weight: 600;
          color: #111827;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .item-row {
          padding: 18px 20px;
        }

        /* Item Details */
        .product-col {
          display: flex;
          gap: 14px;
        }
        .product-img {
          width: 80px;
          height: 80px;
          object-fit: cover;
          border: 1px solid #E5E7EB;
          border-radius: 8px;
          background: #F9FAFB;
          flex-shrink: 0;
        }
        .product-placeholder {
          width: 80px;
          height: 80px;
          background: #F3F4F6;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #9CA3AF;
          border: 1px solid #E5E7EB;
          border-radius: 8px;
          flex-shrink: 0;
        }
        .product-info {
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 5px;
        }
        .product-name {
          font-size: 14.5px;
          color: #111827;
          font-weight: 600;
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .product-stock {
          font-size: 12.5px;
          color: #6B7280;
        }
        .variation-pill {
          display: inline-flex;
          align-items: center;
          width: fit-content;
          font-size: 12px;
          font-weight: 600;
          color: #374151;
          background: #F3F4F6;
          border: 1px solid #E5E7EB;
          border-radius: 6px;
          padding: 2px 8px;
        }

        /* Price */
        .price-col {
          color: #111827;
          font-size: 14.5px;
          font-weight: 700;
          font-variant-numeric: tabular-nums;
        }
        .unit-price-col {
          font-variant-numeric: tabular-nums;
        }

        /* Quantity Controls */
        .qty-controls {
          display: flex;
          align-items: center;
          border: 1px solid #D1D5DB;
          border-radius: 8px;
          width: fit-content;
          overflow: hidden;
          background: #FFFFFF;
        }
        .qty-btn {
          width: 32px;
          height: 32px;
          background: #FFFFFF;
          border: none;
          color: #374151;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.15s;
        }
        .qty-btn:hover:not(:disabled) {
          background: #F3F4F6;
        }
        .qty-btn:disabled {
          color: #D1D5DB;
          cursor: not-allowed;
          background: #F9FAFB;
        }
        .qty-input {
          width: 40px;
          height: 32px;
          border-left: 1px solid #E5E7EB;
          border-right: 1px solid #E5E7EB;
          border-top: none;
          border-bottom: none;
          text-align: center;
          font-size: 13.5px;
          color: #111827;
          font-weight: 600;
          background: #FFFFFF;
          font-variant-numeric: tabular-nums;
        }

        /* Actions */
        .action-btn {
          background: none;
          border: none;
          color: #6B7280;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          padding: 6px 10px;
          border-radius: 6px;
          transition: color 0.15s, background 0.15s;
        }
        .action-btn:hover {
          color: #DC2626;
          background: #FEF2F2;
        }

        /* Bottom Bar */
        .bottom-bar {
          position: sticky;
          bottom: 20px;
          background: #FFFFFF;
          padding: 18px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          box-shadow: 0 8px 24px rgba(17, 24, 39, 0.06);
          margin-top: 20px;
          border-radius: 12px;
          border: 1px solid #E5E7EB;
          z-index: 40;
        }
        .bottom-left {
          display: flex;
          align-items: center;
          gap: 24px;
        }
        .bottom-right {
          display: flex;
          align-items: center;
          gap: 24px;
        }

        .checkout-btn {
          padding: 13px 32px;
          background: #111827;
          border: 1px solid #111827;
          border-radius: 10px;
          color: #FFFFFF;
          font-size: 14.5px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s;
        }
        .checkout-btn:hover:not(:disabled) {
          background: #1F2937;
        }
        .checkout-btn:disabled {
          background: #E5E7EB;
          border-color: #E5E7EB;
          cursor: not-allowed;
          color: #9CA3AF;
        }

        /* Custom Checkbox */
        .checkbox {
          width: 19px;
          height: 19px;
          border: 1.5px solid #D1D5DB;
          border-radius: 5px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
          background: #FFFFFF;
        }
        .checkbox:hover {
          border-color: #6B7280;
        }
        .checkbox.checked {
          background: #111827;
          border-color: #111827;
        }

        .toast {
          position: fixed;
          top: 80px;
          left: 50%;
          transform: translateX(-50%);
          padding: 12px 20px;
          border-radius: 10px;
          font-size: 13.5px;
          font-weight: 600;
          z-index: 300;
          color: #FFFFFF;
          box-shadow: 0 10px 25px rgba(17, 24, 39, 0.14);
          animation: slideDown 0.2s ease;
        }
        .toast-success { background: #111827; }
        .toast-error { background: #DC2626; }
        @keyframes slideDown {
          from { opacity: 0; transform: translate(-50%, -12px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }

        /* Empty */
        .empty-cart {
          background: #FFFFFF;
          padding: 72px 32px;
          text-align: center;
          border-radius: 14px;
          border: 1px solid #E5E7EB;
        }

        .mobile-details-row { display: none; }

        @media (max-width: 768px) {
          .nav { padding: 0 14px !important; height: 60px !important; }
          .nav-right { gap: 8px !important; }
          .nav-logo { display: flex !important; align-items: center !important; gap: 8px !important; }
          .logo-text { display: inline-block !important; font-size: 16px !important; }
          .cart-title-text { display: none !important; }
          .continue-text { display: none !important; }
          .dashboard-text { display: none !important; }
          .dashboard-icon-span { display: inline-flex !important; color: #FFFFFF; }
          .login-btn {
            width: 36px !important;
            height: 36px !important;
            padding: 0 !important;
            border-radius: 8px !important;
            min-width: 36px !important;
            background: #111827 !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
          }
          .shop-link {
            padding: 0 !important;
            border-radius: 8px !important;
            width: 36px !important;
            height: 36px !important;
            display: inline-flex !important;
            justify-content: center !important;
            align-items: center !important;
            background: #FFFFFF !important;
            color: #111827 !important;
          }
          .container {
            padding: 0 12px !important;
            margin: 16px auto 32px !important;
          }
          .cart-header { display: none !important; }
          .cart-card {
            border-radius: 10px !important;
            margin-bottom: 12px !important;
          }
          .item-row.cart-grid {
            display: grid !important;
            grid-template-columns: 32px 1fr !important;
            gap: 12px !important;
            padding: 16px 12px !important;
            align-items: start !important;
          }
          .chk-col {
            display: flex;
            align-items: center;
            height: 80px;
            justify-content: center;
          }
          .desktop-col { display: none !important; }
          .mobile-details-row {
            display: flex;
            flex-direction: column;
            gap: 10px;
            grid-column: 1 / span 2;
            background: #F9FAFB;
            padding: 12px;
            border-radius: 8px;
            border: 1px solid #E5E7EB;
            margin-top: 4px;
          }
          .mobile-price-row, .mobile-total-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 13px;
          }
          .price-label, .total-label {
            color: #6B7280;
            font-weight: 500;
          }
          .price-value {
            color: #374151;
            font-weight: 600;
            font-variant-numeric: tabular-nums;
          }
          .total-value {
            color: #111827;
            font-weight: 700;
            font-size: 15px;
            font-variant-numeric: tabular-nums;
          }
          .mobile-qty-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-top: 1px solid #E5E7EB;
            border-bottom: 1px solid #E5E7EB;
            padding: 8px 0;
          }
          .remove-btn-mobile {
            padding: 4px 8px !important;
            font-size: 12px !important;
          }
          .bottom-bar {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 14px !important;
            padding: 16px !important;
            bottom: 12px !important;
            border-radius: 12px !important;
          }
          .bottom-left {
            justify-content: space-between !important;
          }
          .bottom-right {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 12px !important;
          }
          .bottom-right > div {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
          }
          .checkout-btn {
            width: 100% !important;
            text-align: center !important;
            padding: 12px !important;
          }
          .empty-cart {
            padding: 48px 16px !important;
          }
        }
      `}</style>

      {/* Navigation */}
      <nav className="nav">
        <Link href="/shop" className="nav-logo">
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <rect x="4" y="9" width="24" height="19" rx="4.5" fill="#111827" />
            <path d="M11 9V7.5a5 5 0 0 1 10 0V9" stroke="#111827" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M11.5 16.5c1.2 2.2 3 3.2 4.5 3.2s3.3-1 4.5-3.2" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
            <circle cx="23" cy="13" r="2" fill="#10B981" />
          </svg>
          <span className="logo-text">Shopply</span>
          <span
            className="cart-title-text"
            style={{
              color: "#6B7280",
              fontSize: "14px",
              marginLeft: 10,
              borderLeft: "1px solid #E5E7EB",
              paddingLeft: 14,
              fontWeight: 500,
            }}
          >
            Shopping Bag
          </span>
        </Link>
        <div className="nav-right">
          <Link href="/shop" className="shop-link">
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="continue-text">Continue Shopping</span>
          </Link>
          <Link href="/dashboard" className="login-btn" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <span className="dashboard-text">Account & Orders</span>
            <span className="dashboard-icon-span" style={{ display: "none", alignItems: "center", justifyContent: "center" }}>
              <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </span>
          </Link>
        </div>
      </nav>

      {toast && <div className={`toast toast-${toast.type}`}>{toast.message}</div>}

      <main className="container">
        {loading ? (
          <div style={{ padding: "24px 0" }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonCartItem key={i} />
            ))}
          </div>
        ) : cartItems.length === 0 ? (
          <div className="empty-cart">
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 16,
                background: "#F3F4F6",
                border: "1px solid #E5E7EB",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
                color: "#6B7280",
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 01-8 0" />
              </svg>
            </div>
            <h2 style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif", fontSize: 20, color: "#111827", marginBottom: 8, fontWeight: 700, letterSpacing: "-0.02em" }}>
              Your shopping bag is empty
            </h2>
            <p style={{ fontSize: 14, color: "#6B7280", marginBottom: 24 }}>
              Browse verified merchants and add items to review them here before checkout.
            </p>
            <Link href="/shop" className="checkout-btn" style={{ textDecoration: "none", display: "inline-block" }}>
              Browse Marketplace
            </Link>
          </div>
        ) : (
          <>
            <div className="cart-header cart-grid">
              <div style={{ display: "flex", justifyContent: "center" }}>
                <div className={`checkbox ${selectedItems.length === cartItems.length ? "checked" : ""}`} onClick={toggleSelectAll}>
                  {selectedItems.length === cartItems.length && (
                    <svg width="12" height="12" fill="none" stroke="#fff" strokeWidth="3" viewBox="0 0 24 24">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
              </div>
              <div>Product</div>
              <div style={{ textAlign: "center" }}>Unit Price</div>
              <div style={{ textAlign: "center" }}>Quantity</div>
              <div style={{ textAlign: "center" }}>Subtotal</div>
              <div style={{ textAlign: "center" }}>Action</div>
            </div>

            {cartItems.map((cartItem) => {
              const item = cartItem.item;
              const isSelected = selectedItems.includes(cartItem.id);

              let maxStock = item.stock;
              let isSizeOutOfStock = false;
              const variation = cartItem.variation;
              if (variation) {
                try {
                  const attrs = typeof item.attributes === "string" ? JSON.parse(item.attributes) : item.attributes || {};
                  if (attrs.sizes && attrs.size_stocks) {
                    const matchedSize = attrs.sizes.find((s: string) => variation.includes(s));
                    if (matchedSize && attrs.size_stocks[matchedSize] !== undefined) {
                      maxStock = attrs.size_stocks[matchedSize];
                      if (maxStock <= 0) isSizeOutOfStock = true;
                    }
                  }
                } catch {}
              }

              return (
                <div key={cartItem.id} className="cart-card">
                  <div className="seller-header">
                    <svg width="16" height="16" fill="none" stroke="#4B5563" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" strokeLinecap="round" strokeLinejoin="round" />
                      <polyline points="9 22 9 12 15 12 15 22" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span>{item.user.name}</span>
                  </div>
                  <div className="item-row cart-grid">
                    <div className="chk-col">
                      <div className={`checkbox ${isSelected ? "checked" : ""}`} onClick={() => toggleSelect(cartItem.id)}>
                        {isSelected && (
                          <svg width="12" height="12" fill="none" stroke="#fff" strokeWidth="3" viewBox="0 0 24 24">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </div>
                    </div>
                    <div className="product-col">
                      {item.image ? (
                        <img
                          src={getImageUrl(item.image)}
                          alt={item.name}
                          className="product-img"
                          loading="lazy"
                          decoding="async"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="product-placeholder">
                          <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <polyline points="21 15 16 10 5 21" />
                          </svg>
                        </div>
                      )}
                      <div className="product-info">
                        <div className="product-name">{item.name}</div>
                        <div className="product-stock" style={isSizeOutOfStock ? { color: "#DC2626", fontWeight: 600 } : {}}>
                          Available stock: {maxStock} {isSizeOutOfStock && "(Out of stock)"}
                        </div>
                        {cartItem.variation && <div className="variation-pill">{cartItem.variation}</div>}
                      </div>
                    </div>
                    <div className="desktop-col unit-price-col" style={{ textAlign: "center", fontWeight: 500, color: "#374151" }}>
                      ₱{parseFloat(cartItem.price || item.price).toFixed(2)}
                    </div>
                    <div className="desktop-col qty-col" style={{ display: "flex", justifyContent: "center" }}>
                      <div className="qty-controls">
                        <button
                          className="qty-btn"
                          onClick={() => updateQuantity(cartItem.id, cartItem.quantity - 1, maxStock)}
                          disabled={cartItem.quantity <= 1}
                        >
                          −
                        </button>
                        <input type="text" className="qty-input" value={cartItem.quantity} readOnly />
                        <button
                          className="qty-btn"
                          onClick={() => updateQuantity(cartItem.id, cartItem.quantity + 1, maxStock)}
                          disabled={cartItem.quantity >= maxStock || isSizeOutOfStock}
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div className="desktop-col total-price-col price-col" style={{ textAlign: "center" }}>
                      ₱{(parseFloat(cartItem.price || item.price) * cartItem.quantity).toFixed(2)}
                    </div>
                    <div className="desktop-col actions-col" style={{ textAlign: "center" }}>
                      <button className="action-btn" onClick={() => removeCartItem(cartItem.id)}>
                        Remove
                      </button>
                    </div>

                    {/* Mobile Details Row */}
                    <div className="mobile-details-row">
                      <div className="mobile-price-row">
                        <span className="price-label">Unit Price</span>
                        <span className="price-value">₱{parseFloat(cartItem.price || item.price).toFixed(2)}</span>
                      </div>
                      <div className="mobile-qty-row">
                        <div className="qty-controls">
                          <button
                            className="qty-btn"
                            onClick={() => updateQuantity(cartItem.id, cartItem.quantity - 1, maxStock)}
                            disabled={cartItem.quantity <= 1}
                          >
                            −
                          </button>
                          <input type="text" className="qty-input" value={cartItem.quantity} readOnly />
                          <button
                            className="qty-btn"
                            onClick={() => updateQuantity(cartItem.id, cartItem.quantity + 1, maxStock)}
                            disabled={cartItem.quantity >= maxStock || isSizeOutOfStock}
                          >
                            +
                          </button>
                        </div>
                        <button className="action-btn remove-btn-mobile" onClick={() => removeCartItem(cartItem.id)}>
                          Remove
                        </button>
                      </div>
                      <div className="mobile-total-row">
                        <span className="total-label">Subtotal</span>
                        <span className="total-value">₱{(parseFloat(cartItem.price || item.price) * cartItem.quantity).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Promo Voucher Redemption Card */}
            <div
              style={{
                background: "#FFFFFF",
                border: "1px solid #E5E7EB",
                borderRadius: 12,
                padding: "18px 20px",
                marginTop: 16,
                marginBottom: 16,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: "#F3F4F6",
                      border: "1px solid #E5E7EB",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#111827",
                      flexShrink: 0,
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
                      <line x1="7" y1="7" x2="7.01" y2="7" />
                    </svg>
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: "#111827", letterSpacing: "-0.01em" }}>
                        Promo Code & Vouchers
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: "#065F46",
                          background: "#ECFDF5",
                          border: "1px solid #A7F3D0",
                          padding: "2px 8px",
                          borderRadius: 999,
                        }}
                      >
                        DISCOUNT
                      </span>
                    </div>
                    <div style={{ fontSize: 12.5, color: "#6B7280", marginTop: 2 }}>
                      Enter a promo code or choose an active voucher below
                    </div>
                  </div>
                </div>

                {appliedVoucher ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        background: "#ECFDF5",
                        border: "1px solid #A7F3D0",
                        padding: "8px 14px",
                        borderRadius: 8,
                        color: "#065F46",
                        fontWeight: 700,
                        fontSize: 13,
                      }}
                    >
                      <span>
                        Applied: <strong>{appliedVoucher.code}</strong>
                      </span>
                      <span
                        style={{
                          color: "#065F46",
                          background: "#D1FAE5",
                          padding: "2px 8px",
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 700,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {appliedVoucher.discountType === "percent"
                          ? `${appliedVoucher.discountValue}% OFF (-₱${currentDiscount.toFixed(2)})`
                          : `-₱${appliedVoucher.discountValue.toFixed(2)}`}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={removeVoucher}
                      style={{
                        background: "#FFFFFF",
                        border: "1px solid #D1D5DB",
                        color: "#374151",
                        cursor: "pointer",
                        fontSize: 12.5,
                        fontWeight: 600,
                        padding: "8px 12px",
                        borderRadius: 8,
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <input
                      type="text"
                      placeholder="ENTER PROMO CODE"
                      value={voucherInput}
                      onChange={(e) => {
                        setVoucherInput(e.target.value.toUpperCase());
                        setVoucherError(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          applyVoucherCode();
                        }
                      }}
                      style={{
                        padding: "9px 14px",
                        border: "1px solid #D1D5DB",
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 700,
                        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                        textTransform: "uppercase",
                        color: "#111827",
                        backgroundColor: "#FFFFFF",
                        minWidth: 190,
                        outline: "none",
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => applyVoucherCode()}
                      disabled={validatingVoucher || !voucherInput.trim()}
                      style={{
                        padding: "9px 18px",
                        background: !voucherInput.trim() || validatingVoucher ? "#E5E7EB" : "#111827",
                        color: !voucherInput.trim() || validatingVoucher ? "#9CA3AF" : "#FFFFFF",
                        border: "none",
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: !voucherInput.trim() || validatingVoucher ? "not-allowed" : "pointer",
                        transition: "background 0.15s",
                      }}
                    >
                      {validatingVoucher ? "Checking..." : "Apply Code"}
                    </button>
                  </div>
                )}
              </div>

              {availableCoupons.length > 0 && !appliedVoucher && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    flexWrap: "wrap",
                    marginTop: 14,
                    paddingTop: 12,
                    borderTop: "1px solid #F3F4F6",
                  }}
                >
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#4B5563" }}>Available vouchers:</span>
                  {availableCoupons.map((c) => {
                    const isUsed = usedVouchers.includes(c.code);
                    return (
                      <button
                        key={c.code}
                        type="button"
                        disabled={isUsed}
                        onClick={() => {
                          if (!isUsed) {
                            setVoucherInput(c.code);
                            applyVoucherCode(c.code);
                          }
                        }}
                        style={{
                          background: isUsed ? "#F3F4F6" : voucherInput === c.code ? "#F3F4F6" : "#F9FAFB",
                          border: isUsed ? "1px solid #E5E7EB" : voucherInput === c.code ? "1.5px solid #111827" : "1px solid #E5E7EB",
                          color: isUsed ? "#9CA3AF" : "#111827",
                          borderRadius: 8,
                          padding: "5px 10px",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: isUsed ? "not-allowed" : "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          opacity: isUsed ? 0.75 : 1,
                        }}
                      >
                        <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{c.code}</span>
                        <span
                          style={{
                            fontSize: 11,
                            color: isUsed ? "#9CA3AF" : "#065F46",
                            background: isUsed ? "#E5E7EB" : "#ECFDF5",
                            padding: "1px 6px",
                            borderRadius: 4,
                            fontWeight: 700,
                          }}
                        >
                          {isUsed ? "Used" : c.discount_type === "percent" ? `${c.discount_value}% OFF` : `₱${c.discount_value} OFF`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {voucherError && (
                <div
                  style={{
                    fontSize: 12.5,
                    color: "#991B1B",
                    background: "#FEF2F2",
                    border: "1px solid #FECACA",
                    padding: "7px 12px",
                    borderRadius: 8,
                    marginTop: 10,
                    fontWeight: 600,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>{voucherError}</span>
                </div>
              )}
            </div>

            <div className="bottom-bar">
              <div className="bottom-left">
                <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={toggleSelectAll}>
                  <div className={`checkbox ${selectedItems.length === cartItems.length && cartItems.length > 0 ? "checked" : ""}`}>
                    {selectedItems.length === cartItems.length && cartItems.length > 0 && (
                      <svg width="12" height="12" fill="none" stroke="#fff" strokeWidth="3" viewBox="0 0 24 24">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                  <span style={{ fontSize: 14, color: "#111827", fontWeight: 600 }}>Select All ({cartItems.length})</span>
                </div>
              </div>

              <div className="bottom-right">
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                  {appliedVoucher && currentDiscount > 0 && (
                    <div style={{ fontSize: 12.5, color: "#6B7280", fontVariantNumeric: "tabular-nums" }}>
                      Subtotal: ₱{subtotalPrice.toFixed(2)} &bull;{" "}
                      <span style={{ color: "#0D6847", fontWeight: 600 }}>Discount: -₱{currentDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  <div style={{ fontSize: 14.5, color: "#4B5563", fontWeight: 500 }}>
                    Total ({totalItemsCount} item{totalItemsCount !== 1 && "s"}):{" "}
                    <span
                      style={{
                        fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
                        fontSize: 24,
                        color: "#111827",
                        fontWeight: 800,
                        marginLeft: 8,
                        fontVariantNumeric: "tabular-nums",
                        letterSpacing: "-0.02em",
                      }}
                    >
                      ₱{finalPrice.toFixed(2)}
                    </span>
                  </div>
                </div>
                <button className="checkout-btn" onClick={handleCheckout} disabled={selectedItems.length === 0 || checkingOut}>
                  {checkingOut ? "Processing..." : "Check Out"}
                </button>
              </div>
            </div>
          </>
        )}
      </main>
    </>
  );
}
