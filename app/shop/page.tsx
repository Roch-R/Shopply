"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
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

const calculateTotalStock = (item: any) => {
  try {
    let attrs = item.attributes;
    if (typeof attrs === 'string') {
      try { attrs = JSON.parse(attrs); } catch (e) {}
    }
    if (attrs && typeof attrs === 'object' && attrs.size_stocks && Object.keys(attrs.size_stocks).length > 0) {
      const sum = Object.values(attrs.size_stocks).reduce((acc: number, qty: any) => acc + Number(qty || 0), 0);
      return sum;
    }
  } catch(e) {
    console.error("calculateTotalStock error", e);
  }
  return item.stock || 0;
};

const isFootwearCategory = (cat?: string | null) => {
  if (!cat) return false;
  const c = cat.trim().toLowerCase();
  return c === "footwear" || c === "shoes" || c === "shoe";
};

const BANNERS = [
  {
    badge: "🔥 MEGA PAYDAY 9.21 SALE | LIVE NOW",
    badgeBg: "#ef4444",
    title: "UP TO 70% OFF + ₱0 MIN SPEND FREE SHIPPING",
    subtitle: "Mega price cuts on premium tech, trending streetwear, and lifestyle favorites from verified Philippine sellers.",
    voucher: "CODE: SHOPPLY70",
    voucherCode: "SHOPPLY70",
    shipping: "FREE SHIPPING VOUCHER",
    gradient: "linear-gradient(135deg, #7c3aed 0%, #6366f1 50%, #d946ef 100%)",
    primaryBtn: "Shop Mega Deals →",
    secondaryBtn: "⚡ Flash Drops",
    tag: "70% OFF"
  },
  {
    badge: "💎 SHOPPLY OFFICIAL MALL",
    badgeBg: "#10b981",
    title: "100% AUTHENTIC BRANDS & DIRECT WHOLESALE",
    subtitle: "Shop guaranteed authentic items with 7-day hassle-free returns, official store warranty, and verified buyer reviews.",
    voucher: "CODE: MALLAUTHENTIC",
    voucherCode: "MALLAUTHENTIC",
    shipping: "7-DAY FREE RETURNS",
    gradient: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #4338ca 100%)",
    primaryBtn: "Explore Official Mall →",
    secondaryBtn: "🛡️ Buyer Protection",
    tag: "100% AUTHENTIC"
  },
  {
    badge: "⚡ 24/7 FLASH DEALS & CRAZY DROPS",
    badgeBg: "#f59e0b",
    title: "LIMITED STOCK FLASH DEALS STARTING AT ₱49",
    subtitle: "Lowest price guarantee refreshed every 4 hours! Grab tech accessories, footwear, and apparel before timer expires.",
    voucher: "CODE: FLASHDROP49",
    voucherCode: "FLASHDROP49",
    shipping: "CASH ON DELIVERY",
    gradient: "linear-gradient(135deg, #dc2626 0%, #ea580c 50%, #f59e0b 100%)",
    primaryBtn: "Grab Flash Deals ⚡",
    secondaryBtn: "⏰ View Schedule",
    tag: "FLASH SALE"
  }
];

const TRENDING_KEYWORDS = [
  "Wireless Earbuds",
  "Sneakers",
  "Smart Watch",
  "Oversized Tee",
  "Phone Case",
  "Perfume",
  "Backpack",
  "Hoodie"
];

const CURATED_CATEGORIES = [
  { id: "All", label: "All Items", icon: "⚡", color: "#7c3aed" },
  { id: "Electronics", label: "Electronics", icon: "📱", color: "#2563eb" },
  { id: "Footwear", label: "Shoes & Footwear", icon: "👟", color: "#f97316" },
  { id: "Fashion", label: "Fashion & Apparel", icon: "👗", color: "#ec4899" },
  { id: "Beauty", label: "Health & Beauty", icon: "💄", color: "#e11d48" },
  { id: "Home", label: "Home & Living", icon: "🏡", color: "#10b981" },
  { id: "Accessories", label: "Watches & Bags", icon: "⌚", color: "#8b5cf6" },
  { id: "Sports", label: "Sports & Fitness", icon: "⚽", color: "#06b6d4" },
  { id: "Groceries", label: "Groceries & Food", icon: "🛒", color: "#84cc16" },
  { id: "Gaming", label: "Gaming & Hobbies", icon: "🎮", color: "#6366f1" }
];

