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
    title: '10 Tips to Increase Conversion Rates',
    cat: 'Growth',
    icon: (
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v18h18" />
        <path d="M18 9l-5 5-4-4-6 6" />
        <path d="M18 9h-5" />
        <path d="M18 9v5" />
      </svg>
    ),
    content: `
      <h2>The Secret to Higher Sales</h2>
      <p>Conversion rate optimization (CRO) is the process of increasing the percentage of visitors to your store who make a purchase. It's often cheaper to convert more of your existing traffic than it is to buy new traffic.</p>
      
      <h3>1. Simplify Checkout</h3>
      <p>Every extra field in your checkout form reduces your conversion rate. Shopply automatically strips away unnecessary fields, but you should ensure you aren't requiring accounts to purchase.</p>

      <h3>2. Use High-Quality Images</h3>
      <p>Your customers can't touch your product. Your photos are their only reference. Ensure they are well-lit and show the product from multiple angles.</p>

      <h3>3. Build Trust with Reviews</h3>
      <p>Displaying authentic customer reviews prominently on your product page can increase conversions by over 20%.</p>
    `
  },
  {
    slug: 'product-photos',
    title: 'How to Take Beautiful Product Photos',
    cat: 'Marketing',
    icon: (
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
        <circle cx="12" cy="13" r="4" />
      </svg>
    ),
    content: `
      <h2>Lighting is Everything</h2>
      <p>You don't need a $3,000 DSLR camera to take incredible product photos. In fact, modern smartphones combined with good lighting can produce professional results.</p>
      
      <h3>Natural Light is Your Friend</h3>
      <p>Set up a small table near a large window. Use a piece of white poster board to bounce the light back onto your product. This eliminates harsh shadows and gives an even, beautiful exposure.</p>

      <h3>Keep Backgrounds Simple</h3>
      <p>A cluttered background distracts from what you're trying to sell. Stick to pure white, subtle greys, or complementary solid colors.</p>
    `
  },
  {
    slug: 'writing-descriptions',
    title: 'Writing Descriptions That Actually Sell',
    cat: 'Sales',
    icon: (
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    ),
    content: `
      <h2>Focus on Benefits, Not Features</h2>
      <p>A feature is what your product is or has. A benefit is what your product does for the customer.</p>
      
      <p>Instead of writing "Contains 5000mAh battery" (feature), write "Enough battery to last you through a busy weekend" (benefit).</p>

      <h3>Know Your Audience</h3>
      <p>Are you selling to busy professionals, or teenagers? Your tone should match your audience perfectly. Use the words they use.</p>

      <h3>Format for Scannability</h3>
      <p>People don't read online; they scan. Use bullet points, bold text for key features, and short paragraphs.</p>
    `
  },
  {
    slug: 'managing-inventory',
    title: 'Managing Inventory Like a Pro',
    cat: 'Operations',
    icon: (
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
    content: `
      <h2>Avoid the Dreaded Stockout</h2>
      <p>Nothing kills momentum faster than running out of your best-selling item. Efficient inventory management is the backbone of a reliable store.</p>
      
      <h3>Set Minimum Viable Stock (MVS)</h3>
      <p>Determine the absolute minimum amount of a product you need on hand at all times. When you hit this number, reorder immediately. Shopply allows you to set automated alerts for your MVS.</p>

      <h3>The ABC Analysis</h3>
      <p>Not all inventory is created equal. Categorize items into:
      <strong>A:</strong> High value/high margin, tight control.
      <strong>B:</strong> Moderate value, standard control.
      <strong>C:</strong> Low value, relaxed control.</p>
    `
  },
  {
    slug: 'customer-loyalty',
    title: 'Building Customer Loyalty',
    cat: 'Retention',
    icon: (
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ec4899" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
    content: `
      <h2>Turn Buyers into Fans</h2>
      <p>Acquiring a new customer costs up to 5 times more than retaining an existing one. Loyalty is incredibly profitable.</p>
      
      <h3>The Unboxing Experience</h3>
      <p>The moment a customer opens your package is the only physical touchpoint you have. Make it count. Include a handwritten thank you note, high-quality packaging, or a small freebie.</p>

      <h3>Surprise and Delight</h3>
      <p>Don't just meet expectations; exceed them. Upgrade their shipping for free randomly, or send a discount code for their birthday.</p>
    `
  },
  {
    slug: 'analytics-dashboard',
    title: 'Understanding Your Analytics Dashboard',
    cat: 'Data',
    icon: (
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <line x1="3" y1="9" x2="21" y2="9" />
        <line x1="9" y1="21" x2="9" y2="9" />
      </svg>
    ),
    content: `
      <h2>Data-Driven Decisions</h2>
      <p>Your Shopply dashboard contains a wealth of information about how your business is performing. Learn how to read the signals.</p>
      
      <h3>Traffic vs. Conversion</h3>
      <p>If your traffic is high but sales are low, you have a conversion problem (improve product pages, lower prices). If traffic is low but conversion is high, you have a marketing problem (run more ads, post more content).</p>

      <h3>Average Order Value (AOV)</h3>
      <p>This is how much a customer spends on average per checkout. Increase this by bundling products together or offering free shipping over a certain threshold.</p>
    `
  }
];
