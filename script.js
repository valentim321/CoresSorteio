const API_BASE = '[https://coressorteio-1.onrender.com](https://coressorteio-1.onrender.com)';

const ALL_COLORS = ["Rosa","Azul","Roxo","Verde","Amarelo","Preto","Vermelho","Branco"];

const el = {
nome: document.getElementById('nome'),
drawBtn: document.getElementById('drawBtn'),
resetBtn: document.getElementById('resetBtn'),
resultBox: document.getElementById('resultBox'),
restam: document.getElementById('restam'),
contagem: document.getElementById('contagem'),
usedList: document.getElementById('usedList'),
tabela: document.getElementById('tabela'),
alertArea: document.getElementById('alertArea'),
};

function showAlert(msg, type='info') {
el.alertArea.style.display = 'block';
el.alertArea.textContent = msg;
el.alertArea.style.background = type==='warn'?'rgba(255,189,89,0.12)':'rgba(0,0,0,0.25)';
}

function hideAlert() { el.alertArea.style.display='none'; el.alertArea.textContent=''; }

function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g, c=>({ '&':'&','<':'<','>':'>','"':'"',"'":''' })[c]); }

async function fetchState() {
try {
const res = await fetch(`${API_BASE}/state`);
if(!res.ok) throw new Error('Erro API');
const data = await res.json();
if(!Array.isArray(data.pessoas)) data.pessoas = data; // fallback se API retornar só array
return data.pessoas || [];
} catch(e) {
console.warn(e);
showAlert('API inacessível!', 'warn');
return [];
}
}

async function draw() {
hideAlert();
const nome = el.nome.value.trim();
if(!nome){ showAlert('Digite seu nome.', 'warn'); return; }

try {
const res = await fetch(`${API_BASE}/draw`, {
method:'POST',
headers:{'Content-Type':'application/json'},
body: JSON.stringify({ nome })
});
const data = await res.json();
if(!data.ok){ showAlert(data.mensagem || 'Erro no sorteio','warn'); return; }

```
showAlert(data.mensagem || `Sua cor é ${data.cor}`);
renderUI(await fetchState());
```

} catch(e){
console.error(e);
showAlert('Erro ao comunicar com a API', 'warn');
}
}

async function resetAll() {
const senha = prompt('Senha de admin para resetar:');
if(!senha) return;
try {
const res = await fetch(`${API_BASE}/reset`, {
method:'POST',
headers:{'Content-Type':'application/json'},
body: JSON.stringify({ senha })
});
const data = await res.json();
showAlert(data.mensagem || 'Reset feito');
renderUI(await fetchState());
} catch(e){
console.error(e);
showAlert('Erro ao resetar', 'warn');
}
}

function renderUI(pessoas) {
el.tabela.innerHTML = pessoas.map(p=>`<tr><td>${escapeHtml(p.nome)}</td><td>${escapeHtml(p.cor)}</td></tr>`).join('');
el.usedList.innerHTML='';
pessoas.forEach(p=>{
const chip = document.createElement('span');
chip.className='chip';
chip.textContent=p.cor;
chip.style.background=p.cor.toLowerCase()==='branco'?'#fff':p.cor.toLowerCase();
chip.style.color=p.cor.toLowerCase()==='branco'?'#000':'#fff';
chip.style.padding='6px 10px';
chip.style.borderRadius='999px';
chip.style.marginRight='6px';
chip.style.display='inline-block';
el.usedList.appendChild(chip);
});

const usadas = pessoas.map(p=>p.cor);
const restantes = ALL_COLORS.filter(c=>!usadas.includes(c));
el.restam.textContent=`Restam: ${restantes.length}`;
el.contagem.textContent=`Sorteados: ${pessoas.length} / ${ALL_COLORS.length}`;

const last = pessoas.length?pessoas[pessoas.length-1]:null;
if(last){
el.resultBox.textContent=`${last.nome} → ${last.cor}`;
el.resultBox.style.background=last.cor.toLowerCase()==='branco'?'#fff':last.cor.toLowerCase();
} else {
el.resultBox.textContent='Nenhuma cor sorteada ainda';
el.resultBox.style.background='';
}
}

el.drawBtn.addEventListener('click', draw);
el.resetBtn.addEventListener('click', resetAll);

(async ()=>{
renderUI(await fetchState());
})();
