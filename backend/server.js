const express = require("express");
const path = require("path");
const bcrypt = require("bcrypt");
const session = require("express-session");
const { Pool } = require("pg");
const { ok } = require("assert");

const app = express();

const PORT = process.env.PORT || 3000;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : false
});

async function inicializarBanco() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id SERIAL PRIMARY KEY,
                nome VARCHAR(100) NOT NULL,
                usuario VARCHAR(50) NOT NULL UNIQUE,
                senha TEXT NOT NULL,
                criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS visitantes (
                id SERIAL PRIMARY KEY,
                nome VARCHAR(100) NOT NULL,
                pessoa_visitada VARCHAR(100) NOT NULL,
                motivo TEXT NOT NULL,
                data_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                registrado_por VARCHAR(50) NOT NULL
            );
        `);

        console.log("Banco de dados inicializado com sucesso.");
    } catch (erro) {
        console.error("Erro ao inicializar banco:", erro);
        process.exit(1);
    }
}

app.use(express.json());

app.use(
    session({
        secret: process.env.SESSION_SECRET || "aegis-chave-secreta",
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
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

app.get("/api/teste", (req, res) => {
    res.json({
        mensagem: "Backend do Aegis funcionando!"
    });
});

app.post("/api/cadastro", async (req, res) => {
    try {
        const { nome, usuario, senha } = req.body;

        if (!nome || !usuario || !senha) {
            return res.status(400).json({
                sucesso: false,
                mensagem: "Preencha todos os campos."
            });
        }

        const usuarioExiste = await pool.query(
            "SELECT id FROM usuarios WHERE usuario = $1",
            [usuario]
        );

        if (usuarioExiste.rows.length > 0) {
            return res.status(409).json({
                sucesso: false,
                mensagem: "Esse usuário já existe."
            });
        }

        const senhaHash = await bcrypt.hash(senha, 10);

        await pool.query(
            "INSERT INTO usuarios (nome, usuario, senha) VALUES ($1, $2, $3)",
            [nome, usuario, senhaHash]
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

app.post("/api/login", async (req, res) => {
    try {
        const { usuario, senha } = req.body;

        if (!usuario || !senha) {
            return res.status(400).json({
                sucesso: false,
                mensagem: "Informe usuário e senha."
            });
        }

        const resultado = await pool.query(
            "SELECT id, nome, usuario, senha FROM usuarios WHERE usuario = $1",
            [usuario]
        );

        if (resultado.rows.length === 0) {
            return res.status(401).json({
                sucesso: false,
                mensagem: "Usuário ou senha incorretos."
            });
        }

        const usuarioEncontrado = resultado.rows[0];

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

        req.session.usuario = {
            id: usuarioEncontrado.id,
            nome: usuarioEncontrado.nome,
            usuario: usuarioEncontrado.usuario
        };

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

app.post("/api/logout", (req, res) => {
    req.session.destroy((erro) => {
        if (erro) {
            console.error("Erro ao encerrar sessão:", erro);

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

app.post("/api/visitantes", async (req, res) => {
    try {
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

        if (!nome || !pessoaVisitada || !motivo) {
            return res.status(400).json({
                sucesso: false,
                mensagem: "Preencha todos os campos."
            });
        }

        await pool.query(
            `INSERT INTO visitantes
            (nome, pessoa_visitada, motivo, data_hora, registrado_por)
            VALUES ($1, $2, $3, NOW(), $4)`,
            [
                nome,
                pessoaVisitada,
                motivo,
                req.session.usuario.usuario
            ]
        );

        console.log("Visitante registrado:", nome);

        res.status(201).json({
            sucesso: true,
            mensagem: "Visita registrada com sucesso!"
        });
    } catch (erro) {
        console.error("Erro ao registrar visitante:", erro);

        res.status(500).json({
            sucesso: false,
            mensagem: "Erro interno do servidor."
        });
    }
});

app.get("/api/visitantes", async (req, res) => {
    try {
        if (!req.session.usuario) {
            return res.status(401).json({
                sucesso: false,
                mensagem: "Você precisa estar logado."
            });
        }

        const resultado = await pool.query(
            `SELECT
                id,
                nome,
                pessoa_visitada AS "pessoaVisitada",
                motivo,
                TO_CHAR(data_hora, 'DD/MM/YYYY HH24:MI:SS') AS "dataHora",
                registrado_por AS "registradoPor"
            FROM visitantes
            ORDER BY data_hora DESC`
        );

        res.json({
            sucesso: true,
            visitantes: resultado.rows
        });
    } catch (erro) {
        console.error("Erro ao buscar visitantes:", erro);

        res.status(500).json({
            sucesso: false,
            mensagem: "Erro interno do servidor."
        });
    }
});

inicializarBanco();

app.listen(PORT, "0.0.0.0", () => {
    console.log(
        `Servidor Aegis rodando na porta ${PORT}`
    );
});