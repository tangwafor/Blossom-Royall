import {expect,test} from '@playwright/test';

test.beforeEach(async({page})=>{
  page.on('pageerror',error=>console.error(`Browser error: ${error.message}`));
});

test('renders the command center and live operating data',async({page})=>{
  await page.goto('/');
  await expect(page.getByRole('heading',{name:'Command Center'})).toBeVisible();
  await expect(page.getByText('Your mall is moving beautifully.')).toBeVisible();
  await expect(page.getByText('$4,820').first()).toBeVisible();
  await expect(page.getByText('#BR-2048')).toBeVisible();
});

test('navigates between core operating views',async({page},testInfo)=>{
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-app-ready','true');
  if(testInfo.project.name==='mobile') await page.getByRole('button',{name:'Open menu'}).click();
  await page.getByRole('button',{name:'Products'}).click();
  await expect(page.getByRole('heading',{name:'Products & inventory'})).toBeVisible();
  await expect(page.getByText('Aurelia Satin Midi')).toBeVisible();
  if(testInfo.project.name==='mobile') await page.getByRole('button',{name:'Open menu'}).click();
  await page.getByRole('button',{name:'Vendors'}).click();
  await expect(page.getByText('Nia Collective')).toBeVisible();
});

test('completes the express sale handoff',async({page},testInfo)=>{
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-app-ready','true');
  await page.getByRole('button',{name:testInfo.project.name==='mobile'?/Open checkout/:/New sale/}).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button',{name:/Tap to scan barcode/}).click();
  await expect(page.getByText('Order #BR-2049 is ready')).toBeVisible();
  await page.getByRole('button',{name:/Continue to checkout/}).click();
  await expect(page.getByRole('heading',{name:'Ready when your customer is.'})).toBeVisible();
});

test('filters orders without rescanning other views',async({page},testInfo)=>{
  test.skip(testInfo.project.name==='mobile','desktop search regression');
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-app-ready','true');
  await page.getByLabel('Search').fill('Nia');
  await expect(page.getByText('#BR-2046')).toBeVisible();
  await expect(page.getByText('#BR-2048')).toHaveCount(0);
});

test('mobile navigation exposes every core destination',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='mobile','mobile regression');
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-app-ready','true');
  await page.getByRole('button',{name:'Open menu'}).click();
  await page.getByRole('button',{name:'Staff'}).click();
  await expect(page.getByRole('heading',{name:'Staff & payroll'})).toBeVisible();
});

test('persists the chosen theme across reloads',async({page})=>{
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-app-ready','true');
  await page.getByRole('button',{name:'Use dark theme'}).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
});

test('exposes an installable PWA manifest and service worker',async({page,request})=>{
  await page.goto('/');
  const manifest=await request.get('/manifest.webmanifest');
  expect(manifest.ok()).toBeTruthy();
  expect((await manifest.json()).name).toContain('Blossom Royall');
  expect((await request.get('/sw.js')).ok()).toBeTruthy();
});

test('shows personalized customer recommendations with explanations',async({page},testInfo)=>{
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-app-ready','true');
  if(testInfo.project.name==='mobile') await page.getByRole('button',{name:'Open menu'}).click();
  await page.getByRole('button',{name:'Customer Shop'}).click();
  await expect(page.getByText('Top picks for you',{exact:false})).toBeVisible();
  await expect(page.getByText('Because you love emerald occasionwear')).toBeVisible();
  await expect(page.getByRole('button',{name:'Add Aurelia Satin Midi to bag'})).toBeVisible();
});

test('gives the owner purchase performance by brand',async({page})=>{
  await page.goto('/');
  await expect(page.getByRole('heading',{name:'What customers are buying'})).toBeVisible();
  await expect(page.getByText('Atelier Omi')).toBeVisible();
  await expect(page.getByText('Repeat buyers')).toBeVisible();
});
