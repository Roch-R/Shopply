const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto');
const ts = require('typescript');
const { NextRequest, NextResponse } = require('next/server');

function compile(path) {
  return ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
}

function storage() {
  const values = new Map();
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key),
    clear: () => values.clear(),
  };
}

function accessForTab() {
  const context = { exports: {}, sessionStorage: storage() };
  vm.runInNewContext(compile('lib/marketplaceAccess.ts'), context);
  return context.exports;
}

function loadSessionCookieModule(nowOverride) {
  const fakeDate = Object.create(Date);
  if (typeof nowOverride === 'number') {
    fakeDate.now = () => nowOverride;
  } else {
    fakeDate.now = () => Date.now();
  }
  const context = {
    exports: {},
    crypto: crypto.webcrypto,
    TextEncoder,
    TextDecoder,
    Buffer,
    Date: fakeDate,
    process: { env: { JWT_SECRET: 'unit-test-shopply-secret', NODE_ENV: 'production' } },
  };
  vm.runInNewContext(compile('lib/sessionCookie.ts'), context);
  return context.exports;
}

function loadProxyModule(sessionMod) {
  const context = {
    exports: {},
    URL,
    require: name => {
      if (name === 'next/server') return { NextRequest, NextResponse };
      if (name === '@/lib/sessionCookie') return sessionMod;
      return {};
    },
  };
  vm.runInNewContext(compile('proxy.ts'), context);
  return context.exports;
}

test('a saved login alone cannot open the marketplace', () => {
  assert.equal(accessForTab().hasMarketplaceAccess('saved-token'), false);
});

test('dashboard access survives shop refresh but returning to landing closes it', () => {
  const access = accessForTab();
  access.grantMarketplaceAccess('member-token');
  assert.equal(access.hasMarketplaceAccess('member-token'), true);
  assert.equal(access.hasMarketplaceAccess('member-token'), true);
  access.revokeMarketplaceAccess();
  assert.equal(access.hasMarketplaceAccess('member-token'), false);
  access.grantMarketplaceAccess('member-token');
  assert.equal(access.hasMarketplaceAccess('member-token'), true);
});

test('a different tab or login cannot reuse a dashboard grant', () => {
  const first = accessForTab();
  first.grantMarketplaceAccess('first-login');
  assert.equal(accessForTab().hasMarketplaceAccess('first-login'), false);
  assert.equal(first.hasMarketplaceAccess('second-login'), false);
  assert.equal(first.hasMarketplaceAccess(null), false);
});

const shopSource = compile('app/shop/page.tsx');
for (const [name, grant, status, allowed] of [
  ['landing then direct shop', false, 200, false],
  ['dashboard then shop', true, 200, true],
  ['expired dashboard login', true, 401, false],
  ['suspended dashboard login', true, 403, false],
]) {
  test(name, async () => {
    const access = accessForTab();
    if (grant) access.grantMarketplaceAccess('token');
    const local = storage();
    local.setItem('token', 'token');
    // Old shared flags must never unlock the new gate.
    local.setItem('shopply_dashboard_access', 'true');
    let effect, cursor = 0, requests = 0;
    const states = [], redirects = [];
    const router = { replace: url => redirects.push(url) };
    const jsx = (type, props) => ({ type, props });
    const context = {
      exports: {}, AbortController, localStorage: local,
      window: { addEventListener() {}, removeEventListener() {} },
      fetch: async () => {
        requests++;
        return { status, ok: status === 200, json: async () => ({ user: { id: 1 } }) };
      },
      require: name => {
        if (name === '@/lib/marketplaceAccess') return access;
        if (name === '@/lib/apiCache') return { getApiCache: () => ({ invalidateAll() {} }) };
        if (name === 'next/navigation') return { useRouter: () => router };
        if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
        if (name === 'react') return {
          useEffect: fn => { effect = fn; },
          useState: initial => {
            const index = cursor++;
            if (!(index in states)) states[index] = initial;
            return [states[index], value => { states[index] = value; }];
          },
        };
        return {};
      },
    };
    vm.runInNewContext(shopSource, context);
    assert.equal(context.exports.default().type, 'main');
    const cleanup = effect();
    await new Promise(resolve => setImmediate(resolve));
    cursor = 0;
    const view = context.exports.default();
    assert.equal(view.type.name === 'MarketplaceContent', allowed);
    assert.equal(requests, grant ? 1 : 0);
    assert.deepEqual(redirects, allowed ? [] : ['/']);
    cleanup?.();
  });
}

test('service worker does not serve cached pages, redirects, or Next route data', () => {
  const handlers = {};
  vm.runInNewContext(fs.readFileSync('public/sw.js', 'utf8'), {
    URL, self: { addEventListener: (event, fn) => { handlers[event] = fn; } },
  });
  for (const [mode, headers] of [
    ['navigate', {}],
    ['cors', { accept: 'text/html' }],
    ['cors', { rsc: '1' }],
    ['cors', { 'next-router-state-tree': '[]' }],
  ]) {
    handlers.fetch({
      request: { method: 'GET', url: 'https://shop-ply.site/shop', mode, headers: new Headers(headers) },
      respondWith() { assert.fail('Route requests must use the browser network'); },
    });
  }
});

