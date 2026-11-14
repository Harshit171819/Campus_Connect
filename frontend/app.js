const $=s=>document.querySelector(s);
const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const state={mode:'student',demo:false,events:[],registrations:[],category:'All Categories',search:'',sort:'date',images:[],users:[],user:null,selectedUsers:JSON.parse(localStorage.getItem('campus-selected-users')||'{}'),demoRegistrations:[],request:0,loadedAt:0};
const categories=['All Categories','Tech & Coding','Career Fairs','UX & Design','Arts & Music','Wellness & Health','Academic & Research'];
const sample=[['Python Workshop: Data Science & AI','Tech & Coding','ACM & AI Society','Gates CS 104','Hands-on learning with Python, data visualization, and machine learning. Bring your laptop and your curiosity.'],['Spring Engineering Career Fair','Career Fairs','University Career Center','Student Union','Meet innovative teams, explore internships, and connect with your next opportunity.'],['Campus Hackathon: Future of AI','Tech & Coding','Campus Hacker Club','Engineering Center','Build something extraordinary with a team of creators during a weekend of ideas and experimentation.'],['UX/UI Design Sprint: Design Systems','UX & Design','Design Collective','Design Studio 2','Create thoughtful interfaces, explore design systems, and learn alongside other campus creatives.'],['University Spring Jazz Showcase','Arts & Music','Music Ensemble','Concert Hall','An evening of big band classics and modern jazz compositions performed by campus musicians.'],['Cloud Computing with AWS Bootcamp','Tech & Coding','Cloud Student Chapter','Learning Auditorium','Explore cloud architecture and build your first deployment in this practical workshop.'],['Mental Health & Mindfulness Summit','Wellness & Health','Campus Wellness Network','Wellness Garden','Make space to breathe, practice mindfulness, and build healthy habits with your campus community.'],['Undergraduate Research Symposium','Academic & Research','Student Research Association','Research Hall','Discover student projects, share ideas, and connect with the next generation of researchers.']];
const demoEvents=()=>sample.map((s,i)=>({id:'demo-'+i,title:s[0],category:s[1],organizer:s[2],location:s[3],description:s[4],starts_at:new Date(Date.now()+(i+2)*86400000).toISOString(),organizer_id:'demo-organizer',image:state.images[i+2]?.src}));
function toast(message){$('#toast').textContent=message;$('#toast').style.display='block';clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').style.display='none',4500)}
const requestCache=new Map();
let cacheVersion=0;
function changed(){state.request++;requestCache.clear();cacheVersion++;localStorage.setItem('campus-data-changed',String(Date.now()))}
async function api(path,options={}){
 const role=state.mode;
 const headers={'Content-Type':'application/json','X-Role':role,...(state.selectedUsers[role]?{'X-User-Id':state.selectedUsers[role]}:{}),...options.headers};
 const read=!options.method||options.method==='GET';
 const shared=path==='/api/users'||path.startsWith('/api/events?');
 const key=path+(shared?'':JSON.stringify(headers));
 const existing=requestCache.get(key);
 if(read&&existing&&existing.until>Date.now())return existing.promise;
 const version=cacheVersion;
 const promise=(async()=>{
  const response=await fetch(path,{...options,signal:options.signal||AbortSignal.timeout(12000),headers});
  const data=await response.json();
  if(!response.ok)throw new Error(data.error||'Request failed. Please try again.');
  if(!read)changed();
  return data;
 })();
 if(read){requestCache.set(key,{promise,until:Date.now()+5000});promise.catch(()=>{if(version===cacheVersion)requestCache.delete(key)})}
 return promise;
}

function page(){return location.hash.slice(1)||'explore'}
function nav(){syncUserSelector();const links=state.mode==='student'?[['explore','Explore Events','&#9672;'],['registrations','My Registrations','&#9643;'],['people','Students & Organizers','&#9823;']]:[['dashboard','Dashboard','&#9638;'],['manage','Manage Events','&#9635;'],['create','Create Event','&#43;'],['participants','Participants','&#9823;'],['people','Students & Organizers','&#9823;']];$('#navigation').innerHTML=links.map(([key,label,icon])=>`<a href="#${key}" class="${page()===key?'active':''}"><span>${icon}</span>${label}</a>`).join('');$('.context .pill').textContent='\u2022 '+(state.mode==='student'?'Student space':'Organizer space');document.querySelectorAll('[data-mode]').forEach(b=>(b.classList.toggle('selected',b.dataset.mode===state.mode),b.setAttribute('aria-pressed',String(b.dataset.mode===state.mode))))}
function syncUserSelector(){
 const select=$('#active-user');if(!select)return;
 const users=state.users.filter(user=>user.role===state.mode);
 select.innerHTML=users.length?users.map(user=>`<option value="${escapeHTML(user.id)}">${escapeHTML(user.email||user.id)}</option>`).join(''):'<option value="">Loading users...</option>';
 select.value=state.selectedUsers[state.mode]||state.user?.id||users[0]?.id||'';
 select.disabled=!users.length;
}
function people(){
 const students=state.users.filter(user=>user.role==='student');
 const organizers=state.users.filter(user=>user.role==='organizer');
 const section=(title,users)=>`<div class="section-heading"><h2>${title}</h2><span>${users.length} users</span></div>`+(users.length?`<div class="grid people-grid">${users.map(user=>`<article class="person-card"><span class="person-avatar">${escapeHTML((user.email||'U')[0].toUpperCase())}</span><div><h3>${escapeHTML(user.email||'Campus user')}</h3><span class="tag">${escapeHTML(user.role)}</span><p class="person-id">${escapeHTML(user.id)}</p></div>${state.mode==='organizer'&&user.role==='student'?`<button class="btn" data-promote-user="${escapeHTML(user.id)}">Make organizer</button>`:''}<button class="btn secondary" data-use-user="${escapeHTML(user.id)}" data-user-role="${escapeHTML(user.role)}">Use this ${escapeHTML(user.role)}</button></article>`).join('')}</div>`:empty('No '+title.toLowerCase()+' found','No users of this role were returned by the database.'));
 $('#page').innerHTML=banner()+heading('Students & Organizers','People from your database. Select a user to see their registrations or organized events.',state.mode==='organizer'?'<button class="btn" id="add-student">+ Add Student</button>':'')+section('Students',students)+section('Organizers',organizers);
}
function addStudent(){
 $('#modal-body').innerHTML='<h2>Add a Student</h2><p class="subtitle">Create a student record in your database. You can promote them to organizer afterward.</p><form id="student-form"><label>Email address<input name="email" type="email" required maxlength="254" placeholder="student@university.edu"></label><p class="form-error" role="alert"></p><button class="btn" type="submit">Create Student</button></form>';
 $('#modal').showModal();
 $('#student-form').addEventListener('submit',async event=>{
  event.preventDefault();const form=event.currentTarget;const button=form.querySelector('button');const error=form.querySelector('.form-error');button.disabled=true;error.textContent='';
  try{
   const email=String(new FormData(form).get('email')||'').trim();
   const data=await api('/api/users',{method:'POST',body:JSON.stringify({email})});
   state.users.push(data.user);state.loadedAt=Date.now();$('#modal').close();people();nav();toast('Student saved to the database.');
  }catch(failure){error.textContent=failure.message}finally{button.disabled=false}
 });
}
async function promoteUser(id,button){
 button.disabled=true;button.textContent='Saving...';
 try{
  const data=await api('/api/users/'+encodeURIComponent(id)+'/role',{method:'PATCH',body:JSON.stringify({role:'organizer'})});
  state.users=state.users.map(user=>user.id===id?data.user:user);
  if(state.selectedUsers.student===id){delete state.selectedUsers.student;localStorage.setItem('campus-selected-users',JSON.stringify(state.selectedUsers))}
  state.loadedAt=Date.now();people();nav();toast('Student is now an organizer.');
 }catch(failure){toast(failure.message);button.disabled=false;button.textContent='Make organizer'}
}
function selectUser(id,role){
 state.selectedUsers[role]=id;localStorage.setItem('campus-selected-users',JSON.stringify(state.selectedUsers));state.user=null;state.registrations=[];state.loadedAt=0;state.mode=role;
 const route=role==='student'?'registrations':'dashboard';
 if(page()===route)render();else location.hash=route;
}
function userLabel(id){const user=state.users.find(user=>String(user.id)===String(id));return user?.email||id}
function banner(){return state.demo?'<div class="demo-banner"><span><strong>Design preview</strong> · Sample events and registrations. Changes here stay in this preview.</span><button id="live-mode">Connect to live API &#8594;</button></div>':''}
function heading(title,subtitle,action=''){return `<div class="page-heading"><div><h1>${title}</h1><p class="subtitle">${subtitle}</p></div>${action}</div>`}
function stats(items){return `<div class="stats">${items.map(([label,value,note,icon])=>`<div class="stat"><div class="stat-top">${label}<span class="stat-icon">${icon}</span></div><strong>${value}</strong><small>${note}</small></div>`).join('')}</div>`}
function eventCategory(event){return event.category||'Campus Event'}
function eventImage(event){return event.image||state.images[2]?.src||''}
function date(value,options){return value&&!Number.isNaN(Date.parse(value))?new Date(value).toLocaleDateString('en-IN',options):'Date TBA'}
function isRegistered(id){return [...state.registrations,...state.demoRegistrations].some(r=>r.event_id===id)}
function card(event){const registered=isRegistered(event.id);const closed=event.status==='closed';return `<article class="event-card"><div class="cover"><img src="${escapeHTML(eventImage(event))}" alt="" loading="lazy" onerror="this.hidden=true"><div class="date-badge"><small>${escapeHTML(date(event.starts_at,{month:'short'}).toUpperCase())}</small><strong>${escapeHTML(date(event.starts_at,{day:'2-digit'}))}</strong></div><span class="tag">${escapeHTML(eventCategory(event))}</span></div><div class="card-body"><p class="organizer">&#9671; &nbsp; ${escapeHTML(event.organizer||userLabel(event.organizer_id)||'Campus community')}</p><h3>${escapeHTML(event.title)}</h3><p class="description">${escapeHTML(event.description||'Discover something new with your campus community.')}</p><div class="meta">Date: ${escapeHTML(eventTime(event.starts_at))} &nbsp; Location: ${escapeHTML(event.location||'Location to be announced')}</div><div class="card-footer"><button class="btn ${registered?'secondary':''}" data-register="${escapeHTML(event.id)}" ${registered||closed?'disabled':''}>${closed?'Event closed':registered?'&#10003; You are registered':'Register Now &nbsp; &#8594;'}</button><button class="details" data-details="${escapeHTML(event.id)}">Details</button></div></div></article>`}
function empty(title,text,button=''){return `<div class="empty"><div class="empty-icon">&#9671;</div><h2>${title}</h2><p>${text}</p>${button}</div>`}
function errorPage(message){$('#page').innerHTML=banner()+heading('Your campus is waiting','Discover events, meet your people, and make your time here count.')+empty('Let’s get connected',escapeHTML(message),'<button class="btn" id="retry">Try again</button> <button class="btn secondary" id="demo-mode">Preview the design</button>')}
function explore(){const count=state.demo?state.demoRegistrations.length:state.registrations.length;$('#page').innerHTML=banner()+heading('Explore Campus Opportunities','Discover, connect, and be part of what’s happening. Your next great experience is right here.','<a class="btn secondary" href="#registrations">&#9671; &nbsp; My registrations</a>')+stats([['Available Events',state.events.filter(event=>event.status!=='closed').length,'<span>&#10022;</span> Discover something new','&#10022;'],['Explore Your Interests',new Set(state.events.map(eventCategory)).size,'A community for every curiosity','&#10022;'],['My Registrations',count,'Your next experience awaits','&#10022;'],['Campus Community','Together','Ideas. Connections. Possibilities.','&#10022;']])+`<section class="toolbar" aria-label="Event filters"><div class="toolbar-top"><label class="search">&#9906; <input id="event-search" placeholder="Search events by title, keyword, or venue…" value="${escapeHTML(state.search)}"></label><select id="sort" aria-label="Sort events"><option value="date">Date: soonest first</option><option value="title">Title: A–Z</option></select></div><div class="filters"><span>CATEGORIES</span>${categories.map(c=>`<button class="chip ${state.category===c?'active':''}" data-category="${c}">${c}</button>`).join('')}</div></section><div class="section-heading"><span id="result-count"></span><span style="color:var(--muted);font-size:11px">Find your next memorable moment</span></div><section class="grid" id="events-grid" aria-label="Campus events"></section>`;$('#sort').value=state.sort;filterEvents()}
function filterEvents(){const filtered=state.events.filter(e=>e.status!=='closed'&&(state.category==='All Categories'||eventCategory(e)===state.category)&&[e.title,e.description,e.location,e.organizer].join(' ').toLowerCase().includes(state.search.toLowerCase()));filtered.sort(state.sort==='title'?(a,b)=>a.title.localeCompare(b.title):(a,b)=>(Date.parse(a.starts_at)||Infinity)-(Date.parse(b.starts_at)||Infinity));$('#events-grid').innerHTML=filtered.length?filtered.map(card).join(''):empty('No events found','Try a different search or category. New opportunities are on the way.');$('#result-count').textContent=filtered.length+' events to explore'}
function registrations(){const rows=state.demo?state.demoRegistrations:state.registrations;$('#page').innerHTML=banner()+heading('My Registrations','Your plans, all in one place. Make room for the experiences that matter.','<a class="btn" href="#explore">Explore events &#8594;</a>')+stats([['Confirmed',rows.length,'You’re on the list','&#10022;'],['Upcoming',rows.filter(r=>r.event?.starts_at&&Date.parse(r.event.starts_at)>Date.now()).length,'Something to look forward to','&#10022;'],['Your Community','Connected','Keep showing up','&#10022;'],['Your Next Step','Explore','There’s always more to discover','&#10022;']])+(rows.length?`<div class="grid">${rows.map(r=>card(r.event||state.events.find(e=>e.id===r.event_id)||{id:r.event_id,title:'Registered event'})).join('')}</div>`:empty('Your next experience is out there','Explore campus events and register for something that inspires you.','<a class="btn" href="#explore">Find an event &#8594;</a>'))}
function ownedEvents(){return state.demo?state.events:state.events.filter(e=>e.organizer_id===state.user?.id)}
function eventTime(value){return value&&Number.isFinite(Date.parse(value))?new Date(value).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'}):'Date not set'}
function localDateInput(value){if(!value||!Number.isFinite(Date.parse(value)))return '';const date=new Date(value);return new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16)}
function organizer(){
 const events=ownedEvents();const dashboard=page()==='dashboard';
 $('#page').innerHTML=banner()+heading(dashboard?'Welcome to your organizer space':'Manage Events','Set event dates, manage registrations, and choose what students can discover.','<a class="btn" href="#create">+ Create Event</a>')+stats([['Your Events',events.length,'Your campus community','&#10022;'],['Open Events',events.filter(event=>event.status!=='closed').length,'Visible to students','&#10022;'],['Closed Events',events.filter(event=>event.status==='closed').length,'Hidden from student discovery','&#10022;'],['Your Role','Organizer','Bringing campus together','&#10022;']])+`<div class="section-heading"><h2>Your events</h2><span>${events.length} events</span></div>`+(events.length?`<div class="table-wrap"><table><thead><tr><th>EVENT</th><th>DATE & TIME</th><th>CAPACITY</th><th>STATUS</th><th>ACTIONS</th></tr></thead><tbody>${events.map(event=>`<tr><td><strong>${escapeHTML(event.title)}</strong><small>${escapeHTML(eventCategory(event))}</small></td><td><div class="event-date-editor"><input id="date-${escapeHTML(event.id)}" aria-label="Date and time for ${escapeHTML(event.title)}" type="datetime-local" value="${localDateInput(event.starts_at)}"><button class="btn secondary" data-set-date="${escapeHTML(event.id)}">Save date</button></div><small>${escapeHTML(eventTime(event.starts_at))}</small></td><td>${escapeHTML(event.capacity??'Not specified')} places</td><td><span class="status ${event.status==='closed'?'closed':''}">${event.status==='closed'?'Closed':'Open'}</span></td><td><div class="event-actions"><button class="btn ${event.status==='closed'?'':'secondary'}" data-toggle-event="${escapeHTML(event.id)}" data-next-status="${event.status==='closed'?'upcoming':'closed'}">${event.status==='closed'?'Open event':'Close event'}</button><button class="btn secondary" data-participants="${escapeHTML(event.id)}">View participants</button></div></td></tr>`).join('')}</tbody></table></div>`:empty('Your event story starts here','Create your first event and bring your campus community together.','<a class="btn" href="#create">+ Create Event</a>'));
}
async function updateEvent(id,updates,button){
 button.disabled=true;const label=button.textContent;button.textContent='Saving...';
 try{
  const data=await api('/api/events/'+encodeURIComponent(id),{method:'PATCH',body:JSON.stringify(updates)});
  state.events=state.events.map(event=>event.id===id?data.event:event);
  state.registrations=state.registrations.map(registration=>registration.event_id===id?{...registration,event:data.event}:registration);
  state.loadedAt=Date.now();organizer();nav();
  toast(updates.status==='closed'?'Event closed and hidden from student discovery.':updates.status==='upcoming'?'Event opened and visible to students.':'Event date saved to the database.');
 }catch(error){toast(error.message);button.disabled=false;button.textContent=label}
}
function saveEventDate(id,button){
 const value=$('#date-'+id).value;
 if(!value||!Number.isFinite(Date.parse(value))){toast('Choose an event date and time.');return}
 return updateEvent(id,{starts_at:new Date(value).toISOString()},button);
}

function createEventPage(){
 const organizer=state.users.find(user=>user.id===state.user?.id);
 $('#page').innerHTML=heading('Create an Event','Bring your campus together. Add the details below to publish your event.')+`<section class="create-panel"><div class="create-intro"><span class="pill">ORGANIZER SPACE</span><h2>Make something happen.</h2><p>Give your event a clear title and set the number of available places.</p><p>Creating as <strong>${escapeHTML(organizer?.email||'selected organizer')}</strong></p></div><form id="create-event-form"><label>Event title<input name="title" required maxlength="200" placeholder="e.g. Campus Coding Workshop"></label><label>Capacity<input name="capacity" type="number" required min="1" max="2147483647" step="1" placeholder="e.g. 50"></label><label>Event date &amp; time<input name="starts_at" type="datetime-local" required></label><p class="create-hint">Times use your device timezone. New events are published as Upcoming and appear in student event discovery.</p><p class="form-error" role="alert"></p><div class="form-actions"><a class="btn secondary" href="#manage">Cancel</a><button class="btn" type="submit">Create Event</button></div></form></section>`;
 $('#create-event-form').addEventListener('submit',submitEvent);
}
async function submitEvent(event){
 event.preventDefault();const form=event.currentTarget;const button=form.querySelector('button[type="submit"]');const error=form.querySelector('.form-error');
 const values=new FormData(form);const selectedDate=values.get('starts_at');const payload={title:String(values.get('title')||'').trim(),capacity:Number(values.get('capacity'))};
 if(!payload.title||!Number.isInteger(payload.capacity)||payload.capacity<1){error.textContent='Enter a title and a positive whole-number capacity.';return}
 if(!selectedDate||!Number.isFinite(Date.parse(selectedDate))){error.textContent='Choose an event date and time.';return}
 payload.starts_at=new Date(selectedDate).toISOString();
 button.disabled=true;button.textContent='Creating event...';error.textContent='';
 try{
  if(state.demo){error.textContent='Switch to live mode to create an event in your database.';return}
  const headers={'X-Role':'organizer',...(state.user?.id?{'X-User-Id':state.user.id}:{})};
  const data=await api('/api/events',{method:'POST',headers,body:JSON.stringify(payload)});
  state.events=[data.event,...state.events.filter(event=>event.id!==data.event.id)];state.loadedAt=Date.now();
  toast('Event created successfully. Students can now see it.');location.hash='manage';
 }catch(failure){error.textContent=failure.message||'Could not create the event. Please retry.'}
 finally{button.disabled=false;button.textContent='Create Event'}
}
async function participants(eventId){const events=ownedEvents();$('#page').innerHTML=banner()+heading('Event Participants','A closer look at the people who make your events possible.')+(`<div class="toolbar"><label for="participant-event">Select your event &nbsp;</label><select id="participant-event"><option value="">Choose an event</option>${events.map(e=>`<option value="${escapeHTML(e.id)}">${escapeHTML(e.title)}</option>`).join('')}</select></div><section id="participant-list">${empty('Every great event starts with people','Select an event to view its registrations.')}</section>`);if(eventId){$('#participant-event').value=eventId;await loadParticipants(eventId)}}
async function loadParticipants(id){if(!id)return;$('#participant-list').innerHTML='<div class="loading">Loading participants…</div>';try{const rows=state.demo?state.demoRegistrations.filter(r=>r.event_id===id):(await api('/api/events/'+encodeURIComponent(id)+'/registrations')).registrations;if(page()!=='participants')return;$('#participant-list').innerHTML=rows.length?`<div class="section-heading"><h2>${rows.length} registered participants</h2><button class="btn secondary" id="export-csv">Export CSV &#8595;</button></div><div class="table-wrap"><table><thead><tr><th>USER ID</th><th>REGISTERED</th><th>STATUS</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${escapeHTML(userLabel(r.user_id))}<small>${escapeHTML(r.user_id)}</small></td><td>${escapeHTML(date(r.created_at,{day:'numeric',month:'short',year:'numeric'}))}</td><td><span class="status">Confirmed</span></td></tr>`).join('')}</tbody></table></div>`:empty('No registrations yet','Share your event and invite your community.');const exportButton=$('#export-csv');if(exportButton)exportButton.onclick=()=>{const csv=['User ID,Registration ID,Registered at',...rows.map(r=>[r.user_id,r.id,r.created_at].map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(','))].join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));const a=document.createElement('a');a.href=url;a.download='participants.csv';a.click();URL.revokeObjectURL(url)}}catch(error){if($('#participant-list'))$('#participant-list').innerHTML=empty('Unable to load participants',escapeHTML(error.message))}}
function paintPage(){nav();const route=page();if(route==='create')createEventPage();else if(route==='people')people();else if(route==='registrations')registrations();else if(['dashboard','manage'].includes(route))organizer();else if(route==='participants')participants();else explore()}
async function render(refresh=false){
 const current=++state.request;
 const role=state.mode;
 const active=()=>current===state.request;
 if(state.demo){state.events=demoEvents();state.registrations=[];paintPage();return}
 if(state.loadedAt){
  state.user=state.users.find(user=>user.role===role&&(!state.selectedUsers[role]||user.id===state.selectedUsers[role]))||null;
  paintPage();
  if(!refresh&&Date.now()-state.loadedAt<10000)return;
 }else $('#page').innerHTML='<div class="loading" role="status">Loading campus events...</div>';
 try{
  const usersTask=api('/api/users').then(data=>{
   if(!active())return;
   state.users=data.users;
   state.user=state.users.find(user=>user.role===role&&(!state.selectedUsers[role]||user.id===state.selectedUsers[role]))||null;
   if(!state.user&&state.selectedUsers[role]){delete state.selectedUsers[role];localStorage.setItem('campus-selected-users',JSON.stringify(state.selectedUsers));state.user=state.users.find(user=>user.role===role)||null}
   if(state.user){state.selectedUsers[role]=state.user.id}
   syncUserSelector();
  });
  const eventsTask=(async()=>{
   const events=[];
   for(let offset=0;;offset+=100){const data=await api((role==='organizer'?'/api/organizer/events?':'/api/events?')+'limit=100&offset='+offset);if(!active())return;events.push(...data.events);if(data.events.length<100)break}
   state.events=events;
   if(page()==='explore')paintPage();
  })();
  const results=await Promise.allSettled([usersTask,eventsTask]);
  if(!active())return;
  const usersError=results[0].status==='rejected'?results[0].reason:null;
  const eventsError=results[1].status==='rejected'?results[1].reason:null;
  if(eventsError)throw eventsError;
  if(usersError&&page()!=='explore')throw usersError;
  if(!usersError&&role==='student'){
   try{const data=await api('/api/me/registrations');if(!active())return;state.registrations=data.registrations}
   catch(error){if(page()==='registrations')throw error;toast('Events loaded. Registrations could not load. Please retry.')}
  }else if(role!=='student')state.registrations=[];
  state.loadedAt=Date.now();paintPage();
  if(usersError)toast('Events loaded. Some account data could not load. Please retry.');
 }catch(error){if(active()){if(state.loadedAt)toast(error.message);else errorPage(error.name==='TimeoutError'?'The backend took too long to respond. Check your connection and try again.':error.message)}}
}

async function register(id,button){if(state.mode!=='student'){toast('Switch to Student mode to register.');return}button.disabled=true;try{if(state.demo){state.demoRegistrations.push({id:crypto.randomUUID(),event_id:id,user_id:'Preview student',created_at:new Date().toISOString(),event:state.events.find(e=>e.id===id)})}else {const data=await api('/api/registrations',{method:'POST',body:JSON.stringify({event_id:id})});state.registrations.push({...data.registration,event:state.events.find(event=>event.id===id)});state.loadedAt=Date.now();}$('#modal').close();toast(state.demo?'Preview registration confirmed. No live registration was created.':'You’re registered. See you there!');render()}catch(error){toast(error.message);button.disabled=false}}
async function details(id){try{const event=state.events.find(e=>e.id===id)||(await api('/api/events/'+encodeURIComponent(id))).event;$('#modal-body').innerHTML=`<img class="detail-image" src="${escapeHTML(eventImage(event))}" alt="" onerror="this.hidden=true"><span class="pill">${escapeHTML(eventCategory(event))}</span><h2>${escapeHTML(event.title)}</h2><p>${escapeHTML(event.description||'Join your campus community for this event.')}</p><p class="meta">Date: ${escapeHTML(date(event.starts_at,{dateStyle:'full'}))}<br>Location: ${escapeHTML(event.location||'Location to be announced')}</p><button class="btn" data-register="${escapeHTML(id)}" ${isRegistered(id)||event.status==='closed'?'disabled':''}>${event.status==='closed'?'Event closed':isRegistered(id)?'&#10003; You are registered':'Register for this event &#8594;'}</button>`;$('#modal').showModal()}catch(error){toast(error.message)}}
document.addEventListener('click',event=>{const target=event.target.closest('button,a');if(!target)return;if(target.matches('[data-mode]')){state.mode=target.dataset.mode;state.loadedAt=0;state.events=[];location.hash=state.mode==='student'?'explore':'dashboard';nav()}else if(target.dataset.useUser)selectUser(target.dataset.useUser,target.dataset.userRole);else if(target.classList.contains('close'))$('#modal').close();else if(target.id==='demo-mode'||target.id==='live-mode'){state.demo=target.id==='demo-mode';localStorage.setItem('campus-demo',String(state.demo));render()}else if(target.id==='retry'){changed();render(true);}else if(target.id==='add-student')addStudent();else if(target.dataset.promoteUser)promoteUser(target.dataset.promoteUser,target);else if(target.dataset.category){state.category=target.dataset.category;document.querySelectorAll('[data-category]').forEach(b=>b.classList.toggle('active',b===target));filterEvents()}else if(target.dataset.toggleEvent)updateEvent(target.dataset.toggleEvent,{status:target.dataset.nextStatus},target);else if(target.dataset.setDate)saveEventDate(target.dataset.setDate,target);else if(target.dataset.details)details(target.dataset.details);else if(target.dataset.register)register(target.dataset.register,target);else if(target.dataset.participants){state.pendingEvent=target.dataset.participants;if(page()==='participants')participants(state.pendingEvent);else location.hash='participants'}});
document.addEventListener('input',event=>{if(['event-search','global-search'].includes(event.target.id)){state.search=event.target.value;if(page()==='explore'||!location.hash){const other=$(event.target.id==='event-search'?'#global-search':'#event-search');if(other)other.value=state.search;filterEvents()}else location.hash='explore'}});
document.addEventListener('change',event=>{if(event.target.id==='active-user'){selectUser(event.target.value,state.mode);return}if(event.target.id==='sort'){state.sort=event.target.value;filterEvents()}if(event.target.id==='participant-event')loadParticipants(event.target.value)});
window.addEventListener('hashchange',async()=>{if(page()!=='people')state.mode=['dashboard','manage','participants','create'].includes(page())?'organizer':'student';await render();if(page()==='participants'&&state.pendingEvent){const id=state.pendingEvent;state.pendingEvent=null;await participants(id)}});
$('#modal').addEventListener('click',event=>{if(event.target===$('#modal'))$('#modal').close()});
if(page()!=='people')state.mode=['dashboard','manage','participants','create'].includes(page())?'organizer':'student';
render();
fetch('/reference-images.json').then(response=>response.json()).then(images=>{state.images=images;if(page()==='explore'&&state.loadedAt)filterEvents()}).catch(()=>{});
window.addEventListener('focus',()=>{if(page()!=='create'&&!$('#modal').open&&Date.now()-state.loadedAt>10000)render(true)});
window.addEventListener('storage',event=>{if(event.key==='campus-data-changed'&&page()!=='create'&&!$('#modal').open){requestCache.clear();state.loadedAt=0;render(true)}});

if(typeof window.setInterval==='function')window.setInterval(()=>{if(document.visibilityState==='visible'&&['explore','manage','dashboard','people','registrations'].includes(page())&&!$('#modal').open)render(true)},15000);
