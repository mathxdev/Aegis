const express = require("express");
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcrypt");
const session = require("express-session");

const app = express();

const PORT = 3000;

const caminhoUsuarios = path.join(
    __dirname,
    "../data/usuarios.json"
);

app.use(express.json());

app.use(
    session({
        secret: "aegis-chave-secreta",
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            maxAge: 1000 * 60 * 60
        }
    })
);

app.use(
    express.static(
        path.join(__dirname, "../frontend")
    )
);

app.get("/", (req, res) => {
    res.sendFile(
        path.join(__dirname, "../frontend/index.html")
    );
});

// ROTA DE TESTE

app.get("/api/teste", (req, res) => {
    res.json({
        mensagem: "Backend do Aegis funcionando!"
    });
});

// ROTA DE CADASTRO

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
            fs.readFileSync(
                caminhoUsuarios,
                "utf8"
            )
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
        const senhaHash = await bcrypt.hash(
            senha,
            10
        );

        // Cria o novo usuário
        const novoUsuario = {
            nome: nome,
            usuario: usuario,
            senha: senhaHash
        };

        // Adiciona o usuário
        usuarios.push(novoUsuario);

        // Salva no arquivo
        fs.writeFileSync(
            caminhoUsuarios,
            JSON.stringify(
                usuarios,
                null,
                4
            )
        );

        console.log(
            "Novo usuário cadastrado:",
            usuario
        );

        res.status(201).json({
            sucesso: true,
            mensagem: "Cadastro realizado com sucesso!"
        });

    } catch (erro) {

        console.error(
            "Erro no cadastro:",
            erro
        );

        res.status(500).json({
            sucesso: false,
            mensagem: "Erro interno do servidor."
        });
    }
});

// ROTA DE LOGIN

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
            fs.readFileSync(
                caminhoUsuarios,
                "utf8"
            )
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

        // CRIA A SESSÃO

        req.session.usuario = {
            nome: usuarioEncontrado.nome,
            usuario: usuarioEncontrado.usuario
        };

        console.log(
            "Login realizado:",
            usuario
        );

        res.json({
            sucesso: true,
            mensagem: "Login realizado com sucesso!"
        });

    } catch (erro) {

        console.error(
            "Erro no login:",
            erro
        );

        res.status(500).json({
            sucesso: false,
            mensagem: "Erro interno do servidor."
        });
    }
});

// ==========================================
// VERIFICAÇÃO DA SESSÃO
// ==========================================

app.get("/api/sessao", (req, res) => {

    if (!req.session.usuario) {
        return res.status(401).json({
            autenticado: false,
            mensagem: "Usuário não autenticado."
        });
    }

    res.json({
        autenticado: true,
        usuario: req.session.usuario
    });

});

// ==========================================
// LOGOUT
// ==========================================

app.post("/api/logout", (req, res) => {

    req.session.destroy((erro) => {

        if (erro) {
            console.error(
                "Erro ao encerrar sessão:",
                erro
            );

            return res.status(500).json({
                sucesso: false,
                mensagem: "Erro ao sair."
            });
        }

        res.json({
            sucesso: true,
            mensagem: "Sessão encerrada."
        });
    });

});

// INICIA O SERVIDOR

app.listen(PORT, () => {

    console.log(
        `Servidor Aegis rodando em http://localhost:${PORT}`
    );

});