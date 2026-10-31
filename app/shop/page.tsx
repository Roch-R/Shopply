"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { hasMarketplaceAccess, revokeMarketplaceAccess } from "@/lib/marketplaceAccess";
import { getApiCache, createSmartPoller } from "@/lib/apiCache";
import MeetupMap from "@/components/MeetupMap";
import { SkeletonShopCard, SkeletonChatMessage } from "@/components/Skeleton";
import { collection, query, where, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import SiteLockSeal from "@/components/SiteLockSeal";

interface ShopItem {
  id: number;
  name: string;
  description: string | null;
  price: string;
  stock: number;
  image: string | null;
  category: string | null;
  reviews_count?: number;
  reviews_avg_rating?: number | string | null;
  sold_count?: number | null;
  attributes: {
    sizes?: string[];
    specs?: { key: string; value: string }[];
    colors?: string[];
    variant_prices?: string[];
    variant_image_paths?: string[];
    main_images?: string[];
    size_stocks?: Record<string, number>;
    video_path?: string;
    description_images?: string[];
  } | null;
  user: {
    id: number;
    name: string;
    avatar?: string | null;
    created_at?: string;
    items_count?: number;
    reviews_count?: number;
    followers_count?: number;
    total_orders?: number;
    accepted_orders?: number;
    is_online?: boolean | number;
    location?: string | null;
  };
  created_at: string;
}

interface Review {
  id: number;
  user: {
    id: number;
    name: string;
  };
  rating: number;
  created_at: string;
  comment: string;
  variation: string;
  images?: string[];
}

const compressImage = (file: File, maxWidth: number = 800): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = event => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        canvas.toBlob(blob => {
          if (blob) resolve(new File([blob], file.name, { type: file.type, lastModified: Date.now() }));
          else reject(new Error('Canvas is empty'));
        }, file.type, 0.7);
      };
      img.onerror = error => reject(error);
    };
    reader.onerror = error => reject(error);
  });
};

const parseItemAttributes = (item: any): NonNullable<ShopItem["attributes"]> | null => {
  if (!item || !item.attributes) return null;
  if (typeof item.attributes === "string") {
    try {
      const parsed = JSON.parse(item.attributes);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch {
      return null;
    }
  }
  return typeof item.attributes === "object" ? item.attributes : null;
};

const normalizeCatalogItems = (rawItems: any[]): ShopItem[] => {
  if (!Array.isArray(rawItems)) return [];
  return rawItems.map((it) => ({
    ...it,
    attributes: parseItemAttributes(it),
  }));
};

const calculateTotalStock = (item: any) => {
  try {
    const attrs = parseItemAttributes(item);
    if (attrs && attrs.size_stocks && Object.keys(attrs.size_stocks).length > 0) {
      const sum = Object.values(attrs.size_stocks).reduce((acc: number, qty: any) => acc + Number(qty || 0), 0);
      return sum;
    }
  } catch (e) {
    console.error("calculateTotalStock error", e);
  }
  return Number(item?.stock || 0);
};

const isFootwearCategory = (cat?: string | null) => {
  if (!cat) return false;
  const c = cat.trim().toLowerCase();
  return c === "footwear" || c === "shoes" || c === "shoe";
};

const CURATED_CATEGORIES = [
  { id: "All", label: "All Items" },
  { id: "Electronics", label: "Electronics" },
  { id: "Fashion", label: "Apparel" },
  { id: "Footwear", label: "Footwear" },
  { id: "Beauty", label: "Personal Care" },
  { id: "Home", label: "Home & Living" },
  { id: "Accessories", label: "Bags & Watches" },
  { id: "Sports", label: "Sports" },
  { id: "Groceries", label: "Groceries" },
  { id: "Gaming", label: "Gaming" }
];

export default function ShopPage() {
  const router = useRouter();
  const [access, setAccess] = useState<"checking" | "allowed" | "error">("checking");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

    if (!token) {
      // STRICT SECURITY: Unauthenticated visitors are strictly blocked from the marketplace
      router.replace("/login");
      if (typeof window !== "undefined" && window.location?.replace) {
        window.location.replace("/login");
      }
      return;
    }

    // Authenticated user: validate session with /api/me
    fetch("/api/me", {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async response => {
        if (controller.signal.aborted) return;
        if (response.status === 401 || response.status === 403 || !response.ok) {
          // Session expired or invalid: strictly block and send to login
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          localStorage.removeItem("shopply_user");
          getApiCache().invalidateAll();
          router.replace("/login");
          if (typeof window !== "undefined" && window.location?.replace) {
            window.location.replace("/login");
          }
          return;
        }
        const data = await response.json();
        if (controller.signal.aborted) return;
        if (!data.user?.id) {
          localStorage.removeItem("token");
          router.replace("/login");
          if (typeof window !== "undefined" && window.location?.replace) {
            window.location.replace("/login");
          }
          return;
        }
        localStorage.setItem("user", JSON.stringify(data.user));
        setAccess("allowed");
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          localStorage.removeItem("token");
          router.replace("/login");
          if (typeof window !== "undefined" && window.location?.replace) {
            window.location.replace("/login");
          }
        }
      });

    return () => {
      controller.abort();
    };
  }, [router, attempt]);

  if (access === "allowed") return <MarketplaceContent />;

  return (
    <main style={{ minHeight: "100vh", background: "#F7F7F5", display: "grid", placeItems: "center", padding: 24 }}>
      <div role="status" aria-live="polite" style={{ textAlign: "center", color: "#374151" }}>
        {access === "error" ? (
          <>
            <p>We couldn’t connect to your account. Please try again.</p>
            <button type="button" onClick={() => { setAccess("checking"); setAttempt(value => value + 1); }} style={{ marginTop: 16, padding: "11px 22px", border: 0, borderRadius: 8, background: "#111827", color: "#FFFFFF", fontWeight: 600, cursor: "pointer" }}>
              Try again
            </button>
          </>
        ) : (
          <div style={{ width: 32, height: 32, border: "2.5px solid #E5E7EB", borderTopColor: "#111827", borderRadius: "50%", animation: "spin .7s linear infinite", margin: "0 auto" }} />
        )}
      </div>
    </main>
  );
}

