const {test}=require('node:test');
const assert=require('node:assert/strict');
const handler=require('../api/proxy.js');

function response(){return {status:0,headers:{},body:'',writeHead(status,headers){this.status=status;this.headers=headers;},end(body){this.body=body;}};}

test('Vercel proxy forwards role, selected user, and pagination to Render',async t=>{
  const originalFetch=global.fetch;const originalUrl=process.env.BACKEND_URL;
  t.after(()=>{global.fetch=originalFetch;if(originalUrl===undefined)delete process.env.BACKEND_URL;else process.env.BACKEND_URL=originalUrl;});
  process.env.BACKEND_URL='https://campus-test.onrender.com';let forwarded;
  global.fetch=async(url,options)=>{forwarded={url:String(url),options};return new Response(JSON.stringify({events:[]}),{headers:{'Content-Type':'application/json'}});};
  const res=response();await handler({method:'GET',query:{route:'events',limit:'100',offset:'0'},headers:{'x-role':'organizer','x-user-id':'user1'}},res);
  assert.equal(forwarded.url,'https://campus-test.onrender.com/api/events?limit=100&offset=0');
  assert.equal(forwarded.options.headers['X-Role'],'organizer');assert.equal(forwarded.options.headers['X-User-Id'],'user1');assert.equal(res.status,200);
});

test('Vercel proxy forwards writes and preserves database response status',async t=>{
  const originalFetch=global.fetch;const originalUrl=process.env.BACKEND_URL;
  t.after(()=>{global.fetch=originalFetch;if(originalUrl===undefined)delete process.env.BACKEND_URL;else process.env.BACKEND_URL=originalUrl;});
  process.env.BACKEND_URL='https://campus-test.onrender.com';let forwarded;
  global.fetch=async(url,options)=>{forwarded=options;return new Response(JSON.stringify({event:{id:'e1'}}),{status:201});};
  const res=response();await handler({method:'POST',query:{route:'events'},headers:{'x-role':'organizer'},body:{title:'Workshop',capacity:20}},res);
  assert.equal(forwarded.method,'POST');assert.deepEqual(JSON.parse(forwarded.body),{title:'Workshop',capacity:20});assert.equal(res.status,201);
});

test('Vercel proxy reports missing backend URL without forwarding',async t=>{
  const originalUrl=process.env.BACKEND_URL;t.after(()=>{if(originalUrl===undefined)delete process.env.BACKEND_URL;else process.env.BACKEND_URL=originalUrl;});
  delete process.env.BACKEND_URL;const res=response();await handler({method:'GET',query:{route:'events'},headers:{}},res);
  assert.equal(res.status,503);assert.match(JSON.parse(res.body).error,/BACKEND_URL/);
});
