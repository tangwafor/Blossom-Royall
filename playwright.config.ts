import {defineConfig,devices} from '@playwright/test';

export default defineConfig({
  testDir:'./tests',
  fullyParallel:true,
  retries:1,
  reporter:'list',
  use:{baseURL:'http://127.0.0.1:3002',trace:'on-first-retry',serviceWorkers:'block'},
  webServer:{command:'npm run dev -- --hostname 127.0.0.1 --port 3002',url:'http://127.0.0.1:3002',reuseExistingServer:true,timeout:120000},
  projects:[
    {name:'desktop',use:{...devices['Desktop Chrome']}},
    {name:'mobile',use:{...devices['Desktop Chrome'],viewport:{width:390,height:844},isMobile:true,hasTouch:true}}
  ]
});
