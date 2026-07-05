const { chromium } = require('playwright');

const BASE = 'https://gotakecrm-git-demo-feellipes-projects.vercel.app';

async function analyzeDesktop(page, name, url) {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(2000);
  
  const data = await page.evaluate((pageName) => {
    const result = { name: pageName, url: window.location.href };
    
    // Horizontal scroll
    result.horizontalScroll = document.documentElement.scrollWidth > document.documentElement.clientWidth;
    
    // Viewport
    result.viewport = { w: window.innerWidth, h: window.innerHeight };
    
    // Interactive elements
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
    result.issues = issues.slice(0, 15);
    
    // Sidebar analysis
    const aside = document.querySelector('aside');
    if (aside) {
      const r = aside.getBoundingClientRect();
      const style = getComputedStyle(aside);
      result.sidebar = {
        w: Math.round(r.width), h: Math.round(r.height),
        x: Math.round(r.x), y: Math.round(r.y),
        visible: r.x >= 0 && r.x < window.innerWidth,
        mode: r.width <= 100 ? 'mini/icon-only' : 'expanded',
        position: style.position,
        zIndex: style.zIndex
      };
      
      // Nav link visibility
      const navLinks = aside.querySelectorAll('a');
      result.navLinkVisibility = [];
      navLinks.forEach(a => {
        const ar = a.getBoundingClientRect();
        const text = (a.textContent || '').trim().slice(0, 20);
        result.navLinkVisibility.push({
          text,
          w: Math.round(ar.width), h: Math.round(ar.height),
          visible: ar.x >= 0
        });
      });
    }
    
    // Headings hierarchy
    result.headings = [];
    document.querySelectorAll('h1, h2, h3, h4').forEach(h => {
      const style = getComputedStyle(h);
      result.headings.push({
        tag: h.tagName,
        text: (h.textContent || '').trim().slice(0, 40),
        size: style.fontSize,
        weight: style.fontWeight
      });
    });
    
    // Header actions visibility
    const header = document.querySelector('header');
    if (header) {
      result.headerActions = [];
      header.querySelectorAll('button, a').forEach(b => {
        const r = b.getBoundingClientRect();
        result.headerActions.push({
          text: (b.textContent || '').trim().slice(0, 20),
          x: Math.round(r.x), w: Math.round(r.width),
          visible: r.x < window.innerWidth
        });
      });
      result.allHeaderVisible = result.headerActions.every(a => a.visible);
    }
    
    // Body font info
    const bs = getComputedStyle(document.body);
    result.bodyFont = bs.fontSize;
    
    // Check for empty states / content density
    const main = document.querySelector('main');
    if (main) {
      const mainR = main.getBoundingClientRect();
      result.mainContent = { w: Math.round(mainR.width), x: Math.round(mainR.x) };
    }
    
    // Cards
    const cards = document.querySelectorAll('[class*="card"], [class*="Card"]');
    result.cardCount = cards.length;
    result.cardLayout = [];
    cards.forEach(c => {
      const r = c.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        result.cardLayout.push({
          w: Math.round(r.width), x: Math.round(r.x),
          usesGrid: r.x > 50 && r.x < window.innerWidth / 2
        });
      }
    });
    
    return result;
  }, name);
  
  return data;
}

(async () => {
  const browser = await chromium.launch();
  
  // 1440px desktop
  const ctxDesktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctxDesktop.newPage();
  
  console.log('=== DESKTOP UX REVIEW (1440×900) ===\n');
  
  // Login
  await page.goto(BASE + '/login', { waitUntil: 'networkidle' });
  await page.fill('#email', 'demo@gotakecrm.com');
  await page.fill('#password', 'demo2026');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard**', { timeout: 10000 });
  await page.waitForTimeout(3000);
  
  // Dashboard
  console.log('--- DASHBOARD ---');
  const dash = await analyzeDesktop(page, 'Dashboard', BASE + '/dashboard');
  printResults(dash);
  
  // Clients
  console.log('\n--- CLIENTS ---');
  const clients = await analyzeDesktop(page, 'Clients', BASE + '/clients');
  printResults(clients);
  
  // Pipeline
  console.log('\n--- PIPELINE ---');
  const pipeline = await analyzeDesktop(page, 'Pipeline', BASE + '/pipeline');
  printResults(pipeline);
  
  // Proposals
  console.log('\n--- PROPOSALS ---');
  const proposals = await analyzeDesktop(page, 'Proposals', BASE + '/proposals');
  printResults(proposals);
  
  // Financials
  console.log('\n--- FINANCIALS ---');
  const financials = await analyzeDesktop(page, 'Financials', BASE + '/financials');
  printResults(financials);
  
  // Calendar
  console.log('\n--- CALENDAR ---');
  const calendar = await analyzeDesktop(page, 'Calendar', BASE + '/calendar');
  printResults(calendar);
  
  await browser.close();
  console.log('\n' + '='.repeat(55));
  console.log('DESKTOP UX REVIEW COMPLETE');
})();

function printResults(data) {
  console.log(`  Viewport: ${data.viewport.w}×${data.viewport.h}`);
  console.log(`  Small targets (<44px): ${data.smallTargets}/${data.totalInteractive}`);
  if (data.issues.length > 0) {
    data.issues.forEach(i => console.log(`    ❌ ${i}`));
  }
  console.log(`  Horizontal scroll: ${data.horizontalScroll ? '❌ YES' : '✅ NO'}`);
  
  if (data.sidebar) {
    console.log(`  Sidebar: ${data.sidebar.w}px wide, ${data.sidebar.mode}, visible=${data.sidebar.visible}`);
    console.log(`  Nav links: ${data.navLinkVisibility.length} items`);
    const hiddenLinks = data.navLinkVisibility.filter(l => !l.visible).length;
    if (hiddenLinks > 0) console.log(`    ⚠️  ${hiddenLinks} nav links not visible`);
  }
  
  if (data.allHeaderActions !== undefined) {
    console.log(`  Header actions all visible: ${data.allHeaderActions ? '✅' : '❌'}`);
  }
  
  if (data.mainContent) {
    console.log(`  Main content: ${data.mainContent.w}px wide, starts at x=${data.mainContent.x}`);
  }
  
  console.log(`  Body font: ${data.bodyFont}`);
  
  if (data.cardCount > 0) {
    const gridCards = data.cardLayout.filter(c => c.usesGrid).length;
    console.log(`  Cards: ${data.cardCount} total, ~${gridCards} in grid layout`);
  }
  
  if (data.headings.length > 0) {
    console.log('  Headings:');
    data.headings.forEach(h => console.log(`    ${h.tag} "${h.text}" — ${h.size}/${h.weight}`));
  }
}
