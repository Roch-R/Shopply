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
      <p style="font-size:16px;color:#475569;line-height:1.7;margin-bottom:24px;">
        Welcome to Shopply! We are thrilled to have you here. Shopply is the world's most beautiful and easy-to-use e-commerce platform designed specifically for modern creators and independent businesses.
      </p>
      <h3 style="font-size:20px;font-weight:700;color:#0f172a;margin-bottom:16px;margin-top:32px;">Quick Start</h3>
      <p style="font-size:16px;color:#475569;line-height:1.7;margin-bottom:24px;">
        To get started, head over to your Dashboard. From there, you can configure your store profile, upload your very first product, and start accepting payments instantly.
      </p>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:24px;display:flex;align-items:center;justify-content:space-between;">
        <div>
          <h4 style="font-weight:600;color:#0f172a;margin-bottom:4px;">Ready to dive in?</h4>
          <p style="font-size:14px;color:#64748b;">Go to your dashboard and create your first product.</p>
        </div>
        <a href="/dashboard" style="padding:10px 20px;background:#7c3aed;color:#fff;border-radius:8px;font-weight:600;text-decoration:none;font-size:14px;">Open Dashboard</a>
      </div>
    `
  },
  'creating-an-account': {
    id: 'creating-an-account',
    title: 'Creating an Account',
    content: `
      <p style="font-size:16px;color:#475569;line-height:1.7;margin-bottom:24px;">
        Creating an account on Shopply takes less than two minutes. We only require the essential information to get your storefront live.
      </p>
      <h3 style="font-size:20px;font-weight:700;color:#0f172a;margin-bottom:16px;margin-top:32px;">Step-by-Step Guide</h3>
      <ul style="font-size:16px;color:#475569;line-height:1.7;margin-bottom:24px;padding-left:24px;">
        <li style="margin-bottom:12px;">Click the <strong>Sign Up</strong> button in the top right corner of the homepage.</li>
        <li style="margin-bottom:12px;">Enter your email address and choose a secure password.</li>
        <li style="margin-bottom:12px;">Verify your email address by clicking the link sent to your inbox.</li>
        <li style="margin-bottom:12px;">Complete your user profile.</li>
      </ul>
      <div style="padding:16px;background:#fffbe0;border-left:4px solid #f59e0b;color:#92400e;border-radius:0 8px 8px 0;">
        <strong>Note:</strong> Make sure to use an email address you check frequently, as all your order notifications will be sent there!
      </div>
    `
  },
  'setting-up-your-store': {
    id: 'setting-up-your-store',
    title: 'Setting up your Store',
    content: `
      <p style="font-size:16px;color:#475569;line-height:1.7;margin-bottom:24px;">
        Your store's identity is crucial for building trust with your customers. Follow these steps to customize your storefront.
      </p>
      <h3 style="font-size:20px;font-weight:700;color:#0f172a;margin-bottom:16px;margin-top:32px;">Store Profile Settings</h3>
      <p style="font-size:16px;color:#475569;line-height:1.7;margin-bottom:24px;">
        Navigate to <strong>Dashboard > Settings</strong>. Here you should configure:
      </p>
      <ul style="font-size:16px;color:#475569;line-height:1.7;margin-bottom:24px;padding-left:24px;">
        <li style="margin-bottom:12px;"><strong>Store Name:</strong> Keep it memorable and aligned with your brand.</li>
        <li style="margin-bottom:12px;"><strong>Store Logo:</strong> Upload a square image, preferably 512x512 PNG.</li>
        <li style="margin-bottom:12px;"><strong>Description:</strong> Write a 1-2 sentence pitch of what you sell.</li>
        <li style="margin-bottom:12px;"><strong>Social Links:</strong> Connect your Instagram or Twitter accounts.</li>
      </ul>
    `
  },
  'adding-products': {
    id: 'adding-products',
    title: 'Adding Products',
    content: `
      <p style="font-size:16px;color:#475569;line-height:1.7;margin-bottom:24px;">
        Now that your store is set up, it's time to list your items. A great product listing is the key to high conversion rates.
      </p>
      <h3 style="font-size:20px;font-weight:700;color:#0f172a;margin-bottom:16px;margin-top:32px;">Creating a Listing</h3>
      <p style="font-size:16px;color:#475569;line-height:1.7;margin-bottom:24px;">
        Go to <strong>Dashboard > Create Product</strong>.
      </p>
      <ul style="font-size:16px;color:#475569;line-height:1.7;margin-bottom:24px;padding-left:24px;">
        <li style="margin-bottom:12px;"><strong>Images:</strong> Upload high-quality, well-lit photos. We recommend at least 3 images per product.</li>
        <li style="margin-bottom:12px;"><strong>Pricing:</strong> Set a competitive price. You can also specify an "compare at" price to show discounts.</li>
        <li style="margin-bottom:12px;"><strong>Description:</strong> Be detailed! Highlight materials, dimensions, and use-cases.</li>
      </ul>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:24px;display:flex;align-items:center;justify-content:space-between;margin-top:32px;">
        <div>
          <h4 style="font-weight:600;color:#0f172a;margin-bottom:4px;">Ready to sell?</h4>
          <p style="font-size:14px;color:#64748b;">Create your first product listing now.</p>
        </div>
        <a href="/dashboard/create-product" style="padding:10px 20px;background:#7c3aed;color:#fff;border-radius:8px;font-weight:600;text-decoration:none;font-size:14px;">Create Product</a>
      </div>
    `
  },
  'managing-orders': {
    id: 'managing-orders',
    title: 'Managing Orders',
    content: `
      <p style="font-size:16px;color:#475569;line-height:1.7;margin-bottom:24px;">
        Congratulations on making a sale! Proper order management ensures your customers stay happy and come back.
      </p>
      <h3 style="font-size:20px;font-weight:700;color:#0f172a;margin-bottom:16px;margin-top:32px;">The Order Fulfillment Process</h3>
      <ol style="font-size:16px;color:#475569;line-height:1.7;margin-bottom:24px;padding-left:24px;">
        <li style="margin-bottom:12px;"><strong>Notification:</strong> You'll receive an email and dashboard alert when an order is placed.</li>
        <li style="margin-bottom:12px;"><strong>Preparation:</strong> Pack the item securely.</li>
        <li style="margin-bottom:12px;"><strong>Shipping:</strong> Ship the item and obtain a tracking number.</li>
        <li style="margin-bottom:12px;"><strong>Fulfillment:</strong> Go to the order details page in your dashboard, mark it as "Shipped", and input the tracking number. This automatically emails the customer.</li>
      </ol>
      <p style="font-size:16px;color:#475569;line-height:1.7;margin-bottom:24px;">
        Always aim to ship orders within 2 business days of receiving them.
      </p>
    `
  },
  'payments-and-payouts': {
    id: 'payments-and-payouts',
    title: 'Payments & Payouts',
    content: `
      <p style="font-size:16px;color:#475569;line-height:1.7;margin-bottom:24px;">
        Understanding how and when you get paid is crucial for your cash flow.
      </p>
      <h3 style="font-size:20px;font-weight:700;color:#0f172a;margin-bottom:16px;margin-top:32px;">How Payouts Work</h3>
      <p style="font-size:16px;color:#475569;line-height:1.7;margin-bottom:24px;">
        Shopply securely holds the funds when a customer makes a purchase. By default, funds are released to your connected bank account on a rolling <strong>2-day schedule</strong>.
      </p>
      <ul style="font-size:16px;color:#475569;line-height:1.7;margin-bottom:24px;padding-left:24px;">
        <li style="margin-bottom:12px;"><strong>Fees:</strong> Shopply takes a flat 5% transaction fee plus standard credit card processing fees (2.9% + 30¢).</li>
        <li style="margin-bottom:12px;"><strong>Minimum Payout:</strong> Payouts are triggered automatically once your balance exceeds $50.</li>
        <li style="margin-bottom:12px;"><strong>Instant Payouts:</strong> Verified merchants can request instant payouts for a small 1% premium.</li>
      </ul>
      <div style="padding:16px;background:#f0fdf4;border-left:4px solid #16a34a;color:#166534;border-radius:0 8px 8px 0;">
        <strong>Tip:</strong> Ensure your banking details in the dashboard are always up to date to prevent payout delays.
      </div>
    `
  }
};
