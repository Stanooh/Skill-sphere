import { spawn } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function main() {
  const tmpDir = path.join(os.tmpdir(), 'chrome_final_' + Date.now());
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--disable-gpu',
    '--no-sandbox',
    '--no-first-run',
    '--user-data-dir=' + tmpDir,
  ]);

  let started = false;
  for (let i = 0; i < 50; i++) {
    await new Promise((r) => setTimeout(r, 300));
    try {
      const res = await fetch('http://127.0.0.1:9222/json/version');
      if (res.ok) { started = true; break; }
    } catch {}
  }
  if (!started) { chrome.kill(); throw new Error('Chrome did not start in time'); }

  const newTargetRes = await fetch('http://127.0.0.1:9222/json/new?http://localhost:3000', { method: 'PUT' });
  const ws = new WebSocket((await newTargetRes.json()).webSocketDebuggerUrl);

  let id = 1;
  const pending = new Map();
  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const msgId = id++;
      pending.set(msgId, { resolve, reject });
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }
  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(msg.error); else resolve(msg.result);
    }
  };
  await new Promise((r) => (ws.onopen = r));
  await send('Page.enable');

  const viewports = [
    { width: 320, height: 568 },
    { width: 375, height: 812 },
    { width: 390, height: 844 },
    { width: 430, height: 932 },
    { width: 1200, height: 900 },
  ];

  const results = [];

  for (const vp of viewports) {
    await send('Emulation.setDeviceMetricsOverride', {
      width: vp.width, height: vp.height, deviceScaleFactor: 2, mobile: vp.width < 768,
    });
    await send('Page.navigate', { url: 'http://localhost:3000' });

    // Wait for hydration
    for (let i = 0; i < 50; i++) {
      await new Promise((r) => setTimeout(r, 150));
      const r = await send('Runtime.evaluate', {
        expression: `document.readyState === 'complete' && !!document.querySelector('nav')`,
        returnByValue: true,
      });
      if (r.result.value) break;
    }
    await new Promise((r) => setTimeout(r, 500));

    const data = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const nav = document.querySelector('nav');
          const btn = document.querySelector('button[aria-label*="navigation menu"]');
          const heroImg = document.querySelector('img[alt*="learner"]');
          const desktopLinks = document.querySelector('.hidden.md\\\\:flex');

          const cs = (el) => el ? { position: getComputedStyle(el).position, zIndex: getComputedStyle(el).zIndex, backdropFilter: getComputedStyle(el).backdropFilter } : null;
          const rect = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { top: r.top, left: r.left, w: r.width, h: r.height }; };

          let elAtHamburger = null;
          if (btn) {
            const r = btn.getBoundingClientRect();
            const el = document.elementFromPoint(r.left + r.width/2, r.top + r.height/2);
            const inside = el && btn.contains(el);
            elAtHamburger = { tag: el?.tagName, inside };
          }

          // Check for backdrop-filter on nav itself
          const navCss = cs(nav);
          const innerBar = nav?.querySelector('div');
          const innerCss = cs(innerBar);

          return {
            vp: { w: window.innerWidth, h: window.innerHeight },
            navCss, innerBarCss: innerCss,
            btnVisible: btn ? { found: true, rect: rect(btn) } : { found: false },
            elAtHamburger,
            desktopLinksVisible: desktopLinks ? getComputedStyle(desktopLinks).display !== 'none' : false,
            heroImgRect: rect(heroImg),
          };
        })()
      `,
      returnByValue: true,
    });

    const v = data.result.value;
    const isMobile = vp.width < 768;

    // --- Assertions ---
    const checks = [];

    // 1. Nav has NO backdrop-filter itself
    const navHasBackdrop = v.navCss?.backdropFilter && v.navCss.backdropFilter !== 'none';
    checks.push({ name: 'Nav has NO backdrop-filter (fix verified)', pass: !navHasBackdrop });

    // 2. Inner bar HAS backdrop-filter
    const innerHasBackdrop = v.innerBarCss?.backdropFilter && v.innerBarCss.backdropFilter !== 'none';
    checks.push({ name: 'Inner bar HAS backdrop-filter', pass: innerHasBackdrop });

    // 3. Nav is z-40
    checks.push({ name: 'Nav z-index is 40', pass: v.navCss?.zIndex === '40' });

    // 4. Nav is sticky
    checks.push({ name: 'Nav is sticky', pass: v.navCss?.position === 'sticky' });

    // 5. Hamburger found on mobile, desktop links visible on desktop
    if (isMobile) {
      checks.push({ name: 'Hamburger button found on mobile', pass: v.btnVisible.found });
      checks.push({ name: 'Element AT hamburger is INSIDE button (not covered)', pass: !!v.elAtHamburger?.inside });
      checks.push({ name: 'Desktop links hidden on mobile', pass: !v.desktopLinksVisible });
    } else {
      checks.push({ name: 'Desktop links visible at 1200px', pass: v.desktopLinksVisible });
      checks.push({ name: 'No hamburger on desktop', pass: !v.btnVisible.found || v.elAtHamburger?.inside === false });
    }

    // 6. Scroll test on mobile
    if (isMobile) {
      await send('Runtime.evaluate', { expression: `window.scrollTo(0, 300);` });
      await new Promise((r) => setTimeout(r, 150));
      const scrollCheck = await send('Runtime.evaluate', {
        expression: `
          (() => {
            const btn = document.querySelector('button[aria-label*="navigation menu"]');
            if (!btn) return { btnTop: null };
            const r = btn.getBoundingClientRect();
            const el = document.elementFromPoint(r.left + r.width/2, r.top + r.height/2);
            return { btnTop: r.top, btnInsideBtn: el ? btn.contains(el) : false };
          })()
        `,
        returnByValue: true,
      });
      const sc = scrollCheck.result.value;
      checks.push({ name: 'Hamburger visible after scrolling 300px (top 0-70)', pass: sc.btnTop >= 0 && sc.btnTop < 70 });
      checks.push({ name: 'Element at hamburger is INSIDE button (not covered) after scroll', pass: !!sc.btnInsideBtn });
      await send('Runtime.evaluate', { expression: `window.scrollTo(0, 0);` });
    }

    // 7. Click hamburger to open menu on mobile
    if (isMobile) {
      await send('Runtime.evaluate', {
        expression: `
          (() => {
            const btn = document.querySelector('button[aria-label*="navigation menu"]');
            if (!btn) return;
            btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
          })()
        `,
      });
      await new Promise((r) => setTimeout(r, 600));

      const menuCheck = await send('Runtime.evaluate', {
        expression: `
          (() => {
            const menu = document.getElementById('mobile-navigation');
            if (!menu) return { found: false };
            const r = menu.getBoundingClientRect();
            const cs = getComputedStyle(menu);
            const links = Array.from(menu.querySelectorAll('a')).map(a => a.textContent.trim());
            // Check first link is clickable (element at link center is inside menu)
            const firstLink = menu.querySelector('a');
            let linkClickable = false;
            if (firstLink) {
              const lr = firstLink.getBoundingClientRect();
              const el = document.elementFromPoint(lr.left + lr.width/2, lr.top + lr.height/2);
              linkClickable = el ? menu.contains(el) : false;
            }
            return {
              found: true,
              fullViewport: r.width >= window.innerWidth * 0.9,
              zIndex: cs.zIndex,
              links,
              linkClickable,
              rect: { top: r.top, h: r.height, w: r.width },
            };
          })()
        `,
        returnByValue: true,
      });

      const mc = menuCheck.result.value;
      checks.push({ name: 'Mobile menu opens (found in DOM)', pass: mc.found });
      if (mc.found) {
        checks.push({ name: 'Menu covers full viewport width', pass: mc.fullViewport });
        checks.push({ name: 'Nav links in menu (≥7)', pass: mc.links?.length >= 7 });
        checks.push({ name: 'First link clickable (not covered)', pass: mc.linkClickable });

        // Close menu
        await send('Runtime.evaluate', {
          expression: `
            (() => {
              const btn = document.querySelector('button[aria-label*="navigation menu"]');
              if (btn) btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
            })()
          `,
        });
        await new Promise((r) => setTimeout(r, 300));
        const closed = await send('Runtime.evaluate', {
          expression: `!document.getElementById('mobile-navigation')`,
          returnByValue: true,
        });
        checks.push({ name: 'Menu closes on second click', pass: closed.result.value });
      }
    }

    results.push({ viewport: `${vp.width}x${vp.height}`, checks, raw: v });
  }

  // Print results
  let allPass = true;
  for (const { viewport, checks } of results) {
    console.log(`\n=== ${viewport} ===`);
    for (const c of checks) {
      const sym = c.pass ? '✅' : '❌';
      console.log(`  ${sym} ${c.name}`);
      if (!c.pass) allPass = false;
    }
  }

  console.log(allPass ? '\n🎉 ALL CHECKS PASSED' : '\n❌ SOME CHECKS FAILED');

  ws.close();
  chrome.kill();
}

main().catch(console.error);
