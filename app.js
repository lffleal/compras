import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, collection, doc, query, orderBy, onSnapshot, setDoc, updateDoc, deleteDoc, getDocs, increment, writeBatch } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDz1Fav0Hxf4QWDitFfg7jK5Kq_baUH0fE",
  authDomain: "compras-38027.firebaseapp.com",
  projectId: "compras-38027",
  storageBucket: "compras-38027.firebasestorage.app",
  messagingSenderId: "407226432252",
  appId: "1:407226432252:web:9d3534ee87aa48fe05f579"
};
const fbApp = initializeApp(firebaseConfig);
const auth = getAuth(fbApp);
setPersistence(auth, browserLocalPersistence).catch(() => {});
let db;
try { db = initializeFirestore(fbApp, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) }); }
catch (e) { db = initializeFirestore(fbApp, {}); }

/* ---------- catálogo ---------- */
const CATS = [
  { id: 'fruta', n: 'Fruta' }, { id: 'charc', n: 'Charcutaria' }, { id: 'bebidas', n: 'Águas, sumos e refrigerantes' },
  { id: 'merc', n: 'Mercearias' }, { id: 'higiene', n: 'Higiene pessoal' }, { id: 'limpeza', n: 'Limpeza' }, { id: 'cereais', n: 'Cereais, pão de forma e ovos' }, { id: 'cafe', n: 'Café e bolachas' }];
const CVAR = { fruta: '--c-fruta', charc: '--c-talho', bebidas: '--c-peixe', merc: '--c-merc', cereais: '--c-lact', cafe: '--c-pad', higiene: '--c-higiene', limpeza: '--c-limpeza' };
const CATN = Object.fromEntries(CATS.map(c => [c.id, c.n]));
const DICT = {
  fruta: 'banana,maçã,pera,laranja,tangerina,limão,kiwi,uvas,morangos,melão,melancia,ananás,manga,abacate,pêssego,ameixa,mirtilos,framboesas,batata,batata-doce,cebola,alho,cenoura,tomate,alface,rúcula,espinafres,couve,couve-flor,brócolos,pepino,curgete,beringela,pimento,cogumelos,abóbora,feijão-verde,alho-francês,nabo,salsa,coentros,hortelã,gengibre,sopa de legumes',
  charc: 'fiambre,fiambre de peru,fiambre de frango,queijo,queijo fatiado,queijo flamengo,queijo ralado,queijo fresco,queijo da serra,mozzarella,requeijão,presunto,chouriço,salpicão,paio,mortadela,bacon,salsichas,alheira,farinheira,peito de peru fatiado',
  bebidas: 'água,água com gás,água das pedras,sumo,sumo de laranja,néctar,coca-cola,coca-cola zero,refrigerante,ice tea,sumol,compal,7up,fanta,cerveja,vinho,vinho tinto,vinho branco,espumante',
  merc: 'arroz agulha,arroz carolino,lentilhas,cuscuz,puré de batata,massa de lasanha,leite UHT,iogurtes naturais,iogurtes gregos,queijo creme,pão,carcaças,broa,bolo,leite,leite meio-gordo,leite magro,leite com chocolate,iogurtes,iogurte líquido,manteiga,margarina,natas,danoninhos,gelatina,arroz,massa,esparguete,massa de cotovelos,farinha,açúcar,sal,azeite,óleo,vinagre,feijão,grão-de-bico,ervilhas,atum em lata,polpa de tomate,ketchup,maionese,mostarda,chá,cacau,chocolate,batatas fritas,frutos secos,caldos,especiarias,pimenta,orégãos,fermento,tremoços,azeitonas,frango,peito de frango,carne picada,bifes,bifes de peru,lombo de porco,costeletas,entrecosto,febras,hambúrgueres,pescada,bacalhau,salmão,dourada,sardinhas,atum,polvo,camarão,douradinhos,gelado,pizza,legumes congelados,nuggets,lasanha,guardanapos,rolo de cozinha,rolos de cozinha,papel de cozinha,papel de alumínio,película aderente,sacos de congelação',
  cereais: 'cereais,cereais de chocolate,corn flakes,granola,muesli,flocos de aveia,aveia,papas,papa infantil,cereais infantis,boiões,boião de fruta,leite infantil,pão de forma,pão de forma integral,pão de leite,tostas,tostas integrais,wraps,tortilhas,ovos,ovos caseiros,ovos de galinhas livres,mel,compota,doce de morango,bebida de aveia,bebida de soja,bebida de amêndoa,bebida de arroz',
  cafe: 'café,café moído,café em grão,cápsulas de café,café solúvel,bolachas,bolachas maria,bolachas de água e sal,bolachas de chocolate,bolachas digestivas',
  higiene: 'papel higiénico,gel de banho,champô,amaciador de cabelo,pasta de dentes,escovas de dentes,elixir,fio dentário,desodorizante,lâminas,espuma de barbear,creme hidratante,cotonetes,algodão,lenços,toalhitas,fraldas,pensos,protetor solar,sabonete',
  limpeza: 'detergente da loiça,pastilhas da máquina,detergente da roupa,amaciador,lixívia,limpa-vidros,desengordurante,limpa-chão,esponjas,sacos do lixo,tira-nódoas'
};
// Secções antigas (versão 1) passam para as novas
const LEGACY = { padaria: 'merc', talho: 'merc', peixe: 'merc', lact: 'merc', cong: 'merc', outros: 'merc' };
const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const keyOf = s => norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 150) || 'x';
const PRODUCTS = []; for (const c in DICT) for (const n of DICT[c].split(',')) PRODUCTS.push({ name: n, cat: c, k: norm(n) });
const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
const cc = c => `--cc:var(${CVAR[c] || '--c-outros'})`;
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const eur = v => v.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });
const STORES = {
  pd: { n: 'Pingo Doce', search: q => 'https://www.google.com/search?q=' + encodeURIComponent('site:pingodoce.pt ' + q) },
  ct: { n: 'Continente', search: q => 'https://www.continente.pt/pesquisa/?q=' + encodeURIComponent(q) }
};

