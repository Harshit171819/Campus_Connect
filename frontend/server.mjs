import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
const root=path.dirname(fileURLToPath(import.meta.url));
const env={...process.env};
try { for(const line of (await readFile(path.join(root,'../Backend/.env'),'utf8')).split(/\r?\n/)){const match=line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);if(match&&!env[match[1]])env[match[1]]=match[2].replace(/^['"]|['"]$/g,'');} } catch {}
const backend=env.BACKEND_URL||'http://127.0.0.1:5000';
const types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.webp':'image/webp','.woff2':'font/woff2'};
const files=new Map();
http.createServer(async(req,res)=>{
 try {
  const url=new URL(req.url,'http://localhost');
  if(url.pathname.startsWith('/api/')){
   const target=backend+url.pathname+url.search;
   const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>65536){res.writeHead(413);return res.end();}chunks.push(chunk);}
   const headers={'Content-Type':'application/json'};
   headers['X-Role']=req.headers['x-role']||'student';
   if(req.headers['x-user-id'])headers['X-User-Id']=req.headers['x-user-id'];
   const upstream=await fetch(target,{method:req.method,headers,body:['GET','HEAD'].includes(req.method)?undefined:Buffer.concat(chunks),signal:AbortSignal.timeout(10000)});
   res.writeHead(upstream.status,{'Content-Type':'application/json','Cache-Control':'no-store'});return res.end(await upstream.text());
  }
  const filename=url.pathname==='/'?'index.html':url.pathname.slice(1);
  if(!['index.html','styles.css','app.js','reference-images.json'].includes(filename)&&!/^assets\/(event-\d+\.webp|inter\.woff2|jakarta\.woff2)$/.test(filename)){res.writeHead(404);return res.end('Not found');}
  if(!files.has(filename)){
   const data=await readFile(path.join(root,filename));
   files.set(filename,{data,gzip:data.length>1024?gzipSync(data):null,etag:'"'+createHash('sha256').update(data).digest('hex').slice(0,16)+'"'});
  }
  const file=files.get(filename);
  const headers={'Content-Type':types[path.extname(filename)]||'application/octet-stream','Cache-Control':filename==='index.html'?'no-store':filename.startsWith('assets/')?'public, max-age=86400':'no-cache','ETag':file.etag,'Vary':'Accept-Encoding'};
  if(req.headers['if-none-match']===file.etag){res.writeHead(304,headers);return res.end();}
  const compressed=file.gzip&&/gzip/.test(req.headers['accept-encoding']||'')&&!filename.startsWith('assets/');
  if(compressed)headers['Content-Encoding']='gzip';
  res.writeHead(200,headers);res.end(compressed?file.gzip:file.data);
 }catch(error){res.writeHead(502,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'Cannot reach the backend. Start Backend/app.py and try again.'}));}
}).listen(Number(env.PORT||3000),'127.0.0.1',()=>console.log('Campus Connect: http://localhost:'+(env.PORT||3000)));