export default function ShopPage() {
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
  const [currentBannerIdx, setCurrentBannerIdx] = useState(0);
  const [isBannerHovered, setIsBannerHovered] = useState(false);
  const [flashCountdown, setFlashCountdown] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [flashConfig, setFlashConfig] = useState<{
    is_active: boolean;
    end_time: string;
    badge_text: string;
    items: Array<{
      item_id: number;
      flash_price: number;
      discount_pct: number;
      claimed_pct: number;
      stock: number;
    }>;
  }>({
    is_active: true,
    end_time: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
    badge_text: "🔥 Up to 50% OFF Limited Time",
    items: []
  });

  // Real-time Firestore subscription for Flash Deals
  useEffect(() => {
    try {
      const flashDocRef = doc(db, "settings", "flash_deals");
      const unsub = onSnapshot(flashDocRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data() as any;
          setFlashConfig({
            is_active: data.is_active !== false,
            end_time: data.end_time || new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
            badge_text: data.badge_text || "🔥 Up to 50% OFF Limited Time",
            items: Array.isArray(data.items) ? data.items : []
          });
        }
      }, (err) => {
        console.warn("Flash deals firestore subscription error, falling back to API:", err);
        fetch("/api/flash-deals")
          .then(r => r.json())
          .then(d => {
            if (d.data) setFlashConfig(d.data);
          })
          .catch(e => console.warn("Failed to fetch /api/flash-deals fallback:", e));
      });
      return () => unsub();
    } catch (e) {
      console.warn("Flash deals init error:", e);
    }
  }, []);
  const [sortBy, setSortBy] = useState<"featured" | "price-asc" | "price-desc" | "rating" | "popular">("featured");
  const [copiedVoucher, setCopiedVoucher] = useState<string | null>(null);

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
              badge: data.badge || "🎁 PROMO PACK",
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

        // Find coupon specially assigned to Flash Deals (e.g. FLASHDROP49 from C# Admin)
        const fCoupon = list.find(c =>
          (c.category && c.category.toLowerCase().includes("flash")) ||
          (c.badge && c.badge.toLowerCase().includes("flash")) ||
          (c.code && c.code.toLowerCase().includes("flash"))
        );
        setFlashCoupon(fCoupon || null);

        // General voucher for promo banner (prefer non-flash coupon, or first)
        const genVoucher = list.find(c => c !== fCoupon) || list[0];
        if (genVoucher) {
          setActiveVoucher(genVoucher);
        } else {
          setActiveVoucher(null);
        }
      }, (err) => {
        console.warn("Error fetching coupons from Firestore:", err);
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn("Firestore coupon subscription error:", e);
    }
  }, []);
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

  // Banner Carousel Auto-play (every 5 seconds, paused on hover)
  useEffect(() => {
    if (isBannerHovered) return;
    const timer = setInterval(() => {
      setCurrentBannerIdx(prev => (prev + 1) % BANNERS.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [isBannerHovered]);

  // Flash Deals Countdown Timer based on real end_time
  useEffect(() => {
    const updateCountdown = () => {
      const targetTime = new Date(flashConfig.end_time).getTime();
      const now = Date.now();
      const diff = Math.max(0, targetTime - now);
      
      const totalSeconds = Math.floor(diff / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      setFlashCountdown({ hours, minutes, seconds });
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [flashConfig.end_time]);

  // Flash Deals active status & item resolver
  const hasFlashEnded = flashCountdown.hours === 0 && flashCountdown.minutes === 0 && flashCountdown.seconds === 0;
  const isFlashSaleActive = Boolean(flashConfig.is_active && !hasFlashEnded);

  const getActiveFlashDeal = (itemId?: string | number | null) => {
    if (!isFlashSaleActive || !itemId) return null;
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
    return path.startsWith('http://') || path.startsWith('https://') ? path : `${STORAGE_URL}/${path}`;
  };

  const getImageUrl = (path?: string | null) => {
    if (!path) return "";
    return path.startsWith('http://') || path.startsWith('https://') ? path : `${STORAGE_URL}/${path}`;
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
    if (activeDeal) {
      return `₱${Number(activeDeal.flash_price).toFixed(2)}`;
    }
    const basePrice = parseFloat(item.price) || 0;
    let prices: number[] = [basePrice];
    if (item.attributes?.variant_prices && item.attributes.variant_prices.length > 0) {
      const vPrices = item.attributes.variant_prices.map(p => parseFloat(p)).filter(p => !isNaN(p) && p > 0);
      if (vPrices.length > 0) {
        prices = prices.concat(vPrices);
      }
    }
    const validPrices = prices.filter(p => p > 0);
    if (validPrices.length === 0) return `₱0.00`;
    const minPrice = Math.min(...validPrices);
    const maxPrice = Math.max(...validPrices);

    if (minPrice !== maxPrice) {
      return `₱${minPrice.toFixed(2)} - ₱${maxPrice.toFixed(2)}`;
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

  // Load current user for chat & followed sellers
  useEffect(() => {
    const token = localStorage.getItem("token");
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
        if (data.items) setItems(data.items);
        setLoading(false);
      })
      .catch((err: any) => {
        console.error("Failed to fetch shop items", err);
        setLoading(false);
      });

    // Fetch Cart Count if logged in (cached)
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
    }
  }, [API]);

  useEffect(() => {
    if (viewItem) {
      const cache = getApiCache();
      cache.fetch(`${API}/items/${viewItem.id}/reviews`, {})
        .then((data: any) => {
          if (data.reviews) setReviews(data.reviews);
        })
        .catch(console.error);
    }
  }, [viewItem, API]);

  // Lock body scrolling when detail modal is open
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (viewItem) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [viewItem]);

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
        setReviews([data.review, ...reviews]);
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
      const savedCoupon = !activeDeal && typeof window !== 'undefined' ? localStorage.getItem('claimed_voucher') : null;
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
          coupon_code: savedCoupon || undefined
        }),
      });

      const data = await res.json();
      if (res.ok) {
        const updateItemStock = (item: ShopItem) => {
          if (item.id !== buyModal.item.id) return item;
          const newItem = { ...item, stock: item.stock - 1 };
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
    const el = document.getElementById("catalog-products");
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

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
      return matchesCategory && matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'price-asc') return parseFloat(a.price) - parseFloat(b.price);
      if (sortBy === 'price-desc') return parseFloat(b.price) - parseFloat(a.price);
      if (sortBy === 'rating') return Number(b.reviews_avg_rating || 0) - Number(a.reviews_avg_rating || 0);
      if (sortBy === 'popular') return Number(b.sold_count || b.reviews_count || 0) - Number(a.sold_count || a.reviews_count || 0);
      return 0; // featured default
    });

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        html, body{max-width:100%;overflow-x:hidden}
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#f5f7ff;font-family:'Inter',sans-serif}
        input, textarea { color: #0f172a !important; font-family: 'Inter', sans-serif; }
        .root{min-height:100vh;background:linear-gradient(135deg,#f0f4ff 0%,#faf5ff 50%,#f0f9ff 100%)}
        .nav{background:#fff;border-bottom:1px solid #e2e8f0;padding:0 32px;height:64px;
          display:flex;align-items:center;justify-content:space-between;
          box-shadow:0 1px 8px rgba(0,0,0,.04);position:sticky;top:0;z-index:50}
        .nav-logo{display:flex;align-items:center;gap:10px;text-decoration:none}
        .logo-text{font-size:17px;font-weight:700;color:#0f172a;letter-spacing:-.3px}
        .nav-right{display:flex;align-items:center;gap:16px}
        .nav-link{font-size:13px;font-weight:500;color:#64748b;text-decoration:none;
          padding:6px 12px;border-radius:8px;transition:all .2s}
        .nav-link:hover{color:#7c3aed;background:rgba(124,58,237,.06)}
        .login-btn{padding:8px 16px;background:linear-gradient(135deg,#7c3aed,#2563eb);
          border:none;border-radius:8px;color:#fff;font-size:13px;font-weight:600;
          font-family:'Inter',sans-serif;cursor:pointer;transition:all .2s;text-decoration:none}
        .login-btn:hover{opacity:.85;transform:translateY(-1px)}
        
        .main{max-width:1200px;margin:0 auto;padding:40px 24px}
        .header{text-align:center;margin-bottom:48px}
        .title{font-size:46px;font-weight:800;color:#0f172a;letter-spacing:-1px;margin-bottom:16px}
        .subtitle{font-size:16px;color:#64748b;max-width:600px;margin:0 auto;line-height:1.6}
        
        .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:24px}
        .item-card{background:#fff;border-radius:18px;overflow:hidden;
          box-shadow:0 4px 20px rgba(0,0,0,.04);border:1px solid #f1f5f9;transition:all .3s ease;
          display:flex;flex-direction:column;justify-content:space-between}
        .item-card:hover{transform:translateY(-4px);box-shadow:0 12px 32px rgba(124,58,237,.12);border-color:rgba(124,58,237,.2)}
        .item-card-img{width:100%;height:220px;object-fit:cover;display:block}
        .item-image-placeholder{height:220px;background:linear-gradient(135deg,#f8fafc,#e2e8f0);
          display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:48px}
        .item-content{padding:18px;flex-grow:1;display:flex;flex-direction:column;justify-content:space-between}
        .item-name{font-size:15px;font-weight:700;color:#0f172a;margin-bottom:6px;line-height:1.3}
        .item-desc{display:none}
        .item-footer{display:flex;align-items:center;justify-content:space-between;
          padding-top:12px;border-top:1px solid #f1f5f9}
        .item-price{font-size:18px;font-weight:800;color:#ee4d2d}
        .item-seller{display:none}
        
        .buy-btn{padding:8px 10px;background:linear-gradient(135deg,#7c3aed,#4f46e5);
          border:none;border-radius:8px;color:#fff;font-size:12px;font-weight:600;
          font-family:'Inter',sans-serif;cursor:pointer;transition:all .2s;
          display:inline-flex;align-items:center;justify-content:center;gap:4px;
          box-shadow:0 3px 12px rgba(124,58,237,.3);flex:1}
        .buy-btn:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(124,58,237,.4)}
        
        .add-cart-btn{padding:8px 10px;background:#fff;border:1.5px solid #7c3aed;
          color:#7c3aed;border-radius:8px;font-size:12px;font-weight:600;
          font-family:'Inter',sans-serif;cursor:pointer;transition:all .2s;
          display:inline-flex;align-items:center;justify-content:center;gap:4px;flex:1}
        .add-cart-btn:hover{background:#f5f3ff;transform:translateY(-1px)}
          
        .cart-nav-icon{position:relative;display:flex;align-items:center;justify-content:center;
          width:40px;height:40px;border-radius:50%;color:#64748b;transition:all .2s;text-decoration:none}
        .cart-nav-icon:hover{background:#f1f5f9;color:#7c3aed}
        .cart-badge{position:absolute;top:2px;right:0;background:#ef4444;color:#fff;
          font-size:10px;font-weight:700;width:18px;height:18px;border-radius:50%;
          display:flex;align-items:center;justify-content:center;border:2px solid #fff}
          
        .empty-state{text-align:center;padding:80px 0}
        .empty-icon{font-size:48px;margin-bottom:16px;display:flex;justify-content:center}
        .empty-text{font-size:18px;font-weight:600;color:#0f172a}
        
        .loading-container{min-height:60vh;display:flex;align-items:center;justify-content:center}
        .spinner{width:40px;height:40px;border-radius:50%;border:3px solid #e2e8f0;
          border-top-color:#7c3aed;animation:spin .7s linear infinite}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes typingBounce{0%,80%,100%{transform:scale(0.6);opacity:0.4}40%{transform:scale(1);opacity:1}}

        .toast{position:fixed;top:80px;right:24px;background:#10b981;color:#fff;padding:14px 24px;
          border-radius:12px;font-size:14px;font-weight:600;z-index:1000;
          box-shadow:0 8px 24px rgba(16,185,129,.3);animation:slideIn .3s ease}
        @keyframes slideIn{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:translateX(0)}}

        .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.6);backdrop-filter:blur(8px);
          display:flex;align-items:center;justify-content:center;z-index:500;padding:0}
        .detail-modal{position:relative;background:#fff;border-radius:0;max-width:100%;width:100%;max-height:100vh;height:100%;
          overflow-y:auto;overflow-x:hidden;display:flex;flex-direction:column;box-shadow:none;animation:scaleUp .3s ease}
        .detail-modal > div{flex-shrink:0}
        @keyframes scaleUp{from{opacity:0;transform:scale(0.95)}to{opacity:1;transform:scale(1)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        
        .detail-content{display:grid;grid-template-columns:minmax(0,1fr);gap:20px;padding:12px}
        
        .detail-img-side{display:flex;flex-direction:column;gap:16px;min-width:0}
        .main-detail-img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:20px;background:#f8fafc;border:1px solid #f1f5f9}
        .variant-thumbs{display:flex;gap:12px;overflow-x:auto;padding:4px;scrollbar-width:none;-ms-overflow-style:none}
        .variant-thumbs::-webkit-scrollbar{display:none}
        .v-thumb{width:56px;height:56px;border-radius:12px;object-fit:cover;cursor:pointer;
          border:2px solid transparent;transition:all .2s;flex-shrink:0;background:#f8fafc}
        .v-thumb.active{border-color:#7c3aed;transform:scale(1.05);box-shadow:0 4px 12px rgba(124,58,237,.2)}
        
        .detail-info-side{display:flex;flex-direction:column;gap:16px;min-width:0}
        .detail-category{font-size:11px;font-weight:700;color:#7c3aed;text-transform:uppercase;letter-spacing:1.5px}
        .detail-name{font-size:22px;font-weight:800;color:#0f172a;letter-spacing:-1px;line-height:1.1}
        .detail-price{font-size:22px;font-weight:800;color:#10b981}
        .detail-desc{font-size:15px;color:#64748b;line-height:1.7}
        .modal-actions-container{display:flex;flex-direction:column;gap:12px;margin-top:12px}
        .modal-close-btn{position:fixed;top:12px;right:12px;width:36px;height:36px;
          border-radius:50%;background:rgba(255,255,255,0.92);backdrop-filter:blur(12px);
          display:flex;align-items:center;justify-content:center;cursor:pointer;
          border:1px solid #e2e8f0;color:#0f172a;z-index:9999;transition:all .25s ease;
          box-shadow:0 2px 8px rgba(0,0,0,.06)}
        .modal-close-btn:hover{background:#fff;transform:scale(1.1);box-shadow:0 6px 16px rgba(0,0,0,.12);
          color:#ef4444;border-color:#fecaca}

        @media (min-width: 769px) {
          .modal-overlay{padding:20px}
          .detail-modal{border-radius:24px;max-width:1100px;max-height:90vh;height:auto;box-shadow:0 25px 50px -12px rgba(0,0,0,0.25)}
          .detail-content{grid-template-columns:minmax(0, 1fr) minmax(0, 1fr);gap:48px;padding:48px}
          .v-thumb{width:70px;height:70px}
          .detail-info-side{gap:28px}
          .detail-category{font-size:12px}
          .detail-name{font-size:36px}
          .detail-price{font-size:32px}
          .modal-close-btn{position:absolute;top:16px;right:16px;width:40px;height:40px;z-index:110}
          .modal-actions-container{flex-direction:row;gap:16px}
          .description-section{padding:48px}
          .description-card-body{border-radius:20px;padding:28px;margin-bottom:32px}
          .rating-section{padding:48px}
          .seller-header-bar{padding:32px 48px;flex-direction:row;align-items:center;gap:32px}
        }
        

        @media (max-width: 768px) {
          .rating-summary{display:flex;flex-direction:column;gap:20px;padding:20px;align-items:center;text-align:center}
          .review-filters{justify-content:center;margin-bottom:0}
          
          .nav{padding:0 12px !important;height:60px !important}
          .nav-right{gap:8px !important}
          .nav-logo{display:flex !important;align-items:center !important;gap:8px !important}
          .logo-text{display:inline-block !important;font-size:16px !important;font-weight:700 !important;color:#0f172a !important}
          .about-text{display:none !important}
          .login-text-span{display:none !important}
          .login-icon-span{display:inline-flex !important;color:#fff}
          .login-btn{width:36px !important;height:36px !important;padding:0 !important;border-radius:50% !important;min-width:36px !important;background:linear-gradient(135deg,#7c3aed,#2563eb) !important;display:inline-flex !important;align-items:center !important;justify-content:center !important}
          .cart-nav-icon{width:36px !important;height:36px !important;margin-right:0 !important;display:inline-flex !important;align-items:center !important;justify-content:center !important}
          
          .buy-btn, .add-cart-btn{width:100% !important;height:48px !important}
          .spec-grid{grid-template-columns:1fr;padding:16px}
          .description-section{padding:24px 16px}
          .seller-header-bar{padding:16px;gap:20px}
          .seller-stats-grid{grid-template-columns:repeat(2, minmax(0, 1fr)) !important;gap:8px !important;width:100%}
          .seller-left-side{width:100%}
          .title{font-size:28px}
          .main{padding:24px 16px}
          .similar-products-section{padding:24px 16px !important}
          .similar-products-grid{grid-template-columns:repeat(2, 1fr) !important;gap:16px !important}
          
          .grid{grid-template-columns:repeat(2, 1fr) !important;gap:12px !important}
          .item-card-img{height:150px !important}
          .item-image-placeholder{height:150px !important}
          .item-content{padding:12px !important}
          .item-name{font-size:14px !important;margin-bottom:4px !important}
          .item-desc{display:none !important}
          .item-seller{display:none !important}
          .item-price{font-size:15px !important}
          .item-footer{padding-top:8px !important}
          .item-footer > div{flex-direction:column !important;gap:6px !important}
          .item-footer .add-cart-btn, .item-footer .buy-btn{width:100% !important;padding:6px 8px !important;font-size:11px !important;height:32px !important}
          
          .modal-actions-container {
            position: fixed !important;
            bottom: 0 !important;
            left: 0 !important;
            right: 0 !important;
            background: #fff !important;
            padding: 12px 16px !important;
            border-top: 1px solid #e2e8f0 !important;
            margin-top: 0 !important;
            z-index: 1000 !important;
            flex-direction: row !important;
            gap: 12px !important;
            box-shadow: 0 -8px 24px rgba(0,0,0,0.06) !important;
          }
          .modal-actions-container .buy-btn, .modal-actions-container .add-cart-btn {
            height: 46px !important;
            font-size: 13px !important;
            margin: 0 !important;
            flex: 1 !important;
          }
          .detail-modal {
            padding-bottom: 80px !important;
          }
          .back-to-top {
            bottom: 90px !important;
          }
        }
        @media (max-width: 500px) {
          .item-meta-row{flex-direction:column !important;align-items:flex-start !important;gap:6px !important}
          .item-stock-row{flex-direction:column !important;align-items:flex-start !important;gap:4px !important}
          .v-thumb{width:56px !important;height:56px !important}
          .title{font-size:24px !important}
          .grid{grid-template-columns:repeat(2, 1fr) !important;gap:10px !important}
          .main{padding:16px 12px !important}
          .item-card-img{height:130px !important}
          .item-image-placeholder{height:130px !important}
          .item-name{font-size:13px !important}
        }
        @media (max-width: 400px) {
          .grid{grid-template-columns:repeat(2, 1fr) !important;gap:8px !important}
          .main{padding:12px 10px !important}
          .item-card-img{height:110px !important}
          .item-image-placeholder{height:110px !important}
          .item-content{padding:8px !important}
          .item-name{font-size:12px !important}
          .item-price{font-size:13px !important}
          .title{font-size:22px !important}
          .subtitle{font-size:14px !important}
          .detail-name{font-size:18px !important}
          .detail-price{font-size:18px !important}
          .detail-content{padding:10px !important;gap:14px !important}
          .main-detail-img{max-height:220px !important;aspect-ratio:unset !important}
          .size-btn{padding:5px 8px !important;font-size:11px !important}
        }
        @media (max-width: 320px) {
          .grid{grid-template-columns:1fr !important}
          .main{padding:10px 8px !important}
          .item-card-img{height:160px !important}
          .item-image-placeholder{height:160px !important}
          .item-name{font-size:14px !important}
          .title{font-size:20px !important}
          .nav{padding:0 6px !important}
          .main-detail-img{max-height:180px !important;aspect-ratio:unset !important}
        }
        
        .similar-products-section{border-top:1px solid #f1f5f9;padding:48px;background:#fff}
        .similar-products-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:24px;justify-content:start}
        .variant-section-label{font-size:13px;font-weight:700;color:#0f172a;margin-bottom:12px;display:block}
        .size-grid{display:flex;gap:10px;flex-wrap:wrap}
        .size-btn{padding:6px 12px;border:1px solid #e2e8f0;border-radius:4px;background:#fff;
          color:#0f172a;font-size:13px;font-weight:500;cursor:pointer;transition:all .2s;
          display:flex;align-items:center;gap:8px;min-width:fit-content;position:relative;overflow:hidden}
        .size-btn:hover{border-color:#7c3aed;color:#7c3aed}
        .size-btn.active{border-color:#7c3aed;color:#7c3aed;background:#fff}
        .size-btn.active::after{content:'';position:absolute;bottom:0;right:0;width:14px;height:14px;
          background:#7c3aed;clip-path:polygon(100% 0, 100% 100%, 0% 100%);display:flex;align-items:flex-end;justify-content:flex-end}
        .variant-btn-img{width:24px;height:24px;object-fit:cover;border-radius:2px;border:1px solid #f1f5f9}
        
        .spec-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;background:#f8fafc;padding:24px;border-radius:20px;border:1px solid #f1f5f9}
        .spec-item{display:flex;flex-direction:column;gap:4px}
        .spec-label{font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase}
        .spec-val{font-size:14px;color:#334155;font-weight:600}
        
        .description-section{border-top:1px solid #f1f5f9;padding:24px 16px;background:#fff}
        .description-header {
          margin-bottom: 24px;
        }
        .description-header-divider {
          width: 64px;
          height: 4px;
          background: linear-gradient(135deg, #7c3aed, #4f46e5);
          border-radius: 2px;
          margin-top: 4px;
        }
        .description-card-body {
          background: #f8fafc;
          border-radius: 16px;
          padding: 16px;
          border: 1px solid #f1f5f9;
          box-shadow: 0 4px 20px rgba(0,0,0,0.01);
          margin-bottom: 24px;
        }
        .detail-desc-premium {
          white-space: pre-wrap;
          color: #334155;
          font-size: 15px;
          line-height: 1.8;
          margin: 0;
          font-family: 'Inter', sans-serif;
        }
        .description-images-gallery {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 16px;
          width: 100%;
        }
        .desc-image-card {
          position: relative;
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.03);
          background: #f8fafc;
          aspect-ratio: 16/10;
          cursor: pointer;
          transition: all 0.25s ease;
        }
        .desc-image-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 24px -4px rgba(15, 23, 42, 0.08);
          border-color: #cbd5e1;
        }
        .desc-image-badge {
          position: absolute;
          top: 10px;
          left: 10px;
          background: rgba(15, 23, 42, 0.75);
          backdrop-filter: blur(6px);
          color: #fff;
          font-size: 10px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 20px;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          z-index: 2;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .desc-gallery-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          transition: transform 0.3s ease;
        }
        .desc-image-card:hover .desc-gallery-img {
          transform: scale(1.03);
        }
        .desc-zoom-overlay {
          position: absolute;
          inset: 0;
          background: rgba(15, 23, 42, 0.35);
          backdrop-filter: blur(2px);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.2s ease;
          z-index: 3;
          color: #fff;
          font-size: 12px;
          font-weight: 700;
          gap: 6px;
        }
        .desc-image-card:hover .desc-zoom-overlay {
          opacity: 1;
        }
        .rating-section{border-top:1px solid #f1f5f9;padding:24px 16px;background:#fff}
        .reviews-scroll-container{
          max-height:420px;
          overflow-y:auto;
          padding: 16px 20px;
          background: #f8fafc;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);
        }
        .reviews-scroll-container::-webkit-scrollbar{width:6px}
        .reviews-scroll-container::-webkit-scrollbar-track{background:transparent}
        .reviews-scroll-container::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:3px;transition:background .2s}
        .reviews-scroll-container::-webkit-scrollbar-thumb:hover{background:#94a3b8}
        .rating-header-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:24px}
        .rating-summary{display:flex;align-items:center;gap:28px;background:#f8fafc;padding:20px 24px;border-radius:18px;border:1px solid #e2e8f0;margin-bottom:24px;flex-wrap:wrap}
        .big-rating{font-size:38px;font-weight:800;color:#7c3aed;line-height:1}
        .rating-stars-col{display:flex;flex-direction:column;gap:4px}
        .stars{display:flex;gap:3px;color:#f59e0b}
        
        .review-filters{display:flex;gap:8px;flex-wrap:wrap}
        .rev-filter{padding:7px 14px;border-radius:20px;border:1px solid #e2e8f0;font-size:12px;font-weight:600;color:#64748b;cursor:pointer;background:#fff;transition:all .2s ease}
        .rev-filter:hover{border-color:#cbd5e1;color:#0f172a}
        .rev-filter.active{background:#7c3aed;color:#fff;border-color:#7c3aed;box-shadow:0 2px 8px rgba(124,58,237,0.2)}
        
        .review-card{padding:16px 0;border-bottom:1px solid #e2e8f0}
        .review-card:last-child{border-bottom:none}
        .review-user{display:flex;align-items:center;gap:10px;margin-bottom:6px}
        .u-avatar{width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,#e2e8f0,#cbd5e1);
          display:flex;align-items:center;justify-content:center;font-weight:700;color:#64748b;font-size:12px}
        .u-info{display:flex;flex-direction:column;gap:2px}
        .u-name{font-size:13px;font-weight:700;color:#0f172a}
        .r-date{font-size:11px;color:#94a3b8}
        .r-text{font-size:14px;color:#334155;line-height:1.6;margin:6px 0}
        .r-variation{font-size:11px;color:#94a3b8;margin-bottom:8px;display:block}
        .r-images{display:flex;gap:8px;flex-wrap:wrap}
        .r-img{width:70px;height:70px;border-radius:8px;object-fit:cover;cursor:pointer;border:1px solid #e2e8f0}
        
        .back-to-top{position:fixed;bottom:32px;right:32px;width:50px;height:50px;
          border-radius:50%;background:#0f172a;color:#fff;display:flex;align-items:center;
          justify-content:center;cursor:pointer;border:none;box-shadow:0 8px 24px rgba(0,0,0,.15);
          transition:all .3s ease;z-index:1000;opacity:0;visibility:hidden;transform:translateY(20px)}
        .back-to-top.visible{opacity:1;visibility:visible;transform:translateY(0)}
        .back-to-top:hover{transform:translateY(-4px);background:#1e293b;box-shadow:0 12px 30px rgba(0,0,0,.2)}
 

        .seller-header-bar{background:#f8fafc;border-top:1px solid #f1f5f9;border-bottom:1px solid #f1f5f9;padding:20px 24px;display:flex;align-items:center;justify-content:space-between;gap:24px;flex-wrap:wrap}
        @media (max-width: 950px) { .seller-header-bar{padding:20px 16px;flex-direction:column;align-items:flex-start} }
        .seller-left-side{display:flex;align-items:center;gap:16px;flex-wrap:wrap}
        .seller-avatar-wrapper{position:relative}
        .seller-main-avatar{width:64px;height:64px;border-radius:50%;object-fit:cover;background:#f1f5f9;border:2px solid #e2e8f0;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;color:#64748b}
        .seller-mall-badge{position:absolute;bottom:-4px;left:50%;transform:translateX(-50%);background:#7c3aed;color:#fff;font-size:9px;font-weight:700;padding:2px 7px;border-radius:10px;border:1.5px solid #fff;white-space:nowrap;box-shadow:0 2px 4px rgba(0,0,0,.1)}
        .seller-info-col{display:flex;flex-direction:column;gap:3px}
        .seller-title-name{font-size:16px;font-weight:700;color:#0f172a;display:flex;align-items:center;gap:6px;margin:0}
        .seller-active-status{font-size:12px;color:#64748b;margin-bottom:6px}
        .seller-actions-row{display:flex;gap:8px;flex-wrap:wrap}
        .seller-btn-chat{padding:7px 14px;background:#f3e8ff;border:1px solid #7c3aed;color:#7c3aed;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px;transition:all .2s}
        .seller-btn-chat:hover{background:#e9d5ff;transform:translateY(-1px)}
        .seller-btn-shop{padding:7px 14px;background:#fff;border:1px solid #cbd5e1;color:#475569;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px;transition:all .2s}
        .seller-stats-grid{display:grid;grid-template-columns:repeat(3, minmax(0, 1fr));gap:8px;flex-grow:1;max-width:520px}
        @media (max-width: 650px) {
          .seller-stats-grid{grid-template-columns:repeat(2, minmax(0, 1fr));gap:8px}
        }
        .seller-stat-box{
          display:flex;
          flex-direction:column;
          align-items:center;
          justify-content:center;
          text-align:center;
          padding:8px 6px;
          background:#fff;
          border:1px solid #e2e8f0;
          border-radius:10px;
          gap:2px;
          transition:all .2s;
          box-shadow: 0 1px 2px rgba(0,0,0,0.02);
        }
        .seller-stat-box:hover{
          background:#f8fafc;
          border-color:#cbd5e1;
        }
        .seller-stat-label{font-size:10px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.3px}
        .seller-stat-val{font-size:13px;font-weight:700;color:#7c3aed}
        .seller-stat-val.dark{color:#0f172a}

        /* E-COMMERCE STOREFRONT UPGRADE STYLES */
        .ecommerce-hero-section {
          margin-bottom: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .hero-banner-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
        }
        @media (min-width: 960px) {
          .hero-banner-grid {
            grid-template-columns: 2.2fr 1fr;
            gap: 18px;
          }
        }
        .main-carousel-card {
          position: relative;
          border-radius: 24px;
          overflow: hidden;
          min-height: 310px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 36px 36px 24px;
          box-shadow: 0 16px 36px rgba(0,0,0,0.12);
          transition: all 0.3s ease;
        }
        @media (max-width: 640px) {
          .main-carousel-card {
            padding: 24px 20px 20px;
            min-height: 280px;
          }
        }
        .carousel-arrow {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.25);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255,255,255,0.4);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 20px;
          font-weight: 700;
          transition: all 0.2s;
          z-index: 10;
        }
        .carousel-arrow:hover {
          background: rgba(255, 255, 255, 0.45);
          transform: translateY(-50%) scale(1.08);
        }
        .carousel-arrow.prev { left: 12px; }
        .carousel-arrow.next { right: 12px; }
        
        .carousel-dots {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .carousel-dot {
          height: 8px;
          border-radius: 4px;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          cursor: pointer;
          border: none;
          background: rgba(255, 255, 255, 0.4);
          width: 8px;
        }
        .carousel-dot.active {
          width: 26px;
          background: #fff;
          box-shadow: 0 0 10px rgba(255,255,255,0.8);
        }

        .side-promos-container {
          display: flex;
          flex-direction: column;
          gap: 14px;
          justify-content: space-between;
        }
        @media (max-width: 959px) {
          .side-promos-container {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
          }
        }
        @media (max-width: 580px) {
          .side-promos-container {
            grid-template-columns: 1fr;
          }
        }
        .side-promo-card {
          border-radius: 20px;
          padding: 18px 20px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          transition: all 0.2s;
          box-shadow: 0 4px 16px rgba(0,0,0,0.03);
          flex: 1;
        }
        .side-promo-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 22px rgba(0,0,0,0.06);
        }

        /* 5-PILLAR TRUST BAR */
        .trust-props-bar {
          background: #fff;
          border-radius: 20px;
          padding: 14px 18px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 20px rgba(0,0,0,0.02);
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 12px;
        }
        @media (max-width: 1024px) {
          .trust-props-bar {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }
        @media (max-width: 680px) {
          .trust-props-bar {
            display: flex;
            overflow-x: auto;
            gap: 12px;
            padding-bottom: 12px;
            scrollbar-width: none;
          }
          .trust-prop-item {
            min-width: 180px;
            flex-shrink: 0;
          }
        }
        .trust-prop-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 4px 6px;
        }

        /* SEARCH & DELIVERY HEADER */
        .marketplace-search-box {
          background: #fff;
          border-radius: 24px;
          padding: 18px 22px;
          border: 1.5px solid #e2e8f0;
          box-shadow: 0 8px 28px rgba(124,58,237,0.04);
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        /* VISUAL CATEGORY TILES */
        .category-tiles-container {
          display: flex;
          gap: 12px;
          overflow-x: auto;
          padding: 6px 4px 14px;
          scrollbar-width: thin;
          scrollbar-color: #cbd5e1 transparent;
          -webkit-overflow-scrolling: touch;
          user-select: none;
          scroll-behavior: smooth;
        }
        .category-tiles-container::-webkit-scrollbar {
          height: 6px;
        }
        .category-tiles-container::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 4px;
        }
        .category-tiles-container::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        .category-tiles-container::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        .cat-scroll-arrow {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: #fff;
          border: 1.5px solid #e2e8f0;
          box-shadow: 0 4px 14px rgba(0,0,0,0.12);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10;
          color: #0f172a;
          font-size: 22px;
          font-weight: 800;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .cat-scroll-arrow:hover {
          background: #7c3aed;
          color: #fff;
          border-color: #7c3aed;
          transform: translateY(-50%) scale(1.1);
          box-shadow: 0 6px 18px rgba(124,58,237,0.3);
        }
        @media (max-width: 768px) {
          .cat-scroll-arrow {
            display: none !important;
          }
          .category-tiles-container::-webkit-scrollbar {
            display: none;
          }
        }
        .category-tile-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-width: 90px;
          padding: 14px 10px 12px;
          background: #fff;
          border: 1.5px solid #e2e8f0;
          border-radius: 18px;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 2px 8px rgba(0,0,0,0.02);
          text-align: center;
          flex-shrink: 0;
          gap: 6px;
        }
        .category-tile-btn:hover {
          transform: translateY(-3px);
          border-color: #7c3aed;
          box-shadow: 0 8px 20px rgba(124,58,237,0.12);
        }
        .category-tile-btn.active {
          background: linear-gradient(135deg, #7c3aed, #6366f1);
          border-color: #7c3aed;
          color: #fff;
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(124,58,237,0.25);
        }

        /* FLASH DEALS SECTION */
        .flash-deals-banner {
          background: linear-gradient(135deg, #fff5f5 0%, #fff 50%, #fef2f2 100%);
          border-radius: 24px;
          padding: 22px;
          border: 1.5px solid #fecaca;
          margin-bottom: 28px;
          display: flex;
          flex-direction: column;
          gap: 18px;
          scroll-margin-top: 100px;
        }
        .flash-clock-box {
          background: #1e1b4b;
          color: #fff;
          font-weight: 800;
          font-size: 14px;
          padding: 4px 8px;
          border-radius: 6px;
          letter-spacing: 0.5px;
          display: inline-block;
          min-width: 30px;
          text-align: center;
        }
        .flash-items-slider {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
        }
        @media (max-width: 900px) {
          .flash-items-slider {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        @media (max-width: 500px) {
          .flash-items-slider {
            display: flex;
            overflow-x: auto;
            gap: 12px;
            padding-bottom: 6px;
            scrollbar-width: none;
          }
          .flash-card-box {
            min-width: 190px;
            flex-shrink: 0;
          }
        }
      `}</style>

      <div className="root">
        <nav className="nav">
          <Link href="/" className="nav-logo">
            <svg width="30" height="30" viewBox="0 0 200 260" xmlns="http://www.w3.org/2000/svg">
              <rect x="8" y="68" width="184" height="176" rx="24" fill="none" stroke="#7c3aed" strokeWidth="14"/>
              <path d="M56 70 Q56 18 100 18 Q144 18 144 70" fill="none" stroke="#7c3aed" strokeWidth="14" strokeLinecap="round"/>
              <circle cx="68" cy="70" r="7" fill="#7c3aed"/>
              <circle cx="132" cy="70" r="7" fill="#7c3aed"/>
              <path d="M24 192 Q36 150 70 145 Q104 140 110 170 Q116 198 150 192 Q170 187 176 162"
                fill="none" stroke="#FFD166" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M161 145 L176 162 L157 175" fill="none" stroke="#FFD166" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="logo-text">Shopply</span>
          </Link>
          <div className="nav-right">
            <Link href="/about" className="nav-link"><span className="about-text">About</span></Link>
            <Link href="/cart" className="cart-nav-icon">
              <IconCart />
              {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
            </Link>
            <Link href="/dashboard" className="login-btn" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <span className="login-text-span">Dashboard</span>
              <span className="login-icon-span" style={{ display: 'none', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
            </Link>
          </div>
        </nav>

        <main className="main" id="shop-catalog">
          {/* 1. HERO PROMOTIONAL CAMPAIGN CAROUSEL & DESKTOP SIDE BANNERS */}
          <section className="ecommerce-hero-section">
            <div className="hero-banner-grid">
              {/* Main Banner Slider */}
              <div 
                className="main-carousel-card"
                onMouseEnter={() => setIsBannerHovered(true)}
                onMouseLeave={() => setIsBannerHovered(false)}
                style={{
                  background: BANNERS[currentBannerIdx].gradient,
                  position: 'relative'
                }}
              >
                {/* Background lighting blobs */}
                <div style={{ position: 'absolute', top: '-30%', right: '-15%', width: 280, height: 280, borderRadius: '50%', background: 'rgba(255,255,255,0.18)', filter: 'blur(50px)', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', bottom: '-30%', left: '-10%', width: 260, height: 260, borderRadius: '50%', background: 'rgba(0,0,0,0.2)', filter: 'blur(40px)', pointerEvents: 'none' }} />

                {/* Left Arrow */}
                <button
                  type="button"
                  aria-label="Previous Slide"
                  className="carousel-arrow prev"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentBannerIdx(prev => (prev - 1 + BANNERS.length) % BANNERS.length);
                  }}
                >
                  ‹
                </button>

                {/* Right Arrow */}
                <button
                  type="button"
                  aria-label="Next Slide"
                  className="carousel-arrow next"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentBannerIdx(prev => (prev + 1) % BANNERS.length);
                  }}
                >
                  ›
                </button>

                {/* Slide Content */}
                <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      background: BANNERS[currentBannerIdx].badgeBg,
                      color: '#fff',
                      fontSize: 11,
                      fontWeight: 800,
                      padding: '4px 12px',
                      borderRadius: 20,
                      letterSpacing: '0.4px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                    }}>
                      {BANNERS[currentBannerIdx].badge}
                    </span>
                    <span style={{
                      background: 'rgba(255,255,255,0.22)',
                      backdropFilter: 'blur(6px)',
                      color: '#fff',
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '4px 10px',
                      borderRadius: 14,
                      border: '1px solid rgba(255,255,255,0.3)'
                    }}>
                      {BANNERS[currentBannerIdx].tag}
                    </span>
                  </div>

                  <h1 style={{
                    fontSize: isMobile ? 22 : 32,
                    fontWeight: 900,
                    color: '#fff',
                    lineHeight: 1.15,
                    margin: 0,
                    letterSpacing: '-0.5px',
                    textShadow: '0 2px 10px rgba(0,0,0,0.2)'
                  }}>
                    {BANNERS[currentBannerIdx].title}
                  </h1>

                  <p style={{
                    fontSize: isMobile ? 13 : 14,
                    color: '#f8fafc',
                    maxWidth: 580,
                    margin: 0,
                    lineHeight: 1.5,
                    opacity: 0.95
                  }}>
                    {BANNERS[currentBannerIdx].subtitle}
                  </p>

                  {/* Vouchers & Badges Bar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
                    <button
                      type="button"
                      onClick={() => {
                        const code = BANNERS[currentBannerIdx].voucherCode;
                        if (typeof navigator !== 'undefined' && navigator.clipboard) {
                          navigator.clipboard.writeText(code);
                        }
                        if (typeof window !== 'undefined') {
                          localStorage.setItem('claimed_voucher', code);
                        }
                        setCopiedVoucher(code);
                        setTimeout(() => setCopiedVoucher(null), 3000);
                      }}
                      style={{
                        background: 'rgba(255,255,255,0.95)',
                        border: 'none',
                        color: '#0f172a',
                        fontSize: 12,
                        fontWeight: 800,
                        padding: '6px 14px',
                        borderRadius: 10,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        transition: 'all 0.2s'
                      }}
                    >
                      <span>🎟️ {copiedVoucher === BANNERS[currentBannerIdx].voucherCode ? 'CLAIMED! ✓' : BANNERS[currentBannerIdx].voucher}</span>
                      <span style={{
                        fontSize: 10,
                        color: copiedVoucher === BANNERS[currentBannerIdx].voucherCode ? '#16a34a' : '#7c3aed',
                        background: copiedVoucher === BANNERS[currentBannerIdx].voucherCode ? '#dcfce7' : '#f3e8ff',
                        padding: '2px 8px',
                        borderRadius: 6,
                        fontWeight: 800
                      }}>
                        {copiedVoucher === BANNERS[currentBannerIdx].voucherCode ? 'Saved to Cart' : 'Claim Voucher'}
                      </span>
                    </button>

                    <div style={{
                      background: 'rgba(255,255,255,0.18)',
                      backdropFilter: 'blur(6px)',
                      color: '#fff',
                      fontSize: 12,
                      fontWeight: 700,
                      padding: '6px 12px',
                      borderRadius: 10,
                      border: '1px solid rgba(255,255,255,0.25)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6
                    }}>
                      <span>🚚 {BANNERS[currentBannerIdx].shipping}</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Row: CTA & Dots */}
                <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginTop: 18, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <a
                      href={currentBannerIdx === 2 ? "#flash-deals-anchor" : "#catalog-products"}
                      onClick={(e) => {
                        e.preventDefault();
                        const targetId = currentBannerIdx === 2 ? "flash-deals-anchor" : "catalog-products";
                        const el = document.getElementById(targetId);
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                      }}
                      style={{
                        padding: '10px 22px',
                        borderRadius: 12,
                        background: '#fff',
                        color: '#0f172a',
                        fontWeight: 800,
                        fontSize: 13,
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
                        transition: 'transform 0.2s',
                        cursor: 'pointer'
                      }}
                    >
                      {BANNERS[currentBannerIdx].primaryBtn}
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        const targetId = currentBannerIdx === 1 ? "catalog-products" : "flash-deals-anchor";
                        const el = document.getElementById(targetId);
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                      }}
                      style={{
                        padding: '10px 18px',
                        borderRadius: 12,
                        background: 'rgba(255,255,255,0.15)',
                        backdropFilter: 'blur(8px)',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: 13,
                        border: '1px solid rgba(255,255,255,0.35)',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      {BANNERS[currentBannerIdx].secondaryBtn}
                    </button>
                  </div>

                  {/* Dot Indicators */}
                  <div className="carousel-dots">
                    {BANNERS.map((_, idx) => (
                      <button
                        key={idx}
                        type="button"
                        aria-label={`Go to slide ${idx + 1}`}
                        className={`carousel-dot ${currentBannerIdx === idx ? 'active' : ''}`}
                        onClick={() => setCurrentBannerIdx(idx)}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Side Promo Stack (Desktop) */}
              <div className="side-promos-container">
                {/* Promo Card 1: Dynamic Voucher from Firestore or Empty State */}
                {activeVoucher ? (
                  <div className="side-promo-card" style={{ background: 'linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)', border: '1.5px solid #fecdd3' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 800, background: '#ef4444', color: '#fff', padding: '3px 9px', borderRadius: 12, letterSpacing: '0.3px' }}>
                          {activeVoucher.badge || "🎁 PROMO PACK"}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#e11d48' }}>
                          {activeVoucher.discount_type === 'percent' ? `${activeVoucher.discount_value || activeVoucher.discount}% OFF` : `₱${activeVoucher.discount_value || 100} OFF`}
                        </span>
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#9f1239', lineHeight: 1.25 }}>
                        {activeVoucher.title || "Welcome Voucher"}
                      </div>
                      <p style={{ fontSize: 12, color: '#881337', margin: '4px 0 0', opacity: 0.85 }}>
                        {activeVoucher.description || "Enjoy discount on your first marketplace checkout!"}
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 10, borderTop: '1px dashed #fecdd3' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', background: '#fff', padding: '4px 8px', borderRadius: 6, border: '1px solid #fda4af', fontFamily: 'monospace' }}>
                        {activeVoucher.code}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (typeof navigator !== 'undefined' && navigator.clipboard) {
                            navigator.clipboard.writeText(activeVoucher.code);
                          }
                          if (typeof window !== 'undefined') {
                            localStorage.setItem('claimed_voucher', activeVoucher.code);
                          }
                          setCopiedVoucher(activeVoucher.code);
                          setTimeout(() => setCopiedVoucher(null), 2500);
                        }}
                        style={{ background: '#e11d48', color: '#fff', border: 'none', borderRadius: 8, padding: '5px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                      >
                        {copiedVoucher === activeVoucher.code ? "Claimed! ✓" : "Claim Code"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="side-promo-card" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', border: '1.5px dashed #cbd5e1' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, background: '#64748b', color: '#fff', padding: '3px 9px', borderRadius: 12, letterSpacing: '0.3px' }}>
                          🏷️ VOUCHERS
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b' }}>Check Back Soon</span>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#334155', lineHeight: 1.25 }}>
                        No Active Promo Vouchers
                      </div>
                      <p style={{ fontSize: 11.5, color: '#64748b', margin: '4px 0 0', opacity: 0.85 }}>
                        Stay tuned! New promo discount vouchers will appear here when released by admin.
                      </p>
                    </div>
                  </div>
                )}

                {/* Promo Card 2: Shopply Express Guarantee */}
                <div className="side-promo-card" style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', border: '1.5px solid #bbf7d0' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 800, background: '#10b981', color: '#fff', padding: '3px 9px', borderRadius: 12, letterSpacing: '0.3px' }}>
                        ⚡ SPX EXPRESS
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#059669' }}>Fast Local</span>
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#065f46', lineHeight: 1.25 }}>
                      24-48h Fast Dispatch
                    </div>
                    <p style={{ fontSize: 12, color: '#047857', margin: '4px 0 0', opacity: 0.85 }}>
                      Real-time live courier tracking with Shopply SPX rider.
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 10, borderTop: '1px dashed #bbf7d0' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#065f46' }}>COD Available</span>
                    <Link
                      href="/dashboard?tab=orders"
                      style={{ background: '#059669', color: '#fff', border: 'none', borderRadius: 8, padding: '5px 12px', fontSize: 11, fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                    >
                      <span>Track 📦</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 2. FIVE-PILLAR MARKETPLACE VALUE PROPOSITIONS (TRUST BAR) */}
          <section style={{ marginBottom: 24 }}>
            <div className="trust-props-bar">
              <div className="trust-prop-item">
                <div style={{ width: 40, height: 40, borderRadius: 12, background: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                  🚚
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>Free Shipping</div>
                  <div style={{ fontSize: 11, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>₱0 Min. spend vouchers</div>
                </div>
              </div>

              <div className="trust-prop-item">
                <div style={{ width: 40, height: 40, borderRadius: 12, background: '#faf5ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                  🛡️
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>Buyer Protection</div>
                  <div style={{ fontSize: 11, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>100% Money-back guarantee</div>
                </div>
              </div>

              <div className="trust-prop-item">
                <div style={{ width: 40, height: 40, borderRadius: 12, background: '#fefce8', color: '#ca8a04', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                  💵
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>Cash on Delivery</div>
                  <div style={{ fontSize: 11, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Inspect parcel before paying</div>
                </div>
              </div>

              <div className="trust-prop-item">
                <div style={{ width: 40, height: 40, borderRadius: 12, background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                  ⚡
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>24h Dispatch</div>
                  <div style={{ fontSize: 11, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Shopply Express SPX</div>
                </div>
              </div>

              <div className="trust-prop-item">
                <div style={{ width: 40, height: 40, borderRadius: 12, background: '#fdf2f8', color: '#db2777', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                  🔄
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>7-Day Returns</div>
                  <div style={{ fontSize: 11, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Hassle-free refund policy</div>
                </div>
              </div>
            </div>
          </section>

          {/* 3. SEARCH, LOCATION PIN & TRENDING KEYWORDS */}
          <section style={{ marginBottom: 28 }}>
            <div className="marketplace-search-box">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                {/* Delivery Location Chip */}
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  background: '#f8fafc',
                  border: '1.5px solid #e2e8f0',
                  padding: '7px 14px',
                  borderRadius: 20,
                  fontSize: 13,
                  color: '#334155'
                }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 700, color: '#7c3aed' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="#ef4444"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                    Deliver to:
                  </span>
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>
                    {buyerLocation || (detectingBuyerLoc ? "Detecting location..." : "Philippines")}
                  </span>
                  <button 
                    type="button"
                    onClick={detectBuyerLocation}
                    disabled={detectingBuyerLoc}
                    style={{
                      background: '#f3e8ff',
                      border: '1px solid #d8b4fe',
                      color: '#7c3aed',
                      fontWeight: 700,
                      fontSize: 11,
                      borderRadius: 12,
                      padding: '2px 8px',
                      cursor: detectingBuyerLoc ? 'wait' : 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 3
                    }}
                  >
                    {detectingBuyerLoc ? "..." : (buyerLocation ? "Refresh" : "Detect")}
                  </button>
                </div>

                {/* Primary Marketplace Search Bar */}
                <div style={{
                  position: 'relative',
                  flex: 1,
                  minWidth: 280,
                  height: 48,
                  borderRadius: 24,
                  background: '#f8fafc',
                  border: '1.5px solid #e2e8f0',
                  padding: '0 6px 0 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  transition: 'all 0.2s'
                }}>
                  <svg width="18" height="18" fill="none" stroke="#64748b" strokeWidth="2.5" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                    <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                  </svg>
                  <input
                    type="text"
                    placeholder="Search electronics, footwear, apparel, gadgets, brands..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{
                      border: 'none',
                      outline: 'none',
                      background: 'transparent',
                      width: '100%',
                      fontSize: 14,
                      color: '#0f172a',
                      fontFamily: 'Inter, sans-serif'
                    }}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      style={{
                        background: '#e2e8f0',
                        border: 'none',
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#64748b',
                        fontSize: 11,
                        cursor: 'pointer',
                        flexShrink: 0
                      }}
                    >
                      ✕
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      const el = document.getElementById("catalog-products");
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    style={{
                      background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                      color: '#fff',
                      border: 'none',
                      padding: '8px 20px',
                      borderRadius: 20,
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: 'pointer',
                      flexShrink: 0,
                      boxShadow: '0 2px 8px rgba(124,58,237,0.3)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    <span>Search</span>
                  </button>
                </div>
              </div>

              {/* Trending Searches Row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', paddingTop: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#7c3aed', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>🔥 Trending:</span>
                </span>
                {TRENDING_KEYWORDS.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      setSearchQuery(tag);
                      const el = document.getElementById("catalog-products");
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    style={{
                      padding: '4px 12px',
                      borderRadius: 16,
                      fontSize: 12,
                      fontWeight: 600,
                      background: searchQuery === tag ? '#f3e8ff' : '#f1f5f9',
                      color: searchQuery === tag ? '#7c3aed' : '#475569',
                      border: searchQuery === tag ? '1px solid #d8b4fe' : '1px solid transparent',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* 4. CURATED VISUAL CATEGORY GRID (Shopee / Lazada Category Bar) */}
          <section style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#7c3aed' }}>📂</span> Categories
              </h2>
              {selectedCategory !== "All" && (
                <button
                  type="button"
                  onClick={() => setSelectedCategory("All")}
                  style={{ fontSize: 12, fontWeight: 700, color: '#7c3aed', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  View All Items →
                </button>
              )}
            </div>

            <div style={{ position: 'relative', width: '100%' }}>
              {/* PC Navigation Left Scroll Arrow */}
              <button
                type="button"
                aria-label="Scroll Categories Left"
                className="cat-scroll-arrow"
                style={{ left: -14 }}
                onClick={() => {
                  if (categoryScrollRef.current) {
                    categoryScrollRef.current.scrollBy({ left: -260, behavior: 'smooth' });
                  }
                }}
              >
                ‹
              </button>

              {/* PC Navigation Right Scroll Arrow */}
              <button
                type="button"
                aria-label="Scroll Categories Right"
                className="cat-scroll-arrow"
                style={{ right: -14 }}
                onClick={() => {
                  if (categoryScrollRef.current) {
                    categoryScrollRef.current.scrollBy({ left: 260, behavior: 'smooth' });
                  }
                }}
              >
                ›
              </button>

              <div
                ref={categoryScrollRef}
                className="category-tiles-container"
                onMouseDown={handleCategoryMouseDown}
                onMouseMove={handleCategoryMouseMove}
                onMouseUp={handleCategoryMouseUp}
                onMouseLeave={handleCategoryMouseUp}
                onWheel={(e) => {
                  if (e.deltaY !== 0) {
                    e.currentTarget.scrollLeft += e.deltaY;
                  }
                }}
              >
                {CURATED_CATEGORIES.map(cat => {
                  const isActive = selectedCategory === cat.id;
                  const count = cat.id === "All" 
                    ? items.length 
                    : items.filter(i => matchesCategoryItem(i, cat.id)).length;

                  return (
                    <button
                      key={cat.id}
                      type="button"
                      className={`category-tile-btn ${isActive ? 'active' : ''}`}
                      onClick={() => {
                        if (hasCategoryMovedRef.current) return;
                        handleSelectCategory(cat.id);
                      }}
                    >
                      <div style={{
                        width: 44,
                        height: 44,
                        borderRadius: 14,
                        background: isActive ? 'rgba(255,255,255,0.22)' : `${cat.color}15`,
                        color: isActive ? '#fff' : cat.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 22,
                        transition: 'all 0.2s'
                      }}>
                        {cat.icon}
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: isActive ? '#fff' : '#0f172a', whiteSpace: 'nowrap' }}>
                        {cat.label}
                      </span>
                      <span style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '1px 6px',
                        borderRadius: 8,
                        background: isActive ? 'rgba(255,255,255,0.25)' : '#f1f5f9',
                        color: isActive ? '#fff' : '#64748b'
                      }}>
                        {count}
                      </span>
                    </button>
                  );
                })}

                {/* Dynamic Categories from Sellers that are not in curated list */}
                {Array.from(new Set(items.map(i => i.category).filter(Boolean))).map(sellerCat => {
                  const sCat = sellerCat as string;
                  if (CURATED_CATEGORIES.some(c => c.id.toLowerCase() === sCat.toLowerCase() || c.label.toLowerCase() === sCat.toLowerCase())) {
                    return null;
                  }
                  const isActive = selectedCategory.toLowerCase() === sCat.toLowerCase();
                  const count = items.filter(i => matchesCategoryItem(i, sCat)).length;
                  return (
                    <button
                      key={sCat}
                      type="button"
                      className={`category-tile-btn ${isActive ? 'active' : ''}`}
                      onClick={() => {
                        if (hasCategoryMovedRef.current) return;
                        handleSelectCategory(sCat);
                      }}
                    >
                      <div style={{
                        width: 44,
                        height: 44,
                        borderRadius: 14,
                        background: isActive ? 'rgba(255,255,255,0.22)' : '#f3e8ff',
                        color: isActive ? '#fff' : '#7c3aed',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 22
                      }}>
                        🏷️
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: isActive ? '#fff' : '#0f172a', whiteSpace: 'nowrap' }}>
                        {sCat}
                      </span>
                      <span style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '1px 6px',
                        borderRadius: 8,
                        background: isActive ? 'rgba(255,255,255,0.25)' : '#f1f5f9',
                        color: isActive ? '#fff' : '#64748b'
                      }}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* 5. FLASH DEALS LIVE TICKER & SHOWCASE - 100% REAL & ADMIN CONTROLLED */}
          {flashConfig.is_active && items.length > 0 && (() => {
            const hasEnded = flashCountdown.hours === 0 && flashCountdown.minutes === 0 && flashCountdown.seconds === 0;
            
            // ONLY display products that the Admin explicitly enrolled in Flash Deals from the Admin Panel
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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 22, color: '#f97316' }}>⚡</span>
                      <h2 style={{ fontSize: 20, fontWeight: 900, color: '#dc2626', margin: 0, letterSpacing: '-0.3px' }}>
                        FLASH DEALS
                      </h2>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#475569', fontWeight: 700 }}>
                      <span>{hasEnded ? "Status:" : "Ends in:"}</span>
                      {hasEnded ? (
                        <span style={{ background: '#fee2e2', color: '#dc2626', padding: '3px 10px', borderRadius: 6, fontWeight: 800, fontSize: 12 }}>
                          ENDED
                        </span>
                      ) : (
                        <>
                          <span className="flash-clock-box">{String(flashCountdown.hours).padStart(2, '0')}</span>
                          <span style={{ fontWeight: 800, color: '#dc2626' }}>:</span>
                          <span className="flash-clock-box">{String(flashCountdown.minutes).padStart(2, '0')}</span>
                          <span style={{ fontWeight: 800, color: '#dc2626' }}>:</span>
                          <span className="flash-clock-box">{String(flashCountdown.seconds).padStart(2, '0')}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {flashCoupon && (
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(flashCoupon.code);
                          localStorage.setItem('claimed_voucher', flashCoupon.code);
                          setCopiedVoucher(flashCoupon.code);
                          setTimeout(() => setCopiedVoucher(null), 3000);
                        }}
                        style={{
                          fontSize: 12,
                          fontWeight: 800,
                          color: '#dc2626',
                          background: '#fff',
                          border: '1.5px solid #fecaca',
                          padding: '4px 12px',
                          borderRadius: 20,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          transition: 'all 0.2s ease'
                        }}
                        title="Click to copy voucher code"
                      >
                        <span>🏷️ {flashCoupon.code}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: copiedVoucher === flashCoupon.code ? '#16a34a' : '#ef4444' }}>
                          {copiedVoucher === flashCoupon.code ? 'Copied! ✓' : (flashCoupon.discount_type === 'percent' ? `${flashCoupon.discount}% OFF` : `₱${flashCoupon.discount_value} OFF`)}
                        </span>
                      </button>
                    )}
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#ef4444', background: '#fee2e2', padding: '4px 14px', borderRadius: 20 }}>
                      {flashCoupon ? (flashCoupon.badge || `🔥 FLASH SALE ₱${flashCoupon.discount_value} OFF`) : (flashConfig.badge_text || "🔥 Up to 50% OFF Limited Time")}
                    </span>
                  </div>
                </div>

                {/* Flash Deals Slider Cards */}
                <div className="flash-items-slider">
                  {enrolledDeals.map(({ product: fItem, deal }) => {
                    const originalPrice = parseFloat(fItem.price) || 0;
                    const flashPrice = Number(deal.flash_price);
                    const discountPct = deal.discount_pct || (originalPrice > 0 ? Math.max(1, Math.round(((originalPrice - flashPrice) / originalPrice) * 100)) : 20);
                    const claimedPct = Math.min(100, Math.max(0, deal.claimed_pct || 50));
                    const stockRemaining = deal.stock !== undefined ? deal.stock : calculateTotalStock(fItem);

                    return (
                      <div
                        key={fItem.id}
                        className="flash-card-box"
                        onClick={() => handleViewItem(fItem)}
                        style={{
                          background: '#fff',
                          borderRadius: 16,
                          border: '1.5px solid #fecaca',
                          padding: 12,
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: 8,
                          maxWidth: 240,
                          width: '100%',
                          transition: 'transform 0.2s ease'
                        }}
                      >
                        <div style={{ position: 'relative', width: '100%', aspectRatio: '1/1', borderRadius: 12, overflow: 'hidden', background: '#f8fafc' }}>
                          {fItem.image ? (
                            <img
                              src={getImageUrl(fItem.image)}
                              alt={fItem.name}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1' }}>
                              <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/></svg>
                            </div>
                          )}
                          <span style={{
                            position: 'absolute',
                            top: 8,
                            left: 8,
                            background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                            color: '#fff',
                            fontSize: 10,
                            fontWeight: 900,
                            padding: '2px 7px',
                            borderRadius: 6
                          }}>
                            🔥 -{discountPct}%
                          </span>
                        </div>

                        <div>
                          <h4 style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: '0 0 4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {fItem.name}
                          </h4>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                            <span style={{ fontSize: 16, fontWeight: 900, color: '#dc2626' }}>
                              ₱{flashPrice.toFixed(2)}
                            </span>
                            {originalPrice > flashPrice && (
                              <span style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', textDecoration: 'line-through' }}>
                                ₱{originalPrice.toFixed(2)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Stock Claimed Progress Bar */}
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontWeight: 700, color: '#ef4444', marginBottom: 4 }}>
                            <span>⚡ {claimedPct}% CLAIMED</span>
                            <span style={{ color: '#64748b' }}>{stockRemaining > 0 ? `${stockRemaining} left` : 'Out'}</span>
                          </div>
                          <div style={{ height: 6, background: '#fee2e2', borderRadius: 4, overflow: 'hidden' }}>
                            <div style={{ width: `${claimedPct}%`, height: '100%', background: 'linear-gradient(90deg, #ef4444, #f97316)', borderRadius: 4 }} />
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const token = localStorage.getItem("token");
                            if (!token) {
                              setErrorMsg("Please log in to purchase Flash Deals.");
                              setTimeout(() => setErrorMsg(null), 3500);
                              return;
                            }
                            // If product has variations (multiple colors or footwear sizes), open detail modal so customer can pick
                            if ((fItem.attributes?.colors && fItem.attributes.colors.length > 1) || (isFootwearCategory(fItem.category) && fItem.attributes?.sizes && fItem.attributes.sizes.length > 0)) {
                              handleViewItem(fItem);
                              return;
                            }
                            setBuyModal({
                              item: fItem,
                              variation: fItem.attributes?.colors?.[0] || "",
                              price: String(flashPrice),
                              variantIdx: 0
                            });
                          }}
                          style={{
                            background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                            color: '#fff',
                            border: 'none',
                            padding: '10px 14px',
                            borderRadius: 10,
                            fontWeight: 800,
                            fontSize: 12,
                            cursor: 'pointer',
                            width: '100%',
                            textAlign: 'center',
                            boxShadow: '0 4px 12px rgba(220, 38, 38, 0.25)',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          ⚡ Buy Now (₱{flashPrice.toFixed(2)})
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })()}

          {/* 6. MAIN CATALOG HEADER WITH FILTER SORT CONTROLS */}
          <div id="catalog-products" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14, marginBottom: 20 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h3 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  {selectedCategory === "All" ? "All Marketplace Products" : `${selectedCategory} Collection`}
                </h3>
                {selectedCategory !== "All" && (
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: '#ede9fe',
                    color: '#7c3aed',
                    padding: '3px 10px',
                    borderRadius: 16,
                    fontSize: 12,
                    fontWeight: 700
                  }}>
                    Active: {selectedCategory}
                    <button
                      type="button"
                      onClick={() => setSelectedCategory("All")}
                      style={{ background: 'none', border: 'none', color: '#7c3aed', cursor: 'pointer', padding: 0, fontWeight: 800, fontSize: 13 }}
                      title="Clear category filter"
                    >
                      ✕
                    </button>
                  </span>
                )}
              </div>
              <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>
                Showing <strong>{filteredItems.length}</strong> verified items from local sellers
              </p>
            </div>

            {/* Sorting Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Sort by:</span>
              {[
                { id: 'featured', label: '✨ Featured' },
                { id: 'popular', label: '🔥 Popular' },
                { id: 'rating', label: '⭐ Top Rated' },
                { id: 'price-asc', label: '₱ Price: Low to High' },
                { id: 'price-desc', label: '₱ Price: High to Low' }
              ].map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSortBy(s.id as any)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 10,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    background: sortBy === s.id ? '#7c3aed' : '#fff',
                    color: sortBy === s.id ? '#fff' : '#475569',
                    border: sortBy === s.id ? '1px solid #7c3aed' : '1px solid #e2e8f0',
                    boxShadow: sortBy === s.id ? '0 2px 8px rgba(124,58,237,0.2)' : 'none'
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {searchQuery && (
            <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px', animation: 'fadeIn 0.25s ease' }}>
              <span>Found <strong>{filteredItems.length}</strong> items matching &ldquo;{searchQuery}&rdquo;</span>
              <button 
                onClick={() => setSearchQuery("")} 
                style={{ background: 'transparent', border: 'none', color: '#7c3aed', fontWeight: 600, cursor: 'pointer', fontSize: '13px', padding: 0 }}
              >
                Clear search
              </button>
            </div>
          )}

          {loading ? (
            <div className="grid">
              {Array.from({ length: 8 }).map((_, i) => (
                <SkeletonShopCard key={i} />
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <svg width="48" height="48" fill="none" stroke="#94a3b8" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M6 2L3 7v13a2 2 0 002 2h14a2 2 0 002-2V7l-3-5H6z"/><line x1="3" y1="7" x2="21" y2="7"/><path d="M16 11a4 4 0 01-8 0"/></svg>
              </div>
              <div className="empty-text">No items found.</div>
              <p className="subtitle" style={{marginTop: '8px'}}>Try changing the category or search query!</p>
            </div>
          ) : (
            <div className="grid">
              {filteredItems.map((item) => {
                const activeDeal = getActiveFlashDeal(item.id);
                return (
                <div key={item.id} className="item-card" onClick={() => handleViewItem(item)} style={{cursor:'pointer', position: 'relative'}}>
                  <div style={{ position: 'relative', width: '100%', overflow: 'hidden' }}>
                    {item.image ? (
                      <img
                        src={getImageUrl(item.image)}
                        alt={item.name}
                        className="item-card-img"
                        loading="lazy"
                        decoding="async"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.style.display = 'none';
                          const card = e.currentTarget.closest('.item-card');
                          const placeholder = card?.querySelector('.item-image-placeholder') as HTMLElement;
                          if (placeholder) placeholder.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div className="item-image-placeholder" style={{ display: item.image ? 'none' : 'flex' }}>
                      <svg width="48" height="48" fill="none" stroke="#cbd5e1" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
                    </div>

                    {/* E-Commerce Floating Badges */}
                    <span style={{
                      position: 'absolute',
                      top: 8,
                      left: 8,
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      color: '#fff',
                      fontSize: 10,
                      fontWeight: 800,
                      padding: '3px 7px',
                      borderRadius: 6,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      boxShadow: '0 2px 6px rgba(0,0,0,0.18)',
                      zIndex: 2
                    }}>
                      🚚 FREE SHIP
                    </span>

                    {activeDeal ? (
                      <span style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                        color: '#fff',
                        fontSize: 10,
                        fontWeight: 900,
                        padding: '3px 7px',
                        borderRadius: 6,
                        zIndex: 2,
                        boxShadow: '0 2px 6px rgba(220, 38, 38, 0.35)'
                      }}>
                        ⚡ -{activeDeal.discount_pct || 40}% OFF
                      </span>
                    ) : (
                      <span style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        background: 'rgba(239, 68, 68, 0.95)',
                        color: '#fff',
                        fontSize: 10,
                        fontWeight: 800,
                        padding: '3px 7px',
                        borderRadius: 6,
                        zIndex: 2,
                        boxShadow: '0 2px 6px rgba(0,0,0,0.18)'
                      }}>
                        -30%
                      </span>
                    )}
                  </div>

                  <div className="item-content">
                    <div className="item-meta-row" style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:6}}>
                      <div style={{ flex: 1, minWidth: 0, marginRight: 6 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#7c3aed', background: '#f3e8ff', padding: '2px 6px', borderRadius: 4, display: 'inline-block', marginBottom: 3 }}>
                          {item.category || "General"}
                        </span>
                        <h3 className="item-name" style={{ margin: 0 }}>{item.name}</h3>
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:4, flexShrink: 0}}>
                        <StarRating rating={Math.round(Number(item.reviews_avg_rating || 0))} size={12} />
                        <span style={{fontSize:11,color:'#94a3b8'}}>({Number(item.reviews_avg_rating || 0).toFixed(1)})</span>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 10, background: '#f0fdf4', color: '#16a34a', padding: '2px 6px', borderRadius: 4, fontWeight: 700, border: '1px solid #bbf7d0' }}>
                        💵 COD
                      </span>
                      <span style={{ fontSize: 11, color: '#64748b' }}>
                        • {item.sold_count ? `${item.sold_count} sold` : `${(item.reviews_count || 0) * 4 + 18} sold`}
                      </span>
                    </div>

                    <p className="item-desc">{item.description || "No description provided."}</p>
                    <div className="item-stock-row" style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom: isMobile ? 8 : 16}}>
                      <div style={{fontSize: 13, color: '#64748b'}}>
                        {calculateTotalStock(item) > 0 ? (
                          <>Stock: <strong style={{color: '#0f172a'}}>{calculateTotalStock(item)} left</strong></>
                        ) : (
                          <strong style={{color: '#ef4444'}}>Out of Stock</strong>
                        )}
                      </div>
                      <span style={{fontSize:11,color:'#94a3b8'}}>{item.reviews_count || 0} Reviews</span>
                    </div>
                    <div className="item-footer" style={{display:'flex', flexDirection:'column', gap: isMobile ? 6 : 10}} onClick={e => e.stopPropagation()}>
                      {(() => {
                        const origPrice = parseFloat(item.price) || 0;
                        if (activeDeal) {
                          const fPrice = Number(activeDeal.flash_price);
                          return (
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, alignSelf: 'flex-start' }}>
                              <span className="item-price" style={{ color: '#dc2626', fontWeight: 900 }}>
                                ₱{fPrice.toFixed(2)}
                              </span>
                              {origPrice > fPrice && (
                                <span style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', textDecoration: 'line-through' }}>
                                  ₱{origPrice.toFixed(2)}
                                </span>
                              )}
                            </div>
                          );
                        }
                        return <span className="item-price" style={{alignSelf:'flex-start'}}>{formatPriceDisplay(item)}</span>;
                      })()}
                      <div style={{display:'flex', gap:8, width:'100%'}}>
                        {calculateTotalStock(item) > 0 ? (
                          <>
                            <button className="add-cart-btn" onClick={(e) => {
                              if (isFootwearCategory(item.category) && item.attributes?.sizes && item.attributes.sizes.length > 0) {
                                handleViewItem(item);
                              } else {
                                const dealPrice = activeDeal ? String(activeDeal.flash_price) : (item.attributes?.variant_prices?.[0] || item.price);
                                handleAddToCart(item, item.attributes?.colors?.[0] || "", dealPrice);
                              }
                            }} disabled={addingToCart === item.id}>
                              <IconCart /> {addingToCart === item.id ? '...' : 'Add to Cart'}
                            </button>
                            <button className="buy-btn" style={{
                              background: activeDeal ? 'linear-gradient(135deg, #ef4444, #dc2626)' : undefined,
                              boxShadow: activeDeal ? '0 4px 12px rgba(220, 38, 38, 0.25)' : undefined
                            }} onClick={(e) => {
                              if (isFootwearCategory(item.category) && item.attributes?.sizes && item.attributes.sizes.length > 0) {
                                handleViewItem(item);
                              } else {
                                const dealPrice = activeDeal ? String(activeDeal.flash_price) : (item.attributes?.variant_prices?.[0] || item.price);
                                setBuyModal({item, variation: item.attributes?.colors?.[0] || "", price: dealPrice, variantIdx: 0});
                              }
                            }}>
                              {activeDeal ? '⚡ Buy Deal' : 'Buy Now'}
                            </button>
                          </>
                        ) : (
                          <button className="buy-btn" disabled style={{background: '#e2e8f0', color: '#94a3b8', boxShadow: 'none', cursor: 'not-allowed', flex: 1}}>
                            <IconCart /> Out of Stock
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="item-seller" style={{marginTop:12, padding: '8px 12px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '8px'}}>
                      {item.user?.avatar ? (
                        <img 
                          src={getAvatarUrl(item.user.avatar)} 
                          alt={item.user?.name || "Seller"} 
                          className="seller-avatar" 
                          style={{objectFit: 'cover', width: '28px', height: '28px', flexShrink: 0, borderRadius: '50%'}} 
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(item.user?.name || "User")}&background=e2e8f0&color=64748b&bold=true`;
                          }}
                        />
                      ) : (
                        <div className="seller-avatar" style={{width: '28px', height: '28px', flexShrink: 0, borderRadius: '50%'}}>{(item.user?.name || "U").charAt(0).toUpperCase()}</div>
                      )}
                      <div style={{display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0, flex: 1}}>
                        <span style={{color: '#0f172a', fontSize: '13px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                          {item.user?.name || "Seller"}
                        </span>
                        {item.user?.location ? (
                          <a 
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.user.location)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            style={{display: 'flex', alignItems: 'center', gap: 3, fontSize: '11px', fontWeight: 600, color: '#475569', textDecoration: 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', transition: 'color .2s'}}
                            onMouseEnter={(e) => (e.currentTarget.style.color = '#7c3aed')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = '#475569')}
                            title="View real seller location on Google Maps"
                          >
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="#ef4444" style={{flexShrink: 0}}><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                            <span style={{overflow: 'hidden', textOverflow: 'ellipsis'}}>{item.user.location}</span>
                          </a>
                        ) : (
                          <span style={{display: 'flex', alignItems: 'center', gap: 3, fontSize: '11px', color: '#94a3b8'}}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="#cbd5e1" style={{flexShrink: 0}}><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                            <span style={{overflow: 'hidden', textOverflow: 'ellipsis'}}>Location not set</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
              })}
            </div>
          )}
        </main>

        {/* ——— OFFICIAL SHOPPLY MARKETPLACE FOOTER ——— */}
        <footer style={{ background: '#fff', borderTop: '1px solid #e2e8f0', marginTop: 60, padding: '48px 24px 28px', color: '#475569' }}>
          <div style={{ maxWidth: 1280, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 32, marginBottom: 40 }}>
            {/* Column 1: Customer Service */}
            <div>
              <h4 style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 14 }}>
                Customer Care
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
                <Link href="/guides" style={{ color: '#64748b', textDecoration: 'none' }}>Help Centre & FAQs</Link>
                <Link href="/guides" style={{ color: '#64748b', textDecoration: 'none' }}>How to Buy on Shopply</Link>
                <Link href="/dashboard" style={{ color: '#64748b', textDecoration: 'none' }}>Track SPX Delivery</Link>
                <Link href="/terms" style={{ color: '#64748b', textDecoration: 'none' }}>7-Day Free Returns</Link>
                <Link href="/contact" style={{ color: '#64748b', textDecoration: 'none' }}>Shopply Guarantee & COD</Link>
              </div>
            </div>

            {/* Column 2: About Shopply */}
            <div>
              <h4 style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 14 }}>
                About Shopply
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
                <Link href="/about" style={{ color: '#64748b', textDecoration: 'none' }}>About Shopply Philippines</Link>
                <Link href="/careers" style={{ color: '#64748b', textDecoration: 'none' }}>Careers</Link>
                <Link href="/privacy" style={{ color: '#64748b', textDecoration: 'none' }}>Privacy Policy</Link>
                <Link href="/terms" style={{ color: '#64748b', textDecoration: 'none' }}>Terms of Service</Link>
                <Link href="/cookies" style={{ color: '#64748b', textDecoration: 'none' }}>Cookie Policy</Link>
              </div>
            </div>

            {/* Column 3: Logistics & Payment */}
            <div>
              <h4 style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 14 }}>
                Payment & Logistics
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 8px', borderRadius: 6, background: '#f1f5f9', color: '#334155' }}>💵 Cash on Delivery</span>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 8px', borderRadius: 6, background: '#f1f5f9', color: '#0284c7' }}>GCash</span>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 8px', borderRadius: 6, background: '#f1f5f9', color: '#16a34a' }}>Maya</span>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 8px', borderRadius: 6, background: '#f1f5f9', color: '#7c3aed' }}>🚚 SPX Express</span>
              </div>
              <p style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.5, margin: 0 }}>
                100% Authentic Products • Secure Philippine Peso (₱) Checkout
              </p>
            </div>

            {/* Column 4: Official Security & SiteLock Trust Seal */}
            <div>
              <h4 style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 14 }}>
                Verified Security
              </h4>
              <div style={{ background: '#f8fafc', padding: 14, borderRadius: 14, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* Official SiteLock Trust Seal */}
                <SiteLockSeal size="md" showText={true} />
                <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.4, borderTop: '1px solid #f1f5f9', paddingTop: 8 }}>
                  🛡️ <strong>100% Shopply Protected:</strong> Real-time malware scanning, encrypted transactions, and official BIR electronic invoicing.
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Copyright Bar */}
          <div style={{ maxWidth: 1280, margin: '0 auto', paddingTop: 20, borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, fontSize: 12, color: '#94a3b8' }}>
            <div>
              © {new Date().getFullYear()} Shopply Inc. All Rights Reserved. • Philippines&apos; Premier E-Commerce Marketplace
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{ color: '#10b981', fontWeight: 600 }}>● All Systems Operational</span>
              <span>Country: 🇵🇭 Philippines</span>
            </div>
          </div>
        </footer>

        {/* PRODUCT DETAIL MODAL */}
        {viewItem && (
          (() => {
            const mediaItems = [];
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
                          <img 
                            src={mediaItems[activeImageIdx]?.url || "https://placehold.co/600x600/f8fafc/cbd5e1?text=No+Image"} 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = "https://placehold.co/600x600/f8fafc/cbd5e1?text=No+Image";
                            }}
                          />
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
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: '#fff', fontSize: 24 }}
                                title="Play Video"
                              >
                                📹
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
                        <span style={{fontSize:16,fontWeight:800,color:'#7c3aed',textDecoration:'underline'}}>
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 22 }}>⚡</span>
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
                          <span>⏱️ Ends in:</span>
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
                              🔥 -{flashDiscountPct}% OFF
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
                    const claimedPct = Math.min(100, Math.max(0, activeFlashDeal.claimed_pct || 40));
                    const remainingStock = activeFlashDeal.stock !== undefined ? activeFlashDeal.stock : calculateTotalStock(viewItem);
                    return (
                      <div style={{ margin: '8px 0 16px', maxWidth: 360 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 800, color: '#dc2626', marginBottom: 5 }}>
                          <span>⚡ {claimedPct}% CLAIMED</span>
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
                            background: isDeal ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'linear-gradient(135deg, #7c3aed, #4f46e5)',
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
                            {isDeal ? `⚡ Buy Now (₱${dealPriceNum!.toFixed(2)})` : 'Buy Now'}
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
                    {viewItem.user.avatar ? (
                      <img src={getAvatarUrl(viewItem.user.avatar)} className="seller-main-avatar" alt={viewItem.user.name} />
                    ) : (
                      <div className="seller-main-avatar">{viewItem.user.name.charAt(0).toUpperCase()}</div>
                    )}
                    <span className="seller-mall-badge">Verified Seller</span>
                  </div>
                  <div className="seller-info-col">
                    <h4 className="seller-title-name">
                      {viewItem.user.name}
                    </h4>
                    <span className="seller-active-status">Active recently</span>
                    {viewItem.user?.location ? (
                      <a 
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(viewItem.user.location)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: '#475569', textDecoration: 'none', marginBottom: 6, transition: 'color .2s'}}
                        onMouseEnter={(e) => (e.currentTarget.style.color = '#7c3aed')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = '#475569')}
                        title="View real seller location on Google Maps"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="#ef4444" style={{flexShrink: 0}}><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                        {viewItem.user.location}
                      </a>
                    ) : (
                      <span style={{display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#94a3b8', marginBottom: 6}}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="#cbd5e1" style={{flexShrink: 0}}><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                        Location not set by seller
                      </span>
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
                    <span className="seller-stat-label">Ratings</span>
                    <span className="seller-stat-val">
                      {viewItem.user.reviews_count !== undefined ? viewItem.user.reviews_count : reviews.length}
                    </span>
                  </div>
                  <div className="seller-stat-box">
                    <span className="seller-stat-label">Response Rate</span>
                    <span className="seller-stat-val">
                      {viewItem.user.total_orders && viewItem.user.total_orders > 0 ? Math.round(((viewItem.user.accepted_orders || 0) / viewItem.user.total_orders) * 100) + "%" : "100%"}
                    </span>
                  </div>
                  <div className="seller-stat-box">
                    <span className="seller-stat-label">Joined</span>
                    <span className="seller-stat-val dark">{calculateJoined(viewItem.user.created_at)}</span>
                  </div>
                  <div className="seller-stat-box">
                    <span className="seller-stat-label">Products</span>
                    <span className="seller-stat-val">{viewItem.user.items_count !== undefined ? viewItem.user.items_count : 1}</span>
                  </div>
                  <div className="seller-stat-box">
                    <span className="seller-stat-label">Response Time</span>
                    <span className="seller-stat-val">
                      {viewItem.user.total_orders && viewItem.user.total_orders > 5 ? "within minutes" : "within a few hours"}
                    </span>
                  </div>
                  <div className="seller-stat-box">
                    <span className="seller-stat-label">Followers</span>
                    <span className="seller-stat-val dark">
                      {viewItem.user.followers_count !== undefined ? viewItem.user.followers_count : 0}
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
                        border: '1px solid #7c3aed',
                        background: '#f5f3ff',
                        color: '#7c3aed',
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
                  <div style={{ background: '#fff', borderRadius: 16, padding: 20, marginBottom: 24, border: '1.5px solid #7c3aed', boxShadow: '0 8px 24px rgba(124,58,237,0.08)' }}>
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
                          style={{ padding: '8px 24px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', boxShadow: '0 2px 8px rgba(124,58,237,0.25)', opacity: submittingReview ? 0.7 : 1 }}
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
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#f1f5f9', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 20 }}>
                      💬
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
                  const similarItems = items
                    .filter(item => item.id !== viewItem.id && item.category === viewItem.category)
                    .slice(0, 3);
                  
                  const displayItems = similarItems.length > 0 
                    ? similarItems 
                    : items.filter(item => item.id !== viewItem.id).slice(0, 3);

                  if (displayItems.length === 0) {
                    return <p style={{ color: '#94a3b8', fontSize: '14px' }}>No similar products found.</p>;
                  }

                  return (
                    <div className="similar-products-grid">
                      {displayItems.map(item => (
                        <div 
                          key={item.id} 
                          onClick={() => handleViewItem(item)}
                          style={{ 
                            background: '#f8fafc', 
                            borderRadius: '16px', 
                            overflow: 'hidden', 
                            border: '1px solid #e2e8f0', 
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.transform = 'translateY(-4px)';
                            e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.05)';
                            e.currentTarget.style.borderColor = '#cbd5e1';
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.transform = 'none';
                            e.currentTarget.style.boxShadow = 'none';
                            e.currentTarget.style.borderColor = '#e2e8f0';
                          }}
                        >
                          <div style={{ position: 'relative', width: '100%', aspectRatio: '1', overflow: 'hidden', background: '#e2e8f0' }}>
                            {item.image ? (
                              <img 
                                src={getImageUrl(item.image)} 
                                alt={item.name} 
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={(e) => {
                                  e.currentTarget.onerror = null;
                                  e.currentTarget.src = "https://placehold.co/400x400/f8fafc/cbd5e1?text=No+Image";
                                }}
                              />
                            ) : (
                              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                                📷
                              </div>
                            )}
                          </div>
                          <div style={{ padding: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                              <h5 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>
                                {item.name}
                              </h5>
                              <span style={{ fontSize: '15px', fontWeight: 800, color: '#10b981', whiteSpace: 'nowrap' }}>
                                {formatPriceDisplay(item)}
                              </span>
                            </div>
                            <p style={{ fontSize: '12px', color: '#64748b', marginTop: '6px', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: '1.4' }}>
                              {item.description || "Explore this premium item's features and style."}
                            </p>
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
                if (deal) {
                  return (
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      background: '#fee2e2',
                      color: '#dc2626',
                      padding: '4px 10px',
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 800,
                      marginBottom: 8
                    }}>
                      <span>⚡ Flash Deal Applied (-{deal.discount_pct || 40}% OFF)</span>
                    </div>
                  );
                }
                return null;
              })()}
              <p style={{fontSize:14,color:'#64748b',marginBottom:8}}>
                {buyModal.variation ? `Variation: ${buyModal.variation}` : 'Standard'}
              </p>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 0',borderTop:'1px solid #f1f5f9',borderBottom:'1px solid #f1f5f9',marginBottom:24}}>
                <span style={{fontSize:13,color:'#94a3b8'}}>Total</span>
                <span style={{fontSize:24,fontWeight:800,color: getActiveFlashDeal(buyModal.item.id) ? '#dc2626' : '#10b981'}}>₱{parseFloat(buyModal.price).toFixed(2)}</span>
              </div>
              <div style={{display:'flex',gap:12}}>
                <button onClick={() => setBuyModal(null)} style={{flex:1,padding:'12px',borderRadius:10,border:'1.5px solid #e2e8f0',background:'#fff',color:'#64748b',fontWeight:600,fontSize:14,cursor:'pointer',fontFamily:'Inter,sans-serif'}}>Cancel</button>
                <button onClick={handleBuy} disabled={buying} style={{
                  flex:2,
                  padding:'12px',
                  borderRadius:10,
                  border:'none',
                  background: getActiveFlashDeal(buyModal.item.id) ? 'linear-gradient(135deg,#ef4444,#dc2626)' : 'linear-gradient(135deg,#7c3aed,#4f46e5)',
                  color:'#fff',
                  fontWeight:700,
                  fontSize:14,
                  cursor:'pointer',
                  fontFamily:'Inter,sans-serif',
                  boxShadow: getActiveFlashDeal(buyModal.item.id) ? '0 4px 14px rgba(220,38,38,.3)' : '0 4px 14px rgba(124,58,237,.3)',
                  display:'inline-flex',
                  alignItems:'center',
                  justifyContent:'center',
                  gap:6,
                  opacity:buying ? 0.7 : 1
                }}>
                  <IconCart /> {buying ? "Processing..." : `Confirm (₱${parseFloat(buyModal.price).toFixed(2)})`}
                </button>
              </div>
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
                          <img src={getAvatarUrl(conv.user.avatar)} alt={conv.user.name} style={{width: 44, height: 44, borderRadius: '50%', objectFit: 'cover'}} />
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
                              fontSize: 10,
                              fontWeight: 500,
                              color: conv.user.is_online ? '#10b981' : '#94a3b8',
                              background: conv.user.is_online ? 'rgba(16,185,129,0.1)' : 'rgba(148,163,184,0.1)',
                              padding: '1px 6px',
                              borderRadius: 8,
                              flexShrink: 0
                            }}>
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
                        <div style={{width: 20, height: 20, borderRadius: '50%', background: '#ef4444', color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
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
                        <img src={getAvatarUrl(activeChatUser.avatar)} alt={activeChatUser.name} style={{width: isMobile ? 32 : 40, height: isMobile ? 32 : 40, borderRadius: '50%', objectFit: 'cover'}} />
                      ) : (
                        <div style={{width: isMobile ? 32 : 40, height: isMobile ? 32 : 40, borderRadius: '50%', background: '#e2e8f0', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: isMobile ? 14 : 16}}>
                          {activeChatUser.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <h4 style={{fontSize: isMobile ? 14 : 16, fontWeight: 700, color: '#0f172a', margin: '0 0 2px'}}>
                          {activeChatUser.name}
                        </h4>
                        {isActiveUserOnline ? (
                          <span style={{fontSize: isMobile ? 11 : 12, color: '#10b981', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500}}>
                            <span style={{width: 5, height: 5, borderRadius: '50%', background: '#10b981'}}></span> Active now
                          </span>
                        ) : (
                          <span style={{fontSize: isMobile ? 11 : 12, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500}}>
                            <span style={{width: 5, height: 5, borderRadius: '50%', background: '#94a3b8'}}></span> Offline
                          </span>
                        )}
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
                        <div style={{fontSize: 32, marginBottom: 8}}>👋</div>
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
                                  <img src={getAvatarUrl(activeChatUser.avatar)} alt={activeChatUser.name} style={{width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', marginBottom: 4}} />
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
                                  background: isMe ? 'linear-gradient(135deg, #7c3aed, #6d28d9)' : '#f1f5f9',
                                  color: isMe ? '#fff' : '#0f172a',
                                  borderRadius: isMe ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                                  padding: isMobile ? '8px 12px' : '12px 18px',
                                  fontSize: isMobile ? 13 : 14,
                                  lineHeight: 1.5,
                                  boxShadow: isMe ? '0 4px 12px rgba(124, 58, 237, 0.2)' : 'none',
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
                                            <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                                              📍
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
                                              style={{ flex: 1, textAlign: 'center', background: '#3b82f6', color: '#fff', fontSize: 11, fontWeight: 600, padding: '6px 0', borderRadius: 8, textDecoration: 'none' }}
                                            >
                                              Google Maps
                                            </a>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setIsMeetupMapOpen(true);
                                              }}
                                              style={{ flex: 1, background: '#10b981', color: '#fff', border: 'none', fontSize: 11, fontWeight: 600, padding: '6px 0', borderRadius: 8, cursor: 'pointer' }}
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
                          <img src={getAvatarUrl(activeChatUser.avatar)} alt={activeChatUser.name} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', marginBottom: 4 }} />
                        ) : (
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#e2e8f0', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, marginBottom: 4 }}>
                            {activeChatUser.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div style={{ background: '#d8b4fe', padding: '12px 18px', borderRadius: '20px 20px 20px 4px', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 4px 12px rgba(216, 180, 254, 0.2)' }}>
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
                        <label style={{ height: 75, width: 75, borderRadius: 8, border: '2px dashed #a855f7', background: '#f3e8ff', color: '#7c3aed', fontSize: 24, fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, transition: 'all 0.2s' }} title="Add more photos">
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
                          background: isEmojiPickerOpen ? '#ddd6fe' : '#e2e8f0',
                          color: isEmojiPickerOpen ? '#6d28d9' : '#64748b',
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
                          background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
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
                          boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)',
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
                  maxWidth: '85vw',
                  maxHeight: '78vh',
                  objectFit: 'contain',
                  borderRadius: 12,
                  boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
                  border: '1px solid rgba(255, 255, 255, 0.15)'
                }}
              />

              {/* Navigation Bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 16 }}>
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
                    background: '#7c3aed',
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
                  width: 72,
                  height: 72,
                  borderRadius: '50%',
                  background: '#fee2e2',
                  color: '#ef4444',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 36,
                  margin: '0 auto 20px'
                }}
              >
                🚫
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
                  localStorage.removeItem('token');
                  localStorage.removeItem('shopply_user');
                  window.location.href = '/login';
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