/* ---------- estado ---------- */
let user = null, lists = [], listsLoaded = false, curId = null, items = [], itemsLoaded = false;
let prods = {}, cfg = { minEuros: 10, minPct: 30 };
let unsub = [], unsubItems = null, selIdx = -1, suggList = [];
try { curId = localStorage.getItem('compras.cur'); } catch (e) { }

const $ = id => document.getElementById(id);
function toast(t) { const el = $('toast'); el.textContent = t; el.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => el.hidden = true, 2400); }
function note(t) { const el = $('note'); el.textContent = t || ''; el.hidden = !t; }
function onErr(e) {
  const c = e && e.code;
  if (c === 'permission-denied') note('Esta conta não tem acesso às listas. Confirma o e-mail nas regras do Firestore.');
  else if (c === 'resource-exhausted') toast('Limite diário gratuito atingido. Volta a tentar amanhã.');
  else toast('Não foi possível guardar. Tenta outra vez.');
  console.error(e);
}
const run = p => p.catch(onErr);

/* ---------- texto → produto ---------- */
function parse(raw) {
  let s = raw.trim(), qty = '', m;
  if ((m = s.match(/^(\d+(?:[.,]\d+)?)\s*(kg|g|gr|l|lt|ml|un|uni|x|emb|pacotes?|latas?|garrafas?|d[uú]zias?)?\.?\s+(.+)$/i))) { qty = m[1] + (m[2] && !/^x$/i.test(m[2]) ? ' ' + m[2].toLowerCase() : ''); s = m[3]; }
  else if ((m = s.match(/^(.+?)\s+x\s*(\d+)$/i))) { s = m[1]; qty = m[2]; }
  return { name: cap(s.trim()), qty };
}
function guessCat(name) {
  const k = norm(name), p = prods[keyOf(name)];
  if (p && p.cat) return p.cat;
  const ex = PRODUCTS.find(p => p.k === k); if (ex) return ex.cat;
  let best = null;
  for (const p of PRODUCTS) if ((' ' + k + ' ').includes(' ' + p.k + ' ') || k.startsWith(p.k)) if (!best || p.k.length > best.k.length) best = p;
  return best ? best.cat : 'merc';
}
function dictCat(name) {
  const k = norm(name || ''); const ex = PRODUCTS.find(p => p.k === k); if (ex) return ex.cat;
  let best = null;
  for (const p of PRODUCTS) if ((' ' + k + ' ').includes(' ' + p.k + ' ') || k.startsWith(p.k)) if (!best || p.k.length > best.k.length) best = p;
  return best ? best.cat : null;
}
// Secção válida: a guardada, ou para secções antigas a do dicionário (fiambre → charcutaria)
const normCat = (cat, name) => {
  if (cat === 'merc') { const d = dictCat(name); if (d === 'cafe' || d === 'cereais') return d; } // saíram da mercearia
  return CATN[cat] ? cat : (dictCat(name) || LEGACY[cat] || 'merc');
};
const qtyMult = q => { const m = String(q || '').match(/^(\d+)(\s*(un|uni|x|emb|pacotes?|latas?|garrafas?))?$/i); return m ? Math.max(1, parseInt(m[1], 10)) : 1; };

/* ---------- preços e alertas ---------- */
function priceInfo(item) {
  const p = prods[item.prodId || item.key]; const pr = p && p.prices;
  if (!pr) return null;
  const pd = pr.pd && typeof pr.pd.p === 'number' ? pr.pd : null, ct = pr.ct && typeof pr.ct.p === 'number' ? pr.ct : null;
  if (!pd && !ct) return null;
  let save = 0, pct = 0;
  if (pd && ct && ct.p < pd.p) { save = (pd.p - ct.p) * qtyMult(item.qty); pct = (pd.p - ct.p) / pd.p * 100; }
  return { pd, ct, save, pct };
}
function deals() {
  const out = [];
  for (const i of items) { if (i.done) continue; const pi = priceInfo(i); if (pi && pi.save > 0) out.push({ i, ...pi }); }
  const total = out.reduce((s, d) => s + d.save, 0);
  const big = out.filter(d => d.pct >= cfg.minPct);
  return { out, total, big, alert: total >= cfg.minEuros || big.length > 0 };
}

