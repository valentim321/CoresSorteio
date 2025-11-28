/* Static front-end for the color draw (static-site mode).
   Participants: Sandy, Daiara, Simone, Manuela, Eduarda, Rosângela, Tatiele, Sthefane
   Colors: Rosa, Azul, Roxo, Verde, Amarelo, Preto, Vermelho, Branco
   This version uses localStorage fallback. To enable a backend, set API_URL.
*/

const API_URL = "https://coressorteio-1.onrender.com"; // optional backend URL (leave empty for pure static)
const ADMIN_PASS = "123"; // change if desired (note: front-end password is public)
const PARTICIPANTES = ["Sandy","Daiara","Simone","Manuela","Eduarda","Rosângela","Tatiele","Sthefane"];
const ALL_COLORS = ['Rosa','Azul','Roxo','Verde','Amarelo','Preto','Vermelho','Branco'];
const localKey = 'sorteio_pessoas_local_v1';
const localBlockKey = 'sorteio_bloqueio_local_v1';

const el = {
  nome: document.getElementById('nome'),
  drawBtn: document.getElementById('drawBtn'),
  resetBtn: document.getElementById('resetBtn'),
  resultBox: document.getElementById('resultBox'),
  restam: document.getElementById('restam'),
  contagem: document.getElementById('contagem'),
  alertArea: document.getElementById('alertArea'),
  cfgInfo: document.getElementById('cfgInfo')
};

el.cfgInfo.textContent = 'API_URL=' + (API_URL || '(nenhuma - fallback local)') + ' | PARTICIPANTES=' + PARTICIPANTES.join(', ');

let state = { pessoas: [] };

function showAlert(msg, type='info'){
  el.alertArea.style.display = 'block';
  el.alertArea.textContent = msg;
  el.alertArea.style.background = type === 'warn' ? 'rgba(255,189,89,0.12)' : 'rgba(0,0,0,0.25)';
}
function hideAlert(){ el.alertArea.style.display = 'none'; el.alertArea.textContent = ''; }

async function apiGetState(){
  if(!API_URL) return false;
  try {
    const r = await fetch(API_URL + '/state', { method: 'GET' });
    if(!r.ok) throw new Error('HTTP '+r.status);
    const data = await r.json();
    state.pessoas = Array.isArray(data.pessoas) ? data.pessoas : (data || {}).pessoas || [];
    return true;
  } catch(e){
    console.warn('apiGetState failed', e);
    return false;
  }
}

async function apiPostDraw(nome){
  if(!API_URL) return { ok:false, error: 'No API configured' };
  try {
    const r = await fetch(API_URL + '/draw', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ nome })
    });
    const j = await r.json();
    if(r.ok){
      await apiGetState();
      return { ok:true, resp:j };
    } else {
      return { ok:false, resp:j };
    }
  } catch(e){
    console.warn('apiPostDraw failed', e);
    return { ok:false, error:e };
  }
}

async function apiPostReset(senha){
  if(!API_URL) return { ok:false, mensagem:'No API configured' };
  try {
    const r = await fetch(API_URL + '/reset', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ senha })
    });
    const j = await r.json();
    if(r.ok){
      await apiGetState();
      return { ok:true, resp:j };
    } else {
      return { ok:false, resp:j };
    }
  } catch(e){
    console.warn('apiPostReset failed', e);
    return { ok:false, mensagem: 'Erro ao falar com API' };
  }
}

function loadLocal(){
  try {
    const raw = localStorage.getItem(localKey);
    return raw ? JSON.parse(raw) : { pessoas: [] };
  } catch(e){ return { pessoas: [] }; }
}
function saveLocal(){
  try { localStorage.setItem(localKey, JSON.stringify(state)); } catch(e){}
}

