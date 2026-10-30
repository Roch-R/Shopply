import React from 'react';

export interface Guide {
  slug: string;
  title: string;
  cat: string;
  icon: React.ReactNode;
  content: string;
}

export const guidesData: Guide[] = [
  {
    slug: 'conversion-rates',
    title: '10 Practical Ways to Improve Storefront Conversion',
    cat: 'Growth',
    icon: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v18h18" />
        <path d="M18 9l-5 5-4-4-6 6" />
        <path d="M18 9h-5" />
        <path d="M18 9v5" />
      </svg>
    ),
    content: `
      <h2>Clear Information Drives Sales</h2>
      <p>Shoppers complete purchases when product details, sizing, shipping timelines, and total costs are transparent upfront.</p>
      
      <h3>1. Keep Variant Pricing Exact</h3>
      <p>List accurate stock counts and per-size or per-color pricing so buyers never encounter surprises in their cart.</p>

      <h3>2. Show Real Angles in Daylight</h3>
      <p>Customers rely on your photos to judge material quality and fit. Upload sharp front, side, and close-up texture shots.</p>

      <h3>3. Build Trust Through Verified Reviews</h3>
      <p>Prompt fulfillment and accurate descriptions earn verified buyer ratings that lift conversion across your whole catalog.</p>
    `
  },
  {
    slug: 'product-photos',
    title: 'Shooting Clean Product Photography at Home',
    cat: 'Merchandising',
    icon: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
        <circle cx="12" cy="13" r="4" />
      </svg>
    ),
    content: `
      <h2>Natural Lighting Over Heavy Editing</h2>
      <p>You do not need studio strobes to shoot trustworthy product photos. A modern phone camera next to indirect window light produces crisp, true-to-color results.</p>
      
      <h3>Use Indirect Daylight</h3>
      <p>Place your item on a clean table near a bright window and use a white board opposite the window to soften shadows without distorting fabric or hardware colors.</p>

      <h3>Choose Neutral Surfaces</h3>
      <p>Warm stone, matte white, or light wood surfaces keep focus on the product itself and look cohesive in marketplace grids.</p>
    `
  },
  {
    slug: 'writing-descriptions',
    title: 'Writing Honest Product Descriptions That Reduce Returns',
    cat: 'Catalog',
    icon: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    ),
    content: `
      <h2>Lead With Concrete Specifications</h2>
      <p>Skip exaggerated buzzwords and tell buyers exactly what the item is made of, how it fits, and what comes in the box.</p>
      
      <p>Include exact measurements in centimeters or millimeters, fabric weight or battery capacity, and realistic care instructions.</p>

      <h3>Format for Quick Scanning</h3>
      <p>Use short paragraphs and structured specification rows so mobile shoppers can verify compatibility in seconds.</p>
    `
  },
  {
    slug: 'managing-inventory',
    title: 'Keeping Multi-Variant Inventory Accurate',
    cat: 'Operations',
    icon: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#0D6847" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
    content: `
      <h2>Prevent Overselling Before Peak Campaigns</h2>
      <p>Reliable stock counts protect your fulfillment rate and keep buyers from experiencing cancelled orders.</p>
      
      <h3>Set Safety Reorder Thresholds</h3>
      <p>Calculate your 7-day sell-through velocity on core SKUs and restock before popular sizes run dry.</p>

      <h3>Audit Variant Counts Weekly</h3>
      <p>Reconcile physical shelf counts against your Seller Center variant matrix every week so color and size stock stays exact.</p>
    `
  },
  {
    slug: 'customer-loyalty',
    title: 'Earning Repeat Buyers Through Packaging & Care',
    cat: 'Retention',
    icon: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#0D6847" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
    content: `
      <h2>Fulfillment Quality Drives Second Orders</h2>
      <p>Repeat customers cost nothing to acquire and convert at higher average order values than first-time visitors.</p>
      
      <h3>Pack for Transit Durability</h3>
      <p>Use protective inner wrapping and snug outer mailers so corners, boxes, and garments arrive crisp after nationwide courier sorting.</p>

      <h3>Respond Quickly in Buyer Chat</h3>
      <p>Answering sizing or dispatch questions promptly builds long-term trust and encourages buyers to follow your shop.</p>
    `
  },
  {
    slug: 'analytics-dashboard',
    title: 'Reading Your Store Orders & Activity Metrics',
    cat: 'Analytics',
    icon: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <line x1="3" y1="9" x2="21" y2="9" />
        <line x1="9" y1="21" x2="9" y2="9" />
      </svg>
    ),
    content: `
      <h2>Practical Storefront Signals</h2>
      <p>Track order velocity, pending approvals, and completed deliveries directly from your Seller Center.</p>
      
      <h3>Monitor Pending Turnaround</h3>
      <p>Approving and packing pending orders within 24 hours keeps transit times short and reduces buyer inquiries.</p>

      <h3>Grow Average Order Value</h3>
      <p>Pair complementary everyday items and offer store vouchers above a sensible minimum spend threshold.</p>
    `
  }
];
