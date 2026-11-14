const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function setup(fetch){
 const elements=new Map();
 const element=s=>{if(!elements.has(s))elements.set(s,{innerHTML:'',textContent:'',value:'',style:{},classList:{toggle(){}},addEventListener(){},close(){}});return elements.get(s)};
 const context=vm.createContext({console,Date,JSON,URL,Blob,AbortSignal,FormData:class {constructor(form){this.values=form.values}get(key){return this.values[key]}},encodeURIComponent,Number,String,Set,Infinity,location:{hash:'#explore'},localStorage:{getItem(){return null},setItem(){}},document:{querySelector:element,querySelectorAll(){return []},addEventListener(){}},window:{addEventListener(){}},setTimeout:()=>1,clearTimeout(){},fetch});
 let source=fs.readFileSync(require('node:path').join(__dirname,'../app.js'),'utf8');source=source.slice(0,source.lastIndexOf("\nif(page()!=='people')"));vm.runInContext(source,context);
 return {context,element};
}
const response=data=>({ok:true,json:async()=>({users:[],...data})});
const event={id:'event1',title:'Live campus event',organizer_id:'organizer1'};
test('events render before delayed session and registrations finish',async()=>{
 const pending=[];
 const {context,element}=setup(async path=>path.startsWith('/api/events')?response({events:[event]}):path==='/api/users'?response({users:[]}):new Promise(resolve=>pending.push(()=>resolve(response(path==='/api/session'?{user:{id:'student1'}}:{registrations:[]})))));
 const render=vm.runInContext('render()',context);
 await new Promise(resolve=>setImmediate(resolve));
 assert.match(element('#events-grid').innerHTML,/Live campus event/);
 assert.doesNotMatch(element('#page').innerHTML,/Loading campus events/);
 pending.forEach(resolve=>resolve());await render;
});
test('optional request failures leave live events visible',async()=>{
 const {context,element}=setup(async path=>{if(path.startsWith('/api/events'))return response({events:[event]});throw new Error('connection lost')});
 await vm.runInContext('render()',context);
 assert.match(element('#events-grid').innerHTML,/Live campus event/);
 assert.match(element('#toast').textContent,/Some account data/);
});
test('event timeout shows retry instead of permanent loader',async()=>{
 const {context,element}=setup(async path=>{if(path.startsWith('/api/events')){const error=new Error('timeout');error.name='TimeoutError';throw error}return response({})});
 await vm.runInContext('render()',context);
 assert.match(element('#page').innerHTML,/Try again/);
 assert.match(element('#page').innerHTML,/too long/);
});
test('requests have a deadline and preserve the selected role',async()=>{
 let captured;
 const {context}=setup(async(path,options)=>{captured=options;return response({})});
 await vm.runInContext("state.mode='organizer';api('/api/session')",context);
 assert.equal(captured.headers['X-Role'],'organizer');assert.ok(captured.signal);
});

test('people page displays students and organizers and selector keeps selected user',()=>{
 const {context,element}=setup(async()=>response({}));
 vm.runInContext(`state.users=[{id:'student1',email:'student@example.com',role:'student'},{id:'organizer1',email:'organizer@example.com',role:'organizer'}];people();syncUserSelector()`,context);
 assert.match(element('#page').innerHTML,/student@example.com/);
 assert.match(element('#page').innerHTML,/organizer@example.com/);
 assert.match(element('#page').innerHTML,/data-use-user="student1"/);
 assert.match(element('#active-user').innerHTML,/student@example.com/);
 assert.doesNotMatch(element('#active-user').innerHTML,/organizer@example.com/);
});

test('organizer form has title and capacity fields',()=>{
 const {context,element}=setup(async()=>response({}));
 vm.runInContext("state.mode='organizer';state.user={id:'o1'};state.users=[{id:'o1',email:'organizer@example.com'}];createEventPage()",context);
 assert.match(element('#page').innerHTML,/name="title"/);
 assert.match(element('#page').innerHTML,/name="capacity"/);
 assert.match(element('#page').innerHTML,/organizer@example.com/);
});
test('creation submits to backend with the selected organizer',async()=>{
 let captured;const {context}=setup(async(path,options)=>{captured={path,options};return response({event:{id:'new-event'}})});
 const button={disabled:false,textContent:''};const error={textContent:''};
 context.event={preventDefault(){},currentTarget:{values:{title:'  Coding Workshop  ',capacity:'30',starts_at:'2027-01-01T10:00'},querySelector(selector){return selector==='.form-error'?error:button}}};
 await vm.runInContext("state.mode='organizer';state.user={id:'owner'};submitEvent(event)",context);
 assert.equal(captured.path,'/api/events');assert.equal(captured.options.method,'POST');
 assert.equal(captured.options.headers['X-User-Id'],'owner');
 assert.deepEqual(JSON.parse(captured.options.body),{title:'Coding Workshop',capacity:30,starts_at:new Date('2027-01-01T10:00').toISOString()});
 assert.equal(context.location.hash,'manage');assert.equal(button.disabled,false);
});

test('repeated page navigation reuses loaded data without API requests',async()=>{
 let calls=0;
 const {context}=setup(async path=>{calls++;return response(path.startsWith('/api/events')?{events:[event]}:path==='/api/users'?{users:[{id:'s1',role:'student',email:'a@example.com'}]}:{registrations:[]})});
 await vm.runInContext('render()',context);assert.equal(calls,3);
 context.location.hash='#registrations';await vm.runInContext('render()',context);
 context.location.hash='#explore';await vm.runInContext('render()',context);
 assert.equal(calls,3);
});
test('simultaneous identical GET requests share one network call',async()=>{
 let calls=0;const {context}=setup(async()=>{calls++;return response({users:[]})});
 await vm.runInContext("Promise.all([api('/api/users'),api('/api/users')])",context);
 assert.equal(calls,1);
});
test('writes invalidate GET caches',async()=>{
 let calls=0;const {context}=setup(async()=>{calls++;return response({users:[],user:{id:'s1'}})});
 await vm.runInContext("api('/api/users')",context);
 await vm.runInContext("api('/api/users',{method:'POST',body:'{}'})",context);
 await vm.runInContext("api('/api/users')",context);assert.equal(calls,3);
});
test('only organizer directory displays student management actions',()=>{
 const {context,element}=setup(async()=>response({}));
 vm.runInContext("state.users=[{id:'s1',email:'student@example.com',role:'student'}];state.mode='organizer';people()",context);
 assert.match(element('#page').innerHTML,/Add Student/);assert.match(element('#page').innerHTML,/Make organizer/);
 vm.runInContext("state.mode='student';people()",context);
 assert.doesNotMatch(element('#page').innerHTML,/Add Student/);assert.doesNotMatch(element('#page').innerHTML,/Make organizer/);
});
test('successful promotion updates the directory immediately',async()=>{
 const {context,element}=setup(async()=>response({user:{id:'s1',email:'student@example.com',role:'organizer'}}));
 context.button={disabled:false,textContent:''};
 await vm.runInContext("state.mode='organizer';state.users=[{id:'s1',email:'student@example.com',role:'student'}];promoteUser('s1',button)",context);
 assert.equal(vm.runInContext("state.users[0].role",context),'organizer');
 assert.doesNotMatch(element('#page').innerHTML,/data-promote-user="s1"/);
});