/* ---------- desenho ---------- */
const curList = () => lists.find(l => l.id === curId);
const CHECK = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--surface)" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>`;
const DOTS = `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>`;
function renderTabs() {
  $('tabs').innerHTML = lists.map(l => `<button class="tab" data-list="${esc(l.id)}" aria-current="${l.id === curId}">${esc(l.name)}</button>`).join('') +
    `<button class="tab icon" data-act="lists" aria-label="Gerir listas"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></button>`;
}
function priceLine(i) {
  const pi = priceInfo(i); if (!pi) return '';
  const parts = [];
  if (pi.pd) parts.push(`PD ${eur(pi.pd.p)}`);
  if (pi.ct) parts.push(pi.pct >= cfg.minPct ? `<span class="hot">CT ${eur(pi.ct.p)} −${Math.round(pi.pct)}%</span>` : `CT ${eur(pi.ct.p)}`);
  return `<span class="price">${parts.join(' · ')}</span>`;
}
function itemRow(i) {
  return `<div class="item${i.done ? ' done' : ''}" style="${cc(i.cat)}">
    <button class="tick" data-tick="${esc(i.id)}" data-lp="item:${esc(i.id)}" aria-pressed="${!!i.done}"><span class="box">${CHECK}</span><span class="txt"><span class="name">${esc(i.name)}</span>${priceLine(i)}</span>${i.qty ? `<span class="qty">${esc(i.qty)}</span>` : ''}</button>
    <button class="more" data-edit="${esc(i.id)}" aria-label="Editar ${esc(i.name)}">${DOTS}</button></div>`;
}
function render() {
  renderTabs();
  const L = curList();
  $('title').textContent = L ? L.name : 'Compras';
  $('add-input').disabled = !L; $('add-btn').disabled = !L; $('cat-btn').disabled = !L;
  refreshCatalog();
  const todo = items.filter(i => !i.done), done = items.filter(i => i.done);
  $('count').textContent = L && itemsLoaded ? (todo.length ? `${todo.length} por comprar` : items.length ? 'Tudo no carrinho' : '') : '';
  const main = $('main');
  if (!listsLoaded) return;
  if (!lists.length) { main.innerHTML = `<div class="empty"><h3>Ainda não há listas</h3><p>Cria a primeira, por exemplo “Pingo Doce” ou “Semana”.</p><button class="btn" data-act="lists">Criar lista</button></div>`; return; }
  if (!itemsLoaded) { main.innerHTML = '<div class="empty"><p>A carregar produtos…</p></div>'; return; }
  let h = '';
  const d = deals();
  if (d.alert) {
    const top = d.big.sort((a, b) => b.pct - a.pct)[0] || d.out.sort((a, b) => b.save - a.save)[0];
    h += `<div class="deal" role="status"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--deal)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex:none;margin-top:2px"><path d="M20.6 13.4 12 22l-9-9V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.5"/></svg>
      <div><b>Vale a pena ir ao Continente</b><p>Poupas cerca de ${eur(d.total)} em ${d.out.length} ${d.out.length === 1 ? 'produto' : 'produtos'}${top ? `. Maior desconto: ${esc(top.i.name)} (−${Math.round(top.pct)}%)` : ''}.</p></div></div>`;
  }
  if (!items.length) { main.innerHTML = h + `<div class="empty"><h3>Lista vazia</h3><p>Escreve o produto como o compras, com marca e sabor: “2 iogurte líquido morango Mimosa”. Da próxima vez basta um toque.</p></div>`; return; }
  const known = new Set(CATS.map(c => c.id));
  for (const c of CATS) {
    const g = todo.filter(i => (known.has(i.cat) ? i.cat : 'merc') === c.id).sort((a, b) => a.name.localeCompare(b.name, 'pt'));
    if (!g.length) continue;
    h += `<section class="aisle"><h2><span class="dot" style="${cc(c.id)}"></span>${c.n}<span class="n">${g.length}</span></h2><div class="items">${g.map(itemRow).join('')}</div></section>`;
  }
  if (!todo.length) h += `<div class="empty"><h3>Compras feitas</h3><p>Está tudo no carrinho.</p></div>`;
  if (done.length) {
    done.sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0));
    h += `<section class="aisle cart"><h2>No carrinho<span class="n">${done.length}</span><button data-act="clear">Limpar</button></h2><div class="items">${done.map(itemRow).join('')}</div></section>`;
  }
  main.innerHTML = h;
}

/* ---------- sugestões ---------- */
function suggestions(text) {
  const k = norm(text); if (!k) return [];
  const words = k.split(' ');
  const inList = new Set(items.filter(i => !i.done).map(i => i.key));
  const out = [], seen = new Set();
  const push = (name, cat, hab) => { const kk = keyOf(name); if (seen.has(kk) || inList.has(kk)) return; seen.add(kk); out.push({ name: cap(name), cat, hab }); };
  Object.values(prods).filter(p => { if (p.hidden) return false; const n = norm(p.name); return words.every(w => n.includes(w)); })
    .sort((a, b) => (norm(b.name).startsWith(k) - norm(a.name).startsWith(k)) || ((b.uses || 0) - (a.uses || 0))).slice(0, 5).forEach(p => push(p.name, p.cat, true));
  PRODUCTS.filter(p => p.k.startsWith(k)).concat(PRODUCTS.filter(p => !p.k.startsWith(k) && p.k.includes(k))).forEach(p => out.length < 8 && push(p.name, p.cat, false));
  return out.slice(0, 8);
}
function showSugg() {
  const el = $('sugg'), raw = $('add-input').value, { name } = parse(raw);
  if (document.activeElement !== $('add-input')) { el.hidden = true; return; }
  if (!raw.trim()) {
    const inList = new Set(items.filter(i => !i.done).map(i => i.key));
    const fav = Object.values(prods).filter(p => !p.hidden && (p.uses || 0) > 0 && !inList.has(p.id)).sort((a, b) => (b.uses || 0) - (a.uses || 0)).slice(0, 16);
    suggList = []; selIdx = -1;
    if (!fav.length) { el.hidden = true; return; }
    el.innerHTML = `<div class="lbl">Habituais</div><div class="chips">${fav.map(p => `<button type="button" data-quick="${esc(p.id)}"><span class="dot" style="${cc(p.cat)}"></span>${esc(p.name)}</button>`).join('')}</div>`;
    el.hidden = false; return;
  }
  suggList = suggestions(name);
  if (!suggList.length) { el.hidden = true; return; }
  if (selIdx >= suggList.length) selIdx = -1;
  el.innerHTML = suggList.map((s, i) => `<button type="button" class="s" data-sugg="${i}" aria-selected="${i === selIdx}"><span class="dot" style="${cc(s.cat)}"></span>${esc(s.name)}${s.hab ? '<span class="star">Habitual</span>' : `<span class="cat">${CATN[s.cat]}</span>`}</button>`).join('');
  el.hidden = false;
}

