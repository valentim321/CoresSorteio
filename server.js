require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(express.json());

// -------------------------
// Configuração CORS
// -------------------------
const allowedOrigins = [
'[https://sorteiocoresparaduda-8yli5m0l3-felipes-projects-24be3758.vercel.app](https://sorteiocoresparaduda-8yli5m0l3-felipes-projects-24be3758.vercel.app)', // seu front-end
'http://localhost:3000'
];
app.use(cors({
origin: function(origin, callback){
if(!origin) return callback(null, true); // Postman ou curl
if(allowedOrigins.indexOf(origin) === -1){
return callback(new Error('CORS não permitido para esta origem'), false);
}
return callback(null, true);
}
}));

// -------------------------
// Variáveis de ambiente
// -------------------------
const BIN_ID = '6928d33cae596e708f752cc8';
const API_KEY = '$2a$10$LhlSt08i/EIi8Sm/8Ynd5eb2Ucm72IvxP95aIRFZ/X5fJnXTdWIsW';
const ADMIN_PASS = '123';
const PORT = process.env.PORT || 3001;

// -------------------------
// Funções JSONBin
// -------------------------
async function readBin() {
try {
const res = await axios.get(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
headers: { "X-Master-Key": API_KEY }
});
return res.data.record || { pessoas: [] };
} catch (err) {
console.warn("Falha ao ler JSONBin", err.message);
return { pessoas: [] };
}
}

async function writeBin(data) {
try {
await axios.put(`https://api.jsonbin.io/v3/b/${BIN_ID}`, data, {
headers: { "X-Master-Key": API_KEY, "Content-Type": "application/json" }
});
return true;
} catch (err) {
console.warn("Falha ao escrever JSONBin", err.message);
return false;
}
}

// -------------------------
// Rotas da API
// -------------------------

// GET /state → retorna lista de pessoas
app.get("/state", async (req, res) => {
const data = await readBin();
res.json(data);
});

// POST /draw → sorteia uma cor
app.post("/draw", async (req, res) => {
const nome = (req.body.nome || "").trim();
if (!nome) return res.status(400).json({ ok:false, mensagem:"Nome inválido" });

const data = await readBin();
const ALL_COLORS = ["Rosa","Azul","Roxo","Verde","Amarelo","Preto","Vermelho","Branco"];
const usadas = data.pessoas.map(p => p.cor);
const restantes = ALL_COLORS.filter(c => !usadas.includes(c));

if (restantes.length === 0) return res.json({ ok:false, mensagem:"Todas as cores já foram sorteadas" });

const existe = data.pessoas.find(p => p.nome.toLowerCase() === nome.toLowerCase());
if (existe) return res.json({ ok:true, mensagem:`${nome} já recebeu: ${existe.cor}`, cor: existe.cor });

const sorteada = restantes[Math.floor(Math.random() * restantes.length)];
data.pessoas.push({ nome, cor: sorteada, at: new Date().toISOString() });

const ok = await writeBin(data);
if (!ok) return res.status(500).json({ ok:false, mensagem:"Erro ao salvar no JSONBin" });

res.json({ ok:true, mensagem:`${nome}, sua cor é: ${sorteada}`, cor: sorteada });
});

// POST /reset → reseta sorteio (admin)
app.post("/reset", async (req, res) => {
if ((req.body.senha || "") !== ADMIN_PASS) return res.json({ ok:false, mensagem:"Senha incorreta" });
const data = { pessoas: [] };
const ok = await writeBin(data);
if (!ok) return res.status(500).json({ ok:false, mensagem:"Erro ao resetar JSONBin" });
res.json({ ok:true, mensagem:"Sorteio resetado" });
});

// -------------------------
// Iniciar servidor
// -------------------------
app.listen(PORT, () => console.log(`API rodando na porta ${PORT}`));
