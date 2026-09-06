import { ErroApi } from "@/api/erros";

// Dicionário de mensagem por `codigo` de erro. O contrato manda o app decidir a
// mensagem a partir do `codigo` (nunca do texto PT-BR que a API devolve em
// `mensagem`). Por ora só PT-BR; quando houver i18n de verdade isto vira as
// chaves de tradução.
//
// Só os códigos que as telas de hoje conseguem produzir. Código sem entrada
// cai no texto genérico.

const POR_CODIGO: Record<string, string> = {
  SEM_RESPOSTA: "Não foi possível falar com o servidor. Verifique a conexão e o endereço do servidor nas configurações.",
  RESPOSTA_INVALIDA: "O servidor respondeu de um jeito inesperado. Tente de novo mais tarde.",
  ERRO_INTERNO: "Deu um problema no servidor. Tente de novo em instantes.",

  CORPO_INVALIDO: "Preencha o telefone e a senha.",
  CAMPO_INVALIDO: "Preencha o telefone e a senha.",
  TELEFONE_INVALIDO: "Esse telefone não parece válido.",

  SENHA_INCORRETA: "Telefone ou senha incorretos.",
  SENHA_NAO_DEFINIDA: "Essa conta ainda não tem senha. Defina uma senha pelo site weracha.app e volte aqui.",
  TELEFONE_NAO_VERIFICADO: "Esse telefone ainda não foi confirmado. Confirme pelo site weracha.app.",
  TELEFONE_NAO_CADASTRADO: "Não achamos uma conta com esse telefone.",
  CONTA_BLOQUEADA: "Essa conta está bloqueada. Fale com o organizador do grupo.",
  LOGIN_BLOQUEADO: "Muitas tentativas seguidas. Espere alguns minutos e tente de novo.",
  NAO_AUTENTICADO: "Sua sessão expirou. Entre de novo.",
};

const GENERICA = "Não deu pra concluir agora. Tente de novo.";

export function mensagemDoErro(erro: unknown): string {
  if (erro instanceof ErroApi) {
    return POR_CODIGO[erro.codigo] ?? GENERICA;
  }
  return GENERICA;
}
