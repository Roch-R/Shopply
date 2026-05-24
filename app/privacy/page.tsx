"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function PrivacyPolicyPage() {
  const router = useRouter();

  return (
    <>
      <style suppressHydrationWarning>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#f5f7ff;font-family:'Inter',sans-serif;}
        .page{min-height:100vh;background:linear-gradient(160deg,#f0f4ff 0%,#faf5ff 45%,#f0f9ff 100%);position:relative;overflow-x:hidden}
        .nav{position:sticky;top:0;z-index:100;padding:0 48px;height:68px;display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,.75);backdrop-filter:blur(20px);border-bottom:1px solid rgba(124,58,237,.08);box-shadow:0 1px 20px rgba(0,0,0,.04)}
        .nav-logo{display:flex;align-items:center;gap:10px;text-decoration:none}
        .nav-logo-text{font-size:17px;font-weight:700;color:#0f172a;letter-spacing:-.3px}
        .nav-right{display:flex;align-items:center;gap:24px}
        .nav-link{font-size:13px;font-weight:500;color:#64748b;text-decoration:none;padding:6px 12px;border-radius:8px;transition:all .2s}
        .nav-link:hover{color:#7c3aed;background:rgba(124,58,237,.06)}
        .container{max-width:860px;margin:80px auto;padding:0 48px;background:#fff;border-radius:24px;box-shadow:0 10px 40px rgba(0,0,0,.03);border:1px solid #f1f5f9;padding-bottom:80px;}
        .header-bg{background:linear-gradient(135deg,#7c3aed,#2563eb);border-radius:24px 24px 0 0;padding:64px 48px;color:#fff;}
        .header-bg h1{font-family:'Playfair Display',serif;font-size:42px;font-weight:800;letter-spacing:-1px;margin-bottom:16px;}
        .header-bg p{font-size:16px;opacity:0.9;}
        .content{padding:48px;color:#334155;line-height:1.8;font-size:15px;}
        .content h2{font-size:20px;font-weight:700;color:#0f172a;margin-top:40px;margin-bottom:16px;}
        .content p{margin-bottom:16px;}
        .content ul{margin-bottom:16px;padding-left:24px;}
        .content li{margin-bottom:8px;}
        @media(max-width:700px){
          .nav{padding:0 20px}
          .container{margin:40px 20px;padding:0;}
          .header-bg{padding:40px 24px;}
          .content{padding:32px 24px;}
        }
      `}</style>
      <div className="page">
        <nav className="nav">
          <Link href="/dashboard" className="nav-logo">
            <svg width="32" height="32" viewBox="0 0 200 260" xmlns="http://www.w3.org/2000/svg">
              <rect x="8" y="68" width="184" height="176" rx="24" fill="none" stroke="url(#ng)" strokeWidth="14" />
              <path d="M56 70 Q56 18 100 18 Q144 18 144 70" fill="none" stroke="url(#ng)" strokeWidth="14" strokeLinecap="round" />
              <circle cx="68" cy="70" r="7" fill="#7c3aed" />
              <circle cx="132" cy="70" r="7" fill="#7c3aed" />
              <path d="M24 192 Q36 150 70 145 Q104 140 110 170 Q116 198 150 192 Q170 187 176 162" fill="none" stroke="#FFD166" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M161 145 L176 162 L157 175" fill="none" stroke="#FFD166" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
              <defs><linearGradient id="ng" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#7c3aed" /><stop offset="100%" stopColor="#2563eb" />
              </linearGradient></defs>
            </svg>
            <span className="nav-logo-text">Shopply</span>
          </Link>
          <div className="nav-right">
            <Link href="/about" className="nav-link">About</Link>
            <Link href="/dashboard" className="nav-link">Dashboard</Link>
          </div>
        </nav>
        
        <div className="container">
          <div className="header-bg">
            <h1>Privacy Policy</h1>
            <p>Last Updated: May 23, 2026</p>
          </div>
          <div className="content">
            <p>At Shopply Inc., we are committed to protecting your privacy and ensuring you have a positive experience on our platform. This comprehensive Privacy Policy outlines our practices regarding the collection, use, disclosure, and protection of your personal and business information when you use our website, mobile applications, and commerce services.</p>
            
            <h2>1. Information We Collect</h2>
            <p>We collect various types of information to provide and improve our services to you:</p>
            <ul>
              <li><strong>Personal Identification Information:</strong> Your name, email address, phone number, and physical address when you register for an account.</li>
              <li><strong>Business Information:</strong> Details about your store, product listings, business metrics, and customer data that you upload to the platform.</li>
              <li><strong>Financial Information:</strong> Payment card details, billing address, and transaction history required to process your subscription and your customers' payments.</li>
              <li><strong>Technical Data:</strong> IP addresses, browser types, operating systems, and device identifiers collected automatically when you access our platform.</li>
              <li><strong>Usage Data:</strong> Information about how you interact with our services, including pages visited, features used, and time spent on the platform.</li>
            </ul>

            <h2>2. How We Use Your Information</h2>
            <p>We use the collected information for a variety of critical business purposes, including but not limited to:</p>
            <ul>
              <li><strong>Service Delivery:</strong> To provide, maintain, and improve the Shopply platform, ensuring it functions securely and efficiently.</li>
              <li><strong>Transaction Processing:</strong> To process payments, issue refunds, and send related information such as confirmations and receipts.</li>
              <li><strong>Communication:</strong> To send technical notices, updates, security alerts, and administrative messages. We may also send promotional communications (which you can opt out of).</li>
              <li><strong>Analytics & Improvement:</strong> To analyze usage trends and optimize the user experience, helping us build better tools for merchants.</li>
              <li><strong>Compliance & Protection:</strong> To enforce our terms of service, comply with legal obligations, and protect the rights and safety of Shopply, our users, and the public.</li>
            </ul>

            <h2>3. Information Sharing and Disclosure</h2>
            <p>We do not sell your personal information to third parties. We may share your information only in the following circumstances:</p>
            <ul>
              <li><strong>Service Providers:</strong> We may share data with trusted third-party vendors who perform services on our behalf, such as payment processing, data analysis, and email delivery.</li>
              <li><strong>Legal Requirements:</strong> We may disclose information if required to do so by law or in the good faith belief that such action is necessary to comply with legal processes.</li>
              <li><strong>Business Transfers:</strong> In the event of a merger, acquisition, or sale of assets, your information may be transferred as part of the transaction.</li>
            </ul>

            <h2>4. Data Security and Retention</h2>
            <p>We implement industry-standard technical and organizational security measures to protect your data against unauthorized access, alteration, disclosure, or destruction. This includes encryption, firewalls, and secure server hosting. However, no internet transmission is entirely secure, and we cannot guarantee absolute security.</p>
            <p>We retain your personal information only for as long as necessary to fulfill the purposes outlined in this policy, or as required by applicable laws and regulations.</p>

            <h2>5. Your Rights and Choices</h2>
            <p>Depending on your location, you may have specific rights regarding your personal data, including the right to access, correct, delete, or restrict the processing of your information. You can manage your account settings directly within the Shopply dashboard or contact us for assistance.</p>

            <h2>6. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time to reflect changes in our practices or for other operational, legal, or regulatory reasons. We will notify you of any material changes by posting the updated policy on this page and updating the "Last Updated" date.</p>

            <h2>7. Contact Us</h2>
            <p>If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact our Data Protection Officer at <strong>privacy@shopply.com</strong> or write to us at our corporate address.</p>
          </div>
        </div>
      </div>
    </>
  );
}
