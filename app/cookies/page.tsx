"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function CookiePolicyPage() {
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
            <h1>Cookie Policy</h1>
            <p>Last Updated: May 23, 2026</p>
          </div>
          <div className="content">
            <p>Shopply Inc. ("we", "our", or "us") uses cookies, web beacons, tracking pixels, and other tracking technologies to provide, customize, evaluate, and improve our platform and services. This Cookie Policy explains what these technologies are, why we use them, and your rights to control their use.</p>
            
            <h2>1. What Are Cookies?</h2>
            <p>Cookies are small text files that are placed on your computer or mobile device when you visit a website or use an application. They are widely used by website owners to make their websites work, or to work more efficiently, as well as to provide reporting information.</p>
            <p>Cookies set by the website owner (in this case, Shopply) are called "first-party cookies". Cookies set by parties other than the website owner are called "third-party cookies". Third-party cookies enable third-party features or functionality to be provided on or through the website (e.g., advertising, interactive content, and analytics).</p>

            <h2>2. Types of Cookies We Use</h2>
            <p>We use both session cookies (which expire once you close your web browser) and persistent cookies (which stay on your device until you delete them) for the following purposes:</p>
            <ul>
              <li><strong>Strictly Necessary (Essential) Cookies:</strong> These cookies are essential to provide you with services available through our platform and to use some of its features, such as accessing secure areas (e.g., maintaining your login session). Without these cookies, the services cannot be provided.</li>
              <li><strong>Performance and Analytics Cookies:</strong> These cookies collect information that is used either in aggregate form to help us understand how our platform is being used or how effective our marketing campaigns are, or to help us customize our platform for you. This includes tools like Google Analytics.</li>
              <li><strong>Functionality Cookies:</strong> These cookies are used to recognize you when you return to our platform. This enables us to personalize our content for you, greet you by name, and remember your preferences (for example, your choice of language or region).</li>
              <li><strong>Targeting and Advertising Cookies:</strong> These cookies record your visit to our platform, the pages you have visited, and the links you have followed. We use this information to make our platform and the advertising displayed on it more relevant to your interests.</li>
            </ul>

            <h2>3. How to Manage and Control Cookies</h2>
            <p>You have the right to decide whether to accept or reject cookies. You can exercise your cookie rights by setting your preferences in your web browser. The means by which you can refuse cookies through your web browser controls vary from browser to browser, so you should visit your browser's help menu for more information.</p>
            <p>Please be aware that if you choose to reject or disable cookies, you may still use our website, but your access to some functionality and areas of our website may be restricted, and certain features may not function properly.</p>

            <h2>4. Similar Tracking Technologies</h2>
            <p>In addition to cookies, we may use other, similar technologies from time to time, like web beacons (sometimes called "tracking pixels" or "clear gifs"). These are tiny graphics files that contain a unique identifier that enable us to recognize when someone has visited our platform or opened an email that we have sent them. This allows us, for example, to monitor the traffic patterns of users from one page within our platform to another, to deliver or communicate with cookies, and to understand whether you have come to our platform from an online advertisement displayed on a third-party website.</p>

            <h2>5. Updates to This Cookie Policy</h2>
            <p>We may update this Cookie Policy from time to time in order to reflect changes to the cookies we use or for other operational, legal, or regulatory reasons. Please revisit this Cookie Policy regularly to stay informed about our use of cookies and related technologies.</p>

            <h2>6. Contact Us</h2>
            <p>If you have any questions about our use of cookies or other technologies, please email us at <strong>privacy@shopply.com</strong>.</p>
          </div>
        </div>
      </div>
    </>
  );
}
