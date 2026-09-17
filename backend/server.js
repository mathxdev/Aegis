const express = require("express");
const path = require("path");

const app = express();

const PORT = 3000;

app.use(express.json());

app.use(express.static(path.join(__dirname, "../frontend")));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

// Rota de teste do backend
app.get("/api/teste", (req, res) => {
    res.json({
        mensagem: "Backend do Aegis funcionando!"
    });
});

// Rota de cadastro
app.post("/api/cadastro", (req, res) => {

    const { nome, usuario, senha } = req.body;

    console.log("Novo cadastro recebido:");
    console.log("Nome:", nome);
    console.log("Usuário:", usuario);
    console.log("Senha:", senha);

    res.json({
        sucesso: true,
        mensagem: "Cadastro recebido pelo servidor!"
    });
});

app.listen(PORT, () => {
    console.log(`Servidor Aegis rodando em http://localhost:${PORT}`);
});