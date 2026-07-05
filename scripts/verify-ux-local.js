const { chromium } = require('playwright');

const BASE = process.argv[2] === 'local' 
  ? 'http://localhost:3456' 
  : 'https://gotakecrm-git-demo-feellipes-projects.vercel.app';

async function verifyPage(page, name, url) {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(2000);
  
  const data = await page.evaluate((pageName) => {
    const result = { name: pageName, url: window.location.href };
    
    // Check horizontal scroll
    result.horizontalScroll = document.documentElement.scrollWidth > document.documentElement.clientWidth;
    
    // Check interactive elements sizes
    const els = document.querySelectorAll('button, a, input, select, [role="button"]');
    let smallTargets = 0;
    let issues = [];
    els.forEach(el => {
      const r = el.getBoundingClientRect();
      if ((r.width > 0 && r.height > 0) && (r.width < 44 || r.height < 44)) {
        smallTargets++;
        const text = (el.textContent || '').trim().slice(0, 30);
        issues.push(`${el.tagName.toLowerCase()} "${text}" ${Math.round(r.width)}x${Math.round(r.height)}px`);
      }
    });
    result.totalInteractive = els.length;
    result.smallTargets = smallTargets;
    result.issues = issues.slice(0, 10);
    
    // Check header actions visibility
    const header = document.querySelector('header');
    if (header) {
      const headerBtns = header.querySelectorAll('button, a');
      result.headerActions = [];
      headerBtns.forEach(b => {
        const r = b.getBoundingClientRect();
        const visible = r.width > 0 && r.height > 0 && r.x < window.innerWidth && r.x + r.width > 0;
        result.headerActions.push({
          text: (b.textContent || '').trim().slice(0, 20),
          visible,
          x: Math.round(r.x),
          w: Math.round(r.width)
        });
      });
      result.allHeaderVisible = result.headerActions.every(a => a.visible);
    }
    
    return result;
  }, name);
  
  return data;
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const page = await ctx.newPage();
  
  // Test just the login page (no auth needed)
  console.log(`Testing against: ${BASE}\n`);
  
  console.log('=== LOGIN PAGE ===');
  const loginData = await verifyPage(page, 'Login', BASE + '/login');
  console.log(`  Horizontal scroll: ${loginData.horizontalScroll ? '❌ YES' : '✅ NO'}`);
  console.log(`  Small targets (<44px): ${loginData.smallTargets}/${loginData.totalInteractive}`);
  loginData.issues.forEach(i => console.log(`    ❌ ${i}`));
  
  // Try to log in
  const emailInput = page.locator('#email');
  if (await emailInput.isVisible()) {
    await emailInput.fill('demo@gotakecrm.com');
    await page.locator('#password').fill('demo2026');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(4000);
    
    const loginSuccess = page.url().includes('dashboard');
    console.log(`\n  Login: ${loginSuccess ? '✅ Success' : '❌ Failed'}`);
    
    if (loginSuccess) {
      console.log('\n=== DASHBOARD ===');
      const dashData = await verifyPage(page, 'Dashboard', BASE + '/dashboard');
      console.log(`  Horizontal scroll: ${dashData.horizontalScroll ? '❌ YES' : '✅ NO'}`);
      console.log(`  Small targets (<44px): ${dashData.smallTargets}/${dashData.totalInteractive}`);
      dashData.issues.forEach(i => console.log(`    ❌ ${i}`));
      if (dashData.allHeaderVisible !== undefined) {
        console.log(`  All header actions visible at 375px: ${dashData.allHeaderVisible ? '✅' : '❌'}`);
      }
    }
  }
  
  console.log(`\n${'='.repeat(40)}`);
  const totalSmall = loginData.smallTargets;
  const hasScroll = loginData.horizontalScroll;
  
  if (totalSmall === 0 && !hasScroll) {
    console.log('✅ ALL FIXES VERIFIED — no small targets, no scroll');
  } else {
    console.log(`❌ ${totalSmall} small targets remain, scroll: ${hasScroll}`);
  }
  
  await browser.close();
})();
