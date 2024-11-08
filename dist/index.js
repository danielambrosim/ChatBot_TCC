"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_telegram_bot_api_1 = __importDefault(require("node-telegram-bot-api"));
const nodemailer_1 = __importDefault(require("nodemailer"));
const pg_1 = require("pg");
const bcrypt_1 = __importDefault(require("bcrypt"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config(); // Carrega as variáveis do arquivo .env
// Configurações do banco de dados
const pool = new pg_1.Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: Number(process.env.DB_PORT),
});
// Configurações de e-mail
const transporter = nodemailer_1.default.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});
// Configurações do bot
const bot = new node_telegram_bot_api_1.default(process.env.TELEGRAM_BOT_TOKEN || '', { polling: true });
var State;
(function (State) {
    State[State["NOME"] = 0] = "NOME";
    State[State["EMAIL"] = 1] = "EMAIL";
    State[State["EMAIL_VERIFICACAO"] = 2] = "EMAIL_VERIFICACAO";
    State[State["CPF"] = 3] = "CPF";
    State[State["SENHA"] = 4] = "SENHA";
    State[State["NONE"] = 5] = "NONE";
})(State || (State = {}));
let currentState = State.NONE;
let nome = '';
let email = '';
let cpf = '';
let senha = '';
let codigoConfirmacao = 0;
bot.on('message', (msg) => __awaiter(void 0, void 0, void 0, function* () {
    const chatId = msg.chat.id;
    const text = msg.text || '';
    try {
        switch (currentState) {
            case State.NONE:
                yield bot.sendMessage(chatId, 'Bem-vindo ao cadastro! Qual é o seu nome?');
                currentState = State.NOME;
                break;
            case State.NOME:
                nome = text;
                yield bot.sendMessage(chatId, 'Por favor, informe o seu e-mail:');
                currentState = State.EMAIL;
                break;
            case State.EMAIL:
                if (isValidEmail(text)) {
                    email = text;
                    codigoConfirmacao = yield enviarCodigoEmail(email);
                    yield bot.sendMessage(chatId, 'Código de confirmação enviado para o seu e-mail. Por favor, digite o código recebido:');
                    currentState = State.EMAIL_VERIFICACAO;
                }
                else {
                    yield bot.sendMessage(chatId, 'E-mail inválido. Tente novamente.');
                }
                break;
            case State.EMAIL_VERIFICACAO:
                if (parseInt(text) === codigoConfirmacao) {
                    yield bot.sendMessage(chatId, 'E-mail confirmado! Agora, informe o seu CPF ou CNPJ:');
                    currentState = State.CPF;
                }
                else {
                    yield bot.sendMessage(chatId, 'Código incorreto. Por favor, tente novamente.');
                }
                break;
            case State.CPF:
                if (isValidCPF(text)) {
                    cpf = text;
                    yield bot.sendMessage(chatId, 'Crie uma senha:');
                    currentState = State.SENHA;
                }
                else {
                    yield bot.sendMessage(chatId, 'CPF inválido. Tente novamente.');
                }
                break;
            case State.SENHA:
                senha = yield hashPassword(text);
                yield saveToDatabase(nome, email, cpf, senha);
                yield bot.sendMessage(chatId, 'Cadastro realizado com sucesso!');
                currentState = State.NONE;
                break;
        }
    }
    catch (error) {
        console.error(error);
        yield bot.sendMessage(chatId, 'Ocorreu um erro. Tente novamente.');
    }
}));
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}
function isValidCPF(cpf) {
    return cpf.length === 11 && /^\d+$/.test(cpf); // Exemplo básico de verificação
}
function enviarCodigoEmail(emailDestino) {
    return __awaiter(this, void 0, void 0, function* () {
        const codigo = Math.floor(100000 + Math.random() * 900000);
        const mensagem = `Seu código de confirmação é: ${codigo}`;
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: emailDestino,
            subject: 'Código de Confirmação',
            text: mensagem,
        };
        try {
            yield transporter.sendMail(mailOptions);
            console.log('E-mail enviado com sucesso');
        }
        catch (error) {
            console.error('Erro ao enviar e-mail:', error);
        }
        return codigo;
    });
}
function hashPassword(plainTextPassword) {
    return __awaiter(this, void 0, void 0, function* () {
        const saltRounds = 10;
        return yield bcrypt_1.default.hash(plainTextPassword, saltRounds);
    });
}
function saveToDatabase(nome, email, cpf, senha) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const client = yield pool.connect();
            const query = 'INSERT INTO usuarios (nome, email, cpf, senha) VALUES ($1, $2, $3, $4)';
            yield client.query(query, [nome, email, cpf, senha]);
            console.log("Dados salvos no banco de dados com sucesso");
            client.release();
        }
        catch (error) {
            console.error('Erro ao salvar no banco de dados:', error);
        }
    });
}