/* ---------- ações ---------- */
const itemsCol = () => collection(db, 'lists', curId, 'items');
function touchProduct(name, cat, inc = 1) {
  const id = keyOf(name);
  run(setDoc(doc(db, 'produtos', id), { name, cat, uses: increment(inc), lastAt: Date.now(), hidden: false }, { merge: true }));
  return id;
}
function addItem(raw, forcedCat) {
  if (!curId) return;
  const { name, qty } = parse(raw); if (!name) return;
  const key = keyOf(name), ex = items.find(i => i.key === key);
  if (ex && !ex.done) {
    if (qty && qty !== ex.qty) { run(updateDoc(doc(itemsCol(), ex.id), { qty })); toast(`${ex.name}: ${qty}`); }
    else toast(`${ex.name} já está na lista`);
    return;
  }
  const p = prods[key];
  const finalName = p ? p.name : name;
  const cat = forcedCat || guessCat(name);
  if (ex && ex.done) run(updateDoc(doc(itemsCol(), ex.id), { done: false, qty: qty || ex.qty || '' }));
  else run(setDoc(doc(itemsCol()), { name: finalName, key, prodId: key, qty, cat, done: false, createdAt: Date.now() }));
  touchProduct(finalName, cat);
}
function toggle(id) {
  const it = items.find(i => i.id === id); if (!it) return;
  run(updateDoc(doc(itemsCol(), id), { done: !it.done, doneAt: Date.now() }));
}
async function clearDone() {
  const done = items.filter(i => i.done);
  const b = writeBatch(db); done.forEach(i => b.delete(doc(itemsCol(), i.id)));
  await run(b.commit());
  toast(`${done.length} ${done.length === 1 ? 'produto removido' : 'produtos removidos'}`);
}
function selectList(id) {
  if (id === curId && unsubItems) return;
  curId = id; try { localStorage.setItem('compras.cur', id); } catch (e) { }
  items = []; itemsLoaded = false; render();
  if (unsubItems) unsubItems();
  unsubItems = onSnapshot(itemsCol(), s => { items = s.docs.map(d => { const x = d.data(); return { id: d.id, ...x, cat: normCat(x.cat, x.name) }; }); itemsLoaded = true; render(); showSugg(); }, e => { itemsLoaded = true; onErr(e); render(); });
}

/* ---------- folhas ---------- */
function openSheet(html, onMount) {
  const root = $('sheet-root');
  root.innerHTML = `<div class="scrim" id="scrim"><div class="sheet" role="dialog" aria-modal="true">${html}</div></div>`;
  $('scrim').addEventListener('click', e => { if (e.target.id === 'scrim') closeSheet(); });
  onMount && onMount(root);
}
function closeSheet() { catalogOpen = false; $('sheet-root').innerHTML = ''; }

