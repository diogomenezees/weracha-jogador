import { ErroApi } from "@/api/erros";

// Formata "aguarde X" a partir do `detalhe` (segundos), nunca do texto PT-BR da
// API. Espelha `formatarDuracao` do site.
function duracao(segundos: number): string {
  if (segundos < 60) return `${segundos}s`;
  const min = Math.floor(segundos / 60);
  const seg = segundos % 60;
  return seg > 0 ? `${min}min ${seg}s` : `${min}min`;
}

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

  CORPO_INVALIDO: "Confira os campos e tente de novo.",
  CAMPO_INVALIDO: "Confira os campos e tente de novo.",
  TELEFONE_INVALIDO: "Esse telefone não parece válido.",

  SENHA_INCORRETA: "Telefone ou senha incorretos.",
  SENHA_NAO_DEFINIDA: "Essa conta ainda não tem senha. Crie uma senha aqui mesmo.",
  SENHA_MUITO_CURTA: "A senha precisa de pelo menos 6 caracteres.",
  TELEFONE_NAO_VERIFICADO: "Confirme o telefone por SMS antes de continuar.",
  TELEFONE_NAO_CADASTRADO: "Não achamos uma conta com esse telefone.",
  TELEFONE_JA_VERIFICADO: "Esse telefone já foi confirmado. É só entrar.",
  NOME_OBRIGATORIO_CADASTRO: "Digite seu nome pra criar a conta.",
  CONTA_BLOQUEADA: "Essa conta está bloqueada. Fale com o organizador do grupo.",
  LOGIN_BLOQUEADO: "Muitas tentativas seguidas. Espere alguns minutos e tente de novo.",
  NAO_AUTENTICADO: "Sua sessão expirou. Entre de novo.",

  // Códigos por SMS
  CODIGO_INCORRETO: "Código incorreto. Confira o SMS e tente de novo.",
  CODIGO_EXPIRADO: "Esse código expirou. Peça um novo.",
  CODIGO_NAO_SOLICITADO: "Peça um código novo antes de confirmar.",
  CODIGO_TENTATIVAS_EXCEDIDAS: "Muitas tentativas erradas. Peça um código novo.",
  CODIGO_LIMITE_DIARIO: "Você já pediu muitos códigos hoje. Tente de novo mais tarde.",
  SMS_DESABILITADO: "O envio de SMS está pausado no momento. Tente de novo mais tarde.",

  CSRF_ORIGEM_INVALIDA: "Não deu pra concluir agora. Tente de novo.",
};

const GENERICA = "Não deu pra concluir agora. Tente de novo.";

export function mensagemDoErro(erro: unknown): string {
  if (!(erro instanceof ErroApi)) return GENERICA;

  // Códigos com contagem regressiva: o texto sai do `detalhe`, não do PT-BR da API.
  if (erro.codigo === "CODIGO_COOLDOWN") {
    const seg = typeof erro.detalhe?.segundos === "number" ? erro.detalhe.segundos : null;
    return seg
      ? `Aguarde ${duracao(seg)} pra pedir um novo código.`
      : "Aguarde um pouco pra pedir um novo código.";
  }

  return POR_CODIGO[erro.codigo] ?? GENERICA;
}
