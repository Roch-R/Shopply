// Force recompile
"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import jsQR from "jsqr";
import { getApiCache, createSmartPoller } from "@/lib/apiCache";
import { Skeleton, SkeletonStatCard, SkeletonChatMessage, SkeletonChatListItem } from "@/components/Skeleton";

interface User {
  id: number;
  name: string;
  email: string;
  email_verified_at: string | null;
  avatar: string | null;
  followers_count?: number;
  following_count?: number;
  reviews_count?: number;
  reviews_avg_rating?: number;
  created_at: string;
  updated_at: string;
}

interface ShopItem {
  id: number;
  name: string;
  description: string | null;
  price: string;
  stock: number;
  image: string | null;
  is_published: boolean;
  category: string;
  attributes: any;
  created_at: string;
}

interface Order {
  id: number;
  item_id: number;
  seller_id: number;
  price: string;
  quantity: number;
  status: string;
  created_at: string;
  variation?: string;
  item: ShopItem;
  seller: { id: number; name: string; };
  buyer?: { id: number; name: string; };
}

type SidebarTab = "profile" | "my-items" | "add-item" | "orders" | "store-orders" | "shop" | "notifications" | "messages" | "settings";

const COLOR_PALETTE = [
  { name: 'White', r: 255, g: 255, b: 255 },
  { name: 'Black', r: 0, g: 0, b: 0 },
  { name: 'Charcoal', r: 54, g: 69, b: 79 },
  { name: 'Gray', r: 128, g: 128, b: 128 },
  { name: 'Slate Gray', r: 112, g: 128, b: 144 },
  { name: 'Silver', r: 192, g: 192, b: 192 },
  { name: 'Red', r: 239, g: 68, b: 68 },
  { name: 'Crimson', r: 220, g: 20, b: 60 },
  { name: 'Scarlet', r: 255, g: 36, b: 0 },
  { name: 'Pink', r: 236, g: 72, b: 153 },
  { name: 'Coral Pink', r: 255, g: 127, b: 80 },
  { name: 'Orange', r: 249, g: 115, b: 22 },
  { name: 'Sunset Orange', r: 255, g: 140, b: 0 },
  { name: 'Yellow', r: 234, g: 179, b: 8 },
  { name: 'Amber', r: 255, g: 191, b: 0 },
  { name: 'Lemon Yellow', r: 255, g: 250, b: 205 },
  { name: 'Green', r: 16, g: 185, b: 129 },
  { name: 'Emerald Green', r: 80, g: 200, b: 120 },
  { name: 'Forest Green', r: 34, g: 139, b: 34 },
  { name: 'Mint Green', r: 152, g: 255, b: 152 },
  { name: 'Teal', r: 20, g: 184, b: 166 },
  { name: 'Turquoise', r: 64, g: 224, b: 208 },
  { name: 'Blue', r: 59, g: 130, b: 246 },
  { name: 'Sky Blue', r: 135, g: 206, b: 235 },
  { name: 'Royal Blue', r: 65, g: 105, b: 225 },
  { name: 'Navy Blue', r: 30, g: 58, b: 138 },
  { name: 'Midnight Blue', r: 25, g: 25, b: 112 },
  { name: 'Lavender', r: 230, g: 230, b: 250 },
  { name: 'Purple', r: 139, g: 92, b: 246 },
  { name: 'Royal Purple', r: 120, g: 81, b: 169 },
  { name: 'Magenta', r: 255, g: 0, b: 255 },
  { name: 'Rose Pink', r: 255, g: 102, b: 204 },
  { name: 'Hot Pink', r: 255, g: 105, b: 180 },
  { name: 'Beige', r: 245, g: 245, b: 220 },
  { name: 'Warm Beige', r: 245, g: 245, b: 220 },
  { name: 'Brown', r: 147, g: 67, b: 39 },
  { name: 'Mocha Brown', r: 111, g: 78, b: 55 },
  { name: 'Khaki', r: 195, g: 176, b: 145 },
  { name: 'Maroon', r: 128, g: 0, b: 0 },
  { name: 'Olive Green', r: 128, g: 128, b: 0 },
  { name: 'Cyan', r: 0, g: 255, b: 255 },
  { name: 'Peach', r: 255, g: 218, b: 185 },
  { name: 'Gold', r: 255, g: 215, b: 0 },
  { name: 'Plum', r: 221, g: 160, b: 221 }
];

const getColorPreviewHex = (name: string) => {
  if (!name) return '#fff';
  const clean = name.toLowerCase().trim();
  const found = COLOR_PALETTE.find(c => c.name.toLowerCase() === clean);
  if (found) {
    return `#${found.r.toString(16).padStart(2,'0')}${found.g.toString(16).padStart(2,'0')}${found.b.toString(16).padStart(2,'0')}`;
  }
  const partial = COLOR_PALETTE.find(c => clean.includes(c.name.toLowerCase()) || c.name.toLowerCase().includes(clean));
  if (partial) {
    return `#${partial.r.toString(16).padStart(2,'0')}${partial.g.toString(16).padStart(2,'0')}${partial.b.toString(16).padStart(2,'0')}`;
  }
  return '#7c3aed';
};

const getIconColor = (name: string) => {
  if (!name) return '#64748b';
  const clean = name.toLowerCase().trim();
  if (clean === 'white' || clean === 'yellow' || clean === 'lemon yellow' || clean === 'beige' || clean === 'warm beige' || clean === 'silver') {
    return '#0f172a';
  }
  return '#fff';
};

const hexToColorName = (hex: string) => {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);

  let closestColor = COLOR_PALETTE[0].name;
  let minDistance = Infinity;

  for (const col of COLOR_PALETTE) {
    const distance = Math.pow(r - col.r, 2) + Math.pow(g - col.g, 2) + Math.pow(b - col.b, 2);
    if (distance < minDistance) {
      minDistance = distance;
      closestColor = col.name;
    }
  }

  return closestColor;
};

