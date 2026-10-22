const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

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
  };
}

function accessForTab() {
  const context = { exports: {}, sessionStorage: storage() };
  vm.runInNewContext(compile('lib/marketplaceAccess.ts'), context);
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

