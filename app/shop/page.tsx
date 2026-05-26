"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { getApiCache, createSmartPoller } from "@/lib/apiCache";
import { SkeletonShopCard, SkeletonChatMessage } from "@/components/Skeleton";

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

  // Chat States
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeChatUser, setActiveChatUser] = useState<{ id: number; name: string; avatar?: string | null } | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatConversations, setChatConversations] = useState<any[]>([]);
  const [newChatMessage, setNewChatMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: number; name: string; avatar?: string | null } | null>(null);
  const [loadingChatMessages, setLoadingChatMessages] = useState(false);
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const [chatImageFile, setChatImageFile] = useState<File | null>(null);
  const [chatImagePreview, setChatImagePreview] = useState<string | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isSendingRef = useRef(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isChatOpen]);

  const handleToggleFollow = async (userId: number) => {
    const token = localStorage.getItem("token");
    const isFollowing = followedSellers[userId];
    const action = isFollowing ? "unfollow" : "follow";

    // Optimistic UI update
    setFollowedSellers(prev => ({ ...prev, [userId]: !isFollowing }));
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

    try {
      const res = await fetch(`${API}/users/${userId}/follow`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      if (res.ok && data.followers_count !== undefined) {
        if (viewItem && viewItem.user.id === userId) {
          setViewItem(prev => prev ? ({ ...prev, user: { ...prev.user, followers_count: data.followers_count } }) : null);
        }
        if (data.user) {
          localStorage.setItem("user", JSON.stringify(data.user));
          // If we also want to dispatch a custom event or let dashboard know
          window.dispatchEvent(new Event('user_updated'));
        }
      }
    } catch (err) {
      console.error("Failed to toggle follow", err);
    }
  };

  // Review Form State
  const [revRating, setRevRating] = useState(5);
  const [revComment, setRevComment] = useState("");
  const [revImages, setRevImages] = useState<File[]>([]);
  const [revPreviews, setRevPreviews] = useState<string[]>([]);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";
  const STORAGE_URL = process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL.replace('/api', '/storage') : "http://127.0.0.1:8000/storage";

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
  const IconChat = () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>;
  const IconShop = () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;

  const formatPriceDisplay = (item: ShopItem) => {
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

  // Load current user for chat
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      const cache = getApiCache();
      cache.fetch(`${API}/me`, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } })
        .then((data: any) => { if (data.user) setCurrentUser(data.user); })
        .catch(() => {});
    }
  }, []);

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
            }}
          ).then(data => {
              if (data.messages && !isSendingRef.current) setChatMessages(data.messages);
              setIsOtherUserTyping(!!data.is_typing);
              setLoadingChatMessages(false);
          }).catch(() => { setLoadingChatMessages(false); });
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
    }
  }, [isChatOpen, activeChatUser, API]);

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
      sender_id: currentUser ? currentUser.id : 999999,
      receiver_id: activeChatUser.id,
      message: messageText,
      image: imagePreviewUrl ? 'optimistic_image' : null,
      optimistic_preview: imagePreviewUrl,
      is_read: false,
      created_at: new Date().toISOString(),
    };
    setChatMessages(prev => [...prev, optimisticMsg]);

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

  const handleViewItem = (item: ShopItem) => {
    setViewItem(item);
    setSelectedVariant(null);
    setSelectedSize(null);
    setReviews([]); // Clear old reviews while loading
    setActiveImageIdx(0);
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
      const res = await fetch(`${API}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ item_id: buyModal.item.id, quantity: 1, price: buyModal.price, variation: buyModal.variation }),
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
        localStorage.setItem('last_order_time', Date.now().toString());
        localStorage.setItem('shopply_order_update', Date.now().toString());
        getApiCache().invalidate('/cart');
        getApiCache().invalidate('/orders');
        getApiCache().invalidate('/shop/items');
        window.dispatchEvent(new Event('order_placed'));
        setSuccessMsg(`You successfully purchased "${buyModal.item.name}" for ₱${parseFloat(buyModal.price).toFixed(2)}!`);
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

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
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
        .title{font-size:36px;font-weight:800;color:#0f172a;letter-spacing:-1px;margin-bottom:16px}
        .subtitle{font-size:16px;color:#64748b;max-width:600px;margin:0 auto;line-height:1.6}
        
        .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:24px}
        .item-card{background:#fff;border-radius:16px;overflow:hidden;
          box-shadow:0 4px 20px rgba(0,0,0,.05);border:1px solid #f1f5f9;transition:all .3s;
          display:flex;flex-direction:column}
        .item-card:hover{transform:translateY(-4px);box-shadow:0 12px 30px rgba(0,0,0,.08)}
        .item-card-img{width:100%;height:220px;object-fit:cover;display:block}
        .item-image-placeholder{height:220px;background:linear-gradient(135deg,#f8fafc,#e2e8f0);
          display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:48px}
        .item-content{padding:24px;flex-grow:1;display:flex;flex-direction:column}
        .item-name{font-size:18px;font-weight:700;color:#0f172a;margin-bottom:8px}
        .item-desc{font-size:14px;color:#64748b;line-height:1.5;margin-bottom:20px;flex-grow:1}
        .item-footer{display:flex;align-items:center;justify-content:space-between;
          padding-top:16px;border-top:1px solid #f1f5f9}
        .item-price{font-size:20px;font-weight:700;color:#10b981}
        .item-seller{font-size:12px;color:#94a3b8;display:flex;align-items:center;gap:6px}
        .seller-avatar{width:24px;height:24px;border-radius:50%;background:#e2e8f0;
          display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#64748b}
        
        .buy-btn{padding:10px 14px;background:linear-gradient(135deg,#7c3aed,#4f46e5);
          border:none;border-radius:8px;color:#fff;font-size:13px;font-weight:600;
          font-family:'Inter',sans-serif;cursor:pointer;transition:all .2s;
          display:inline-flex;align-items:center;justify-content:center;gap:6px;
          box-shadow:0 3px 12px rgba(124,58,237,.3);flex:1}
        .buy-btn:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(124,58,237,.4)}
        
        .add-cart-btn{padding:10px 14px;background:#fff;border:1.5px solid #7c3aed;
          color:#7c3aed;border-radius:8px;font-size:13px;font-weight:600;
          font-family:'Inter',sans-serif;cursor:pointer;transition:all .2s;
          display:inline-flex;align-items:center;justify-content:center;gap:6px;flex:1}
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
          display:flex;align-items:center;justify-content:center;z-index:500;padding:20px}
        .detail-modal{position:relative;background:#fff;border-radius:24px;max-width:1100px;width:100%;max-height:90vh;
          overflow-y:auto;display:flex;flex-direction:column;box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);animation:scaleUp .3s ease}
        @keyframes scaleUp{from{opacity:0;transform:scale(0.95)}to{opacity:1;transform:scale(1)}}
        
        .detail-content{display:grid;grid-template-columns:1fr 1fr;gap:48px;padding:48px}
        @media (max-width: 950px) { .detail-content{grid-template-columns:1fr;padding:24px} }
        
        .detail-img-side{display:flex;flex-direction:column;gap:16px}
        .main-detail-img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:20px;background:#f8fafc;border:1px solid #f1f5f9}
        .variant-thumbs{display:flex;gap:12px;overflow-x:auto;padding:4px;scrollbar-width:none;-ms-overflow-style:none}
        .variant-thumbs::-webkit-scrollbar{display:none}
        .v-thumb{width:70px;height:70px;border-radius:12px;object-fit:cover;cursor:pointer;
          border:2px solid transparent;transition:all .2s;flex-shrink:0;background:#f8fafc}
        .v-thumb.active{border-color:#7c3aed;transform:scale(1.05);box-shadow:0 4px 12px rgba(124,58,237,.2)}
        
        .detail-info-side{display:flex;flex-direction:column;gap:28px}
        .detail-category{font-size:12px;font-weight:700;color:#7c3aed;text-transform:uppercase;letter-spacing:1.5px}
        .detail-name{font-size:36px;font-weight:800;color:#0f172a;letter-spacing:-1px;line-height:1.1}
        .detail-price{font-size:32px;font-weight:800;color:#10b981}
        .detail-desc{font-size:15px;color:#64748b;line-height:1.7}
        .modal-actions-container{display:flex;gap:16px;margin-top:12px}
        
        @media (max-width: 768px) {
          .rating-summary{display:flex;flex-direction:column;gap:20px;padding:20px;align-items:center;text-align:center}
          .review-filters{justify-content:center;margin-bottom:0}
        }
        
        @media (max-width: 480px) {
          .modal-overlay{padding:0}
          .detail-modal{border-radius:0;max-height:100vh;height:100%;width:100%;max-width:100%}
          .detail-content{padding:12px;gap:20px}
          .detail-info-side{gap:16px}
          .detail-name{font-size:24px}
          .detail-price{font-size:24px}
          .detail-category{font-size:11px}
          .modal-back-btn{top:12px;left:12px;margin-bottom:-40px}
          .modal-actions-container{flex-direction:column;gap:12px}
          .buy-btn, .add-cart-btn{width:100%;height:48px !important}
          .spec-grid{grid-template-columns:1fr;padding:16px}
          .seller-header-bar{padding:16px;gap:20px}
          .seller-stats-grid{grid-template-columns:1fr 1fr;gap:8px 16px;width:100%}
          .seller-left-side{width:100%}
        }
        
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
        
        .rating-section{border-top:1px solid #f1f5f9;padding:48px;background:#fdfdfd}
        .rating-header-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:32px}
        .rating-summary{display:flex;align-items:center;gap:32px;background:#fff;padding:28px;border-radius:24px;border:1px solid #f1f5f9;box-shadow:0 4px 15px rgba(0,0,0,.02)}
        .big-rating{font-size:44px;font-weight:800;color:#7c3aed}
        .rating-stars-col{display:flex;flex-direction:column;gap:4px}
        .stars{display:flex;gap:3px;color:#f59e0b}
        
        .review-filters{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:32px}
        .rev-filter{padding:8px 16px;border-radius:20px;border:1px solid #e2e8f0;font-size:12px;font-weight:600;color:#64748b;cursor:pointer;background:#fff}
        .rev-filter.active{background:#7c3aed;color:#fff;border-color:#7c3aed}
        
        .review-card{padding:32px 0;border-bottom:1px solid #f1f5f9}
        .review-user{display:flex;align-items:center;gap:14px;margin-bottom:12px}
        .u-avatar{width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#e2e8f0,#cbd5e1);
          display:flex;align-items:center;justify-content:center;font-weight:700;color:#64748b;font-size:14px}
        .u-info{display:flex;flex-direction:column;gap:2px}
        .u-name{font-size:14px;font-weight:700;color:#0f172a}
        .r-date{font-size:12px;color:#94a3b8}
        .r-text{font-size:15px;color:#475569;line-height:1.7;margin:16px 0}
        .r-variation{font-size:12px;color:#94a3b8;margin-bottom:16px;display:block}
        .r-images{display:flex;gap:12px}
        .r-img{width:90px;height:90px;border-radius:12px;object-fit:cover;cursor:pointer;border:1px solid #f1f5f9}
        
        .back-to-top{position:fixed;bottom:32px;right:32px;width:50px;height:50px;
          border-radius:50%;background:#0f172a;color:#fff;display:flex;align-items:center;
          justify-content:center;cursor:pointer;border:none;box-shadow:0 8px 24px rgba(0,0,0,.15);
          transition:all .3s ease;z-index:1000;opacity:0;visibility:hidden;transform:translateY(20px)}
        .back-to-top.visible{opacity:1;visibility:visible;transform:translateY(0)}
        .back-to-top:hover{transform:translateY(-4px);background:#1e293b;box-shadow:0 12px 30px rgba(0,0,0,.2)}
 
        .modal-back-btn{position:sticky;top:20px;left:20px;align-self:flex-start;margin-bottom:-40px;width:40px;height:40px;
          border-radius:50%;background:rgba(255,255,255,0.9);backdrop-filter:blur(10px);
          display:flex;align-items:center;justify-content:center;cursor:pointer;
          border:1px solid #e2e8f0;color:#0f172a;z-index:100;transition:all .2s}
        .modal-back-btn:hover{background:#fff;transform:scale(1.1);box-shadow:0 4px 12px rgba(0,0,0,.1)}
 
        .seller-header-bar{background:#fff;border-top:1px solid #f1f5f9;border-bottom:1px solid #f1f5f9;padding:32px 48px;display:flex;align-items:center;justify-content:space-between;gap:32px;flex-wrap:wrap}
        @media (max-width: 950px) { .seller-header-bar{padding:24px;flex-direction:column;align-items:flex-start} }
        .seller-left-side{display:flex;align-items:center;gap:20px;flex-wrap:wrap}
        .seller-avatar-wrapper{position:relative}
        .seller-main-avatar{width:72px;height:72px;border-radius:50%;object-fit:cover;background:#f1f5f9;border:2px solid #e2e8f0;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:700;color:#64748b}
        .seller-mall-badge{position:absolute;bottom:-4px;left:50%;transform:translateX(-50%);background:#7c3aed;color:#fff;font-size:10px;font-weight:700;padding:2px 8px;border-radius:10px;border:2px solid #fff;white-space:nowrap;box-shadow:0 2px 4px rgba(0,0,0,.1)}
        .seller-info-col{display:flex;flex-direction:column;gap:4px}
        .seller-title-name{font-size:18px;font-weight:700;color:#0f172a;display:flex;align-items:center;gap:6px}
        .seller-active-status{font-size:12px;color:#64748b;margin-bottom:8px}
        .seller-actions-row{display:flex;gap:10px}
        .seller-btn-chat{padding:8px 16px;background:#f3e8ff;border:1px solid #7c3aed;color:#7c3aed;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px;transition:all .2s}
        .seller-btn-chat:hover{background:#e9d5ff;transform:translateY(-1px)}
        .seller-btn-shop{padding:8px 16px;background:#fff;border:1px solid #cbd5e1;color:#475569;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px;transition:all .2s}
        .seller-btn-shop:hover{background:#f8fafc;transform:translateY(-1px)}
        .seller-stats-grid{display:grid;grid-template-columns:repeat(3, 1fr);gap:16px 48px;flex-grow:1;max-width:600px}
        @media (max-width: 650px) {
          .seller-stats-grid{grid-template-columns:1fr 1fr;gap:12px}
          .seller-stat-box{flex-direction:column;align-items:flex-start;gap:4px;border-bottom:none;padding-bottom:0}
        }
        .seller-stat-box{display:flex;align-items:center;justify-content:space-between;gap:16px;border-bottom:1px solid #f8fafc;padding-bottom:4px}
        .seller-stat-label{font-size:13px;color:#64748b}
        .seller-stat-val{font-size:13px;font-weight:700;color:#7c3aed}
        .seller-stat-val.dark{color:#0f172a}
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
            <Link href="/about" className="nav-link">About</Link>
            <Link href="/cart" className="cart-nav-icon">
              <IconCart />
              {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
            </Link>
            <Link href="/dashboard" className="login-btn">Dashboard</Link>
          </div>
        </nav>

        <main className="main">
          <div className="header" style={{ position: 'relative', overflow: 'hidden', padding: '64px 20px', marginBottom: '40px', borderRadius: '24px', background: 'linear-gradient(135deg, #faf5ff 0%, #f0f4ff 100%)', border: '1px solid rgba(124, 58, 237, 0.1)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            {/* Background decorative blobs */}
            <div style={{ position: 'absolute', top: '-50%', left: '-10%', width: '300px', height: '300px', background: 'rgba(124, 58, 237, 0.15)', filter: 'blur(60px)', borderRadius: '50%' }}></div>
            <div style={{ position: 'absolute', bottom: '-50%', right: '-10%', width: '300px', height: '300px', background: 'rgba(37, 99, 235, 0.15)', filter: 'blur(60px)', borderRadius: '50%' }}></div>
            
            <span style={{ position: 'relative', display: 'inline-block', padding: '6px 16px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '100px', fontSize: '12px', fontWeight: 800, color: '#7c3aed', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '20px', boxShadow: '0 4px 12px rgba(124,58,237,0.05)' }}>
              Shopply Marketplace
            </span>
            <h1 className="title" style={{ position: 'relative', fontSize: '46px', margin: '0 0 16px 0', background: 'linear-gradient(135deg, #0f172a, #475569)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1.2 }}>
              Discover Amazing Items
            </h1>
            <p className="subtitle" style={{ position: 'relative', fontSize: '17px', maxWidth: '600px', color: '#475569' }}>
              Browse the latest premium products published by our community. Find exactly what you&apos;re looking for, seamlessly and beautifully.
            </p>
          </div>

          <div className="categories-wrapper" style={{display: 'flex', gap: '12px', marginBottom: '32px', overflowX: 'auto', paddingBottom: '8px', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none'}}>
            {["All", ...Array.from(new Set(items.map(i => i.category).filter(Boolean)))].map(cat => (
              <button 
                key={cat} 
                onClick={() => setSelectedCategory(cat as string)}
                style={{
                  padding: '8px 24px',
                  borderRadius: '100px',
                  border: '1px solid ' + (selectedCategory === cat ? '#7c3aed' : '#e2e8f0'),
                  background: selectedCategory === cat ? '#7c3aed' : '#fff',
                  color: selectedCategory === cat ? '#fff' : '#475569',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s',
                  boxShadow: selectedCategory === cat ? '0 4px 12px rgba(124, 58, 237, 0.2)' : 'none'
                }}
              >
                {cat as string}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="grid">
              {Array.from({ length: 8 }).map((_, i) => (
                <SkeletonShopCard key={i} />
              ))}
            </div>
          ) : items.filter(i => selectedCategory === "All" || i.category === selectedCategory).length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <svg width="48" height="48" fill="none" stroke="#94a3b8" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M6 2L3 7v13a2 2 0 002 2h14a2 2 0 002-2V7l-3-5H6z"/><line x1="3" y1="7" x2="21" y2="7"/><path d="M16 11a4 4 0 01-8 0"/></svg>
              </div>
              <div className="empty-text">No items found.</div>
              <p className="subtitle" style={{marginTop: '8px'}}>Try changing the category or check back later!</p>
            </div>
          ) : (
            <div className="grid">
              {items.filter(i => selectedCategory === "All" || i.category === selectedCategory).map((item) => (
                <div key={item.id} className="item-card" onClick={() => handleViewItem(item)} style={{cursor:'pointer'}}>
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
                        const placeholder = e.currentTarget.nextElementSibling as HTMLElement;
                        if (placeholder) placeholder.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  {(!item.image) && (
                    <div className="item-image-placeholder">
                      <svg width="48" height="48" fill="none" stroke="#cbd5e1" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
                    </div>
                  )}
                  <div className="item-content">
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                      <h3 className="item-name">{item.name}</h3>
                      <div style={{display:'flex',alignItems:'center',gap:4}}>
                        <StarRating rating={Math.round(Number(item.reviews_avg_rating || 0))} size={12} />
                        <span style={{fontSize:11,color:'#94a3b8'}}>({Number(item.reviews_avg_rating || 0).toFixed(1)})</span>
                      </div>
                    </div>
                    <p className="item-desc">{item.description || "No description provided."}</p>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
                      <div style={{fontSize: 13, color: '#64748b'}}>
                        {calculateTotalStock(item) > 0 ? (
                          <>Stock: <strong style={{color: '#0f172a'}}>{calculateTotalStock(item)} left</strong></>
                        ) : (
                          <strong style={{color: '#ef4444'}}>Out of Stock</strong>
                        )}
                      </div>
                      <span style={{fontSize:11,color:'#94a3b8'}}>{item.reviews_count || 0} Reviews</span>
                    </div>
                    <div className="item-footer" style={{display:'flex', flexDirection:'column', gap:10}} onClick={e => e.stopPropagation()}>
                      <span className="item-price" style={{alignSelf:'flex-start'}}>{formatPriceDisplay(item)}</span>
                      <div style={{display:'flex', gap:8, width:'100%'}}>
                        {calculateTotalStock(item) > 0 ? (
                          <>
                            <button className="add-cart-btn" onClick={(e) => {
                              if (item.attributes?.sizes && item.attributes.sizes.length > 0) {
                                handleViewItem(item);
                              } else {
                                handleAddToCart(item, item.attributes?.colors?.[0] || "", item.attributes?.variant_prices?.[0] || item.price);
                              }
                            }} disabled={addingToCart === item.id}>
                              <IconCart /> {addingToCart === item.id ? '...' : 'Add to Cart'}
                            </button>
                            <button className="buy-btn" onClick={(e) => {
                              if (item.attributes?.sizes && item.attributes.sizes.length > 0) {
                                handleViewItem(item);
                              } else {
                                setBuyModal({item, variation: item.attributes?.colors?.[0] || "", price: item.attributes?.variant_prices?.[0] || item.price, variantIdx: 0});
                              }
                            }}>
                              Buy Now
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
                      {item.user.avatar ? (
                        <img 
                          src={getAvatarUrl(item.user.avatar)} 
                          alt={item.user.name} 
                          className="seller-avatar" 
                          style={{objectFit: 'cover', width: '28px', height: '28px', flexShrink: 0}} 
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(item.user.name)}&background=e2e8f0&color=64748b&bold=true`;
                          }}
                        />
                      ) : (
                        <div className="seller-avatar" style={{width: '28px', height: '28px', flexShrink: 0}}>{item.user.name.charAt(0).toUpperCase()}</div>
                      )}
                      <span style={{color: '#0f172a', fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                        {item.user.name}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

        {/* PRODUCT DETAIL MODAL */}
        {viewItem && (
          (() => {
            const allAvailableImages = [
            ...(viewItem.attributes?.main_images && viewItem.attributes.main_images.length > 0 ? viewItem.attributes.main_images : (viewItem.image ? [viewItem.image] : [])).map(path => getImageUrl(path)),
            ...(viewItem.attributes?.variant_image_paths || []).filter(Boolean).map(path => getImageUrl(path))
          ];

          const handlePrevImage = (e: React.MouseEvent) => {
            e.stopPropagation();
            if (allAvailableImages.length <= 1) return;
            const newIdx = activeImageIdx <= 0 ? allAvailableImages.length - 1 : activeImageIdx - 1;
            setActiveImageIdx(newIdx);
            const mainLen = viewItem.attributes?.main_images?.length || (viewItem.image ? 1 : 0);
            setSelectedVariant(newIdx >= mainLen ? newIdx - mainLen : null);
          };

          const handleNextImage = (e: React.MouseEvent) => {
            e.stopPropagation();
            if (allAvailableImages.length <= 1) return;
            const newIdx = activeImageIdx >= allAvailableImages.length - 1 ? 0 : activeImageIdx + 1;
            setActiveImageIdx(newIdx);
            const mainLen = viewItem.attributes?.main_images?.length || (viewItem.image ? 1 : 0);
            setSelectedVariant(newIdx >= mainLen ? newIdx - mainLen : null);
          };

          return (
            <div className="modal-overlay" onClick={() => setViewItem(null)}>
              <div className="detail-modal" onClick={e => e.stopPropagation()}>
                <button className="modal-back-btn" onClick={() => setViewItem(null)}>
                  <IconBack />
                </button>
                <div className="detail-content">
                  <div className="detail-img-side">
                    <div style={{ position: 'relative', width: '100%', aspectRatio: '1/1', borderRadius: 20, overflow: 'hidden', background: '#f8fafc', border: '1px solid #f1f5f9', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
                      <img 
                        src={allAvailableImages[activeImageIdx] || "https://placehold.co/600x600/f8fafc/cbd5e1?text=No+Image"} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                      />
                      {allAvailableImages.length > 1 && (
                        <>
                          <button
                            type="button"
                            onClick={handlePrevImage}
                            style={{
                              position: 'absolute',
                              left: 0,
                              top: '50%',
                              transform: 'translateY(-50%)',
                              width: 48,
                              height: 80,
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
                              width: 48,
                              height: 80,
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
                      {(viewItem.attributes?.main_images && viewItem.attributes.main_images.length > 0 ? viewItem.attributes.main_images : (viewItem.image ? [viewItem.image] : [])).map((path, idx) => (
                        <img 
                          key={`main-${idx}`} 
                          src={getImageUrl(path)} 
                          className={`v-thumb ${activeImageIdx === idx ? 'active' : ''}`}
                          onClick={() => {
                            setActiveImageIdx(idx);
                            setSelectedVariant(null);
                          }}
                        />
                      ))}
                      {viewItem.attributes?.variant_image_paths?.map((path, idx) => {
                        const mainLen = viewItem.attributes?.main_images?.length || (viewItem.image ? 1 : 0);
                        const globalIdx = mainLen + idx;
                        return (
                          <img 
                            key={`var-${idx}`} 
                            src={getImageUrl(path)} 
                            className={`v-thumb ${activeImageIdx === globalIdx ? 'active' : ''}`}
                            onClick={() => {
                              setActiveImageIdx(globalIdx);
                              setSelectedVariant(idx);
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
                    <div style={{display:'flex',alignItems:'center',gap:12,marginTop:12}}>
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

                  <div className="detail-price">
                    {selectedVariant !== null 
                      ? `₱${parseFloat(viewItem.attributes?.variant_prices?.[selectedVariant] || viewItem.price).toFixed(2)}`
                      : formatPriceDisplay(viewItem)}
                  </div>
                  
                  <p className="detail-desc">{viewItem.description || "This item has no description yet. Explore its quality and features below."}</p>

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

                  {viewItem.attributes?.sizes && (
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
                    <button className="add-cart-btn" style={{height:52,flex:1}} onClick={() => {
                      if (viewItem.attributes?.colors && viewItem.attributes.colors.length > 0 && selectedVariant === null) {
                        setErrorMsg("Please select a color variation first.");
                        return;
                      }
                      if (viewItem.attributes?.sizes && viewItem.attributes.sizes.length > 0 && !selectedSize) {
                        setErrorMsg("Please select a size first.");
                        return;
                      }
                      const varIdx = selectedVariant !== null ? selectedVariant : 0;
                      let variationStr = "";
                      if (viewItem.attributes?.colors?.[varIdx]) variationStr += viewItem.attributes.colors[varIdx];
                      if (selectedSize) variationStr += (variationStr ? ", " : "") + selectedSize;
                      const priceStr = viewItem.attributes?.variant_prices?.[varIdx] || viewItem.price;
                      handleAddToCart(viewItem, variationStr, priceStr);
                    }}>
                      <IconCart /> Add to Cart
                    </button>
                    <button className="buy-btn" style={{height:52,flex:1.5}} onClick={() => {
                      if (viewItem.attributes?.colors && viewItem.attributes.colors.length > 0 && selectedVariant === null) {
                        setErrorMsg("Please select a color variation first.");
                        return;
                      }
                      if (viewItem.attributes?.sizes && viewItem.attributes.sizes.length > 0 && !selectedSize) {
                        setErrorMsg("Please select a size first.");
                        return;
                      }
                      const varIdx = selectedVariant !== null ? selectedVariant : 0;
                      let variationStr = "";
                      if (viewItem.attributes?.colors?.[varIdx]) variationStr += viewItem.attributes.colors[varIdx];
                      if (selectedSize) variationStr += (variationStr ? ", " : "") + selectedSize;
                      const priceStr = viewItem.attributes?.variant_prices?.[varIdx] || viewItem.price;
                      setBuyModal({item: viewItem, variation: variationStr, price: priceStr, variantIdx: varIdx});
                    }}>
                      Buy Now
                    </button>
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
                </div>
              </div>

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
                    <div className="seller-actions-row">
                      <button className="seller-btn-chat" onClick={() => {
                        const token = localStorage.getItem("token");
                        if (!token) {
                          setErrorMsg("Please log in to chat with sellers.");
                          return;
                        }
                        setActiveChatUser(viewItem.user);
                        setIsChatOpen(true);
                      }}>
                        <IconChat /> Chat Now
                      </button>
                      <button 
                        className="seller-btn-shop" 
                        onClick={() => handleToggleFollow(viewItem.user.id)}
                        style={{borderColor: followedSellers[viewItem.user.id] ? '#10b981' : '#cbd5e1', color: followedSellers[viewItem.user.id] ? '#10b981' : '#475569'}}
                      >
                        <IconShop /> {followedSellers[viewItem.user.id] ? "Following" : "+ Follow"}
                      </button>
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
                <div className="rating-header-row">
                  <h3 style={{fontSize:18,fontWeight:800,color:'#0f172a'}}>Product Ratings & Reviews</h3>
                </div>

                <div className="rating-summary">
                  <div style={{textAlign:'center'}}>
                    <div className="big-rating">
                      {reviews.length > 0 
                        ? (reviews.reduce((acc, r) => acc + Number(r.rating), 0) / reviews.length).toFixed(1) 
                        : "0.0"} 
                      <span style={{fontSize:16,color:'#94a3b8',fontWeight:500}}> out of 5</span>
                    </div>
                    <StarRating rating={Math.round(reviews.reduce((acc, r) => acc + Number(r.rating), 0) / (reviews.length || 1))} size={24} />
                  </div>
                  <div className="review-filters">
                    <button className="rev-filter active">All</button>
                    <button className="rev-filter">With Comments ({reviews.filter(r => r.comment).length})</button>
                    <button className="rev-filter">With Media ({reviews.filter(r => r.images && r.images.length > 0).length})</button>
                  </div>
                </div>

                {/* WRITE A REVIEW FORM */}
                <div style={{background:'#f8fafc',borderRadius:20,padding:24,marginBottom:40,border:'1.5px dashed #e2e8f0'}}>
                  <h4 style={{fontSize:15,fontWeight:700,color:'#0f172a',marginBottom:16}}>Share your experience</h4>
                  <form onSubmit={handleSubmitReview}>
                    <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}>
                      <span style={{fontSize:13,fontWeight:600,color:'#64748b'}}>Your Rating:</span>
                      <div style={{display:'flex',gap:4}}>
                        {[1,2,3,4,5].map(star => (
                          <button 
                            key={star} 
                            type="button" 
                            onClick={() => setRevRating(star)}
                            style={{background:'none',border:'none',cursor:'pointer',color:star <= revRating ? '#f59e0b' : '#cbd5e1',padding:0}}
                          >
                            <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.27 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z"/>
                            </svg>
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <textarea 
                      className="form-input" 
                      placeholder="Write your honest review here..." 
                      value={revComment} 
                      onChange={e => setRevComment(e.target.value)}
                      style={{width:'100%',minHeight:100,marginBottom:16,padding:16,borderRadius:12,resize:'none'}}
                    />

                    <div style={{marginBottom:20}}>
                      <label className="variant-section-label">Add Photos</label>
                      <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
                        {revPreviews.map((p, i) => (
                          <img key={i} src={p} style={{width:60,height:60,borderRadius:8,objectFit:'cover'}} />
                        ))}
                        <button 
                          type="button" 
                          onClick={() => document.getElementById('rev-img-input')?.click()}
                          style={{width:60,height:60,borderRadius:8,border:'1.5px dashed #cbd5e1',background:'#fff',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'#94a3b8'}}
                        >
                          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
                        </button>
                        <input id="rev-img-input" type="file" multiple accept="image/*" style={{display:'none'}} onChange={handleReviewImageChange} />
                      </div>
                    </div>

                    <button 
                      type="submit" 
                      disabled={submittingReview}
                      style={{width:'100%',padding:'14px',borderRadius:12,border:'none',background:'#0f172a',color:'#fff',fontWeight:700,cursor:'pointer',opacity:submittingReview ? 0.7 : 1}}
                    >
                      {submittingReview ? "Submitting..." : "Submit Review"}
                    </button>
                  </form>
                </div>

                {reviews.length === 0 ? (
                  <div style={{textAlign:'center',padding:'40px 0',color:'#94a3b8'}}>
                    <p>No reviews yet. Be the first to review this product!</p>
                  </div>
                ) : (
                  reviews.map(rev => (
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
                  ))
                )}
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
              <p style={{fontSize:14,color:'#64748b',marginBottom:8}}>
                {buyModal.variation ? `Variation: ${buyModal.variation}` : 'Standard'}
              </p>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 0',borderTop:'1px solid #f1f5f9',borderBottom:'1px solid #f1f5f9',marginBottom:24}}>
                <span style={{fontSize:13,color:'#94a3b8'}}>Total</span>
                <span style={{fontSize:24,fontWeight:800,color:'#10b981'}}>₱{parseFloat(buyModal.price).toFixed(2)}</span>
              </div>
              <div style={{display:'flex',gap:12}}>
                <button onClick={() => setBuyModal(null)} style={{flex:1,padding:'12px',borderRadius:10,border:'1.5px solid #e2e8f0',background:'#fff',color:'#64748b',fontWeight:600,fontSize:14,cursor:'pointer',fontFamily:'Inter,sans-serif'}}>Cancel</button>
                <button onClick={handleBuy} disabled={buying} style={{flex:2,padding:'12px',borderRadius:10,border:'none',background:'linear-gradient(135deg,#7c3aed,#4f46e5)',color:'#fff',fontWeight:600,fontSize:14,cursor:'pointer',fontFamily:'Inter,sans-serif',boxShadow:'0 4px 14px rgba(124,58,237,.3)',display:'inline-flex',alignItems:'center',justifyContent:'center',gap:6,opacity:buying ? 0.7 : 1}}>
                  <IconCart /> {buying ? "Processing..." : "Confirm Purchase"}
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
          <div style={{
            position: 'fixed',
            bottom: 85,
            right: 24,
            width: 720,
            maxWidth: 'calc(100vw - 48px)',
            height: 540,
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
              width: 260,
              borderRight: '1px solid #e2e8f0',
              background: '#f8fafc',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{padding: '20px 20px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                <h3 style={{fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0}}>Chats</h3>
                <span style={{fontSize: 12, fontWeight: 600, color: '#64748b', background: '#e2e8f0', padding: '4px 10px', borderRadius: 12}}>
                  {chatConversations.length}
                </span>
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
                        setActiveChatUser(conv.user);
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
                        <img src={getAvatarUrl(conv.user.avatar)} alt={conv.user.name} style={{width: 44, height: 44, borderRadius: '50%', objectFit: 'cover'}} />
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
            <div style={{flex: 1, display: 'flex', flexDirection: 'column', background: '#fff'}}>
              {activeChatUser ? (
                <>
                  {/* CHAT HEADER */}
                  <div style={{padding: '16px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
                      {activeChatUser.avatar ? (
                        <img src={getAvatarUrl(activeChatUser.avatar)} alt={activeChatUser.name} style={{width: 40, height: 40, borderRadius: '50%', objectFit: 'cover'}} />
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
                      onClick={() => setIsChatOpen(false)}
                      style={{background: '#f1f5f9', border: 'none', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', cursor: 'pointer'}}
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
                      <div style={{textAlign: 'center', margin: 'auto 0', color: '#94a3b8', fontSize: 14}}>
                        <div style={{fontSize: 32, marginBottom: 8}}>👋</div>
                        Say hello to {activeChatUser.name}!
                      </div>
                    ) : (
                      chatMessages.map(msg => {
                        const isMe = currentUser ? msg.sender_id === currentUser.id : msg.sender_id !== activeChatUser.id; // Fallback comparison if currentUser missing
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
                                <img src={getAvatarUrl(activeChatUser.avatar)} alt={activeChatUser.name} style={{width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', marginBottom: 4}} />
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
                                borderRadius: isMe ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                                padding: '12px 18px',
                                fontSize: 14,
                                lineHeight: 1.5,
                                boxShadow: isMe ? '0 4px 12px rgba(124, 58, 237, 0.2)' : 'none',
                                wordBreak: 'break-word',
                                whiteSpace: 'pre-wrap'
                              }}>
                                {msg.image && (
                                  <div style={{ marginBottom: msg.message ? 8 : 0 }}>
                                    <img
                                      src={msg.optimistic_preview || getImageUrl(msg.image)}
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
        )}
      </div>
    </>
  );
}
