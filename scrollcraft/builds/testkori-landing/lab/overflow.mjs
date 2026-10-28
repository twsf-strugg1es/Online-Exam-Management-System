import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
for (const w of [360, 390, 1024, 1440]) {
  const p = await b.newPage({ viewport: { width: w, height: 800 } });
  for (const f of ['index.html', 'waitlist.html']) {
    await p.goto('http://localhost:4500/' + f, { waitUntil: 'networkidle' });
    const r = await p.evaluate(async () => { let worst = 0; for (let y = 0; y < document.body.scrollHeight; y += 400) { scrollTo(0, y); await new Promise(r => requestAnimationFrame(r)); worst = Math.max(worst, document.documentElement.scrollWidth - innerWidth); } return worst; });
    console.log(w, f, 'overflow px:', r);
  }
}
await b.close();
