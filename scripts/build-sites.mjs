import {cp,mkdir,rm,writeFile} from 'node:fs/promises';
import {join} from 'node:path';

const root=process.cwd();
const dist=join(root,'dist');
await rm(dist,{recursive:true,force:true});
await mkdir(join(dist,'server'),{recursive:true});
await cp(join(root,'out'),dist,{recursive:true});
await writeFile(join(dist,'server','index.js'),`export default {async fetch(request,env){const url=new URL(request.url);let response=await env.ASSETS.fetch(request);if(response.status===404&&!url.pathname.includes('.')){url.pathname='/index.html';response=await env.ASSETS.fetch(new Request(url,request))}return response}};\n`);
