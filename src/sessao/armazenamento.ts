import * as SecureStore from "expo-secure-store";

import type { JogadorSessao } from "@/contrato/tipos";

// O Bearer, o telefone e a senha ficam no armazenamento seguro do sistema
// (Keychain no iOS, Keystore/EncryptedSharedPreferences no Android), nunca em
// AsyncStorage plain.
//
// Por que guardar a SENHA: o token expira em 10 dias deslizantes (16-api-v1.md
// §1). Quando uma chamada volta 401, o app re-loga sozinho por
// `POST /api/v1/auth/token` com a senha guardada, sem pedir pro usuário digitar
// de novo. `POST /api/v1/auth/refresh` (que evitaria guardar a senha) foi
// adiado de propósito no doc do app.
//
// O `jogador` (perfil devolvido no login) também é guardado, pra tela ter nome
// e foto no boot frio sem esperar uma chamada de rede. `GET /api/v1/me` (que
// daria a versão fresca) segue adiado.

export type SessaoGuardada = {
  token: string;
  telefone: string;
  senha: string;
  jogador: JogadorSessao;
};

const CHAVE_TOKEN = "weracha.token";
const CHAVE_TELEFONE = "weracha.telefone";
const CHAVE_SENHA = "weracha.senha";
const CHAVE_JOGADOR = "weracha.jogador";

export async function guardarSessao(sessao: SessaoGuardada): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(CHAVE_TOKEN, sessao.token),
    SecureStore.setItemAsync(CHAVE_TELEFONE, sessao.telefone),
    SecureStore.setItemAsync(CHAVE_SENHA, sessao.senha),
    SecureStore.setItemAsync(CHAVE_JOGADOR, JSON.stringify(sessao.jogador)),
  ]);
}

export async function guardarToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(CHAVE_TOKEN, token);
}

export async function guardarJogador(jogador: JogadorSessao): Promise<void> {
  await SecureStore.setItemAsync(CHAVE_JOGADOR, JSON.stringify(jogador));
}

export async function lerSessao(): Promise<SessaoGuardada | null> {
  try {
    const [token, telefone, senha, jogadorJson] = await Promise.all([
      SecureStore.getItemAsync(CHAVE_TOKEN),
      SecureStore.getItemAsync(CHAVE_TELEFONE),
      SecureStore.getItemAsync(CHAVE_SENHA),
      SecureStore.getItemAsync(CHAVE_JOGADOR),
    ]);
    if (!token || !telefone || !senha) return null;
    const jogador = jogadorJson ? (parseJogador(jogadorJson) ?? placeholder(telefone)) : placeholder(telefone);
    return { token, telefone, senha, jogador };
  } catch {
    return null;
  }
}

export async function limparSessao(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(CHAVE_TOKEN),
    SecureStore.deleteItemAsync(CHAVE_TELEFONE),
    SecureStore.deleteItemAsync(CHAVE_SENHA),
    SecureStore.deleteItemAsync(CHAVE_JOGADOR),
  ]);
}

function parseJogador(json: string): JogadorSessao | null {
  try {
    const v = JSON.parse(json) as Partial<JogadorSessao>;
    if (typeof v.id === "string" && typeof v.telefone === "string" && typeof v.nome === "string") {
      return {
        id: v.id,
        telefone: v.telefone,
        nome: v.nome,
        apelido: v.apelido ?? null,
        fotoUrl: v.fotoUrl ?? null,
      };
    }
    return null;
  } catch {
    return null;
  }
}

function placeholder(telefone: string): JogadorSessao {
  return { id: "", telefone, nome: "", apelido: null, fotoUrl: null };
}
