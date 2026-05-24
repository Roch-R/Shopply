// Force recompile
import React from 'react';

export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div 
      className={`animate-pulse bg-slate-200 rounded-md ${className || ''}`}
      style={style}
    />
  );
}

export function SkeletonShopCard() {
  return (
    <div className="item-card animate-pulse" style={{ height: 380, display: 'flex', flexDirection: 'column' }}>
      <div className="bg-slate-200" style={{ height: 220, width: '100%' }}></div>
      <div className="item-content" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div className="bg-slate-200 rounded" style={{ height: '24px', width: '70%' }}></div>
        <div className="bg-slate-200 rounded" style={{ height: '16px', width: '100%' }}></div>
        <div className="bg-slate-200 rounded" style={{ height: '16px', width: '85%' }}></div>
        <div style={{ marginTop: 'auto', display: 'flex', gap: '8px' }}>
          <div className="bg-slate-200 rounded" style={{ height: '36px', flex: 1 }}></div>
          <div className="bg-slate-200 rounded" style={{ height: '36px', flex: 1 }}></div>
        </div>
      </div>
    </div>
  );
}

export function SkeletonCartItem() {
  return (
    <div className="cart-card animate-pulse" style={{ marginBottom: '16px' }}>
      <div className="seller-header" style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '8px' }}>
        <div className="bg-slate-200 rounded-full" style={{ width: '18px', height: '18px' }}></div>
        <div className="bg-slate-200 rounded" style={{ width: '120px', height: '18px' }}></div>
      </div>
      <div className="item-row cart-grid">
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div className="bg-slate-200 rounded" style={{ width: '20px', height: '20px' }}></div>
        </div>
        <div className="product-col">
          <div className="bg-slate-200 rounded" style={{ width: '80px', height: '80px' }}></div>
          <div className="product-info" style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
            <div className="bg-slate-200 rounded" style={{ width: '80%', height: '16px' }}></div>
            <div className="bg-slate-200 rounded" style={{ width: '40%', height: '14px' }}></div>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div className="bg-slate-200 rounded" style={{ width: '60px', height: '20px' }}></div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div className="bg-slate-200 rounded" style={{ width: '80px', height: '32px' }}></div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div className="bg-slate-200 rounded" style={{ width: '60px', height: '20px' }}></div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div className="bg-slate-200 rounded" style={{ width: '50px', height: '24px' }}></div>
        </div>
      </div>
    </div>
  );
}

export function SkeletonTableRow() {
  return (
    <div className="animate-pulse" style={{ display: 'flex', padding: '16px', borderBottom: '1px solid #f1f5f9', gap: '16px', alignItems: 'center' }}>
      <div className="bg-slate-200 rounded" style={{ width: '40px', height: '20px' }}></div>
      <div className="bg-slate-200 rounded" style={{ flex: 2, height: '20px' }}></div>
      <div className="bg-slate-200 rounded" style={{ flex: 1, height: '20px' }}></div>
      <div className="bg-slate-200 rounded" style={{ flex: 1, height: '20px' }}></div>
      <div className="bg-slate-200 rounded" style={{ width: '80px', height: '30px' }}></div>
    </div>
  );
}

export function SkeletonStatCard() {
  return (
    <div className="stat-card animate-pulse" style={{ background: '#fff', padding: '24px', borderRadius: '16px', border: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div className="bg-slate-200 rounded" style={{ width: '40px', height: '40px' }}></div>
      <div className="bg-slate-200 rounded" style={{ width: '80px', height: '14px' }}></div>
      <div className="bg-slate-200 rounded" style={{ width: '60px', height: '28px' }}></div>
    </div>
  );
}

export function SkeletonChatMessage() {
  return (
    <div className="animate-pulse" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '24px' }}>
      <div className="bg-slate-200 rounded" style={{ height: '24px', width: '80%' }}></div>
      <div className="bg-slate-200 rounded" style={{ height: '24px', width: '60%' }}></div>
      <div className="bg-slate-200 rounded" style={{ height: '24px', width: '90%' }}></div>
      <div className="bg-slate-200 rounded" style={{ height: '24px', width: '50%' }}></div>
    </div>
  );
}

export function SkeletonChatListItem() {
  return (
    <div className="animate-pulse" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', marginBottom: '8px', borderRadius: '14px' }}>
      <div className="bg-slate-200 rounded-full" style={{ width: '44px', height: '44px', flexShrink: 0 }}></div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="bg-slate-200 rounded" style={{ height: '14px', width: '60%' }}></div>
          <div className="bg-slate-200 rounded" style={{ height: '12px', width: '20%' }}></div>
        </div>
        <div className="bg-slate-200 rounded" style={{ height: '12px', width: '80%' }}></div>
      </div>
    </div>
  );
}
