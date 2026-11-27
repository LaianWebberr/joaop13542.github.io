/* Extensão independente. Deve ser carregada depois do script original. */
(() => {
'use strict';
const main = document.querySelector('main'), cantinho = document.getElementById('cantinho'), tabs = cantinho?.querySelector('.abas');
if (!main || !cantinho || !tabs || document.getElementById('cx-fotos')) return;
const settings = window.CANTINHO_EXTRAS_CONFIG || {};
const cfg = typeof CFG !== 'undefined' ? CFG : {inicio:'2026-10-26T12:30:00',motivos:[]};
const byId = id => document.getElementById(id);
const esc = x => String(x ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const localDay = (d=new Date()) => new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d).filter(p=>p.type!=='literal').reduce((o,p)=>(o[p.type]=p.value,o),{});
const today = () => {const p=localDay();return `${p.year}-${p.month}-${p.day}`;};
const pretty = d => /^\d{4}-\d{2}-\d{2}$/.test(d||'')?d.split('-').reverse().join('/'):'';
const safeImage = s => /^data:image\/(jpeg|webp|png);base64,[A-Za-z0-9+/=]+$/.test(s||'') ? s : '';
const note = m => {if(typeof aviso==='function')aviso(m);else console.info(m);};
const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
let records=[], remote=null, user=null, unsubscribe=null, generation=0;
let activeStore='local';
const forms={};
const makePanel=(id,title,description,fields,addText)=>{
 const b=document.createElement('button');b.type='button';b.dataset.p=id;b.textContent=title;tabs.append(b);
 const panel=document.createElement('div');panel.id=id;panel.className='painel cx-panel';panel.hidden=true;
 panel.innerHTML=`<div class="cx-header"><p class="suave">${esc(description)}</p><button type="button" data-add>${esc(addText)}</button></div><form class="cx-form" hidden>${fields}<p class="cx-error" hidden role="alert"></p><div class="cx-toolbar"><button type="submit">Salvar</button><button type="button" class="ghost" data-cancel>Cancelar</button></div></form><div data-list></div>`;
 const last=cantinho.querySelector('#mais');cantinho.insertBefore(panel,last||null);
 const form=panel.querySelector('form');forms[id]={panel,form,list:panel.querySelector('[data-list]'),editing:null};
 panel.querySelector('[data-add]').onclick=()=>openForm(id);form.querySelector('[data-cancel]').onclick=()=>closeForm(id);
 return panel;
};
const fields={
 fotos:'<label>Foto (JPG, PNG ou WebP)<input name="foto" type="file" accept="image/*"></label><label>Legenda<input name="title" maxlength="100" placeholder="Um momento nosso..." required></label><label>Data da lembrança<input name="date" type="date" required></label>',
};
makePanel('cx-fotos','Fotos','Um álbum de pequenos momentos, só de vocês.',''+fields.fotos,'+ Foto');
const panelKind={'cx-fotos':'photo'};
tabs.addEventListener('click',e=>{const b=e.target.closest('button[data-p]');if(!b||!tabs.contains(b))return;tabs.querySelectorAll('button[data-p]').forEach(x=>x.classList.toggle('ativa',x===b));cantinho.querySelectorAll('.painel').forEach(p=>p.hidden=p.id!==b.dataset.p);});
const syncBox=document.createElement('div');syncBox.className='cx-sync';cantinho.append(syncBox);
function syncStatus(message){syncBox.replaceChildren(document.createTextNode(message));if(settings.compartilhado&&remote){const b=document.createElement('button');b.className='ghost';b.textContent=user?'Sair':'Entrar com Google';b.onclick=async()=>{try{if(user)await remote.logout();else await remote.login();}catch(e){note('Não foi possível entrar. Confira a configuração do Firebase.');}};syncBox.append(b);}}
syncStatus(settings.compartilhado?'Conectando às novas funcionalidades…':'Novas funcionalidades em modo local: dados salvos neste navegador.');
let dbPromise;
function db(){return dbPromise||=(new Promise((res,rej)=>{const q=indexedDB.open('cantinho-extras-v1',1);q.onupgradeneeded=()=>q.result.createObjectStore('records',{keyPath:'id'});q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error);}));}
async function localOp(mode,op){const d=await db();return new Promise((res,rej)=>{const t=d.transaction('records',mode);const r=op(t.objectStore('records'));t.oncomplete=()=>res(r.result);t.onabort=t.onerror=()=>rej(t.error||r.error);});}
async function loadLocal(){const n=++generation;try{const rows=await localOp('readonly',s=>s.getAll());if(n===generation&&activeStore==='local'){records=rows;render();}}catch(e){note('Não foi possível acessar o armazenamento local.');}}
const channel=typeof BroadcastChannel==='function'?new BroadcastChannel('cantinho-extras-v1'):null;
if(channel)channel.onmessage=()=>{if(activeStore==='local')loadLocal();};
async function writeRecord(r){if(settings.compartilhado){if(!user||!remote||activeStore!=='remote')throw Error('Entre em uma conta autorizada primeiro.');await remote.put(r);}else{await localOp('readwrite',s=>s.put(r));channel?.postMessage('changed');await loadLocal();}}
async function deleteRecord(id){if(settings.compartilhado){if(!user||!remote||activeStore!=='remote')throw Error('Entre em uma conta autorizada primeiro.');await remote.remove(id);}else{await localOp('readwrite',s=>s.delete(id));channel?.postMessage('changed');await loadLocal();}}
function showError(form,msg){const p=form.querySelector('.cx-error');p.textContent=msg;p.hidden=!msg;}
function closeForm(id){const o=forms[id];o.editing=null;o.form.reset();o.form.hidden=true;showError(o.form,'');}
function openForm(id,r){const o=forms[id],f=o.form;if(settings.compartilhado&&(!user||activeStore!=='remote'))return note('Entre em uma conta autorizada para adicionar ou editar.');f.reset();o.editing=r||null;showError(f,'');f.hidden=false;for(const key of ['title','date'])if(f.elements[key])f.elements[key].value=r?.[key]|| (key==='date'?today():'');f.elements.title.focus();}
async function resizePhoto(file){if(!file||!file.type.startsWith('image/'))throw Error('Selecione uma imagem válida.');if(file.size>30*1024*1024)throw Error('Escolha uma imagem de até 30 MB.');const url=URL.createObjectURL(file);try{const img=new Image();img.src=url;await img.decode();let max=1200;for(let a=0;a<7;a++){const ratio=Math.min(1,max/Math.max(img.width,img.height));const c=document.createElement('canvas');c.width=Math.max(1,Math.round(img.width*ratio));c.height=Math.max(1,Math.round(img.height*ratio));const ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(img,0,0,c.width,c.height);const s=c.toDataURL('image/jpeg',.84-a*.045);if(s.length<430000)return s;max=Math.round(max*.8);}throw Error('Não consegui reduzir essa imagem. Tente outra.');}finally{URL.revokeObjectURL(url);}}
for(const [id,o] of Object.entries(forms)){o.form.onsubmit=async e=>{e.preventDefault();const f=o.form, submit=f.querySelector('[type=submit]');submit.disabled=true;showError(f,'');try{const read=n=>String(f.elements[n]?.value||'').trim();const kind=panelKind[id], old=o.editing;const r={id:old?.id||uid(),kind,title:read('title'),date:read('date'),created:old?.created||Date.now(),updated:Date.now()};if(!r.title||!r.date)throw Error('Preencha título e data.');if(kind==='photo'){r.image=f.elements.foto.files[0]?await resizePhoto(f.elements.foto.files[0]):old?.image;if(!safeImage(r.image))throw Error('Selecione uma foto.');}await writeRecord(r);closeForm(id);note('Guardado com carinho! ♥');}catch(err){showError(f,err?.message||'Não foi possível salvar.');}finally{submit.disabled=false;}};}
function sorted(kind,ascending=false){return records.filter(r=>r.kind===kind).sort((a,b)=>(ascending?1:-1)*(String(a.date).localeCompare(String(b.date))||Number(a.created)-Number(b.created)));}
const empty=t=>`<p class="cx-empty">${esc(t)}</p>`;
const actions=(r,edit=true)=>`<div class="cx-card-actions">${edit?`<button class="ghost" type="button" data-edit="${esc(r.id)}">Editar</button>`:''}<button class="ghost" type="button" data-delete="${esc(r.id)}">Apagar</button></div>`;
function render(){const photos=sorted('photo');
 forms['cx-fotos'].list.innerHTML=photos.length?`<div class="cx-grid">${photos.map(r=>`<figure class="cx-photo"><button class="cx-photo-open" type="button" data-photo="${esc(r.id)}" aria-label="Ver foto: ${esc(r.title)}"><img loading="lazy" src="${safeImage(r.image)}" alt="${esc(r.title)}"></button><figcaption>${esc(r.title)}</figcaption><small>${pretty(r.date)}</small>${actions(r)}</figure>`).join('')}</div>`:empty('Ainda não há fotos. Que tal guardar o primeiro momento? ♡');}
for(const [id,o] of Object.entries(forms)){o.list.addEventListener('click',async e=>{const b=e.target.closest('button');if(!b)return;const rid=b.dataset.edit||b.dataset.delete||b.dataset.photo;if(!rid)return;const r=records.find(x=>x.id===rid);if(!r)return;if(b.dataset.edit)openForm(id,r);else if(b.dataset.photo)showPhoto(r.id);else if(b.dataset.delete){if(!confirm(`Apagar “${r.title}”?`))return;try{await deleteRecord(r.id);note('Removido.');}catch(err){note(err.message||'Não foi possível apagar.');}}});}
let modal,priorFocus;
function closeModal(){if(modal){modal.remove();modal=null;document.removeEventListener('keydown',keyModal);priorFocus?.focus?.();}}
function keyModal(e){if(e.key==='Escape')closeModal();else if(modal&&e.key==='Tab'){const f=[...modal.querySelectorAll('button,input,select,textarea,[tabindex="0"]')].filter(x=>!x.disabled&&!x.hidden);if(!f.length)return;if(e.shiftKey&&document.activeElement===f[0]){e.preventDefault();f.at(-1).focus();}else if(!e.shiftKey&&document.activeElement===f.at(-1)){e.preventDefault();f[0].focus();}}}
function openModal(html){if(modal)closeModal();priorFocus=document.activeElement;modal=document.createElement('div');modal.className='cx-modal';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-label','Nosso cantinho');modal.innerHTML=`<div class="cx-modal-box"><button class="ghost cx-close" type="button" aria-label="Fechar">✕</button><div data-body>${html}</div></div>`;document.body.append(modal);modal.querySelector('.cx-close').onclick=closeModal;modal.addEventListener('click',e=>{if(e.target===modal)closeModal();});document.addEventListener('keydown',keyModal);modal.querySelector('.cx-close').focus();return modal.querySelector('[data-body]');}
function showPhoto(id){const photos=sorted('photo');let i=photos.findIndex(x=>x.id===id);if(i<0)return;const body=openModal('');const display=()=>{const r=photos[i];body.innerHTML=`<img src="${safeImage(r.image)}" alt="${esc(r.title)}"><h2>${esc(r.title)}</h2><p class="suave">${pretty(r.date)}</p><div class="cx-modal-actions"><button class="ghost" type="button" data-prev ${i===0?'disabled':''}>Anterior</button><small>${i+1} de ${photos.length}</small><button class="ghost" type="button" data-next ${i===photos.length-1?'disabled':''}>Próxima</button></div>`;body.querySelector('[data-prev]').onclick=()=>{if(i>0){i--;display();}};body.querySelector('[data-next]').onclick=()=>{if(i<photos.length-1){i++;display();}};};display();}
const first=main.querySelector('section');
const daily=document.createElement('div');daily.className='cx-day';daily.innerHTML='<small>☀ Um motivo para hoje</small><p data-message></p>';if(first&&cfg.motivos?.length){first.append(daily);}
function dailyUpdate(){if(!cfg.motivos?.length)return;const n=Math.floor(Date.parse(today()+'T00:00:00Z')/86400000);const i=((n%cfg.motivos.length)+cfg.motivos.length)%cfg.motivos.length;daily.querySelector('[data-message]').textContent=cfg.motivos[i];}
let theme='auto';try{theme=localStorage.getItem('cx-theme')||'auto';}catch{}if(!['auto','original','day','night'].includes(theme))theme='auto';
const themeControl=document.createElement('label');themeControl.className='cx-theme';themeControl.innerHTML='<span>☀ Tema do nosso céu ☾</span><select aria-label="Tema do site"><option value="auto">Automático</option><option value="original">Original</option><option value="day">Sol</option><option value="night">Lua</option></select>';if(first)first.append(themeControl);themeControl.querySelector('select').value=theme;
function themeUpdate(){const hour=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'America/Sao_Paulo',hour:'2-digit',hourCycle:'h23'}).format(new Date()));const current=theme==='auto'?(hour>=6&&hour<18?'day':'night'):theme;document.documentElement.classList.toggle('cx-theme-day',current==='day');document.documentElement.classList.toggle('cx-theme-night',current==='night');}
themeControl.querySelector('select').onchange=e=>{theme=e.target.value;try{localStorage.setItem('cx-theme',theme);}catch{}themeUpdate();};
function anniversary(day,start){const [y,m,d]=day.split('-').map(Number),[sy,sm,sd]=start.slice(0,10).split('-').map(Number);const months=(y-sy)*12+m-sm;const lastDay=new Date(Date.UTC(y,m,0)).getUTCDate();return months>0&&d===Math.min(sd,lastDay)?months:0;}
let celebratedSession='';
function celebrate(){const day=today(),months=anniversary(day,cfg.inicio);if(!months||celebratedSession===day)return;try{if(localStorage.getItem('cx-celebrated')===day)return;}catch{}if(modal)return;celebratedSession=day;try{localStorage.setItem('cx-celebrated',day);}catch{}const title=months%12===0?`${months/12} ${months===12?'ano':'anos'} de nós!`:`${months} ${months===1?'mês':'meses'} de nós!`;const body=openModal(`<div class="cx-celebrate-icon">☀️💗🌙</div><h2>${esc(title)}</h2><p>Mais um pedacinho da nossa história, com amor e muitas lembranças pela frente.</p><div class="cx-modal-actions"><button type="button">Celebrar juntos ♥</button></div>`);body.querySelector('button').onclick=closeModal;if(!reduce())for(let k=0;k<30;k++){const c=document.createElement('span');c.className='cx-confetti';c.setAttribute('aria-hidden','true');c.textContent=['♥','✦','♡','🌸'][k%4];c.style.left=Math.random()*100+'vw';c.style.color=k%2?'var(--rosa)':'var(--ouro)';c.style.animationDelay=Math.random()*.9+'s';document.body.append(c);setTimeout(()=>c.remove(),4700);}}
const env=byId('env');if(env){const afterOpen=()=>setTimeout(celebrate,1250);env.addEventListener('click',afterOpen,{once:true});env.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' ')afterOpen();});}else setTimeout(celebrate,500);
dailyUpdate();themeUpdate();setInterval(()=>{dailyUpdate();themeUpdate();render();if(byId('abertura')?.classList.contains('some'))celebrate();},60000);
render();
if(!settings.compartilhado)loadLocal();else{
 activeStore='none';
 import('./cantinho-extra.firebase.js').then(async m=>{remote=await m.connect(settings.firebase,async u=>{user=u;generation++;unsubscribe?.();records=[];render();if(!u){activeStore='none';syncStatus('Entrem com suas contas para ver as fotos e memórias compartilhadas.');return;}activeStore='none';syncStatus('Verificando acesso…');unsubscribe=remote.watch(rows=>{activeStore='remote';records=rows;render();syncStatus('Cantinho compartilhado · sincronizado');},()=>{activeStore='none';records=[];render();syncStatus('Sem acesso às memórias. Verifique as regras do Firebase.');});});syncStatus('Entrem com suas contas para sincronizar o cantinho.');}).catch(()=>syncStatus('Não foi possível conectar. Verifique a configuração do Firebase.'));
}
})();