function MarketplaceContent() {
  const [items, setItems] = useState<ShopItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewItem, setViewItem] = useState<ShopItem | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<number | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [buyModal, setBuyModal] = useState<{item: ShopItem, variation: string, price: string, variantIdx: number} | null>(null);
  const [buying, setBuying] = useState(false);
  const [addingToCart, setAddingToCart] = useState<number | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cartCount, setCartCount] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [activeImageIdx, setActiveImageIdx] = useState<number>(0);
  const [followedSellers, setFollowedSellers] = useState<Record<number, boolean>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [flashCountdown, setFlashCountdown] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [flashConfig, setFlashConfig] = useState<{
    is_active: boolean;
    end_time: string;
    badge_text: string;
    coupon_code?: string;
    discount_type?: string;
    discount_value?: number;
    items: Array<{
      item_id: number;
      flash_price: number;
      discount_pct: number;
      claimed_pct: number;
      stock: number;
    }>;
  }>({
    is_active: false,
    end_time: "",
    badge_text: "Limited-Time Deals",
    coupon_code: undefined,
    discount_type: undefined,
    discount_value: undefined,
    items: []
  });

  // Real-time Firestore subscription for Flash Deals
  useEffect(() => {
    try {
      const flashDocRef = doc(db, "settings", "flash_deals");
      const unsub = onSnapshot(flashDocRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data() as any;
          const isExpired = new Date(data.end_time).getTime() <= Date.now();
          const items = isExpired ? [] : (Array.isArray(data.items) ? data.items : []);

          if (isExpired && Array.isArray(data.items) && data.items.length > 0) {
            fetch("/api/flash-deals/clear-expired", { method: "POST" }).catch(() => {});
          }

          setFlashConfig({
            is_active: data.is_active !== false && !isExpired,
            end_time: data.end_time || new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
            badge_text: data.badge_text || "Up to 50% OFF Limited Time",
            coupon_code: data.coupon_code || undefined,
            discount_type: data.discount_type || undefined,
            discount_value: data.discount_value !== undefined ? Number(data.discount_value) : undefined,
            items: items
          });
        }
      }, (err) => {
        console.warn("Flash deals firestore subscription error, falling back to API:", err);
        fetch("/api/flash-deals")
          .then(r => r.json())
          .then(d => {
            if (d.data) {
              const isExpired = new Date(d.data.end_time).getTime() <= Date.now();
              const items = isExpired ? [] : (Array.isArray(d.data.items) ? d.data.items : []);

              if (isExpired && Array.isArray(d.data.items) && d.data.items.length > 0) {
                fetch("/api/flash-deals/clear-expired", { method: "POST" }).catch(() => {});
              }

              setFlashConfig({
                is_active: d.data.is_active !== false && !isExpired,
                end_time: d.data.end_time || new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
                badge_text: d.data.badge_text || "Up to 50% OFF Limited Time",
                coupon_code: d.data.coupon_code || undefined,
                discount_type: d.data.discount_type || undefined,
                discount_value: d.data.discount_value !== undefined ? Number(d.data.discount_value) : undefined,
                items: items
              });
            }
          })
          .catch(e => console.warn("Failed to fetch /api/flash-deals fallback:", e));
      });
      return () => unsub();
    } catch (e) {
      console.warn("Flash deals init error:", e);
    }
  }, []);
  const [sortBy, setSortBy] = useState<"featured" | "newest" | "price-asc" | "price-desc" | "rating" | "popular">("featured");
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);
  const [minPriceInput, setMinPriceInput] = useState<string>("");
  const [maxPriceInput, setMaxPriceInput] = useState<string>("");
  const [appliedMinPrice, setAppliedMinPrice] = useState<number | null>(null);
  const [appliedMaxPrice, setAppliedMaxPrice] = useState<number | null>(null);
  const [minRatingFilter, setMinRatingFilter] = useState<number>(0);
  const [selectedSellerCity, setSelectedSellerCity] = useState<string>("All");
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState<boolean>(false);
  const [copiedVoucher, setCopiedVoucher] = useState<string | null>(null);
  const [claimedVoucher, setClaimedVoucher] = useState<string | null>(null);
  const [allCoupons, setAllCoupons] = useState<any[]>([]);
  const [couponsLoaded, setCouponsLoaded] = useState(false);

  // Load claimed voucher from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('claimed_voucher');
      if (saved) {
        setClaimedVoucher(saved.trim().toUpperCase());
      }
    }
  }, []);

  // Universal claim voucher function: safe clipboard copy + localStorage + toast
  const claimVoucher = (code: string, discountDesc?: string) => {
    if (!code) return;
    const cleanCode = code.trim().toUpperCase();

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(cleanCode).catch(() => {});
      } else if (typeof document !== 'undefined') {
        const ta = document.createElement("textarea");
        ta.value = cleanCode;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand("copy"); } catch (e) {}
        document.body.removeChild(ta);
      }
    } catch (e) {
      console.warn("Clipboard copy fallback error:", e);
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem('claimed_voucher', cleanCode);
    }
    setClaimedVoucher(cleanCode);
    setCopiedVoucher(cleanCode);
    setTimeout(() => setCopiedVoucher(null), 3500);

    const desc = discountDesc ? ` (${discountDesc})` : "";
    setSuccessMsg(`Voucher "${cleanCode}" claimed${desc}. Auto-applied at checkout.`);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  // Live Promo Voucher from Firestore
  const [activeVoucher, setActiveVoucher] = useState<{
    code: string;
    title?: string;
    description?: string;
    badge?: string;
    discount_type?: string;
    discount_value?: number;
    discount?: number;
    min_spend?: number;
    category?: string;
    is_active?: boolean;
    expiry_date?: string;
  } | null>(null);

  // Live Flash Coupon specifically controlling Flash Deals
  const [flashCoupon, setFlashCoupon] = useState<{
    code: string;
    title?: string;
    description?: string;
    badge?: string;
    discount_type?: string;
    discount_value?: number;
    discount?: number;
    min_spend?: number;
    category?: string;
    is_active?: boolean;
    expiry_date?: string;
  } | null>(null);

  // Subscribe to all coupons
  useEffect(() => {
    try {
      const couponsRef = collection(db, "coupons");
      const unsubscribe = onSnapshot(couponsRef, (snapshot) => {
        const list: any[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data && data.is_active !== false) {
            list.push({
              code: (data.code || docSnap.id).toUpperCase(),
              title: data.title || "Welcome Voucher",
              description: data.description || "Enjoy discount on your marketplace checkout!",
              badge: data.badge || "PROMO VOUCHER",
              discount_type: data.discount_type || "fixed",
              discount_value: Number(data.discount_value ?? data.discount ?? 100),
              discount: Number(data.discount ?? data.discount_value ?? 10),
              min_spend: Number(data.min_spend || 0),
              category: data.category || "All Products",
              is_active: data.is_active !== false,
              expiry_date: data.expiry_date || "Dec 31, 2026"
            });
          }
        });
        setAllCoupons(list);
        setCouponsLoaded(true);
      }, (err) => {
        console.warn("Error fetching coupons from Firestore:", err);
        setCouponsLoaded(true);
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn("Firestore coupon subscription error:", e);
    }
  }, []);

  // Compute flashCoupon dynamically based on flashConfig & allCoupons
  useEffect(() => {
    if (!flashConfig.is_active) {
      setFlashCoupon(null);
      return;
    }

    const linkedCode = flashConfig.coupon_code?.trim().toUpperCase();
    let match = linkedCode ? allCoupons.find(c => c.code === linkedCode) : null;

    if (!match && linkedCode) {
      // Synthesize flash coupon from flashConfig settings if not yet loaded in coupons collection
      const isPercent = flashConfig.discount_type === 'percent';
      const val = Number(flashConfig.discount_value || 0);
      match = {
        code: linkedCode,
        title: "Flash Deals Linked Voucher",
        description: `Enjoy ${isPercent ? `${val}% OFF` : `₱${val} OFF`} on your Flash Deals purchase!`,
        badge: "FLASH OFFER",
        discount_type: flashConfig.discount_type || "percent",
        discount_value: val,
        discount: val,
        min_spend: 0,
        category: "Flash Deals",
        is_active: true,
        expiry_date: "Limited Time"
      };
    }

    if (!match) {
      match = allCoupons.find(c =>
        (c.category && c.category.toLowerCase().includes("flash")) ||
        (c.badge && c.badge.toLowerCase().includes("flash")) ||
        (c.code && c.code.toLowerCase().includes("flash"))
      ) || null;
    }

    setFlashCoupon(match);

    // General voucher for promo strip (prefer non-flash coupon, or first)
    const genVoucher = allCoupons.find(c => !match || c.code !== match.code) || allCoupons[0];
    setActiveVoucher(genVoucher || null);
  }, [allCoupons, flashConfig.coupon_code, flashConfig.discount_type, flashConfig.discount_value, flashConfig.is_active]);

  // Ensure claimedVoucher in localStorage corresponds to an active Firestore voucher
  useEffect(() => {
    if (!couponsLoaded || !claimedVoucher) return;
    const existsInCoupons = allCoupons.some(c => c.code === claimedVoucher);
    const existsInFlash = Boolean(flashCoupon && flashCoupon.code === claimedVoucher);
    if (!existsInCoupons && !existsInFlash) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("claimed_voucher");
      }
      setClaimedVoucher(null);
    }
  }, [couponsLoaded, claimedVoucher, allCoupons, flashCoupon]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeChatUser, setActiveChatUser] = useState<{ id: number; name: string; avatar?: string | null } | null>(null);
  const [isActiveUserOnline, setIsActiveUserOnline] = useState(false);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatConversations, setChatConversations] = useState<any[]>([]);
  const [newChatMessage, setNewChatMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: number; name: string; avatar?: string | null } | null>(null);
  const [loadingChatMessages, setLoadingChatMessages] = useState(false);
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const [chatImageFiles, setChatImageFiles] = useState<File[]>([]);
  const [chatImagePreviews, setChatImagePreviews] = useState<string[]>([]);
  const [viewingImageModal, setViewingImageModal] = useState<{ images: string[]; index: number } | null>(null);
  const imageViewerRef = useRef<HTMLDivElement>(null);
  const isImageViewerOpen = viewingImageModal !== null;
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [sharingLocation, setSharingLocation] = useState(false);
  const [isMeetupMapOpen, setIsMeetupMapOpen] = useState(false);
  const [isUserBlockedModalOpen, setIsUserBlockedModalOpen] = useState(false);

  // Buyer Location Detection
  const [buyerLocation, setBuyerLocation] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem("shopply_buyer_location") || "";
    }
    return "";
  });
  const [detectingBuyerLoc, setDetectingBuyerLoc] = useState<boolean>(false);

  const detectBuyerLocation = useCallback(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) return;
    setDetectingBuyerLoc(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=12&addressdetails=1`, {
            headers: { 'Accept-Language': 'en' }
          });
          const data = await res.json();
          const addr = data.address;
          const city = addr?.city || addr?.town || addr?.municipality || addr?.village || addr?.county || "";
          const state = addr?.state || addr?.region || "";
          const locStr = [city, state].filter(Boolean).join(", ");
          if (locStr) {
            setBuyerLocation(locStr);
            localStorage.setItem("shopply_buyer_location", locStr);
          } else if (data.display_name) {
            const shortLoc = data.display_name.split(",").slice(0, 2).join(",").trim();
            setBuyerLocation(shortLoc);
            localStorage.setItem("shopply_buyer_location", shortLoc);
          }
        } catch (e) {
          console.error("Buyer reverse geocoding failed", e);
        } finally {
          setDetectingBuyerLoc(false);
        }
      },
      (err) => {
        console.warn("Buyer geolocation error or permission denied:", err);
        setDetectingBuyerLoc(false);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  }, []);

  useEffect(() => {
    if (!buyerLocation) {
      detectBuyerLocation();
    }
  }, [buyerLocation, detectBuyerLocation]);

  useEffect(() => {
    let targetUserId = currentUser?.id ? String(currentUser.id) : null;
    if (!targetUserId && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem("user") || localStorage.getItem("shopply_user");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.id) targetUserId = String(parsed.id);
        }
      } catch (e) {}
    }
    if (!targetUserId) return;

    const userDocRef = doc(db, "users", targetUserId);

    const unsub = onSnapshot(userDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.is_blocked === true) {
          setIsUserBlockedModalOpen(true);
          localStorage.removeItem("token");
          localStorage.removeItem("shopply_user");
          localStorage.removeItem("user");
        }
      }
    });

    return () => unsub();
  }, [currentUser?.id]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const incomingTypingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isSendingRef = useRef(false);
  const fetchConversationsRef = useRef<() => void>(() => {});
  const fetchMessagesRef = useRef<() => void>(() => {});
  // Smooth mode state
  const [smoothMode, setSmoothMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('shopply_smooth_mode') !== 'false';
    }
    return true;
  });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'shopply_smooth_mode') {
        setSmoothMode(e.newValue === 'true');
      }
    };
    const handleCustomChange = () => {
      setSmoothMode(localStorage.getItem('shopply_smooth_mode') === 'true');
    };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('smooth_mode_changed', handleCustomChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('smooth_mode_changed', handleCustomChange);
    };
  }, []);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isChatOpen, isOtherUserTyping]);

  // Track mobile viewport for inline-style overrides
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 480);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Flash Deals Countdown Timer based on real end_time
  useEffect(() => {
    if (!flashConfig.end_time) {
      setFlashCountdown({ hours: 0, minutes: 0, seconds: 0 });
      return;
    }
    const updateCountdown = () => {
      const targetTime = new Date(flashConfig.end_time).getTime();
      const now = Date.now();
      const diff = Math.max(0, targetTime - now);
      
      const totalSeconds = Math.floor(diff / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      setFlashCountdown({ hours, minutes, seconds });

      // If timer hits 0 and items are still in state, auto-empty them immediately
      if (diff <= 0 && (flashConfig.items || []).length > 0) {
        setFlashConfig(prev => ({ ...prev, items: [], is_active: false }));
        fetch("/api/flash-deals/clear-expired", { method: "POST" }).catch(() => {});
      }
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [flashConfig.end_time, flashConfig.items]);

  // Flash Deals active status & item resolver
  const hasFlashEnded = !flashConfig.end_time || (flashCountdown.hours === 0 && flashCountdown.minutes === 0 && flashCountdown.seconds === 0) || (new Date(flashConfig.end_time).getTime() <= Date.now());
  const isFlashSaleActive = Boolean(flashConfig.is_active && !hasFlashEnded && (flashConfig.items || []).length > 0);

  const getActiveFlashDeal = (itemId?: string | number | null) => {
    if (!isFlashSaleActive || !itemId || hasFlashEnded) return null;
    return (flashConfig.items || []).find(d => String(d.item_id) === String(itemId)) || null;
  };

  const handleToggleFollow = async (userId: number) => {
    const token = localStorage.getItem("token");
    if (!token || !currentUser) {
      setErrorMsg("Please log in to follow sellers.");
      setTimeout(() => setErrorMsg(null), 3000);
      return;
    }
    if (currentUser.id === userId) {
      setErrorMsg("You cannot follow yourself.");
      setTimeout(() => setErrorMsg(null), 3000);
      return;
    }

    const isFollowing = followedSellers[userId];
    const action = isFollowing ? "unfollow" : "follow";

    // Optimistic UI updates
    const updatedFollowed = { ...followedSellers, [userId]: !isFollowing };
    setFollowedSellers(updatedFollowed);
    localStorage.setItem(`shopply_followed_sellers_${currentUser.id}`, JSON.stringify(updatedFollowed));

    // Optimistic update for viewItem
    if (viewItem && viewItem.user.id === userId) {
      const currentCount = viewItem.user.followers_count !== undefined ? viewItem.user.followers_count : 0;
      setViewItem({
        ...viewItem,
        user: {
          ...viewItem.user,
          followers_count: isFollowing ? Math.max(0, currentCount - 1) : currentCount + 1
        }
      });
    }

    // Optimistic update for all items in list by this seller
    setItems(prevItems => prevItems.map(item => {
      if (item.user.id === userId) {
        const currentCount = item.user.followers_count !== undefined ? item.user.followers_count : 0;
        return {
          ...item,
          user: {
            ...item.user,
            followers_count: isFollowing ? Math.max(0, currentCount - 1) : currentCount + 1
          }
        };
      }
      return item;
    }));

    try {
      const res = await fetch(`${API}/users/${userId}/follow`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      if (res.ok && data.followers_count !== undefined) {
        if (viewItem && viewItem.user.id === userId) {
          setViewItem(prev => prev ? ({ ...prev, user: { ...prev.user, followers_count: data.followers_count } }) : null);
        }
        // Update items list with final count from backend
        setItems(prevItems => prevItems.map(item => {
          if (item.user.id === userId) {
            return {
              ...item,
              user: {
                ...item.user,
                followers_count: data.followers_count
              }
            };
          }
          return item;
        }));
        if (data.user) {
          localStorage.setItem("user", JSON.stringify(data.user));
          window.dispatchEvent(new Event('user_updated'));
        }
      } else {
        // Revert optimistic updates
        const revertedFollowed = { ...followedSellers, [userId]: isFollowing };
        setFollowedSellers(revertedFollowed);
        localStorage.setItem(`shopply_followed_sellers_${currentUser.id}`, JSON.stringify(revertedFollowed));

        if (viewItem && viewItem.user.id === userId) {
          const currentCount = viewItem.user.followers_count !== undefined ? viewItem.user.followers_count : 0;
          setViewItem({
            ...viewItem,
            user: {
              ...viewItem.user,
              followers_count: isFollowing ? currentCount + 1 : Math.max(0, currentCount - 1)
            }
          });
        }

        setItems(prevItems => prevItems.map(item => {
          if (item.user.id === userId) {
            const currentCount = item.user.followers_count !== undefined ? item.user.followers_count : 0;
            return {
              ...item,
              user: {
                ...item.user,
                followers_count: isFollowing ? currentCount + 1 : Math.max(0, currentCount - 1)
              }
            };
          }
          return item;
        }));

        setErrorMsg(data.message || "Failed to update follow status.");
        setTimeout(() => setErrorMsg(null), 3000);
      }
    } catch (err) {
      console.error("Failed to toggle follow", err);
      // Revert optimistic updates
      const revertedFollowed = { ...followedSellers, [userId]: isFollowing };
      setFollowedSellers(revertedFollowed);
      localStorage.setItem(`shopply_followed_sellers_${currentUser.id}`, JSON.stringify(revertedFollowed));

      if (viewItem && viewItem.user.id === userId) {
        const currentCount = viewItem.user.followers_count !== undefined ? viewItem.user.followers_count : 0;
        setViewItem({
          ...viewItem,
          user: {
            ...viewItem.user,
            followers_count: isFollowing ? currentCount + 1 : Math.max(0, currentCount - 1)
          }
        });
      }

      setItems(prevItems => prevItems.map(item => {
        if (item.user.id === userId) {
          const currentCount = item.user.followers_count !== undefined ? item.user.followers_count : 0;
          return {
            ...item,
            user: {
              ...item.user,
              followers_count: isFollowing ? currentCount + 1 : Math.max(0, currentCount - 1)
            }
          };
        }
        return item;
      }));

      setErrorMsg("Something went wrong. Please try again.");
      setTimeout(() => setErrorMsg(null), 3000);
    }
  };

  // Review Form State
  const [revRating, setRevRating] = useState(5);
  const [revComment, setRevComment] = useState("");
  const [revImages, setRevImages] = useState<File[]>([]);
  const [revPreviews, setRevPreviews] = useState<string[]>([]);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [isWritingReview, setIsWritingReview] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [reviewFilter, setReviewFilter] = useState<'all' | 'comment' | 'media'>('all');

  const API = "/api";
  const STORAGE_URL = "/storage";

  const getAvatarUrl = (path?: string | null) => {
    if (!path) return "";
    const clean = path.trim();
    if (clean.includes('data:image/')) {
      const idx = clean.indexOf('data:image/');
      return clean.slice(idx);
    }
    if (
      clean.startsWith('data:') ||
      clean.startsWith('blob:') ||
      clean.startsWith('http://') ||
      clean.startsWith('https://')
    ) {
      return clean;
    }
    if (clean.startsWith('/')) {
      return clean;
    }
    return `${STORAGE_URL}/${clean}`;
  };

  const getImageUrl = (path?: string | null) => {
    if (!path) return "";
    const clean = path.trim();
    if (clean.includes('data:image/')) {
      const idx = clean.indexOf('data:image/');
      return clean.slice(idx);
    }
    if (
      clean.startsWith('data:') ||
      clean.startsWith('blob:') ||
      clean.startsWith('http://') ||
      clean.startsWith('https://')
    ) {
      return clean;
    }
    if (clean.startsWith('/')) {
      return clean;
    }
    return `${STORAGE_URL}/${clean}`;
  };

  const IconCart = () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>;
  const IconCheck = () => <svg width="48" height="48" fill="none" stroke="#10b981" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
  const IconArrowUp = () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M18 15l-6-6-6 6" strokeLinecap="round" strokeLinejoin="round"/></svg>;
  const IconBack = () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>;
  const IconClose = () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/></svg>;
  const IconChat = () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>;
  const IconShop = () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;

  const formatPriceDisplay = (item: ShopItem) => {
    const activeDeal = getActiveFlashDeal(item.id);
    if (activeDeal && Number(activeDeal.flash_price) > 0) {
      return `₱${Number(activeDeal.flash_price).toFixed(2)}`;
    }
    const attrs = parseItemAttributes(item);
    const basePrice = parseFloat(String(item.price ?? "0")) || 0;
    let prices: number[] = basePrice > 0 ? [basePrice] : [];
    if (attrs?.variant_prices && Array.isArray(attrs.variant_prices) && attrs.variant_prices.length > 0) {
      const vPrices = attrs.variant_prices
        .map((p: any) => parseFloat(String(p)))
        .filter((p: number) => !isNaN(p) && p > 0);
      if (vPrices.length > 0) {
        prices = prices.concat(vPrices);
      }
    }
    if (prices.length === 0) {
      return calculateTotalStock(item) <= 0 ? "Unavailable" : "Price on inquiry";
    }
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    if (minPrice !== maxPrice) {
      return `₱${minPrice.toFixed(2)} – ₱${maxPrice.toFixed(2)}`;
    }
    return `₱${minPrice.toFixed(2)}`;
  };

  const calculateJoined = (dateString?: string) => {
    if (!dateString) return "Recently joined";
    const joinedDate = new Date(dateString);
    const diffYears = new Date().getFullYear() - joinedDate.getFullYear();
    if (diffYears === 0) {
      const diffMonths = new Date().getMonth() - joinedDate.getMonth();
      return diffMonths <= 0 ? "Joined this month" : `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`;
    }
    return `${diffYears} year${diffYears > 1 ? 's' : ''} ago`;
  };

  const formatLastMessageTime = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    if (msgDate.getTime() === today.getTime()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (msgDate.getTime() === yesterday.getTime()) {
      return "Yesterday";
    } else if (now.getTime() - date.getTime() < 7 * 24 * 60 * 60 * 1000) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const formatDividerDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    if (msgDate.getTime() === today.getTime()) {
      return "Today";
    } else if (msgDate.getTime() === yesterday.getTime()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    }
  };

  const StarRating = ({ rating, size = 16 }: { rating: number, size?: number }) => (
    <div className="stars">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg key={star} width={size} height={size} fill={star <= rating ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.27 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z"/>
        </svg>
      ))}
    </div>
  );

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Load current user for chat, seller card avatars & followed sellers
  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedUserStr = localStorage.getItem("user");
    if (storedUserStr) {
      try {
        const u = JSON.parse(storedUserStr);
        if (u) setCurrentUser(u);
      } catch (e) {}
    }

    if (token) {
      const cache = getApiCache();
      cache.fetch(`${API}/me`, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } })
        .then((data: any) => { 
          if (data.user) {
            setCurrentUser(data.user);
            const storedFollowed = localStorage.getItem(`shopply_followed_sellers_${data.user.id}`);
            if (storedFollowed) {
              try {
                setFollowedSellers(JSON.parse(storedFollowed));
              } catch (e) {
                console.error("Failed to parse followed sellers", e);
              }
            }
          }
        })
        .catch(() => {});
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "shopply_profile_update" || e.key === "user") {
        const updated = localStorage.getItem("user");
        if (updated) {
          try {
            setCurrentUser(JSON.parse(updated));
          } catch (e) {}
        }
        const cache = getApiCache();
        cache.invalidate('/shop/items');
        cache.fetch(`${API}/shop/items`, {})
          .then((d: any) => { if (d.items) setItems(normalizeCatalogItems(d.items)); })
          .catch(() => {});
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isEmojiPickerOpen && emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setIsEmojiPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isEmojiPickerOpen]);

  // Poll chat conversations & active chat messages
  useEffect(() => {
    if (isChatOpen) {
      const token = localStorage.getItem("token");
      if (!token) return;

      let chatDebounce: NodeJS.Timeout;

      const fetchConversations = () => {
        getApiCache().fetch<any>(`${API}/chat/conversations`, 
          { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } },
          { onData: data => { if (data.conversations) setChatConversations(data.conversations); } }
        ).then(data => { if (data.conversations) setChatConversations(data.conversations); }).catch(() => {});
      };

      const fetchMessages = () => {
        if (activeChatUser && !isSendingRef.current) {
          getApiCache().fetch<any>(`${API}/chat/${activeChatUser.id}`, 
            { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } },
            { onData: data => {
              if (data.messages && !isSendingRef.current) setChatMessages(data.messages);
              setIsOtherUserTyping(!!data.is_typing);
              if (data.user) setIsActiveUserOnline(!!data.user.is_online);
            }}
          ).then(data => {
              if (data.messages && !isSendingRef.current) setChatMessages(data.messages);
              setIsOtherUserTyping(!!data.is_typing);
              if (data.user) setIsActiveUserOnline(!!data.user.is_online);
              setLoadingChatMessages(false);
          }).catch(() => { setLoadingChatMessages(false); });
        }
      };

      fetchConversationsRef.current = fetchConversations;
      fetchMessagesRef.current = fetchMessages;

      const handleChatUpdate = (e?: Event) => {
        if (!e || (e as StorageEvent).key === 'shopply_chat_update' || e.type === 'focus' || e.type === 'visibilitychange') {
          clearTimeout(chatDebounce);
          chatDebounce = setTimeout(() => {
            fetchConversations();
            fetchMessages();
          }, 50);
        }
      };

      window.addEventListener('storage', handleChatUpdate);
      window.addEventListener('focus', handleChatUpdate);
      window.addEventListener('visibilitychange', handleChatUpdate);

      let cleanConvPoller: (() => void) | null = null;
      let cleanMsgPoller: (() => void) | null = null;

      // Conversations list still uses lightweight polling
      if (smoothMode) {
        cleanConvPoller = createSmartPoller(fetchConversations, 5000, {
          idleIntervalMs: 15000,
          idleAfterMs: 30000
        });
      } else {
        fetchConversations();
        const convInterval = setInterval(fetchConversations, 2500);
        cleanConvPoller = () => clearInterval(convInterval);
      }

      // Active chat messages and typing status are now fully real-time via Firestore listeners
      if (activeChatUser && currentUser) {
        const userId = Number(currentUser.id);
        const otherUserId = Number(activeChatUser.id);

        // Simple index-free queries to avoid composite index requirements in Firestore
        const qSent = query(collection(db, "messages"), where("sender_id", "==", userId));
        const qReceived = query(collection(db, "messages"), where("receiver_id", "==", userId));

        let sentMsgs: any[] = [];
        let receivedMsgs: any[] = [];

        const mergeAndSet = () => {
          const all = [...sentMsgs, ...receivedMsgs];
          const filtered = all.filter(msg => 
            (Number(msg.sender_id) === userId && Number(msg.receiver_id) === otherUserId) ||
            (Number(msg.sender_id) === otherUserId && Number(msg.receiver_id) === userId)
          );
          const unique: any[] = [];
          const seenIds = new Set();
          for (const m of filtered) {
            if (!seenIds.has(m.id)) {
              seenIds.add(m.id);
              unique.push(m);
            }
          }
          unique.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
          
          if (!isSendingRef.current) {
            setChatMessages(unique);
            setLoadingChatMessages(false);
          }

          // Mark incoming unread messages as read
          filtered.forEach(async (msg) => {
            if (Number(msg.sender_id) === otherUserId && !msg.is_read) {
              try {
                await updateDoc(doc(db, "messages", msg.id), { is_read: true });
              } catch (err) {
                console.warn("Failed to mark message as read:", err);
              }
            }
          });
        };

        const unsubMessages1 = onSnapshot(qSent, (snap) => {
          sentMsgs = snap.docs.map(d => ({ ...d.data(), id: d.id }));
          mergeAndSet();
        }, (err) => {
          console.error("[onSnapshot] qSent failed:", err);
        });

        const unsubMessages2 = onSnapshot(qReceived, (snap) => {
          receivedMsgs = snap.docs.map(d => ({ ...d.data(), id: d.id }));
          mergeAndSet();
        }, (err) => {
          console.error("[onSnapshot] qReceived failed:", err);
        });

        // Direct document listener for instant typing status updates
        const chatId = userId < otherUserId ? `${userId}_${otherUserId}` : `${otherUserId}_${userId}`;
        const typingDocRef = doc(db, "typing", `${chatId}_${otherUserId}`);

        const unsubTyping = onSnapshot(typingDocRef, (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            const age = Date.now() - (data.last_typed_at || 0);
            
            if (incomingTypingTimeoutRef.current) {
              clearTimeout(incomingTypingTimeoutRef.current);
            }

            // Trigger typing state if timestamp is fresh (allows up to 10 seconds of clock drift)
            if (age < 10000) {
              setIsOtherUserTyping(true);
              incomingTypingTimeoutRef.current = setTimeout(() => {
                setIsOtherUserTyping(false);
                incomingTypingTimeoutRef.current = null;
              }, 3500);
            } else {
              setIsOtherUserTyping(false);
            }
          } else {
            setIsOtherUserTyping(false);
          }
        });

        cleanMsgPoller = () => {
          unsubMessages1();
          unsubMessages2();
          unsubTyping();
          if (incomingTypingTimeoutRef.current) {
            clearTimeout(incomingTypingTimeoutRef.current);
            incomingTypingTimeoutRef.current = null;
          }
        };
      } else {
        // Fallback if no active user
        fetchMessages();
      }

      return () => {
        clearTimeout(chatDebounce);
        window.removeEventListener('storage', handleChatUpdate);
        window.removeEventListener('focus', handleChatUpdate);
        window.removeEventListener('visibilitychange', handleChatUpdate);
        if (cleanConvPoller) cleanConvPoller();
        if (cleanMsgPoller) cleanMsgPoller();
      };
    }
  }, [isChatOpen, activeChatUser, API, smoothMode]);

  const handleShareLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setSharingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const messageText = `[LOCATION]${lat},${lng}`;
        const token = localStorage.getItem("token");
        if (!token || !activeChatUser) {
          setSharingLocation(false);
          return;
        }

        const optimisticMsg = {
          id: Date.now(),
          sender_id: currentUser ? currentUser.id : 999999,
          receiver_id: activeChatUser.id,
          message: messageText,
          image: null,
          is_read: false,
          created_at: new Date().toISOString(),
        };
        setChatMessages(prev => [...prev, optimisticMsg]);

        try {
          const formData = new FormData();
          formData.append("message", messageText);
          
          const res = await fetch(`${API}/chat/${activeChatUser.id}`, {
            method: "POST",
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          });
          if (res.ok) {
            const data = await res.json();
            getApiCache().invalidate(`/chat/${activeChatUser.id}`);
            getApiCache().invalidate(`/chat/conversations`);
            setChatMessages(prev => prev.map(m => m.id === optimisticMsg.id ? data.message : m));
            localStorage.setItem('shopply_chat_update', Date.now().toString());
          }
        } catch (err) {
          console.error("Failed to share location:", err);
        } finally {
          setSharingLocation(false);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        alert("Unable to retrieve location. Please check your browser permissions.");
        setSharingLocation(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newChatMessage.trim() && chatImageFiles.length === 0) || !activeChatUser) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    isSendingRef.current = true;
    const messageText = newChatMessage.trim();
    const imagesToSend = [...chatImageFiles];
    const imagePreviewsUrl = [...chatImagePreviews];

    // Optimistic UI: immediately clear input & append message for zero lag
    setNewChatMessage("");
    setChatImageFiles([]);
    setChatImagePreviews([]);

    const optimisticMsg = {
      id: Date.now(),
      sender_id: currentUser ? currentUser.id : 999999,
      receiver_id: activeChatUser.id,
      message: messageText,
      image: imagePreviewsUrl.length > 0 ? imagePreviewsUrl[0] : null,
      images: imagePreviewsUrl,
      optimistic_previews: imagePreviewsUrl,
      is_read: false,
      created_at: new Date().toISOString(),
    };
    setChatMessages(prev => [...prev, optimisticMsg]);

    try {
      const formData = new FormData();
      if (messageText) formData.append("message", messageText);
      imagesToSend.forEach(file => {
        formData.append("images[]", file);
      });
      if (imagesToSend.length > 0) {
        formData.append("image", imagesToSend[0]);
      }

      const res = await fetch(`${API}/chat/${activeChatUser.id}`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        getApiCache().invalidate(`/chat/${activeChatUser.id}`);
        getApiCache().invalidate(`/chat/conversations`);
        setChatMessages(prev => prev.map(m => m.id === optimisticMsg.id ? data.message : m));
        localStorage.setItem('shopply_chat_update', Date.now().toString());
        // Refresh conversations and messages instantly
        fetchConversationsRef.current();
        fetchMessagesRef.current();
      } else {
        const errData = await res.json().catch(() => ({}));
        setChatMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
        setErrorMsg(errData.message || "Failed to send message.");
      }
    } catch (err: any) {
      console.error(err);
      setChatMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
      setErrorMsg("Failed to send message. Network error.");
    } finally {
      setTimeout(() => { isSendingRef.current = false; }, 500);
    }
  };

  useEffect(() => {
    const cache = getApiCache();
    cache.fetch(`${API}/shop/items`, {})
      .then((data: any) => {
        if (data.items) setItems(normalizeCatalogItems(data.items));
        setLoading(false);
      })
      .catch((err: any) => {
        console.error("Failed to fetch shop items", err);
        setLoading(false);
      });

    // Fetch Cart Count & Unread Conversations if logged in (cached)
    const token = localStorage.getItem("token");
    if (token) {
      cache.fetch(`${API}/cart`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }
      })
      .then((data: any) => {
        if (data.cart_items) {
          setCartCount(data.cart_items.length);
        }
      })
      .catch(console.error);

      cache.fetch(`${API}/chat/conversations`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }
      })
      .then((data: any) => {
        if (Array.isArray(data?.conversations)) {
          setChatConversations(data.conversations);
        }
      })
      .catch(() => {});
    }
  }, [API]);

  useEffect(() => {
    if (viewItem) {
      const cache = getApiCache();
      cache.fetch(`${API}/items/${viewItem.id}/reviews`, {})
        .then((data: any) => {
          const loaded = Array.isArray(data) ? data : (Array.isArray(data?.reviews) ? data.reviews : []);
          setReviews(loaded);
        })
        .catch(console.error);
    }
  }, [viewItem, API]);

  // Keep the page still behind either product details or the full-size gallery.
  useEffect(() => {
    if (!viewItem && !isImageViewerOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, [viewItem, isImageViewerOpen]);

  useEffect(() => {
    if (!isImageViewerOpen) return;
    const viewer = imageViewerRef.current;
    const previousFocus = document.activeElement as HTMLElement | null;
    viewer?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setViewingImageModal(null);
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        const direction = event.key === 'ArrowLeft' ? -1 : 1;
        setViewingImageModal(previous => previous ? {
          ...previous,
          index: (previous.index + direction + previous.images.length) % previous.images.length,
        } : null);
      } else if (event.key === 'Tab' && viewer) {
        const controls = Array.from(viewer.querySelectorAll<HTMLElement>('button, a[href]'));
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [isImageViewerOpen]);

  const handleViewItem = (item: ShopItem) => {
    setViewItem(item);
    setSelectedVariant(null);
    setSelectedSize(null);
    setReviews([]); // Clear old reviews while loading
    setActiveImageIdx(0);
    setReviewFilter('all');
    // Reset modal scroll to top when switching products
    setTimeout(() => {
      document.querySelector('.detail-modal')?.scrollTo({ top: 0 });
    }, 50);
  };

  const handleReviewImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setRevImages(prev => [...prev, ...files]);
      files.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => setRevPreviews(prev => [...prev, reader.result as string]);
        reader.readAsDataURL(file);
      });
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewItem) return;
    const token = localStorage.getItem("token");
    if (!token) {
      setErrorMsg("Please log in to submit a review.");
      return;
    }

    setSubmittingReview(true);
    const formData = new FormData();
    formData.append("item_id", viewItem.id.toString());
    formData.append("rating", revRating.toString());
    formData.append("comment", revComment);
    
    let variation = "";
    if (selectedVariant !== null && viewItem.attributes?.colors?.[selectedVariant]) variation += viewItem.attributes.colors[selectedVariant];
    if (selectedSize) variation += (variation ? ", " : "") + selectedSize;
    formData.append("variation", variation);

    revImages.forEach(img => formData.append("review_images[]", img));

    try {
      const res = await fetch(`${API}/reviews`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        getApiCache().invalidate(`/items/${viewItem.id}/reviews`);
        getApiCache().invalidate('/shop/items');
        const nextReviews = [data.review, ...reviews];
        setReviews(nextReviews);
        const nextCount = typeof data.reviews_count === "number" ? data.reviews_count : nextReviews.length;
        const nextAvg = typeof data.reviews_avg_rating === "number"
          ? data.reviews_avg_rating
          : Number((nextReviews.reduce((acc, r) => acc + Number(r.rating || 0), 0) / Math.max(1, nextReviews.length)).toFixed(1));
        setItems(prev => prev.map(it => it.id === viewItem.id ? { ...it, reviews_count: nextCount, reviews_avg_rating: nextAvg } : it));
        setViewItem(prev => prev && prev.id === viewItem.id ? { ...prev, reviews_count: nextCount, reviews_avg_rating: nextAvg } : prev);
        localStorage.setItem('shopply_item_update', Date.now().toString());
        setRevComment("");
        setRevImages([]);
        setRevPreviews([]);
        setSuccessMsg("Review submitted! Thank you.");
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        setErrorMsg("Failed to submit review.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Something went wrong.");
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleBuy = async () => {
    if (!buyModal) return;
    const token = localStorage.getItem("token");
    if (!token) {
      setErrorMsg("Please log in to buy items.");
      setBuyModal(null);
      return;
    }

    setBuying(true);
    try {
      const activeDeal = getActiveFlashDeal(buyModal.item.id);
      if (activeDeal && (new Date(flashConfig.end_time).getTime() <= Date.now() || hasFlashEnded)) {
        setErrorMsg("This flash sale has ended. The promotional price is no longer available.");
        setBuyModal(null);
        setBuying(false);
        return;
      }
      const savedCoupon = typeof window !== 'undefined' ? localStorage.getItem('claimed_voucher') : null;
      const res = await fetch(`${API}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          item_id: buyModal.item.id,
          quantity: 1,
          price: buyModal.price,
          variation: buyModal.variation,
          shipping_address: buyerLocation ? `${buyerLocation}, Philippines` : undefined,
          coupon_code: savedCoupon || undefined
        }),
      });

      const data = await res.json();
      if (res.ok) {
        const updateItemStock = (item: ShopItem) => {
          if (item.id !== buyModal.item.id) return item;
          const newItem = { ...item, stock: Math.max(0, item.stock - 1), sold_count: Number(item.sold_count || 0) + 1 };
          if (buyModal.variation && newItem.attributes?.size_stocks && newItem.attributes?.sizes) {
            let matchedSize = null;
            for (const s of newItem.attributes.sizes) {
              if (buyModal.variation === s || buyModal.variation.endsWith(", " + s)) {
                matchedSize = s;
                break;
              }
            }
            if (matchedSize && typeof newItem.attributes.size_stocks[matchedSize] === 'number') {
              newItem.attributes = { ...newItem.attributes, size_stocks: { ...newItem.attributes.size_stocks, [matchedSize]: newItem.attributes.size_stocks[matchedSize] - 1 } };
            }
          }
          return newItem;
        };

        setItems(items.map(updateItemStock));
        if (viewItem && viewItem.id === buyModal.item.id) {
          setViewItem(updateItemStock(viewItem));
        }

        setBuyModal(null);
        setViewItem(null);
        localStorage.setItem('last_order_time', Date.now().toString());
        localStorage.setItem('shopply_order_update', Date.now().toString());
        getApiCache().invalidate('/cart');
        getApiCache().invalidate('/orders');
        getApiCache().invalidate('/shop/items');
        window.dispatchEvent(new Event('order_placed'));
        if (data.order && Number(data.order.discount_amount) > 0) {
          setSuccessMsg(`Order placed! Paid ₱${parseFloat(data.order.total_amount).toFixed(2)} (saved ₱${parseFloat(data.order.discount_amount).toFixed(2)} with voucher ${data.order.coupon_code})!`);
        } else {
          setSuccessMsg(`You successfully purchased "${buyModal.item.name}" for ₱${parseFloat(buyModal.price).toFixed(2)}!`);
        }
        setTimeout(() => setSuccessMsg(null), 4000);
      } else {
        setErrorMsg(data.message || "Failed to place order.");
        setBuyModal(null);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Something went wrong.");
      setBuyModal(null);
    } finally {
      setBuying(false);
    }
  };

  const handleAddToCart = async (item: ShopItem, customVariation?: string, customPrice?: string) => {
    const token = localStorage.getItem("token");
    if (!token) {
      setErrorMsg("Please log in to add items to cart.");
      return;
    }

    setAddingToCart(item.id);
    try {
      const res = await fetch(`${API}/cart`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ item_id: item.id, quantity: 1, price: customPrice || item.price, variation: customVariation || "" }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(`"${item.name}" added to cart!`);
        localStorage.setItem('shopply_order_update', Date.now().toString());
        getApiCache().invalidate('/cart');
        setTimeout(() => setSuccessMsg(null), 3000);
        // Refresh cart count
        fetch(`${API}/cart`, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } })
          .then(res => res.json())
          .then(data => { if (data.cart_items) setCartCount(data.cart_items.length); });
      } else {
        setErrorMsg(data.message || "Failed to add to cart.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Something went wrong.");
    } finally {
      setAddingToCart(null);
    }
  };

  const matchesCategoryItem = (item: ShopItem, catId: string) => {
    if (catId === "All") return true;
    if (!item.category) return false;
    const c = item.category.toLowerCase();
    const target = catId.toLowerCase();
    if (catId === "Footwear") return isFootwearCategory(item.category);
    if (catId === "Fashion") return c.includes("cloth") || c.includes("fashion") || c.includes("shirt") || c.includes("hoodie") || c.includes("apparel") || c.includes("dress") || c.includes("pant");
    if (catId === "Electronics") return c.includes("electr") || c.includes("tech") || c.includes("gadget") || c.includes("phone") || c.includes("earbud") || c.includes("device") || c.includes("headset");
    if (catId === "Beauty") return c.includes("beauty") || c.includes("skin") || c.includes("perfume") || c.includes("health") || c.includes("makeup") || c.includes("cosmetic");
    if (catId === "Home") return c.includes("home") || c.includes("living") || c.includes("kitchen") || c.includes("furniture") || c.includes("decor");
    if (catId === "Accessories") return c.includes("watch") || c.includes("bag") || c.includes("accessory") || c.includes("jewelry") || c.includes("wallet");
    if (catId === "Sports") return c.includes("sport") || c.includes("fitness") || c.includes("gym") || c.includes("workout");
    if (catId === "Groceries") return c.includes("grocer") || c.includes("food") || c.includes("snack") || c.includes("beverage");
    if (catId === "Gaming") return c.includes("game") || c.includes("gaming") || c.includes("toy") || c.includes("hobby");
    return c === target;
  };

  // Drag & Scroll refs for Categories row on PC
  const categoryScrollRef = useRef<HTMLDivElement>(null);
  const isCategoryDraggingRef = useRef(false);
  const categoryStartXRef = useRef(0);
  const categoryScrollLeftRef = useRef(0);
  const hasCategoryMovedRef = useRef(false);

  const handleCategoryMouseDown = (e: React.MouseEvent) => {
    if (!categoryScrollRef.current) return;
    isCategoryDraggingRef.current = true;
    categoryStartXRef.current = e.pageX - categoryScrollRef.current.offsetLeft;
    categoryScrollLeftRef.current = categoryScrollRef.current.scrollLeft;
    hasCategoryMovedRef.current = false;
  };

  const handleCategoryMouseMove = (e: React.MouseEvent) => {
    if (!isCategoryDraggingRef.current || !categoryScrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - categoryScrollRef.current.offsetLeft;
    const walk = (x - categoryStartXRef.current) * 1.5;
    if (Math.abs(walk) > 4) {
      hasCategoryMovedRef.current = true;
    }
    categoryScrollRef.current.scrollLeft = categoryScrollLeftRef.current - walk;
  };

  const handleCategoryMouseUp = () => {
    isCategoryDraggingRef.current = false;
  };

  const handleSelectCategory = (catId: string) => {
    setSelectedCategory(catId);
  };

  const getEffectiveNumericPrice = (item: ShopItem) => {
    const deal = getActiveFlashDeal(item.id);
    if (deal && Number(deal.flash_price) > 0) return Number(deal.flash_price);
    const attrs = parseItemAttributes(item);
    const base = parseFloat(String(item.price ?? "0")) || 0;
    if (base > 0) return base;
    if (attrs?.variant_prices && Array.isArray(attrs.variant_prices) && attrs.variant_prices.length > 0) {
      const valid = attrs.variant_prices
        .map((p: any) => parseFloat(String(p)))
        .filter((p: number) => !isNaN(p) && p > 0);
      if (valid.length > 0) return Math.min(...valid);
    }
    return 0;
  };

  // Build real department tabs strictly from categories present in the catalog so there are zero empty "0" dummy tabs
  const departmentTabs = (() => {
    const tabs: Array<{ id: string; label: string; count: number }> = [
      { id: "All", label: "All Items", count: items.length }
    ];
    for (const cat of CURATED_CATEGORIES) {
      if (cat.id === "All") continue;
      const count = items.filter(i => matchesCategoryItem(i, cat.id)).length;
      if (count > 0) {
        tabs.push({ id: cat.id, label: cat.label, count });
      }
    }
    // Include any custom seller categories (e.g. "General") not already covered by curated department matchers
    const customSellerCats = Array.from(new Set(items.map(i => (i.category || "").trim()).filter(Boolean)));
    for (const sCat of customSellerCats) {
      const coveredByCurated = CURATED_CATEGORIES.some(
        c => c.id !== "All" && matchesCategoryItem({ category: sCat } as ShopItem, c.id)
      );
      if (coveredByCurated) continue;
      const count = items.filter(i => (i.category || "").trim().toLowerCase() === sCat.toLowerCase()).length;
      if (count > 0) {
        tabs.push({ id: sCat, label: sCat, count });
      }
    }
    return tabs;
  })();

  // Real live counts for sidebar filters
  const inStockTotalCount = items.filter(i => calculateTotalStock(i) > 0).length;

  const availableSellerCities = (() => {
    const counts = new Map<string, number>();
    for (const it of items) {
      const rawLoc = (it.user?.location || (it as any).location || "").trim();
      if (!rawLoc) continue;
      const city = rawLoc.split(",")[0].trim();
      if (!city) continue;
      counts.set(city, (counts.get(city) || 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count || a.city.localeCompare(b.city));
  })();

  const applyPriceRangeFilter = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const minVal = minPriceInput.trim() !== "" ? Math.max(0, parseFloat(minPriceInput)) : null;
    const maxVal = maxPriceInput.trim() !== "" ? Math.max(0, parseFloat(maxPriceInput)) : null;
    setAppliedMinPrice(minVal !== null && !isNaN(minVal) ? minVal : null);
    setAppliedMaxPrice(maxVal !== null && !isNaN(maxVal) ? maxVal : null);
  };

  const selectPricePreset = (min: number | null, max: number | null) => {
    const isSame = appliedMinPrice === min && appliedMaxPrice === max;
    if (isSame) {
      setAppliedMinPrice(null);
      setAppliedMaxPrice(null);
      setMinPriceInput("");
      setMaxPriceInput("");
    } else {
      setAppliedMinPrice(min);
      setAppliedMaxPrice(max);
      setMinPriceInput(min !== null ? String(min) : "");
      setMaxPriceInput(max !== null ? String(max) : "");
    }
  };

  const hasAnyCatalogFilter =
    selectedCategory !== "All" ||
    searchQuery.trim() !== "" ||
    inStockOnly ||
    appliedMinPrice !== null ||
    appliedMaxPrice !== null ||
    minRatingFilter > 0 ||
    selectedSellerCity !== "All";

  const activeSidebarFilterCount =
    (selectedCategory !== "All" ? 1 : 0) +
    (inStockOnly ? 1 : 0) +
    (appliedMinPrice !== null || appliedMaxPrice !== null ? 1 : 0) +
    (minRatingFilter > 0 ? 1 : 0) +
    (selectedSellerCity !== "All" ? 1 : 0);

  const resetAllCatalogFilters = () => {
    setSelectedCategory("All");
    setSearchQuery("");
    setInStockOnly(false);
    setMinPriceInput("");
    setMaxPriceInput("");
    setAppliedMinPrice(null);
    setAppliedMaxPrice(null);
    setMinRatingFilter(0);
    setSelectedSellerCity("All");
  };

  const totalUnreadChats = chatConversations.reduce((sum, conv) => sum + Number(conv?.unread_count || 0), 0);

  // Real E-Commerce Filtering & Merchandising Arrangement:
  // In EVERY sort mode, active buyable listings (in-stock & priced) ALWAYS arrange ahead of out-of-stock/unpriced items.
  const filteredItems = items
    .filter(i => {
      const matchesCategory = matchesCategoryItem(i, selectedCategory);
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch = !q ||
        i.name.toLowerCase().includes(q) ||
        (i.description || "").toLowerCase().includes(q) ||
        (i.category || "").toLowerCase().includes(q) ||
        (i.user?.name || "").toLowerCase().includes(q) ||
        (i.user?.location || "").toLowerCase().includes(q);

      if (!matchesCategory || !matchesSearch) return false;
      if (inStockOnly && calculateTotalStock(i) <= 0) return false;

      const effPrice = getEffectiveNumericPrice(i);
      if (appliedMinPrice !== null && effPrice < appliedMinPrice) return false;
      if (appliedMaxPrice !== null && (effPrice <= 0 || effPrice > appliedMaxPrice)) return false;

      if (minRatingFilter > 0 && Number(i.reviews_avg_rating || 0) < minRatingFilter) return false;

      if (selectedSellerCity !== "All") {
        const itemCity = ((i.user?.location || (i as any).location || "").split(",")[0] || "").trim().toLowerCase();
        if (itemCity !== selectedSellerCity.toLowerCase()) return false;
      }

      return true;
    })
    .sort((a, b) => {
      const stockA = calculateTotalStock(a);
      const stockB = calculateTotalStock(b);
      const priceA = getEffectiveNumericPrice(a);
      const priceB = getEffectiveNumericPrice(b);

      // Merchandising priority: 2 = In-stock & priced, 1 = In-stock unpriced, 0 = Sold Out
      const availTierA = stockA > 0 && priceA > 0 ? 2 : stockA > 0 ? 1 : 0;
      const availTierB = stockB > 0 && priceB > 0 ? 2 : stockB > 0 ? 1 : 0;
      if (availTierA !== availTierB) return availTierB - availTierA;

      if (sortBy === "newest") {
        const tA = new Date(a.created_at || 0).getTime() || Number(a.id || 0);
        const tB = new Date(b.created_at || 0).getTime() || Number(b.id || 0);
        return tB - tA;
      }
      if (sortBy === "price-asc") return priceA - priceB;
      if (sortBy === "price-desc") return priceB - priceA;
      if (sortBy === "rating") {
        const diff = Number(b.reviews_avg_rating || 0) - Number(a.reviews_avg_rating || 0);
        return diff !== 0 ? diff : Number(b.reviews_count || 0) - Number(a.reviews_count || 0);
      }
      if (sortBy === "popular") {
        const diff = Number(b.sold_count || 0) - Number(a.sold_count || 0);
        return diff !== 0 ? diff : Number(b.reviews_count || 0) - Number(a.reviews_count || 0);
      }

      // Default "featured" (Recommended): Flash deals -> real sales & reviews -> newest listings
      const dealA = getActiveFlashDeal(a.id) ? 1 : 0;
      const dealB = getActiveFlashDeal(b.id) ? 1 : 0;
      if (dealA !== dealB) return dealB - dealA;

      const scoreA = Number(a.sold_count || 0) * 2 + Number(a.reviews_count || 0);
      const scoreB = Number(b.sold_count || 0) * 2 + Number(b.reviews_count || 0);
      if (scoreA !== scoreB) return scoreB - scoreA;

      const timeA = new Date(a.created_at || 0).getTime() || Number(a.id || 0);
      const timeB = new Date(b.created_at || 0).getTime() || Number(b.id || 0);
      return timeB - timeA;
    });

  const filteredInStockCount = filteredItems.filter(i => calculateTotalStock(i) > 0).length;
  const activeCategoryLabel = departmentTabs.find(t => t.id.toLowerCase() === selectedCategory.toLowerCase())?.label || selectedCategory;

  const renderSidebarFilterControls = (closeOnSelect?: boolean) => (
    <div className="sidebar-sections">
      {/* 1. Department / Category */}
      <div className="filter-group">
        <h3 className="filter-group-title">By Category</h3>
        <div className="filter-cat-list">
          {departmentTabs.map((tab) => {
            const isActive = selectedCategory.toLowerCase() === tab.id.toLowerCase();
            return (
              <button
                key={tab.id}
                type="button"
                className={`filter-cat-btn ${isActive ? "active" : ""}`}
                onClick={() => {
                  handleSelectCategory(tab.id);
                  if (closeOnSelect) setIsMobileFiltersOpen(false);
                }}
              >
                <span className="filter-cat-label">{tab.label}</span>
                <span className="filter-cat-count">{tab.count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Availability */}
      <div className="filter-group">
        <h3 className="filter-group-title">Availability</h3>
        <label className="filter-check-row">
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={(e) => setInStockOnly(e.target.checked)}
          />
          <span className="filter-check-text">In Stock Only</span>
          <span className="filter-cat-count">{inStockTotalCount}</span>
        </label>
      </div>

      {/* 3. Price Range (PHP) */}
      <div className="filter-group">
        <h3 className="filter-group-title">Price Range (₱)</h3>
        <form onSubmit={applyPriceRangeFilter} className="price-range-form">
          <div className="price-inputs-row">
            <input
              type="number"
              min="0"
              placeholder="₱ MIN"
              value={minPriceInput}
              onChange={(e) => setMinPriceInput(e.target.value)}
              className="price-range-input"
              aria-label="Minimum price in Pesos"
            />
            <span className="price-range-sep">–</span>
            <input
              type="number"
              min="0"
              placeholder="₱ MAX"
              value={maxPriceInput}
              onChange={(e) => setMaxPriceInput(e.target.value)}
              className="price-range-input"
              aria-label="Maximum price in Pesos"
            />
          </div>
          <button type="submit" className="price-apply-btn">
            Apply
          </button>
        </form>
        <div className="price-presets-grid">
          {[
            { label: "Under ₱100", min: null as number | null, max: 100 as number | null },
            { label: "₱100 – ₱300", min: 100 as number | null, max: 300 as number | null },
            { label: "Over ₱300", min: 300 as number | null, max: null as number | null },
          ].map((preset) => {
            const active = appliedMinPrice === preset.min && appliedMaxPrice === preset.max;
            return (
              <button
                key={preset.label}
                type="button"
                className={`price-preset-btn ${active ? "active" : ""}`}
                onClick={() => selectPricePreset(preset.min, preset.max)}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Shipped From (Dynamically populated from real seller locations) */}
      {availableSellerCities.length > 0 && (
        <div className="filter-group">
          <h3 className="filter-group-title">Shipped From</h3>
          <div className="filter-cat-list">
            <button
              type="button"
              className={`filter-cat-btn ${selectedSellerCity === "All" ? "active" : ""}`}
              onClick={() => setSelectedSellerCity("All")}
            >
              <span className="filter-cat-label">All Locations</span>
              <span className="filter-cat-count">{items.length}</span>
            </button>
            {availableSellerCities.map(({ city, count }) => {
              const isCityActive = selectedSellerCity.toLowerCase() === city.toLowerCase();
              return (
                <button
                  key={city}
                  type="button"
                  className={`filter-cat-btn ${isCityActive ? "active" : ""}`}
                  onClick={() => setSelectedSellerCity(isCityActive ? "All" : city)}
                >
                  <span className="filter-cat-label">{city}</span>
                  <span className="filter-cat-count">{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. Rating */}
      <div className="filter-group" style={{ borderBottom: "none", paddingBottom: 0 }}>
        <h3 className="filter-group-title">Customer Rating</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {[4, 3].map((stars) => {
            const isSelected = minRatingFilter === stars;
            return (
              <button
                key={stars}
                type="button"
                className={`rating-filter-btn ${isSelected ? "active" : ""}`}
                onClick={() => setMinRatingFilter(isSelected ? 0 : stars)}
              >
                <span style={{ display: "inline-flex", gap: 2, color: "#F59E0B" }}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <svg key={s} width="12" height="12" viewBox="0 0 24 24" fill={s <= stars ? "#F59E0B" : "none"} stroke="#F59E0B" strokeWidth="2">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.27 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z" />
                    </svg>
                  ))}
                </span>
                <span>&amp; Up</span>
              </button>
            );
          })}
        </div>
      </div>

      {hasAnyCatalogFilter && (
        <button
          type="button"
          className="sidebar-clear-all-btn"
          onClick={() => {
            resetAllCatalogFilters();
            if (closeOnSelect) setIsMobileFiltersOpen(false);
          }}
        >
          Clear All Filters
        </button>
      )}
    </div>
  );

  return (
    <>
      <style>{`
        /* Use overflow-x: clip (NOT hidden) and height: auto so position: sticky works reliably on all browsers */
        html, body{max-width:100%;overflow-x:clip;height:auto !important}
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#F4F5F7;color:#111827;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;-webkit-font-smoothing:antialiased}
        input, textarea, select { color: #111827 !important; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }
        .root{min-height:100vh;background:#F4F5F7;display:flex;flex-direction:column}

        /* TWO-TIER STICKY REAL E-COMMERCE HEADER */
        .store-header{background:#FFFFFF;border-bottom:1px solid #E5E7EB;position:sticky;top:0;z-index:60;box-shadow:0 1px 3px rgba(17,24,39,0.04)}
        .top-utility-bar{background:#F9FAFB;border-bottom:1px solid #F3F4F6;font-size:12px;color:#4B5563}
        .top-utility-inner{max-width:1320px;margin:0 auto;padding:0 24px;height:32px;display:flex;align-items:center;justify-content:space-between;gap:12px}
        .utility-links-left{display:flex;align-items:center;gap:14px}
        .utility-link{color:#4B5563;text-decoration:none;font-weight:500;transition:color .15s;white-space:nowrap}
        .utility-link:hover{color:#111827}
        .utility-sep{color:#D1D5DB;font-size:11px;user-select:none}
        .utility-right{display:flex;align-items:center;gap:12px}
        .utility-loc-btn{display:inline-flex;align-items:center;gap:5px;background:none;border:none;color:#374151;font-size:12px;font-weight:500;cursor:pointer;padding:2px 6px;border-radius:4px;transition:background .15s}
        .utility-loc-btn:hover{background:#EEF0F3;color:#111827}

        .header-top-inner{max-width:1320px;margin:0 auto;padding:0 24px;height:66px;display:flex;align-items:center;gap:20px}
        .brand-cluster{display:flex;align-items:center;gap:12px;flex-shrink:0}
        .nav-logo{display:inline-flex;align-items:center;gap:9px;text-decoration:none;cursor:pointer}
        .logo-text{font-family:'Plus Jakarta Sans','Inter',sans-serif;font-size:21px;font-weight:800;color:#111827;letter-spacing:-0.03em}

        /* SCOPED RETAIL SEARCH BAR */
        .header-search-form{flex:1;max-width:650px;margin:0 auto;display:flex;align-items:center;height:42px;
          background:#FFFFFF;border:1.5px solid #111827;border-radius:8px;overflow:hidden;transition:box-shadow .15s}
        .header-search-form:focus-within{box-shadow:0 0 0 3px rgba(17,24,39,0.08)}
        .search-scope-select{height:100%;border:none;border-right:1px solid #E5E7EB;background:#F9FAFB;padding:0 10px;
          font-size:12.5px;font-weight:500;color:#374151;cursor:pointer;outline:none;max-width:135px;flex-shrink:0}
        .search-scope-select:hover{background:#F3F4F6}
        .header-search-input{flex:1;min-width:0;border:none;outline:none;background:transparent;padding:0 12px;font-size:13.5px;color:#111827}
        .header-search-input::placeholder{color:#6B7280}
        .header-search-clear{width:20px;height:20px;margin-right:6px;border-radius:50%;border:none;background:#E5E7EB;color:#4B5563;
          font-size:11px;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}
        .header-search-clear:hover{background:#D1D5DB;color:#111827}
        .header-search-submit{height:100%;padding:0 18px;border:none;background:#111827;color:#FFFFFF;
          font-size:13px;font-weight:600;cursor:pointer;flex-shrink:0;display:inline-flex;align-items:center;gap:6px;transition:background .15s}
        .header-search-submit:hover{background:#1F2937}

        /* HEADER ACTIONS */
        .nav-right{display:flex;align-items:center;gap:8px;margin-left:auto;flex-shrink:0}
        .header-util-btn{position:relative;height:40px;padding:0 12px;border-radius:8px;border:1px solid #E5E7EB;background:#FFFFFF;
          color:#374151;font-size:13px;font-weight:500;display:inline-flex;align-items:center;justify-content:center;gap:7px;
          cursor:pointer;text-decoration:none;transition:background .15s,border-color .15s,color .15s}
        .header-util-btn:hover{background:#F9FAFB;border-color:#D1D5DB;color:#111827}
        .header-badge{position:absolute;top:-5px;right:-5px;background:#DC2626;color:#FFFFFF;
          font-size:10px;font-weight:700;min-width:18px;height:18px;padding:0 4px;border-radius:999px;
          display:flex;align-items:center;justify-content:center;border:2px solid #FFFFFF;font-variant-numeric:tabular-nums}
        .account-pill{height:40px;padding:0 12px 0 8px;border-radius:8px;border:1px solid #D1D5DB;background:#FFFFFF;
          color:#111827;font-size:13px;font-weight:600;display:inline-flex;align-items:center;gap:8px;text-decoration:none;
          transition:background .15s,border-color .15s}
        .account-pill:hover{background:#F9FAFB;border-color:#9CA3AF}
        .account-avatar{width:24px;height:24px;border-radius:50%;object-fit:cover;background:#F3F4F6;border:1px solid #E5E7EB;
          display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#111827;flex-shrink:0}

        /* MOBILE SEARCH ROW */
        .mobile-search-row{display:none;padding:0 12px 10px;gap:8px;align-items:center}

        /* DEPARTMENT NAVIGATION STRIP */
        .dept-bar{border-top:1px solid #F3F4F6;background:#FFFFFF}
        .dept-bar-inner{max-width:1320px;margin:0 auto;padding:0 24px;display:flex;align-items:center;justify-content:space-between;gap:16px}
        .dept-tabs{display:flex;align-items:center;gap:2px;overflow-x:auto;scrollbar-width:none;-ms-overflow-style:none}
        .dept-tabs::-webkit-scrollbar{display:none}
        .dept-tab{height:40px;padding:0 12px;background:transparent;border:none;border-bottom:2px solid transparent;
          font-size:13px;font-weight:500;color:#4B5563;cursor:pointer;white-space:nowrap;display:inline-flex;align-items:center;gap:5px;
          transition:color .15s,border-color .15s}
        .dept-tab:hover{color:#111827}
        .dept-tab.active{color:#111827;font-weight:600;border-bottom-color:#111827}
        .dept-count{font-size:11px;color:#6B7280;font-variant-numeric:tabular-nums}
        .dept-tab.active .dept-count{color:#111827;font-weight:600}
        .dept-guarantees{display:flex;align-items:center;gap:16px;font-size:12px;color:#6B7280;flex-shrink:0}
        .dept-guarantee-item{display:inline-flex;align-items:center;gap:5px;white-space:nowrap}

        /* MAIN MARKETPLACE CONTAINER & TWO-COLUMN E-COMMERCE LAYOUT */
        .main{max-width:1320px;width:100%;margin:0 auto;padding:16px 24px 56px;flex:1}
        .commerce-breadcrumb{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px;font-size:12.5px;color:#6B7280;flex-wrap:wrap}
        .breadcrumb-trail{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
        .breadcrumb-link{background:none;border:none;padding:0;font-size:12.5px;color:#6B7280;cursor:pointer;font-weight:500}
        .breadcrumb-link:hover{color:#111827;text-decoration:underline}
        .breadcrumb-current{color:#111827;font-weight:600}

        .commerce-layout{display:grid;grid-template-columns:236px minmax(0,1fr);gap:20px;align-items:start}

        /* LEFT FILTER SIDEBAR */
        .filter-sidebar{background:#FFFFFF;border:1px solid #E5E7EB;border-radius:8px;padding:16px;position:sticky;top:154px}
        .sidebar-header{display:flex;align-items:center;justify-content:space-between;gap:8px;padding-bottom:12px;border-bottom:1px solid #E5E7EB;margin-bottom:14px}
        .sidebar-title{display:inline-flex;align-items:center;gap:7px;font-size:13.5px;font-weight:700;color:#111827;text-transform:uppercase;letter-spacing:0.03em}
        .sidebar-reset-inline{background:none;border:none;font-size:12px;font-weight:600;color:#DC2626;cursor:pointer;padding:0}
        .sidebar-reset-inline:hover{text-decoration:underline}
        .sidebar-sections{display:flex;flex-direction:column;gap:14px}
        .filter-group{padding-bottom:14px;border-bottom:1px solid #F3F4F6}
        .filter-group-title{font-size:12.5px;font-weight:600;color:#111827;margin-bottom:9px}
        .filter-cat-list{display:flex;flex-direction:column;gap:3px}
        .filter-cat-btn{width:100%;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 8px;
          border-radius:6px;border:none;background:transparent;color:#4B5563;font-size:13px;font-weight:500;cursor:pointer;text-align:left;transition:background .12s,color .12s}
        .filter-cat-btn:hover{background:#F9FAFB;color:#111827}
        .filter-cat-btn.active{background:#F3F4F6;color:#111827;font-weight:600}
        .filter-cat-label{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .filter-cat-count{font-size:11.5px;color:#6B7280;font-variant-numeric:tabular-nums;flex-shrink:0}
        .filter-cat-btn.active .filter-cat-count{color:#111827;font-weight:600}

        .filter-check-row{display:flex;align-items:center;gap:8px;padding:4px 2px;cursor:pointer;font-size:13px;color:#374151;user-select:none}
        .filter-check-row input{width:15px;height:15px;accent-color:#111827;cursor:pointer;flex-shrink:0}
        .filter-check-text{flex:1;font-weight:500}

        .price-range-form{display:flex;flex-direction:column;gap:8px}
        .price-inputs-row{display:flex;align-items:center;gap:6px}
        .price-range-input{width:100%;min-width:0;height:32px;padding:0 8px;border:1px solid #D1D5DB;border-radius:6px;background:#FFFFFF;font-size:12px;outline:none;font-variant-numeric:tabular-nums}
        .price-range-input:focus{border-color:#111827}
        .price-range-sep{color:#9CA3AF;font-size:12px;flex-shrink:0}
        .price-apply-btn{height:32px;width:100%;border-radius:6px;border:1px solid #111827;background:#111827;color:#FFFFFF;font-size:12px;font-weight:600;cursor:pointer;transition:background .15s}
        .price-apply-btn:hover{background:#1F2937}
        .price-presets-grid{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
        .price-preset-btn{padding:4px 8px;border-radius:5px;border:1px solid #E5E7EB;background:#F9FAFB;color:#374151;font-size:11.5px;font-weight:500;cursor:pointer;transition:all .12s}
        .price-preset-btn:hover{border-color:#D1D5DB;color:#111827}
        .price-preset-btn.active{background:#111827;border-color:#111827;color:#FFFFFF;font-weight:600}

        .rating-filter-btn{width:100%;display:flex;align-items:center;gap:7px;padding:6px 8px;border-radius:6px;border:1px solid transparent;background:transparent;font-size:12.5px;font-weight:500;color:#374151;cursor:pointer;transition:background .12s}
        .rating-filter-btn:hover{background:#F9FAFB}
        .rating-filter-btn.active{background:#F3F4F6;border-color:#D1D5DB;color:#111827;font-weight:600}
        .sidebar-clear-all-btn{width:100%;height:34px;border-radius:6px;border:1px solid #D1D5DB;background:#FFFFFF;color:#111827;font-size:12.5px;font-weight:600;cursor:pointer;margin-top:2px;transition:background .15s}
        .sidebar-clear-all-btn:hover{background:#F9FAFB}

        /* RIGHT MAIN CATALOG COLUMN */
        .catalog-main-col{min-width:0;display:flex;flex-direction:column}

        /* CONDITIONAL REAL VOUCHER STRIP */
        .voucher-strip{display:flex;align-items:stretch;gap:12px;overflow-x:auto;padding-bottom:4px;margin-bottom:16px;scrollbar-width:none}
        .voucher-strip::-webkit-scrollbar{display:none}
        .voucher-ticket{display:flex;align-items:center;justify-content:space-between;gap:16px;background:#FFFFFF;
          border:1px solid #E5E7EB;border-left:3px solid #0D6847;border-radius:8px;padding:10px 14px;min-width:265px;flex-shrink:0}

        /* FLASH DEALS SHELF */
        .flash-deals-banner{background:#FFFFFF;border-radius:8px;padding:16px 18px;border:1px solid #E5E7EB;margin-bottom:16px;
          display:flex;flex-direction:column;gap:14px;scroll-margin-top:154px}
        .flash-clock-box{background:#111827;color:#FFFFFF;font-weight:700;font-size:12px;padding:3px 7px;border-radius:5px;
          font-variant-numeric:tabular-nums;display:inline-block;min-width:26px;text-align:center}
        .flash-items-slider{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}

        /* REAL E-COMMERCE HORIZONTAL SORT BAR */
        .commerce-sort-bar{background:#FFFFFF;border:1px solid #E5E7EB;border-radius:8px;padding:9px 14px;margin-bottom:14px;
          display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px}
        .sort-bar-left{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
        .sort-bar-label{font-size:12.5px;color:#6B7280;font-weight:500;margin-right:4px}
        .sort-pill-btn{height:32px;padding:0 12px;border-radius:6px;border:1px solid #E5E7EB;background:#FFFFFF;
          color:#374151;font-size:12.5px;font-weight:500;cursor:pointer;transition:all .15s;white-space:nowrap}
        .sort-pill-btn:hover{background:#F9FAFB;border-color:#D1D5DB;color:#111827}
        .sort-pill-btn.active{background:#111827;border-color:#111827;color:#FFFFFF;font-weight:600}
        .sort-price-select{height:32px;padding:0 28px 0 10px;border-radius:6px;border:1px solid #E5E7EB;background:#FFFFFF;
          font-size:12.5px;font-weight:500;color:#374151;cursor:pointer;outline:none}
        .sort-price-select.active{border-color:#111827;color:#111827 !important;font-weight:600;background:#F9FAFB}
        .sort-bar-right{display:flex;align-items:center;gap:10px;font-size:12.5px;color:#6B7280;font-variant-numeric:tabular-nums;margin-left:auto}
        .mobile-filter-trigger{display:none;height:32px;padding:0 11px;border-radius:6px;border:1px solid #D1D5DB;background:#FFFFFF;
          color:#111827;font-size:12.5px;font-weight:600;align-items:center;gap:6px;cursor:pointer}

        .active-filters-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:14px}
        .filter-chip{display:inline-flex;align-items:center;gap:6px;background:#FFFFFF;border:1px solid #D1D5DB;color:#111827;
          font-size:12px;font-weight:500;padding:4px 10px;border-radius:6px}
        .filter-chip button{background:none;border:none;color:#6B7280;cursor:pointer;font-size:13px;line-height:1;padding:0}
        .filter-chip button:hover{color:#111827}

        /* RETAIL PRODUCT GRID & PROPORTIONED E-COMMERCE CARDS */
        .grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}
        @media (max-width: 1180px){.grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}}
        .item-card{background:#FFFFFF;border-radius:8px;overflow:hidden;border:1px solid #E5E7EB;
          transition:border-color .16s ease,box-shadow .16s ease,transform .16s ease;display:flex;flex-direction:column;cursor:pointer}
        .item-card:hover{border-color:#9CA3AF;box-shadow:0 6px 18px rgba(17,24,39,0.07);transform:translateY(-1px)}
        .item-card.sold-out-card{background:#FCFCFD}
        .item-img-wrap{position:relative;width:100%;aspect-ratio:1 / 1;background:#F3F4F6;overflow:hidden;border-bottom:1px solid #F3F4F6}
        .item-card-img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .28s ease}
        .item-card:hover .item-card-img{transform:scale(1.03)}
        .item-image-placeholder{width:100%;height:100%;background:#F3F4F6;display:flex;align-items:center;justify-content:center;color:#9CA3AF}

        .item-content{padding:11px 12px 12px;flex:1;display:flex;flex-direction:column}
        .item-meta-top{display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:4px}
        .item-cat-text{font-size:11px;font-weight:500;color:#6B7280;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .item-stock-tag{font-size:10.5px;font-weight:600;font-variant-numeric:tabular-nums;white-space:nowrap;flex-shrink:0}
        .item-name{font-size:13.5px;font-weight:500;color:#111827;line-height:1.38;margin:0 0 8px;
          display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;height:37.5px}
        .item-price-row{display:flex;align-items:baseline;gap:6px;margin-bottom:6px;min-height:22px}
        .item-price{font-family:'Plus Jakarta Sans','Inter',sans-serif;font-size:16.5px;font-weight:700;color:#111827;
          font-variant-numeric:tabular-nums;letter-spacing:-0.01em}
        .item-stats-line{display:flex;align-items:center;justify-content:space-between;gap:6px;font-size:11.5px;color:#6B7280;margin-bottom:10px;font-variant-numeric:tabular-nums}

        /* PROPORTIONED E-COMMERCE CARD CTA ROW: [🛒] + [Buy Now] */
        .card-actions-row{display:flex;gap:7px;width:100%;margin-top:auto}
        .card-cart-icon-btn{width:34px;height:34px;border-radius:7px;border:1px solid #D1D5DB;background:#FFFFFF;color:#111827;
          display:inline-flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;transition:background .15s,border-color .15s}
        .card-cart-icon-btn:hover{background:#F3F4F6;border-color:#9CA3AF}
        .buy-btn{height:34px;padding:0 12px;background:#111827;border:1px solid #111827;border-radius:7px;color:#FFFFFF;
          font-size:12.5px;font-weight:600;cursor:pointer;transition:background .15s;
          display:inline-flex;align-items:center;justify-content:center;gap:5px;flex:1;white-space:nowrap}
        .buy-btn:hover{background:#1F2937}
        .add-cart-btn{height:36px;padding:0 12px;background:#FFFFFF;border:1px solid #D1D5DB;color:#111827;
          border-radius:7px;font-size:12.5px;font-weight:600;cursor:pointer;transition:background .15s,border-color .15s;
          display:inline-flex;align-items:center;justify-content:center;gap:6px;flex:1;white-space:nowrap}
        .add-cart-btn:hover{background:#F9FAFB;border-color:#9CA3AF}

        .card-seller-row{margin-top:10px;padding-top:8px;border-top:1px solid #F3F4F6;display:flex;align-items:center;justify-content:space-between;gap:6px;min-width:0}
        .card-seller-left{display:flex;align-items:center;gap:6px;min-width:0;flex:1}
        .card-seller-name{font-size:11.5px;font-weight:500;color:#4B5563;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .card-seller-loc{display:inline-flex;align-items:center;gap:2px;font-size:11px;color:#6B7280;text-decoration:none;
          white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:46%;flex-shrink:0}
        .card-seller-loc:hover{color:#111827}

        /* MOBILE FILTER DRAWER */
        .mobile-filter-backdrop{position:fixed;inset:0;background:rgba(17,24,39,0.48);z-index:200;display:flex;justify-content:flex-end}
        .mobile-filter-sheet{width:min(320px,88vw);height:100%;background:#FFFFFF;display:flex;flex-direction:column;box-shadow:-8px 0 24px rgba(17,24,39,0.16)}
        .mobile-filter-sheet-head{padding:14px 16px;border-bottom:1px solid #E5E7EB;display:flex;align-items:center;justify-content:space-between}
        .mobile-filter-sheet-body{padding:16px;overflow-y:auto;flex:1}
        .mobile-filter-sheet-foot{padding:12px 16px;border-top:1px solid #E5E7EB;display:flex;gap:8px;background:#FFFFFF}

        .empty-state{text-align:center;padding:64px 20px;background:#FFFFFF;border:1px solid #E5E7EB;border-radius:8px}
        .empty-icon{margin-bottom:14px;display:flex;justify-content:center}
        .empty-text{font-size:16px;font-weight:700;color:#111827}
        .subtitle{font-size:13.5px;color:#6B7280;max-width:460px;margin:6px auto 0;line-height:1.5}

        .loading-container{min-height:60vh;display:flex;align-items:center;justify-content:center}
        .spinner{width:36px;height:36px;border-radius:50%;border:2.5px solid #E5E7EB;border-top-color:#111827;animation:spin .7s linear infinite}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes typingBounce{0%,80%,100%{transform:scale(0.6);opacity:0.4}40%{transform:scale(1);opacity:1}}

        .toast{position:fixed;top:112px;right:24px;background:#111827;color:#fff;padding:12px 18px;
          border-radius:8px;font-size:13px;font-weight:600;z-index:1000;
          box-shadow:0 10px 24px rgba(17,24,39,.16);animation:slideIn .2s ease}
        @keyframes slideIn{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:translateX(0)}}

        .modal-overlay{position:fixed;inset:0;background:rgba(17,24,39,.55);backdrop-filter:blur(4px);
          display:flex;align-items:center;justify-content:center;z-index:500;padding:0}
        .detail-modal{position:relative;background:#fff;border-radius:0;max-width:100%;width:100%;max-height:100vh;height:100%;
          overflow-y:auto;overflow-x:hidden;display:flex;flex-direction:column;box-shadow:none;animation:scaleUp .22s ease}
        .detail-modal > div{flex-shrink:0}
        @keyframes scaleUp{from{opacity:0;transform:scale(0.97)}to{opacity:1;transform:scale(1)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}

        .detail-content{display:grid;grid-template-columns:minmax(0,1fr);gap:20px;padding:16px}
        .detail-img-side{display:flex;flex-direction:column;gap:14px;min-width:0}
        .detail-image-expand{display:block;width:100%;height:100%;padding:0;border:0;background:transparent;cursor:zoom-in}
        .detail-image-expand:focus-visible{outline:2px solid #111827;outline-offset:-4px}
        .detail-image-hint{position:absolute;bottom:12px;left:50%;transform:translateX(-50%);padding:6px 12px;
          border-radius:6px;background:rgba(255,255,255,.94);color:#374151;font-size:12px;font-weight:600;white-space:nowrap;
          border:1px solid #E5E7EB;pointer-events:none}
        .main-detail-img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:12px;background:#F3F4F6;border:1px solid #E5E7EB}
        .variant-thumbs{display:flex;gap:10px;overflow-x:auto;padding:2px;scrollbar-width:none;-ms-overflow-style:none}
        .variant-thumbs::-webkit-scrollbar{display:none}
        .v-thumb{width:56px;height:56px;border-radius:8px;object-fit:cover;cursor:pointer;
          border:2px solid transparent;transition:border-color .15s;flex-shrink:0;background:#F3F4F6}
        .v-thumb.active{border-color:#111827}

        .detail-info-side{display:flex;flex-direction:column;gap:16px;min-width:0}
        .detail-category{font-size:11px;font-weight:600;color:#6B7280;text-transform:uppercase;letter-spacing:0.06em}
        .detail-name{font-size:22px;font-weight:700;color:#111827;letter-spacing:-0.02em;line-height:1.2;margin-top:4px}
        .detail-price{font-family:'Plus Jakarta Sans','Inter',sans-serif;font-size:24px;font-weight:700;color:#111827;font-variant-numeric:tabular-nums}
        .detail-desc{font-size:14.5px;color:#4B5563;line-height:1.65}
        .modal-actions-container{display:flex;flex-direction:column;gap:10px;margin-top:8px}
        .modal-close-btn{position:fixed;top:12px;right:12px;width:36px;height:36px;
          border-radius:50%;background:rgba(255,255,255,0.95);
          display:flex;align-items:center;justify-content:center;cursor:pointer;
          border:1px solid #E5E7EB;color:#111827;z-index:9999;transition:background .15s,border-color .15s;
          box-shadow:0 2px 8px rgba(0,0,0,.06)}
        .modal-close-btn:hover{background:#F3F4F6;border-color:#D1D5DB}

        @media (min-width: 769px) {
          .modal-overlay{padding:24px}
          .detail-modal{border-radius:14px;max-width:1060px;max-height:90vh;height:auto;box-shadow:0 24px 48px rgba(17,24,39,0.22);border:1px solid #E5E7EB}
          .detail-content{grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:40px;padding:36px 40px}
          .v-thumb{width:64px;height:64px}
          .detail-info-side{gap:20px}
          .detail-name{font-size:28px}
          .detail-price{font-size:28px}
          .modal-close-btn{position:absolute;top:16px;right:16px;width:38px;height:38px;z-index:110}
          .modal-actions-container{flex-direction:row;gap:12px}
          .description-section{padding:32px 40px}
          .rating-section{padding:32px 40px}
          .seller-header-bar{padding:24px 40px;flex-direction:row;align-items:center;gap:28px}
        }

        @media (max-width: 980px) {
          .commerce-layout{grid-template-columns:minmax(0,1fr)}
          .filter-sidebar{display:none}
          .mobile-filter-trigger{display:inline-flex}
          .dept-guarantees{display:none}
        }

        @media (max-width: 768px) {
          .top-utility-bar{display:none}
          .header-top-inner{padding:0 12px;height:56px;gap:10px}
          .header-search-desktop{display:none !important}
          .mobile-search-row{display:flex}
          .util-label{display:none}
          .header-util-btn{width:36px;height:36px;padding:0}
          .account-name-text{display:none}
          .account-pill{padding:0 6px;height:36px}
          .dept-bar-inner{padding:0 12px}
          .dept-tab{height:38px;padding:0 10px;font-size:12.5px}
          .main{padding:12px 12px 40px}
          .sort-bar-label{display:none}
          .sort-pill-btn{height:30px;padding:0 9px;font-size:12px}
          .grid{grid-template-columns:repeat(2,minmax(0,1fr)) !important;gap:10px !important}
          .item-content{padding:9px 10px 11px}
          .item-name{font-size:13px;height:35.5px;margin-bottom:6px}
          .item-price{font-size:15px}
          .item-stats-line{font-size:11px;margin-bottom:8px}
          .card-actions-row{gap:6px}
          .card-cart-icon-btn{width:32px;height:32px}
          .card-actions-row .buy-btn{height:32px;font-size:11.5px;padding:0 8px}
          .card-seller-loc{display:none}
          .flash-items-slider{grid-template-columns:repeat(2,minmax(0,1fr))}
          .rating-summary{display:flex;flex-direction:column;gap:16px;padding:16px;align-items:flex-start}
          .spec-grid{grid-template-columns:1fr;padding:14px}
          .seller-header-bar{padding:16px;gap:16px}
          .seller-stats-grid{grid-template-columns:repeat(3,minmax(0,1fr)) !important;gap:8px !important;width:100%}
          .similar-products-section{padding:24px 16px !important}
          .similar-products-grid{grid-template-columns:repeat(2,minmax(0,1fr)) !important;gap:12px !important}
          .modal-actions-container{position:fixed !important;bottom:0 !important;left:0 !important;right:0 !important;
            background:#fff !important;padding:10px 14px !important;border-top:1px solid #E5E7EB !important;margin-top:0 !important;
            z-index:1000 !important;flex-direction:row !important;gap:10px !important;box-shadow:0 -4px 16px rgba(0,0,0,0.06) !important}
          .modal-actions-container .buy-btn, .modal-actions-container .add-cart-btn{height:44px !important;font-size:13px !important;flex:1 !important}
          .detail-modal{padding-bottom:76px !important}
          .back-to-top{bottom:84px !important;right:16px !important;width:42px !important;height:42px !important}
        }

        @media (max-width: 380px) {
          .seller-stats-grid{grid-template-columns:repeat(2,minmax(0,1fr)) !important}
        }

        .similar-products-section{border-top:1px solid #E5E7EB;padding:32px 40px;background:#fff}
        .similar-products-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}
        .variant-section-label{font-size:12.5px;font-weight:600;color:#111827;margin-bottom:8px;display:block}
        .size-grid{display:flex;gap:8px;flex-wrap:wrap}
        .size-btn{padding:6px 12px;border:1px solid #D1D5DB;border-radius:6px;background:#fff;
          color:#111827;font-size:13px;font-weight:500;cursor:pointer;transition:border-color .15s,background .15s;
          display:flex;align-items:center;gap:8px;min-width:fit-content}
        .size-btn:hover{border-color:#111827}
        .size-btn.active{border-color:#111827;color:#111827;background:#F3F4F6;font-weight:600;box-shadow:inset 0 0 0 1px #111827}
        .variant-btn-img{width:22px;height:22px;object-fit:cover;border-radius:4px;border:1px solid #E5E7EB}

        .spec-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;background:#F9FAFB;padding:18px;border-radius:10px;border:1px solid #E5E7EB}
        .spec-item{display:flex;flex-direction:column;gap:2px}
        .spec-label{font-size:11px;color:#6B7280;font-weight:600;text-transform:uppercase;letter-spacing:0.04em}
        .spec-val{font-size:13.5px;color:#111827;font-weight:600}

        .description-section{border-top:1px solid #E5E7EB;padding:24px 16px;background:#fff}
        .description-images-gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px;width:100%}
        .desc-image-card{position:relative;border-radius:10px;overflow:hidden;border:1px solid #E5E7EB;background:#F3F4F6;aspect-ratio:16/10;cursor:pointer}
        .desc-image-badge{position:absolute;top:8px;left:8px;background:rgba(17,24,39,0.75);color:#fff;font-size:10px;font-weight:600;padding:3px 8px;border-radius:4px;z-index:2}
        .desc-gallery-img{width:100%;height:100%;object-fit:cover;display:block}
        .desc-zoom-overlay{position:absolute;inset:0;background:rgba(17,24,39,0.3);display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .15s;z-index:3;color:#fff;font-size:12px;font-weight:600;gap:6px}
        .desc-image-card:hover .desc-zoom-overlay{opacity:1}

        .rating-section{border-top:1px solid #E5E7EB;padding:24px 16px;background:#fff}
        .reviews-scroll-container{max-height:420px;overflow-y:auto;padding:16px 18px;background:#F9FAFB;border-radius:10px;border:1px solid #E5E7EB}
        .rating-summary{display:flex;align-items:center;justify-content:space-between;gap:20px;background:#F9FAFB;padding:16px 20px;border-radius:10px;border:1px solid #E5E7EB;margin-bottom:20px;flex-wrap:wrap}
        .big-rating{font-size:32px;font-weight:700;color:#111827;line-height:1;font-variant-numeric:tabular-nums}
        .stars{display:flex;gap:2px;color:#F59E0B}
        .review-filters{display:flex;gap:6px;flex-wrap:wrap}
        .rev-filter{padding:6px 12px;border-radius:6px;border:1px solid #D1D5DB;font-size:12px;font-weight:500;color:#4B5563;cursor:pointer;background:#fff;transition:all .15s}
        .rev-filter:hover{border-color:#9CA3AF;color:#111827}
        .rev-filter.active{background:#111827;color:#fff;border-color:#111827}

        .review-card{padding:14px 0;border-bottom:1px solid #E5E7EB}
        .review-card:last-child{border-bottom:none}
        .review-user{display:flex;align-items:center;gap:10px;margin-bottom:6px}
        .u-avatar{width:32px;height:32px;border-radius:50%;background:#E5E7EB;display:flex;align-items:center;justify-content:center;font-weight:700;color:#374151;font-size:12px}
        .u-info{display:flex;flex-direction:column;gap:2px}
        .u-name{font-size:13px;font-weight:600;color:#111827}
        .r-date{font-size:11.5px;color:#6B7280}
        .r-text{font-size:13.5px;color:#374151;line-height:1.55;margin:6px 0}
        .r-images{display:flex;gap:8px;flex-wrap:wrap;margin-top:6px}
        .r-img{width:64px;height:64px;border-radius:6px;object-fit:cover;cursor:pointer;border:1px solid #E5E7EB}

        .back-to-top{position:fixed;bottom:28px;right:28px;width:44px;height:44px;border-radius:50%;background:#111827;color:#fff;
          display:flex;align-items:center;justify-content:center;cursor:pointer;border:1px solid rgba(255,255,255,0.1);
          box-shadow:0 6px 18px rgba(17,24,39,.18);transition:all .2s ease;z-index:1000;opacity:0;visibility:hidden;transform:translateY(12px)}
        .back-to-top.visible{opacity:1;visibility:visible;transform:translateY(0)}
        .back-to-top:hover{background:#1F2937}

        .seller-header-bar{background:#F9FAFB;border-top:1px solid #E5E7EB;border-bottom:1px solid #E5E7EB;padding:20px 24px;display:flex;align-items:center;justify-content:space-between;gap:24px;flex-wrap:wrap}
        @media (max-width: 950px) { .seller-header-bar{padding:18px 16px;flex-direction:column;align-items:flex-start} }
        .seller-left-side{display:flex;align-items:center;gap:14px;flex-wrap:wrap}
        .seller-avatar-wrapper{position:relative}
        .seller-main-avatar{width:56px;height:56px;border-radius:50%;object-fit:cover;background:#F3F4F6;border:1px solid #E5E7EB;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700;color:#374151}
        .seller-info-col{display:flex;flex-direction:column;gap:3px}
        .seller-title-name{font-size:15.5px;font-weight:700;color:#111827;display:flex;align-items:center;gap:6px;margin:0}
        .seller-active-status{font-size:12px;color:#6B7280;margin-bottom:4px}
        .seller-actions-row{display:flex;gap:8px;flex-wrap:wrap}
        .seller-btn-chat{padding:6px 13px;background:#111827;border:1px solid #111827;color:#FFFFFF;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px;transition:background .15s}
        .seller-btn-chat:hover{background:#1F2937}
        .seller-btn-shop{padding:6px 13px;background:#fff;border:1px solid #D1D5DB;color:#374151;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px;transition:all .15s}
        .seller-stats-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;flex-grow:1;max-width:520px}
        .seller-stat-box{display:flex;flex-direction:column;align-items:flex-start;justify-content:center;padding:8px 10px;background:#fff;border:1px solid #E5E7EB;border-radius:8px;gap:2px}
        .seller-stat-label{font-size:10.5px;font-weight:500;color:#6B7280}
        .seller-stat-val{font-size:13px;font-weight:700;color:#111827;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
      `}</style>

      <div className="root">
        {/* TWO-TIER STICKY E-COMMERCE HEADER */}
        <header className="store-header">
          {/* Tier 1: Retail Utility Strip */}
          <div className="top-utility-bar">
            <div className="top-utility-inner">
              <div className="utility-links-left">
                <Link href="/dashboard" className="utility-link">Seller Centre</Link>
                <span className="utility-sep">|</span>
                <Link href="/dashboard?tab=orders" className="utility-link">My Orders</Link>
                <span className="utility-sep">|</span>
                <Link href="/guides" className="utility-link">Help &amp; Guides</Link>
              </div>

              <div className="utility-right">
                <button
                  type="button"
                  className="utility-loc-btn"
                  onClick={detectBuyerLocation}
                  disabled={detectingBuyerLoc}
                  title="Click to update your delivery location"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <span>{detectingBuyerLoc ? "Locating..." : `Deliver to: ${buyerLocation || "Philippines"}`}</span>
                </button>
                <span className="utility-sep">|</span>
                <span style={{ fontWeight: 600, color: "#374151" }}>PHP (₱)</span>
              </div>
            </div>
          </div>

          {/* Tier 2: Main Brand, Scoped Search Bar & Account Controls */}
          <div className="header-top-inner">
            <div className="brand-cluster">
              <Link
                href="/shop"
                className="nav-logo"
                onClick={() => {
                  resetAllCatalogFilters();
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                <svg width="27" height="27" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <rect x="4" y="9" width="24" height="19" rx="4.5" fill="#111827" />
                  <path d="M11 9V7.5a5 5 0 0 1 10 0V9" stroke="#111827" strokeWidth="2.2" strokeLinecap="round" />
                  <path d="M11.5 16.5c1.2 2.2 3 3.2 4.5 3.2s3.3-1 4.5-3.2" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <span className="logo-text">Shopply</span>
              </Link>
            </div>

            {/* Category-Scoped Retail Search Bar (Desktop) */}
            <form
              className="header-search-form header-search-desktop"
              onSubmit={(e) => {
                e.preventDefault();
                const el = document.getElementById("catalog-products");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
            >
              <select
                className="search-scope-select"
                value={selectedCategory}
                onChange={(e) => handleSelectCategory(e.target.value)}
                aria-label="Search department"
              >
                {departmentTabs.map((tab) => (
                  <option key={tab.id} value={tab.id}>
                    {tab.id === "All" ? "All Categories" : tab.label}
                  </option>
                ))}
              </select>
              <input
                type="search"
                className="header-search-input"
                placeholder="Search for products, brands, and shops..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search marketplace products"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="header-search-clear"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
              <button type="submit" className="header-search-submit">
                <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
                </svg>
                <span>Search</span>
              </button>
            </form>

            {/* Right Utility Controls */}
            <div className="nav-right">
              <button
                type="button"
                className="header-util-btn"
                onClick={() => setIsChatOpen(true)}
                title="Messages"
              >
                <IconChat />
                <span className="util-label">Messages</span>
                {totalUnreadChats > 0 && <span className="header-badge">{totalUnreadChats}</span>}
              </button>

              <Link href="/cart" className="header-util-btn" title="Shopping Cart">
                <IconCart />
                <span className="util-label">Cart</span>
                {cartCount > 0 && <span className="header-badge">{cartCount}</span>}
              </Link>

              <Link href="/dashboard" className="account-pill" title="Open Seller Hub & Account">
                {currentUser?.avatar ? (
                  <img
                    src={getAvatarUrl(currentUser.avatar)}
                    alt=""
                    className="account-avatar"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <span className="account-avatar">
                    {(currentUser?.name || "A").charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="account-name-text">
                  {currentUser?.name ? currentUser.name.split(" ")[0] : "Account"}
                </span>
              </Link>
            </div>
          </div>

          {/* Mobile Search Sub-row */}
          <form
            className="mobile-search-row"
            onSubmit={(e) => {
              e.preventDefault();
            }}
          >
            <div className="header-search-form" style={{ maxWidth: "none", width: "100%", height: 38 }}>
              <input
                type="search"
                className="header-search-input"
                placeholder="Search products or sellers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search marketplace products"
              />
              {searchQuery && (
                <button type="button" className="header-search-clear" onClick={() => setSearchQuery("")}>
                  ✕
                </button>
              )}
              <button type="submit" className="header-search-submit" style={{ padding: "0 12px" }} aria-label="Search">
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </form>

          {/* Tier 3: Department Navigation Strip */}
          <div className="dept-bar">
            <div className="dept-bar-inner">
              <div
                ref={categoryScrollRef}
                className="dept-tabs"
                onMouseDown={handleCategoryMouseDown}
                onMouseMove={handleCategoryMouseMove}
                onMouseUp={handleCategoryMouseUp}
                onMouseLeave={handleCategoryMouseUp}
              >
                {departmentTabs.map((tab) => {
                  const isActive = selectedCategory.toLowerCase() === tab.id.toLowerCase();
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      className={`dept-tab ${isActive ? "active" : ""}`}
                      onClick={() => {
                        if (hasCategoryMovedRef.current) return;
                        handleSelectCategory(tab.id);
                      }}
                    >
                      <span>{tab.label}</span>
                      <span className="dept-count">({tab.count})</span>
                    </button>
                  );
                })}
              </div>

              <div className="dept-guarantees">
                <span className="dept-guarantee-item">
                  <svg width="13.5" height="13.5" viewBox="0 0 24 24" fill="none" stroke="#0D6847" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
                  Buyer Protection
                </span>
                <span className="dept-guarantee-item">
                  <svg width="13.5" height="13.5" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                  Cash on Delivery
                </span>
              </div>
            </div>
          </div>
        </header>

        <main className="main" id="shop-catalog">
          {/* E-COMMERCE BREADCRUMB TRAIL */}
          <nav aria-label="Breadcrumb" className="commerce-breadcrumb">
            <div className="breadcrumb-trail">
              <button type="button" className="breadcrumb-link" onClick={resetAllCatalogFilters}>
                Marketplace
              </button>
              <span>/</span>
              <span className="breadcrumb-current">
                {selectedCategory === "All" ? "All Listings" : activeCategoryLabel}
              </span>
              {searchQuery.trim() !== "" && (
                <>
                  <span>/</span>
                  <span className="breadcrumb-current">Search: &ldquo;{searchQuery.trim()}&rdquo;</span>
                </>
              )}
            </div>
            {!loading && (
              <div>
                Showing <strong style={{ color: "#111827" }}>{filteredItems.length}</strong> of {items.length} products
              </div>
            )}
          </nav>

          {/* STRUCTURED TWO-COLUMN E-COMMERCE CATALOG (LEFT FILTER SIDEBAR + RIGHT PRODUCT GRID) */}
          <div className="commerce-layout" id="catalog-products">
            {/* LEFT FILTER SIDEBAR (Desktop) */}
            <aside className="filter-sidebar" aria-label="Search Filters">
              <div className="sidebar-header">
                <span className="sidebar-title">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                  </svg>
                  Search Filter
                </span>
                {hasAnyCatalogFilter && (
                  <button type="button" className="sidebar-reset-inline" onClick={resetAllCatalogFilters}>
                    Reset
                  </button>
                )}
              </div>
              {renderSidebarFilterControls(false)}
            </aside>

            {/* RIGHT MAIN CATALOG AREA */}
            <div className="catalog-main-col">
              {/* REAL STORE VOUCHERS STRIP — Rendered ONLY when real active vouchers exist in Firestore */}
              {allCoupons.length > 0 && (
                <section aria-label="Available Store Vouchers" className="voucher-strip">
                  {allCoupons.map((voucher) => {
                    const isClaimed = copiedVoucher === voucher.code || claimedVoucher === voucher.code;
                    const discountLabel = voucher.discount_type === "percent"
                      ? `${voucher.discount_value || voucher.discount}% OFF`
                      : `₱${voucher.discount_value || voucher.discount} OFF`;
                    return (
                      <div key={voucher.code} className="voucher-ticket">
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                            <span style={{ fontSize: 13.5, fontWeight: 700, color: "#0D6847", fontVariantNumeric: "tabular-nums" }}>
                              {discountLabel}
                            </span>
                            <span style={{ fontSize: 11, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", color: "#374151", background: "#F3F4F6", padding: "1px 6px", borderRadius: 4 }}>
                              {voucher.code}
                            </span>
                          </div>
                          <div style={{ fontSize: 11.5, color: "#6B7280", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {voucher.min_spend > 0 ? `Min. spend ₱${Number(voucher.min_spend).toFixed(0)}` : (voucher.title || "Valid on marketplace orders")}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => claimVoucher(voucher.code, discountLabel)}
                          style={{
                            height: 30,
                            padding: "0 12px",
                            borderRadius: 6,
                            border: isClaimed ? "1px solid #0D6847" : "1px solid #111827",
                            background: isClaimed ? "#ECFDF5" : "#111827",
                            color: isClaimed ? "#0D6847" : "#FFFFFF",
                            fontSize: 11.5,
                            fontWeight: 600,
                            cursor: "pointer",
                            flexShrink: 0
                          }}
                        >
                          {isClaimed ? "Claimed" : "Claim"}
                        </button>
                      </div>
                    );
                  })}
                </section>
              )}

              {/* REAL ADMIN-CONTROLLED FLASH DEALS — Hidden completely unless active with enrolled products */}
              {flashConfig.is_active && items.length > 0 && (() => {
                if (hasFlashEnded || !flashConfig.is_active || (flashConfig.items || []).length === 0) {
                  return null;
                }

                const enrolledDeals = (flashConfig.items || [])
                  .map(deal => {
                    const product = items.find(p => String(p.id) === String(deal.item_id));
                    if (!product) return null;
                    if (selectedCategory !== "All" && !matchesCategoryItem(product, selectedCategory)) return null;
                    return { product, deal };
                  })
                  .filter(Boolean) as Array<{ product: ShopItem; deal: typeof flashConfig.items[0] }>;

                if (enrolledDeals.length === 0) return null;

                return (
                  <section id="flash-deals-anchor" className="flash-deals-banner">
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                        <h2 style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif", fontSize: 15.5, fontWeight: 700, color: "#111827", margin: 0 }}>
                          Flash Deals
                        </h2>
                        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#4B5563", fontWeight: 600 }}>
                          <span>Ends in</span>
                          <span className="flash-clock-box">{String(flashCountdown.hours).padStart(2, "0")}</span>
                          <span>:</span>
                          <span className="flash-clock-box">{String(flashCountdown.minutes).padStart(2, "0")}</span>
                          <span>:</span>
                          <span className="flash-clock-box">{String(flashCountdown.seconds).padStart(2, "0")}</span>
                        </div>
                      </div>

                      {flashCoupon && (() => {
                        const isClaimed = copiedVoucher === flashCoupon.code || claimedVoucher === flashCoupon.code;
                        const discountText = flashCoupon.discount_type === "percent"
                          ? `${flashCoupon.discount || flashCoupon.discount_value}% OFF`
                          : `₱${flashCoupon.discount_value} OFF`;
                        return (
                          <button
                            type="button"
                            onClick={() => claimVoucher(flashCoupon.code, discountText)}
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              color: isClaimed ? "#0D6847" : "#111827",
                              background: isClaimed ? "#ECFDF5" : "#F9FAFB",
                              border: isClaimed ? "1px solid #A7F3D0" : "1px solid #D1D5DB",
                              padding: "5px 12px",
                              borderRadius: 6,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6
                            }}
                          >
                            <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontWeight: 700 }}>{flashCoupon.code}</span>
                            <span>· {isClaimed ? "Claimed" : discountText}</span>
                          </button>
                        );
                      })()}
                    </div>

                    <div className="flash-items-slider">
                      {enrolledDeals.map(({ product: fItem, deal }) => {
                        const originalPrice = parseFloat(fItem.price) || 0;
                        const flashPrice = Number(deal.flash_price);
                        const discountPct = deal.discount_pct || (originalPrice > 0 ? Math.max(1, Math.round(((originalPrice - flashPrice) / originalPrice) * 100)) : 15);
                        const stockRemaining = deal.stock !== undefined && deal.stock !== null ? Number(deal.stock) : calculateTotalStock(fItem);

                        return (
                          <div
                            key={fItem.id}
                            className="flash-card-box"
                            onClick={() => handleViewItem(fItem)}
                            style={{
                              background: "#FFFFFF",
                              borderRadius: 8,
                              border: "1px solid #E5E7EB",
                              padding: 10,
                              cursor: "pointer",
                              display: "flex",
                              flexDirection: "column",
                              justifyContent: "space-between",
                              gap: 8
                            }}
                          >
                            <div style={{ position: "relative", width: "100%", aspectRatio: "1/1", borderRadius: 6, overflow: "hidden", background: "#F3F4F6" }}>
                              {fItem.image ? (
                                <img src={getImageUrl(fItem.image)} alt={fItem.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              ) : null}
                              <span style={{ position: "absolute", top: 8, left: 8, background: "#DC2626", color: "#FFFFFF", fontSize: 10.5, fontWeight: 700, padding: "2px 6px", borderRadius: 4 }}>
                                -{discountPct}%
                              </span>
                            </div>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {fItem.name}
                              </div>
                              <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 2 }}>
                                <span style={{ fontSize: 15, fontWeight: 700, color: "#DC2626", fontVariantNumeric: "tabular-nums" }}>
                                  ₱{flashPrice.toFixed(2)}
                                </span>
                                {originalPrice > flashPrice && (
                                  <span style={{ fontSize: 11.5, color: "#9CA3AF", textDecoration: "line-through", fontVariantNumeric: "tabular-nums" }}>
                                    ₱{originalPrice.toFixed(2)}
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: 11, color: "#6B7280", marginTop: 3 }}>
                                {stockRemaining > 0 ? `${stockRemaining} remaining at deal price` : "Deal stock sold out"}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                );
              })()}

              {/* HORIZONTAL E-COMMERCE SORT BAR */}
              <div className="commerce-sort-bar">
                <div className="sort-bar-left">
                  <button
                    type="button"
                    className="mobile-filter-trigger"
                    onClick={() => setIsMobileFiltersOpen(true)}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                    </svg>
                    <span>Filters{activeSidebarFilterCount > 0 ? ` (${activeSidebarFilterCount})` : ""}</span>
                  </button>

                  <span className="sort-bar-label">Sort by</span>

                  {[
                    { id: "featured", label: "Recommended" },
                    { id: "newest", label: "Latest" },
                    { id: "popular", label: "Top Sales" },
                    { id: "rating", label: "Top Rated" },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      className={`sort-pill-btn ${sortBy === opt.id ? "active" : ""}`}
                      onClick={() => setSortBy(opt.id as any)}
                    >
                      {opt.label}
                    </button>
                  ))}

                  <select
                    aria-label="Sort by price"
                    className={`sort-price-select ${sortBy === "price-asc" || sortBy === "price-desc" ? "active" : ""}`}
                    value={sortBy === "price-asc" || sortBy === "price-desc" ? sortBy : ""}
                    onChange={(e) => {
                      if (e.target.value) setSortBy(e.target.value as any);
                    }}
                  >
                    <option value="" disabled>Price</option>
                    <option value="price-asc">Price: Low to High</option>
                    <option value="price-desc">Price: High to Low</option>
                  </select>
                </div>

                {!loading && (
                  <div className="sort-bar-right">
                    <span>
                      <strong style={{ color: "#0D6847" }}>{filteredInStockCount}</strong> in stock
                      {" · "}
                      <strong style={{ color: "#111827" }}>{filteredItems.length}</strong> {filteredItems.length === 1 ? "listing" : "listings"}
                    </span>
                  </div>
                )}
              </div>

              {/* Active Filter Chips */}
              {(hasAnyCatalogFilter || claimedVoucher) && (
                <div className="active-filters-row">
                  {selectedCategory !== "All" && (
                    <span className="filter-chip">
                      Category: <strong>{activeCategoryLabel}</strong>
                      <button type="button" onClick={() => setSelectedCategory("All")} aria-label="Remove category filter">✕</button>
                    </span>
                  )}
                  {searchQuery.trim() !== "" && (
                    <span className="filter-chip">
                      Search: <strong>&ldquo;{searchQuery.trim()}&rdquo;</strong>
                      <button type="button" onClick={() => setSearchQuery("")} aria-label="Clear search query">✕</button>
                    </span>
                  )}
                  {inStockOnly && (
                    <span className="filter-chip">
                      <strong>In Stock Only</strong>
                      <button type="button" onClick={() => setInStockOnly(false)} aria-label="Remove in stock filter">✕</button>
                    </span>
                  )}
                  {(appliedMinPrice !== null || appliedMaxPrice !== null) && (
                    <span className="filter-chip">
                      Price: <strong>{appliedMinPrice !== null ? `₱${appliedMinPrice}` : "₱0"} – {appliedMaxPrice !== null ? `₱${appliedMaxPrice}` : "Any"}</strong>
                      <button
                        type="button"
                        onClick={() => {
                          setAppliedMinPrice(null);
                          setAppliedMaxPrice(null);
                          setMinPriceInput("");
                          setMaxPriceInput("");
                        }}
                        aria-label="Remove price filter"
                      >
                        ✕
                      </button>
                    </span>
                  )}
                  {selectedSellerCity !== "All" && (
                    <span className="filter-chip">
                      Ships from: <strong>{selectedSellerCity}</strong>
                      <button type="button" onClick={() => setSelectedSellerCity("All")} aria-label="Remove location filter">✕</button>
                    </span>
                  )}
                  {minRatingFilter > 0 && (
                    <span className="filter-chip">
                      Rating: <strong>{minRatingFilter}★ &amp; up</strong>
                      <button type="button" onClick={() => setMinRatingFilter(0)} aria-label="Remove rating filter">✕</button>
                    </span>
                  )}
                  {claimedVoucher && (
                    <span className="filter-chip" style={{ borderColor: "#A7F3D0", background: "#ECFDF5", color: "#065F46" }}>
                      Voucher: <strong>{claimedVoucher}</strong>
                      <button
                        type="button"
                        onClick={() => {
                          localStorage.removeItem("claimed_voucher");
                          setClaimedVoucher(null);
                        }}
                        aria-label="Remove claimed voucher"
                        style={{ color: "#065F46" }}
                      >
                        ✕
                      </button>
                    </span>
                  )}
                </div>
              )}

              {/* PRODUCT CATALOG GRID */}
              {loading ? (
                <div className="grid">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <SkeletonShopCard key={i} />
                  ))}
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">
                    <svg width="42" height="42" fill="none" stroke="#9CA3AF" strokeWidth="1.5" viewBox="0 0 24 24">
                      <path d="M6 2L3 7v13a2 2 0 002 2h14a2 2 0 002-2V7l-3-5H6z" />
                      <line x1="3" y1="7" x2="21" y2="7" />
                      <path d="M16 11a4 4 0 01-8 0" />
                    </svg>
                  </div>
                  <div className="empty-text">No matching listings found</div>
                  <p className="subtitle">
                    {hasAnyCatalogFilter
                      ? "Try adjusting your price range, availability, or category filters."
                      : "New listings from sellers will appear here once published."}
                  </p>
                  {hasAnyCatalogFilter && (
                    <button
                      type="button"
                      onClick={resetAllCatalogFilters}
                      style={{
                        marginTop: 16,
                        padding: "8px 16px",
                        borderRadius: 7,
                        border: "1px solid #111827",
                        background: "#111827",
                        color: "#FFFFFF",
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "pointer"
                      }}
                    >
                      Reset All Filters
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid">
                  {filteredItems.map((item) => {
                    const attrs = parseItemAttributes(item);
                    const activeDeal = getActiveFlashDeal(item.id);
                    const totalStock = calculateTotalStock(item);
                    const effectivePrice = getEffectiveNumericPrice(item);
                    const isBuyable = totalStock > 0 && effectivePrice > 0;
                    const realReviewsCount = Number(item.reviews_count || 0);
                    const realAvgRating = Number(item.reviews_avg_rating || 0);
                    const realSoldCount = Number(item.sold_count || 0);
                    const photoCount = (attrs?.main_images?.length || (item.image ? 1 : 0)) + (attrs?.variant_image_paths?.filter(Boolean).length || 0);
                    const hasVideo = Boolean(attrs?.video_path);

                    const isCurrentSeller = currentUser && (
                      String(item.user?.id) === String(currentUser.id) ||
                      (item.user?.name && currentUser.name && item.user.name.toLowerCase() === currentUser.name.toLowerCase()) ||
                      (item.user?.name && (currentUser as any).username && item.user.name.toLowerCase() === (currentUser as any).username.toLowerCase())
                    );
                    const sellerAvatar = item.user?.avatar || (isCurrentSeller ? currentUser.avatar : null);
                    const sellerName = item.user?.name || (isCurrentSeller ? currentUser.name : "Seller");
                    const sellerLocation = item.user?.location || (item as any).location || null;

                    return (
                      <article
                        key={item.id}
                        className={`item-card ${totalStock <= 0 ? "sold-out-card" : ""}`}
                        onClick={() => handleViewItem(item)}
                      >
                        <div className="item-img-wrap">
                          {item.image ? (
                            <img
                              src={getImageUrl(item.image)}
                              alt={item.name}
                              className="item-card-img"
                              style={totalStock <= 0 ? { opacity: 0.65, filter: "grayscale(18%)" } : undefined}
                              loading="lazy"
                              decoding="async"
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.style.display = "none";
                                const card = e.currentTarget.closest(".item-card");
                                const placeholder = card?.querySelector(".item-image-placeholder") as HTMLElement;
                                if (placeholder) placeholder.style.display = "flex";
                              }}
                            />
                          ) : null}
                          <div className="item-image-placeholder" style={{ display: item.image ? "none" : "flex" }}>
                            <svg width="36" height="36" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                              <rect x="3" y="3" width="18" height="18" rx="2" />
                              <circle cx="8.5" cy="8.5" r="1.5" />
                              <polyline points="21 15 16 10 5 21" />
                            </svg>
                          </div>

                          {totalStock <= 0 ? (
                            <div style={{
                              position: "absolute",
                              inset: 0,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              background: "rgba(17, 24, 39, 0.22)",
                              zIndex: 2,
                              pointerEvents: "none"
                            }}>
                              <span style={{
                                background: "rgba(17, 24, 39, 0.88)",
                                color: "#FFFFFF",
                                fontSize: 11,
                                fontWeight: 700,
                                letterSpacing: "0.05em",
                                textTransform: "uppercase",
                                padding: "5px 12px",
                                borderRadius: 999
                              }}>
                                Sold Out
                              </span>
                            </div>
                          ) : activeDeal ? (
                            <span style={{
                              position: "absolute",
                              top: 8,
                              left: 8,
                              background: "#DC2626",
                              color: "#FFFFFF",
                              fontSize: 10.5,
                              fontWeight: 700,
                              padding: "3px 7px",
                              borderRadius: 4,
                              zIndex: 2
                            }}>
                              -{activeDeal.discount_pct || 20}%
                            </span>
                          ) : null}

                          {hasVideo && totalStock > 0 && (
                            <span
                              title="Includes product video"
                              style={{
                                position: "absolute",
                                bottom: 8,
                                left: 8,
                                width: 22,
                                height: 22,
                                borderRadius: "50%",
                                background: "rgba(17, 24, 39, 0.68)",
                                color: "#FFFFFF",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                zIndex: 2
                              }}
                            >
                              <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4" /></svg>
                            </span>
                          )}

                          {photoCount > 1 && (
                            <span style={{
                              position: "absolute",
                              bottom: 8,
                              right: 8,
                              background: "rgba(17, 24, 39, 0.62)",
                              color: "#FFFFFF",
                              fontSize: 10,
                              fontWeight: 600,
                              padding: "2px 6px",
                              borderRadius: 4,
                              fontVariantNumeric: "tabular-nums",
                              zIndex: 2
                            }}>
                              1/{photoCount}
                            </span>
                          )}
                        </div>

                        <div className="item-content">
                          <div className="item-meta-top">
                            <span className="item-cat-text">{item.category || "General"}</span>
                            {totalStock <= 0 ? (
                              <span className="item-stock-tag" style={{ color: "#DC2626" }}>Out of stock</span>
                            ) : totalStock <= 5 ? (
                              <span className="item-stock-tag" style={{ color: "#B45309" }}>Only {totalStock} left</span>
                            ) : (
                              <span className="item-stock-tag" style={{ color: "#0D6847" }}>{totalStock} in stock</span>
                            )}
                          </div>

                          <h2 className="item-name">{item.name}</h2>

                          <div className="item-price-row">
                            {(() => {
                              const origPrice = parseFloat(item.price) || 0;
                              if (activeDeal && Number(activeDeal.flash_price) > 0) {
                                const fPrice = Number(activeDeal.flash_price);
                                return (
                                  <>
                                    <span className="item-price" style={{ color: "#DC2626" }}>
                                      ₱{fPrice.toFixed(2)}
                                    </span>
                                    {origPrice > fPrice && (
                                      <span style={{ fontSize: 11.5, color: "#9CA3AF", textDecoration: "line-through", fontVariantNumeric: "tabular-nums" }}>
                                        ₱{origPrice.toFixed(2)}
                                      </span>
                                    )}
                                  </>
                                );
                              }
                              const priceLabel = formatPriceDisplay(item);
                              const isUnavailableLabel = priceLabel === "Unavailable" || priceLabel === "Price on inquiry";
                              return (
                                <span
                                  className="item-price"
                                  style={
                                    totalStock <= 0 || isUnavailableLabel
                                      ? { color: "#6B7280", fontSize: isUnavailableLabel ? 14 : undefined, fontWeight: isUnavailableLabel ? 600 : undefined }
                                      : undefined
                                  }
                                >
                                  {priceLabel}
                                </span>
                              );
                            })()}
                          </div>

                          {/* 100% True Ratings & Sold Row */}
                          <div className="item-stats-line">
                            {realReviewsCount > 0 ? (
                              <span style={{ display: "inline-flex", alignItems: "center", gap: 3, color: "#111827", fontWeight: 600 }}>
                                <svg width="11.5" height="11.5" viewBox="0 0 24 24" fill="#F59E0B" aria-hidden="true">
                                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.27 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z" />
                                </svg>
                                {realAvgRating.toFixed(1)}
                                <span style={{ color: "#6B7280", fontWeight: 400 }}>({realReviewsCount})</span>
                              </span>
                            ) : (
                              <span style={{ color: "#9CA3AF" }}>No ratings yet</span>
                            )}
                            <span>{realSoldCount} sold</span>
                          </div>

                          {/* Proportioned Real E-Commerce Action Row */}
                          <div className="card-actions-row" onClick={(e) => e.stopPropagation()}>
                            {isBuyable ? (
                              <>
                                <button
                                  type="button"
                                  className="card-cart-icon-btn"
                                  title="Add to Cart"
                                  aria-label={`Add ${item.name} to cart`}
                                  onClick={() => {
                                    if (isFootwearCategory(item.category) && attrs?.sizes && attrs.sizes.length > 0) {
                                      handleViewItem(item);
                                    } else {
                                      const dealPrice = activeDeal ? String(activeDeal.flash_price) : (attrs?.variant_prices?.[0] || String(effectivePrice));
                                      handleAddToCart(item, attrs?.colors?.[0] || "", dealPrice);
                                    }
                                  }}
                                  disabled={addingToCart === item.id}
                                >
                                  <IconCart />
                                </button>
                                <button
                                  type="button"
                                  className="buy-btn"
                                  style={activeDeal ? { background: "#DC2626", borderColor: "#DC2626" } : undefined}
                                  onClick={() => {
                                    if (isFootwearCategory(item.category) && attrs?.sizes && attrs.sizes.length > 0) {
                                      handleViewItem(item);
                                    } else {
                                      const dealPrice = activeDeal ? String(activeDeal.flash_price) : (attrs?.variant_prices?.[0] || String(effectivePrice));
                                      setBuyModal({ item, variation: attrs?.colors?.[0] || "", price: dealPrice, variantIdx: 0 });
                                    }
                                  }}
                                >
                                  {addingToCart === item.id ? "Adding..." : activeDeal ? "Buy Deal" : "Buy Now"}
                                </button>
                              </>
                            ) : totalStock > 0 ? (
                              <button
                                type="button"
                                className="buy-btn"
                                style={{ background: "#FFFFFF", borderColor: "#D1D5DB", color: "#111827" }}
                                onClick={() => handleViewItem(item)}
                              >
                                View Details
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="buy-btn"
                                disabled
                                style={{ background: "#F3F4F6", borderColor: "#E5E7EB", color: "#9CA3AF", cursor: "not-allowed" }}
                              >
                                Sold Out
                              </button>
                            )}
                          </div>

                          {/* Seller & City Footer */}
                          <div className="card-seller-row">
                            <div className="card-seller-left">
                              {sellerAvatar ? (
                                <img
                                  src={getAvatarUrl(sellerAvatar)}
                                  alt=""
                                  style={{ width: 18, height: 18, borderRadius: "50%", objectFit: "cover", border: "1px solid #E5E7EB", flexShrink: 0 }}
                                  onError={(e) => {
                                    e.currentTarget.onerror = null;
                                    e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(sellerName)}&background=F3F4F6&color=111827&bold=true`;
                                  }}
                                />
                              ) : (
                                <span style={{ width: 18, height: 18, borderRadius: "50%", background: "#F3F4F6", border: "1px solid #E5E7EB", color: "#111827", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                                  {sellerName.charAt(0).toUpperCase()}
                                </span>
                              )}
                              <span className="card-seller-name">{sellerName}</span>
                            </div>

                            {sellerLocation && (
                              <a
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(sellerLocation)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="card-seller-loc"
                                onClick={(e) => e.stopPropagation()}
                                title={`Seller location: ${sellerLocation}`}
                              >
                                <svg width="10.5" height="10.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
                                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                  <circle cx="12" cy="10" r="3" />
                                </svg>
                                <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                                  {sellerLocation.split(",")[0]}
                                </span>
                              </a>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </main>

        {/* MOBILE / TABLET SLIDE-OVER FILTER DRAWER */}
        {isMobileFiltersOpen && (
          <div className="mobile-filter-backdrop" onClick={() => setIsMobileFiltersOpen(false)}>
            <div className="mobile-filter-sheet" onClick={(e) => e.stopPropagation()}>
              <div className="mobile-filter-sheet-head">
                <span style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>Search Filters</span>
                <button
                  type="button"
                  onClick={() => setIsMobileFiltersOpen(false)}
                  style={{ width: 32, height: 32, borderRadius: 6, border: "1px solid #E5E7EB", background: "#FFFFFF", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                  aria-label="Close filters"
                >
                  <IconClose />
                </button>
              </div>
              <div className="mobile-filter-sheet-body">
                {renderSidebarFilterControls(true)}
              </div>
              <div className="mobile-filter-sheet-foot">
                <button
                  type="button"
                  onClick={() => setIsMobileFiltersOpen(false)}
                  style={{ width: "100%", height: 40, borderRadius: 7, border: "none", background: "#111827", color: "#FFFFFF", fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}
                >
                  Show {filteredItems.length} {filteredItems.length === 1 ? "Listing" : "Listings"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ——— STOREFRONT FOOTER ——— */}
        <footer style={{ background: "#FFFFFF", borderTop: "1px solid #E5E7EB", marginTop: "auto", padding: "40px 24px 24px", color: "#4B5563" }}>
          <div style={{ maxWidth: 1280, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 28, marginBottom: 32 }}>
            <div>
              <h4 style={{ fontSize: 12, fontWeight: 700, color: "#111827", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
                Customer Care
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
                <Link href="/guides" style={{ color: "#4B5563", textDecoration: "none" }}>Help Center & Guides</Link>
                <Link href="/dashboard?tab=orders" style={{ color: "#4B5563", textDecoration: "none" }}>Track Your Orders</Link>
                <Link href="/terms" style={{ color: "#4B5563", textDecoration: "none" }}>Returns & Refunds</Link>
                <Link href="/contact" style={{ color: "#4B5563", textDecoration: "none" }}>Contact Support</Link>
              </div>
            </div>

            <div>
              <h4 style={{ fontSize: 12, fontWeight: 700, color: "#111827", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
                About Shopply
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
                <Link href="/about" style={{ color: "#4B5563", textDecoration: "none" }}>About Us</Link>
                <Link href="/careers" style={{ color: "#4B5563", textDecoration: "none" }}>Careers</Link>
                <Link href="/privacy" style={{ color: "#4B5563", textDecoration: "none" }}>Privacy Policy</Link>
                <Link href="/terms" style={{ color: "#4B5563", textDecoration: "none" }}>Terms of Service</Link>
                <Link href="/cookies" style={{ color: "#4B5563", textDecoration: "none" }}>Cookie Policy</Link>
              </div>
            </div>

            <div>
              <h4 style={{ fontSize: 12, fontWeight: 700, color: "#111827", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
                Payment & Delivery
              </h4>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                <span style={{ fontSize: 11.5, fontWeight: 600, padding: "4px 8px", borderRadius: 5, background: "#F3F4F6", color: "#111827" }}>Cash on Delivery</span>
                <span style={{ fontSize: 11.5, fontWeight: 600, padding: "4px 8px", borderRadius: 5, background: "#F3F4F6", color: "#111827" }}>GCash</span>
                <span style={{ fontSize: 11.5, fontWeight: 600, padding: "4px 8px", borderRadius: 5, background: "#F3F4F6", color: "#111827" }}>Maya</span>
              </div>
              <p style={{ fontSize: 12, color: "#6B7280", lineHeight: 1.5, margin: 0 }}>
                Direct messaging with sellers and Philippine Peso (₱) checkout.
              </p>
            </div>

            <div>
              <h4 style={{ fontSize: 12, fontWeight: 700, color: "#111827", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
                Security
              </h4>
              <div style={{ background: "#F9FAFB", padding: 12, borderRadius: 8, border: "1px solid #E5E7EB", display: "flex", flexDirection: "column", gap: 8 }}>
                <SiteLockSeal size="md" showText={true} />
                <div style={{ fontSize: 11.5, color: "#6B7280", lineHeight: 1.45, borderTop: "1px solid #E5E7EB", paddingTop: 8 }}>
                  Encrypted account sessions and verified seller order protection.
                </div>
              </div>
            </div>
          </div>

          <div style={{ maxWidth: 1280, margin: "0 auto", paddingTop: 18, borderTop: "1px solid #F3F4F6", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, fontSize: 12, color: "#6B7280" }}>
            <div>© {new Date().getFullYear()} Shopply. All rights reserved.</div>
            <div>Philippines (PHP ₱)</div>
          </div>
        </footer>

        {/* PRODUCT DETAIL MODAL */}
        {viewItem && (
          (() => {
            const mediaItems: Array<{ type: 'image' | 'video'; url: string }> = [];
            const filteredReviews = reviews.filter(rev => {
              if (reviewFilter === 'comment') return !!rev.comment;
              if (reviewFilter === 'media') return rev.images && rev.images.length > 0;
              return true;
            });
            if (viewItem.attributes?.video_path) {
              mediaItems.push({ type: 'video', url: getImageUrl(viewItem.attributes.video_path) });
            }
            const mainImages = viewItem.attributes?.main_images && viewItem.attributes.main_images.length > 0
              ? viewItem.attributes.main_images
              : (viewItem.image ? [viewItem.image] : []);
            mainImages.forEach(path => {
              mediaItems.push({ type: 'image', url: getImageUrl(path) });
            });
            (viewItem.attributes?.variant_image_paths || []).filter(Boolean).forEach(path => {
              mediaItems.push({ type: 'image', url: getImageUrl(path) });
            });

            const handlePrevImage = (e: React.MouseEvent) => {
              e.stopPropagation();
              if (mediaItems.length <= 1) return;
              const newIdx = activeImageIdx <= 0 ? mediaItems.length - 1 : activeImageIdx - 1;
              setActiveImageIdx(newIdx);
              const hasVideo = !!viewItem.attributes?.video_path;
              const videoOffset = hasVideo ? 1 : 0;
              const mainLen = (viewItem.attributes?.main_images?.length || (viewItem.image ? 1 : 0)) + videoOffset;
              setSelectedVariant(newIdx >= mainLen ? newIdx - mainLen : null);
            };

            const handleNextImage = (e: React.MouseEvent) => {
              e.stopPropagation();
              if (mediaItems.length <= 1) return;
              const newIdx = activeImageIdx >= mediaItems.length - 1 ? 0 : activeImageIdx + 1;
              setActiveImageIdx(newIdx);
              const hasVideo = !!viewItem.attributes?.video_path;
              const videoOffset = hasVideo ? 1 : 0;
              const mainLen = (viewItem.attributes?.main_images?.length || (viewItem.image ? 1 : 0)) + videoOffset;
              setSelectedVariant(newIdx >= mainLen ? newIdx - mainLen : null);
            };

            return (
              <div className="modal-overlay" onClick={() => setViewItem(null)}>
                <div className="detail-modal" onClick={e => e.stopPropagation()}>
                  <button className="modal-close-btn" onClick={() => setViewItem(null)} title="Close">
                    <IconClose />
                  </button>
                  <div className="detail-content">
                    <div className="detail-img-side">
                      <div style={{ position: 'relative', width: '100%', aspectRatio: isMobile ? '4/3' : '1/1', maxHeight: isMobile ? 220 : 'none', borderRadius: isMobile ? 12 : 20, overflow: 'hidden', background: '#f8fafc', border: '1px solid #f1f5f9', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
                        {mediaItems[activeImageIdx]?.type === 'video' ? (
                          <video 
                            src={mediaItems[activeImageIdx].url} 
                            controls 
                            autoPlay
                            muted
                            loop
                            playsInline
                            preload="auto"
                            poster={viewItem.image ? getImageUrl(viewItem.image) : undefined}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <button
                            type="button"
                            className="detail-image-expand"
                            aria-label={`View full-size image of ${viewItem.name}`}
                            disabled={!mediaItems[activeImageIdx]?.url}
                            onClick={() => {
                              const images = mediaItems.filter(media => media.type === 'image').map(media => media.url);
                              const index = mediaItems.slice(0, activeImageIdx).filter(media => media.type === 'image').length;
                              if (images.length) setViewingImageModal({ images, index });
                            }}
                          >
                            <img
                              src={mediaItems[activeImageIdx]?.url || "https://placehold.co/600x600/f8fafc/cbd5e1?text=No+Image"}
                              alt={viewItem.name}
                              style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = "https://placehold.co/600x600/f8fafc/cbd5e1?text=No+Image";
                              }}
                            />
                            {mediaItems[activeImageIdx]?.url && <span className="detail-image-hint" aria-hidden="true">⤢ View full image</span>}
                          </button>
                        )}
                        {mediaItems.length > 1 && (
                          <>
                            <button
                              type="button"
                              onClick={handlePrevImage}
                              style={{
                                position: 'absolute',
                                left: 0,
                                top: '50%',
                                transform: 'translateY(-50%)',
                                width: isMobile ? 36 : 48,
                                height: isMobile ? 56 : 80,
                                background: 'rgba(0,0,0,0.55)',
                                backdropFilter: 'blur(4px)',
                                border: 'none',
                                borderTopRightRadius: 8,
                                borderBottomRightRadius: 8,
                                color: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'all .2s',
                                zIndex: 10
                              }}
                              onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.85)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.55)'}
                              title="Previous Image"
                            >
                              <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </button>
                            <button
                              type="button"
                              onClick={handleNextImage}
                              style={{
                                position: 'absolute',
                                right: 0,
                                top: '50%',
                                transform: 'translateY(-50%)',
                                width: isMobile ? 36 : 48,
                                height: isMobile ? 56 : 80,
                                background: 'rgba(0,0,0,0.55)',
                                backdropFilter: 'blur(4px)',
                                border: 'none',
                                borderTopLeftRadius: 8,
                                borderBottomLeftRadius: 8,
                                color: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'all .2s',
                                zIndex: 10
                              }}
                              onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.85)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.55)'}
                              title="Next Image"
                            >
                              <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </button>
                          </>
                        )}
                      </div>
                      <div className="variant-thumbs">
                        {mediaItems.map((media, idx) => {
                          if (media.type === 'video') {
                            return (
                              <div 
                                key={`thumb-video-${idx}`}
                                className={`v-thumb ${activeImageIdx === idx ? 'active' : ''}`}
                                onClick={() => {
                                  setActiveImageIdx(idx);
                                  setSelectedVariant(null);
                                }}
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111827', color: '#fff' }}
                                title="Play Video"
                              >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><polygon points="6 4 20 12 6 20 6 4" /></svg>
                              </div>
                            );
                          }

                          const hasVideo = !!viewItem.attributes?.video_path;
                          const videoOffset = hasVideo ? 1 : 0;
                          const mainLen = viewItem.attributes?.main_images?.length || (viewItem.image ? 1 : 0);
                          const isVariant = idx >= (mainLen + videoOffset);
                          const variantIdx = isVariant ? idx - (mainLen + videoOffset) : null;

                          return (
                            <img 
                              key={`thumb-img-${idx}`} 
                              src={media.url} 
                              className={`v-thumb ${activeImageIdx === idx ? 'active' : ''}`}
                              onClick={() => {
                                setActiveImageIdx(idx);
                                setSelectedVariant(variantIdx);
                              }}
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = "https://placehold.co/100x100/f8fafc/cbd5e1?text=No+Image";
                              }}
                            />
                          );
                        })}
                      </div>
                    </div>
                
                <div className="detail-info-side">
                  <div>
                    <span className="detail-category">{viewItem.category || "General"}</span>
                    <h2 className="detail-name">{viewItem.name}</h2>
                    <div style={{display:'flex',alignItems:'center',gap:12,marginTop:12,flexWrap:'wrap',rowGap:6}}>
                      <div style={{display:'flex',alignItems:'center',gap:4}}>
                        <span style={{fontSize:16,fontWeight:800,color:'#111827',textDecoration:'underline'}}>
                          {reviews.length > 0 
                            ? (reviews.reduce((acc, r) => acc + Number(r.rating), 0) / reviews.length).toFixed(1) 
                            : "0.0"}
                        </span>
                        <StarRating rating={Math.round(reviews.reduce((acc, r) => acc + Number(r.rating), 0) / (reviews.length || 1))} size={14} />
                      </div>
                      <div style={{width:1,height:12,background:'#e2e8f0'}} />
                      <span style={{fontSize:13,color:'#64748b'}}><strong style={{color:'#0f172a'}}>{reviews.length}</strong> Ratings</span>
                      <div style={{width:1,height:12,background:'#e2e8f0'}} />
                      <span style={{fontSize:13,color:'#64748b'}}><strong style={{color:'#0f172a'}}>{viewItem.sold_count || 0}</strong> Sold</span>
                    </div>
                  </div>

                  {(() => {
                    const activeFlashDeal = getActiveFlashDeal(viewItem.id);
                    const isFlashDealItem = !!activeFlashDeal;
                    const flashPriceNum = isFlashDealItem ? Number(activeFlashDeal.flash_price) : 0;
                    const origPriceNum = parseFloat(viewItem.price) || 0;
                    const flashDiscountPct = isFlashDealItem 
                      ? (activeFlashDeal.discount_pct || (origPriceNum > 0 ? Math.max(1, Math.round(((origPriceNum - flashPriceNum) / origPriceNum) * 100)) : 20))
                      : 0;

                    if (!isFlashDealItem) return null;

                    return (
                      <div style={{
                        background: 'linear-gradient(135deg, #fff1f2, #ffe4e6)',
                        border: '1.5px solid #fecdd3',
                        borderRadius: 14,
                        padding: '12px 16px',
                        marginTop: 14,
                        marginBottom: 4,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 10
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ width: 32, height: 32, borderRadius: 8, background: '#FEE2E2', color: '#DC2626', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
                          </span>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 900, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span>FLASH SALE ACTIVE</span>
                              <span style={{ background: '#dc2626', color: '#fff', fontSize: 10, fontWeight: 900, padding: '2px 6px', borderRadius: 4 }}>
                                -{flashDiscountPct}% OFF
                              </span>
                            </div>
                            <div style={{ fontSize: 11, fontWeight: 600, color: '#e11d48' }}>
                              Special promotional price enrolled in Flash Deals
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 800, color: '#991b1b', background: '#fff', padding: '5px 12px', borderRadius: 8, border: '1.5px solid #fecdd3', boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}>
                          <span>Ends in:</span>
                          <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 13, color: '#dc2626' }}>
                            {String(flashCountdown.hours).padStart(2, '0')}:{String(flashCountdown.minutes).padStart(2, '0')}:{String(flashCountdown.seconds).padStart(2, '0')}
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="detail-price" style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                    {(() => {
                      const activeFlashDeal = getActiveFlashDeal(viewItem.id);
                      if (activeFlashDeal) {
                        const flashPriceNum = Number(activeFlashDeal.flash_price);
                        const origPriceNum = parseFloat(viewItem.price) || 0;
                        const flashDiscountPct = activeFlashDeal.discount_pct || (origPriceNum > 0 ? Math.max(1, Math.round(((origPriceNum - flashPriceNum) / origPriceNum) * 100)) : 20);
                        return (
                          <>
                            <span style={{ fontSize: 32, fontWeight: 900, color: '#dc2626' }}>
                              ₱{flashPriceNum.toFixed(2)}
                            </span>
                            {origPriceNum > flashPriceNum && (
                              <span style={{ fontSize: 18, fontWeight: 600, color: '#94a3b8', textDecoration: 'line-through' }}>
                                ₱{origPriceNum.toFixed(2)}
                              </span>
                            )}
                            <span style={{
                              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                              color: '#fff',
                              fontSize: 12,
                              fontWeight: 900,
                              padding: '3px 8px',
                              borderRadius: 6
                            }}>
                              -{flashDiscountPct}% OFF
                            </span>
                          </>
                        );
                      }
                      return selectedVariant !== null 
                        ? `₱${parseFloat(viewItem.attributes?.variant_prices?.[selectedVariant] || viewItem.price).toFixed(2)}`
                        : formatPriceDisplay(viewItem);
                    })()}
                  </div>

                  {(() => {
                    const activeFlashDeal = getActiveFlashDeal(viewItem.id);
                    if (!activeFlashDeal) return null;
                    const claimedPct = Math.min(100, Math.max(0, Number(activeFlashDeal.claimed_pct !== undefined && activeFlashDeal.claimed_pct !== null ? activeFlashDeal.claimed_pct : 40)));
                    const remainingStock = activeFlashDeal.stock !== undefined && activeFlashDeal.stock !== null ? Number(activeFlashDeal.stock) : calculateTotalStock(viewItem);
                    return (
                      <div style={{ margin: '8px 0 16px', maxWidth: 360 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 800, color: '#dc2626', marginBottom: 5 }}>
                          <span>{claimedPct}% claimed</span>
                          <span style={{ color: '#64748b', fontWeight: 600 }}>{remainingStock > 0 ? `${remainingStock} left in deal quota` : 'Deal quota reached'}</span>
                        </div>
                        <div style={{ height: 7, background: '#fee2e2', borderRadius: 6, overflow: 'hidden' }}>
                          <div style={{ width: `${claimedPct}%`, height: '100%', background: 'linear-gradient(90deg, #ef4444, #f97316)', borderRadius: 6 }} />
                        </div>
                      </div>
                    );
                  })()}


                  {viewItem.attributes?.colors && (
                    <div>
                      <span className="variant-section-label">Color</span>
                      <div className="size-grid">
                        {viewItem.attributes.colors.map((color, idx) => (
                          <button 
                            key={idx} 
                            className={`size-btn ${selectedVariant === idx ? 'active' : ''}`}
                            onClick={() => {
                              setSelectedVariant(idx);
                              if (viewItem.attributes?.variant_image_paths?.[idx]) {
                                const mainLen = viewItem.attributes?.main_images?.length || (viewItem.image ? 1 : 0);
                                setActiveImageIdx(mainLen + idx);
                              }
                            }}
                          >
                            {viewItem.attributes?.variant_image_paths?.[idx] && (
                              <img 
                                src={getImageUrl(viewItem.attributes.variant_image_paths[idx])} 
                                className="variant-btn-img" 
                                alt={color}
                              />
                            )}
                            <span>{color}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {isFootwearCategory(viewItem.category) && viewItem.attributes?.sizes && viewItem.attributes.sizes.length > 0 && (
                    <div>
                      <span className="variant-section-label">Size</span>
                      <div className="size-grid">
                        {viewItem.attributes.sizes.map((size) => {
                          const stockForSize = viewItem.attributes?.size_stocks?.[size];
                          const isOutOfStock = stockForSize !== undefined && stockForSize <= 0;
                          return (
                            <button 
                              key={size} 
                              disabled={isOutOfStock}
                              className={`size-btn ${selectedSize === size ? 'active' : ''}`}
                              style={isOutOfStock ? { opacity: 0.5, cursor: 'not-allowed', background: '#f1f5f9', borderColor: '#e2e8f0' } : {}}
                              onClick={() => setSelectedSize(size)}
                            >
                              {size} {stockForSize !== undefined ? `(${stockForSize} left)` : ''}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="modal-actions-container">
                    {(() => {
                      const modalTotalStock = calculateTotalStock(viewItem);
                      const modalEffectivePrice = getEffectiveNumericPrice(viewItem);
                      if (modalTotalStock <= 0 || modalEffectivePrice <= 0) {
                        return (
                          <>
                            <button
                              type="button"
                              className="buy-btn"
                              disabled
                              style={{ height: 50, flex: 1.4, background: "#F3F4F6", borderColor: "#E5E7EB", color: "#9CA3AF", cursor: "not-allowed" }}
                            >
                              {modalTotalStock <= 0 ? "Sold Out — Out of Stock" : "Unavailable for Direct Checkout"}
                            </button>
                            <button
                              type="button"
                              className="add-cart-btn"
                              style={{ height: 50, flex: 1 }}
                              onClick={() => {
                                const token = localStorage.getItem("token");
                                if (!token) {
                                  setErrorMsg("Please log in to chat with sellers.");
                                  return;
                                }
                                setActiveChatUser(viewItem.user);
                                setIsActiveUserOnline(!!viewItem.user.is_online);
                                setIsChatOpen(true);
                              }}
                            >
                              <IconChat /> Message Seller
                            </button>
                          </>
                        );
                      }

                      const activeFlashDeal = getActiveFlashDeal(viewItem.id);
                      const isDeal = !!activeFlashDeal;
                      const dealPriceNum = isDeal ? Number(activeFlashDeal.flash_price) : null;

                      return (
                        <>
                          <button className="add-cart-btn" style={{height:52,flex:1}} onClick={() => {
                            if (viewItem.attributes?.colors && viewItem.attributes.colors.length > 0 && selectedVariant === null) {
                              setErrorMsg("Please select a color variation first.");
                              return;
                            }
                            if (isFootwearCategory(viewItem.category) && viewItem.attributes?.sizes && viewItem.attributes.sizes.length > 0 && !selectedSize) {
                              setErrorMsg("Please select a size first.");
                              return;
                            }
                            const varIdx = selectedVariant !== null ? selectedVariant : 0;
                            let variationStr = "";
                            if (viewItem.attributes?.colors?.[varIdx]) variationStr += viewItem.attributes.colors[varIdx];
                            if (isFootwearCategory(viewItem.category) && selectedSize) variationStr += (variationStr ? ", " : "") + selectedSize;
                            const priceStr = isDeal ? String(dealPriceNum) : (viewItem.attributes?.variant_prices?.[varIdx] || viewItem.price);
                            handleAddToCart(viewItem, variationStr, priceStr);
                          }}>
                            <IconCart /> {isDeal ? `Add at ₱${dealPriceNum!.toFixed(2)}` : 'Add to Cart'}
                          </button>
                          <button className="buy-btn" style={{
                            height: 52,
                            flex: 1.5,
                            background: isDeal ? 'linear-gradient(135deg, #ef4444, #dc2626)' : '#111827',
                            boxShadow: isDeal ? '0 4px 14px rgba(220, 38, 38, 0.35)' : undefined
                          }} onClick={() => {
                            if (viewItem.attributes?.colors && viewItem.attributes.colors.length > 0 && selectedVariant === null) {
                              setErrorMsg("Please select a color variation first.");
                              return;
                            }
                            if (isFootwearCategory(viewItem.category) && viewItem.attributes?.sizes && viewItem.attributes.sizes.length > 0 && !selectedSize) {
                              setErrorMsg("Please select a size first.");
                              return;
                            }
                            const varIdx = selectedVariant !== null ? selectedVariant : 0;
                            let variationStr = "";
                            if (viewItem.attributes?.colors?.[varIdx]) variationStr += viewItem.attributes.colors[varIdx];
                            if (isFootwearCategory(viewItem.category) && selectedSize) variationStr += (variationStr ? ", " : "") + selectedSize;
                            const priceStr = isDeal ? String(dealPriceNum) : (viewItem.attributes?.variant_prices?.[varIdx] || viewItem.price);
                            setBuyModal({item: viewItem, variation: variationStr, price: priceStr, variantIdx: varIdx});
                          }}>
                            {isDeal ? `Buy Now (₱${dealPriceNum!.toFixed(2)})` : 'Buy Now'}
                          </button>
                        </>
                      );
                    })()}
                  </div>

                  {viewItem.attributes?.specs && viewItem.attributes.specs.length > 0 && (
                    <div className="spec-grid">
                      {viewItem.attributes.specs.map((s, i) => (
                        <div key={i} className="spec-item">
                          <span className="spec-label">{s.key}</span>
                          <span className="spec-val">{s.value}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* PRODUCT DESCRIPTION TEXT (ALIGNED IN RIGHT COLUMN) */}
                  <div style={{ marginTop: 24, borderTop: '1px solid #f1f5f9', paddingTop: 20 }}>
                    <span className="variant-section-label" style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: 8, display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Description
                    </span>
                    <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>
                      {viewItem.description || "This item has no description yet."}
                    </p>
                  </div>
                </div>
              </div>

              {/* DESCRIPTION IMAGES GALLERY (RESPONSIVE GRID) */}
              {viewItem.attributes?.description_images && viewItem.attributes.description_images.length > 0 && (
                <div className="description-section" style={{ borderTop: '1px solid #f1f5f9', padding: isMobile ? '20px 16px' : '32px 48px', background: '#fff' }}>
                  <div className="description-header" style={{ marginBottom: 16 }}>
                    <span className="variant-section-label" style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', marginBottom: 2 }}>
                      Product Gallery
                    </span>
                    <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>Click any photo to view in full resolution</p>
                  </div>
                  <div className="description-images-gallery">
                    {viewItem.attributes.description_images.map((path: string, index: number) => (
                      <div 
                        key={index} 
                        className="desc-image-card"
                        onClick={() => setViewingImageModal({ 
                          images: viewItem.attributes?.description_images || [], 
                          index 
                        })}
                      >
                        <div className="desc-image-badge">Photo {index + 1}</div>
                        <img 
                          src={getImageUrl(path)} 
                          alt={`Gallery Image ${index + 1}`}
                          className="desc-gallery-img"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = "https://placehold.co/600x400/f8fafc/cbd5e1?text=Image+Not+Found";
                          }}
                        />
                        <div className="desc-zoom-overlay">
                          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
                          <span>Enlarge</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SELLER PROFILE HEADER BAR */}
              <div className="seller-header-bar">
                <div className="seller-left-side">
                  <div className="seller-avatar-wrapper">
                    {(() => {
                      const isCurrentSeller = currentUser && (
                        String(viewItem.user?.id) === String(currentUser.id) ||
                        (viewItem.user?.name && currentUser.name && viewItem.user.name.toLowerCase() === currentUser.name.toLowerCase()) ||
                        (viewItem.user?.name && (currentUser as any).username && viewItem.user.name.toLowerCase() === (currentUser as any).username.toLowerCase())
                      );
                      const sellerAvatar = viewItem.user?.avatar || (isCurrentSeller ? currentUser.avatar : null);
                      const sellerName = viewItem.user?.name || (isCurrentSeller ? currentUser.name : "Seller");

                      return sellerAvatar ? (
                        <img 
                          src={getAvatarUrl(sellerAvatar)} 
                          className="seller-main-avatar" 
                          alt="" 
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(sellerName)}&background=F3F4F6&color=111827&bold=true`;
                          }} 
                        />
                      ) : (
                        <div className="seller-main-avatar" style={{background: '#F3F4F6', color: '#111827', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18}}>
                          {sellerName.charAt(0).toUpperCase()}
                        </div>
                      );
                    })()}
                  </div>
                  <div className="seller-info-col">
                    <h4 className="seller-title-name">
                      {viewItem.user.name}
                    </h4>
                    <span className="seller-active-status">
                      {viewItem.user.is_online ? "Online now" : calculateJoined(viewItem.user.created_at)}
                    </span>
                    {viewItem.user?.location && (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(viewItem.user.location)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 500, color: "#4B5563", textDecoration: "none", marginBottom: 6 }}
                        title="View seller location on Google Maps"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                        {viewItem.user.location}
                      </a>
                    )}
                    <div className="seller-actions-row">
                      <button className="seller-btn-chat" onClick={() => {
                        const token = localStorage.getItem("token");
                        if (!token) {
                          setErrorMsg("Please log in to chat with sellers.");
                          return;
                        }
                        setActiveChatUser(viewItem.user);
                        setIsActiveUserOnline(!!viewItem.user.is_online);
                        setIsChatOpen(true);
                      }}>
                        <IconChat /> Chat Now
                      </button>
                      {(!currentUser || currentUser.id !== viewItem.user.id) && (
                        <button 
                          className="seller-btn-shop" 
                          onClick={() => handleToggleFollow(viewItem.user.id)}
                          style={{borderColor: followedSellers[viewItem.user.id] ? '#10b981' : '#cbd5e1', color: followedSellers[viewItem.user.id] ? '#10b981' : '#475569'}}
                        >
                          <IconShop /> {followedSellers[viewItem.user.id] ? "Following" : "+ Follow"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="seller-stats-grid">
                  <div className="seller-stat-box">
                    <span className="seller-stat-label">Listings</span>
                    <span className="seller-stat-val">
                      {viewItem.user.items_count !== undefined ? viewItem.user.items_count : 1}
                    </span>
                  </div>
                  <div className="seller-stat-box">
                    <span className="seller-stat-label">Ratings</span>
                    <span className="seller-stat-val">
                      {viewItem.user.reviews_count !== undefined ? viewItem.user.reviews_count : reviews.length}
                    </span>
                  </div>
                  <div className="seller-stat-box">
                    <span className="seller-stat-label">Followers</span>
                    <span className="seller-stat-val">
                      {viewItem.user.followers_count !== undefined ? viewItem.user.followers_count : 0}
                    </span>
                  </div>
                  <div className="seller-stat-box">
                    <span className="seller-stat-label">Orders Fulfilled</span>
                    <span className="seller-stat-val">
                      {viewItem.user.accepted_orders !== undefined ? viewItem.user.accepted_orders : 0}
                    </span>
                  </div>
                  <div className="seller-stat-box">
                    <span className="seller-stat-label">Joined</span>
                    <span className="seller-stat-val">{calculateJoined(viewItem.user.created_at)}</span>
                  </div>
                  <div className="seller-stat-box">
                    <span className="seller-stat-label">Ships From</span>
                    <span className="seller-stat-val">
                      {viewItem.user.location ? viewItem.user.location.split(",")[0] : "Philippines"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rating-section">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0 }}>Product Ratings & Reviews</h3>
                    <span style={{ fontSize: 12, fontWeight: 700, background: '#f1f5f9', color: '#64748b', padding: '2px 8px', borderRadius: 20 }}>
                      {reviews.length}
                    </span>
                  </div>
                  {!isWritingReview && (!currentUser || !reviews.some(rev => rev.user?.id === currentUser.id)) && (
                    <button 
                      onClick={() => {
                        const token = localStorage.getItem("token");
                        if (!token) {
                          setErrorMsg("Please log in to write a review.");
                          return;
                        }
                        setIsWritingReview(true);
                      }}
                      style={{
                        padding: '8px 16px',
                        borderRadius: 10,
                        border: '1px solid #111827',
                        background: '#F9FAFB',
                        color: '#111827',
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        transition: 'all .2s'
                      }}
                    >
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                      Write a Review
                    </button>
                  )}
                </div>

                <div className="rating-summary">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                      <span className="big-rating">
                        {reviews.length > 0 
                          ? (reviews.reduce((acc, r) => acc + Number(r.rating), 0) / reviews.length).toFixed(1) 
                          : "0.0"}
                      </span>
                      <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 600 }}>/ 5.0</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <StarRating rating={Math.round(reviews.reduce((acc, r) => acc + Number(r.rating), 0) / (reviews.length || 1))} size={16} />
                      <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>
                        {reviews.length} {reviews.length === 1 ? "Rating" : "Ratings"}
                      </span>
                    </div>
                  </div>
                  <div className="review-filters">
                    <button 
                      className={`rev-filter ${reviewFilter === 'all' ? 'active' : ''}`}
                      onClick={() => setReviewFilter('all')}
                    >
                      All ({reviews.length})
                    </button>
                    <button 
                      className={`rev-filter ${reviewFilter === 'comment' ? 'active' : ''}`}
                      onClick={() => setReviewFilter('comment')}
                    >
                      With Comments ({reviews.filter(r => r.comment).length})
                    </button>
                    <button 
                      className={`rev-filter ${reviewFilter === 'media' ? 'active' : ''}`}
                      onClick={() => setReviewFilter('media')}
                    >
                      With Photos ({reviews.filter(r => r.images && r.images.length > 0).length})
                    </button>
                  </div>
                </div>

                {/* WRITE A REVIEW FORM */}
                {isWritingReview && (
                  <div style={{ background: '#fff', borderRadius: 16, padding: 20, marginBottom: 24, border: '1.5px solid #111827', boxShadow: '0 8px 24px rgba(17, 24, 39, 0.12)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <h4 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 }}>Share Your Experience</h4>
                      <button 
                        type="button" 
                        onClick={() => setIsWritingReview(false)} 
                        style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 18, padding: 4 }}
                      >
                        ✕
                      </button>
                    </div>
                    <form onSubmit={async (e) => {
                      await handleSubmitReview(e);
                      setIsWritingReview(false);
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>Your Rating:</span>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {[1, 2, 3, 4, 5].map(star => (
                            <button 
                              key={star} 
                              type="button" 
                              onClick={() => setRevRating(star)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: star <= revRating ? '#f59e0b' : '#cbd5e1', padding: 2 }}
                            >
                              <svg width="22" height="22" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.27 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z"/>
                              </svg>
                            </button>
                          ))}
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b' }}>
                          {revRating === 5 ? "5/5 - Excellent" : revRating === 4 ? "4/5 - Good" : revRating === 3 ? "3/5 - Average" : revRating === 2 ? "2/5 - Poor" : "1/5 - Terrible"}
                        </span>
                      </div>
                      
                      <textarea 
                        className="form-input" 
                        placeholder="What did you like or dislike about this product?" 
                        value={revComment} 
                        onChange={e => setRevComment(e.target.value)}
                        style={{ width: '100%', minHeight: 90, marginBottom: 14, padding: '12px 14px', borderRadius: 10, resize: 'vertical', fontSize: 13, border: '1px solid #e2e8f0', background: '#f8fafc' }}
                      />

                      <div style={{ marginBottom: 16 }}>
                        <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 8, display: 'block' }}>Add Photos (optional)</label>
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                          {revPreviews.map((p, i) => (
                            <div key={i} style={{ position: 'relative' }}>
                              <img src={p} style={{ width: 56, height: 56, borderRadius: 8, objectFit: 'cover', border: '1px solid #e2e8f0' }} />
                            </div>
                          ))}
                          <button 
                            type="button" 
                            onClick={() => document.getElementById('rev-img-input')?.click()}
                            style={{ width: 56, height: 56, borderRadius: 8, border: '1.5px dashed #cbd5e1', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b', fontSize: 20 }}
                          >
                            +
                          </button>
                          <input id="rev-img-input" type="file" multiple accept="image/*" style={{ display: 'none' }} onChange={handleReviewImageChange} />
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                        <button 
                          type="button" 
                          onClick={() => setIsWritingReview(false)}
                          style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
                        >
                          Cancel
                        </button>
                        <button 
                          type="submit" 
                          disabled={submittingReview}
                          style={{ padding: '8px 24px', borderRadius: 8, border: 'none', background: '#111827', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', boxShadow: '0 2px 8px rgba(17, 24, 39, 0.12)', opacity: submittingReview ? 0.7 : 1 }}
                        >
                          {submittingReview ? "Submitting..." : "Submit Review"}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {currentUser && reviews.some(rev => rev.user?.id === currentUser.id) && (
                  <div style={{ background: '#f0fdf4', borderRadius: 12, padding: '12px 16px', marginBottom: 20, border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: 10, color: '#166534' }}>
                    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>You have submitted a review for this product. Thank you!</span>
                  </div>
                )}

                {filteredReviews.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '36px 20px', background: '#f8fafc', borderRadius: 16, border: '1px dashed #e2e8f0' }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#F3F4F6', color: '#6B7280', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                      <IconChat />
                    </div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>
                      {reviewFilter === 'all' ? "No reviews yet for this product" : "No reviews match the selected filter"}
                    </p>
                    <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>
                      {reviewFilter === 'all' ? "Be the first to share your thoughts and help others!" : "Try selecting 'All' to view all customer reviews."}
                    </p>
                  </div>
                ) : (
                  <div className="reviews-scroll-container">
                    {filteredReviews.map(rev => (
                      <div key={rev.id} className="review-card">
                        <div className="review-user">
                          <div className="u-avatar">{rev.user?.name?.charAt(0).toUpperCase() || 'U'}</div>
                          <div className="u-info">
                            <span className="u-name">{rev.user?.name || "Anonymous User"}</span>
                            <StarRating rating={Number(rev.rating)} size={12} />
                          </div>
                        </div>
                        <span className="r-date">{new Date(rev.created_at).toLocaleDateString()} | Variation: {rev.variation || "Default"}</span>
                        <p className="r-text">{rev.comment}</p>
                        {rev.images && rev.images.length > 0 && (
                          <div className="r-images">
                            {rev.images.map((img, i) => (
                              <img key={i} src={getImageUrl(img)} className="r-img" alt="Review" onClick={() => window.open(getImageUrl(img), '_blank')} />
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SIMILAR PRODUCTS SECTION */}
              <div className="similar-products-section">
                <span className="variant-section-label" style={{ fontSize: '16px', marginBottom: '24px' }}>Similar Products</span>
                {(() => {
                  const rankAvail = (x: ShopItem) => (calculateTotalStock(x) > 0 && getEffectiveNumericPrice(x) > 0 ? 1 : 0);
                  const similarItems = items
                    .filter(item => item.id !== viewItem.id && item.category === viewItem.category)
                    .sort((a, b) => rankAvail(b) - rankAvail(a))
                    .slice(0, 4);

                  const displayItems = similarItems.length > 0
                    ? similarItems
                    : items
                        .filter(item => item.id !== viewItem.id)
                        .sort((a, b) => rankAvail(b) - rankAvail(a))
                        .slice(0, 4);

                  if (displayItems.length === 0) {
                    return <p style={{ color: '#6B7280', fontSize: '13.5px' }}>No other listings available yet.</p>;
                  }

                  return (
                    <div className="similar-products-grid">
                      {displayItems.map(item => (
                        <div
                          key={item.id}
                          onClick={() => handleViewItem(item)}
                          style={{
                            background: '#FFFFFF',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            border: '1px solid #E5E7EB',
                            cursor: 'pointer',
                            transition: 'border-color 0.15s'
                          }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = '#9CA3AF'; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = '#E5E7EB'; }}
                        >
                          <div style={{ position: 'relative', width: '100%', aspectRatio: '1', overflow: 'hidden', background: '#F3F4F6' }}>
                            {item.image ? (
                              <img
                                src={getImageUrl(item.image)}
                                alt={item.name}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            ) : (
                              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF' }}>
                                <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                              </div>
                            )}
                          </div>
                          <div style={{ padding: '12px' }}>
                            <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: 2 }}>{item.category || "General"}</div>
                            <h5 style={{ fontSize: '13.5px', fontWeight: 600, color: '#111827', margin: '0 0 4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {item.name}
                            </h5>
                            <div style={{ fontSize: '14.5px', fontWeight: 700, color: '#111827', fontVariantNumeric: 'tabular-nums' }}>
                              {formatPriceDisplay(item)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

            </div>
          </div>
          );
          })()
        )}

        {/* SUCCESS TOAST */}
        {successMsg && <div className="toast">{successMsg}</div>}

        {/* PREMIUM ERROR MODAL */}
        {errorMsg && (
          <div style={{position:'fixed',inset:0,background:'rgba(15,23,42,.6)',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:2000,padding:20}} onClick={() => setErrorMsg(null)}>
            <div style={{background:'#fff',borderRadius:24,padding:'40px 32px',maxWidth:420,width:'100%',boxShadow:'0 25px 50px -12px rgba(0,0,0,0.25)',display:'flex',flexDirection:'column',alignItems:'center',textAlign:'center',animation:'scaleUp .3s ease'}} onClick={e => e.stopPropagation()}>
              <div style={{width:64,height:64,borderRadius:'50%',background:'#fef2f2',color:'#ef4444',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:20}}>
                <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
              </div>
              <h3 style={{fontSize:22,fontWeight:800,color:'#0f172a',marginBottom:8}}>Action Not Allowed</h3>
              <p style={{fontSize:15,color:'#64748b',marginBottom:28,lineHeight:1.6}}>
                {errorMsg}
              </p>
              <button 
                onClick={() => setErrorMsg(null)}
                style={{width:'100%',padding:'14px',borderRadius:14,border:'none',background:'#0f172a',color:'#fff',fontWeight:700,fontSize:15,cursor:'pointer',boxShadow:'0 8px 20px rgba(15,23,42,0.2)',transition:'all .2s'}}
              >
                Understood
              </button>
            </div>
          </div>
        )}

        {/* BUY CONFIRMATION MODAL */}
        {buyModal && (
          <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.45)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}} onClick={() => setBuyModal(null)}>
            <div style={{background:'#fff',borderRadius:20,padding:'36px 32px',maxWidth:420,width:'90%',boxShadow:'0 20px 60px rgba(0,0,0,.15)'}} onClick={e => e.stopPropagation()}>
              {(buyModal.variantIdx !== null && buyModal.item.attributes?.variant_image_paths?.[buyModal.variantIdx]) ? (
                 <img src={getImageUrl(buyModal.item.attributes.variant_image_paths[buyModal.variantIdx])} alt={buyModal.item.name} style={{width:'100%',height:180,objectFit:'cover',borderRadius:12,marginBottom:20}} />
              ) : buyModal.item.image && (
                <img src={getImageUrl(buyModal.item.image)} alt={buyModal.item.name} style={{width:'100%',height:180,objectFit:'cover',borderRadius:12,marginBottom:20}} />
              )}
              <h3 style={{fontSize:20,fontWeight:700,color:'#0f172a',marginBottom:6}}>{buyModal.item.name}</h3>
              {(() => {
                const deal = getActiveFlashDeal(buyModal.item.id);
                const currentPrice = parseFloat(buyModal.price) || 0;
                let voucherDiscountEst = 0;
                let voucherDesc = "";

                const matchedVoucherObj = claimedVoucher
                  ? (allCoupons.find(c => c.code === claimedVoucher) || (flashCoupon?.code === claimedVoucher ? flashCoupon : null))
                  : null;

                if (matchedVoucherObj) {
                  const minSpend = Number(matchedVoucherObj.min_spend || 0);
                  if (minSpend <= 0 || currentPrice >= minSpend) {
                    if (matchedVoucherObj.discount_type === 'percent') {
                      voucherDiscountEst = (currentPrice * Number(matchedVoucherObj.discount_value || matchedVoucherObj.discount || 0)) / 100;
                      voucherDesc = `${matchedVoucherObj.discount_value || matchedVoucherObj.discount}% OFF`;
                    } else {
                      voucherDiscountEst = Number(matchedVoucherObj.discount_value || matchedVoucherObj.discount || 0);
                      voucherDesc = `₱${voucherDiscountEst} OFF`;
                    }
                    voucherDiscountEst = Math.min(voucherDiscountEst, currentPrice);
                  }
                }

                const finalPriceEst = Math.max(0, currentPrice - voucherDiscountEst);

                return (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                      {deal && (
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          background: '#FEE2E2',
                          color: '#DC2626',
                          padding: '4px 10px',
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 700
                        }}>
                          <span>Deal Price Applied (-{deal.discount_pct || 20}%)</span>
                        </div>
                      )}
                      {matchedVoucherObj && voucherDiscountEst > 0 && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: '#ECFDF5',
                          border: '1px solid #A7F3D0',
                          borderRadius: 6,
                          padding: '6px 10px'
                        }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#065F46' }}>
                            Voucher <b>{claimedVoucher}</b> {voucherDesc && `(${voucherDesc})`}
                          </span>
                          <span style={{ fontSize: 11.5, fontWeight: 700, color: '#065F46', fontVariantNumeric: 'tabular-nums' }}>
                            -₱{voucherDiscountEst.toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: 13, color: '#4B5563', marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span>Option: <strong style={{ color: '#111827' }}>{buyModal.variation || 'Standard'}</strong></span>
                      <span>Payment: <strong style={{ color: '#111827' }}>Cash on Delivery</strong>{buyerLocation ? ` · ${buyerLocation}` : ''}</span>
                    </div>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 0',borderTop:'1px solid #E5E7EB',borderBottom:'1px solid #E5E7EB',marginBottom:20}}>
                      <span style={{fontSize:13,fontWeight:500,color:'#4B5563'}}>Order Total</span>
                      <div style={{ textAlign: 'right' }}>
                        {voucherDiscountEst > 0 && (
                          <span style={{ fontSize: 13, textDecoration: 'line-through', color: '#9CA3AF', marginRight: 8, fontVariantNumeric: 'tabular-nums' }}>
                            ₱{currentPrice.toFixed(2)}
                          </span>
                        )}
                        <span style={{fontSize:22,fontWeight:700,color: deal ? '#DC2626' : '#111827',fontVariantNumeric:'tabular-nums'}}>
                          ₱{finalPriceEst.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <div style={{display:'flex',gap:10}}>
                      <button onClick={() => setBuyModal(null)} style={{flex:1,padding:'11px',borderRadius:8,border:'1px solid #D1D5DB',background:'#FFFFFF',color:'#374151',fontWeight:600,fontSize:13.5,cursor:'pointer'}}>Cancel</button>
                      <button onClick={handleBuy} disabled={buying} style={{
                        flex:1.8,
                        padding:'11px',
                        borderRadius:8,
                        border:'none',
                        background: deal ? '#DC2626' : '#111827',
                        color:'#FFFFFF',
                        fontWeight:600,
                        fontSize:13.5,
                        cursor:'pointer',
                        display:'inline-flex',
                        alignItems:'center',
                        justifyContent:'center',
                        gap:6,
                        opacity:buying ? 0.7 : 1
                      }}>
                        {buying ? "Placing order..." : `Place Order · ₱${finalPriceEst.toFixed(2)}`}
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}

        <button 
          className={`back-to-top ${showScrollTop ? 'visible' : ''}`}
          onClick={() => {
            if (viewItem) {
              document.querySelector('.detail-modal')?.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }}
        >
          <IconArrowUp />
        </button>

        {/* FLOATING CHAT BUTTON REMOVED */}

        {/* PREMIUM FLOATING CHAT DRAWER / BOX */}
        {isChatOpen && (
          <>
            {/* BLURRED BACKGROUND OVERLAY TO PREVENT BACKGROUND INTERACTIONS */}
            <div 
              onClick={() => setIsChatOpen(false)}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(15, 23, 42, 0.3)',
                backdropFilter: 'blur(4px)',
                WebkitBackdropFilter: 'blur(4px)',
                zIndex: 999,
                animation: 'fadeIn 0.2s ease'
              }}
            />
            <div style={{
            position: 'fixed',
            bottom: isMobile ? 70 : 85,
            right: isMobile ? 12 : 24,
            left: isMobile ? 12 : 'auto',
            width: isMobile ? 'auto' : 720,
            maxWidth: isMobile ? 'calc(100vw - 24px)' : 'calc(100vw - 48px)',
            height: isMobile ? 480 : 540,
            maxHeight: isMobile ? 'calc(100dvh - 100px)' : 'none',
            background: '#fff',
            borderRadius: 24,
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.05)',
            display: 'flex',
            overflow: 'hidden',
            zIndex: 1000,
            animation: 'scaleUp 0.3s ease',
            fontFamily: 'Inter, sans-serif'
          }}>
            {/* LEFT PANE: CONVERSATIONS */}
            <div style={{
              width: isMobile ? '100%' : 260,
              display: isMobile && activeChatUser ? 'none' : 'flex',
              borderRight: '1px solid #e2e8f0',
              background: '#f8fafc',
              flexDirection: 'column',
              flexShrink: 0
            }}>
              <div style={{padding: '20px 20px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                <h3 style={{fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0}}>Chats</h3>
                <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
                  <span style={{fontSize: 12, fontWeight: 600, color: '#64748b', background: '#e2e8f0', padding: '4px 10px', borderRadius: 12}}>
                    {chatConversations.length}
                  </span>
                  {isMobile && (
                    <button
                      type="button"
                      onClick={() => setIsChatOpen(false)}
                      style={{background: '#e2e8f0', border: 'none', width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', cursor: 'pointer'}}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
              <div style={{flex: 1, overflowY: 'auto', padding: 12}}>
                {chatConversations.length === 0 ? (
                  <div style={{textAlign: 'center', padding: '40px 10px', color: '#94a3b8', fontSize: 13}}>
                    No conversations yet. Click "Chat Now" on a seller's profile to start chatting!
                  </div>
                ) : (
                  chatConversations.map(conv => (
                    <div
                      key={conv.user.id}
                      onClick={() => {
                        setChatMessages([]);
                        setLoadingChatMessages(true);
                        setActiveChatUser(conv.user);
                        setIsActiveUserOnline(!!conv.user.is_online);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: 12,
                        borderRadius: 14,
                        cursor: 'pointer',
                        background: activeChatUser?.id === conv.user.id ? '#fff' : 'transparent',
                        boxShadow: activeChatUser?.id === conv.user.id ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
                        border: activeChatUser?.id === conv.user.id ? '1px solid #e2e8f0' : '1px solid transparent',
                        marginBottom: 8,
                        transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        {conv.user.avatar ? (
                          <img 
                            src={getAvatarUrl(conv.user.avatar)} 
                            alt="" 
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(conv.user?.name || "User")}&background=F3F4F6&color=111827&bold=true`;
                            }}
                            style={{width: 44, height: 44, borderRadius: '50%', objectFit: 'cover'}} 
                          />
                        ) : (
                          <div style={{width: 44, height: 44, borderRadius: '50%', background: '#e2e8f0', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16}}>
                            {conv.user.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span style={{
                          position: 'absolute',
                          bottom: 2,
                          right: 2,
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          background: conv.user.is_online ? '#10b981' : '#cbd5e1',
                          border: '2px solid #fff',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                        }} />
                      </div>
                      <div style={{flex: 1, minWidth: 0}}>
                        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, minWidth: 0, gap: 12}}>
                          <div style={{display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flex: 1}}>
                            <h4 style={{
                              fontSize: 14, 
                              fontWeight: 700, 
                              color: '#0f172a', 
                              margin: 0, 
                              whiteSpace: 'nowrap', 
                              overflow: 'hidden', 
                              textOverflow: 'ellipsis',
                              flex: '0 1 auto'
                            }}>
                              {conv.user.name}
                            </h4>
                            <span style={{
                              fontSize: 11,
                              fontWeight: 500,
                              color: '#6B7280',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4
                            }}>
                              <span style={{ width: 5, height: 5, borderRadius: '50%', background: conv.user.is_online ? '#10B981' : '#CBD5E1' }}></span>
                              {conv.user.is_online ? "Active" : "Offline"}
                            </span>
                          </div>
                          {conv.last_message && (
                            <span style={{fontSize: 11, color: '#94a3b8', flexShrink: 0, marginLeft: 8}}>
                              {formatLastMessageTime(conv.last_message.created_at)}
                            </span>
                          )}
                        </div>
                        <p style={{fontSize: 13, color: conv.unread_count > 0 ? '#0f172a' : '#64748b', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: conv.unread_count > 0 ? 600 : 400}}>
                          {conv.last_message ? conv.last_message.message : 'No messages'}
                        </p>
                      </div>
                      {conv.unread_count > 0 && (
                        <div style={{width: 20, height: 20, borderRadius: '50%', background: '#111827', color: '#fff', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                          {conv.unread_count}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* RIGHT PANE: ACTIVE CHAT */}
            <div style={{
              flex: 1,
              display: isMobile && !activeChatUser ? 'none' : 'flex',
              flexDirection: 'column',
              background: '#fff',
              minWidth: 0
            }}>
              {activeChatUser ? (
                <>
                  {/* CHAT HEADER */}
                  <div style={{padding: isMobile ? '12px 16px' : '16px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 12}}>
                      {isMobile && (
                        <button
                          type="button"
                          onClick={() => setActiveChatUser(null)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            padding: '4px',
                            cursor: 'pointer',
                            color: '#64748b',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: 4
                          }}
                          title="Back to Chats"
                        >
                          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                      )}
                      {activeChatUser.avatar ? (
                        <img 
                          src={getAvatarUrl(activeChatUser.avatar)} 
                          alt="" 
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(activeChatUser?.name || "User")}&background=F3F4F6&color=111827&bold=true`;
                          }}
                          style={{width: isMobile ? 32 : 40, height: isMobile ? 32 : 40, borderRadius: '50%', objectFit: 'cover'}} 
                        />
                      ) : (
                        <div style={{width: isMobile ? 32 : 40, height: isMobile ? 32 : 40, borderRadius: '50%', background: '#e2e8f0', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: isMobile ? 14 : 16}}>
                          {activeChatUser.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <h4 style={{fontSize: isMobile ? 14 : 16, fontWeight: 700, color: '#0f172a', margin: '0 0 2px'}}>
                          {activeChatUser.name}
                        </h4>
                        <span style={{fontSize: isMobile ? 11 : 12, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 5, fontWeight: 500}}>
                          <span style={{width: 6, height: 6, borderRadius: '50%', background: isActiveUserOnline ? '#10B981' : '#9CA3AF'}}></span>
                          {isActiveUserOnline ? "Active now" : "Offline"}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsChatOpen(false)}
                      style={{background: '#f1f5f9', border: 'none', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', cursor: 'pointer'}}
                    >
                      ✕
                    </button>
                  </div>

                  {/* CHAT MESSAGES AREA */}
                  <div style={{flex: 1, overflowY: 'auto', padding: isMobile ? 12 : 24, display: 'flex', flexDirection: 'column', gap: isMobile ? 12 : 16, background: '#fff'}}>
                    {loadingChatMessages ? (
                      <>
                        <SkeletonChatMessage />
                        <SkeletonChatMessage />
                      </>
                    ) : chatMessages.length === 0 ? (
                      <div style={{textAlign: 'center', margin: 'auto 0', color: '#94a3b8', fontSize: 14}}>
                        <div style={{width: 44, height: 44, borderRadius: '50%', background: '#F3F4F6', color: '#6B7280', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px'}}><IconChat /></div>
                        Say hello to {activeChatUser.name}!
                      </div>
                    ) : (
                      chatMessages.map((msg, index) => {
                        const isMe = currentUser ? msg.sender_id === currentUser.id : msg.sender_id !== activeChatUser.id; // Fallback comparison if currentUser missing
                        const prevMsg = index > 0 ? chatMessages[index - 1] : null;
                        const showDivider = !prevMsg || 
                          new Date(msg.created_at).toDateString() !== new Date(prevMsg.created_at).toDateString();
                          
                        return (
                          <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                            {showDivider && (
                              <div style={{
                                display: 'flex',
                                justifyContent: 'center',
                                margin: '16px 0 8px',
                                width: '100%'
                              }}>
                                <span style={{
                                  background: '#f8fafc',
                                  border: '1px solid #e2e8f0',
                                  color: '#64748b',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  padding: '6px 16px',
                                  borderRadius: '20px',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.5px',
                                  boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                                }}>
                                  {formatDividerDate(msg.created_at)}
                                </span>
                              </div>
                            )}
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'flex-end',
                                gap: 8,
                                alignSelf: isMe ? 'flex-end' : 'flex-start',
                                maxWidth: isMobile ? '85%' : '75%',
                                marginBottom: 4
                              }}
                            >
                              {!isMe && (
                                activeChatUser.avatar ? (
                                  <img 
                                    src={getAvatarUrl(activeChatUser.avatar)} 
                                    alt="" 
                                    onError={(e) => {
                                      e.currentTarget.onerror = null;
                                      e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(activeChatUser?.name || "User")}&background=F3F4F6&color=111827&bold=true`;
                                    }}
                                    style={{width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', marginBottom: 4}} 
                                  />
                                ) : (
                                  <div style={{width: 28, height: 28, borderRadius: '50%', background: '#e2e8f0', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, marginBottom: 4}}>
                                    {activeChatUser.name.charAt(0).toUpperCase()}
                                  </div>
                                )
                              )}
                              <div style={{display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start'}}>
                                 <div style={msg.message?.startsWith("[LOCATION]") ? {
                                  background: '#f8fafc',
                                  border: '1px solid #cbd5e1',
                                  color: '#0f172a',
                                  borderRadius: isMe ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                                  padding: 0,
                                  overflow: 'hidden',
                                  fontSize: isMobile ? 13 : 14,
                                  lineHeight: 1.5,
                                  wordBreak: 'break-word',
                                  whiteSpace: 'pre-wrap'
                                } : {
                                  background: isMe ? '#111827' : '#f1f5f9',
                                  color: isMe ? '#fff' : '#0f172a',
                                  borderRadius: isMe ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                                  padding: isMobile ? '8px 12px' : '12px 18px',
                                  fontSize: isMobile ? 13 : 14,
                                  lineHeight: 1.5,
                                  boxShadow: isMe ? '0 4px 12px rgba(17, 24, 39, 0.12)' : 'none',
                                  wordBreak: 'break-word',
                                  whiteSpace: 'pre-wrap'
                                }}>
                                  {((msg.images && msg.images.length > 0) || (msg.optimistic_previews && msg.optimistic_previews.length > 0)) ? (
                                      <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: ((msg.images || msg.optimistic_previews).length > 1) ? 'repeat(2, 1fr)' : '1fr',
                                        gap: 6,
                                        marginBottom: msg.message ? 8 : 0,
                                        maxWidth: 280
                                      }}>
                                        {(msg.optimistic_previews || msg.images).map((img: string, i: number) => {
                                          const fullList = (msg.optimistic_previews || msg.images);
                                          return (
                                            <img
                                              key={i}
                                              src={img.startsWith('blob:') || img.startsWith('data:') ? img : getImageUrl(img)}
                                              alt={`Attachment ${i + 1}`}
                                              onClick={() => setViewingImageModal({ images: fullList, index: i })}
                                              style={{ borderRadius: 10, width: '100%', height: fullList.length > 1 ? 110 : 200, objectFit: 'cover', display: 'block', cursor: 'pointer', transition: 'transform 0.15s' }}
                                              title="Click to view full photo"
                                            />
                                          );
                                        })}
                                      </div>
                                    ) : msg.image ? (
                                      <div style={{ marginBottom: msg.message ? 8 : 0 }}>
                                        <img
                                          src={msg.optimistic_preview || getImageUrl(msg.image)}
                                          alt="Attachment"
                                          onClick={() => setViewingImageModal({ images: [msg.optimistic_preview || msg.image], index: 0 })}
                                          style={{ borderRadius: 12, maxWidth: '100%', maxHeight: 240, objectFit: 'cover', display: 'block', cursor: 'pointer' }}
                                          title="Click to view full photo"
                                        />
                                      </div>
                                    ) : null}
                                  {msg.message && (
                                    msg.message.startsWith("[LOCATION]") ? (() => {
                                      const coords = msg.message.replace("[LOCATION]", "").split(",");
                                      const lat = Number(coords[0]) || 0;
                                      const lng = Number(coords[1]) || 0;
                                      return (
                                        <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10, width: 220 }}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#F3F4F6', color: '#111827', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                              <span style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>Shared Location</span>
                                              <span style={{ fontSize: 10, color: '#64748b' }}>{lat.toFixed(4)}, {lng.toFixed(4)}</span>
                                            </div>
                                          </div>
                                          <div style={{ display: 'flex', gap: 6 }}>
                                            <a
                                              href={`https://www.google.com/maps?q=${lat},${lng}`}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              style={{ flex: 1, textAlign: 'center', background: '#FFFFFF', color: '#111827', border: '1px solid #D1D5DB', fontSize: 11, fontWeight: 600, padding: '6px 0', borderRadius: 8, textDecoration: 'none' }}
                                            >
                                              Google Maps
                                            </a>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setIsMeetupMapOpen(true);
                                              }}
                                              style={{ flex: 1, background: '#111827', color: '#fff', border: '1px solid #111827', fontSize: 11, fontWeight: 600, padding: '6px 0', borderRadius: 8, cursor: 'pointer' }}
                                            >
                                              Meetup Map
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    })() : (
                                      <div>{msg.message}</div>
                                    )
                                  )}
                                </div>
                                <span style={{fontSize: 10, color: '#94a3b8', margin: '4px 4px 0'}}>
                                  {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                    {isOtherUserTyping && activeChatUser && (
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, alignSelf: 'flex-start', maxWidth: isMobile ? '85%' : '75%', animation: 'slideIn 0.2s ease' }}>
                        {activeChatUser.avatar ? (
                          <img 
                            src={getAvatarUrl(activeChatUser.avatar)} 
                            alt="" 
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(activeChatUser?.name || "User")}&background=F3F4F6&color=111827&bold=true`;
                            }}
                            style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', marginBottom: 4 }} 
                          />
                        ) : (
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#e2e8f0', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, marginBottom: 4 }}>
                            {activeChatUser.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div style={{ background: '#E5E7EB', padding: '12px 18px', borderRadius: '20px 20px 20px 4px', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 4px 12px rgba(17, 24, 39, 0.06)' }}>
                          <span style={{ width: 8, height: 8, background: '#475569', borderRadius: '50%', animation: 'typingBounce 1.4s infinite ease-in-out both', animationDelay: '-0.32s' }}></span>
                          <span style={{ width: 8, height: 8, background: '#475569', borderRadius: '50%', animation: 'typingBounce 1.4s infinite ease-in-out both', animationDelay: '-0.16s' }}></span>
                          <span style={{ width: 8, height: 8, background: '#475569', borderRadius: '50%', animation: 'typingBounce 1.4s infinite ease-in-out both' }}></span>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* CHAT INPUT AREA */}
                  <div style={{ borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
                    {chatImagePreviews.length > 0 && (
                      <div style={{ padding: '12px 24px 0', display: 'flex', gap: 8, overflowX: 'auto', alignItems: 'center' }}>
                        {chatImagePreviews.map((preview, idx) => (
                          <div key={idx} style={{ position: 'relative', display: 'inline-block', flexShrink: 0 }}>
                            <img src={preview} alt={`Preview ${idx + 1}`} style={{ height: 75, width: 75, borderRadius: 8, objectFit: 'cover', border: '2px solid #cbd5e1' }} />
                            <button
                              type="button"
                              onClick={() => {
                                setChatImageFiles(prev => prev.filter((_, i) => i !== idx));
                                setChatImagePreviews(prev => prev.filter((_, i) => i !== idx));
                              }}
                              style={{ position: 'absolute', top: -6, right: -6, background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}
                            >✕</button>
                          </div>
                        ))}
                        <label style={{ height: 75, width: 75, borderRadius: 8, border: '2px dashed #9CA3AF', background: '#F3F4F6', color: '#111827', fontSize: 24, fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, transition: 'all 0.2s' }} title="Add more photos">
                          +
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={async e => {
                              const files = Array.from(e.target.files || []);
                              if (files.length > 0) {
                                const compressedFiles: File[] = [];
                                const newPreviews: string[] = [];
                                for (const file of files) {
                                  const compressed = await compressImage(file, 800);
                                  compressedFiles.push(compressed);
                                  newPreviews.push(URL.createObjectURL(compressed));
                                }
                                setChatImageFiles(prev => [...prev, ...compressedFiles]);
                                setChatImagePreviews(prev => [...prev, ...newPreviews]);
                              }
                              e.target.value = '';
                            }}
                            style={{ display: 'none' }}
                          />
                        </label>
                      </div>
                    )}
                    <form onSubmit={handleSendMessage} style={{padding: isMobile ? '10px 12px' : '16px 24px', display: 'flex', gap: isMobile ? 8 : 12, alignItems: 'center', position: 'relative'}}>
                      {/* Emoji Picker Popup */}
                      {isEmojiPickerOpen && (
                        <div 
                          ref={emojiPickerRef}
                          style={{
                            position: 'absolute',
                            bottom: 'calc(100% + 12px)',
                            left: 12,
                            background: '#fff',
                            border: '1px solid #cbd5e1',
                            borderRadius: 16,
                            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                            padding: 12,
                            display: 'grid',
                            gridTemplateColumns: 'repeat(7, 1fr)',
                            gap: 6,
                            zIndex: 50,
                            width: 280,
                            height: 240,
                            overflowY: 'auto',
                            animation: 'scaleUp 0.15s cubic-bezier(0.16, 1, 0.3, 1)'
                          }}
                          className="emoji-grid-container"
                        >
                          <style>{`
                            @keyframes scaleUp { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
                            .emoji-grid-container {
                              scrollbar-width: thin;
                              scrollbar-color: #cbd5e1 transparent;
                            }
                            .emoji-grid-container::-webkit-scrollbar {
                              width: 6px;
                            }
                            .emoji-grid-container::-webkit-scrollbar-track {
                              background: transparent;
                            }
                            .emoji-grid-container::-webkit-scrollbar-thumb {
                              background-color: #cbd5e1;
                              border-radius: 20px;
                            }
                            .emoji-grid-btn {
                              background: none;
                              border: none;
                              font-size: 20px;
                              cursor: pointer;
                              padding: 6px;
                              border-radius: 8px;
                              transition: all 0.2s ease;
                              display: flex;
                              align-items: center;
                              justifyContent: center;
                            }
                            .emoji-grid-btn:hover {
                              background: #f1f5f9;
                              transform: scale(1.22);
                            }
                            .emoji-grid-btn:active {
                              transform: scale(0.95);
                            }
                          `}</style>
                          {[
                            "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌",
                            "😍", "🥰", "😘", "😗", "😙", "😚", "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓",
                            "😎", "🥸", "🤩", "🥳", "😏", "😒", "😞", "😔", "😟", "😕", "🙁", "☹️", "😣", "😖",
                            "😫", "😩", "🥺", "😢", "😭", "😤", "😠", "😡", "🤬", "🤯", "😳", "🥵", "🥶", "😱",
                            "👍", "👎", "👊", "✊", "🤛", "🤜", "🤞", "✌️", "🤟", "🤘", "👌", "🤌", "🤏", "👈",
                            "👉", "👆", "👇", "☝️", "✋", "🤚", "🖐️", "🖖", "👋", "🤙", "💪", "🦾", "🖕", "✍️",
                            "🙏", "🤝", "🙌", "👏", "👋", "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "💔",
                            "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟", "💬", "💭", "✨", "⭐", "🔥",
                            "💥", "❄️", "☀️", "🌈", "📍", "🗺️", "🚗", "📦", "💰", "🎁"
                          ].map(emoji => (
                            <button
                              key={emoji}
                              type="button"
                              className="emoji-grid-btn"
                              onClick={() => {
                                setNewChatMessage(prev => prev + emoji);
                              }}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}

                      <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: isMobile ? 32 : 44, height: isMobile ? 32 : 44, borderRadius: '50%', background: '#e2e8f0', color: '#64748b', transition: 'all 0.2s', flexShrink: 0 }} title="Upload Images">
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={async e => {
                            const files = Array.from(e.target.files || []);
                            if (files.length > 0) {
                              const compressedFiles: File[] = [];
                              const newPreviews: string[] = [];
                              for (const file of files) {
                                const compressed = await compressImage(file, 800);
                                compressedFiles.push(compressed);
                                newPreviews.push(URL.createObjectURL(compressed));
                              }
                              setChatImageFiles(prev => [...prev, ...compressedFiles]);
                              setChatImagePreviews(prev => [...prev, ...newPreviews]);
                            }
                            e.target.value = '';
                          }}
                          style={{ display: 'none' }}
                        />
                        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/></svg>
                      </label>

                      {/* Emoji Picker Toggle Button */}
                      <button
                        type="button"
                        onClick={() => setIsEmojiPickerOpen(prev => !prev)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: isMobile ? 32 : 44,
                          height: isMobile ? 32 : 44,
                          borderRadius: '50%',
                          background: isEmojiPickerOpen ? '#E5E7EB' : '#e2e8f0',
                          color: isEmojiPickerOpen ? '#111827' : '#64748b',
                          border: 'none',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          flexShrink: 0
                        }}
                        title="Pick Emoji"
                      >
                        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm6 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75z" />
                        </svg>
                      </button>

                      {/* Share Location Button */}
                      <button
                        type="button"
                        onClick={handleShareLocation}
                        disabled={sharingLocation}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: isMobile ? 32 : 44,
                          height: isMobile ? 32 : 44,
                          borderRadius: '50%',
                          background: sharingLocation ? '#d1fae5' : '#e2e8f0',
                          color: sharingLocation ? '#059669' : '#64748b',
                          border: 'none',
                          cursor: sharingLocation ? 'not-allowed' : 'pointer',
                          transition: 'all 0.2s',
                          flexShrink: 0
                        }}
                        title="Share Location"
                      >
                        {sharingLocation ? (
                          <>
                            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                            <div style={{
                              width: 16,
                              height: 16,
                              border: '2px solid #059669',
                              borderTopColor: 'transparent',
                              borderRadius: '50%',
                              animation: 'spin 0.8s linear infinite'
                            }} />
                          </>
                        ) : (
                          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25s-7.5-4.108-7.5-11.25a7.5 7.5 0 1115 0z" />
                          </svg>
                        )}
                      </button>
                      <textarea
                        placeholder={`Message ${activeChatUser.name}...`}
                        value={newChatMessage}
                        onChange={e => {
                          setNewChatMessage(e.target.value);
                          if (!typingTimeoutRef.current && activeChatUser) {
                            const token = localStorage.getItem("token");
                            if (token) {
                              fetch(`${API}/chat/${activeChatUser.id}/typing`, {
                                method: "POST",
                                headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }
                              }).catch(() => {});
                            }
                            typingTimeoutRef.current = setTimeout(() => {
                              typingTimeoutRef.current = null;
                            }, 1000);
                          }
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage(e as any);
                          }
                        }}
                        style={{
                          flex: 1,
                          padding: isMobile ? '8px 14px' : '12px 20px',
                          borderRadius: 20,
                          border: '1px solid #cbd5e1',
                          background: '#fff',
                          fontSize: isMobile ? 13 : 14,
                          outline: 'none',
                          color: '#0f172a',
                          fontFamily: 'Inter, sans-serif',
                          resize: 'none',
                          minHeight: isMobile ? 36 : 44,
                          maxHeight: 120,
                          lineHeight: 1.4
                        }}
                      />
                      <button
                        type="submit"
                        disabled={!newChatMessage.trim() && chatImageFiles.length === 0}
                        style={{
                          background: '#111827',
                          color: '#fff',
                          border: 'none',
                          width: isMobile ? 36 : 46,
                          height: isMobile ? 36 : 46,
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: (!newChatMessage.trim() && chatImageFiles.length === 0) ? 'not-allowed' : 'pointer',
                          opacity: (!newChatMessage.trim() && chatImageFiles.length === 0) ? 0.6 : 1,
                          boxShadow: '0 4px 12px rgba(17, 24, 39, 0.12)',
                          transition: 'all 0.2s',
                          flexShrink: 0
                        }}
                      >
                        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
                      </button>
                    </form>
                  </div>
                </>
              ) : (
                <div style={{margin: 'auto', textAlign: 'center', color: '#94a3b8', padding: 24}}>
                  <div style={{width: 64, height: 64, borderRadius: '50%', background: '#f1f5f9', color: '#cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'}}>
                    <IconChat />
                  </div>
                  <h3 style={{fontSize: 18, fontWeight: 700, color: '#0f172a', margin: '0 0 8px'}}>Your Messages</h3>
                  <p style={{fontSize: 14, maxWidth: 260, margin: 0, lineHeight: 1.5}}>
                    Select a conversation from the left sidebar to start chatting.
                  </p>
                </div>
              )}
            </div>
          </div>
          </>
        )}
        {isMeetupMapOpen && activeChatUser && currentUser && (
          <MeetupMap
            myId={currentUser.id}
            peerId={activeChatUser.id}
            myName={currentUser.name}
            peerName={activeChatUser.name}
            onClose={() => setIsMeetupMapOpen(false)}
          />
        )}

        {/* FULLSCREEN LIGHTBOX IMAGE VIEWER MODAL */}
        {viewingImageModal && (
          <div
            ref={imageViewerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Full-size image gallery"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(15, 23, 42, 0.92)',
              backdropFilter: 'blur(8px)',
              zIndex: 999999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20
            }}
            onClick={() => setViewingImageModal(null)}
          >
            <div
              style={{
                position: 'relative',
                maxWidth: '90vw',
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                type="button"
                aria-label="Close full-size image gallery"
                onClick={() => setViewingImageModal(null)}
                style={{
                  position: 'absolute',
                  top: -16,
                  right: -16,
                  background: 'rgba(255, 255, 255, 0.25)',
                  color: '#fff',
                  border: '1px solid rgba(255, 255, 255, 0.4)',
                  borderRadius: '50%',
                  width: 36,
                  height: 36,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 18,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
                  zIndex: 10
                }}
                title="Close"
              >
                ✕
              </button>

              {/* Main Image */}
              <img
                src={
                  viewingImageModal.images[viewingImageModal.index].startsWith('blob:') ||
                  viewingImageModal.images[viewingImageModal.index].startsWith('data:')
                    ? viewingImageModal.images[viewingImageModal.index]
                    : getImageUrl(viewingImageModal.images[viewingImageModal.index])
                }
                alt="Enlarged view"
                style={{
                  width: '85vw',
                  height: '78dvh',
                  maxWidth: '85vw',
                  maxHeight: '78vh',
                  objectFit: 'contain',
                  borderRadius: 12,
                  boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
                  border: '1px solid rgba(255, 255, 255, 0.15)'
                }}
              />

              {/* Navigation Bar */}
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 16 }}>
                {viewingImageModal.images.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setViewingImageModal(prev =>
                        prev ? { ...prev, index: (prev.index - 1 + prev.images.length) % prev.images.length } : null
                      )
                    }
                    style={{
                      background: 'rgba(255, 255, 255, 0.2)',
                      color: '#fff',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      borderRadius: 20,
                      padding: '6px 16px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: 13
                    }}
                  >
                    ← Prev
                  </button>
                )}

                <span style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 600 }}>
                  {viewingImageModal.images.length > 1
                    ? `${viewingImageModal.index + 1} of ${viewingImageModal.images.length}`
                    : 'Photo View'}
                </span>

                {viewingImageModal.images.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setViewingImageModal(prev =>
                        prev ? { ...prev, index: (prev.index + 1) % prev.images.length } : null
                      )
                    }
                    style={{
                      background: 'rgba(255, 255, 255, 0.2)',
                      color: '#fff',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      borderRadius: 20,
                      padding: '6px 16px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: 13
                    }}
                  >
                    Next →
                  </button>
                )}

                <a
                  href={
                    viewingImageModal.images[viewingImageModal.index].startsWith('blob:') ||
                    viewingImageModal.images[viewingImageModal.index].startsWith('data:')
                      ? viewingImageModal.images[viewingImageModal.index]
                      : getImageUrl(viewingImageModal.images[viewingImageModal.index])
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    background: '#111827',
                    color: '#fff',
                    textDecoration: 'none',
                    borderRadius: 20,
                    padding: '6px 16px',
                    fontWeight: 600,
                    fontSize: 13,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  Full Size ↗
                </a>
              </div>
            </div>
          </div>
        )}

        {/* ACCOUNT BLOCKED POPUP MODAL */}
        {isUserBlockedModalOpen && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(15, 23, 42, 0.94)',
              backdropFilter: 'blur(12px)',
              zIndex: 9999999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 24
            }}
          >
            <div
              style={{
                background: '#fff',
                borderRadius: 24,
                padding: 32,
                maxWidth: 440,
                width: '100%',
                textAlign: 'center',
                boxShadow: '0 25px 50px -12px rgba(239, 68, 68, 0.3)',
                border: '2px solid #ef4444',
                animation: 'slideIn 0.3s ease-out'
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  background: '#FEE2E2',
                  color: '#DC2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 18px'
                }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 10px' }}>
                Account Suspended
              </h2>
              <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6, margin: '0 0 24px' }}>
                Your Shopply account has been blocked by the administrator. You have been automatically logged out.
              </p>
              <button
                type="button"
                onClick={() => {
                  revokeMarketplaceAccess();
                  localStorage.removeItem('token');
                  localStorage.removeItem('user');
                  localStorage.removeItem('shopply_user');
                  localStorage.removeItem('shopply_dashboard_access');
                  sessionStorage.removeItem('shopply_dashboard_access');
                  getApiCache().invalidateAll();
                  fetch('/api/logout', { method: 'POST', keepalive: true }).catch(() => {});
                  window.location.replace('/login?logged_out=1');
                }}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: 14,
                  border: 'none',
                  background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(239, 68, 68, 0.35)'
                }}
              >
                Return to Login
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
