import TelegramBot from 'node-telegram-bot-api';
import { sendVerificationEmail } from './mail';
import pool from './db';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
dotenv.config();

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN!, { polling: true });

enum State {
  NONE,
  NOME,
  EMAIL,
  EMAIL_VERIFICACAO,
  CPF,
  SENHA,
}

let currentState: State = State.NONE;
let nome = '';
let email = '';
let cpf = '';
let senha = '';
let codigoConfirmacao = 0;

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text || '';

  try {
    switch (currentState) {
      case State.NONE:
        await bot.sendMessage(chatId, 'Bem-vindo ao cadastro! Qual é o seu nome?');
        currentState = State.NOME;
        break;

      case State.NOME:
        nome = text;
        await bot.sendMessage(chatId, 'Por favor, informe o seu e-mail:');
        currentState = State.EMAIL;
        break;

      case State.EMAIL:
        if (isValidEmail(text)) {
          email = text;
          codigoConfirmacao = Math.floor(100000 + Math.random() * 900000);
          await sendVerificationEmail(email, codigoConfirmacao);
          await bot.sendMessage(chatId, 'Código de confirmação enviado para o seu e-mail. Por favor, digite o código recebido:');
          currentState = State.EMAIL_VERIFICACAO;
        } else {
          await bot.sendMessage(chatId, 'E-mail inválido. Tente novamente.');
        }
        break;

      case State.EMAIL_VERIFICACAO:
        if (parseInt(text) === codigoConfirmacao) {
          await bot.sendMessage(chatId, 'E-mail confirmado! Agora, informe o seu CPF:');
          currentState = State.CPF;
        } else {
          await bot.sendMessage(chatId, 'Código incorreto. Por favor, tente novamente.');
        }
        break;

      case State.CPF:
        cpf = text;
        await bot.sendMessage(chatId, 'Crie uma senha:');
        currentState = State.SENHA;
        break;

      case State.SENHA:
        senha = await bcrypt.hash(text, 10);
        await saveToDatabase(nome, email, cpf, senha);
        await bot.sendMessage(chatId, 'Cadastro realizado com sucesso!');
        currentState = State.NONE;
        break;
    }
  } catch (error) {
    console.error(error);
    await bot.sendMessage(chatId, 'Ocorreu um erro. Tente novamente.');
  }
});

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

async function saveToDatabase(nome: string, email: string, cpf: string, senha: string): Promise<void> {
  try {
    const client = await pool.connect();
    await client.query('INSERT INTO usuarios (nome, email, cpf, senha) VALUES ($1, $2, $3, $4)', [nome, email, cpf, senha]);
    client.release();
  } catch (error) {
    console.error('Erro ao salvar no banco de dados:', error);
  }
}
