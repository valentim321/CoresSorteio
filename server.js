// server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// -------------------------
//   CONFIGURAÇÕES
// -------------------------

const CORES = ["Rosa","Azul","Roxo","Verde","Amarelo","Preto","Vermelho","Branco"];
const ADMIN_PASS = process.env.ADMIN_PASS || "123";

// Fallback local: lista de pessoas e cores
let state = {
  pessoas: []
};

// -------------------------
//   ROTAS DA API
// -------------------------

// GET → retorna o estado atual (para frontend)
app.get("/state", (req, res) => {
  res.json({ pessoas: state.pessoas });
});

// POST → sortear cor para um nome
app.post("/draw", (req, res) => {
  const nome = (req.body.nome || "").trim();
  if (!nome) return res.status(400).json({ ok: false, mensagem: "Nome inválido." });

  // verifica se já sorteou para esse nome
  const existe = state.pessoas.find(p => p.nome.toLowerCase() === nome.toLowerCase());
  if (existe) return res.json({ ok: true, mensagem: `${nome}, você já recebeu a cor ${existe.cor}`, cor: existe.cor });

  // cores já usadas
  const usadas = state.pessoas.map(p => p.cor);
  const restantes = CORES.filter(c => !usadas.includes(c));

  if (restantes.length === 0) return res.json({ ok: false, mensagem: "Todas as cores já foram sorteadas." });

  // sorteio aleatório
  const sorteada = restantes[Math.floor(Math.random() * restantes.length)];
  state.pessoas.push({ nome, cor: sorteada, at: new Date().toISOString() });

  res.json({ ok: true, mensagem: `${nome}, sua cor é: ${sorteada}`, cor: sorteada });
});

// POST → resetar sorteio (admin)
app.post("/reset", (req, res) => {
  const senha = req.body.senha || "";
  if (senha !== ADMIN_PASS) return res.json({ ok: false, mensagem: "Senha incorreta." });

  state = { pessoas: [] };
  res.json({ ok: true, mensagem: "Sorteio resetado!" });
});

// -------------------------
//   INICIAR SERVIDOR
// -------------------------

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("API rodando na porta " + PORT);
});
