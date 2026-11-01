"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PublicHeader, PublicFooter } from "@/components/PublicChrome";
import CookieBanner from "@/components/CookieBanner";

interface StoreItem {
  id: number | string;
  name: string;
  description?: string;
  price: string | number;
  original_price?: string | number | null;
  discount_percent?: number | null;
  stock?: number;
  image?: string | null;
  category?: string;
  reviews_count?: number;
  reviews_avg_rating?: number;
  sold_count?: number;
  location?: string | null;
  user?: {
    name?: string;
    location?: string | null;
    avatar?: string;
  };
}

interface StorefrontHomeProps {
  user: null;
  onLoginClick?: () => void;
}

const CURATED_SHOWCASE_ITEMS: StoreItem[] = [
  {
    id: "curated-1",
    name: "Studio Pro Wireless ANC Headphones",
    description: "Over-ear active noise cancellation headphones with 40-hour battery life, plush memory-foam earcups, and USB-C fast charging.",
    price: 2490,
    original_price: 2990,
    discount_percent: 17,
    stock: 18,
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80",
    category: "Electronics",
    reviews_count: 24,
    reviews_avg_rating: 4.9,
    sold_count: 68,
    location: "Makati, Metro Manila",
    user: { name: "Studio Sounds PH", location: "Makati, Metro Manila" },
  },
  {
    id: "curated-2",
    name: "AeroSwift Road Running Shoes",
    description: "Lightweight engineered mesh upper with responsive midsole cushioning built for daily road miles and gym training.",
    price: 1850,
    original_price: 2200,
    discount_percent: 16,
    stock: 34,
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop&q=80",
    category: "Footwear",
    reviews_count: 19,
    reviews_avg_rating: 4.8,
    sold_count: 52,
    location: "Cebu City, Cebu",
    user: { name: "Aero Athletics", location: "Cebu City, Cebu" },
  },
  {
    id: "curated-3",
    name: "Minimalist Chronograph Everyday Watch",
    description: "Brushed stainless steel 40mm case with scratch-resistant mineral glass and interchangeable leather strap.",
    price: 1690,
    stock: 15,
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80",
    category: "Accessories",
    reviews_count: 14,
    reviews_avg_rating: 4.7,
    sold_count: 41,
    location: "Quezon City, Metro Manila",
    user: { name: "Meridian Goods", location: "Quezon City, Metro Manila" },
  },
  {
    id: "curated-4",
    name: "Heavyweight Combed Cotton Overshirt",
    description: "Breathable 280gsm 100% combed cotton twill overshirt tailored for layering in tropical weather.",
    price: 980,
    stock: 42,
    image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&auto=format&fit=crop&q=80",
    category: "Fashion",
    reviews_count: 31,
    reviews_avg_rating: 4.9,
    sold_count: 114,
    location: "Pasig, Metro Manila",
    user: { name: "Loom & Thread MNL", location: "Pasig, Metro Manila" },
  },
  {
    id: "curated-5",
    name: " Matte Ceramic Pour-Over Coffee Set",
    description: "Hand-glazed stoneware V60 dripper and 600ml server carafes crafted for clean, balanced morning brews.",
    price: 1150,
    stock: 22,
    image: "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=800&auto=format&fit=crop&q=80",
    category: "Home & Living",
    reviews_count: 16,
    reviews_avg_rating: 4.8,
    sold_count: 39,
    location: "Davao City, Davao",
    user: { name: "Casa Tableware", location: "Davao City, Davao" },
  },
  {
    id: "curated-6",
    name: "Water-Resistant Commuter Daypack 20L",
    description: "Padded 16-inch laptop sleeve, Cordura ballistic nylon shell, and concealed quick-access transit pocket.",
    price: 1590,
    original_price: 1890,
    discount_percent: 16,
    stock: 27,
    image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&auto=format&fit=crop&q=80",
    category: "Accessories",
    reviews_count: 22,
    reviews_avg_rating: 4.8,
    sold_count: 63,
    location: "Taguig, Metro Manila",
    user: { name: "Transit Carry Co.", location: "Taguig, Metro Manila" },
  },
  {
    id: "curated-7",
    name: "Daily Barrier Hydrating Facial Cleanser",
    description: "Gentle pH-balanced amino acid gel cleanser with ceramides and centella extract for sensitive skin.",
    price: 495,
    stock: 60,
    image: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=800&auto=format&fit=crop&q=80",
    category: "Beauty",
    reviews_count: 42,
    reviews_avg_rating: 4.9,
    sold_count: 190,
    location: "Mandaluyong, Metro Manila",
    user: { name: " Botanica Skin PH", location: "Mandaluyong, Metro Manila" },
  },
  {
    id: "curated-8",
    name: "Aluminum Mechanical Desk Lamp LED",
    description: "Stepless warm-to-daylight dimming, high-CRI eye-care LED bar, and weighted anodized aluminum base.",
    price: 1350,
    stock: 19,
    image: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800&auto=format&fit=crop&q=80",
    category: "Home & Living",
    reviews_count: 11,
    reviews_avg_rating: 4.7,
    sold_count: 29,
    location: "Iloilo City, Iloilo",
    user: { name: "Forma Workspace", location: "Iloilo City, Iloilo" },
  },
];

const DEPARTMENTS = [
  {
    id: "Electronics",
    title: "Electronics & Audio",
    subtitle: "Headphones, wearables & desk tech",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
        <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
      </svg>
    ),
  },
  {
    id: "Footwear",
    title: "Footwear",
    subtitle: "Running, court & everyday sneakers",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 16l2-7 5 3 6-2 3 4v4H4v-2z" />
        <line x1="4" y1="18" x2="20" y2="18" />
      </svg>
    ),
  },
  {
    id: "Fashion",
    title: "Apparel & Basics",
    subtitle: "Everyday menswear & womenswear",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.38 3.46L16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z" />
      </svg>
    ),
  },
  {
    id: "Home & Living",
    title: "Home & Living",
    subtitle: "Tableware, lighting & workspace",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    id: "Beauty",
    title: "Beauty & Care",
    subtitle: "Skincare, personal care & wellness",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 3h6v4H9z" />
        <rect x="7" y="7" width="10" height="14" rx="2" />
        <line x1="12" y1="11" x2="12" y2="17" />
        <line x1="9" y1="14" x2="15" y2="14" />
      </svg>
    ),
  },
  {
    id: "Accessories",
    title: "Bags & Watches",
    subtitle: "Commuter packs, totes & timepieces",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="7" />
        <polyline points="12 9 12 12 13.5 13.5" />
        <path d="M16.51 17.35l-.35 3.83a2 2 0 0 1-2 1.82H9.83a2 2 0 0 1-2-1.82l-.35-3.83m.01-10.7l.35-3.83A2 2 0 0 1 9.83 1h4.35a2 2 0 0 1 2 1.82l.35 3.83" />
      </svg>
    ),
  },
];

