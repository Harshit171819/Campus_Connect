// Vercel function: proxy to Render without exposing credentials or requiring CORS.
module.exports = async function handler(request, response) {
  const jsonError=(status,error)=>{response.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});response.end(JSON.stringify({error}));};
  let backend;
  try {
    backend=new URL(process.env.BACKEND_URL);
    if(backend.protocol!=='https:'||backend.username||backend.password||backend.pathname!=='/'||backend.search||backend.hash)throw new Error();
  } catch {
    return jsonError(503,'Set BACKEND_URL in Vercel to your Render HTTPS URL, without /api, then redeploy.');
  }
  const route=Array.isArray(request.query?.route)?request.query.route.join('/'):String(request.query?.route||'');
  if(!route||!/^[a-zA-Z0-9_/-]+$/.test(route))return jsonError(400,'Invalid API route.');
  const target=new URL('/api/'+route,backend);
  for(const [name,values] of Object.entries(request.query||{})) {
    if(name==='route')continue;
    for(const value of Array.isArray(values)?values:[values])target.searchParams.append(name,String(value));
  }
  const headers={'Content-Type':'application/json','X-Role':request.headers['x-role']||'student'};
  if(request.headers['x-user-id'])headers['X-User-Id']=request.headers['x-user-id'];
  if(request.headers.authorization)headers.Authorization=request.headers.authorization;
  const method=request.method||'GET';
  const body=['GET','HEAD'].includes(method)?undefined:typeof request.body==='string'||Buffer.isBuffer(request.body)?request.body:JSON.stringify(request.body||{});
  try {
    const upstream=await fetch(target,{method,headers,body,redirect:'error',signal:AbortSignal.timeout(11000)});
    const content=await upstream.text();
    response.writeHead(upstream.status,{'Content-Type':upstream.headers.get('content-type')||'application/json','Cache-Control':'no-store'});
    response.end(content);
  } catch(error) {
    return jsonError(502,error.name==='TimeoutError'?'The Render backend is taking too long. Please retry.':'Cannot reach the Render backend. Check BACKEND_URL and the Render service logs.');
  }
};
