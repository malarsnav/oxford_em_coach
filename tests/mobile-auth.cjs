const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const fixture={profile:{target_course:'Oxford Economics & Management'},subjects:[],tasks:[],journal:[],reasoning:[],milestones:[],weeklyReviews:[],interviews:[],studyPlanLogs:[],parentStudents:[],readiness:{},recommendations:[],tara:{overallAccuracy:0,totalQuestions:0,totalAttempts:0,attempts:[],responses:[],byType:[],byPattern:[]}};
const source=fs.readFileSync(path.join(root,'src/dataService.js'),'utf8');
const start=source.indexOf('export async function bootstrap('),end=source.indexOf('export async function saveAttempt(',start);
const service=source.slice(0,start)+`export async function bootstrap(user){
  window.bootstraps=(window.bootstraps||0)+1;
  if(window.failBootstrap)throw new Error('Offline');
  const data=${JSON.stringify(fixture)};
  data.studyPlanLogs=window.remoteLogs||[];return data;
}\n`+source.slice(end);
const sdk=`export const hasSupabaseConfig=true;
const user={id:'existing-student-id',email:'student@example.test'};
window.authCalls=[];
export const supabase={auth:{
  getSession:async()=>({data:{session:localStorage.getItem('mock-session')?{user}:null}}),
  signInWithOtp:async()=>{window.authCalls.push('magic');return {};},
  signInWithPassword:async({email,password})=>{
    window.authCalls.push('password');
    if(email!==user.email||password!=='a-test-password-123')return {error:new Error('Invalid login credentials')};
    localStorage.setItem('mock-session','yes');return {data:{user}};
  },
  updateUser:async()=>{window.authCalls.push('update-password');return {};},
  resetPasswordForEmail:async(email,options)=>{window.resetRedirect=options.redirectTo;window.authCalls.push('recovery');return {};},
  signOut:async({scope})=>{window.signoutScope=scope;localStorage.removeItem('mock-session');return {};}
}};`;
const server=http.createServer((req,res)=>{
  const file=path.resolve(root,decodeURIComponent(req.url.split('?')[0]).replace(/^\/oxford_em_coach\//,'')||'index.html');
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  try{res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}
});
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
  try{
    browser=await chromium.launch({channel:'msedge',headless:true});
    const url=`http://127.0.0.1:${server.address().port}/oxford_em_coach/`;
    for(const mobile of [true,false]){
      const page=await browser.newPage({viewport:{width:mobile?390:1440,height:900},timezoneId:'Europe/London',...(mobile?{userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1'}:{})});
      const errors=[];page.on('pageerror',e=>errors.push(e.message));
      await page.route('**/src/supabaseClient.js',r=>r.fulfill({contentType:'text/javascript',body:sdk}));
      await page.route('**/src/dataService.js',r=>r.fulfill({contentType:'text/javascript',body:service}));
      await page.clock.setFixedTime(new Date('2026-09-17T12:00:00Z'));
      await page.goto(url);
      if(!mobile){await page.getByRole('button',{name:'Send magic link',exact:true}).waitFor();await page.getByRole('button',{name:'Use password instead',exact:true}).click();}
      else assert.equal(await page.getByRole('button',{name:'Send magic link',exact:true}).count(),0);
      const login=page.locator('[data-action="password-login"]');
      await login.locator('[name=email]').fill('student@example.test');
      await login.locator('[name=password]').fill('wrong-password');await login.getByRole('button',{name:'Sign in',exact:true}).click();
      await login.locator('.form-status').getByText(/Invalid login credentials/).waitFor();
      await login.locator('[name=password]').fill('a-test-password-123');await login.getByRole('button',{name:'Sign in',exact:true}).click();
      await page.getByRole('button',{name:'Dashboard',exact:true}).waitFor();
      assert.equal(await page.evaluate(()=>window.authCalls.includes('magic')),false);
      await page.reload();await page.getByRole('button',{name:'Dashboard',exact:true}).waitFor();
      assert.deepEqual(await page.evaluate(()=>window.authCalls),[]);
      await page.getByRole('button',{name:'Profile',exact:true}).click();
      const setup=page.locator('[data-action="set-password"]');
      await setup.locator('[name=password]').fill('a-test-password-123');await setup.locator('[name=confirmation]').fill('different-password');
      await setup.getByRole('button').click();await setup.getByText(/Passwords do not match/).waitFor();
      await setup.locator('[name=confirmation]').fill('a-test-password-123');await setup.getByRole('button').click();
      await setup.getByText(/Password saved/).waitFor();assert.equal(await setup.locator('[name=password]').inputValue(),'');
      await page.getByRole('button',{name:'Dashboard',exact:true}).click();
      await page.evaluate(()=>{window.remoteLogs=[{log_date:'2026-09-17',start_time:'07:00',end_time:'07:30',planned_activity:'EPQ',rag_status:'green'}];});
      await page.clock.setFixedTime(new Date('2026-09-17T12:01:00Z'));
      await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
      await page.getByText('1/5 planned study blocks logged today',{exact:true}).waitFor();
      await page.getByRole('button',{name:'Plan Tracker',exact:true}).click();
      await page.locator('.tracker-block > summary').first().click();
      await page.locator('.tracker-block').first().locator('[name=project_title]').fill('Unsaved EPQ draft');
      const before=await page.evaluate(()=>window.bootstraps);
      await page.clock.setFixedTime(new Date('2026-09-17T12:02:00Z'));
      await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
      assert.equal(await page.evaluate(()=>window.bootstraps),before);
      assert.equal(await page.locator('[name=project_title]').inputValue(),'Unsaved EPQ draft');
      await page.getByRole('button',{name:'Dashboard',exact:true}).click();
      await page.evaluate(()=>{window.failBootstrap=true;window.dispatchEvent(new Event('online'));});
      await page.getByText(/Refresh failed. Your saved progress/).waitFor();
      await page.getByText('1/5 planned study blocks logged today',{exact:true}).waitFor();
      await page.evaluate(()=>window.failBootstrap=false);
      await page.getByRole('button',{name:'Sign out',exact:true}).click();
      if(!mobile)await page.getByRole('button',{name:'Use password instead',exact:true}).click();
      await page.getByRole('button',{name:'Forgot password?',exact:true}).click();
      await page.locator('[name=email]').fill('student@example.test');await page.getByRole('button',{name:'Send recovery email',exact:true}).click();
      await page.getByText(/If this account can receive/).waitFor();
      assert.ok((await page.evaluate(()=>window.resetRedirect)).endsWith('/oxford_em_coach/?account=recovery'));
      await page.evaluate(()=>localStorage.setItem('mock-session','yes'));await page.goto(url+'?account=recovery');
      await page.getByRole('heading',{name:'Reset password',exact:true}).waitFor();
      await page.locator('[name=password]').fill('a-test-password-123');await page.locator('[name=confirmation]').fill('a-test-password-123');await page.getByRole('button',{name:'Save password',exact:true}).click();
      await page.getByRole('button',{name:'Dashboard',exact:true}).waitFor();assert.equal(new URL(page.url()).search,'');
      await page.getByRole('button',{name:'Profile',exact:true}).click();
      await page.locator('[data-action="set-password"]').screenshot({path:path.join(root,`../work/password-settings-${mobile?'mobile':'desktop'}.png`)});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      assert.deepEqual(errors,[]);await page.close();
      console.log(`Password auth, recovery, session restore and guarded refresh passed (${mobile?'mobile':'desktop'}, mock Supabase).`);
    }
    const installed=await browser.newPage();
    await installed.addInitScript(()=>Object.defineProperty(navigator,'standalone',{value:true}));
    await installed.route('**/src/supabaseClient.js',r=>r.fulfill({contentType:'text/javascript',body:sdk}));
    await installed.route('**/src/dataService.js',r=>r.fulfill({contentType:'text/javascript',body:service}));
    await installed.goto(url);await installed.locator('[data-action="password-login"]').waitFor();
    assert.equal(await installed.getByRole('button',{name:'Send magic link',exact:true}).count(),0);
    await installed.close();
    const failed=await browser.newPage();
    await failed.route('**/src/supabaseClient.js',r=>r.fulfill({contentType:'text/javascript',body:'export const hasSupabaseConfig=true; export const supabase=null;'}));
    await failed.goto(url);await failed.getByText(/No offline demo was opened/).waitFor();await failed.close();
  }finally{if(browser)await browser.close();server.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
