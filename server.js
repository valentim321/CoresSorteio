require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const BIN_ID = process.env.JSONBIN_BIN_ID;
const API_KEY = process.env.JSONBIN_KEY;

const PORT = process.env.PORT || 3001;

// Funções para ler/escrever JSONBin
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

// GET → Lista pessoas/cor
app.get("/state", async (req, res) => {
  const data = await readBin();
  res.json(data);
});

// POST → Sorteio
app.post("/draw", async (req, res) => {
  const nome = (req.body.nome || "").trim();
  if (!nome) return res.status(400).json({ ok:false, mensagem:"Nome inválido" });

  const data = await readBin();
  const ALL_COLORS = ["Rosa","Azul","Roxo","Verde","Amarelo","Preto","Vermelho","Branco"];
  const usadas = data.pessoas.map(p => p.cor);
  const restantes = ALL_COLORS.filter(c => !usadas.includes(c));

  if (restantes.length === 0) return res.json({ ok:false, mensagem:"Todas as cores já foram sorteadas" });

  // Evita duplicar nomes
  const existe = data.pessoas.find(p => p.nome.toLowerCase() === nome.toLowerCase());
  if (existe) return res.json({ ok:true, mensagem:`${nome} já recebeu: ${existe.cor}`, cor: existe.cor });

  const sorteada = restantes[Math.floor(Math.random() * restantes.length)];
  data.pessoas.push({ nome, cor: sorteada, at: new Date().toISOString() });

  await writeBin(data);
  res.json({ ok:true, mensagem:`${nome}, sua cor é: ${sorteada}`, cor: sorteada });
});

// POST → Reset (admin)
const ADMIN_PASS = process.env.ADMIN_PASS || "123";
app.post("/reset", async (req, res) => {
  if ((req.body.senha || "") !== ADMIN_PASS) return res.json({ ok:false, mensagem:"Senha incorreta" });
  const data = { pessoas: [] };
  await writeBin(data);
  res.json({ ok:true, mensagem:"Sorteio resetado" });
});

// Inicia servidor
app.listen(PORT, () => console.log("API rodando na porta", PORT));