function renderUI(){
  const pessoas = (state.pessoas || []).slice().sort((a,b)=>a.nome.localeCompare(b.nome));
  el.contagem.textContent = `Sorteados: ${pessoas.length} / ${ALL_COLORS.length}`;
  const usadas = pessoas.map(p=>p.cor);
  const restantes = ALL_COLORS.filter(c=>!usadas.includes(c));
  el.restam.textContent = `Restam: ${restantes.length}`;

  const last = pessoas.length? pessoas[pessoas.length-1]: null;
  if (last) {
    el.resultBox.textContent = `${escapeHtml(last.nome)} → ${escapeHtml(last.cor)}`;
    try { el.resultBox.style.background = (last.cor.toLowerCase()==='branco'? '#fff' : last.cor.toLowerCase()); } catch(e){}
  } else {
    el.resultBox.textContent = 'Nenhuma cor sorteada ainda';
    el.resultBox.style.background='';
  }
}

function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c]); }

async function init(){
  let ok = false;
  if (API_URL) ok = await apiGetState();
  if (!ok) {
    showAlert('API inacessível — usando fallback local. (Para persistência global, implante o servidor Node que eu forneço.)', 'warn');
    state = loadLocal();
  }
  renderUI();
}

async function draw(){
  hideAlert();
  const nome = el.nome.value.trim();
  if (!nome) { showAlert('Digite seu nome antes de sortear.', 'warn'); return; }
  if (!PARTICIPANTES.map(n=>n.toLowerCase()).includes(nome.toLowerCase())) {
    showAlert('Nome não está na lista de participantes autorizados.', 'warn'); return;
  }
  if (localStorage.getItem(localBlockKey)) { showAlert('Este aparelho já sorteou. Não é possível sortear novamente neste aparelho.', 'warn'); return; }

  if (API_URL) {
    const apiRes = await apiPostDraw(nome);
    if (apiRes && apiRes.ok) {
      const msg = apiRes.resp && apiRes.resp.mensagem ? apiRes.resp.mensagem : `${nome}, sua cor foi registrada.`;
      showAlert(msg);
      localStorage.setItem(localBlockKey, '1');
      renderUI();
      return;
    } else {
      console.warn('API draw failed, falling back to local', apiRes);
      showAlert('API falhou — usando fallback local.', 'warn');
    }
  }

  const exists = state.pessoas.find(p=>p.nome.toLowerCase()===nome.toLowerCase());
  if (exists) { showAlert(`${nome}, você já recebeu a cor ${exists.cor}.`); return; }
  const usadas = state.pessoas.map(p=>p.cor);
  const restantes = ALL_COLORS.filter(c=>!usadas.includes(c));
  if (restantes.length===0) { showAlert('Todas as cores já foram sorteadas.'); return; }
  const sorteada = restantes[Math.floor(Math.random()*restantes.length)];
  state.pessoas.push({ nome, cor: sorteada, at: new Date().toISOString() });
  saveLocal();
  localStorage.setItem(localBlockKey, '1');
  showAlert(`${nome}, sua cor é: ${sorteada}`);
  renderUI();
}

async function resetAll(){
  const senha = prompt('Senha de admin para resetar:');
  if (!senha) return;
  if (API_URL) {
    const resp = await apiPostReset(senha);
    if (resp.ok) {
      showAlert('Sorteio resetado (API)');
      state.pessoas = [];
      saveLocal();
      localStorage.removeItem(localBlockKey);
      renderUI();
      return;
    } else {
      showAlert('Falha reset API: ' + (resp.resp?.mensagem || resp.mensagem || 'erro'), 'warn');
      return;
    }
  }
  if (senha === ADMIN_PASS) {
    state = { pessoas: [] };
    saveLocal();
    localStorage.removeItem(localBlockKey);
    showAlert('Sorteio resetado (local).');
    renderUI();
  } else {
    showAlert('Senha incorreta.', 'warn');
  }
}

el.drawBtn.addEventListener('click', draw);
el.resetBtn.addEventListener('click', resetAll);

init();