/* ---------- produtos por secção ---------- */
let catalogOpen = false, catFilter = '';
function catalogBody() {
  const inList = new Set(items.filter(i => !i.done).map(i => i.key));
  const f = norm(catFilter), words = f ? f.split(' ') : [];
  const match = n => words.every(w => norm(n).includes(w));
  let html = '';
  for (const c of CATS) {
    const seen = new Set(), list = [];
    Object.values(prods).filter(p => p.cat === c.id && p.name && !p.hidden).sort((a, b) => (b.uses || 0) - (a.uses || 0) || a.name.localeCompare(b.name, 'pt'))
      .forEach(p => { if (!seen.has(p.id)) { seen.add(p.id); list.push({ name: p.name, hab: true }); } });
    PRODUCTS.filter(p => p.cat === c.id).sort((a, b) => a.name.localeCompare(b.name, 'pt'))
      .forEach(p => { const k = keyOf(p.name); if (!seen.has(k) && !(prods[k] && prods[k].hidden)) { seen.add(k); list.push({ name: cap(p.name), hab: false }); } });
    const shown = list.filter(x => match(x.name));
    if (!shown.length) continue;
    html += `<section class="catsec" id="cs-${c.id}" style="${cc(c.id)}"><h4><span class="dot"></span>${c.n}</h4><div class="pick">${shown.map(x => `<button type="button" class="${x.hab ? 'hab' : ''}" data-pk="${esc(x.name)}" data-pc="${c.id}" data-lp="cat:${esc(keyOf(x.name))}" aria-pressed="${inList.has(keyOf(x.name))}">${esc(x.name)}</button>`).join('')}</div></section>`;
  }
  const hid = Object.values(prods).filter(p => p.hidden && !p.renamedTo && p.name && match(p.name)).sort((a, b) => a.name.localeCompare(b.name, 'pt'));
  if (hid.length) html += `<details class="catsec"><summary class="hint">Escondidos (${hid.length}) · toca num para voltar a mostrar</summary><div class="pick" style="margin-top:8px">${hid.map(p => `<button type="button" data-unhide="${esc(p.id)}" style="${cc(p.cat)}">${esc(p.name)}</button>`).join('')}</div></details>`;
  return html || '<p class="hint">Nenhum produto com esse nome. Usa “Novo produto” para o criar.</p>';
}
function refreshCatalog() {
  if (catalogOpen && $('cat-body')) $('cat-body').innerHTML = catalogBody();
  if ($('hab-body')) $('hab-body').innerHTML = habBody();
}
function openCatalog() {
  if (!curList()) return;
  catFilter = '';
  openSheet(`<h3>Produtos</h3>
    <div class="row"><input id="cat-filter" type="search" placeholder="Filtrar… ex.: iogurte" aria-label="Filtrar produtos" style="flex:3"><button type="button" class="btn ghost" id="cat-new" style="flex:1">+ Novo</button></div>
    <nav class="cat-jump">${CATS.map(c => `<button type="button" data-jump="${c.id}" style="${cc(c.id)}"><span class="dot"></span>${c.n}</button>`).join('')}</nav>
    <div id="cat-body" style="display:flex;flex-direction:column;gap:18px">${catalogBody()}</div>
    <p class="hint">Toca para pôr na lista ou tirar. Mantém o dedo em cima de qualquer produto para lhe mudar o nome (marca, sabor, tamanho), a secção, ou para o esconder. Os teus produtos aparecem primeiro, a negrito.</p>
    <button class="btn" id="cat-done">Fechar</button>`, root => {
    catalogOpen = true;
    $('cat-filter').addEventListener('input', e => { catFilter = e.target.value; refreshCatalog(); });
    $('cat-done').onclick = closeSheet;
    root.querySelector('.cat-jump').addEventListener('click', e => { const b = e.target.closest('[data-jump]'); if (!b) return; const el = $('cs-' + b.dataset.jump); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); else toast('Sem produtos nesta secção com esse filtro'); });
    $('cat-new').onclick = () => newProduct();
    $('cat-body').addEventListener('click', e => {
      const u = e.target.closest('[data-unhide]');
      if (u) { run(setDoc(doc(db, 'produtos', u.dataset.unhide), { hidden: false }, { merge: true })); toast('Voltou ao catálogo'); return; }
      const b = e.target.closest('[data-pk]'); if (!b) return;
      b.setAttribute('aria-pressed', toggleProduct(b.dataset.pk, b.dataset.pc));
    });
  });
}
function catGrid(sel) { return `<div class="catgrid">${CATS.map(c => `<button type="button" data-pick="${c.id}" style="${cc(c.id)}" aria-pressed="${c.id === sel}"><span class="dot"></span>${c.n}</button>`).join('')}</div>`; }
function bindCatGrid(root, set) { root.querySelectorAll('[data-pick]').forEach(b => b.onclick = () => { set(b.dataset.pick); root.querySelectorAll('[data-pick]').forEach(x => x.setAttribute('aria-pressed', x === b)); }); }
const ago = t => { const d = Math.floor((Date.now() - t) / 864e5); return d <= 0 ? 'hoje' : d === 1 ? 'ontem' : `há ${d} dias`; };
function storeBlock(key, p, name) {
  const s = STORES[key], url = (p && p[key + 'Url']) || '', pr = p && p.prices && p.prices[key];
  return `<div class="store"><span class="sn">${s.n}</span><span class="sp">${pr && typeof pr.p === 'number' ? eur(pr.p) : ''}</span>
    <span class="sd">${pr && pr.at ? 'Preço online, ' + ago(pr.at) + (pr.promo ? ' · em promoção' : '') : url ? 'Página guardada. O preço aparece após a próxima verificação.' : 'Abre a pesquisa, encontra o produto e cola aqui o link da página dele.'}</span>
    <input id="u-${key}" type="url" inputmode="url" placeholder="Link do produto no ${s.n}" value="${esc(url)}">
    <a class="btn ghost small" href="${esc(url || s.search(name))}" target="_blank" rel="noopener" style="grid-column:1/-1">${url ? 'Abrir no ' + s.n : 'Procurar no ' + s.n}</a></div>`;
}
const cleanUrl = (v, host) => { v = (v || '').trim(); if (!v) return ''; try { const u = new URL(v); return u.hostname.endsWith(host) ? u.href : null; } catch (e) { return null; } };
function readLinks() {
  const pd = cleanUrl($('u-pd').value, 'pingodoce.pt'), ct = cleanUrl($('u-ct').value, 'continente.pt');
  if (pd === null) { toast('O link do Pingo Doce tem de ser de pingodoce.pt'); return null; }
  if (ct === null) { toast('O link do Continente tem de ser de continente.pt'); return null; }
  return { pdUrl: pd, ctUrl: ct };
}
function editItem(id) {
  const it = items.find(i => i.id === id); if (!it) return;
  const pid = it.prodId || it.key, p = prods[pid];
  let cat = it.cat, armed = false;
  openSheet(`<h3>Editar produto</h3>
    <div class="field"><label for="ed-name">Produto (marca e variante)</label><input id="ed-name" value="${esc(it.name)}"></div>
    <div class="field"><label for="ed-qty">Quantidade</label><input id="ed-qty" value="${esc(it.qty || '')}" placeholder="ex.: 2, 6 un, 1 kg"></div>
    <div class="field"><span class="l">Secção</span>${catGrid(cat)}</div>
    <h4>Preços</h4>${storeBlock('pd', p, it.name)}${storeBlock('ct', p, it.name)}
    <div class="row"><button class="btn danger" id="ed-del">Tirar da lista</button><button class="btn" id="ed-save">Guardar</button></div>`, root => {
    bindCatGrid(root, v => cat = v);
    $('ed-save').onclick = () => {
      const links = readLinks(); if (!links) return;
      const name = cap($('ed-name').value.trim()) || it.name, qty = $('ed-qty').value.trim(), key = keyOf(name);
      run(updateDoc(doc(itemsCol(), id), { name, key, prodId: key, qty, cat }));
      run(setDoc(doc(db, 'produtos', key), { name, cat, ...links, ...(key !== pid && p ? { uses: increment(p.uses || 1) } : {}) }, { merge: true }));
      closeSheet();
    };
    $('ed-del').onclick = () => {
      if (!armed) { armed = true; $('ed-del').textContent = 'Tocar de novo'; return; }
      run(deleteDoc(doc(itemsCol(), id))); closeSheet();
    };
  });
}
function editProduct(pid, opts = {}) {
  const p = prods[pid] || (opts.name ? { id: pid, name: opts.name, cat: opts.cat, uses: 0, virtual: true } : null);
  if (!p) return;
  const back = opts.back || (catalogOpen ? openCatalog : null);
  let cat = p.cat || 'merc', armed = false;
  const inList = items.find(i => i.key === pid && !i.done);
  const done = () => { if (back) back(); else closeSheet(); };
  openSheet(`<h3>${esc(p.name)}</h3>
    <div class="field"><label for="pp-name">Nome como o compras (marca, sabor, tamanho)</label><input id="pp-name" value="${esc(p.name)}" placeholder="ex.: Leite Mimosa meio-gordo 1 L"></div>
    <div class="field"><span class="l">Secção</span>${catGrid(cat)}</div>
    <h4>Preços</h4>${storeBlock('pd', p, p.name)}${storeBlock('ct', p, p.name)}
    <div class="row">${inList ? '' : '<button class="btn ghost" id="pp-add">Pôr na lista</button>'}<button class="btn" id="pp-save">Guardar</button></div>
    <button class="btn danger" id="pp-del">Esconder do catálogo</button>`, root => {
    bindCatGrid(root, v => cat = v);
    const save = () => {
      const links = readLinks(); if (!links) return null;
      const name = cap($('pp-name').value.trim()) || p.name, key = keyOf(name);
      if (key === pid) run(setDoc(doc(db, 'produtos', pid), { name, cat, ...links, hidden: false, ...(p.virtual ? { uses: 0 } : {}) }, { merge: true }));
      else {
        // mudou o nome: o novo fica com o histórico, o antigo deixa de aparecer
        run(setDoc(doc(db, 'produtos', key), { name, cat, ...links, hidden: false, uses: increment(p.uses || 0) }, { merge: true }));
        run(setDoc(doc(db, 'produtos', pid), { name: p.name, cat: p.cat || cat, hidden: true, renamedTo: key }, { merge: true }));
      }
      return { name, cat };
    };
    $('pp-save').onclick = () => { if (save()) { toast('Guardado'); done(); } };
    if (!inList) $('pp-add').onclick = () => { const r = save(); if (!r) return; addItem(r.name, r.cat); done(); };
    $('pp-del').onclick = () => {
      if (!armed) { armed = true; $('pp-del').textContent = 'Tocar de novo para esconder'; return; }
      run(setDoc(doc(db, 'produtos', pid), { name: p.name, cat: p.cat || cat, hidden: true, renamedTo: null }, { merge: true })); toast('Escondido. Podes voltar a mostrá-lo no fim do catálogo.'); done();
    };
  });
}
function newProduct() {
  let cat = 'merc';
  openSheet(`<h3>Novo produto</h3>
    <div class="field"><label for="np-name">Nome como o compras</label><input id="np-name" placeholder="ex.: Iogurte líquido Mimosa morango"></div>
    <div class="field"><span class="l">Secção</span>${catGrid(cat)}</div>
    <div class="row"><button class="btn ghost" id="np-cancel">Cancelar</button><button class="btn" id="np-save">Guardar</button></div>`, root => {
    bindCatGrid(root, v => cat = v);
    $('np-name').addEventListener('input', e => { const g = dictCat(e.target.value); if (g) { cat = g; root.querySelectorAll('[data-pick]').forEach(x => x.setAttribute('aria-pressed', x.dataset.pick === g)); } });
    $('np-cancel').onclick = openCatalog;
    $('np-save').onclick = () => {
      const name = cap($('np-name').value.trim()); if (!name) return;
      run(setDoc(doc(db, 'produtos', keyOf(name)), { name, cat, hidden: false, uses: increment(0) }, { merge: true }));
      toast('Juntado ao catálogo'); openCatalog();
    };
    $('np-name').focus();
  });
}
function habBody() {
  const all = Object.values(prods).filter(p => p.name && !p.hidden && (p.uses || 0) > 0).sort((a, b) => (b.uses || 0) - (a.uses || 0));
  const inList = new Set(items.filter(i => !i.done).map(i => i.key));
  return all.length ? all.map(p => `<button class="hab" data-hk="${esc(p.id)}" data-lp="prod:${esc(p.id)}" aria-pressed="${inList.has(p.id)}"><span class="dot" style="${cc(p.cat)}"></span><span class="name">${esc(p.name)}</span><span class="uses">${(p.pdUrl ? 'PD ' : '') + (p.ctUrl ? 'CT ' : '')}${p.uses || 0}×</span></button>`).join('') : '<p class="hint">Ainda não há produtos. Adiciona o primeiro na lista.</p>';
}
function toggleProduct(name, cat) {
  const key = keyOf(name), it = items.find(i => i.key === key && !i.done);
  if (it) { run(deleteDoc(doc(itemsCol(), it.id))); return false; }
  addItem(name, cat); return true;
}
function openHabituais() {
  openSheet(`<h3>Produtos habituais</h3>
    <p class="hint">Toca para pôr na lista “${esc(curList() ? curList().name : '')}” ou tirar. Mantém o dedo em cima para editar a secção ou juntar os links do Pingo Doce e do Continente.</p>
    <div id="hab-body">${habBody()}</div>
    <button class="btn" id="hab-done">Fechar</button>`, () => {
    $('hab-done').onclick = closeSheet;
    $('hab-body').addEventListener('click', e => {
      const b = e.target.closest('[data-hk]'); if (!b) return;
      const p = prods[b.dataset.hk]; if (!p || !curId) return;
      b.setAttribute('aria-pressed', toggleProduct(p.name, p.cat));
    });
  });
}
function openAlertas() {
  openSheet(`<h3>Alertas de preço</h3>
    <p class="hint">Compras no Pingo Doce. A app avisa quando o Continente compensa, se acontecer uma destas coisas:</p>
    <div class="field"><label for="al-eur">Poupança total na lista de pelo menos (€)</label><input id="al-eur" type="number" inputmode="decimal" min="0" step="0.5" value="${cfg.minEuros}"></div>
    <div class="field"><label for="al-pct">Ou um produto mais barato pelo menos (%)</label><input id="al-pct" type="number" inputmode="numeric" min="0" max="90" step="1" value="${cfg.minPct}"></div>
    <p class="hint">Os preços são os das lojas online e são verificados uma vez por dia, só para produtos com link guardado.</p>
    <button class="btn" id="al-save">Guardar</button>`, () => {
    $('al-save').onclick = () => {
      const minEuros = Math.max(0, parseFloat($('al-eur').value.replace(',', '.')) || 0), minPct = Math.max(0, parseFloat($('al-pct').value) || 0);
      run(setDoc(doc(db, 'config', 'alertas'), { minEuros, minPct }, { merge: true })); closeSheet(); toast('Alertas guardados');
    };
  });
}
function openMenu() {
  openSheet(`<h3>Compras</h3><div class="menu">
    <button class="mi" data-m="hab">Produtos habituais<span class="sub">${Object.keys(prods).length} guardados · links e preços</span></button>
    <button class="mi" data-m="al">Alertas de preço<span class="sub">${eur(cfg.minEuros)} na lista ou −${cfg.minPct}% num produto</span></button>
    <button class="mi" data-m="lists">Listas<span class="sub">Criar, mudar o nome ou apagar</span></button>
    <button class="mi" data-m="out">Sair<span class="sub">${esc(user && user.email)}</span></button></div>`, root => {
    root.querySelectorAll('[data-m]').forEach(b => b.onclick = () => {
      const m = b.dataset.m;
      if (m === 'hab') openHabituais(); else if (m === 'al') openAlertas(); else if (m === 'lists') manageLists();
      else { closeSheet(); signOut(auth); }
    });
  });
}
function manageLists() {
  const L = curList(); let armed = false;
  openSheet(`<h3>Listas</h3>
    <div class="field"><label for="nl-name">Nova lista</label><div class="row"><input id="nl-name" placeholder="ex.: Semana, Festa, Farmácia" style="flex:3"><button class="btn" id="nl-add">Criar</button></div></div>
    ${L ? `<div class="field"><label for="rn-name">Nome da lista atual</label><div class="row"><input id="rn-name" value="${esc(L.name)}" style="flex:3"><button class="btn ghost" id="rn-save">Mudar</button></div></div>
    <button class="btn danger" id="dl">Apagar “${esc(L.name)}”</button>` : ''}`, () => {
    $('nl-add').onclick = async () => {
      const n = cap($('nl-name').value.trim()); if (!n) return;
      const ref = doc(collection(db, 'lists')); closeSheet();
      await run(setDoc(ref, { name: n, createdAt: Date.now() })); selectList(ref.id);
    };
    $('nl-name').onkeydown = e => { if (e.key === 'Enter') $('nl-add').click(); };
    if (!L) return;
    $('rn-save').onclick = () => { const n = cap($('rn-name').value.trim()); if (!n) return; run(updateDoc(doc(db, 'lists', L.id), { name: n })); closeSheet(); };
    $('dl').onclick = async () => {
      if (!armed) { armed = true; $('dl').textContent = `Apagar a lista e ${items.length} produtos? Tocar de novo`; return; }
      closeSheet();
      const snap = await getDocs(collection(db, 'lists', L.id, 'items'));
      const b = writeBatch(db); snap.docs.forEach(d => b.delete(d.ref)); b.delete(doc(db, 'lists', L.id));
      await run(b.commit());
      if (unsubItems) { unsubItems(); unsubItems = null; }
      const next = lists.find(l => l.id !== L.id); curId = null; items = [];
      if (next) selectList(next.id); else render();
    };
  });
}

