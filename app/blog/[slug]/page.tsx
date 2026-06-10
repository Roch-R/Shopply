"use client";
import Link from "next/link";
import { useParams, notFound } from "next/navigation";
import { getBlogPostBySlug } from "../../../lib/blogData";
import { useEffect, useState } from "react";

export default function BlogPostPage() {
  const params = useParams();
  const slug = typeof params?.slug === 'string' ? params.slug : (Array.isArray(params?.slug) ? params.slug[0] : '');
  
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const post = getBlogPostBySlug(slug);

  if (mounted && !post) {
    // Basic 404 state for blog post
    return (
      <div style={{minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', background:'#f5f7ff', fontFamily:'sans-serif'}}>
        <h1 style={{fontSize:'48px', color:'#0f172a', marginBottom:'16px'}}>404</h1>
        <p style={{color:'#64748b', marginBottom:'24px'}}>Article not found.</p>
        <Link href="/blog" style={{color:'#7c3aed', textDecoration:'none', fontWeight:600}}>← Back to Blog</Link>
      </div>
    );
  }

  if (!post) {
    return null; // prevent hydration mismatch before 404
  }

  return (
    <>
      <style suppressHydrationWarning>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#f8fafc;font-family:'Inter',sans-serif;}
        .nav{position:sticky;top:0;z-index:100;padding:0 48px;height:68px;display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,.75);backdrop-filter:blur(20px);border-bottom:1px solid rgba(124,58,237,.08);box-shadow:0 1px 20px rgba(0,0,0,.04)}
        .nav-logo{display:flex;align-items:center;gap:10px;text-decoration:none}
        .nav-logo-text{font-size:17px;font-weight:700;color:#0f172a;letter-spacing:-.3px}
        .nav-right{display:flex;align-items:center;gap:24px}
        .nav-link{font-size:13px;font-weight:500;color:#64748b;text-decoration:none;padding:6px 12px;border-radius:8px;transition:all .2s}
        .nav-link:hover{color:#7c3aed;background:rgba(124,58,237,.06)}
        
        .article-header{height:400px;display:flex;align-items:flex-end;padding-bottom:60px;position:relative;}
        .article-header-bg{position:absolute;top:0;left:0;right:0;bottom:0;z-index:-1;}
        .article-header-content{max-width:800px;margin:0 auto;width:100%;padding:0 32px;}
        .back-link{display:inline-flex;align-items:center;color:rgba(255,255,255,.8);text-decoration:none;font-weight:500;font-size:14px;margin-bottom:32px;transition:color .2s;}
        .back-link:hover{color:#fff;}
        .article-title{font-family:'Playfair Display',serif;font-size:48px;font-weight:800;color:#fff;line-height:1.2;margin-bottom:24px;letter-spacing:-1px}
        .article-meta{display:flex;align-items:center;gap:16px;color:rgba(255,255,255,.9);font-size:14px;}
        .author-avatar{width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-weight:700;color:#fff;}
        
        .article-body{max-width:800px;margin:0 auto;padding:60px 32px 100px;background:#fff;border-radius:24px;position:relative;top:-40px;box-shadow:0 20px 40px rgba(0,0,0,.03);}
        .article-content{font-size:18px;line-height:1.8;color:#334155;}
        .article-content h2{font-family:'Playfair Display',serif;font-size:32px;color:#0f172a;margin:48px 0 24px;letter-spacing:-0.5px;}
        .article-content h3{font-size:24px;color:#0f172a;margin:32px 0 16px;font-weight:700;}
        .article-content p{margin-bottom:24px;}
        .article-content ul{margin-bottom:24px;padding-left:24px;}
        .article-content li{margin-bottom:12px;}
        .article-content strong{color:#0f172a;font-weight:700;}
        .article-content em{color:#7c3aed;font-style:normal;font-weight:600;}
        @media(max-width:768px){
          .nav{padding:0 12px; gap:8px}
          .nav-logo-text{display:none}
          .nav-right{gap:8px}
          .nav-link{padding:6px 8px; font-size:12px}
          .article-title{font-size:28px; margin-bottom:16px}
          .article-body{padding:32px 16px 60px; border-radius:16px; top:-20px}
          .article-content{font-size:16px}
          .article-content h2{font-size:24px}
          .article-header{height:320px; padding-bottom:40px}
        }
      `}</style>

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
          <Link href="/shop" className="nav-link">Marketplace</Link>
          <Link href="/dashboard" className="nav-link">Dashboard</Link>
        </div>
      </nav>

      <div className="article-header">
        <div className="article-header-bg" style={{background: post.img}}></div>
        <div className="article-header-content">
          <Link href="/blog" className="back-link">← Back to Blog</Link>
          <h1 className="article-title">{post.title}</h1>
          <div className="article-meta">
            <div className="author-avatar">{post.author.charAt(0)}</div>
            <div>
              <div style={{fontWeight:600}}>{post.author}</div>
              <div style={{opacity:0.8}}>{post.date} &middot; {post.readTime}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="article-body">
        <div className="article-content" dangerouslySetInnerHTML={{ __html: post.content }} />
      </div>
    </>
  );
}
