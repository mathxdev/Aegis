const express = require("express");
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcrypt");
const session = require("express-session");

const app = express();

const PORT = 3000;

// ==========================================
// CAMINHOS DOS DADOS
// ==========================================

const caminhoUsuarios = path.join(
    __dirname,
    "../data/usuarios.json"
);

const caminhoVisitantes = path.join(
    __dirname,
    "../data/visitantes.json"
);

// ==========================================
// CONFIGURAÇÕES
// ==========================================

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

// ==========================================
// PÁGINA INICIAL
// ==========================================

app.get("/", (req, res) => {
    res.sendFile(
        path.join(__dirname, "../frontend/index.html")
    );
});

// ==========================================
// ROTA DE TESTE
// ==========================================

app.get("/api/teste", (req, res) => {

    res.json({
        mensagem: "Backend do Aegis funcionando!"
    });

});

// ==========================================
// ROTA DE CADASTRO
// ==========================================

app.post("/api/cadastro", async (req, res) => {

    try {

        const { nome, usuario, senha } = req.body;

        if (!nome || !usuario || !senha) {

            return res.status(400).json({
                sucesso: false,
                mensagem: "Preencha todos os campos."
            });

        }

        const usuarios = JSON.parse(
            fs.readFileSync(
                caminhoUsuarios,
                "utf8"
            )
        );

        const usuarioExiste = usuarios.find(
            (item) => item.usuario === usuario
        );

        if (usuarioExiste) {

            return res.status(409).json({
                sucesso: false,
                mensagem: "Esse usuário já existe."
            });

        }

        const senhaHash = await bcrypt.hash(
            senha,
            10
        );

        const novoUsuario = {
            nome: nome,
            usuario: usuario,
            senha: senhaHash
        };

        usuarios.push(novoUsuario);

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

// ==========================================
// ROTA DE REGISTRO DE VISITANTE
// ==========================================

app.post("/api/visitantes", (req, res) => {

    try {

        // Verifica se existe usuário logado
        if (!req.session.usuario) {

            return res.status(401).json({
                sucesso: false,
                mensagem: "Você precisa estar logado."
            });

        }

        const {
            nome,
            pessoaVisitada,
            motivo
        } = req.body;

        // Verifica os campos
        if (!nome || !pessoaVisitada || !motivo) {

            return res.status(400).json({
                sucesso: false,
                mensagem: "Preencha todos os campos."
            });

        }

        // Lê os visitantes existentes
        const visitantes = JSON.parse(
            fs.readFileSync(
                caminhoVisitantes,
                "utf8"
            )
        );

        // Cria o registro
        const novoVisitante = {

            nome: nome,

            pessoaVisitada: pessoaVisitada,

            motivo: motivo,

            dataHora: new Date().toLocaleString(
                "pt-BR"
            ),

            registradoPor: req.session.usuario.usuario

        };

        // Adiciona à lista
        visitantes.push(novoVisitante);

        // Salva no arquivo
        fs.writeFileSync(
            caminhoVisitantes,
            JSON.stringify(
                visitantes,
                null,
                4
            )
        );

        console.log(
            "Visitante registrado:",
            nome
        );

        res.status(201).json({
            sucesso: true,
            mensagem: "Visita registrada com sucesso!"
        });

    } catch (erro) {

        console.error(
            "Erro ao registrar visitante:",
            erro
        );

        res.status(500).json({
            sucesso: false,
            mensagem: "Erro interno do servidor."
        });

    }

});

// ==========================================
// ROTA DE LOGIN
// ==========================================

app.post("/api/login", async (req, res) => {

    try {

        const { usuario, senha } = req.body;

        if (!usuario || !senha) {

            return res.status(400).json({
                sucesso: false,
                mensagem: "Informe usuário e senha."
            });

        }

        const usuarios = JSON.parse(
            fs.readFileSync(
                caminhoUsuarios,
                "utf8"
            )
        );

        const usuarioEncontrado = usuarios.find(
            (item) => item.usuario === usuario
        );

        if (!usuarioEncontrado) {

            return res.status(401).json({
                sucesso: false,
                mensagem: "Usuário ou senha incorretos."
            });

        }

        const senhaCorreta = await bcrypt.compare(
            senha,
            usuarioEncontrado.senha
        );

        if (!senhaCorreta) {

            return res.status(401).json({
                sucesso: false,
                mensagem: "Usuário ou senha incorretos."
            });

        }

        // Cria a sessão
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

// ==========================================
// INICIA O SERVIDOR
// ==========================================

app.listen(PORT, () => {

    console.log(
        `Servidor Aegis rodando em http://localhost:${PORT}`
    );

});