/* ---------- eventos ---------- */
$('add-form').addEventListener('submit', e => {
  e.preventDefault(); const inp = $('add-input');
  if (selIdx >= 0 && suggList[selIdx]) { const { qty } = parse(inp.value); addItem((qty ? qty + ' ' : '') + suggList[selIdx].name, suggList[selIdx].cat); }
  else addItem(inp.value);
  inp.value = ''; selIdx = -1; showSugg();
});
$('add-input').addEventListener('input', () => { selIdx = -1; showSugg(); });
$('add-input').addEventListener('focus', showSugg);
$('add-input').addEventListener('blur', () => setTimeout(() => { if (document.activeElement !== $('add-input')) $('sugg').hidden = true; }, 150));
$('add-input').addEventListener('keydown', e => {
  if (!suggList.length) return;
  if (e.key === 'ArrowDown') { e.preventDefault(); selIdx = (selIdx + 1) % suggList.length; showSugg(); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); selIdx = selIdx <= 0 ? suggList.length - 1 : selIdx - 1; showSugg(); }
  else if (e.key === 'Escape') $('sugg').hidden = true;
});
$('sugg').addEventListener('mousedown', e => e.preventDefault());
$('sugg').addEventListener('click', e => {
  const s = e.target.closest('[data-sugg]'), qk = e.target.closest('[data-quick]');
  if (s) { const it = suggList[+s.dataset.sugg], { qty } = parse($('add-input').value); addItem((qty ? qty + ' ' : '') + it.name, it.cat); $('add-input').value = ''; }
  else if (qk) { const p = prods[qk.dataset.quick]; if (p) addItem(p.name, p.cat); }
  selIdx = -1; $('add-input').focus(); showSugg();
});
document.addEventListener('click', e => {
  const t = e.target.closest('[data-tick],[data-edit],[data-list],[data-act]'); if (!t) return;
  if (t.dataset.tick) toggle(t.dataset.tick);
  else if (t.dataset.edit) editItem(t.dataset.edit);
  else if (t.dataset.list) selectList(t.dataset.list);
  else if (t.dataset.act === 'lists') manageLists();
  else if (t.dataset.act === 'menu') openMenu();
  else if (t.dataset.act === 'clear') clearDone();
  else if (t.dataset.act === 'catalog') openCatalog();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });


