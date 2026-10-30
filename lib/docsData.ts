export interface DocSection {
  id: string;
  title: string;
  content: string;
}

export const docsData: Record<string, DocSection> = {
  'introduction': {
    id: 'introduction',
    title: 'Introduction to Shopply',
    content: `
      <p style="font-size:16px;color:#4B5563;line-height:1.75;margin-bottom:24px;">
        Welcome to Shopply. Shopply is a straightforward commerce marketplace designed for independent merchants and everyday buyers across the Philippines.
      </p>
      <h3 style="font-size:20px;font-weight:700;color:#111827;margin-bottom:14px;margin-top:32px;">Quick Start</h3>
      <p style="font-size:16px;color:#4B5563;line-height:1.75;margin-bottom:24px;">
        Sign in to your Seller Center to configure your store profile, publish your first product with clear photos and pricing, and manage incoming orders.
      </p>
      <div style="background:#F7F7F5;border:1px solid #E5E7EB;border-radius:12px;padding:24px;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;">
        <div>
          <h4 style="font-weight:700;color:#111827;margin:0 0 4px;">Ready to get started?</h4>
          <p style="font-size:14px;color:#6B7280;margin:0;">Sign in to your account to set up your storefront and list items.</p>
        </div>
        <a href="/login" style="padding:10px 18px;background:#111827;color:#ffffff;border-radius:8px;font-weight:600;text-decoration:none;font-size:14px;white-space:nowrap;">Sign in to Seller Center</a>
      </div>
    `
  },
  'creating-an-account': {
    id: 'creating-an-account',
    title: 'Creating an Account',
    content: `
      <p style="font-size:16px;color:#4B5563;line-height:1.75;margin-bottom:24px;">
        Creating an account on Shopply takes less than two minutes. Every account supports both buying on the marketplace and managing your own store listings.
      </p>
      <h3 style="font-size:20px;font-weight:700;color:#111827;margin-bottom:14px;margin-top:32px;">Step-by-Step Guide</h3>
      <ul style="font-size:16px;color:#4B5563;line-height:1.75;margin-bottom:24px;padding-left:24px;">
        <li style="margin-bottom:10px;">Select <strong>Create Account</strong> in the top navigation bar.</li>
        <li style="margin-bottom:10px;">Enter your full name, email address, and password, or continue with Google.</li>
        <li style="margin-bottom:10px;">Enter the 6-digit verification code sent to your inbox.</li>
        <li style="margin-bottom:10px;">Add your delivery address or store details from your account profile.</li>
      </ul>
      <div style="padding:16px;background:#FEF3C7;border-left:3px solid #D97706;color:#92400E;border-radius:0 8px 8px 0;font-size:14px;">
        <strong>Note:</strong> Use an active email address so order confirmations, invoices, and verification codes arrive reliably.
      </div>
    `
  },
  'setting-up-your-store': {
    id: 'setting-up-your-store',
    title: 'Setting up your Store',
    content: `
      <p style="font-size:16px;color:#4B5563;line-height:1.75;margin-bottom:24px;">
        Clear store details build buyer confidence before checkout. Keep your profile accurate and up to date.
      </p>
      <h3 style="font-size:20px;font-weight:700;color:#111827;margin-bottom:14px;margin-top:32px;">Store Profile Checklist</h3>
      <ul style="font-size:16px;color:#4B5563;line-height:1.75;margin-bottom:24px;padding-left:24px;">
        <li style="margin-bottom:10px;"><strong>Display Name:</strong> Use your real shop or brand name so repeat buyers recognize your listings.</li>
        <li style="margin-bottom:10px;"><strong>Dispatch Location:</strong> Add your city or municipality for accurate shipping estimates and local meetups.</li>
        <li style="margin-bottom:10px;"><strong>Contact Details:</strong> Keep your phone number current for courier coordination.</li>
      </ul>
    `
  },
  'adding-products': {
    id: 'adding-products',
    title: 'Adding Products',
    content: `
      <p style="font-size:16px;color:#4B5563;line-height:1.75;margin-bottom:24px;">
        Accurate photos, transparent PHP pricing, and complete size or color variants help buyers purchase without guesswork.
      </p>
      <h3 style="font-size:20px;font-weight:700;color:#111827;margin-bottom:14px;margin-top:32px;">Creating a Listing</h3>
      <ul style="font-size:16px;color:#4B5563;line-height:1.75;margin-bottom:24px;padding-left:24px;">
        <li style="margin-bottom:10px;"><strong>Photos & Video:</strong> Upload clear, well-lit product photos and optional short video clips.</li>
        <li style="margin-bottom:10px;"><strong>Variants & Stock:</strong> Define color variants, sizes, per-variant prices, and exact stock quantities.</li>
        <li style="margin-bottom:10px;"><strong>Specifications:</strong> List materials, dimensions, warranty coverage, and package contents clearly.</li>
      </ul>
      <div style="background:#F7F7F5;border:1px solid #E5E7EB;border-radius:12px;padding:24px;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-top:32px;">
        <div>
          <h4 style="font-weight:700;color:#111827;margin:0 0 4px;">Ready to list your catalog?</h4>
          <p style="font-size:14px;color:#6B7280;margin:0;">Sign in to create and publish product listings.</p>
        </div>
        <a href="/register" style="padding:10px 18px;background:#111827;color:#ffffff;border-radius:8px;font-weight:600;text-decoration:none;font-size:14px;white-space:nowrap;">Create Seller Account</a>
      </div>
    `
  },
  'managing-orders': {
    id: 'managing-orders',
    title: 'Managing Orders',
    content: `
      <p style="font-size:16px;color:#4B5563;line-height:1.75;margin-bottom:24px;">
        Consistent fulfillment keeps your seller rating strong and reduces return requests.
      </p>
      <h3 style="font-size:20px;font-weight:700;color:#111827;margin-bottom:14px;margin-top:32px;">Order Fulfillment Workflow</h3>
      <ol style="font-size:16px;color:#4B5563;line-height:1.75;margin-bottom:24px;padding-left:24px;">
        <li style="margin-bottom:10px;"><strong>Order Alert:</strong> Review new orders under <em>Store Orders</em> as soon as they arrive.</li>
        <li style="margin-bottom:10px;"><strong>Inspection & Packing:</strong> Verify variant/size accuracy and pack items securely.</li>
        <li style="margin-bottom:10px;"><strong>Dispatch:</strong> Approve and mark orders shipped once handed over to the courier.</li>
        <li style="margin-bottom:10px;"><strong>Completion:</strong> Track delivery milestones and printable receipts from your order log.</li>
      </ol>
    `
  },
  'payments-and-payouts': {
    id: 'payments-and-payouts',
    title: 'Payments & Payouts',
    content: `
      <p style="font-size:16px;color:#4B5563;line-height:1.75;margin-bottom:24px;">
        Shopply supports Cash on Delivery (COD), digital wallets, and bank transfers with clear order reconciliation.
      </p>
      <h3 style="font-size:20px;font-weight:700;color:#111827;margin-bottom:14px;margin-top:32px;">How Settlement Works</h3>
      <p style="font-size:16px;color:#4B5563;line-height:1.75;margin-bottom:24px;">
        Order funds are protected during transit and settled once delivery is confirmed, protecting both buyers and merchants.
      </p>
      <ul style="font-size:16px;color:#4B5563;line-height:1.75;margin-bottom:24px;padding-left:24px;">
        <li style="margin-bottom:10px;"><strong>Electronic Invoices:</strong> Every order generates a clean, printable receipt with itemized totals.</li>
        <li style="margin-bottom:10px;"><strong>Voucher Support:</strong> Storefront promo codes are calculated automatically at checkout.</li>
        <li style="margin-bottom:10px;"><strong>7-Day Protection:</strong> Verified return claims are resolved before final payout release.</li>
      </ul>
      <div style="padding:16px;background:#ECFDF5;border-left:3px solid #0D6847;color:#065F46;border-radius:0 8px 8px 0;font-size:14px;">
        <strong>Tip:</strong> Keep your payout and contact information updated so settlements process without delay.
      </div>
    `
  }
};
