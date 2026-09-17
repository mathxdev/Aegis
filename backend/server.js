const express = require("express");
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcrypt");

const app = express();

const PORT = 3000;

const caminhoUsuarios = path.join(
    __dirname,
    "../data/usuarios.json"
);

app.use(express.json());

app.use(express.static(path.join(__dirname, "../frontend")));

app.get("/", (req, res) => {
    res.sendFile(
        path.join(__dirname, "../frontend/index.html")
    );
});

// Rota de teste do backend
app.get("/api/teste", (req, res) => {
    res.json({
        mensagem: "Backend do Aegis funcionando!"
    });
});

// Rota de cadastro
app.post("/api/cadastro", async (req, res) => {

    try {

        const { nome, usuario, senha } = req.body;

        // Verifica se todos os campos foram enviados
        if (!nome || !usuario || !senha) {
            return res.status(400).json({
                sucesso: false,
                mensagem: "Preencha todos os campos."
            });
        }

        // Lê os usuários existentes
        const usuarios = JSON.parse(
            fs.readFileSync(caminhoUsuarios, "utf8")
        );

        // Verifica se o usuário já existe
        const usuarioExiste = usuarios.find(
            (item) => item.usuario === usuario
        );

        if (usuarioExiste) {
            return res.status(409).json({
                sucesso: false,
                mensagem: "Esse usuário já existe."
            });
        }

        // Cria o hash da senha
        const senhaHash = await bcrypt.hash(senha, 10);

        // Cria o novo usuário
        const novoUsuario = {
            nome: nome,
            usuario: usuario,
            senha: senhaHash
        };

        // Adiciona o usuário à lista
        usuarios.push(novoUsuario);

        // Salva no arquivo
        fs.writeFileSync(
            caminhoUsuarios,
            JSON.stringify(usuarios, null, 4)
        );

        console.log("Novo usuário cadastrado:", usuario);

        res.status(201).json({
            sucesso: true,
            mensagem: "Cadastro realizado com sucesso!"
        });

    } catch (erro) {

        console.error("Erro no cadastro:", erro);

        res.status(500).json({
            sucesso: false,
            mensagem: "Erro interno do servidor."
        });
    }
});

// Rota de login
app.post("/api/login", async (req, res) => {

    try {

        const { usuario, senha } = req.body;

        // Verifica se os campos foram enviados
        if (!usuario || !senha) {
            return res.status(400).json({
                sucesso: false,
                mensagem: "Informe usuário e senha."
            });
        }

        // Lê os usuários cadastrados
        const usuarios = JSON.parse(
            fs.readFileSync(caminhoUsuarios, "utf8")
        );

        // Procura o usuário
        const usuarioEncontrado = usuarios.find(
            (item) => item.usuario === usuario
        );

        // Usuário não encontrado
        if (!usuarioEncontrado) {
            return res.status(401).json({
                sucesso: false,
                mensagem: "Usuário ou senha incorretos."
            });
        }

        // Compara a senha digitada
        // com o hash salvo
        const senhaCorreta = await bcrypt.compare(
            senha,
            usuarioEncontrado.senha
        );

        // Senha incorreta
        if (!senhaCorreta) {
            return res.status(401).json({
                sucesso: false,
                mensagem: "Usuário ou senha incorretos."
            });
        }

        // Login realizado
        console.log("Login realizado:", usuario);

        res.json({
            sucesso: true,
            mensagem: "Login realizado com sucesso!"
        });

    } catch (erro) {

        console.error("Erro no login:", erro);

        res.status(500).json({
            sucesso: false,
            mensagem: "Erro interno do servidor."
        });
    }
});

app.listen(PORT, () => {
    console.log(
        `Servidor Aegis rodando em http://localhost:${PORT}`
    );
});