/* ---------- manter o dedo = editar ---------- */
let lpTimer = null, lpFired = false, lpXY = null;
document.addEventListener('pointerdown', e => {
  const t = e.target.closest('[data-lp]'); lpFired = false; clearTimeout(lpTimer); if (!t) return;
  lpXY = [e.clientX, e.clientY];
  lpTimer = setTimeout(() => {
    lpFired = true; try { navigator.vibrate && navigator.vibrate(25); } catch (er) { }
    const [k, id] = t.dataset.lp.split(':');
    if (k === 'prod' && prods[id]) editProduct(id, { back: $('hab-body') ? openHabituais : null }); else if (k === 'item') editItem(id);
    else if (k === 'cat') editProduct(id, { name: t.dataset.pk, cat: t.dataset.pc, back: openCatalog });
  }, 500);
}, { passive: true });
document.addEventListener('pointermove', e => { if (lpXY && Math.hypot(e.clientX - lpXY[0], e.clientY - lpXY[1]) > 10) clearTimeout(lpTimer); }, { passive: true });
['pointerup', 'pointercancel'].forEach(ev => document.addEventListener(ev, () => clearTimeout(lpTimer), { passive: true }));
document.addEventListener('click', e => { if (lpFired) { lpFired = false; e.preventDefault(); e.stopPropagation(); } }, true);
document.addEventListener('contextmenu', e => { if (e.target.closest('[data-lp]')) e.preventDefault(); });
/* ---------- login ---------- */
const AUTH_ERR = { 'auth/invalid-credential': 'E-mail ou palavra-passe errados.', 'auth/wrong-password': 'Palavra-passe errada.', 'auth/user-not-found': 'Não há conta com este e-mail.', 'auth/invalid-email': 'O e-mail não é válido.', 'auth/too-many-requests': 'Demasiadas tentativas. Espera uns minutos.', 'auth/network-request-failed': 'Sem ligação à internet.' };
$('login-form').addEventListener('submit', async e => {
  e.preventDefault(); $('li-err').textContent = ''; $('li-btn').disabled = true;
  try { await signInWithEmailAndPassword(auth, $('li-email').value.trim(), $('li-pass').value); }
  catch (err) { $('li-err').textContent = AUTH_ERR[err.code] || 'Não foi possível entrar. Tenta outra vez.'; }
  $('li-btn').disabled = false;
});
$('li-reset').addEventListener('click', async () => {
  const em = $('li-email').value.trim();
  if (!em) { $('li-err').textContent = 'Escreve primeiro o teu e-mail.'; return; }
  try { await sendPasswordResetEmail(auth, em); $('li-err').textContent = ''; toast('Enviámos um e-mail para mudares a palavra-passe.'); }
  catch (err) { $('li-err').textContent = AUTH_ERR[err.code] || 'Não foi possível enviar o e-mail.'; }
});

