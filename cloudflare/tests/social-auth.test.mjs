import test from 'node:test';
import assert from 'node:assert/strict';
import { handleSocialAuth } from '../src/social-auth.ts';
import { pathToFileURL } from 'node:url';
const {default: router} = await import(pathToFileURL(process.env.CARRIER_GATEWAY_BUNDLE || '/tmp/dispatchos-worker/router.js').href);
const origin='https://accounts.example.com';
const master='master@example.com';
const pair=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
const jwk={...await crypto.subtle.exportKey('jwk',pair.publicKey),kid:'test-key'};
const b64=x=>Buffer.from(x).toString('base64url');
async function signed(provider,email=master){
 const iss=provider==='google'?'https://accounts.google.com':provider==='apple'?'https://appleid.apple.com':'https://login.microsoftonline.com/9188040d-6c67-4c5b-b112-36a304b66dad/v2.0';
 const body=b64(JSON.stringify({alg:'RS256',kid:'test-key'}))+'.'+b64(JSON.stringify({sub:'existing-subject',email,email_verified:true,name:'Master',aud:'test-client',iss,nonce:'test-nonce',exp:Math.floor(Date.now()/1000)+300}));
 return body+'.'+b64(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',pair.privateKey,Buffer.from(body)));
}
function fixture({email=master,adminEmail=master,provider='microsoft',consumed=1,role='admin',linked=true}={}){
 const writes=[];
 const DB={batch:async()=>[],prepare:sql=>({bind:(...args)=>({first:async()=>{
  if(sql.startsWith('SELECT * FROM social_auth_states'))return {purpose:'login',nonce:'test-nonce',code_verifier:'test-verifier'};
  if(sql.startsWith('SELECT user_id FROM social_identities'))return linked?{user_id:'existing-user'}:null;
  if(sql.startsWith('SELECT id,email,role'))return {id:'existing-user',email,role};
  if(sql.startsWith('SELECT t.user_id'))return {user_id:'existing-user',email,role,provider};
  if(sql.startsWith('SELECT u.id AS user_id'))return {user_id:'existing-user',user_email:email,user_role:role,company_id:'existing-company'};
  return null;
 },run:async()=>{writes.push({sql,args});return {meta:{changes:sql.startsWith('UPDATE social_login_tickets')?consumed:1}};}})})};
 return {writes,env:{DB,ADMIN_EMAIL:adminEmail,PUBLIC_APP_ORIGIN:'https://carrier.example.com',...Object.fromEntries(['google','apple','microsoft'].flatMap(p=>[[`SOCIAL_${p.toUpperCase()}_CLIENT_ID`,'test-client'],[`SOCIAL_${p.toUpperCase()}_CLIENT_SECRET`,'test-secret']]))}};
}
for(const provider of ['google','apple','microsoft'])test(`${provider} callback links only the existing master account`,async()=>{
 const f=fixture();const jwt=await signed(provider);const original=globalThis.fetch;
 globalThis.fetch=async url=>new Response(JSON.stringify(String(url).includes('keys')||String(url).includes('certs')?{keys:[jwk]}:{id_token:jwt}));
 try{
  const r=await handleSocialAuth(new Request(`${origin}/auth/social/${provider}/callback?code=test&state=test`),f.env,{});
  assert.equal(r.status,302);assert.ok(r.headers.get('location').startsWith('https://carrier.example.com/auth?social_ticket='));
  const linked=f.writes.find(w=>w.sql.startsWith('INSERT INTO social_identities'));assert.equal(linked.args[2],'existing-user');
  assert.ok(!f.writes.some(w=>/INSERT INTO users|UPDATE users/.test(w.sql)));
 }finally{globalThis.fetch=original;}
});
for(const [provider,email,adminEmail,consumed,status] of [['google',master,master,1,201],['apple',master,master,1,201],['microsoft',master,master,1,201],['unknown',master,master,1,403],['microsoft','other@example.com',master,1,403],['microsoft',master,'',1,403],['microsoft',master,master,0,401]])test(`ticket gate ${provider}/${email}/${adminEmail||'unconfigured'}/${consumed}`,async()=>{
 const f=fixture({provider,email,adminEmail,consumed});const r=await handleSocialAuth(new Request(`${origin}/auth/social/exchange`,{method:'POST',body:JSON.stringify({ticket:'test-ticket'})}),f.env,{});
 assert.equal(r.status,status);if(status===201){const body=await r.json();assert.equal(body.user.role,'admin');assert.equal(body.user.id,'existing-user');}else assert.ok(!f.writes.some(w=>w.sql.startsWith('INSERT INTO sessions')));
});
test('asynchronous callback failure returns a controlled error redirect',async()=>{
 const f=fixture();const original=globalThis.fetch;globalThis.fetch=async()=>new Response(JSON.stringify({error:'invalid_grant'}),{status:400});
 try{const r=await handleSocialAuth(new Request(`${origin}/auth/social/microsoft/callback?code=test&state=test`),f.env,{});assert.equal(r.status,302);assert.equal(new URL(r.headers.get('location')).searchParams.get('social_error'),'invalid_grant');}finally{globalThis.fetch=original;}
});

test('Microsoft cannot obtain master access through an email match alone',async()=>{
 const f=fixture({linked:false});const jwt=await signed('microsoft');const original=globalThis.fetch;globalThis.fetch=async url=>new Response(JSON.stringify(String(url).includes('keys')?{keys:[jwk]}:{id_token:jwt}));
 try{const r=await handleSocialAuth(new Request(`${origin}/auth/social/microsoft/callback?code=test&state=test`),f.env,{});assert.equal(r.status,302);assert.match(new URL(r.headers.get('location')).searchParams.get('social_error'),/not linked/);assert.ok(!f.writes.some(w=>w.sql.startsWith('INSERT INTO social_login_tickets')));}finally{globalThis.fetch=original;}
});

for (const provider of ['google','microsoft']) test(`${provider} start uses its registered callback`,async()=>{
 const f=fixture(); f.env.DB.prepare=sql=>({run:async()=>({}),bind:(...args)=>({run:async()=>({})})});
 const r=await handleSocialAuth(new Request(`${origin}/auth/social/${provider}/start`),f.env,{});
 assert.equal(r.status,302);
 const target=new URL(r.headers.get('location'));
 assert.equal(target.searchParams.get('redirect_uri'),`${origin}/${provider==='google'?'api/':''}auth/social/${provider}/callback`);
 assert.equal(target.searchParams.get('code_challenge_method'),'S256');
});
test('registered Google API callback exchanges the same redirect URI',async()=>{
 const f=fixture();const jwt=await signed('google');const original=globalThis.fetch;let redirect;
 globalThis.fetch=async (url,options)=>{if(String(url).includes('token'))redirect=options.body.get('redirect_uri');return new Response(JSON.stringify(String(url).includes('certs')?{keys:[jwk]}:{id_token:jwt}));};
 try{const r=await handleSocialAuth(new Request(`${origin}/api/auth/social/google/callback?code=test&state=test`),f.env,{});assert.equal(r.status,302);assert.equal(redirect,`${origin}/api/auth/social/google/callback`);assert.ok(r.headers.get('location').includes('social_ticket='));}finally{globalThis.fetch=original;}
});

test('Google callback reaches authentication through the full gateway',async()=>{
 const f=fixture();const jwt=await signed('google');const original=globalThis.fetch;
 globalThis.fetch=async url=>new Response(JSON.stringify(String(url).includes('certs')?{keys:[jwk]}:{id_token:jwt}));
 try{const r=await router.fetch(new Request(`${origin}/api/auth/social/google/callback?code=test&state=test`),f.env);assert.equal(r.status,302);assert.ok(r.headers.get('location').includes('social_ticket='));}finally{globalThis.fetch=original;}
});
test('operations still reject requests without a session',async()=>{
 const f=fixture();const r=await router.fetch(new Request(`${origin}/api/jobs`),f.env);assert.equal(r.status,401);assert.equal((await r.json()).error,'Unauthorized.');
});