test('landing page and static pages never link logo or navbar to dashboard', () => {
  const heroZoomOut = fs.readFileSync('app/about/HeroZoomOut.tsx', 'utf8');
  assert.equal(heroZoomOut.includes('href="/dashboard"'), false, 'HeroZoomOut must not contain dashboard links');

  const landingPage = fs.readFileSync('app/page.tsx', 'utf8');
  assert.match(landingPage, /localStorage\.removeItem\("token"\)/, 'Landing page must purge token');
  assert.match(landingPage, /user=\{null\}/, 'Landing page must pass null user');

  const staticPages = [
    'app/about/page.tsx',
    'app/features/page.tsx',
    'app/contact/page.tsx',
    'app/careers/page.tsx',
    'app/terms/page.tsx',
    'app/privacy/page.tsx',
  ];
  for (const page of staticPages) {
    const src = fs.readFileSync(page, 'utf8');
    assert.equal(src.includes('href="/dashboard" className="nav-logo"'), false, `${page} logo must not link to /dashboard`);
    assert.equal(src.includes('href="/dashboard" className="nav-link">Dashboard</Link>'), false, `${page} nav must not link to /dashboard`);
  }
});

test('signed session cookie verifies valid tokens and rejects tampering or expiry', async () => {
  const now = 1_800_000_000_000;
  const sessionMod = loadSessionCookieModule(now);
  const signed = await sessionMod.signSessionCookie(42);
  const verified = await sessionMod.verifySessionCookie(signed);
  assert.equal(verified?.uid, '42');
  assert.equal(verified?.verified, true);

  // Tamper payload
  const parts = signed.split('.');
  const forgedPayload = Buffer.from(JSON.stringify({ uid: '1', verified: true, iat: 1, exp: 9999999999 })).toString('base64url');
  assert.equal(await sessionMod.verifySessionCookie(`${parts[0]}.${forgedPayload}.${parts[2]}`), null);

  // Tamper signature
  assert.equal(await sessionMod.verifySessionCookie(`${parts[0]}.${parts[1]}.invalidsig`), null);

  // Expired cookie (8 days later)
  const futureMod = loadSessionCookieModule(now + 8 * 24 * 60 * 60 * 1000);
  assert.equal(await futureMod.verifySessionCookie(signed), null);
});

test('server proxy strictly blocks /login, /register, /verify, and /auth/google when already authenticated', async () => {
  const sessionMod = loadSessionCookieModule();
  const proxyMod = loadProxyModule(sessionMod);
  const validCookie = await sessionMod.signSessionCookie(99);

  for (const blockedPath of [
    '/login',
    '/register',
    '/verify',
    '/auth/google/chooser',
    '/auth/google/callback',
  ]) {
    const req = new NextRequest(`https://www.shop-ply.site${blockedPath}`, {
      headers: { cookie: `${sessionMod.SHOPPLY_SESSION_COOKIE}=${validCookie}` },
    });
    const res = await proxyMod.proxy(req);
    assert.equal(res.status, 307, `${blockedPath} must redirect with 307 when logged in`);
    assert.equal(
      res.headers.get('location'),
      'https://www.shop-ply.site/dashboard?notice=already_authenticated',
      `${blockedPath} must redirect to /dashboard?notice=already_authenticated`
    );
    assert.match(res.headers.get('cache-control') || '', /no-store/);
  }

  // Logged-out visitor can access /login and /register normally
  for (const guestPath of ['/login', '/register']) {
    const guestReq = new NextRequest(`https://www.shop-ply.site${guestPath}`);
    const guestRes = await proxyMod.proxy(guestReq);
    assert.equal(guestRes.status, 200, `${guestPath} must allow unauthenticated guests`);
    assert.match(guestRes.headers.get('cache-control') || '', /no-store/);
  }

  // Explicit logout redirect (/login?logged_out=1) clears stale session cookie instead of looping
  const logoutReq = new NextRequest('https://www.shop-ply.site/login?logged_out=1', {
    headers: { cookie: `${sessionMod.SHOPPLY_SESSION_COOKIE}=${validCookie}` },
  });
  const logoutRes = await proxyMod.proxy(logoutReq);
  assert.equal(logoutRes.status, 200);
  assert.match(logoutRes.headers.get('set-cookie') || '', /shopply_session=;/);

  // Landing page (/) clears session cookie to stay synchronized with app/page.tsx
  const homeReq = new NextRequest('https://www.shop-ply.site/', {
    headers: { cookie: `${sessionMod.SHOPPLY_SESSION_COOKIE}=${validCookie}` },
  });
  const homeRes = await proxyMod.proxy(homeReq);
  assert.equal(homeRes.status, 200);
  assert.match(homeRes.headers.get('set-cookie') || '', /shopply_session=;/);
});

test('auth pages enforce useGuestOnlyGuard before mounting credential inputs', () => {
  for (const authFile of ['app/login/page.tsx', 'app/register/page.tsx', 'app/verify/page.tsx']) {
    const src = fs.readFileSync(authFile, 'utf8');
    assert.match(src, /useGuestOnlyGuard/, `${authFile} must call useGuestOnlyGuard`);
    assert.match(src, /if \(checking/, `${authFile} must gate form rendering while checking session`);
  }
});