function stopAll() { unsub.forEach(f => f()); unsub = []; if (unsubItems) unsubItems(); unsubItems = null; lists = []; items = []; prods = {}; listsLoaded = false; itemsLoaded = false; }
onAuthStateChanged(auth, u => {
  user = u; stopAll(); closeSheet();
  $('login-view').hidden = !!u; $('app-view').hidden = !u;
  if (!u) return;
  note('');
  unsub.push(onSnapshot(query(collection(db, 'lists'), orderBy('createdAt')), s => {
    lists = s.docs.map(d => ({ id: d.id, ...d.data() }));
    listsLoaded = true;
    if (lists.length && !lists.find(l => l.id === curId)) selectList(lists[0].id);
    else if (curId && !unsubItems && lists.find(l => l.id === curId)) selectList(curId);
    render();
  }, e => { listsLoaded = true; onErr(e); render(); }));
  unsub.push(onSnapshot(collection(db, 'produtos'), s => { prods = {}; s.docs.forEach(d => { const x = d.data(); prods[d.id] = { id: d.id, ...x, cat: normCat(x.cat, x.name) }; }); render(); }, onErr));
  unsub.push(onSnapshot(doc(db, 'config', 'alertas'), s => { if (s.exists()) cfg = { minEuros: 10, minPct: 30, ...s.data() }; render(); }, () => { }));
});