// Client-side image compression to avoid Payload Too Large / PHP dev server crash
const compressImage = (file: File, maxWidth: number = 800): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
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
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            if (blob) {
              const newFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(newFile);
            } else {
              resolve(file); // Fallback to original
            }
          }, 'image/jpeg', 0.8);
        } else {
          resolve(file); // Fallback
        }
      };
      img.onerror = () => resolve(file); // Fallback on error
    };
    reader.onerror = () => resolve(file); // Fallback
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

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [items, setItems] = useState<ShopItem[]>([]);
  const [activeTab, setActiveTab] = useState<SidebarTab>("profile");
  const [orders, setOrders] = useState<Order[]>([]);
  const [sellerOrders, setSellerOrders] = useState<Order[]>([]);
  const [orderTab, setOrderTab] = useState("all");
  const [orderSearch, setOrderSearch] = useState("");
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);
  const [activeStatChart, setActiveStatChart] = useState("Total Orders");

  // Scanner state
  const [showScanner, setShowScanner] = useState(false);
  const [ordersExpanded, setOrdersExpanded] = useState(false);
  
  // Sidebar collapsible state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('shopply_sidebar_collapsed') === 'true';
    }
    return false;
  });

  const toggleSidebar = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('shopply_sidebar_collapsed', String(next));
      return next;
    });
  };

  // Profile update state
  const [profileName, setProfileName] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [updatingProfile, setUpdatingProfile] = useState(false);

  // Toast state
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  // Chat States
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeChatUser, setActiveChatUser] = useState<{ id: number; name: string; avatar?: string | null } | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatConversations, setChatConversations] = useState<any[]>([]);
  const [loadingChatConversations, setLoadingChatConversations] = useState(true);
  const [newChatMessage, setNewChatMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [loadingChatMessages, setLoadingChatMessages] = useState(false);
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const [chatImageFile, setChatImageFile] = useState<File | null>(null);
  const [chatImagePreview, setChatImagePreview] = useState<string | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  const isSendingRef = useRef(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, activeTab]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sellerOrdersRef = useRef(sellerOrders);

  useEffect(() => {
    sellerOrdersRef.current = sellerOrders;
  }, [sellerOrders]);

  useEffect(() => {
    let animationId: number;
    let stream: MediaStream | null = null;

    if (showScanner && videoRef.current && canvasRef.current) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } }).then(s => {
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute("playsinline", "true");
          videoRef.current.play();
          requestAnimationFrame(tick);
        }
      });
    }

    const tick = () => {
      if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA && canvasRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (ctx) {
          canvas.height = videoRef.current.videoHeight;
          canvas.width = videoRef.current.videoWidth;
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          });
          if (code && code.data) {
            setShowScanner(false);
            if (code.data.startsWith("TRK-")) {
              const parts = code.data.split('-');
              if (parts.length === 3) {
                const orderId = parseInt(parts[2], 10);
                const orderToShip = sellerOrdersRef.current.find(o => o.id === orderId && o.status === 'processing');
                if (orderToShip) {
                  handleShipOrder(orderToShip.id);
                } else {
                  showToast("Processing order not found for this tracking number.", "error");
                }
              } else {
                showToast("Invalid tracking format.", "error");
              }
            } else if (code.data.startsWith("PRD-")) {
              // Legacy support
              const prodId = parseInt(code.data.replace("PRD-", ""), 10);
              const orderToShip = sellerOrdersRef.current.slice().reverse().find(o => o.item.id === prodId && o.status === 'processing');
              if (orderToShip) {
                handleShipOrder(orderToShip.id);
              } else {
                showToast("No processing orders found for this scanned product.", "error");
              }
            } else {
              showToast("Invalid QR code scanned.", "error");
            }
            return;
          }
        }
      }
      animationId = requestAnimationFrame(tick);
    };

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, [showScanner]);

  // Add item form state
  const [newItemName, setNewItemName] = useState("");
  const [newItemDesc, setNewItemDesc] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [newItemStock, setNewItemStock] = useState("1");
  const [mainImagesState, setMainImagesState] = useState<{ file: File | null, preview: string, path: string | null }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newItemCategory, setNewItemCategory] = useState("General");
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [sizeStocks, setSizeStocks] = useState<Record<string, string | number>>({});
  const [sizeSystem, setSizeSystem] = useState<'EU' | 'US' | 'PH'>('PH');
  const [customSizeInput, setCustomSizeInput] = useState("");
  const [specs, setSpecs] = useState<{ key: string, value: string }[]>([]);
  const [newSpecKey, setNewSpecKey] = useState("");
  const [newSpecValue, setNewSpecValue] = useState("");
  const [colorVariants, setColorVariants] = useState<{ color: string, price: string, file: File | null, preview: string | null, path?: string | null }[]>([]);
  const [newColorName, setNewColorName] = useState("");
  const [newColorPrice, setNewColorPrice] = useState("");
  const [newColorFile, setNewColorFile] = useState<File | null>(null);
  const [newColorPreview, setNewColorPreview] = useState<string | null>(null);
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [editingItem, setEditingItem] = useState<ShopItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deleteModal, setDeleteModal] = useState<number | null>(null);
  const [rejectOrderModal, setRejectOrderModal] = useState<number | null>(null);
  const [cartCount, setCartCount] = useState(0);

  const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
  const STORAGE_URL = process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL.replace('/api', '/storage') : "http://localhost:8000/storage";
  const lastFetchedRef = useRef<number>(0);

  // SVG Icon components
  const IconUser = () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>;
  const IconBox = () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>;
  const IconPlus = () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>;
  const IconShop = () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 2L3 7v13a2 2 0 002 2h14a2 2 0 002-2V7l-3-5H6z" /><line x1="3" y1="7" x2="21" y2="7" /><path d="M16 11a4 4 0 01-8 0" /></svg>;
  const IconCart = () => <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" /></svg>;
  const IconTrash = () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" /></svg>;
  const IconEye = () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>;
  const IconEyeOff = () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></svg>;
  const IconCamera = () => <svg width="40" height="40" fill="none" stroke="#cbd5e1" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" /><circle cx="12" cy="13" r="4" /></svg>;
  const IconUpload = () => <svg width="36" height="36" fill="none" stroke="#94a3b8" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>;
  const IconMail = () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>;
  const IconId = () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></svg>;
  const IconStorefront = () => <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
  const IconFollowers = () => <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 00-3-3.87"></path><path d="M16 3.13a4 4 0 010 7.75"></path></svg>;
  const IconFollowing = () => <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>;
  const IconStar = () => <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>;
  const IconCheck = () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>;
  const IconCalendar = () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>;
  const IconActivity = () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>;
  const IconWarning = () => <svg width="48" height="48" fill="none" stroke="#ef4444" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>;
  const IconBell = () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>;
  const IconChat = () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>;

  useEffect(() => {
    const token = localStorage.getItem("token");
    const stored = localStorage.getItem("user");

    if (!token || !stored) { router.replace("/login"); return; }

    const cache = getApiCache();
    cache.fetch(`${API}/me`, {
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
    })
      .then((data: any) => {
        if (!data) return;
        const freshUser: User = data.user;
        localStorage.setItem("user", JSON.stringify(freshUser));
        if (!freshUser.email_verified_at) {
          router.replace("/verify");
          return;
        }
        setUser(freshUser);
        setProfileName(freshUser.name);
        setReady(true);
      })
      .catch(() => {
        router.replace("/login");
      });

    lastFetchedRef.current = Date.now();

    // Fetch user items (cached)
    cache.fetch(`${API}/items`, {
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
    })
      .then((data: any) => {
        if (data.items) setItems(data.items);
      })
      .catch((err: any) => console.error("Failed to fetch items", err));

    // Fetch cart count (cached)
    cache.fetch(`${API}/cart`, {
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
    })
      .then((data: any) => {
        if (data.cart_items) setCartCount(data.cart_items.length);
      })
      .catch(console.error);

    // Fetch user orders (cached)
    cache.fetch(`${API}/orders`, {
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
    })
      .then((data: any) => {
        if (data.orders) setOrders(data.orders);
      })
      .catch((err: any) => console.error("Failed to fetch orders", err));

    // Fetch seller orders (cached)
    cache.fetch(`${API}/seller/orders`, {
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
    })
      .then((data: any) => {
        if (data.orders) setSellerOrders(data.orders);
      })
      .catch(console.error);

    const handleUserUpdate = () => {
      const stored = localStorage.getItem("user");
      if (stored) {
        setUser(JSON.parse(stored));
      }
    };
    window.addEventListener('user_updated', handleUserUpdate);
    return () => window.removeEventListener('user_updated', handleUserUpdate);
  }, [router, API]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    let debounceTimer: NodeJS.Timeout;

    const cache = getApiCache();
    const doFetchAll = () => {
      // Invalidate stale data then refetch through cache
      cache.invalidate('/orders');
      cache.invalidate('/seller/orders');
      cache.invalidate('/items');

      cache.fetch(`${API}/orders`, { headers: { Accept: "application/json", Authorization: `Bearer ${token}` } })
        .then((data: any) => { if (data.orders) setOrders(data.orders); })
        .catch(console.error);

      cache.fetch(`${API}/seller/orders`, { headers: { Accept: "application/json", Authorization: `Bearer ${token}` } })
        .then((data: any) => { if (data.orders) setSellerOrders(data.orders); })
        .catch(console.error);

      cache.fetch(`${API}/items`, { headers: { Accept: "application/json", Authorization: `Bearer ${token}` } })
        .then((data: any) => { if (data.items) setItems(data.items); })
        .catch(console.error);
    };

    const fetchOnFocus = () => {
      const now = Date.now();
      if (now - lastFetchedRef.current < 2000) return;
      lastFetchedRef.current = now;
      doFetchAll();
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key && (e.key.startsWith('shopply_') || e.key === 'last_order_time')) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          lastFetchedRef.current = Date.now();
          doFetchAll();
        }, 50);
      }
    };

    window.addEventListener('focus', fetchOnFocus);
    window.addEventListener('storage', handleStorageChange);
    return () => {
      clearTimeout(debounceTimer);
      window.removeEventListener('focus', fetchOnFocus);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [activeTab, API]);

  // Poll chat conversations & active chat messages
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    let chatDebounce: NodeJS.Timeout;

    const fetchConversations = () => {
      getApiCache().fetch<any>(`${API}/chat/conversations`, 
        { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } },
        { onData: data => { if (data.conversations) setChatConversations(data.conversations); } }
      ).then(data => {
        if (data.conversations) setChatConversations(data.conversations); 
        setTimeout(() => setLoadingChatConversations(false), 100);
      }).catch(() => { setTimeout(() => setLoadingChatConversations(false), 100); });
    };

    const fetchMessages = () => {
      if (activeChatUser && !isSendingRef.current) {
        getApiCache().fetch<any>(`${API}/chat/${activeChatUser.id}`, 
          { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } },
          { onData: data => {
              if (data.messages && !isSendingRef.current) setChatMessages(data.messages);
              setIsOtherUserTyping(!!data.is_typing);
          }}
        ).then(data => {
            if (data.messages && !isSendingRef.current) setChatMessages(data.messages);
            setIsOtherUserTyping(!!data.is_typing);
            setTimeout(() => setLoadingChatMessages(false), 100);
        }).catch(() => { setTimeout(() => setLoadingChatMessages(false), 100); });
      }
    };

    fetchConversations();
    fetchMessages();

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

    const convInterval = setInterval(fetchConversations, 5000);
    let msgInterval: NodeJS.Timeout | undefined;
    if (activeChatUser) {
      msgInterval = setInterval(fetchMessages, 1000);
    }
    return () => {
      clearTimeout(chatDebounce);
      window.removeEventListener('storage', handleChatUpdate);
      window.removeEventListener('focus', handleChatUpdate);
      window.removeEventListener('visibilitychange', handleChatUpdate);
      if (msgInterval) clearInterval(msgInterval);
      clearInterval(convInterval);
    };
  }, [activeTab, activeChatUser, API]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newChatMessage.trim() && !chatImageFile) || !activeChatUser) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    isSendingRef.current = true;
    const messageText = newChatMessage.trim();
    const imageToSend = chatImageFile;
    const imagePreviewUrl = chatImagePreview;

    // Optimistic UI: immediately clear input & append message for zero lag
    setNewChatMessage("");
    setChatImageFile(null);
    setChatImagePreview(null);

    const optimisticMsg = {
      id: Date.now(),
      sender_id: user ? user.id : 999999,
      receiver_id: activeChatUser.id,
      message: messageText,
      image: imagePreviewUrl ? 'optimistic_image' : null,
      optimistic_preview: imagePreviewUrl,
      is_read: false,
      created_at: new Date().toISOString(),
    };
    setChatMessages(prev => [...prev, optimisticMsg]);
    setLoadingChatMessages(false);

    try {
      const formData = new FormData();
      if (messageText) formData.append("message", messageText);
      if (imageToSend) formData.append("image", imageToSend);

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
        setChatMessages(prev => prev.map(m => m.id === optimisticMsg.id ? data.message : m));
        localStorage.setItem('shopply_chat_update', Date.now().toString());
        // Refresh conversations
        fetch(`${API}/chat/conversations?_t=${Date.now()}`, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }, cache: 'no-store' })
          .then(res => res.json())
          .then(data => { if (data.conversations) setChatConversations(data.conversations); });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTimeout(() => { isSendingRef.current = false; }, 500);
    }
  };

  const handleAcceptOrder = async (orderId: number) => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API}/seller/orders/${orderId}/accept`, {
        method: "PUT",
        headers: { Accept: "application/json", Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setSellerOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'processing' } : o));
        localStorage.setItem('shopply_order_update', Date.now().toString());
        const acceptedOrder = sellerOrders.find(o => o.id === orderId);
        if (acceptedOrder) {
          setReceiptOrder({ ...acceptedOrder, status: 'processing' });
        }
        showToast("Order accepted successfully", "success");
      } else {
        const data = await res.json();
        showToast(data.message || "Failed to accept order", "error");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRejectOrder = (orderId: number) => {
    setRejectOrderModal(orderId);
  };

  const confirmRejectOrder = async () => {
    if (rejectOrderModal === null) return;
    const orderId = rejectOrderModal;
    setRejectOrderModal(null);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API}/seller/orders/${orderId}/reject`, {
        method: "PUT",
        headers: { Accept: "application/json", Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setSellerOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'cancelled' } : o));
        localStorage.setItem('shopply_order_update', Date.now().toString());
        showToast("Order rejected successfully", "success");
      } else {
        const data = await res.json();
        showToast(data.message || "Failed to reject order", "error");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleShipOrder = async (orderId: number) => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API}/seller/orders/${orderId}/ship`, {
        method: "PUT",
        headers: { Accept: "application/json", Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setSellerOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'shipped' } : o));
        localStorage.setItem('shopply_order_update', Date.now().toString());
        showToast("Order successfully marked as shipped!", "success");
      } else {
        const data = await res.json();
        showToast(data.message || "Failed to ship order", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("An error occurred while shipping.", "error");
    }
  };

  const handleReceiveOrder = async (orderId: number) => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API}/orders/${orderId}/receive`, {
        method: "PUT",
        headers: { Accept: "application/json", Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'delivered' } : o));
        localStorage.setItem('shopply_order_update', Date.now().toString());
        showToast("Order successfully marked as received!", "success");
      } else {
        const data = await res.json();
        showToast(data.message || "Failed to mark order as received", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("An error occurred.", "error");
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingProfile(true);
    const token = localStorage.getItem("token");

    const formData = new FormData();
    formData.append("name", profileName);
    if (avatarFile) {
      formData.append("avatar", avatarFile);
    }

    try {
      const res = await fetch(`${API}/profile`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem('shopply_profile_update', Date.now().toString());
        setUser(data.user);
        setAvatarFile(null);
        setAvatarPreview(null);
        showToast("Profile updated successfully!", 'success');
      } else {
        showToast(data.message || "Failed to update profile", 'error');
      }
    } catch (err) {
      console.error(err);
      showToast("Something went wrong.", 'error');
    } finally {
      setUpdatingProfile(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleLogout = async () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      for (const file of files) {
        const compressedFile = await compressImage(file, 800);
        const reader = new FileReader();
        reader.onloadend = () => {
          setMainImagesState(prev => [...prev, { file: compressedFile, preview: reader.result as string, path: null }]);
        };
        reader.readAsDataURL(compressedFile);
      }
    }
  };

  const handleVariantImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const compressedFile = await compressImage(file, 800);
      setNewColorFile(compressedFile);
      const reader = new FileReader();
      reader.onloadend = () => setNewColorPreview(reader.result as string);
      reader.readAsDataURL(compressedFile);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName || !newItemPrice) return;

    setIsSubmitting(true);
    const token = localStorage.getItem("token");

    const formData = new FormData();
    formData.append("name", newItemName);
    formData.append("description", newItemDesc);
    formData.append("price", newItemPrice);
    formData.append("stock", newItemStock);
    formData.append("category", newItemCategory);
    const attributes: any = { sizes: selectedSizes, specs: specs };
    if (Object.keys(sizeStocks).length > 0) {
      const parsedSizeStocks: Record<string, number> = {};
      for (const [k, v] of Object.entries(sizeStocks)) {
        parsedSizeStocks[k] = parseInt(v as string) || 0;
      }
      attributes.size_stocks = parsedSizeStocks;
    }
    if (colorVariants.length > 0) {
      attributes.colors = colorVariants.map(v => v.color);
      attributes.variant_prices = colorVariants.map(v => v.price);
      attributes.existing_variant_paths = colorVariants.map(v => v.path || null);
      colorVariants.forEach(v => {
        if (v.file) formData.append("variant_images[]", v.file);
      });
    }
    attributes.existing_main_images = mainImagesState.filter(m => m.path).map(m => m.path);
    formData.append("attributes", JSON.stringify(attributes));
    mainImagesState.forEach(m => {
      if (m.file) formData.append("images[]", m.file);
    });

    try {
      const res = await fetch(`${API}/items`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        let errorMsg = "Failed to add item";
        try {
          const data = await res.json();
          errorMsg = data.message || errorMsg;
        } catch(e) {
           errorMsg = `Server Error: Please try a smaller image size or try again later.`;
        }
        showToast(errorMsg, "error");
        setIsSubmitting(false);
        return;
      }

      const data = await res.json();
      if (res.ok) {
        setItems([data.item, ...items]);
        localStorage.setItem('shopply_item_update', Date.now().toString());
        setNewItemName("");
        setNewItemDesc("");
        setNewItemPrice("");
        setNewItemStock("1");
        setNewItemCategory("General");
        setSelectedSizes([]);
        setSpecs([]);
        setColorVariants([]);
        setMainImagesState([]);
        if (fileInputRef.current) fileInputRef.current.value = "";
        setActiveTab("my-items");
      } else {
        showToast(data.message || "Failed to add item", "error");
      }
    } catch (err: any) {
      console.error(err);
      showToast(err?.message === "Failed to fetch" ? "Network error: The image size might be too large or the server is offline." : "Something went wrong: " + (err?.message || err), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (item: ShopItem) => {
    setEditingItem(item);
    setNewItemName(item.name);
    setNewItemDesc(item.description || "");
    setNewItemPrice(item.price);
    setNewItemStock(item.stock?.toString() || "1");
    setNewItemCategory(item.category || "Clothes");
    
    // Parse attributes properly
    const attrs = typeof item.attributes === "string" ? JSON.parse(item.attributes) : (item.attributes || {});
    
    setSelectedSizes(attrs.sizes || []);
    setSizeStocks(attrs.size_stocks || {});
    setSpecs(attrs.specs || []);
    const loadedVariants = (item.attributes?.colors || []).map((color: string, idx: number) => ({
      color,
      price: item.attributes?.variant_prices?.[idx] || item.price,
      file: null,
      preview: item.attributes?.variant_image_paths?.[idx] ? `${STORAGE_URL}/${item.attributes.variant_image_paths[idx]}` : null,
      path: item.attributes?.variant_image_paths?.[idx] || null
    }));
    setColorVariants(loadedVariants);
    const mainImages = item.attributes?.main_images || [];
    setMainImagesState(mainImages.map((path: string) => ({
      file: null,
      preview: `${STORAGE_URL}/${path}`,
      path
    })));
    setActiveTab("add-item");
  };

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    setIsSubmitting(true);
    const token = localStorage.getItem("token");
    const formData = new FormData();
    formData.append("_method", "PUT");
    formData.append("name", newItemName);
    formData.append("description", newItemDesc);
    formData.append("price", newItemPrice);
    formData.append("stock", newItemStock);
    formData.append("category", newItemCategory);
    const attributes: any = { sizes: selectedSizes, specs: specs };
    if (Object.keys(sizeStocks).length > 0) {
      const parsedSizeStocks: Record<string, number> = {};
      for (const [k, v] of Object.entries(sizeStocks)) {
        parsedSizeStocks[k] = parseInt(v as string) || 0;
      }
      attributes.size_stocks = parsedSizeStocks;
    }
    if (colorVariants.length > 0) {
      attributes.colors = colorVariants.map(v => v.color);
      attributes.variant_prices = colorVariants.map(v => v.price);
      attributes.existing_variant_paths = colorVariants.map(v => v.path || null);
      colorVariants.forEach(v => {
        if (v.file) formData.append("variant_images[]", v.file);
      });
    }
    attributes.existing_main_images = mainImagesState.filter(m => m.path).map(m => m.path);
    formData.append("attributes", JSON.stringify(attributes));
    mainImagesState.forEach(m => {
      if (m.file) formData.append("images[]", m.file);
    });

    try {
      const res = await fetch(`${API}/items/${editingItem.id}`, {
        method: "POST", // Use POST with _method PUT for multipart/form-data
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        let errorMsg = "Failed to update item";
        try {
          const data = await res.json();
          errorMsg = data.message || errorMsg;
        } catch(e) {
           errorMsg = `Server Error: Please try a smaller image size or try again later.`;
        }
        showToast(errorMsg, "error");
        setIsSubmitting(false);
        return;
      }

      const data = await res.json();
      if (res.ok) {
        setItems(items.map(i => i.id === editingItem.id ? data.item : i));
        localStorage.setItem('shopply_item_update', Date.now().toString());
        showToast("Item updated successfully!", 'success');
        setEditingItem(null);
        setSpecs([]);
        setNewItemName("");
        setNewItemDesc("");
        setNewItemPrice("");
        setNewItemStock("1");
        setNewItemCategory("General");
        setSelectedSizes([]);
        setColorVariants([]);
        setMainImagesState([]);
        setActiveTab("my-items");
      } else {
        showToast(data.message || "Failed to update item", 'error');
      }
    } catch (err: any) {
      console.error(err);
      showToast(err?.message === "Failed to fetch" ? "Network error: The image size might be too large or the server is offline." : "Something went wrong: " + (err?.message || err), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTogglePublish = async (id: number) => {
    const token = localStorage.getItem("token");

    try {
      const res = await fetch(`${API}/items/${id}/publish`, {
        method: "PUT",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setItems(items.map(item => item.id === id ? data.item : item));
        localStorage.setItem('shopply_item_update', Date.now().toString());
      } else {
        showToast("Failed to toggle publish status", "error");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteItem = async (id: number) => {
    const token = localStorage.getItem("token");

    try {
      const res = await fetch(`${API}/items/${id}`, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        setItems(items.filter(item => item.id !== id));
        localStorage.setItem('shopply_item_update', Date.now().toString());
      } else {
        showToast("Failed to delete item", "error");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDeleteModal(null);
    }
  };

  if (!ready || !user) {
    return (
      <div style={{ minHeight: "100vh", background: "#f5f7ff", padding: "40px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", gap: 32 }}>
          <Skeleton style={{ width: 240, height: "calc(100vh - 80px)", borderRadius: 24 }} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 24 }}>
            <Skeleton style={{ width: "100%", height: 140, borderRadius: 24 }} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24 }}>
              <SkeletonStatCard />
              <SkeletonStatCard />
              <SkeletonStatCard />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const initials = user.name ? user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "??";

  const memberSince = new Date(user.created_at).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric"
  });

  const publishedCount = items.filter(i => i.is_published).length;
  const unpublishedCount = items.filter(i => !i.is_published).length;

  const IconOrders = () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path d="M6 2L3 7v13a2 2 0 002 2h14a2 2 0 002-2V7l-3-5h14z" /><line x1="3" y1="7" x2="21" y2="7" /><path d="M16 11a4 4 0 01-8 0" /></svg>;
  const IconSearch = () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>;
  const IconStore = () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>;
  const IconSettings = () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" /></svg>;

  const pendingSellerOrdersCount = sellerOrders.filter(o => o.status === 'pending').length;

  const formatPriceDisplay = (item: ShopItem) => {
    const basePrice = parseFloat(item.price) || 0;
    let prices: number[] = [basePrice];
    if (item.attributes?.variant_prices && item.attributes.variant_prices.length > 0) {
      const vPrices = item.attributes.variant_prices.map((p: any) => parseFloat(p)).filter((p: number) => !isNaN(p) && p > 0);
      if (vPrices.length > 0) {
        prices = prices.concat(vPrices);
      }
    }
    const validPrices = prices.filter((p: number) => p > 0);
    if (validPrices.length === 0) return `₱0.00`;
    const minPrice = Math.min(...validPrices);
    const maxPrice = Math.max(...validPrices);

    if (minPrice !== maxPrice) {
      return `₱${minPrice.toFixed(2)} - ₱${maxPrice.toFixed(2)}`;
    }
    return `₱${minPrice.toFixed(2)}`;
  };

  const sidebarItemsList: { id: SidebarTab; icon: React.ReactNode; label: string }[] = [
    { id: "profile", icon: <IconUser />, label: "Your Profile" },
    { id: "orders", icon: <IconOrders />, label: "Your Orders" },
    { id: "notifications", icon: <IconBell />, label: "Notifications" },
    { id: "messages", icon: <IconChat />, label: "Messages" },
    { id: "store-orders", icon: <IconStore />, label: "Store Orders" },
    { id: "my-items", icon: <IconBox />, label: "My Items" },
    { id: "add-item", icon: <IconPlus />, label: "Add New Item" },
    { id: "settings", icon: <IconSettings />, label: "Settings" },
    { id: "shop", icon: <IconShop />, label: "Public Shop" },
  ];

  return (
    <>
      <style suppressHydrationWarning>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#f5f7ff;font-family:'Inter',sans-serif}
        .root{min-height:100vh;background:linear-gradient(135deg,#f0f4ff 0%,#faf5ff 50%,#f0f9ff 100%)}
        .nav{background:#fff;border-bottom:1px solid #e2e8f0;padding:0 32px;height:64px;
          display:flex;align-items:center;justify-content:space-between;
          box-shadow:0 1px 8px rgba(0,0,0,.04);position:sticky;top:0;z-index:50}
        .nav-logo{display:flex;align-items:center;gap:10px;text-decoration:none}
        .logo-text{font-size:17px;font-weight:700;color:#0f172a;letter-spacing:-.3px}
        .nav-right{display:flex;align-items:center;gap:16px}
        .nav-name{font-size:14px;color:#64748b;font-weight:500}
        .nav-link{font-size:13px;font-weight:500;color:#64748b;text-decoration:none;
          padding:6px 12px;border-radius:8px;transition:all .2s}
        .nav-link:hover{color:#7c3aed;background:rgba(124,58,237,.06)}
        .shop-link{font-size:13px;font-weight:600;color:#7c3aed;text-decoration:none;
          padding:6px 12px;border-radius:8px;background:rgba(124,58,237,.1);transition:all .2s}
        .shop-link:hover{background:rgba(124,58,237,.2)}
        .logout-btn{padding:8px 16px;background:linear-gradient(135deg,#7c3aed,#2563eb);
          border:none;border-radius:8px;color:#fff;font-size:13px;font-weight:600;
          font-family:'Inter',sans-serif;cursor:pointer;transition:all .2s}
        .logout-btn:hover{opacity:.85;transform:translateY(-1px)}
        
        .cart-nav-icon{position:relative;display:flex;align-items:center;justify-content:center;
          width:40px;height:40px;border-radius:50%;color:#64748b;transition:all .2s;text-decoration:none}
        .cart-nav-icon:hover{background:#f1f5f9;color:#7c3aed}
        .cart-badge{position:absolute;top:2px;right:0;background:#ef4444;color:#fff;
          font-size:10px;font-weight:700;width:18px;height:18px;border-radius:50%;
          display:flex;align-items:center;justify-content:center;border:2px solid #fff}

        .dashboard-layout{display:flex;max-width:1200px;margin:0 auto;padding:24px;gap:32px;min-height:calc(100vh - 64px)}

        .sidebar{background:#fff;border-radius:24px;padding:16px 12px;box-shadow:0 10px 40px rgba(0,0,0,0.03);
          border:1px solid #f1f5f9;display:flex;flex-direction:column;gap:6px;height:fit-content;position:sticky;top:32px;width:260px;flex-shrink:0;transition:width 0.3s cubic-bezier(0.4, 0, 0.2, 1), padding 0.3s ease;z-index:60}
        .sidebar.collapsed{width:76px;padding:16px 8px}
        
        .sidebar-toggle{position:absolute;top:20px;right:-14px;width:28px;height:28px;border-radius:50%;
          background:#fff;border:1px solid #e2e8f0;box-shadow:0 4px 10px rgba(0,0,0,0.06);
          display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:70;
          transition:all 0.2s;color:#64748b}
        .sidebar-toggle:hover{color:#7c3aed;background:#f8fafc;transform:scale(1.08)}
        
        .sidebar-item{display:flex;align-items:center;gap:14px;padding:12px 18px;border-radius:14px;font-size:14px;font-weight:600;color:#64748b;cursor:pointer;background:none;border:none;transition:all 0.2s ease;text-align:left;width:100%;box-sizing:border-box}
        .sidebar-item:hover{background:#f8fafc;color:#7c3aed}
        .sidebar-item.active{background:linear-gradient(135deg,#7c3aed,#2563eb);color:#fff;
          box-shadow:0 8px 16px rgba(124,58,237,.15)}
        .sidebar-icon{display:flex;align-items:center;justify-content:center;font-size:18px;transition:transform 0.2s ease}
        .sidebar-item.active .sidebar-icon{transform:scale(1.05)}
        
        .sidebar-badge{background:#ef4444;color:#fff;font-size:10px;font-weight:700;padding:1px 6px;border-radius:10px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(239,68,68,0.3)}
        .sidebar-item.active .sidebar-badge{background:#fff;color:#7c3aed;box-shadow:0 2px 6px rgba(0,0,0,0.08)}

        .sidebar-sub-menu{display:flex;flex-direction:column;gap:4px;padding-left:20px;margin-top:6px;position:relative;overflow:hidden;max-height:0;transition:all .3s ease}
        .sidebar-sub-menu.expanded{max-height:500px;margin:8px 0}
        .sidebar-sub-menu::before{content:'';position:absolute;left:20px;top:0;bottom:12px;width:1.5px;background:#e2e8f0}
        
        .sidebar-sub-item{position:relative;display:flex;align-items:center;padding:8px 16px 8px 32px;font-size:13px;font-weight:500;
          color:#64748b;border-radius:10px;border:none;background:none;cursor:pointer;transition:all 0.2s;text-align:left;width:100%}
        .sidebar-sub-item::before{content:'';position:absolute;left:20px;top:50%;width:8px;height:1.5px;background:#e2e8f0}
        .sidebar-sub-item:hover{color:#7c3aed;background:#f8fafc}
        .sidebar-sub-item.active{color:#7c3aed;background:rgba(124,58,237,.06);font-weight:600}

        /* Hover Popup Tooltip Menu when collapsed */
        .sidebar-item-container{position:relative}
        .sidebar.collapsed .sidebar-popup-menu{display:none;position:absolute;left:100%;top:50%;
          transform:translateY(-50%);background:#fff;border-radius:12px;padding:8px;
          box-shadow:0 10px 30px rgba(0,0,0,0.08);border:1px solid #e2e8f0;margin-left:12px;
          z-index:100;min-width:140px;flex-direction:column;gap:4px}
        .sidebar.collapsed .sidebar-item-container:hover .sidebar-popup-menu{display:flex}
        .sidebar.collapsed .sidebar-sub-item{padding-left:14px}
        .sidebar.collapsed .sidebar-sub-item::before{display:none}
        .sidebar.collapsed .sidebar-sub-menu::before{display:none}
        .sidebar.collapsed .sidebar-sub-menu{padding-left:0}
        
        .sidebar-section{display:flex;flex-direction:column;gap:4px;width:100%}ght:600}

        .content{flex:1;min-width:0}

        .profile-header{background:linear-gradient(135deg,#fff,#f8fafc);border-radius:20px;padding:32px;
          box-shadow:0 10px 25px rgba(0,0,0,.03);border:1px solid rgba(255,255,255,0.8);margin-bottom:24px;
          display:flex;align-items:center;gap:32px;position:relative;overflow:hidden}
        .profile-header::before{content:'';position:absolute;top:0;right:0;width:300px;height:300px;
          background:radial-gradient(circle, rgba(124,58,237,0.05) 0%, transparent 70%);border-radius:50%;transform:translate(150px, -150px)}
        .profile-avatar{width:100px;height:100px;border-radius:50%;
          background:linear-gradient(135deg,#7c3aed,#2563eb);display:flex;align-items:center;
          justify-content:center;font-size:36px;font-weight:700;color:#fff;flex-shrink:0;
          box-shadow:0 8px 20px rgba(124,58,237,0.2);border:4px solid #fff}
        .profile-info h2{font-size:26px;font-weight:800;color:#0f172a;margin-bottom:6px;letter-spacing:-0.5px}
        .profile-info p{font-size:15px;color:#64748b;font-weight:500}
        .profile-stats{display:grid;grid-template-columns:1fr 1fr;gap:20px 48px;margin-left:auto;background:rgba(255,255,255,0.8);
          padding:24px 40px;border-radius:24px;backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,0.9);box-shadow:0 10px 30px rgba(0,0,0,.02)}
        @media(max-width: 650px) { .profile-stats{grid-template-columns:1fr;gap:16px} }
        .profile-stat{display:flex;align-items:center;gap:12px;font-size:15px;color:#334155}
        .profile-stat-icon{display:flex;align-items:center;justify-content:center;color:#475569}
        .profile-stat-val{color:#ef4444;font-weight:600}
        
        .toast{position:fixed;bottom:32px;right:32px;padding:16px 24px;border-radius:12px;
          color:#fff;font-weight:600;display:flex;align-items:center;gap:12px;z-index:9999;
          box-shadow:0 10px 30px rgba(0,0,0,.2);animation:slideUp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)}
        .toast.success{background:#10b981}
        .toast.error{background:#ef4444}
        @keyframes slideUp{from{transform:translateY(100%) scale(0.9);opacity:0}to{transform:translateY(0) scale(1);opacity:1}}

        .spinner{width:40px;height:40px;border-radius:50%;border:3px solid #e2e8f0;
          border-top-color:#7c3aed;animation:spin .7s linear infinite}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes typingBounce{0%,80%,100%{transform:scale(0.6);opacity:0.4}40%{transform:scale(1);opacity:1}}

        .info-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:24px}
        .info-card{background:#fff;border-radius:16px;padding:24px;
          box-shadow:0 4px 16px rgba(0,0,0,.04);border:1px solid #f1f5f9}
        .info-card-label{font-size:11px;font-weight:600;text-transform:uppercase;color:#94a3b8;
          letter-spacing:.5px;margin-bottom:12px}
        .info-card-value{font-size:15px;font-weight:600;color:#0f172a;word-break:break-all}
        .badge{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;
          border-radius:20px;font-size:12px;font-weight:600}
        .badge-green{background:#dcfce7;color:#16a34a}
        .dot-live{width:6px;height:6px;border-radius:50%;background:#16a34a;display:inline-block}

        .add-form{background:#fff;border-radius:16px;padding:32px;
          box-shadow:0 2px 12px rgba(0,0,0,.05);border:1px solid #f1f5f9}
        .add-form h3{font-size:18px;font-weight:700;color:#0f172a;margin-bottom:24px}
        .form-row{display:grid;grid-template-columns:1fr 1fr;gap:24px}
        .form-group{margin-bottom:24px}
        .form-label{display:block;font-size:13px;font-weight:500;color:#64748b;margin-bottom:8px}
        .form-input,.form-textarea{width:100%;padding:12px 14px;border:1.5px solid #e2e8f0;
          border-radius:10px;font-family:'Inter',sans-serif;font-size:14px;color:#0f172a;transition:all .2s;
          background:#f8fafc}
        .form-input:focus,.form-textarea:focus{outline:none;border-color:#7c3aed;
          box-shadow:0 0 0 3px rgba(124,58,237,.1);background:#fff}
        .form-textarea{resize:vertical;min-height:100px}

        .image-upload{border:2px dashed #e2e8f0;border-radius:12px;padding:32px;text-align:center;
          cursor:pointer;transition:all .2s;background:#fafbfc}
        .image-upload:hover{border-color:#7c3aed;background:#faf5ff}
        .image-upload.has-image{padding:12px;border-style:solid;border-color:#7c3aed}
        .image-preview{width:100%;max-height:200px;object-fit:cover;border-radius:8px}
        .upload-icon{font-size:32px;margin-bottom:8px;display:block}
        .upload-text{font-size:14px;color:#64748b;margin-bottom:4px}
        .upload-hint{font-size:12px;color:#94a3b8}

        .submit-btn{width:100%;padding:14px;background:linear-gradient(135deg,#7c3aed,#2563eb);color:#fff;
          border:none;border-radius:10px;font-size:15px;font-weight:600;cursor:pointer;transition:all .2s;
          font-family:'Inter',sans-serif;box-shadow:0 4px 14px rgba(124,58,237,.3)}
        .submit-btn:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 6px 20px rgba(124,58,237,.4)}
        .submit-btn:disabled{opacity:.7;cursor:not-allowed}

        .items-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:40px}
        .item-card{background:#fff;border-radius:20px;overflow:hidden;
          box-shadow:0 4px 20px rgba(0,0,0,.06);border:1px solid #f1f5f9;transition:all .25s}
        .item-card:hover{transform:translateY(-5px);box-shadow:0 12px 32px rgba(0,0,0,.1)}
        .item-card-img{width:100%;height:200px;object-fit:cover;display:block}
        .item-card-placeholder{width:100%;height:200px;background:linear-gradient(135deg,#f1f5f9,#e2e8f0);
          display:flex;align-items:center;justify-content:center;font-size:40px;color:#cbd5e1}
        .item-card-body{padding:24px}
        .item-card-name{font-size:18px;font-weight:700;color:#0f172a;margin-bottom:12px}
        .item-card-desc{font-size:14px;color:#94a3b8;margin-bottom:20px;line-height:1.6;
          display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
        .item-card-footer{display:flex;align-items:center;justify-content:space-between;padding-top:20px;border-top:1px solid #f8fafc;margin-top:auto}
        .item-card-price{font-size:20px;font-weight:800;color:#10b981;letter-spacing:-0.5px}
        .toggle-btn{height:36px;padding:0 16px;border-radius:10px;font-size:13px;font-weight:600;
          border:none;cursor:pointer;transition:all .2s;display:inline-flex;align-items:center;justify-content:center;gap:8px}
        .toggle-publish{background:#dcfce7;color:#16a34a;box-shadow:0 2px 4px rgba(22,163,74,0.08)}
        .toggle-publish:hover{background:#bbf7d0;transform:translateY(-1px)}
        .toggle-unpublish{background:#fee2e2;color:#ef4444;box-shadow:0 2px 4px rgba(239,68,68,0.08)}
        .toggle-unpublish:hover{background:#fecaca;transform:translateY(-1px)}
        .pub-badge{position:absolute;top:16px;right:16px;padding:6px 12px;border-radius:20px;
          font-size:11px;font-weight:600}
        .pub-badge-live{background:rgba(22,163,74,.9);color:#fff}
        .pub-badge-draft{background:rgba(100,116,139,.8);color:#fff}

        .empty-state{text-align:center;padding:80px 20px;background:#fff;border-radius:24px;
          border:1px dashed #cbd5e1}
        .empty-icon{font-size:48px;margin-bottom:16px}
        .empty-title{font-size:18px;font-weight:600;color:#0f172a;margin-bottom:8px}
        .empty-desc{font-size:14px;color:#94a3b8}

        /* Orders UI */
        .orders-container{display:flex;flex-direction:column;gap:24px;flex:1}
        .orders-main{flex:1;display:flex;flex-direction:column;gap:24px}
        .order-search-container{background:#fff;padding:16px 24px;border-radius:16px;
          box-shadow:0 2px 8px rgba(0,0,0,.05);display:flex;align-items:center;justify-content:space-between}
        .order-search{position:relative;display:flex;align-items:center}
        .order-search input{padding:10px 36px 10px 18px;border:1px solid #e2e8f0;border-radius:24px;
          font-size:14px;outline:none;width:320px;transition:border .2s}
        .order-search input:focus{border-color:#ee4d2d}
        .order-search svg{position:absolute;right:12px;color:#94a3b8}
        
        .order-guarantee-banner{display:flex;align-items:center;gap:12px;background:#f0fdf4;
          border:1px solid #bbf7d0;color:#16a34a;padding:16px;border-radius:12px;font-size:14px}
        
        .orders-list{display:flex;flex-direction:column;gap:20px}
        .order-card{background:#fff;border-radius:16px;box-shadow:0 2px 12px rgba(0,0,0,.05);
          overflow:hidden}
        .order-card-header{padding:16px 24px;border-bottom:1px solid #f1f5f9;display:flex;
          align-items:center;justify-content:space-between;font-size:14px}
        .order-seller{display:flex;align-items:center;gap:8px;font-weight:600;color:#333}
        .order-status{color:#ee4d2d;font-weight:600}
        .order-card-body{padding:20px 24px;display:flex;gap:16px;align-items:center}
        .order-img{width:90px;height:90px;object-fit:cover;border-radius:12px;border:1px solid #f1f5f9;flex-shrink:0}
        .order-img-placeholder{width:90px;height:90px;background:#f8fafc;display:flex;
          align-items:center;justify-content:center;color:#cbd5e1;border-radius:12px;border:1px solid #f1f5f9;flex-shrink:0}
        .order-info{flex:1;display:flex;flex-direction:column;gap:4px}
        .order-name{font-size:15px;color:#0f172a;line-height:1.4}
        .order-qty{font-size:13px;color:#64748b}
        .order-price{font-size:14px;color:#0f172a}
        .order-card-footer{padding:16px 20px;background:#fafaf9;border-top:1px dashed #e2e8f0;
          display:flex;align-items:center;justify-content:flex-end;gap:12px}
        .order-total-label{font-size:13px;color:#64748b}
        .order-total-price{font-size:20px;font-weight:600;color:#ee4d2d}

        /* Seller Notifications */
        .notification-banner{background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;
          padding:12px 32px;display:flex;align-items:center;justify-content:space-between;
          box-shadow:0 4px 12px rgba(245,158,11,.2);position:sticky;top:64px;z-index:45;width:100%}
        .notification-banner span{font-weight:500;font-size:14px;display:flex;align-items:center;gap:8px}
        .notification-action{background:#fff;color:#d97706;border:none;padding:6px 16px;
          border-radius:20px;font-size:13px;font-weight:600;cursor:pointer;transition:all .2s}
        .notification-action:hover{background:#fef3c7}
        
        .action-btns{display:flex;gap:8px;margin-top:12px}
        .btn-accept{background:#10b981;color:#fff;border:none;padding:8px 16px;border-radius:4px;
          font-weight:500;cursor:pointer;font-size:13px}
        .btn-accept:hover{background:#059669}
        .btn-reject{background:#fff;color:#ef4444;border:1px solid #ef4444;padding:8px 16px;border-radius:4px;
          font-weight:500;cursor:pointer;font-size:13px}
        .btn-reject:hover{background:#fef2f2}
        
        .btn-print{background:#f8fafc;color:#475569;border:1px solid #cbd5e1;padding:6px 12px;border-radius:4px;
          font-weight:500;cursor:pointer;font-size:12px;display:inline-flex;align-items:center;gap:6px}
        .btn-print:hover{background:#f1f5f9}

        /* Modal */
        .modal-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.5);
          display:flex;align-items:center;justify-content:center;z-index:9999}
        .receipt-modal{background:#fff;width:400px;border-radius:12px;padding:30px;box-shadow:0 20px 25px -5px rgba(0,0,0,.1);
          position:relative;max-height:90vh;overflow-y:auto}
        .receipt-header{text-align:center;margin-bottom:24px;padding-bottom:16px;border-bottom:2px dashed #e2e8f0}
        .receipt-logo{font-size:24px;font-weight:800;color:#7c3aed;margin-bottom:8px}
        .receipt-title{font-size:18px;font-weight:600;color:#0f172a}
        .receipt-date{font-size:12px;color:#64748b;margin-top:4px}
        .receipt-row{display:flex;justify-content:space-between;margin-bottom:12px;font-size:14px}
        .receipt-label{color:#64748b}
        .receipt-value{font-weight:500;color:#0f172a;text-align:right}
        .receipt-total{display:flex;justify-content:space-between;margin-top:20px;padding-top:16px;
          border-top:2px dashed #e2e8f0;font-size:18px;font-weight:700}
        .receipt-actions{display:flex;gap:12px;margin-top:30px}

        @media print {
          @page { margin: 0; size: 4in 6in; }
          html, body { height: 100vh !important; overflow: hidden !important; margin: 0 !important; padding: 0 !important; background: white !important; }
          body * { visibility: hidden !important; }
          .modal-overlay { background: transparent !important; position: absolute; left: 0; top: 0; width: 100%; height: 100%; align-items: flex-start; }
          .receipt-modal, .receipt-modal * { visibility: visible !important; }
          .receipt-modal { position: absolute !important; left: 0 !important; top: 0 !important; box-shadow: none !important; margin: 0 !important; width: 100% !important; max-width: 4in !important; padding: 12px 16px !important; border-radius: 0 !important; max-height: none !important; overflow: hidden !important; height: 100% !important; }
          .receipt-header { margin-bottom: 8px !important; padding-bottom: 8px !important; }
          .receipt-logo { font-size: 18px !important; margin-bottom: 2px !important; }
          .receipt-title { font-size: 14px !important; }
          .receipt-row { margin-bottom: 6px !important; font-size: 11px !important; }
          .receipt-items-container { margin: 12px 0 !important; padding-top: 8px !important; }
          .receipt-total { margin-top: 12px !important; padding-top: 8px !important; font-size: 14px !important; }
          .receipt-qr-container { margin-top: 12px !important; }
          .receipt-qr-container img { width: 70px !important; height: 70px !important; margin-bottom: 4px !important; }
          .receipt-qr-container div { font-size: 10px !important; letter-spacing: 2px !important; }
          .no-print { display: none !important; }
        }

        @media(max-width:768px){
          .dashboard-layout{flex-direction:row !important;padding:12px;gap:12px}
          .sidebar{
            width:72px !important;
            position:sticky !important;
            top:76px;
            height:calc(100vh - 90px);
            z-index:90;
            padding:12px 6px;
            border-radius:16px;
          }
          .sidebar.mobile-expanded{
            position:fixed !important;
            top:0 !important;
            left:0 !important;
            bottom:0 !important;
            width:280px !important;
            height:100vh !important;
            box-shadow:0 20px 40px rgba(0,0,0,0.15);
            z-index:100;
            padding:24px 16px;
            padding-top:max(24px, env(safe-area-inset-top, 24px));
            border-radius:0 24px 24px 0 !important;
          }
          
          .sidebar-backdrop{
            position:fixed;
            inset:0;
            background:rgba(15,23,42,0.3);
            backdrop-filter:blur(4px);
            z-index:95;
            animation:fadeIn 0.2s ease-out;
          }
          
          .profile-header{flex-direction:column;text-align:center}
          .profile-stats{margin-left:0}
          .form-row{grid-template-columns:1fr}
          .items-grid{grid-template-columns:1fr}
          
          /* Nav mobile tweaks */
          .nav{padding:0 12px !important}
          .nav-right{gap:8px !important}
          .nav-name{display:none !important}
          .logo-text{font-size:15px}
          
          /* Settings responsive styles */
          .settings-stats-grid{grid-template-columns:1fr !important;gap:12px !important}
          .my-stats-grid{grid-template-columns:repeat(2, 1fr) !important;gap:12px !important}
          .cache-control-grid{grid-template-columns:1fr !important;gap:10px !important}
          .perf-actions-grid{grid-template-columns:1fr !important;gap:16px !important}
          .perf-tips-grid{grid-template-columns:1fr !important;gap:12px !important}
          .flex-responsive-row{flex-direction:column !important;align-items:flex-start !important;gap:12px !important}
          .flex-responsive-row button{width:100% !important}
        }
        
        /* Desktop defaults for Settings page */
        .settings-stats-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:28px}
        .my-stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
        .cache-control-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}
        .perf-actions-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px;margin-bottom:24px}
        .perf-tips-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}
        .flex-responsive-row{display:flex;align-items:center;justify-content:space-between}
      `}</style>

      <div className="root">
        <nav className="nav">
          <Link href="/dashboard" className="nav-logo">
            <svg width="30" height="30" viewBox="0 0 200 260" xmlns="http://www.w3.org/2000/svg">
              <rect x="8" y="68" width="184" height="176" rx="24" fill="none" stroke="#7c3aed" strokeWidth="14" />
              <path d="M56 70 Q56 18 100 18 Q144 18 144 70" fill="none" stroke="#7c3aed" strokeWidth="14" strokeLinecap="round" />
              <circle cx="68" cy="70" r="7" fill="#7c3aed" />
              <circle cx="132" cy="70" r="7" fill="#7c3aed" />
              <path d="M24 192 Q36 150 70 145 Q104 140 110 170 Q116 198 150 192 Q170 187 176 162"
                fill="none" stroke="#FFD166" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M161 145 L176 162 L157 175" fill="none" stroke="#FFD166" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="logo-text">Shopply</span>
          </Link>
          <div className="nav-right">
            <span className="nav-name">Hi, {user.name.split(" ")[0]} 👋</span>
            <Link href="/shop" className="shop-link" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><IconShop /> Shop</Link>
            <Link href="/cart" className="cart-nav-icon" style={{ marginRight: 8 }}>
              <IconCart />
              {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
            </Link>
            <button className="logout-btn" onClick={handleLogout}>Logout</button>
          </div>
        </nav>

        <div className="dashboard-layout">
          {/* BACKDROP OVERLAY FOR MOBILE DRAW */}
          {!isSidebarCollapsed && (
            <div className="sidebar-backdrop no-print" onClick={toggleSidebar} />
          )}

          {/* SIDEBAR */}
          <aside className={`sidebar no-print ${isSidebarCollapsed ? 'collapsed' : 'mobile-expanded'}`}>
            
            {/* PROFILE HEADER IN SIDEBAR */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', marginBottom: 12, borderBottom: '1px solid #f1f5f9', position: 'relative' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#2563eb)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, flexShrink: 0, overflow: 'hidden' }}>
                {user?.avatar ? (
                  <img src={user.avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  user?.name ? user.name.charAt(0).toUpperCase() : 'U'
                )}
              </div>
              {!isSidebarCollapsed && (
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name || 'User'}</div>
                  <div style={{ fontSize: 10, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email || 'member@shopply.com'}</div>
                </div>
              )}
              
              {/* Expand/Collapse Toggle Button */}
              <button className="sidebar-toggle" onClick={toggleSidebar} style={{ outline: 'none' }} title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}>
                {isSidebarCollapsed ? (
                  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" /></svg>
                ) : (
                  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" /></svg>
                )}
              </button>
            </div>

            {/* CATEGORIZED ITEMS */}
            {[
              {
                title: "Main Menu",
                items: ["profile", "orders", "shop"]
              },
              {
                title: "Seller Hub",
                items: ["store-orders", "my-items", "add-item"]
              },
              {
                title: "Application",
                items: ["notifications", "messages", "settings"]
              }
            ].map((section, idx) => {
              const visibleItems = sidebarItemsList.filter(item => section.items.includes(item.id));
              if (visibleItems.length === 0) return null;
              return (
                <div key={idx} className="sidebar-section" style={{ marginBottom: 12 }}>
                  {!isSidebarCollapsed && (
                    <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px', padding: '4px 14px 4px', marginBottom: 4 }}>
                      {section.title}
                    </div>
                  )}
                  {visibleItems.map(si => (
                    <div key={si.id} className="sidebar-item-container">
                      <button
                        className={`sidebar-item ${activeTab === si.id ? "active" : ""}`}
                        onClick={() => {
                          if (si.id === "shop") {
                            router.push("/shop");
                          } else if (si.id === 'orders') {
                            if (isSidebarCollapsed) {
                              toggleSidebar();
                              setOrdersExpanded(true);
                            } else {
                              if (activeTab !== 'orders') {
                                setActiveTab('orders');
                                setOrdersExpanded(true);
                              } else {
                                setOrdersExpanded(!ordersExpanded);
                              }
                            }
                          } else {
                            setActiveTab(si.id);
                          }
                        }}
                      >
                        <span className="sidebar-icon">{si.icon}</span>
                        {!isSidebarCollapsed && <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{si.label}</span>}
                        {si.id === 'notifications' && pendingSellerOrdersCount > 0 && (
                          <span className="sidebar-badge">{pendingSellerOrdersCount}</span>
                        )}
                        {si.id === 'messages' && chatConversations.reduce((acc, c) => acc + (c.unread_count || 0), 0) > 0 && (
                          <span className="sidebar-badge">{chatConversations.reduce((acc, c) => acc + (c.unread_count || 0), 0)}</span>
                        )}
                        {!isSidebarCollapsed && si.id === 'orders' && (
                          <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24" style={{ transform: ordersExpanded ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform .3s ease', opacity: 0.8 }}>
                            <path d="M6 9l6 6 6-6" />
                          </svg>
                        )}
                      </button>

                      {/* Expanded Submenu */}
                      {!isSidebarCollapsed && si.id === "orders" && (
                        <div className={`sidebar-sub-menu ${ordersExpanded ? 'expanded' : ''}`}>
                          {["all", "processing", "shipped", "delivered", "returns"].map(tab => (
                            <button
                              key={tab}
                              className={`sidebar-sub-item ${activeTab === 'orders' && orderTab === tab ? "active" : ""}`}
                              onClick={() => {
                                setActiveTab('orders');
                                setOrderTab(tab);
                              }}
                            >
                              {tab === "all" ? "All orders" : tab.charAt(0).toUpperCase() + tab.slice(1).replace("-", " ")}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Collapsed Hover Popup Tooltip Menu */}
                      {isSidebarCollapsed && si.id === "orders" && (
                        <div className="sidebar-popup-menu no-print">
                          <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', padding: '4px 10px', borderBottom: '1px solid #f1f5f9', marginBottom: 4 }}>Orders</div>
                          {["all", "processing", "shipped", "delivered", "returns"].map(tab => (
                            <button
                              key={tab}
                              className={`sidebar-sub-item ${activeTab === 'orders' && orderTab === tab ? "active" : ""}`}
                              onClick={() => {
                                setActiveTab('orders');
                                setOrderTab(tab);
                              }}
                            >
                              {tab === "all" ? "All orders" : tab.charAt(0).toUpperCase() + tab.slice(1).replace("-", " ")}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </aside>

          {/* CONTENT */}
          <div className="content">
            {/* ——— PROFILE HEADER (Always visible) ——— */}
            <div className="profile-header">
              <div className="profile-avatar" style={{ position: 'relative', overflow: 'hidden' }}>
                {user.avatar ? (
                  <img src={`${STORAGE_URL}/${user.avatar}`} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%', position: 'absolute', top: 0, left: 0 }} />
                ) : initials}
              </div>
              <div className="profile-info">
                <p style={{ color: '#7c3aed', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Welcome back,</p>
                <h2>{user.name}</h2>
                <p>{user.email}</p>
              </div>
              <div className="profile-stats">
                <div className="profile-stat">
                  <span className="profile-stat-icon"><IconStorefront /></span>
                  <span>Products: <span className="profile-stat-val">{items.length}</span></span>
                </div>
                <div className="profile-stat">
                  <span className="profile-stat-icon"><IconFollowers /></span>
                  <span>Followers: <span className="profile-stat-val">{user.followers_count !== undefined ? user.followers_count : 0}</span></span>
                </div>
                <div className="profile-stat">
                  <span className="profile-stat-icon"><IconFollowing /></span>
                  <span>Following: <span className="profile-stat-val">{user.following_count !== undefined ? user.following_count : 0}</span></span>
                </div>
                <div className="profile-stat">
                  <span className="profile-stat-icon"><IconStar /></span>
                  <span>Rating: <span className="profile-stat-val">{user.reviews_avg_rating ? user.reviews_avg_rating.toFixed(1) : "0.0"} ({user.reviews_count !== undefined ? user.reviews_count : 0} Rating)</span></span>
                </div>
              </div>
            </div>


            {/* ——— PROFILE TAB ——— */}
            {activeTab === "profile" && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div className="info-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
                  <div className="info-card">
                    <div className="info-card-label">Profile Settings</div>
                    <form onSubmit={handleUpdateProfile} style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 20 }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ position: 'relative', width: 100, height: 100, margin: '0 auto 16px' }}>
                          <div className="profile-avatar" style={{ width: 100, height: 100, fontSize: 32 }}>
                            {avatarPreview ? (
                              <img src={avatarPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                            ) : user.avatar ? (
                              <img src={`${STORAGE_URL}/${user.avatar}`} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                            ) : initials}
                          </div>
                          <label htmlFor="avatar-upload" style={{ position: 'absolute', bottom: 0, right: 0, background: '#fff', padding: 6, borderRadius: '50%', boxShadow: '0 2px 8px rgba(0,0,0,.15)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e2e8f0' }}>
                            <IconPlus />
                          </label>
                          <input
                            id="avatar-upload"
                            type="file"
                            hidden
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setAvatarFile(file);
                                setAvatarPreview(URL.createObjectURL(file));
                              }
                            }}
                          />
                        </div>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Display Name</label>
                        <input
                          type="text"
                          className="form-input"
                          value={profileName}
                          onChange={(e) => setProfileName(e.target.value)}
                        />
                      </div>

                      <button type="submit" className="submit-btn" disabled={updatingProfile}>
                        {updatingProfile ? 'Saving Changes...' : 'Save Profile Changes'}
                      </button>
                    </form>
                  </div>

                  <div className="info-card">
                    <div className="info-card-label">Account Information</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
                      <div className="info-row">
                        <span className="info-card-label">Email Address</span>
                        <div className="info-card-value">{user.email} <span className="badge badge-green" style={{ fontSize: 10, marginLeft: 8 }}>Verified</span></div>
                      </div>
                      <div className="info-row">
                        <span className="info-card-label">Member Since</span>
                        <div className="info-card-value">{new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
                      </div>
                      <div className="info-row">
                        <span className="info-card-label">Account Status</span>
                        <div className="info-card-value"><span className="badge badge-green">Active</span></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ——— ORDERS TAB ——— */}
            {activeTab === "orders" && (
              <div className="orders-container">
                <div className="orders-main">
                  <div className="order-search-container">
                    <div className="order-guarantee-banner" style={{ background: 'none', border: 'none', padding: 0 }}>
                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><polyline points="9 12 11 14 15 10" /></svg>
                      <strong>Order guarantee</strong>
                    </div>
                    <div className="order-search">
                      <input
                        type="text"
                        placeholder="Item name / Order ID"
                        value={orderSearch}
                        onChange={e => setOrderSearch(e.target.value)}
                      />
                      <IconSearch />
                    </div>
                  </div>

                  <div className="orders-list">
                    {orders.length === 0 ? (
                      <div className="empty-state">
                        <div className="empty-title">No orders found</div>
                        <div className="empty-desc">When you buy an item, it will appear here.</div>
                      </div>
                    ) : (
                      orders
                        .filter(o => {
                          if (orderTab === 'all') return true;
                          if (orderTab === 'processing' && ['pending', 'processing'].includes(o.status)) return true;
                          if (orderTab === 'shipped' && o.status === 'shipped') return true;
                          if (orderTab === 'delivered' && ['delivered', 'completed'].includes(o.status)) return true;
                          if (orderTab === 'returns' && ['cancelled', 'returns'].includes(o.status)) return true;
                          return false;
                        })
                        .filter(o => o.item.name.toLowerCase().includes(orderSearch.toLowerCase()))
                        .map(order => (
                          <div key={order.id} className="order-card">
                            <div className="order-card-header">
                              <span className="order-seller"><svg width="16" height="16" fill="none" stroke="#ee4d2d" strokeWidth="2" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg> {order.seller.name}</span>
                              <span className="order-status">{order.status.toUpperCase()}</span>
                            </div>
                            <div className="order-card-body">
                              {order.item.image ? (
                                <img src={`${STORAGE_URL}/${order.item.image}`} alt={order.item.name} className="order-img" />
                              ) : (
                                <div className="order-img-placeholder"><IconBox /></div>
                              )}
                              <div className="order-info">
                                <div className="order-name">{order.item.name}</div>
                                <div className="order-qty">x{order.quantity}</div>
                                {order.variation && <div className="order-qty" style={{ color: '#7c3aed', fontWeight: 600 }}>Variation: {order.variation}</div>}
                              </div>
                              <div className="order-price">₱{parseFloat(order.price).toFixed(2)}</div>
                            </div>
                            <div className="order-card-footer">
                              <div className="order-total-label">Order Total:</div>
                              <div className="order-total-price">₱{(parseFloat(order.price) * order.quantity).toFixed(2)}</div>
                              {order.status === 'shipped' && (
                                <button
                                  onClick={() => handleReceiveOrder(order.id)}
                                  style={{ marginLeft: 16, background: '#ee4d2d', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                                >
                                  Mark as Received
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ——— NOTIFICATIONS TAB ——— */}
            {activeTab === "notifications" && (
              <div className="orders-container">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                  <div>
                    <h2 style={{ fontSize: 20, color: '#0f172a' }}>Notifications</h2>
                    <p style={{ color: '#64748b', fontSize: 14 }}>Stay updated on your store activity and order statuses.</p>
                  </div>
                </div>

                <div className="orders-list">
                  {pendingSellerOrdersCount === 0 && orders.filter(o => o.status === 'shipped').length === 0 ? (
                    <div className="empty-state" style={{ marginTop: 20 }}>
                      <div className="empty-icon" style={{ color: '#cbd5e1' }}><IconBell /></div>
                      <div className="empty-title">No new notifications</div>
                      <div className="empty-desc">You&apos;re all caught up! Check back later for updates on your orders and store activity.</div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      {pendingSellerOrdersCount > 0 && (
                        <div className="order-card" style={{ borderLeft: '4px solid #f59e0b', padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#fef3c7', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <IconStore />
                            </div>
                            <div>
                              <h4 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>New Store Orders Pending Approval</h4>
                              <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>
                                You have <strong>{pendingSellerOrdersCount}</strong> order{pendingSellerOrdersCount > 1 ? 's' : ''} waiting for your review. Please accept or reject to proceed with fulfillment.
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => setActiveTab('store-orders')}
                            style={{ background: '#7c3aed', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 10, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(124,58,237,0.2)', transition: 'all .2s', whiteSpace: 'nowrap' }}
                          >
                            Review Orders
                          </button>
                        </div>
                      )}

                      {orders.filter(o => o.status === 'shipped').map(order => (
                        <div key={order.id} className="order-card" style={{ borderLeft: '4px solid #3b82f6', padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <IconBox />
                            </div>
                            <div>
                              <h4 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>Order Shipped: {order.item.name}</h4>
                              <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>
                                Your purchased item has been shipped by <strong>{order.seller.name}</strong>. Track your delivery status.
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setActiveTab('orders');
                            }}
                            style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 10, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(59,130,246,0.2)', transition: 'all .2s', whiteSpace: 'nowrap' }}
                          >
                            View Order
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ——— MESSAGES TAB ——— */}
            {activeTab === "messages" && (
              <div className="orders-container">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                  <div>
                    <h2 style={{ fontSize: 20, color: '#0f172a' }}>Messages</h2>
                    <p style={{ color: '#64748b', fontSize: 14 }}>Chat with buyers and customers about your products.</p>
                  </div>
                </div>

                <div style={{
                  width: '100%',
                  height: 600,
                  background: '#fff',
                  borderRadius: 24,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                  border: '1px solid #f1f5f9',
                  display: 'flex',
                  overflow: 'hidden',
                  fontFamily: 'Inter, sans-serif'
                }}>
                  {/* LEFT PANE: CONVERSATIONS */}
                  <div style={{
                    width: 280,
                    borderRight: '1px solid #e2e8f0',
                    background: '#f8fafc',
                    display: 'flex',
                    flexDirection: 'column',
                    flexShrink: 0
                  }}>
                    <div style={{padding: '20px 20px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                      <h3 style={{fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0}}>Chats</h3>
                      <span style={{fontSize: 12, fontWeight: 600, color: '#64748b', background: '#e2e8f0', padding: '4px 10px', borderRadius: 12}}>
                        {chatConversations.length}
                      </span>
                    </div>
                    <div style={{flex: 1, overflowY: 'auto', padding: 12}}>
                      {loadingChatConversations ? (
                        <>
                          <SkeletonChatListItem />
                          <SkeletonChatListItem />
                          <SkeletonChatListItem />
                          <SkeletonChatListItem />
                        </>
                      ) : chatConversations.length === 0 ? (
                        <div style={{textAlign: 'center', padding: '40px 10px', color: '#94a3b8', fontSize: 13}}>
                          No conversations yet. Messages from buyers will appear here!
                        </div>
                      ) : (
                        chatConversations.map(conv => (
                          <div
                            key={conv.user.id}
                            onClick={() => {
                              setChatMessages([]);
                              setLoadingChatMessages(true);
                              setActiveChatUser(conv.user);
                              setTimeout(() => chatInputRef.current?.focus(), 50);
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
                            {conv.user.avatar ? (
                              <img src={`${STORAGE_URL}/${conv.user.avatar}`} alt={conv.user.name} style={{width: 44, height: 44, borderRadius: '50%', objectFit: 'cover'}} />
                            ) : (
                              <div style={{width: 44, height: 44, borderRadius: '50%', background: '#e2e8f0', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16}}>
                                {conv.user.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div style={{flex: 1, minWidth: 0}}>
                              <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4}}>
                                <h4 style={{fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                                  {conv.user.name}
                                </h4>
                                {conv.last_message && (
                                  <span style={{fontSize: 11, color: '#94a3b8'}}>
                                    {new Date(conv.last_message.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
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
                  <div style={{flex: 1, display: 'flex', flexDirection: 'column', background: '#fff', minWidth: 0}}>
                    {activeChatUser ? (
                      <>
                        {/* CHAT HEADER */}
                        <div style={{padding: '16px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                          <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
                            {activeChatUser.avatar ? (
                              <img src={`${STORAGE_URL}/${activeChatUser.avatar}`} alt={activeChatUser.name} style={{width: 40, height: 40, borderRadius: '50%', objectFit: 'cover'}} />
                            ) : (
                              <div style={{width: 40, height: 40, borderRadius: '50%', background: '#e2e8f0', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16}}>
                                {activeChatUser.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <h4 style={{fontSize: 16, fontWeight: 700, color: '#0f172a', margin: '0 0 2px'}}>
                                {activeChatUser.name}
                              </h4>
                              <span style={{fontSize: 12, color: '#10b981', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500}}>
                                <span style={{width: 6, height: 6, borderRadius: '50%', background: '#10b981'}}></span> Active now
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => setActiveChatUser(null)}
                            style={{background: '#f1f5f9', border: 'none', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', cursor: 'pointer'}}
                            title="Close conversation"
                          >
                            ✕
                          </button>
                        </div>

                        {/* CHAT MESSAGES AREA */}
                        <div style={{flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 16, background: '#fff'}}>
                          {loadingChatMessages ? (
                            <>
                              <SkeletonChatMessage />
                              <SkeletonChatMessage />
                            </>
                          ) : chatMessages.length === 0 ? (
                            <div style={{ margin: 'auto 0' }}></div>
                          ) : (
                            chatMessages.map(msg => {
                              const isMe = user ? msg.sender_id === user.id : msg.sender_id !== activeChatUser.id;
                              return (
                                <div
                                  key={msg.id}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'flex-end',
                                    gap: 8,
                                    alignSelf: isMe ? 'flex-end' : 'flex-start',
                                    maxWidth: '75%'
                                  }}
                                >
                                  {!isMe && (
                                    activeChatUser.avatar ? (
                                      <img src={`${STORAGE_URL}/${activeChatUser.avatar}`} alt={activeChatUser.name} style={{width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', marginBottom: 4}} />
                                    ) : (
                                      <div style={{width: 28, height: 28, borderRadius: '50%', background: '#e2e8f0', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, marginBottom: 4}}>
                                        {activeChatUser.name.charAt(0).toUpperCase()}
                                      </div>
                                    )
                                  )}
                                  <div style={{display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start'}}>
                                    <div style={{
                                      background: isMe ? 'linear-gradient(135deg, #7c3aed, #6d28d9)' : '#f1f5f9',
                                      color: isMe ? '#fff' : '#0f172a',
                                      padding: '12px 18px',
                                      borderRadius: isMe ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                                      fontSize: 14,
                                      lineHeight: 1.5,
                                      boxShadow: isMe ? '0 4px 12px rgba(124, 58, 237, 0.2)' : 'none',
                                      wordBreak: 'break-word',
                                      whiteSpace: 'pre-wrap'
                                    }}>
                                      {msg.image && (
                                        <div style={{ marginBottom: msg.message ? 8 : 0 }}>
                                          <img
                                            src={msg.optimistic_preview || `${STORAGE_URL}/${msg.image}`}
                                            alt="Attachment"
                                            style={{ borderRadius: 12, maxWidth: '100%', maxHeight: 240, objectFit: 'cover', display: 'block' }}
                                          />
                                        </div>
                                      )}
                                      {msg.message && <div>{msg.message}</div>}
                                    </div>
                                    <span style={{fontSize: 10, color: '#94a3b8', margin: '4px 4px 0'}}>
                                      {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </span>
                                  </div>
                                </div>
                              );
                            })
                          )}
                          {isOtherUserTyping && activeChatUser && (
                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, alignSelf: 'flex-start', maxWidth: '75%', animation: 'slideIn 0.2s ease' }}>
                              {activeChatUser.avatar ? (
                                <img src={`${STORAGE_URL}/${activeChatUser.avatar}`} alt={activeChatUser.name} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', marginBottom: 4 }} />
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
                          {chatImagePreview && (
                            <div style={{ padding: '12px 24px 0', display: 'flex', alignItems: 'center' }}>
                              <div style={{ position: 'relative', display: 'inline-block' }}>
                                <img src={chatImagePreview} alt="Preview" style={{ height: 80, borderRadius: 8, objectFit: 'cover', border: '2px solid #cbd5e1' }} />
                                <button
                                  type="button"
                                  onClick={() => { setChatImageFile(null); setChatImagePreview(null); }}
                                  style={{ position: 'absolute', top: -6, right: -6, background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}
                                >✕</button>
                              </div>
                            </div>
                          )}
                          <form onSubmit={handleSendMessage} style={{padding: '16px 24px', display: 'flex', gap: 12, alignItems: 'center'}}>
                            <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: '50%', background: '#e2e8f0', color: '#64748b', transition: 'all 0.2s', flexShrink: 0 }}>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={async e => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const compressed = await compressImage(file, 800);
                                    setChatImageFile(compressed);
                                    setChatImagePreview(URL.createObjectURL(compressed));
                                  }
                                  e.target.value = '';
                                }}
                                style={{ display: 'none' }}
                              />
                              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/></svg>
                            </label>
                            <textarea
                              ref={chatInputRef}
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
                                padding: '12px 20px',
                                borderRadius: 20,
                                border: '1px solid #cbd5e1',
                                background: '#fff',
                                fontSize: 14,
                                outline: 'none',
                                color: '#0f172a',
                                fontFamily: 'Inter, sans-serif',
                                resize: 'none',
                                minHeight: 44,
                                maxHeight: 120,
                                lineHeight: 1.4
                              }}
                            />
                            <button
                              type="submit"
                              disabled={!newChatMessage.trim() && !chatImageFile}
                              style={{
                                background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                                color: '#fff',
                                border: 'none',
                                width: 46,
                                height: 46,
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: (!newChatMessage.trim() && !chatImageFile) ? 'not-allowed' : 'pointer',
                                opacity: (!newChatMessage.trim() && !chatImageFile) ? 0.6 : 1,
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
              </div>
            )}

            {/* ——— STORE ORDERS TAB ——— */}
            {activeTab === "store-orders" && (
              <div className="orders-container">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                  <div>
                    <h2 style={{ fontSize: 20, color: '#0f172a' }}>Store Orders</h2>
                    <p style={{ color: '#64748b', fontSize: 14 }}>Manage incoming orders for your products.</p>
                  </div>
                  <button
                    onClick={() => setShowScanner(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#7c3aed', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(124,58,237,.2)' }}
                  >
                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4z" /><path d="M14 14h6v6h-6z" /><path d="M1 1h22v22H1z" /></svg>
                    Scan Receipt to Ship
                  </button>
                </div>

                <div className="orders-list">
                  {sellerOrders.length === 0 ? (
                    <div className="empty-state" style={{ marginTop: 20 }}>
                      <div className="empty-title">No store orders yet</div>
                      <div className="empty-desc">When buyers purchase your items, they will appear here.</div>
                    </div>
                  ) : (
                    sellerOrders.map(order => (
                      <div key={order.id} className="order-card" style={order.status === 'pending' ? { borderLeft: '4px solid #f59e0b' } : {}}>
                        <div className="order-card-header">
                          <span className="order-seller"><IconUser /> Buyer: {order.buyer?.name || 'Unknown'}</span>
                          <span className="order-status" style={{ color: order.status === 'pending' ? '#f59e0b' : order.status === 'processing' ? '#10b981' : order.status === 'cancelled' ? '#ef4444' : '#ee4d2d' }}>
                            {order.status.toUpperCase()}
                          </span>
                        </div>
                        <div className="order-card-body">
                          {order.item.image ? (
                            <img src={`${STORAGE_URL}/${order.item.image}`} alt={order.item.name} className="order-img" />
                          ) : (
                            <div className="order-img-placeholder"><IconBox /></div>
                          )}
                          <div className="order-info">
                            <div className="order-name">{order.item.name}</div>
                            <div className="order-qty">x{order.quantity}</div>
                            {order.variation && <div className="order-qty" style={{ color: '#7c3aed', fontWeight: 600 }}>Variation: {order.variation}</div>}
                            {order.status === 'pending' ? (
                              <div className="action-btns">
                                <button className="btn-accept" onClick={() => handleAcceptOrder(order.id)}>Accept</button>
                                <button className="btn-reject" onClick={() => handleRejectOrder(order.id)}>Reject</button>
                              </div>
                            ) : (
                              <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                                <button className="btn-print" onClick={() => setReceiptOrder(order)}>
                                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>
                                  View Receipt
                                </button>
                                {order.status === 'processing' && (
                                  <button className="btn-accept" onClick={() => handleShipOrder(order.id)} style={{ background: '#3b82f6' }}>
                                    Mark as Shipped
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="order-price">₱{parseFloat(order.price).toFixed(2)}</div>
                        </div>
                        <div className="order-card-footer">
                          <div className="order-total-label">Total Payment:</div>
                          <div className="order-total-price">₱{(parseFloat(order.price) * order.quantity).toFixed(2)}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* ——— MY ITEMS TAB ——— */}
            {activeTab === "my-items" && (
              <>
                {items.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon"><IconBox /></div>
                    <div className="empty-title">No items yet</div>
                    <div className="empty-desc">Click &quot;Add New Item&quot; in the sidebar to create your first product.</div>
                  </div>
                ) : (
                  <div className="items-grid">
                    {items.map(item => (
                      <div key={item.id} className="item-card" style={{ position: 'relative' }}>
                        <div className={`pub-badge ${item.is_published ? 'pub-badge-live' : 'pub-badge-draft'}`}>
                          {item.is_published ? '● Live' : '● Draft'}
                        </div>
                        {item.image ? (
                          <img src={`${STORAGE_URL}/${item.image}`} alt={item.name} className="item-card-img" />
                        ) : (
                          <div className="item-card-placeholder"><IconCamera /></div>
                        )}
                        <div className="item-card-body">
                          <div className="item-card-name">{item.name}</div>
                          <div className="item-card-desc">{item.description || "No description"}</div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                            <span className="item-card-price">{formatPriceDisplay(item)}</span>
                            <span style={{ fontSize: 13, color: '#64748b', background: '#f8fafc', padding: '6px 12px', borderRadius: 20, fontWeight: 600, border: '1px solid #f1f5f9' }}>
                              Stock: <strong style={{ color: '#0f172a' }}>{calculateTotalStock(item)}</strong>
                            </span>
                          </div>
                          <div className="item-card-footer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                            <button
                              onClick={() => handleTogglePublish(item.id)}
                              className={`toggle-btn ${item.is_published ? 'toggle-unpublish' : 'toggle-publish'}`}
                              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, flex: 1, height: 40, borderRadius: 12, fontWeight: 600 }}
                            >
                              {item.is_published ? <><IconEyeOff /> Unpublish</> : <><IconEye /> Publish</>}
                            </button>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button
                                onClick={() => handleEditClick(item)}
                                className="toggle-btn"
                                style={{ background: '#f1f5f9', color: '#475569', width: 40, height: 40, borderRadius: 12, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                title="Edit item"
                              >
                                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                              </button>
                              <button
                                onClick={() => setDeleteModal(item.id)}
                                className="toggle-btn"
                                style={{ background: '#fef2f2', color: '#ef4444', width: 40, height: 40, borderRadius: 12, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                title="Delete item"
                              >
                                <IconTrash />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ——— ADD ITEM TAB ——— */}
            {activeTab === "add-item" && (
              <div className="add-form">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                  <h3 style={{ marginBottom: 0 }}>{editingItem ? "Edit Product" : "Add New Product"}</h3>
                  {editingItem && (
                    <button
                      onClick={() => {
                        setEditingItem(null);
                        setNewItemName("");
                        setNewItemDesc("");
                        setNewItemPrice("");
                        setNewItemStock("1");
                        setNewItemCategory("General");
                        setSelectedSizes([]);
                        setMainImagesState([]);
                        setSpecs([]);
                        setColorVariants([]);
                        setActiveTab("my-items");
                      }}
                      style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>
                <form onSubmit={editingItem ? handleUpdateItem : handleAddItem}>
                  <div className="form-group">
                    <label className="form-label" style={{ marginBottom: 16 }}>Product Category</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
                      {[
                        { val: "General", label: "Gadgets", icon: <IconBox /> },
                        { val: "Electronics", label: "Tech", icon: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg> },
                        { val: "Clothes", label: "Apparel", icon: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.62 1.96V10a2 2 0 002 2h2v8a2 2 0 002 2h8a2 2 0 002-2v-8h2a2 2 0 002-2V5.42a2 2 0 00-1.62-1.96z" /></svg> },
                        { val: "Shoes", label: "Footwear", icon: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 21h18v-7h-4.24l-1.35-2.7a2 2 0 00-1.79-1.3H9a2 2 0 00-2 2V21z" /><path d="M21 14l-4.24-7.42A2 2 0 0015.01 5.5H9a2 2 0 00-2 2V14" /></svg> },
                        { val: "Beauty", label: "Beauty", icon: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 21a9 9 0 100-18 9 9 0 000 18z" /><path d="M12 7v10" /><path d="M8 12h8" /></svg> },
                        { val: "Home", label: "Living", icon: <IconStore /> },
                        { val: "Accessories", label: "Jewelry", icon: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="7" /><polyline points="12 9 12 12 13.5 13.5" /><circle cx="12" cy="12" r="2" /></svg> }
                      ].map(cat => (
                        <div
                          key={cat.val}
                          onClick={() => {
                            setNewItemCategory(cat.val);
                            setSelectedSizes([]);
                          }}
                          style={{
                            padding: '16px 12px',
                            borderRadius: 14,
                            border: `2px solid ${newItemCategory === cat.val ? '#7c3aed' : '#f1f5f9'}`,
                            background: newItemCategory === cat.val ? 'rgba(124,58,237,0.04)' : '#fff',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 10,
                            cursor: 'pointer',
                            transition: 'all .2s',
                            textAlign: 'center'
                          }}
                        >
                          <div style={{
                            width: 36, height: 36, borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: newItemCategory === cat.val ? '#7c3aed' : '#f8fafc',
                            color: newItemCategory === cat.val ? '#fff' : '#64748b',
                            transition: 'all .2s'
                          }}>
                            {cat.icon}
                          </div>
                          <span style={{
                            fontSize: 12, fontWeight: 700,
                            color: newItemCategory === cat.val ? '#7c3aed' : '#64748b'
                          }}>{cat.label}</span>
                          {newItemCategory === cat.val && (
                            <div style={{ position: 'absolute', top: 8, right: 8, color: '#7c3aed' }}>
                              <IconCheck />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid #f1f5f9', margin: '32px 0 24px', paddingTop: 32 }}>
                    <h4 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 4, height: 16, background: '#7c3aed', borderRadius: 4 }}></div>
                      Essential Details
                    </h4>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Product Name *</label>
                      <input type="text" className="form-input" placeholder="e.g. Vintage T-Shirt" value={newItemName} onChange={e => setNewItemName(e.target.value)} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Price (₱) *</label>
                      <input type="number" step="0.01" className="form-input" placeholder="0.00" value={newItemPrice} onChange={e => setNewItemPrice(e.target.value)} required />
                    </div>
                  </div>

                  {newItemCategory === "Clothes" && (
                    <div className="form-group">
                      <label className="form-label">Available Sizes</label>
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        {["S", "M", "L", "XL", "XXL"].map(size => (
                          <button
                            key={size}
                            type="button"
                            onClick={() => {
                              setSelectedSizes(prev => prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]);
                            }}
                            style={{
                              padding: '10px 20px',
                              borderRadius: 12,
                              border: '1.5px solid',
                              borderColor: selectedSizes.includes(size) ? '#7c3aed' : '#e2e8f0',
                              background: selectedSizes.includes(size) ? 'rgba(124,58,237,0.05)' : '#fff',
                              color: selectedSizes.includes(size) ? '#7c3aed' : '#64748b',
                              cursor: 'pointer',
                              fontWeight: 700,
                              fontSize: 14,
                              transition: 'all .2s',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              boxShadow: selectedSizes.includes(size) ? '0 4px 12px rgba(124,58,237,0.1)' : 'none'
                            }}
                          >
                            {size}
                            {selectedSizes.includes(size) && (
                              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
                            )}
                          </button>
                        ))}
                      </div>
                      {selectedSizes.length > 0 && (
                        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8, background: '#f8fafc', padding: 12, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                          <label className="form-label" style={{ fontSize: 12, marginBottom: 4 }}>Stock per Size</label>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                            {selectedSizes.map(s => (
                              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', padding: '4px 8px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                                <span style={{ fontWeight: 700, width: 32, fontSize: 14, color: '#0f172a' }}>{s}</span>
                                <input 
                                  type="number" 
                                  min="0" 
                                  className="form-input" 
                                  style={{ width: 80, padding: '6px 12px', fontSize: 14, minHeight: 0 }} 
                                  placeholder="0" 
                                  value={sizeStocks[s] !== undefined ? sizeStocks[s] : ""}
                                  onChange={e => {
                                    const val = e.target.value;
                                    setSizeStocks(prev => {
                                      const newStocks = { ...prev, [s]: val };
                                      const total = Object.values(newStocks).reduce((sum: number, v) => sum + (parseInt(v as string) || 0), 0);
                                      setNewItemStock(total.toString());
                                      return newStocks;
                                    });
                                  }} 
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {newItemCategory === "Shoes" && (
                    <div className="form-group">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <label className="form-label" style={{ marginBottom: 0 }}>Available Shoe Sizes</label>
                        <div style={{ display: 'flex', background: '#f1f5f9', padding: 3, borderRadius: 8, gap: 2 }}>
                          {['PH', 'US', 'EU'].map(sys => (
                            <button
                              key={sys}
                              type="button"
                              onClick={() => setSizeSystem(sys as any)}
                              style={{
                                padding: '4px 12px',
                                borderRadius: 6,
                                border: 'none',
                                fontSize: 11,
                                fontWeight: 700,
                                cursor: 'pointer',
                                background: sizeSystem === sys ? '#fff' : 'transparent',
                                color: sizeSystem === sys ? '#7c3aed' : '#64748b',
                                boxShadow: sizeSystem === sys ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                transition: 'all .2s'
                              }}
                            >
                              {sys}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                        {(sizeSystem === 'PH' ? ["5", "6", "7", "8", "9", "10", "11", "12"] :
                          sizeSystem === 'US' ? ["5", "5.5", "6", "6.5", "7", "7.5", "8", "8.5", "9", "9.5", "10", "11", "12"] :
                            ["36", "37", "38", "39", "40", "41", "42", "43", "44", "45", "46"]
                        ).map(size => (
                          <button
                            key={size}
                            type="button"
                            onClick={() => {
                              setSelectedSizes(prev => prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]);
                            }}
                            style={{
                              width: 48,
                              height: 48,
                              borderRadius: 12,
                              border: '1.5px solid',
                              borderColor: selectedSizes.includes(size) ? '#7c3aed' : '#e2e8f0',
                              background: selectedSizes.includes(size) ? 'rgba(124,58,237,0.05)' : '#fff',
                              color: selectedSizes.includes(size) ? '#7c3aed' : '#64748b',
                              cursor: 'pointer',
                              fontWeight: 700,
                              fontSize: 14,
                              transition: 'all .2s',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              position: 'relative',
                              boxShadow: selectedSizes.includes(size) ? '0 4px 12px rgba(124,58,237,0.1)' : 'none'
                            }}
                          >
                            {size}
                            {selectedSizes.includes(size) && (
                              <div style={{ position: 'absolute', top: -4, right: -4, background: '#7c3aed', color: '#fff', borderRadius: '50%', width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="4" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                      {selectedSizes.length > 0 && (
                        <div style={{ marginTop: 16, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 8, background: '#f8fafc', padding: 12, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                          <label className="form-label" style={{ fontSize: 12, marginBottom: 4 }}>Stock per Size</label>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                            {selectedSizes.map(s => (
                              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', padding: '4px 8px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                                <span style={{ fontWeight: 700, width: 32, fontSize: 14, color: '#0f172a' }}>{s}</span>
                                <input 
                                  type="number" 
                                  min="0" 
                                  className="form-input" 
                                  style={{ width: 80, padding: '6px 12px', fontSize: 14, minHeight: 0 }} 
                                  placeholder="0" 
                                  value={sizeStocks[s] !== undefined ? sizeStocks[s] : ""}
                                  onChange={e => {
                                    const val = e.target.value;
                                    setSizeStocks(prev => {
                                      const newStocks = { ...prev, [s]: val };
                                      const total = Object.values(newStocks).reduce((sum: number, v) => sum + (parseInt(v as string) || 0), 0);
                                      setNewItemStock(total.toString());
                                      return newStocks;
                                    });
                                  }} 
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="form-group">
                        <label className="form-label">Add Custom Size</label>
                        <div style={{ display: 'flex', gap: 10 }}>
                          <input
                            type="text"
                            className="form-input"
                            placeholder="e.g. 42.5 or Wide Fit"
                            value={customSizeInput}
                            onChange={e => setCustomSizeInput(e.target.value)}
                            onKeyPress={e => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                if (customSizeInput.trim() && !selectedSizes.includes(customSizeInput.trim())) {
                                  setSelectedSizes(prev => [...prev, customSizeInput.trim()]);
                                  setCustomSizeInput("");
                                }
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (customSizeInput.trim() && !selectedSizes.includes(customSizeInput.trim())) {
                                setSelectedSizes(prev => [...prev, customSizeInput.trim()]);
                                setCustomSizeInput("");
                              }
                            }}
                            style={{ padding: '0 20px', borderRadius: 10, border: 'none', background: '#7c3aed', color: '#fff', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            Add
                          </button>
                        </div>
                        {selectedSizes.filter(s => !(sizeSystem === 'PH' ? ["5", "6", "7", "8", "9", "10", "11", "12"] : sizeSystem === 'US' ? ["5", "5.5", "6", "6.5", "7", "7.5", "8", "8.5", "9", "9.5", "10", "11", "12"] : ["36", "37", "38", "39", "40", "41", "42", "43", "44", "45", "46"]).includes(s)).length > 0 && (
                          <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {selectedSizes.filter(s => !(sizeSystem === 'PH' ? ["5", "6", "7", "8", "9", "10", "11", "12"] : sizeSystem === 'US' ? ["5", "5.5", "6", "6.5", "7", "7.5", "8", "8.5", "9", "9.5", "10", "11", "12"] : ["36", "37", "38", "39", "40", "41", "42", "43", "44", "45", "46"]).includes(s)).map(cs => (
                              <span key={cs} style={{ background: '#f1f5f9', padding: '4px 10px', borderRadius: 6, fontSize: 12, color: '#475569', display: 'flex', alignItems: 'center', gap: 4 }}>
                                {cs}
                                <button type="button" onClick={() => setSelectedSizes(prev => prev.filter(s => s !== cs))} style={{ border: 'none', background: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 14, padding: 0 }}>&times;</button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div style={{ borderTop: '1px solid #f1f5f9', margin: '32px 0 24px', paddingTop: 32 }}>
                    <h4 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 4, height: 16, background: '#7c3aed', borderRadius: 4 }}></div>
                      Inventory & Variations
                    </h4>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Stock Quantity *</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#f8fafc', padding: 4, borderRadius: 12, border: '1.5px solid #e2e8f0', width: 'fit-content', opacity: selectedSizes.length > 0 ? 0.7 : 1 }}>
                        <button
                          type="button"
                          disabled={selectedSizes.length > 0}
                          onClick={() => setNewItemStock(prev => Math.max(1, parseInt(prev || "0") - 1).toString())}
                          style={{ width: 36, height: 36, borderRadius: 8, border: 'none', background: '#fff', color: '#64748b', cursor: selectedSizes.length > 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', transition: 'all .2s' }}
                        >
                          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12" /></svg>
                        </button>
                        <input
                          type="number"
                          className="form-input"
                          style={{ width: 80, border: 'none', background: 'transparent', textAlign: 'center', fontSize: 16, fontWeight: 700, color: '#0f172a', padding: 0 }}
                          value={newItemStock}
                          readOnly={selectedSizes.length > 0}
                          onChange={e => setNewItemStock(e.target.value)}
                        />
                        <button
                          type="button"
                          disabled={selectedSizes.length > 0}
                          onClick={() => setNewItemStock(prev => (parseInt(prev || "0") + 1).toString())}
                          style={{ width: 36, height: 36, borderRadius: 8, border: 'none', background: '#7c3aed', color: '#fff', cursor: selectedSizes.length > 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(124,58,237,0.2)', transition: 'all .2s' }}
                        >
                          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid #f1f5f9', margin: '32px 0 24px', paddingTop: 32 }}>
                    <h4 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 4, height: 16, background: '#7c3aed', borderRadius: 4 }}></div>
                      Specifications & Variants
                    </h4>
                  </div>

                  <div className="form-group" style={{ marginTop: 24 }}>
                    <label className="form-label">Product Specifications</label>
                    <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Label (e.g. Brand)"
                        value={newSpecKey}
                        onChange={e => setNewSpecKey(e.target.value)}
                        style={{ flex: 1 }}
                      />
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Value (e.g. Nike)"
                        value={newSpecValue}
                        onChange={e => setNewSpecValue(e.target.value)}
                        style={{ flex: 1 }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newSpecKey.trim() && newSpecValue.trim()) {
                            setSpecs(prev => [...prev, { key: newSpecKey.trim(), value: newSpecValue.trim() }]);
                            setNewSpecKey("");
                            setNewSpecValue("");
                          }
                        }}
                        style={{ padding: '0 20px', borderRadius: 10, border: 'none', background: '#7c3aed', color: '#fff', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        Add
                      </button>
                    </div>
                    {specs.length > 0 && (
                      <div style={{ background: '#f8fafc', borderRadius: 12, padding: 12, border: '1px solid #e2e8f0' }}>
                        {specs.map((s, idx) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: idx === specs.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                            <div style={{ display: 'flex', gap: 8, fontSize: 13 }}>
                              <span style={{ fontWeight: 600, color: '#64748b', width: 100 }}>{s.key}:</span>
                              <span style={{ color: '#0f172a' }}>{s.value}</span>
                            </div>
                            <button type="button" onClick={() => setSpecs(prev => prev.filter((_, i) => i !== idx))} style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Remove</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="form-group" style={{ marginTop: 24 }}>
                    <label className="form-label">Color Variants with Photos</label>
                    <div style={{
                      background: '#f8fafc',
                      padding: 24,
                      borderRadius: 20,
                      border: '1.5px solid #e2e8f0',
                      marginBottom: 28,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 20
                    }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <label className="form-label" style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 0 }}>Variant Color Name</label>
                          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                            <button
                              type="button"
                              onClick={() => setShowCustomPicker(!showCustomPicker)}
                              style={{
                                width: 48,
                                height: 48,
                                borderRadius: 12,
                                border: '2px solid #cbd5e1',
                                background: getColorPreviewHex(newColorName),
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
                                cursor: 'pointer',
                                flexShrink: 0,
                                transition: 'all .2s'
                              }}
                              title="Click to open Custom Color Picker"
                            >
                              <svg width="20" height="20" fill="none" stroke={getIconColor(newColorName)} strokeWidth="2.2" viewBox="0 0 24 24"><path d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.586-6.586a2 2 0 10-2.828-2.828z" /><path d="M19 11l-4-4" /><path d="M5 19h4" /></svg>
                            </button>
                            <input
                              type="text"
                              className="form-input"
                              placeholder="Click dropper to pick & scan color..."
                              value={newColorName}
                              onChange={e => {
                                const val = e.target.value;
                                if (/[0-9]/.test(val)) {
                                  showToast("Numbers are strictly not allowed for color names. Please enter a valid color name.", "error");
                                }
                                setNewColorName(val.replace(/[0-9]/g, ''));
                              }}
                              style={{ background: '#fff', height: 48, flex: 1 }}
                            />
                          </div>
                          <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Click the color dropper icon to open the custom swatch matrix & spectrum scanner.</p>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <label className="form-label" style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 0 }}>Variant Price (₱)</label>
                          <input
                            type="number"
                            step="0.01"
                            className="form-input"
                            placeholder="0.00 (optional)"
                            value={newColorPrice}
                            onChange={e => setNewColorPrice(e.target.value)}
                            style={{ background: '#fff', height: 48 }}
                          />
                          <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Price for this specific variant.</p>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <label className="form-label" style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 0 }}>Variant Photo</label>
                          <div
                            onClick={() => document.getElementById('variant-img-input')?.click()}
                            style={{
                              height: 120,
                              border: '2px dashed #cbd5e1',
                              borderRadius: 14,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              background: '#fff',
                              overflow: 'hidden',
                              transition: 'all .2s'
                            }}
                          >
                            {newColorPreview ? (
                              <img src={newColorPreview} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: '#94a3b8' }}>
                                <IconCamera />
                                <span style={{ fontSize: 12, fontWeight: 600 }}>Upload Photo</span>
                              </div>
                            )}
                          </div>
                          <input
                            id="variant-img-input"
                            type="file"
                            accept="image/*"
                            onChange={handleVariantImageChange}
                            style={{ display: 'none' }}
                          />
                        </div>
                      </div>

                      {showCustomPicker && (
                        <div style={{
                          background: '#fff',
                          borderRadius: 20,
                          padding: 24,
                          border: '1px solid #e2e8f0',
                          boxShadow: '0 10px 35px rgba(0,0,0,0.08)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 24,
                          animation: 'slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: 16 }}>
                            <div>
                              <span style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', display: 'block' }}>Shopply Color Picker & Scanner</span>
                              <span style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Select a curated Shopply swatch or use the spectrum scanner for custom shades.</span>
                            </div>
                            <button type="button" onClick={() => setShowCustomPicker(false)} style={{ border: 'none', background: '#f1f5f9', color: '#64748b', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .2s' }}>&times;</button>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 8 }}>
                            {COLOR_PALETTE.map(col => (
                              <button
                                key={col.name}
                                type="button"
                                title={`${col.name} (#${col.r.toString(16).padStart(2,'0')}${col.g.toString(16).padStart(2,'0')}${col.b.toString(16).padStart(2,'0')})`}
                                onClick={() => {
                                  setNewColorName(col.name);
                                  setShowCustomPicker(false);
                                  showToast(`Selected: ${col.name}`, "success");
                                }}
                                style={{
                                  aspectRatio: '1/1',
                                  borderRadius: 8,
                                  border: newColorName.toLowerCase() === col.name.toLowerCase() ? '3px solid #0f172a' : '1px solid rgba(0,0,0,0.08)',
                                  background: `rgb(${col.r}, ${col.g}, ${col.b})`,
                                  cursor: 'pointer',
                                  transform: newColorName.toLowerCase() === col.name.toLowerCase() ? 'scale(1.12)' : 'scale(1)',
                                  boxShadow: newColorName.toLowerCase() === col.name.toLowerCase() ? '0 4px 12px rgba(0,0,0,0.15)' : '0 2px 4px rgba(0,0,0,0.02)',
                                  transition: 'all .2s cubic-bezier(0.16, 1, 0.3, 1)',
                                  position: 'relative',
                                  zIndex: newColorName.toLowerCase() === col.name.toLowerCase() ? 10 : 1
                                }}
                              />
                            ))}
                          </div>

                          <div style={{ display: 'flex', gap: 16, alignItems: 'center', background: '#f8fafc', padding: 16, borderRadius: 16, border: '1px solid #f1f5f9' }}>
                            <div style={{ position: 'relative', width: 54, height: 54, flexShrink: 0 }}>
                              <input
                                type="color"
                                title="Open native spectrum picker"
                                onChange={e => {
                                  const hex = e.target.value;
                                  const matchedName = hexToColorName(hex);
                                  setNewColorName(matchedName);
                                  showToast(`Scanned & matched: ${matchedName}`, "success");
                                }}
                                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', zIndex: 10 }}
                              />
                              <div style={{ width: '100%', height: '100%', borderRadius: 14, background: 'linear-gradient(135deg, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 11, textShadow: '0 1px 3px rgba(0,0,0,0.8)', border: '2px solid #cbd5e1', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
                                Spectrum
                              </div>
                            </div>
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                              <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Shopply Spectrum Scanner</span>
                              <span style={{ fontSize: 12, color: '#64748b' }}>Click the spectrum box to pick any custom shade from the gradient canvas. Shopply&apos;s smart AI will automatically scan and match its closest professional color name for your storefront.</span>
                            </div>
                          </div>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          if (!newColorName.trim()) {
                            showToast("Please enter a valid color name.", "error");
                            return;
                          }
                          if (/[0-9]/.test(newColorName)) {
                            showToast("Numbers are strictly not allowed in the color name. Please enter a valid color name.", "error");
                            return;
                          }
                          if (!newColorFile && !editingItem) {
                            showToast("Please upload a photo for this color variant.", "error");
                            return;
                          }
                          setColorVariants(prev => [...prev, { color: newColorName.trim(), price: newColorPrice.trim() || newItemPrice || "0", file: newColorFile, preview: newColorPreview }]);
                          setNewColorName("");
                          setNewColorPrice("");
                          setNewColorFile(null);
                          setNewColorPreview(null);
                          showToast("Color variant added successfully!", "success");
                        }}
                        style={{
                          height: 48,
                          width: '100%',
                          borderRadius: 12,
                          border: 'none',
                          background: '#7c3aed',
                          color: '#fff',
                          fontWeight: 700,
                          fontSize: 15,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 10,
                          boxShadow: '0 6px 16px rgba(124,58,237,0.25)',
                          transition: 'all .2s'
                        }}
                      >
                        <IconPlus />
                        Add This Variant
                      </button>
                    </div>
                    {colorVariants.length > 0 && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(120px,1fr))', gap: 12 }}>
                        {colorVariants.map((v, idx) => (
                          <div key={idx} style={{ background: '#fff', borderRadius: 14, border: '1.5px solid #f1f5f9', overflow: 'hidden', position: 'relative', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', transition: 'all .2s' }}>
                            <img src={v.preview || ''} style={{ width: '100%', height: 90, objectFit: 'cover' }} />
                            <div style={{ padding: 10, fontSize: 13, fontWeight: 700, textAlign: 'center', color: '#334155', background: '#fcfcfd' }}>
                              {v.color}
                              <div style={{ fontSize: 11, color: '#10b981', fontWeight: 600 }}>₱{parseFloat(v.price || newItemPrice || "0").toFixed(2)}</div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setColorVariants(prev => prev.filter((_, i) => i !== idx))}
                              style={{ position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: '50%', background: 'rgba(239,68,68,0.95)', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.15)' }}
                            >
                              <IconTrash />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ borderTop: '1px solid #f1f5f9', margin: '40px 0 24px', paddingTop: 32 }}>
                    <h4 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 4, height: 16, background: '#7c3aed', borderRadius: 4 }}></div>
                      Product Showcase
                    </h4>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Main Product Images (Multiple)</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 12, marginBottom: 16 }}>
                      {mainImagesState.map((imgObj, idx) => (
                        <div key={idx} style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: '1px solid #e2e8f0', aspectRatio: '1', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <img src={imgObj.preview} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                          <button
                            type="button"
                            onClick={() => {
                              setMainImagesState(prev => prev.filter((_, i) => i !== idx));
                            }}
                            style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(239,68,68,0.9)', color: '#fff', border: 'none', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                          >
                            <IconTrash />
                          </button>
                        </div>
                      ))}
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                          aspectRatio: '1',
                          border: '2px dashed #e2e8f0',
                          borderRadius: 12,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          background: '#f8fafc',
                          color: '#94a3b8',
                          transition: 'all .2s'
                        }}
                      >
                        <IconPlus />
                        <span style={{ fontSize: 11, marginTop: 4, fontWeight: 600 }}>Add Image</span>
                      </div>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      onChange={handleImageChange}
                      style={{ display: 'none' }}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Description</label>
                    <textarea className="form-textarea" placeholder="Describe your item..."
                      value={newItemDesc} onChange={e => setNewItemDesc(e.target.value)} />
                  </div>

                  <button type="submit" className="submit-btn" disabled={isSubmitting} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    {isSubmitting ? (editingItem ? "Updating..." : "Adding...") : <>{editingItem ? <IconCheck /> : <IconPlus />} {editingItem ? "Update Item" : "Add Item"}</>}
                  </button>
                </form>
              </div>
            )}
          
            {/* SETTINGS CONTENT */}
            {activeTab === "settings" && (() => {
              // Compute live cache stats
          const lsKeys = typeof window !== 'undefined' ? Object.keys(localStorage).filter(k => k.startsWith('shopply_cache_')) : [];
          const lsBytes = lsKeys.reduce((sum, k) => sum + (localStorage.getItem(k)?.length || 0) * 2, 0);
          const endpoints = [
            { label: 'My Profile', key: '/me', icon: <IconUser />, color: '#7c3aed' },
            { label: 'Shop Items', key: '/shop/items', icon: <IconShop />, color: '#2563eb' },
            { label: 'My Items', key: '/items', icon: <IconBox />, color: '#059669' },
            { label: 'Cart', key: '/cart', icon: <IconCart />, color: '#d97706' },
            { label: 'My Orders', key: '/orders', icon: <IconOrders />, color: '#dc2626' },
            { label: 'Store Orders', key: '/seller/orders', icon: <IconStore />, color: '#7c3aed' },
            { label: 'Messages', key: '/chat/conversations', icon: <IconChat />, color: '#0891b2' },
          ];
          return (
          <div className="tab-content" style={{ animation: 'fadeIn 0.3s ease-out' }}>
            {/* Header */}
            <div style={{ marginBottom: 32 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 6 }}>
                <div style={{ width: 44, height: 44, borderRadius: 14, background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 20px rgba(124,58,237,.3)' }}>
                  <svg width="22" height="22" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
                </div>
                <div>
                  <h2 style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px', margin: 0 }}>Settings & Performance</h2>
                  <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>Control caching, data freshness, and app performance</p>
                </div>
              </div>
            </div>

            {/* Live Stats Bar */}
            <div className="settings-stats-grid">
              {[
                { label: 'Cached Endpoints', value: lsKeys.length, icon: <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>, color: '#7c3aed', bg: 'rgba(124,58,237,.08)' },
                { label: 'Local Storage Used', value: lsBytes > 1024 ? `${(lsBytes/1024).toFixed(1)} KB` : `${lsBytes} B`, icon: <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>, color: '#2563eb', bg: 'rgba(37,99,235,.08)' },
                { label: 'Cache Status', value: lsKeys.length > 0 ? 'Active' : 'Empty', icon: <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8" /><polyline points="3 3 3 8 8 8" /></svg>, color: lsKeys.length > 0 ? '#059669' : '#94a3b8', bg: lsKeys.length > 0 ? 'rgba(5,150,105,.08)' : '#f8fafc' },
              ].map((stat, i) => (
                <div key={i} style={{ background: '#fff', borderRadius: 18, padding: '20px 24px', border: '1px solid #f1f5f9', boxShadow: '0 4px 16px rgba(0,0,0,.04)', display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: stat.bg, color: stat.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{stat.icon}</div>
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: stat.color }}>{stat.value}</div>
                    <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>{stat.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* My Statistics */}
            <div style={{ background: '#fff', borderRadius: 24, padding: 32, boxShadow: '0 4px 24px rgba(0,0,0,.05)', border: '1px solid #f1f5f9', marginBottom: 24 }}>
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', margin: 0 }}>📊 My Statistics</h3>
                <p style={{ fontSize: 13, color: '#94a3b8', margin: '4px 0 0' }}>Overview of your account activity and performance</p>
              </div>
              <div className="my-stats-grid">
                {[
                  { label: 'Published Items', value: publishedCount, icon: <IconBox />, color: '#10b981', bg: 'rgba(16,185,129,.1)' },
                  { label: 'Pending Orders', value: pendingSellerOrdersCount, icon: <IconOrders />, color: '#f59e0b', bg: 'rgba(245,158,11,.1)' },
                  { label: 'Total Orders', value: sellerOrders.length, icon: <IconStore />, color: '#3b82f6', bg: 'rgba(59,130,246,.1)' },
                  { label: 'Followers', value: user.followers_count || 0, icon: <IconUser />, color: '#8b5cf6', bg: 'rgba(139,92,246,.1)' }
                ].map((stat, i) => (
                  <div key={i} 
                    onClick={() => setActiveStatChart(stat.label)}
                    style={{ 
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
                      background: activeStatChart === stat.label ? `${stat.color}10` : '#f8fafc', 
                      padding: '24px 16px', borderRadius: 16, 
                      border: `1.5px solid ${activeStatChart === stat.label ? stat.color : '#f1f5f9'}`,
                      cursor: 'pointer', transition: 'all 0.2s',
                      boxShadow: activeStatChart === stat.label ? `0 4px 12px ${stat.color}15` : 'none'
                    }}>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: stat.bg, color: stat.color, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                      {stat.icon}
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>{stat.value}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Activity Chart */}
              {(() => {
                const chartData = Array.from({ length: 4 }).map((_, i) => {
                  const d = new Date();
                  d.setDate(d.getDate() - (3 - i));
                  const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                  const dStart = new Date(d.setHours(0,0,0,0));
                  const dEnd = new Date(d.setHours(23,59,59,999));
                  
                  let blue = 0;
                  let orange = 0;

                  if (activeStatChart === "Published Items") {
                    const dayItems = items.filter(item => {
                      const iDate = new Date(item.created_at);
                      return iDate >= dStart && iDate <= dEnd && item.is_published;
                    });
                    blue = dayItems.length;
                  } else if (activeStatChart === "Pending Orders") {
                    const dayOrders = sellerOrders.filter(o => {
                      const oDate = new Date(o.created_at);
                      return oDate >= dStart && oDate <= dEnd && o.status === 'pending';
                    });
                    orange = dayOrders.length;
                  } else if (activeStatChart === "Total Orders") {
                    const dayOrders = sellerOrders.filter(o => {
                      const oDate = new Date(o.created_at);
                      return oDate >= dStart && oDate <= dEnd;
                    });
                    blue = dayOrders.filter(o => o.status === 'completed' || o.status === 'delivered').length;
                    orange = dayOrders.filter(o => o.status !== 'completed' && o.status !== 'delivered').length;
                  } else if (activeStatChart === "Followers") {
                    blue = 0; // We don't have historical follower data
                  }
                  
                  return { date: dateStr, blue, orange };
                });

                const maxDataVal = Math.max(...chartData.map(d => d.blue + d.orange));
                const maxVal = maxDataVal < 5 ? 5 : Math.ceil(maxDataVal / 5) * 5;
                
                // Generate 6 labels based on maxVal
                const yLabels = Array.from({ length: 6 }).map((_, i) => Math.round((maxVal / 5) * i));

                return (
                  <div style={{ marginTop: 40, borderTop: '1px solid #f1f5f9', paddingTop: 32 }}>
                    <h4 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 24 }}>{activeStatChart} Activity (Last 4 Days)</h4>
                    <div style={{ position: 'relative', height: 280, display: 'flex', paddingBottom: 24 }}>
                      {/* Y-axis labels */}
                      <div style={{ display: 'flex', flexDirection: 'column-reverse', justifyContent: 'space-between', paddingRight: 16, width: 40, boxSizing: 'border-box' }}>
                        {yLabels.map(val => (
                          <div key={val} style={{ fontSize: 12, color: '#94a3b8', textAlign: 'right', transform: 'translateY(50%)' }}>{val}</div>
                        ))}
                      </div>
                      
                      {/* Grid Lines and Bars container */}
                      <div style={{ flex: 1, position: 'relative' }}>
                        {/* Grid lines */}
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column-reverse', justifyContent: 'space-between', zIndex: 0 }}>
                          {yLabels.map(val => (
                            <div key={`grid-${val}`} style={{ borderBottom: '1px solid #e2e8f0', width: '100%', height: 1 }}></div>
                          ))}
                        </div>
                        
                        {/* Bars */}
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', zIndex: 1, padding: '0 4%' }}>
                          {chartData.map((data, idx) => {
                            const blueHeight = maxVal > 0 ? (data.blue / maxVal) * 100 : 0;
                            const orangeHeight = maxVal > 0 ? (data.orange / maxVal) * 100 : 0;
                            return (
                              <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '16%', height: '100%', position: 'relative' }} title={`Blue: ${data.blue}, Orange: ${data.orange}`}>
                                <div style={{ position: 'absolute', bottom: 0, width: '100%', height: `${Math.min(blueHeight + orangeHeight, 100)}%`, display: 'flex', flexDirection: 'column-reverse', transition: 'height 0.3s ease' }}>
                                  <div style={{ width: '100%', background: '#0277cc', height: `${data.blue + data.orange > 0 ? (data.blue / (data.blue + data.orange)) * 100 : 0}%`, minHeight: data.blue > 0 ? '2px' : '0', transition: 'all 0.3s ease' }}></div>
                                  <div style={{ width: '100%', background: '#f39c12', height: `${data.blue + data.orange > 0 ? (data.orange / (data.blue + data.orange)) * 100 : 0}%`, minHeight: data.orange > 0 ? '2px' : '0', transition: 'all 0.3s ease' }}></div>
                                </div>
                                <div style={{ position: 'absolute', bottom: -28, fontSize: 13, color: '#64748b', whiteSpace: 'nowrap' }}>{data.date}</div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Cache Control Panel */}
            <div style={{ background: '#fff', borderRadius: 24, padding: 32, boxShadow: '0 4px 24px rgba(0,0,0,.05)', border: '1px solid #f1f5f9', marginBottom: 24 }}>
              <div className="flex-responsive-row" style={{ marginBottom: 24 }}>
                <div>
                  <h3 style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', margin: 0 }}>🗄️ Cache Control Center</h3>
                  <p style={{ fontSize: 13, color: '#94a3b8', margin: '4px 0 0' }}>Clear specific data or wipe everything at once</p>
                </div>
                <button
                  onClick={() => {
                    getApiCache().invalidateAll();
                    showToast('✅ All cache cleared! Refreshing data...', 'success');
                    setTimeout(() => window.location.reload(), 1200);
                  }}
                  style={{ padding: '12px 22px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 14px rgba(239,68,68,.3)', transition: 'all .2s', whiteSpace: 'nowrap' }}
                  onMouseOver={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
                  onMouseOut={e => (e.currentTarget.style.transform = 'translateY(0)')}
                >
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>
                  Clear ALL & Refresh
                </button>
              </div>

              <div className="cache-control-grid">
                {endpoints.map((ep, i) => {
                  const hasCache = lsKeys.some(k => k.includes(ep.key));
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderRadius: 14, background: hasCache ? `${ep.color}08` : '#f8fafc', border: `1.5px solid ${hasCache ? ep.color + '22' : '#f1f5f9'}`, transition: 'all .2s' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 38, height: 38, borderRadius: 10, background: hasCache ? `${ep.color}15` : '#f1f5f9', color: hasCache ? ep.color : '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{ep.icon}</div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{ep.label}</div>
                          <div style={{ fontSize: 11, color: hasCache ? ep.color : '#94a3b8', fontWeight: 500 }}>{hasCache ? '● Cached' : '○ No cache'}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          getApiCache().invalidate(ep.key);
                          showToast(`🗑️ ${ep.label} cache cleared`, 'success');
                        }}
                        style={{ padding: '7px 14px', borderRadius: 9, border: `1.5px solid ${hasCache ? ep.color : '#e2e8f0'}`, background: hasCache ? '#fff' : '#f8fafc', color: hasCache ? ep.color : '#94a3b8', fontWeight: 600, fontSize: 12, cursor: hasCache ? 'pointer' : 'default', transition: 'all .2s' }}
                        onMouseOver={e => hasCache && (e.currentTarget.style.background = ep.color, e.currentTarget.style.color = '#fff')}
                        onMouseOut={e => hasCache && (e.currentTarget.style.background = '#fff', e.currentTarget.style.color = ep.color)}
                      >
                        Clear
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Privacy & Cookies Panel */}
            <div style={{ background: '#fff', borderRadius: 24, padding: 32, boxShadow: '0 4px 24px rgba(0,0,0,.05)', border: '1px solid #f1f5f9', marginBottom: 24 }}>
              <div className="flex-responsive-row">
                <div>
                  <h3 style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', margin: 0 }}>🍪 Privacy & Cookies</h3>
                  <p style={{ fontSize: 13, color: '#94a3b8', margin: '4px 0 0' }}>Manage your cookie preferences and consent</p>
                </div>
                <button
                  onClick={() => {
                    document.cookie = "cookie_consent=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/";
                    showToast('✅ Cookie consent reset! Refreshing...', 'success');
                    setTimeout(() => window.location.reload(), 1200);
                  }}
                  style={{ padding: '10px 20px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#fff', color: '#475569', fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all .2s', display: 'flex', alignItems: 'center', gap: 6 }}
                  onMouseOver={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                  onMouseOut={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                >
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>
                  Reset Cookie Consent
                </button>
              </div>
            </div>

            {/* Performance Actions */}
            <div className="perf-actions-grid">
              {/* Hard Reload */}
              <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #f1f5f9', boxShadow: '0 4px 16px rgba(0,0,0,.04)' }}>
                <div style={{ fontSize: 28, marginBottom: 12, display: 'inline-flex', padding: 12, borderRadius: 14, background: 'rgba(245,158,11,.1)', color: '#f59e0b' }}>
                  <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
                </div>
                <h4 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>Force Hard Reload</h4>
                <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5, marginBottom: 16 }}>Bypass all browser cache and reload every asset fresh from the server. Fixes visual glitches and script errors.</p>
                <button
                  onClick={() => window.location.reload()}
                  style={{ width: '100%', padding: '11px', borderRadius: 11, border: 'none', background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', boxShadow: '0 4px 14px rgba(245,158,11,.3)', transition: 'all .2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                  onMouseOver={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
                  onMouseOut={e => (e.currentTarget.style.transform = 'translateY(0)')}
                >
                  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8" /><polyline points="3 3 3 8 8 8" /></svg>
                  Reload Page
                </button>
              </div>

              {/* Clear localStorage */}
              <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #f1f5f9', boxShadow: '0 4px 16px rgba(0,0,0,.04)' }}>
                <div style={{ fontSize: 28, marginBottom: 12, display: 'inline-flex', padding: 12, borderRadius: 14, background: 'rgba(239,68,68,.1)', color: '#ef4444' }}>
                  <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 3l18 18M15 9l-6 6M10 14L4 20a2.82 2.82 0 01-4 0v0a2.82 2.82 0 010-4l6-6" /></svg>
                </div>
                <h4 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>Clear All Saved Data</h4>
                <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5, marginBottom: 16 }}>Removes all Shopply data stored in your browser — cache, preferences, and session hints. You stay logged in.</p>
                <button
                  onClick={() => {
                    getApiCache().invalidateAll();
                    // Remove any shopply_ prefixed keys only
                    Object.keys(localStorage).filter(k => k.startsWith('shopply_') || k.startsWith('last_order')).forEach(k => localStorage.removeItem(k));
                    showToast('🧹 All app data cleared! Refreshing...', 'success');
                    setTimeout(() => window.location.reload(), 1200);
                  }}
                  style={{ width: '100%', padding: '11px', borderRadius: 11, border: 'none', background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', boxShadow: '0 4px 14px rgba(124,58,237,.3)', transition: 'all .2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                  onMouseOver={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
                  onMouseOut={e => (e.currentTarget.style.transform = 'translateY(0)')}
                >
                  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 3l18 18M15 9l-6 6M10 14L4 20a2.82 2.82 0 01-4 0v0a2.82 2.82 0 010-4l6-6" /></svg>
                  Deep Clean & Refresh
                </button>
              </div>
            </div>

            {/* Performance Tips */}
            <div style={{ background: 'linear-gradient(135deg,#0f172a,#1e293b)', borderRadius: 20, padding: 28, color: '#fff' }}>
              <h4 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 18h6M10 22h4M12 2v2m5.657-1.343l-1.414 1.414M22 12h-2m-1.343 5.657l-1.414-1.414M12 22v-2M6.343 20.657l1.414-1.414M2 12h2m1.343-5.657l1.414 1.414"/></svg></span> Performance Tips
              </h4>
              <div className="perf-tips-grid">
                {[
                  { icon: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>, title: 'Experiencing lag?', tip: 'Click "Clear ALL & Refresh" above — this forces the app to re-fetch all data fresh.' },
                  { icon: <IconBox />, title: 'Old stock showing?', tip: 'Clear the "Shop Items" cache to immediately see the latest product inventory.' },
                  { icon: <IconCart />, title: 'Cart not updating?', tip: 'Clear the "Cart" cache, then navigate away and back to reload your cart.' },
                  { icon: <IconOrders />, title: 'Orders not showing?', tip: 'Clear "My Orders" and "Store Orders" cache to see the most recent order status.' },
                ].map((tip, i) => (
                  <div key={i} style={{ background: 'rgba(255,255,255,.06)', borderRadius: 14, padding: '14px 16px', border: '1px solid rgba(255,255,255,.08)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 18 }}>{tip.icon}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>{tip.title}</span>
                    </div>
                    <p style={{ fontSize: 12, color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>{tip.tip}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          );
        })()}
          </div>
        </div>

        {/* DELETE CONFIRMATION MODAL */}
        {deleteModal !== null && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }} onClick={() => setDeleteModal(null)}>
            <div style={{ background: '#fff', borderRadius: 20, padding: '36px 32px', maxWidth: 400, width: '90%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,.15)' }} onClick={e => e.stopPropagation()}>
              <div style={{ marginBottom: 16 }}><IconWarning /></div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>Delete this item?</h3>
              <p style={{ fontSize: 14, color: '#64748b', marginBottom: 28, lineHeight: 1.5 }}>This action cannot be undone. The item and its image will be permanently removed.</p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <button onClick={() => setDeleteModal(null)} style={{ padding: '10px 24px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'Inter,sans-serif', transition: 'all .2s' }}>Cancel</button>
                <button onClick={() => handleDeleteItem(deleteModal)} style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'Inter,sans-serif', boxShadow: '0 4px 14px rgba(239,68,68,.3)', transition: 'all .2s', display: 'inline-flex', alignItems: 'center', gap: 6 }}><IconTrash /> Delete</button>
              </div>
            </div>
          </div>
        )}

        {/* REJECT ORDER CONFIRMATION MODAL */}
        {rejectOrderModal !== null && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }} onClick={() => setRejectOrderModal(null)}>
            <div style={{ background: '#fff', borderRadius: 20, padding: '36px 32px', maxWidth: 400, width: '90%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,.15)' }} onClick={e => e.stopPropagation()}>
              <div style={{ marginBottom: 16 }}><IconWarning /></div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>Reject this order?</h3>
              <p style={{ fontSize: 14, color: '#64748b', marginBottom: 28, lineHeight: 1.5 }}>Are you sure you want to reject this order? The buyer will be notified and this action cannot be undone.</p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <button onClick={() => setRejectOrderModal(null)} style={{ padding: '10px 24px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'Inter,sans-serif', transition: 'all .2s' }}>Cancel</button>
                <button onClick={confirmRejectOrder} style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'Inter,sans-serif', boxShadow: '0 4px 14px rgba(239,68,68,.3)', transition: 'all .2s', display: 'inline-flex', alignItems: 'center', gap: 6 }}>Reject Order</button>
              </div>
            </div>
          </div>
        )}

        {/* RECEIPT MODAL */}
        {receiptOrder && (
          (() => {
            const date = new Date(receiptOrder.created_at);
            const trackingNum = `TRK-${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}-${String(receiptOrder.id).padStart(4, '0')}`;
            
            return (
              <div className="modal-overlay">
                <div className="receipt-modal">
                  <div className="receipt-header">
                    <div className="receipt-logo">Shopply</div>
                    <div className="receipt-title">Order Receipt</div>
                    <div className="receipt-date">{date.toLocaleString()}</div>
                  </div>

                  <div className="receipt-row">
                    <span className="receipt-label">Tracking No:</span>
                    <span className="receipt-value" style={{ fontWeight: 700, color: '#7c3aed' }}>{trackingNum}</span>
                  </div>
                  <div className="receipt-row">
                    <span className="receipt-label">Buyer Name:</span>
                    <span className="receipt-value">{receiptOrder.buyer?.name || 'Unknown Buyer'}</span>
                  </div>
                  <div className="receipt-row">
                    <span className="receipt-label">Status:</span>
                    <span className="receipt-value" style={{ color: '#10b981', fontWeight: 700 }}>{receiptOrder.status.toUpperCase()}</span>
                  </div>

                  <div className="receipt-items-container" style={{ margin: '24px 0', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                    <div className="receipt-row">
                      <span className="receipt-label" style={{ color: '#0f172a', fontWeight: 600 }}>Item</span>
                      <span className="receipt-value" style={{ color: '#0f172a', fontWeight: 600 }}>Amount</span>
                    </div>
                    <div className="receipt-row">
                      <span className="receipt-label">
                        {receiptOrder.item.name}
                        {receiptOrder.variation && <><br /><small style={{ fontSize: 12, color: '#7c3aed', fontWeight: 600 }}>Variation: {receiptOrder.variation}</small></>}
                        <br /><small style={{ fontSize: 12 }}>x{receiptOrder.quantity}</small>
                      </span>
                      <span className="receipt-value">${(parseFloat(receiptOrder.price) * receiptOrder.quantity).toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="receipt-total">
                    <span>Total Paid</span>
                    <span style={{ color: '#ee4d2d' }}>${(parseFloat(receiptOrder.price) * receiptOrder.quantity).toFixed(2)}</span>
                  </div>

                  <div className="receipt-qr-container" style={{ marginTop: 32, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${trackingNum}`}
                      alt="QR Code"
                      width={100}
                      height={100}
                      style={{ marginBottom: 8 }}
                    />
                    <div style={{ fontSize: 13, letterSpacing: 3, color: '#0f172a', fontFamily: 'monospace', fontWeight: 700 }}>
                      {trackingNum}
                    </div>
                  </div>

                  <div className="receipt-actions no-print">
                    <button
                      style={{ flex: 1, padding: '10px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
                      onClick={() => window.print()}
                    >
                      Print Receipt
                    </button>
                    <button
                      style={{ flex: 1, padding: '10px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
                      onClick={() => setReceiptOrder(null)}
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            );
          })()
        )}

        {/* SCANNER MODAL */}
        {showScanner && (
          <div className="modal-overlay">
            <div className="receipt-modal" style={{ textAlign: 'center', width: '90%', maxWidth: 500 }}>
              <h2 style={{ marginBottom: 16 }}>Scan Receipt QR Code</h2>
              <p style={{ marginBottom: 20, color: '#64748b', fontSize: 14 }}>Position the QR code within the frame to automatically ship the order.</p>
              <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', background: '#000', height: 300, display: 'flex', alignItems: 'center' }}>
                <video ref={videoRef} style={{ width: '100%', display: 'block' }}></video>
                <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '60%', height: '60%', border: '2px solid rgba(255,255,255,0.5)', borderRadius: 12 }}></div>
              </div>
              <button
                onClick={() => setShowScanner(false)}
                style={{ marginTop: 24, padding: '10px 24px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel Scanning
              </button>
            </div>
          </div>
        )}

        {/* TOAST NOTIFICATION */}
        {toast && (
          <div className={`toast ${toast.type}`}>
            {toast.type === 'success' ? <IconCheck /> : <IconWarning />}
            {toast.message}
          </div>
        )}


      </div>
    </>
  );
}