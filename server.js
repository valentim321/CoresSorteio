require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// Variáveis de ambiente obrigatórias
const BIN_ID = process.env.JSONBIN_BIN_ID;
const API_KEY = process.env.JSONBIN_KEY;

// Fallback local caso a API esteja offline
let fallbackCores = ["Rosa", "Azul", "Roxo", "Verde", "Amarelo", "Preto", "Vermelho", "Branco"];

// -------------------------
//   ROTAS DA API
// -------------------------

// GET → Listar cores
app.get("/cores", async (req, res) => {
  try {
    if (!BIN_ID || !API_KEY) {
      console.warn("JSONBin não configurado. Usando fallback local.");
      return res.json({ source: "fallback", cores: fallbackCores });
    }

    const response = await axios.get(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
      headers: { "X-Master-Key": API_KEY }
    });

    const cores = response.data.record || fallbackCores;

    res.json({ source: "jsonbin", cores });
  } catch (err) {
    console.warn("API inacessível — usando fallback local.");
    res.json({ source: "fallback", cores: fallbackCores });
  }
});

// POST → Salvar cores
app.post("/cores", async (req, res) => {
  const novasCores = req.body.cores;

  if (!Array.isArray(novasCores)) {
    return res.status(400).json({ error: "O campo 'cores' deve ser um array." });
  }

  try {
    if (!BIN_ID || !API_KEY) {
      console.warn("JSONBin não configurado. Salvando no fallback.");
      fallbackCores = novasCores;
      return res.json({ source: "fallback", saved: true });
    }

    await axios.put(
      `https://api.jsonbin.io/v3/b/${BIN_ID}`,
      novasCores,
      {
        headers: {
          "X-Master-Key": API_KEY,
          "Content-Type": "application/json"
        }
      }
    );

    res.json({ source: "jsonbin", saved: true });
  } catch (err) {
    console.warn("Erro ao salvar no JSONBin — salvando no fallback.");
    fallbackCores = novasCores;
    res.json({ source: "fallback", saved: true });
  }
});

// -------------------------
//   INICIAR SERVIDOR
// -------------------------

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log("API rodando na porta " + PORT);
});
