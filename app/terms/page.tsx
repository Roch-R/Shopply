"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function TermsOfServicePage() {
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
            <h1>Terms of Service</h1>
            <p>Last Updated: May 23, 2026</p>
          </div>
          <div className="content">
            <p>Welcome to Shopply. These comprehensive Terms of Service ("Terms") govern your access to and use of the Shopply website, platform, and related services (collectively, the "Services"). By registering for an account or using our Services, you agree to be bound by these Terms.</p>
            
            <h2>1. Acceptance of Terms</h2>
            <p>By accessing or using our Services, you confirm that you can form a binding contract with Shopply Inc., that you accept these Terms, and that you agree to comply with them. If you are using the Services on behalf of a business, you represent that you have the authority to bind that business to these Terms.</p>

            <h2>2. Account Registration and Responsibilities</h2>
            <p>To use certain features of the Services, you must register for an account. You agree to:</p>
            <ul>
              <li>Provide accurate, current, and complete information during the registration process.</li>
              <li>Maintain the security of your password and accept responsibility for all activities that occur under your account.</li>
              <li>Promptly notify us of any unauthorized use of your account or any other breach of security.</li>
            </ul>

            <h2>3. Acceptable Use and Restrictions</h2>
            <p>You agree to use the Services only for lawful purposes and in accordance with these Terms. You shall not:</p>
            <ul>
              <li>Use the Services to sell illegal, counterfeit, stolen, or otherwise prohibited goods and services.</li>
              <li>Engage in fraudulent, deceptive, or misleading activities.</li>
              <li>Transmit any viruses, malware, or other malicious code through the platform.</li>
              <li>Attempt to gain unauthorized access to our systems, interfere with the proper working of the Services, or bypass any security measures.</li>
              <li>Reproduce, duplicate, copy, sell, or resell any portion of the Services without our express written permission.</li>
            </ul>

            <h2>4. Intellectual Property Rights</h2>
            <p>The Services and their entire contents, features, and functionality (including but not limited to all information, software, text, displays, images, video, and audio) are owned by Shopply Inc., its licensors, or other providers of such material and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.</p>
            <p>You retain all rights to the content and products you upload to your storefront. By uploading content, you grant Shopply a non-exclusive, worldwide, royalty-free license to use, display, and distribute that content solely for the purpose of providing the Services.</p>

            <h2>5. Fees and Payment</h2>
            <p>Access to certain features of the Services may require payment of subscription fees or transaction fees. All fees are stated in US Dollars and are non-refundable unless otherwise specified. We reserve the right to change our fee structure with prior notice to you.</p>

            <h2>6. Termination and Suspension</h2>
            <p>We reserve the right to suspend or terminate your account and access to the Services at our sole discretion, without prior notice or liability, for any reason, including if you breach these Terms. Upon termination, your right to use the Services will immediately cease.</p>

            <h2>7. Limitation of Liability and Disclaimers</h2>
            <p>THE SERVICES ARE PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS. SHOPPLY DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED. IN NO EVENT SHALL SHOPPLY, ITS DIRECTORS, EMPLOYEES, OR AGENTS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING WITHOUT LIMITATION, LOSS OF PROFITS, DATA, OR USE, ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF THE SERVICES.</p>

            <h2>8. Governing Law</h2>
            <p>These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which Shopply Inc. is headquartered, without regard to its conflict of law provisions.</p>
          </div>
        </div>
      </div>
    </>
  );
}
