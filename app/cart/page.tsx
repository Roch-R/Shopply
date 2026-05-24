"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getApiCache } from "@/lib/apiCache";
import { SkeletonCartItem } from "@/components/Skeleton";

interface CartItem {
  id: number;
  user_id: number;
  item_id: number;
  quantity: number;
  price?: string;
  variation?: string;
  item: {
    id: number;
    name: string;
    description: string | null;
    price: string;
    stock: number;
    image: string | null;
    attributes?: any;
    user: {
      id: number;
      name: string;
    };
  };
}

export default function CartPage() {
  const router = useRouter();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [checkingOut, setCheckingOut] = useState(false);
  const [toast, setToast] = useState<{message: string, type: 'success'|'error'} | null>(null);

  const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";
  const STORAGE_URL = "http://127.0.0.1:8000/storage";

  const fetchCart = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    try {
      const cache = getApiCache();
      const data: any = await cache.fetch(`${API}/cart`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }
      });
      if (data.cart_items) setCartItems(data.cart_items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCart();
  }, []);

  const showToast = (message: string, type: 'success'|'error' = 'success') => {
    setToast({message, type});
    setTimeout(() => setToast(null), 3000);
  };

  const updateQuantity = async (id: number, newQty: number, maxStock: number) => {
    if (newQty < 1 || newQty > maxStock) return;
    
    // Optimistic update
    setCartItems(items => items.map(i => i.id === id ? { ...i, quantity: newQty } : i));
    
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API}/cart/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          Accept: "application/json"
        },
        body: JSON.stringify({ quantity: newQty })
      });
      if (!res.ok) {
        // Revert on failure
        fetchCart();
        showToast("Failed to update quantity", "error");
      }
    } catch (err) {
      fetchCart();
    }
  };

  const removeCartItem = async (id: number) => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API}/cart/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }
      });
      if (res.ok) {
        setCartItems(items => items.filter(i => i.id !== id));
        setSelectedItems(selected => selected.filter(selId => selId !== id));
        showToast("Item removed");
      }
    } catch (err) {
      showToast("Failed to remove item", "error");
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedItems(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedItems.length === cartItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(cartItems.map(i => i.id));
    }
  };

  const handleCheckout = async () => {
    if (selectedItems.length === 0) return;
    setCheckingOut(true);
    const token = localStorage.getItem("token");

    try {
      const res = await fetch(`${API}/cart/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          Accept: "application/json"
        },
        body: JSON.stringify({ cart_item_ids: selectedItems })
      });
      const data = await res.json();
      if (res.ok) {
        setCartItems(items => items.filter(i => !selectedItems.includes(i.id)));
        setSelectedItems([]);
        localStorage.setItem('last_order_time', Date.now().toString());
        window.dispatchEvent(new Event('order_placed'));
        getApiCache().invalidate('/cart');
        getApiCache().invalidate('/orders');
        getApiCache().invalidate('/shop/items');
        showToast("Checkout successful! View orders in dashboard.");
      } else {
        showToast(data.message || "Checkout failed", "error");
      }
    } catch (err) {
      showToast("An error occurred", "error");
    } finally {
      setCheckingOut(false);
    }
  };

  const totalPrice = cartItems
    .filter(i => selectedItems.includes(i.id))
    .reduce((sum, item) => sum + (parseFloat(item.price || item.item.price) * item.quantity), 0);

  const totalItemsCount = cartItems.reduce((acc, item) => acc + (selectedItems.includes(item.id) ? item.quantity : 0), 0);

  return (
    <>
      <style suppressHydrationWarning>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#f5f7ff;font-family:'Inter',sans-serif}
        
        /* Navigation (Reused) */
        .nav{background:rgba(255,255,255,.75);backdrop-filter:blur(20px);border-bottom:1px solid rgba(124,58,237,.08);padding:0 32px;height:68px;
          display:flex;align-items:center;justify-content:space-between;
          box-shadow:0 1px 20px rgba(0,0,0,.04);position:sticky;top:0;z-index:50}
        .nav-logo{display:flex;align-items:center;gap:10px;text-decoration:none}
        .logo-text{font-size:17px;font-weight:700;color:#0f172a;letter-spacing:-.3px}
        .nav-right{display:flex;align-items:center;gap:16px}
        .nav-link{font-size:13px;font-weight:500;color:#64748b;text-decoration:none;
          padding:6px 12px;border-radius:8px;transition:all .2s}
        .nav-link:hover{color:#7c3aed;background:rgba(124,58,237,.06)}
        
        /* Layout */
        .container{max-width:1200px;margin:24px auto;padding:0 24px}
        
        /* Cart Grid System */
        .cart-grid{display:grid;grid-template-columns:40px 4fr 1fr 1.5fr 1fr 80px;gap:16px;align-items:center}
        
        /* Cart Header Row */
        .cart-header{background:#fff;padding:16px 20px;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.05);
          margin-bottom:16px;color:#64748b;font-size:14px;font-weight:500;border:1px solid #f1f5f9}
        
        /* Cart Items */
        .cart-card{background:#fff;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.05);
          margin-bottom:16px;display:flex;flex-direction:column;border:1px solid #f1f5f9}
        .seller-header{padding:14px 20px;border-bottom:1px solid #f1f5f9;font-size:14px;
          font-weight:600;color:#0f172a;display:flex;align-items:center;gap:8px}
        .item-row{padding:20px}
        
        /* Item Details */
        .product-col{display:flex;gap:12px}
        .product-img{width:80px;height:80px;object-fit:cover;border:1px solid #f1f5f9;border-radius:8px}
        .product-placeholder{width:80px;height:80px;background:#f8fafc;display:flex;align-items:center;justify-content:center;color:#cbd5e1;border:1px solid #f1f5f9;border-radius:8px}
        .product-info{display:flex;flex-direction:column;justify-content:center;gap:6px}
        .product-name{font-size:14px;color:#0f172a;font-weight:500;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
        .product-stock{font-size:12px;color:#64748b}
        
        /* Price */
        .price-col{color:#7c3aed;font-size:14px;font-weight:600}
        
        /* Quantity Controls */
        .qty-controls{display:flex;align-items:center;border:1px solid #e2e8f0;border-radius:8px;width:fit-content;overflow:hidden}
        .qty-btn{width:32px;height:32px;background:#fff;border:none;color:#64748b;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .2s}
        .qty-btn:hover:not(:disabled){background:#f8fafc}
        .qty-btn:disabled{color:#cbd5e1;cursor:not-allowed;background:#f8fafc}
        .qty-input{width:40px;height:32px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;
          border-top:none;border-bottom:none;text-align:center;font-size:14px;color:#0f172a;font-weight:500;background:#fff}
        
        /* Actions */
        .action-btn{background:none;border:none;color:#ef4444;cursor:pointer;font-size:14px;font-weight:500;padding:6px 12px;border-radius:6px;transition:all .2s}
        .action-btn:hover{background:#fee2e2}
        
        /* Bottom Bar */
        .bottom-bar{position:sticky;bottom:24px;background:#fff;padding:20px 24px;
          display:flex;align-items:center;justify-content:space-between;
          box-shadow:0 10px 30px rgba(0,0,0,.08);margin-top:24px;border-radius:16px;border:1px solid #f1f5f9;z-index:40}
        .bottom-left{display:flex;align-items:center;gap:24px}
        .bottom-right{display:flex;align-items:center;gap:24px}
        
        .checkout-btn{padding:14px 36px;background:linear-gradient(135deg,#7c3aed,#2563eb);border:none;border-radius:12px;
          color:#fff;font-size:15px;font-weight:600;cursor:pointer;transition:all .25s;box-shadow:0 4px 16px rgba(124,58,237,.3)}
        .checkout-btn:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(124,58,237,.4)}
        .checkout-btn:disabled{background:#e2e8f0;box-shadow:none;cursor:not-allowed;transform:none;color:#94a3b8}
        
        /* Custom Checkbox */
        .checkbox{width:20px;height:20px;border:2px solid #cbd5e1;border-radius:6px;cursor:pointer;
          display:flex;align-items:center;justify-content:center;transition:all .2s}
        .checkbox.checked{background:#7c3aed;border-color:#7c3aed}

        .toast{position:fixed;top:80px;left:50%;transform:translateX(-50%);padding:14px 24px;
          border-radius:12px;font-size:14px;font-weight:600;z-index:300;color:#fff;
          box-shadow:0 10px 30px rgba(0,0,0,.15);animation:slideDown .3s ease}
        .toast-success{background:#10b981}
        .toast-error{background:#ef4444}
        @keyframes slideDown{from{opacity:0;transform:translate(-50%,-20px)}to{opacity:1;transform:translate(-50%,0)}}
        
        /* Empty */
        .empty-cart{background:#fff;padding:100px 0;text-align:center;border-radius:16px;border:1px solid #f1f5f9;box-shadow:0 4px 20px rgba(0,0,0,.03)}
      `}</style>

      {/* Navigation */}
      <nav className="nav">
        <Link href="/dashboard" className="nav-logo">
          <svg width="24" height="24" viewBox="0 0 200 260" xmlns="http://www.w3.org/2000/svg">
            <rect x="8" y="68" width="184" height="176" rx="24" fill="none" stroke="url(#ng)" strokeWidth="14" />
            <path d="M56 70 Q56 18 100 18 Q144 18 144 70" fill="none" stroke="url(#ng)" strokeWidth="14" strokeLinecap="round" />
            <circle cx="68" cy="70" r="7" fill="#7c3aed" />
            <circle cx="132" cy="70" r="7" fill="#7c3aed" />
            <path d="M24 192 Q36 150 70 145 Q104 140 110 170 Q116 198 150 192 Q170 187 176 162"
              fill="none" stroke="#FFD166" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M161 145 L176 162 L157 175" fill="none" stroke="#FFD166" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
            <defs><linearGradient id="ng" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7c3aed" /><stop offset="100%" stopColor="#2563eb" />
            </linearGradient></defs>
          </svg>
          <span className="logo-text">Shopply</span>
          <span style={{color: '#64748b', fontSize: '15px', marginLeft: 12, borderLeft: '1px solid #e2e8f0', paddingLeft: 16, fontWeight: 500}}>Shopping Cart</span>
        </Link>
        <div className="nav-right">
          <Link href="/shop" className="nav-link">Continue Shopping</Link>
          <Link href="/dashboard" className="nav-link" style={{background:'linear-gradient(135deg,#7c3aed,#2563eb)', color:'#fff', padding:'8px 16px', fontWeight:600}}>Dashboard</Link>
        </div>
      </nav>

      {toast && (
        <div className={`toast toast-${toast.type}`}>{toast.message}</div>
      )}

      <main className="container">
        {loading ? (
          <div style={{ padding: '24px 0' }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonCartItem key={i} />
            ))}
          </div>
        ) : cartItems.length === 0 ? (
          <div className="empty-cart">
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#e2e8f0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{margin: '0 auto 24px'}}><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
            <h2 style={{fontSize: 20, color: '#0f172a', marginBottom: 24, fontWeight: 700, letterSpacing: '-0.5px'}}>Your shopping cart is empty</h2>
            <Link href="/shop" className="checkout-btn" style={{textDecoration: 'none', display: 'inline-block'}}>Go Shopping Now</Link>
          </div>
        ) : (
          <>
            <div className="cart-header cart-grid">
              <div style={{display:'flex', justifyContent:'center'}}>
                <div 
                  className={`checkbox ${selectedItems.length === cartItems.length ? 'checked' : ''}`}
                  onClick={toggleSelectAll}
                >
                  {selectedItems.length === cartItems.length && <svg width="12" height="12" fill="none" stroke="#fff" strokeWidth="3" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>}
                </div>
              </div>
              <div>Product</div>
              <div style={{textAlign:'center'}}>Unit Price</div>
              <div style={{textAlign:'center'}}>Quantity</div>
              <div style={{textAlign:'center'}}>Total Price</div>
              <div style={{textAlign:'center'}}>Actions</div>
            </div>

            {cartItems.map((cartItem) => {
              const item = cartItem.item;
              const isSelected = selectedItems.includes(cartItem.id);
              
              let maxStock = item.stock;
              let isSizeOutOfStock = false;
              const variation = cartItem.variation;
              if (variation) {
                try {
                  const attrs = typeof item.attributes === 'string' ? JSON.parse(item.attributes) : (item.attributes || {});
                  if (attrs.sizes && attrs.size_stocks) {
                    const matchedSize = attrs.sizes.find((s: string) => variation.includes(s));
                    if (matchedSize && attrs.size_stocks[matchedSize] !== undefined) {
                      maxStock = attrs.size_stocks[matchedSize];
                      if (maxStock <= 0) isSizeOutOfStock = true;
                    }
                  }
                } catch (e) {}
              }

              return (
                <div key={cartItem.id} className="cart-card">
                  <div className="seller-header">
                    <svg width="18" height="18" fill="none" stroke="#7c3aed" strokeWidth="2" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    {item.user.name}
                  </div>
                  <div className="item-row cart-grid">
                    <div style={{display:'flex', justifyContent:'center'}}>
                      <div 
                        className={`checkbox ${isSelected ? 'checked' : ''}`}
                        onClick={() => toggleSelect(cartItem.id)}
                      >
                        {isSelected && <svg width="12" height="12" fill="none" stroke="#fff" strokeWidth="3" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>}
                      </div>
                    </div>
                    <div className="product-col">
                      {item.image ? (
                        <img src={`${STORAGE_URL}/${item.image}`} alt={item.name} className="product-img" loading="lazy" decoding="async" />
                      ) : (
                        <div className="product-placeholder">
                          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                        </div>
                      )}
                      <div className="product-info">
                        <div className="product-name">{item.name}</div>
                        <div className="product-stock" style={isSizeOutOfStock ? {color: '#ef4444'} : {}}>
                          Stock: {maxStock} {isSizeOutOfStock && "(Out of Stock)"}
                        </div>
                        {cartItem.variation && <div className="product-stock" style={{color:'#7c3aed', fontWeight:600}}>Variation: {cartItem.variation}</div>}
                      </div>
                    </div>
                    <div style={{textAlign:'center', fontWeight:500, color:'#334155'}}>₱{parseFloat(cartItem.price || item.price).toFixed(2)}</div>
                    <div style={{display:'flex', justifyContent:'center'}}>
                      <div className="qty-controls">
                        <button 
                          className="qty-btn" 
                          onClick={() => updateQuantity(cartItem.id, cartItem.quantity - 1, maxStock)}
                          disabled={cartItem.quantity <= 1}
                        >-</button>
                        <input type="text" className="qty-input" value={cartItem.quantity} readOnly />
                        <button 
                          className="qty-btn" 
                          onClick={() => updateQuantity(cartItem.id, cartItem.quantity + 1, maxStock)}
                          disabled={cartItem.quantity >= maxStock || isSizeOutOfStock}
                        >+</button>
                      </div>
                    </div>
                    <div className="price-col" style={{textAlign:'center'}}>₱{(parseFloat(cartItem.price || item.price) * cartItem.quantity).toFixed(2)}</div>
                    <div style={{textAlign:'center'}}>
                      <button className="action-btn" onClick={() => removeCartItem(cartItem.id)}>Remove</button>
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="bottom-bar">
              <div className="bottom-left">
                <div style={{display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer'}} onClick={toggleSelectAll}>
                  <div className={`checkbox ${selectedItems.length === cartItems.length && cartItems.length > 0 ? 'checked' : ''}`}>
                    {selectedItems.length === cartItems.length && cartItems.length > 0 && <svg width="12" height="12" fill="none" stroke="#fff" strokeWidth="3" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>}
                  </div>
                  <span style={{fontSize: 15, color: '#0f172a', fontWeight: 500}}>Select All ({cartItems.length})</span>
                </div>
              </div>
              <div className="bottom-right">
                <div style={{fontSize: 15, color: '#64748b', fontWeight: 500}}>
                  Total ({totalItemsCount} item{totalItemsCount !== 1 && 's'}): <span style={{fontSize: 26, color: '#7c3aed', fontWeight: 700, marginLeft: 8}}>₱{totalPrice.toFixed(2)}</span>
                </div>
                <button 
                  className="checkout-btn" 
                  onClick={handleCheckout}
                  disabled={selectedItems.length === 0 || checkingOut}
                >
                  {checkingOut ? 'Processing...' : 'Check Out Now'}
                </button>
              </div>
            </div>
          </>
        )}
      </main>
    </>
  );
}