function formatPeso(val: string | number | undefined | null): string {
  const num = Number(val || 0);
  return `₱${num.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function normalizeCategory(raw?: string): string {
  if (!raw) return "Other";
  const lower = raw.toLowerCase();
  if (lower.includes("audio") || lower.includes("tech") || lower.includes("electr") || lower.includes("gadget")) {
    return "Electronics";
  }
  if (lower.includes("foot") || lower.includes("shoe") || lower.includes("sneaker")) {
    return "Footwear";
  }
  if (lower.includes("fash") || lower.includes("cloth") || lower.includes("apparel") || lower.includes("shirt")) {
    return "Fashion";
  }
  if (lower.includes("home") || lower.includes("living") || lower.includes("kitchen") || lower.includes("desk")) {
    return "Home & Living";
  }
  if (lower.includes("beaut") || lower.includes("skin") || lower.includes("care")) {
    return "Beauty";
  }
  if (lower.includes("watch") || lower.includes("bag") || lower.includes("access")) {
    return "Accessories";
  }
  return raw;
}

export default function StorefrontHome({ onLoginClick }: StorefrontHomeProps) {
  const [liveItems, setLiveItems] = useState<StoreItem[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [previewItem, setPreviewItem] = useState<StoreItem | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (token) setIsLoggedIn(true);
    } catch {}
  }, []);

  useEffect(() => {
    let rafId: number | null = null;
    const onScroll = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(() => {
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
        setScrollProgress(Math.min(100, Math.max(0, progress)));
        setShowScrollTop(scrollTop > 380);
        rafId = null;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafId !== null) window.cancelAnimationFrame(rafId);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("sf-revealed");
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: "0px 0px -30px 0px",
      }
    );

    const elements = document.querySelectorAll(".sf-scroll-reveal:not(.sf-revealed)");
    elements.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
    };
  }, [liveItems, selectedCategory]);

  useEffect(() => {
    let active = true;
    fetch("/api/shop/items")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data || !Array.isArray(data.items)) return;
        setLiveItems(data.items);
      })
      .catch(() => {
        // Fallback smoothly to curated showcase items
      });
    return () => {
      active = false;
    };
  }, []);

  const catalogItems = useMemo(() => {
    const merged: StoreItem[] = [];
    const seenNames = new Set<string>();

    for (const item of liveItems) {
      if (!item?.name) continue;
      const key = item.name.trim().toLowerCase();
      if (!seenNames.has(key)) {
        seenNames.add(key);
        merged.push(item);
      }
    }

    for (const item of CURATED_SHOWCASE_ITEMS) {
      const key = item.name.trim().toLowerCase();
      if (!seenNames.has(key) && merged.length < 8) {
        seenNames.add(key);
        merged.push(item);
      }
    }

    return merged;
  }, [liveItems]);

  const filteredItems = useMemo(() => {
    return catalogItems.filter((item) => {
      const cat = normalizeCategory(item.category);
      const matchesCat =
        selectedCategory === "All" ||
        cat.toLowerCase() === selectedCategory.toLowerCase() ||
        (item.category || "").toLowerCase() === selectedCategory.toLowerCase();
      const q = searchQuery.trim().toLowerCase();
      const matchesQuery =
        !q ||
        item.name.toLowerCase().includes(q) ||
        (item.description || "").toLowerCase().includes(q) ||
        (item.category || "").toLowerCase().includes(q) ||
        (item.user?.location || item.location || "").toLowerCase().includes(q);
      return matchesCat && matchesQuery;
    });
  }, [catalogItems, selectedCategory, searchQuery]);

  const triggerLogin = (e?: React.MouseEvent) => {
    if (onLoginClick) {
      e?.preventDefault();
      onLoginClick();
    }
  };

  const selectDepartment = (deptId: string) => {
    setSelectedCategory(deptId);
    const el = document.getElementById("catalog");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="sf-root">
      {/* Scroll Progress Bar */}
      <div className="sf-scroll-progress-track" aria-hidden="true">
        <div className="sf-scroll-progress-bar" style={{ width: `${scrollProgress}%` }} />
      </div>
      <style suppressHydrationWarning>{`
        .sf-root {
          min-height: 100vh;
          background: #FFFFFF;
          color: #111827;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        .sf-container {
          max-width: 1240px;
          margin: 0 auto;
          padding: 0 24px;
        }

        /* Hero */
        .sf-hero {
          background: #F7F7F5;
          border-bottom: 1px solid #E5E7EB;
          padding: 56px 0 64px;
        }
        .sf-hero-grid {
          display: grid;
          grid-template-columns: 1.08fr 0.92fr;
          gap: 48px;
          align-items: center;
        }
        .sf-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 5px 12px;
          border-radius: 6px;
          background: #ECFDF5;
          border: 1px solid #A7F3D0;
          color: #0D6847;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.02em;
          margin-bottom: 20px;
        }
        .sf-eyebrow-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #059669;
        }
        .sf-hero-title {
          font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
          font-size: clamp(32px, 4.2vw, 50px);
          font-weight: 700;
          letter-spacing: -0.03em;
          line-height: 1.1;
          color: #111827;
          margin-bottom: 18px;
        }
        .sf-hero-sub {
          font-size: 16px;
          line-height: 1.65;
          color: #4B5563;
          max-width: 510px;
          margin-bottom: 28px;
        }
        .sf-hero-ctas {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 36px;
        }
        .sf-btn-primary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          height: 46px;
          padding: 0 22px;
          border-radius: 8px;
          background: #111827;
          border: 1px solid #111827;
          color: #FFFFFF;
          font-size: 14.5px;
          font-weight: 600;
          text-decoration: none;
          cursor: pointer;
          transition: background 0.15s ease;
        }
        .sf-btn-primary:hover {
          background: #1F2937;
        }
        .sf-btn-secondary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          height: 46px;
          padding: 0 22px;
          border-radius: 8px;
          background: #FFFFFF;
          border: 1px solid #D1D5DB;
          color: #111827;
          font-size: 14.5px;
          font-weight: 600;
          text-decoration: none;
          cursor: pointer;
          transition: background 0.15s ease, border-color 0.15s ease;
        }
        .sf-btn-secondary:hover {
          background: #F9FAFB;
          border-color: #9CA3AF;
        }
        .sf-trust-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 18px;
          padding-top: 24px;
          border-top: 1px solid #E5E7EB;
        }
        .sf-trust-item strong {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: #111827;
          margin-bottom: 3px;
        }
        .sf-trust-item span {
          display: block;
          font-size: 12.5px;
          color: #6B7280;
          line-height: 1.45;
        }

        /* Editorial Showcase Mosaic */
        .sf-showcase {
          display: grid;
          grid-template-columns: 1.15fr 0.85fr;
          gap: 14px;
        }
        .sf-showcase-main,
        .sf-showcase-sub {
          position: relative;
          border-radius: 14px;
          overflow: hidden;
          background: #FFFFFF;
          border: 1px solid #E5E7EB;
          cursor: pointer;
          display: block;
          text-decoration: none;
          color: inherit;
        }
        .sf-showcase-main {
          min-height: 390px;
        }
        .sf-showcase-stack {
          display: grid;
          grid-template-rows: 1fr 1fr;
          gap: 14px;
        }
        .sf-showcase-sub {
          min-height: 188px;
        }
        .sf-showcase-img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.35s ease;
        }
        .sf-showcase-main:hover .sf-showcase-img,
        .sf-showcase-sub:hover .sf-showcase-img {
          transform: scale(1.03);
        }
        .sf-showcase-caption {
          position: absolute;
          left: 12px;
          right: 12px;
          bottom: 12px;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(6px);
          border: 1px solid rgba(229, 231, 235, 0.9);
          border-radius: 10px;
          padding: 11px 13px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }
        .sf-showcase-caption small {
          display: block;
          font-size: 11px;
          font-weight: 600;
          color: #6B7280;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          margin-bottom: 2px;
        }
        .sf-showcase-caption strong {
          display: block;
          font-size: 13.5px;
          font-weight: 600;
          color: #111827;
        }
        .sf-showcase-price {
          font-size: 13.5px;
          font-weight: 700;
          color: #111827;
          font-variant-numeric: tabular-nums;
          white-space: nowrap;
        }

        /* Departments */
        .sf-section {
          padding: 64px 0;
        }
        .sf-section-alt {
          padding: 64px 0;
          background: #F7F7F5;
          border-top: 1px solid #E5E7EB;
          border-bottom: 1px solid #E5E7EB;
        }
        .sf-section-head {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 28px;
          flex-wrap: wrap;
        }
        .sf-section-head h2 {
          font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
          font-size: 24px;
          font-weight: 700;
          letter-spacing: -0.025em;
          color: #111827;
          margin-bottom: 4px;
        }
        .sf-section-head p {
          font-size: 14px;
          color: #6B7280;
        }
        .sf-link-inline {
          font-size: 13.5px;
          font-weight: 600;
          color: #111827;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }
        .sf-link-inline:hover {
          color: #0D6847;
        }
        .sf-dept-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 14px;
        }
        .sf-dept-card {
          background: #FFFFFF;
          border: 1px solid #E5E7EB;
          border-radius: 12px;
          padding: 18px 16px;
          text-align: left;
          cursor: pointer;
          transition: border-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .sf-dept-card:hover {
          border-color: #111827;
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(17, 24, 39, 0.05);
        }
        .sf-dept-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: #F7F7F5;
          color: #111827;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .sf-dept-card h3 {
          font-size: 14px;
          font-weight: 600;
          color: #111827;
          margin-bottom: 3px;
        }
        .sf-dept-card p {
          font-size: 12px;
          color: #6B7280;
          line-height: 1.45;
        }

        /* Catalog Toolbar */
        .sf-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }
        .sf-tabs {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .sf-tab {
          height: 36px;
          padding: 0 14px;
          border-radius: 8px;
          border: 1px solid #E5E7EB;
          background: #FFFFFF;
          color: #4B5563;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .sf-tab:hover {
          border-color: #9CA3AF;
          color: #111827;
        }
        .sf-tab.active {
          background: #111827;
          border-color: #111827;
          color: #FFFFFF;
          font-weight: 600;
        }
        .sf-search-box {
          position: relative;
          min-width: 250px;
        }
        .sf-search-box input {
          width: 100%;
          height: 38px;
          padding: 0 12px 0 36px;
          border-radius: 8px;
          border: 1px solid #D1D5DB;
          background: #FFFFFF;
          font-size: 13.5px;
          color: #111827;
          outline: none;
        }
        .sf-search-box input:focus {
          border-color: #111827;
        }
        .sf-search-icon {
          position: absolute;
          left: 11px;
          top: 50%;
          transform: translateY(-50%);
          color: #6B7280;
          pointer-events: none;
        }

        /* Product Cards */
        .sf-product-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
        }
        .sf-card {
          background: #FFFFFF;
          border: 1px solid #E5E7EB;
          border-radius: 12px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          cursor: pointer;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .sf-card:hover {
          border-color: #D1D5DB;
          box-shadow: 0 8px 24px rgba(17, 24, 39, 0.06);
        }
        .sf-card-media {
          position: relative;
          aspect-ratio: 1 / 1;
          background: #F3F4F6;
          overflow: hidden;
        }
        .sf-card-media img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s ease;
        }
        .sf-card:hover .sf-card-media img {
          transform: scale(1.03);
        }
        .sf-badge-cat {
          position: absolute;
          top: 10px;
          left: 10px;
          background: rgba(255, 255, 255, 0.94);
          border: 1px solid rgba(229, 231, 235, 0.9);
          color: #374151;
          font-size: 11px;
          font-weight: 600;
          padding: 3px 8px;
          border-radius: 6px;
        }
        .sf-badge-sale {
          position: absolute;
          top: 10px;
          right: 10px;
          background: #DC2626;
          color: #FFFFFF;
          font-size: 11px;
          font-weight: 700;
          padding: 3px 7px;
          border-radius: 6px;
        }
        .sf-card-body {
          padding: 14px 16px 16px;
          display: flex;
          flex-direction: column;
          flex: 1;
        }
        .sf-card-seller {
          font-size: 12px;
          color: #6B7280;
          margin-bottom: 4px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .sf-card-title {
          font-size: 14.5px;
          font-weight: 600;
          color: #111827;
          line-height: 1.4;
          margin-bottom: 10px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .sf-card-foot {
          margin-top: auto;
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 8px;
          padding-top: 10px;
          border-top: 1px solid #F3F4F6;
        }
        .sf-price-group {
          display: flex;
          align-items: baseline;
          gap: 6px;
          font-variant-numeric: tabular-nums;
        }
        .sf-price {
          font-size: 16px;
          font-weight: 700;
          color: #111827;
        }
        .sf-price-old {
          font-size: 12px;
          color: #9CA3AF;
          text-decoration: line-through;
        }
        .sf-rating {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          color: #4B5563;
          font-variant-numeric: tabular-nums;
        }

        /* How it works */
        .sf-how-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }
        .sf-how-panel {
          background: #F7F7F5;
          border: 1px solid #E5E7EB;
          border-radius: 14px;
          padding: 32px;
        }
        .sf-how-tag {
          display: inline-block;
          font-size: 11.5px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: #0D6847;
          margin-bottom: 8px;
        }
        .sf-how-panel h3 {
          font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
          font-size: 21px;
          font-weight: 700;
          color: #111827;
          letter-spacing: -0.02em;
          margin-bottom: 20px;
        }
        .sf-step-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-bottom: 24px;
        }
        .sf-step {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }
        .sf-step-num {
          width: 24px;
          height: 24px;
          border-radius: 6px;
          background: #111827;
          color: #FFFFFF;
          font-size: 12px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-top: 1px;
        }
        .sf-step strong {
          display: block;
          font-size: 14px;
          font-weight: 600;
          color: #111827;
          margin-bottom: 2px;
        }
        .sf-step span {
          display: block;
          font-size: 13.5px;
          color: #4B5563;
          line-height: 1.55;
        }

        /* CTA Banner */
        .sf-cta-banner {
          background: #111827;
          border-radius: 16px;
          padding: 44px 48px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 32px;
          color: #FFFFFF;
        }
        .sf-cta-banner h2 {
          font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
          font-size: 26px;
          font-weight: 700;
          letter-spacing: -0.025em;
          margin-bottom: 8px;
        }
        .sf-cta-banner p {
          font-size: 14.5px;
          color: #D1D5DB;
          max-width: 520px;
          line-height: 1.6;
        }
        .sf-cta-actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          flex-shrink: 0;
        }
        .sf-btn-white {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: 44px;
          padding: 0 20px;
          border-radius: 8px;
          background: #FFFFFF;
          color: #111827;
          font-size: 14px;
          font-weight: 600;
          text-decoration: none;
          cursor: pointer;
        }
        .sf-btn-white:hover {
          background: #F3F4F6;
        }
        .sf-btn-ghost-light {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: 44px;
          padding: 0 20px;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.25);
          background: transparent;
          color: #FFFFFF;
          font-size: 14px;
          font-weight: 600;
          text-decoration: none;
          cursor: pointer;
        }
        .sf-btn-ghost-light:hover {
          border-color: rgba(255, 255, 255, 0.5);
          background: rgba(255, 255, 255, 0.06);
        }

        /* Quick Preview Modal */
        .sf-modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 200;
          background: rgba(17, 24, 39, 0.55);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .sf-modal {
          background: #FFFFFF;
          border: 1px solid #E5E7EB;
          border-radius: 16px;
          max-width: 720px;
          width: 100%;
          overflow: hidden;
          display: grid;
          grid-template-columns: 1fr 1.1fr;
          box-shadow: 0 24px 48px rgba(17, 24, 39, 0.18);
          position: relative;
        }
        .sf-modal-img {
          background: #F3F4F6;
          min-height: 320px;
        }
        .sf-modal-img img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .sf-modal-content {
          padding: 28px;
          display: flex;
          flex-direction: column;
        }
        .sf-modal-close {
          position: absolute;
          top: 14px;
          right: 14px;
          width: 32px;
          height: 32px;
          border-radius: 8px;
          border: 1px solid #E5E7EB;
          background: #FFFFFF;
          color: #374151;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        @media (max-width: 1024px) {
          .sf-hero-grid {
            grid-template-columns: 1fr;
            gap: 36px;
          }
          .sf-dept-grid {
            grid-template-columns: repeat(3, 1fr);
          }
          .sf-product-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .sf-how-grid {
            grid-template-columns: 1fr;
          }
          .sf-cta-banner {
            flex-direction: column;
            align-items: flex-start;
            padding: 32px 28px;
          }
        }
        @media (max-width: 640px) {
          .sf-container {
            padding: 0 16px;
          }
          .sf-hero {
            padding: 36px 0 44px;
          }
          .sf-trust-row {
            grid-template-columns: 1fr;
            gap: 12px;
          }
          .sf-showcase {
            grid-template-columns: 1fr;
          }
          .sf-showcase-main {
            min-height: 260px;
          }
          .sf-showcase-stack {
            grid-template-columns: 1fr 1fr;
            grid-template-rows: 1fr;
          }
          .sf-dept-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .sf-product-grid {
            grid-template-columns: 1fr 1fr;
            gap: 12px;
          }
          .sf-card-body {
            padding: 12px;
          }
          .sf-modal {
            grid-template-columns: 1fr;
            max-height: 90vh;
            overflow-y: auto;
          }
          .sf-modal-img {
            min-height: 220px;
            max-height: 240px;
          }
        }

        /* Top Scroll Progress Bar */
        .sf-scroll-progress-track {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: rgba(229, 231, 235, 0.4);
          z-index: 9999;
          pointer-events: none;
        }
        .sf-scroll-progress-bar {
          height: 100%;
          background: linear-gradient(90deg, #111827 0%, #059669 50%, #10B981 100%);
          box-shadow: 0 0 10px rgba(5, 150, 105, 0.55);
          transition: width 0.08s ease-out;
        }

        /* Floating Back to Top Button */
        .sf-back-to-top {
          position: fixed;
          bottom: 28px;
          right: 28px;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: #111827;
          color: #FFFFFF;
          border: 1px solid rgba(255, 255, 255, 0.15);
          box-shadow: 0 8px 24px rgba(17, 24, 39, 0.22);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 150;
          opacity: 0;
          transform: translateY(16px) scale(0.9);
          pointer-events: none;
          transition: opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1), transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.2s ease, box-shadow 0.2s ease;
        }
        .sf-back-to-top.visible {
          opacity: 1;
          transform: translateY(0) scale(1);
          pointer-events: auto;
        }
        .sf-back-to-top:hover {
          background: #059669;
          transform: translateY(-3px) scale(1.06);
          box-shadow: 0 12px 28px rgba(5, 150, 105, 0.38);
        }
        .sf-back-to-top:active {
          transform: translateY(0) scale(0.96);
        }

        /* Scroll Cue */
        .sf-scroll-cue {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-top: 24px;
          font-size: 13px;
          font-weight: 600;
          color: #6B7280;
          text-decoration: none;
          padding: 6px 14px;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.7);
          border: 1px solid #E5E7EB;
          transition: color 0.2s ease, border-color 0.2s ease, background 0.2s ease, transform 0.2s ease;
        }
        .sf-scroll-cue:hover {
          color: #111827;
          border-color: #9CA3AF;
          background: #FFFFFF;
          transform: translateY(1px);
        }
        .sf-scroll-cue-arrow {
          animation: sfBounce 2s infinite ease-in-out;
        }
        @keyframes sfBounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(4px);
          }
        }

        /* Hero Sequential Entrance */
        @keyframes sfHeroFadeUp {
          0% {
            opacity: 0;
            transform: translateY(20px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes sfHeroFadeInRight {
          0% {
            opacity: 0;
            transform: translateX(30px) scale(0.98);
          }
          100% {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }
        .sf-hero-anim-1 {
          animation: sfHeroFadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) backwards 0.05s;
        }
        .sf-hero-anim-2 {
          animation: sfHeroFadeUp 0.65s cubic-bezier(0.16, 1, 0.3, 1) backwards 0.15s;
        }
        .sf-hero-anim-3 {
          animation: sfHeroFadeUp 0.65s cubic-bezier(0.16, 1, 0.3, 1) backwards 0.25s;
        }
        .sf-hero-anim-4 {
          animation: sfHeroFadeUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) backwards 0.35s;
        }
        .sf-hero-anim-5 {
          animation: sfHeroFadeUp 0.75s cubic-bezier(0.16, 1, 0.3, 1) backwards 0.45s;
        }
        .sf-hero-anim-6 {
          animation: sfHeroFadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) backwards 0.55s;
        }
        .sf-hero-anim-mosaic {
          animation: sfHeroFadeInRight 0.85s cubic-bezier(0.16, 1, 0.3, 1) backwards 0.25s;
        }

        /* Organic Showcase Levitation */
        @keyframes sfFloatMain {
          0% {
            transform: translateY(0);
          }
          100% {
            transform: translateY(-8px);
          }
        }
        @keyframes sfFloatSub1 {
          0% {
            transform: translateY(0);
          }
          100% {
            transform: translateY(-6px);
          }
        }
        @keyframes sfFloatSub2 {
          0% {
            transform: translateY(0);
          }
          100% {
            transform: translateY(-7px);
          }
        }
        .sf-float-main {
          animation: sfFloatMain 6s ease-in-out infinite alternate;
          will-change: transform;
        }
        .sf-float-sub-1 {
          animation: sfFloatSub1 4.8s ease-in-out infinite alternate;
          will-change: transform;
        }
        .sf-float-sub-2 {
          animation: sfFloatSub2 5.4s ease-in-out infinite alternate;
          will-change: transform;
        }

        .sf-showcase-main,
        .sf-showcase-sub {
          transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.35s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.25s ease;
        }
        .sf-showcase-main:hover {
          animation-play-state: paused;
          transform: translateY(-8px) scale(1.015) !important;
          box-shadow: 0 20px 40px -10px rgba(17, 24, 39, 0.16);
          border-color: #9CA3AF;
        }
        .sf-showcase-sub:hover {
          animation-play-state: paused;
          transform: translateY(-6px) scale(1.02) !important;
          box-shadow: 0 16px 32px -8px rgba(17, 24, 39, 0.14);
          border-color: #9CA3AF;
        }

        /* General Scroll-Reveal Base Classes */
        .sf-scroll-reveal {
          opacity: 0;
          will-change: transform, opacity;
        }

        .sf-reveal-fade-up {
          transform: translateY(28px);
          transition: opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .sf-reveal-fade-up.sf-revealed {
          opacity: 1;
          transform: translateY(0);
        }

        .sf-reveal-card {
          transform: translateY(32px);
          transition: opacity 0.55s cubic-bezier(0.16, 1, 0.3, 1), transform 0.55s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s ease, border-color 0.25s ease;
          transition-delay: calc(var(--stagger, 0) * 65ms);
        }
        .sf-reveal-card.sf-revealed {
          opacity: 1;
          transform: translateY(0);
        }

        .sf-reveal-slide-left {
          transform: translateX(-40px);
          transition: opacity 0.65s cubic-bezier(0.16, 1, 0.3, 1), transform 0.65s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .sf-reveal-slide-left.sf-revealed {
          opacity: 1;
          transform: translateX(0);
        }

        .sf-reveal-slide-right {
          transform: translateX(40px);
          transition: opacity 0.65s cubic-bezier(0.16, 1, 0.3, 1) 0.1s, transform 0.65s cubic-bezier(0.16, 1, 0.3, 1) 0.1s;
        }
        .sf-reveal-slide-right.sf-revealed {
          opacity: 1;
          transform: translateX(0);
        }

        .sf-reveal-banner {
          transform: scale(0.96) translateY(24px);
          transition: opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1), transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .sf-reveal-banner.sf-revealed {
          opacity: 1;
          transform: scale(1) translateY(0);
        }

        /* Enhanced Department Card Interactions */
        .sf-dept-card {
          transition: border-color 0.25s ease, transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s ease, background-color 0.2s ease;
        }
        .sf-dept-card:hover {
          border-color: #111827;
          transform: translateY(-5px);
          box-shadow: 0 10px 24px rgba(17, 24, 39, 0.08);
        }
        .sf-dept-card:hover .sf-dept-icon {
          background: #111827;
          color: #FFFFFF;
          transform: scale(1.08) rotate(3deg);
        }
        .sf-dept-icon {
          transition: background-color 0.25s ease, color 0.25s ease, transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        /* Enhanced Product Card Hover */
        .sf-card {
          transition: border-color 0.25s ease, transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s ease;
        }
        .sf-card:hover {
          border-color: #9CA3AF;
          transform: translateY(-5px);
          box-shadow: 0 14px 28px rgba(17, 24, 39, 0.09);
        }
        .sf-card-media img {
          transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .sf-card:hover .sf-card-media img {
          transform: scale(1.06);
        }

        /* Step Number Micro-Interaction */
        .sf-step {
          transition: transform 0.2s ease;
        }
        .sf-step:hover {
          transform: translateX(4px);
        }
        .sf-step:hover .sf-step-num {
          background: #059669;
          transform: scale(1.1);
        }
        .sf-step-num {
          transition: background-color 0.2s ease, transform 0.2s ease;
        }

        /* CTA Banner Ambient Shimmer */
        .sf-cta-banner {
          position: relative;
          overflow: hidden;
        }
        .sf-cta-banner::before {
          content: "";
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle at center, rgba(16, 185, 129, 0.12) 0%, transparent 60%);
          pointer-events: none;
        }
        .sf-btn-white {
          transition: background-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
        }
        .sf-btn-white:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
        }
        .sf-btn-ghost-light {
          transition: background-color 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
        }
        .sf-btn-ghost-light:hover {
          transform: translateY(-2px);
        }

        /* Reduced Motion Fallback */
        @media (prefers-reduced-motion: reduce) {
          .sf-scroll-reveal,
          .sf-reveal-fade-up,
          .sf-reveal-slide-left,
          .sf-reveal-slide-right,
          .sf-reveal-card,
          .sf-reveal-banner,
          .sf-hero-anim-1,
          .sf-hero-anim-2,
          .sf-hero-anim-3,
          .sf-hero-anim-4,
          .sf-hero-anim-5,
          .sf-hero-anim-6,
          .sf-hero-anim-mosaic {
            opacity: 1 !important;
            transform: none !important;
            transition: none !important;
            animation: none !important;
          }
          .sf-float-main,
          .sf-float-sub-1,
          .sf-float-sub-2,
          .sf-scroll-cue-arrow {
            animation: none !important;
          }
        }

      `}</style>

      <PublicHeader onLoginClick={onLoginClick} activePath="/" />

      <main>
        {/* Hero Section */}
        <section className="sf-hero">
          <div className="sf-container">
            <div className="sf-hero-grid">
              <div>
                <div className="sf-eyebrow sf-hero-anim-1">
                  <span className="sf-eyebrow-dot" />
                  <span>Philippine Marketplace · Verified Local Stores</span>
                </div>
                <h1 className="sf-hero-title sf-hero-anim-2">
                  Everyday essentials from trusted sellers across the Philippines.
                </h1>
                <p className="sf-hero-sub sf-hero-anim-3">
                  Shop electronics, footwear, apparel, and home goods with transparent peso pricing, direct seller chat, and nationwide Cash on Delivery.
                </p>
                <div className="sf-hero-ctas sf-hero-anim-4">
                  {isLoggedIn ? (
                    <Link href="/shop" className="sf-btn-primary">
                      <span>Go to Marketplace</span>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    </Link>
                  ) : (
                    <Link href="/login" onClick={triggerLogin} className="sf-btn-primary">
                      <span>Sign in to start shopping</span>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    </Link>
                  )}
                  <Link href="/register" className="sf-btn-secondary">
                    Open a seller account
                  </Link>
                </div>

                <div className="sf-trust-row sf-hero-anim-5">
                  <div className="sf-trust-item">
                    <strong>Protected Checkout</strong>
                    <span>Order tracking &amp; receipt confirmation on every purchase</span>
                  </div>
                  <div className="sf-trust-item">
                    <strong>Direct Seller Chat</strong>
                    <span>Message store owners directly for sizing &amp; stock photos</span>
                  </div>
                  <div className="sf-trust-item">
                    <strong>Flexible Payment</strong>
                    <span>Cash on Delivery, GCash, Maya &amp; local bank transfer</span>
                  </div>
                </div>

                <div className="sf-hero-anim-6">
                  <a href="#departments" className="sf-scroll-cue" aria-label="Explore departments">
                    <span>Explore marketplace</span>
                    <svg className="sf-scroll-cue-arrow" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </a>
                </div>
              </div>

              {/* Editorial Product Mosaic */}
              <div className="sf-showcase sf-hero-anim-mosaic">
                <div
                  className="sf-showcase-main sf-float-main"
                  onClick={() => setPreviewItem(catalogItems[0] || CURATED_SHOWCASE_ITEMS[0])}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && setPreviewItem(catalogItems[0] || CURATED_SHOWCASE_ITEMS[0])}
                >
                  <img
                    className="sf-showcase-img"
                    src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=900&auto=format&fit=crop&q=85"
                    alt="Studio Pro Wireless ANC Headphones"
                  />
                  <div className="sf-showcase-caption">
                    <div>
                      <small>Featured Audio</small>
                      <strong>Studio Pro ANC Headphones</strong>
                    </div>
                    <span className="sf-showcase-price">₱2,490</span>
                  </div>
                </div>

                <div className="sf-showcase-stack">
                  <div
                    className="sf-showcase-sub sf-float-sub-1"
                    onClick={() => setPreviewItem(catalogItems[1] || CURATED_SHOWCASE_ITEMS[1])}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === "Enter" && setPreviewItem(catalogItems[1] || CURATED_SHOWCASE_ITEMS[1])}
                  >
                    <img
                      className="sf-showcase-img"
                      src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80"
                      alt="AeroSwift Road Running Shoes"
                    />
                    <div className="sf-showcase-caption">
                      <div>
                        <small>Footwear</small>
                        <strong>AeroSwift Runner</strong>
                      </div>
                      <span className="sf-showcase-price">₱1,850</span>
                    </div>
                  </div>

                  <div
                    className="sf-showcase-sub sf-float-sub-2"
                    onClick={() => setPreviewItem(catalogItems[2] || CURATED_SHOWCASE_ITEMS[2])}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === "Enter" && setPreviewItem(catalogItems[2] || CURATED_SHOWCASE_ITEMS[2])}
                  >
                    <img
                      className="sf-showcase-img"
                      src="https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80"
                      alt="Minimalist Everyday Watch"
                    />
                    <div className="sf-showcase-caption">
                      <div>
                        <small>Accessories</small>
                        <strong>Meridian Watch</strong>
                      </div>
                      <span className="sf-showcase-price">₱1,690</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Shop by Department */}
        <section className="sf-section" id="departments">
          <div className="sf-container">
            <div className="sf-section-head sf-scroll-reveal sf-reveal-fade-up">
              <div>
                <h2>Shop by department</h2>
                <p>Browse curated categories from independent stores and brand partners</p>
              </div>
              <Link href={isLoggedIn ? "/shop" : "/login"} onClick={isLoggedIn ? undefined : triggerLogin} className="sf-link-inline">
                <span>{isLoggedIn ? "Explore full marketplace" : "Sign in for full marketplace"}</span>
                <span aria-hidden="true">→</span>
              </Link>
            </div>

            <div className="sf-dept-grid">
              {DEPARTMENTS.map((dept, index) => (
                <button
                  key={dept.id}
                  type="button"
                  className="sf-dept-card sf-scroll-reveal sf-reveal-card"
                  style={{ "--stagger": index } as React.CSSProperties}
                  onClick={() => selectDepartment(dept.id)}
                >
                  <div className="sf-dept-icon">{dept.icon}</div>
                  <div>
                    <h3>{dept.title}</h3>
                    <p>{dept.subtitle}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Featured Marketplace Arrivals */}
        <section className="sf-section-alt" id="catalog">
          <div className="sf-container">
            <div className="sf-section-head sf-scroll-reveal sf-reveal-fade-up">
              <div>
                <h2>Featured marketplace arrivals</h2>
                <p>Real listings from verified sellers — sign in to add items to your cart or chat with sellers</p>
              </div>
            </div>

            <div className="sf-toolbar sf-scroll-reveal sf-reveal-fade-up">
              <div className="sf-tabs" role="tablist" aria-label="Filter products by category">
                {["All", "Electronics", "Footwear", "Fashion", "Home & Living", "Beauty", "Accessories"].map(
                  (tab) => (
                    <button
                      key={tab}
                      type="button"
                      role="tab"
                      aria-selected={selectedCategory === tab}
                      className={`sf-tab${selectedCategory === tab ? " active" : ""}`}
                      onClick={() => setSelectedCategory(tab)}
                    >
                      {tab}
                    </button>
                  )
                )}
              </div>

              <div className="sf-search-box">
                <svg
                  className="sf-search-icon"
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="search"
                  placeholder="Filter arrivals..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Filter featured products"
                />
              </div>
            </div>

            {filteredItems.length === 0 ? (
              <div
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #E5E7EB",
                  borderRadius: "12px",
                  padding: "48px 24px",
                  textAlign: "center",
                }}
              >
                <p style={{ fontSize: "15px", fontWeight: 600, color: "#111827", marginBottom: "6px" }}>
                  No matching items in this filter
                </p>
                <p style={{ fontSize: "13.5px", color: "#6B7280", marginBottom: "16px" }}>
                  Clear your filter or sign in to search the complete marketplace catalog.
                </p>
                <button
                  type="button"
                  className="sf-tab active"
                  onClick={() => {
                    setSelectedCategory("All");
                    setSearchQuery("");
                  }}
                >
                  Show all featured items
                </button>
              </div>
            ) : (
              <div className="sf-product-grid">
                {filteredItems.slice(0, 8).map((item, index) => {
                  const sellerCity = item.user?.location || item.location || "Metro Manila";
                  const sellerName = item.user?.name || "Verified Store";
                  const rating = Number(item.reviews_avg_rating || 4.8).toFixed(1);
                  const sold = Number(item.sold_count || 0);

                  return (
                    <article
                      key={String(item.id)}
                      className="sf-card sf-scroll-reveal sf-reveal-card"
                      style={{ "--stagger": index % 8 } as React.CSSProperties}
                      onClick={() => setPreviewItem(item)}
                    >
                      <div className="sf-card-media">
                        {item.image ? (
                          <img src={item.image} alt={item.name} loading="lazy" />
                        ) : (
                          <div
                            style={{
                              width: "100%",
                              height: "100%",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "#9CA3AF",
                              fontSize: "13px",
                            }}
                          >
                            Product Image
                          </div>
                        )}
                        <span className="sf-badge-cat">{normalizeCategory(item.category)}</span>
                        {item.discount_percent && item.discount_percent > 0 ? (
                          <span className="sf-badge-sale">-{item.discount_percent}%</span>
                        ) : null}
                      </div>

                      <div className="sf-card-body">
                        <div className="sf-card-seller">
                          {sellerName} · {sellerCity}
                        </div>
                        <h3 className="sf-card-title">{item.name}</h3>
                        <div className="sf-card-foot">
                          <div className="sf-price-group">
                            <span className="sf-price">{formatPeso(item.price)}</span>
                            {item.original_price && Number(item.original_price) > Number(item.price) ? (
                              <span className="sf-price-old">{formatPeso(item.original_price)}</span>
                            ) : null}
                          </div>
                          <div className="sf-rating">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="#D97706" stroke="#D97706" strokeWidth="1">
                              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                            </svg>
                            <span>{rating}</span>
                            {sold > 0 ? <span style={{ color: "#9CA3AF" }}>· {sold} sold</span> : null}
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* How Shopply Works */}
        <section className="sf-section" id="how-it-works">
          <div className="sf-container">
            <div className="sf-section-head sf-scroll-reveal sf-reveal-fade-up">
              <div>
                <h2>Straightforward buying and selling</h2>
                <p>One account gives you access to both the customer marketplace and seller tools</p>
              </div>
            </div>

            <div className="sf-how-grid">
              <div className="sf-how-panel sf-scroll-reveal sf-reveal-slide-left">
                <span className="sf-how-tag">For Shoppers</span>
                <h3>Shop confidently from local stores</h3>
                <div className="sf-step-list">
                  <div className="sf-step">
                    <span className="sf-step-num">1</span>
                    <div>
                      <strong>Real variant inventory</strong>
                      <span>Check exact stock counts per size and color before placing your order.</span>
                    </div>
                  </div>
                  <div className="sf-step">
                    <span className="sf-step-num">2</span>
                    <div>
                      <strong>Direct chat &amp; meetup options</strong>
                      <span>Message sellers in real time for sizing questions, actual item photos, or local meetup points.</span>
                    </div>
                  </div>
                  <div className="sf-step">
                    <span className="sf-step-num">3</span>
                    <div>
                      <strong>Tracked delivery &amp; receipt confirmation</strong>
                      <span>Pay via Cash on Delivery or e-wallet and confirm order receipt once your package arrives.</span>
                    </div>
                  </div>
                </div>
                <Link href={isLoggedIn ? "/shop" : "/login"} onClick={isLoggedIn ? undefined : triggerLogin} className="sf-btn-primary">
                  {isLoggedIn ? "Explore full marketplace" : "Sign in to browse all stores"}
                </Link>
              </div>

              <div className="sf-how-panel sf-scroll-reveal sf-reveal-slide-right">
                <span className="sf-how-tag">For Independent Sellers</span>
                <h3>Run your store without monthly fees</h3>
                <div className="sf-step-list">
                  <div className="sf-step">
                    <span className="sf-step-num">1</span>
                    <div>
                      <strong>Publish listings in minutes</strong>
                      <span>Upload photos, configure size and color matrices, and launch time-limited flash deals.</span>
                    </div>
                  </div>
                  <div className="sf-step">
                    <span className="sf-step-num">2</span>
                    <div>
                      <strong>Streamlined order fulfillment</strong>
                      <span>Accept incoming orders, coordinate courier pickup, and message buyers from a single workspace.</span>
                    </div>
                  </div>
                  <div className="sf-step">
                    <span className="sf-step-num">3</span>
                    <div>
                      <strong>Clear sales &amp; review tracking</strong>
                      <span>Monitor revenue, stock levels, and verified buyer ratings in real time.</span>
                    </div>
                  </div>
                </div>
                <Link href="/register" className="sf-btn-secondary">
                  Create your free seller account
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section style={{ paddingBottom: "72px" }}>
          <div className="sf-container">
            <div className="sf-cta-banner sf-scroll-reveal sf-reveal-banner">
              <div>
                <h2>Start shopping or selling on Shopply today</h2>
                <p>
                  Create a free account in under a minute to unlock full marketplace checkout, order tracking, and seller tools.
                </p>
              </div>
              <div className="sf-cta-actions">
                <Link href="/register" className="sf-btn-white">
                  Create free account
                </Link>
                <Link href="/login" onClick={triggerLogin} className="sf-btn-ghost-light">
                  Log in
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Product Preview Modal (prompts login to purchase) */}
      {previewItem && (
        <div
          className="sf-modal-backdrop"
          onClick={() => setPreviewItem(null)}
          role="dialog"
          aria-modal="true"
          aria-label={previewItem.name}
        >
          <div className="sf-modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="sf-modal-close"
              aria-label="Close preview"
              onClick={() => setPreviewItem(null)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <div className="sf-modal-img">
              {previewItem.image ? (
                <img src={previewItem.image} alt={previewItem.name} />
              ) : null}
            </div>
            <div className="sf-modal-content">
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#0D6847",
                  marginBottom: "6px",
                }}
              >
                {normalizeCategory(previewItem.category)} · {previewItem.user?.name || "Verified Seller"}
              </span>
              <h3
                style={{
                  fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
                  fontSize: "20px",
                  fontWeight: 700,
                  color: "#111827",
                  letterSpacing: "-0.02em",
                  marginBottom: "10px",
                }}
              >
                {previewItem.name}
              </h3>
              <div
                style={{
                  fontSize: "22px",
                  fontWeight: 700,
                  color: "#111827",
                  fontVariantNumeric: "tabular-nums",
                  marginBottom: "14px",
                }}
              >
                {formatPeso(previewItem.price)}
              </div>
              <p
                style={{
                  fontSize: "13.5px",
                  color: "#4B5563",
                  lineHeight: 1.6,
                  marginBottom: "18px",
                }}
              >
                {previewItem.description || "Verified listing available for nationwide shipping and Cash on Delivery."}
              </p>
              <div
                style={{
                  fontSize: "12.5px",
                  color: "#6B7280",
                  padding: "10px 12px",
                  background: "#F7F7F5",
                  borderRadius: "8px",
                  border: "1px solid #E5E7EB",
                  marginBottom: "20px",
                }}
              >
                Ships from <strong style={{ color: "#111827" }}>{previewItem.user?.location || previewItem.location || "Metro Manila"}</strong> · Sign in to select variants, add to cart, or chat with seller.
              </div>
              <div style={{ marginTop: "auto", display: "flex", gap: "10px" }}>
                <Link
                  href="/login"
                  onClick={triggerLogin}
                  className="sf-btn-primary"
                  style={{ flex: 1, height: "42px", fontSize: "13.5px" }}
                >
                  Sign in to buy
                </Link>
                <Link
                  href="/register"
                  className="sf-btn-secondary"
                  style={{ height: "42px", fontSize: "13.5px", padding: "0 16px" }}
                >
                  Register
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Back to Top */}
      <button
        type="button"
        className={`sf-back-to-top${showScrollTop ? " visible" : ""}`}
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label="Back to top"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="18 15 12 9 6 15" />
        </svg>
      </button>

      <PublicFooter onLoginClick={onLoginClick} />
      <CookieBanner />
    </div>
  );
}
