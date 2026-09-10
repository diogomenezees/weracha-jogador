import * as SecureStore from "expo-secure-store";

import type { MeuPerfil } from "@/contrato/tipos";

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
// O `jogador` (perfil) também é guardado, pra tela ter nome e foto no boot frio
// sem esperar rede. A versão fresca vem de `GET /api/v1/me` (`recarregarPerfil`
// no contexto de sessão), chamado pelas telas logadas.

export type SessaoGuardada = {
  token: string;
  telefone: string;
  senha: string;
  jogador: MeuPerfil;
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

export async function guardarJogador(jogador: MeuPerfil): Promise<void> {
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
    const jogador = jogadorJson
      ? (parseJogador(jogadorJson) ?? placeholder(telefone))
      : placeholder(telefone);
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

// Tolera cache antigo (gravado quando o `jogador` guardado era só o
// `JogadorSessao` de 5 campos): os campos novos entram como null/false até o
// próximo `GET /api/v1/me`.
function parseJogador(json: string): MeuPerfil | null {
  try {
    const v = JSON.parse(json) as Partial<MeuPerfil>;
    if (
      typeof v.id === "string" &&
      typeof v.telefone === "string" &&
      typeof v.nome === "string"
    ) {
      return {
        id: v.id,
        telefone: v.telefone,
        nome: v.nome,
        apelido: v.apelido ?? null,
        fotoUrl: v.fotoUrl ?? null,
        onboardingConcluidoEm: v.onboardingConcluidoEm ?? null,
        email: v.email ?? null,
        emailNotificacoes: v.emailNotificacoes ?? false,
        dataNascimento: v.dataNascimento ?? null,
      };
    }
    return null;
  } catch {
    return null;
  }
}

function placeholder(telefone: string): MeuPerfil {
  return {
    id: "",
    telefone,
    nome: "",
    apelido: null,
    fotoUrl: null,
    onboardingConcluidoEm: null,
    email: null,
    emailNotificacoes: false,
    dataNascimento: null,
  };
}
