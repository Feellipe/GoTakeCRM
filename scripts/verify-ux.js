const { chromium } = require('playwright');

const BASE = 'https://gotakecrm-git-demo-feellipes-projects.vercel.app';

async function verifyPage(page, name, url) {
  await page.goto(url, { waitUntil: 'networkidle' });
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
      if ((r.width < 44 || r.height < 44) && (r.width > 0 && r.height > 0)) {
        smallTargets++;
        const text = (el.textContent || '').trim().slice(0, 30);
        issues.push(`${el.tagName} "${text}" ${Math.round(r.width)}x${Math.round(r.height)}px`);
      }
    });
    result.totalInteractive = els.length;
    result.smallTargets = smallTargets;
    result.issues = issues.slice(0, 10); // first 10
    
    return result;
  }, name);
  
  return data;
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const page = await ctx.newPage();
  
  const pages = [
    { name: 'Login', url: BASE + '/login' },
    { name: 'Dashboard', url: BASE + '/dashboard' },
    { name: 'Clients', url: BASE + '/clients' },
    { name: 'Pipeline', url: BASE + '/pipeline' },
    { name: 'Proposals', url: BASE + '/proposals' },
    { name: 'Financials', url: BASE + '/financials' },
    { name: 'Calendar', url: BASE + '/calendar' },
  ];
  
  console.log('=== MOBILE UX VERIFICATION ===');
  console.log('Viewport: 375×812px\n');
  
  let totalIssues = 0;
  let allPass = true;
  
  for (const p of pages) {
    // Login first for authenticated pages
    if (p.name === 'Login') {
      const d = await verifyPage(page, p.name, p.url);
      console.log(`\n${d.name}:`);
      console.log(`  Horizontal scroll: ${d.horizontalScroll ? '❌ YES' : '✅ NO'}`);
      console.log(`  Small targets (<44px): ${d.smallTargets}/${d.totalInteractive}`);
      if (d.issues.length > 0) {
        d.issues.forEach(i => console.log(`    ❌ ${i}`));
        totalIssues += d.smallTargets;
      }
      if (d.horizontalScroll || d.smallTargets > 0) allPass = false;
      
      // Now log in
      await page.fill('#email', 'demo@gotakecrm.com');
      await page.fill('#password', 'demo2026');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(4000);
      continue;
    }
    
    const d = await verifyPage(page, p.name, p.url);
    console.log(`\n${d.name}:`);
    console.log(`  Horizontal scroll: ${d.horizontalScroll ? '❌ YES' : '✅ NO'}`);
    console.log(`  Small targets (<44px): ${d.smallTargets}/${d.totalInteractive}`);
    if (d.issues.length > 0) {
      d.issues.slice(0, 5).forEach(i => console.log(`    ❌ ${i}`));
      totalIssues += d.smallTargets;
    }
    if (d.horizontalScroll || d.smallTargets > 0) allPass = false;
  }
  
  console.log(`\n${'='.repeat(40)}`);
  console.log(`TOTAL small targets remaining: ${totalIssues}`);
  console.log(`OVERALL: ${allPass ? '✅ ALL PASS' : '❌ ISSUES REMAINING'}`);
  
  await browser.close();
})();
