require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
app.use(cors());
app.use(express.json());

const BIN_ID = process.env.JSONBIN_BIN_ID;
const API_KEY = process.env.JSONBIN_KEY;
const ADMIN_PASS = process.env.ADMIN_PASS || "123";

// Cores disponíveis
const ALL_COLORS = ["Rosa","Azul","Roxo","Verde","Amarelo","Preto","Vermelho","Branco"];
let fallbackCoresData = []; // pessoas sorteadas

// Função auxiliar para ler JSONBin (opcional)
async function readJSONBin() {
  if (!BIN_ID || !API_KEY) return { pessoas: [] };
  const r = await axios.get(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
    headers: { "X-Master-Key": API_KEY }
  });
  return r.data.record || { pessoas: [] };
}

// Função auxiliar para salvar JSONBin (opcional)
async function writeJSONBin(data) {
  if (!BIN_ID || !API_KEY) return true;
  await axios.put(`https://api.jsonbin.io/v3/b/${BIN_ID}`, data, {
    headers: { "X-Master-Key": API_KEY, "Content-Type": "application/json" }
  });
  return true;
}

// ---------------------
// ROTAS
// ---------------------

// Retorna estado atual
app.get("/state", async (req, res) => {
  try {
    if (BIN_ID && API_KEY) {
      const data = await readJSONBin();
      fallbackCoresData = data.pessoas || [];
    }
    res.json({ pessoas: fallbackCoresData });
  } catch {
    res.json({ pessoas: fallbackCoresData });
  }
});

// Sortear cor
app.post("/draw", async (req, res) => {
  const nome = (req.body.nome || "").trim();
  if (!nome) return res.status(400).json({ ok:false, mensagem:"Nome inválido." });

  // Evitar duplicados
  if (fallbackCoresData.find(p => p.nome.toLowerCase() === nome.toLowerCase())) {
    const cor = fallbackCoresData.find(p => p.nome.toLowerCase() === nome.toLowerCase()).cor;
    return res.json({ ok:true, mensagem:`${nome}, você já recebeu: ${cor}`, cor });
  }

  // Cores restantes
  const usadas = fallbackCoresData.map(p => p.cor);
  const restantes = ALL_COLORS.filter(c => !usadas.includes(c));
  if (restantes.length === 0) return res.status(400).json({ ok:false, mensagem:"Todas as cores já foram sorteadas." });

  const sorteada = restantes[Math.floor(Math.random()*restantes.length)];
  const pessoa = { nome, cor: sorteada, at: new Date().toISOString() };
  fallbackCoresData.push(pessoa);

  // Salvar no JSONBin se configurado
  if (BIN_ID && API_KEY) await writeJSONBin({ pessoas: fallbackCoresData });

  res.json({ ok:true, nome, cor: sorteada, mensagem:`${nome}, sua cor é: ${sorteada}` });
});

// Resetar sorteio
app.post("/reset", async (req, res) => {
  const senha = req.body.senha;
  if (senha !== ADMIN_PASS) return res.json({ ok:false, mensagem:"Senha incorreta." });
  fallbackCoresData = [];
  if (BIN_ID && API_KEY) await writeJSONBin({ pessoas: [] });
  res.json({ ok:true, mensagem:"Sorteio resetado!" });
});

// ---------------------
// INICIAR SERVIDOR
// ---------------------
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log("API rodando na porta " + PORT));
