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

  // Perfil
  EMAIL_INVALIDO: "Digite um e-mail válido.",
  EMAIL_OBRIGATORIO_PARA_NOTIFICACAO: "Informe um e-mail pra poder receber notificações.",
  DATA_NASCIMENTO_INVALIDA: "Data de nascimento inválida.",
  DATA_NASCIMENTO_NO_FUTURO: "A data de nascimento não pode estar no futuro.",
  DATA_NASCIMENTO_TORNARIA_MAIOR:
    "Não dá pra trocar a data de nascimento por uma que te tornaria maior de idade. Se for engano, fale com o suporte.",
  FOTO_URL_INVALIDA: "Não deu pra salvar essa foto. Tente de novo.",
  SCORE_CONGELADO: "O score deste grupo travou porque a próxima partida já vai começar.",
  POSICAO_INVALIDA_PARA_ESPORTE: "Essa posição não é do esporte do grupo.",
  EXCLUSAO_BLOQUEADA_DONO_DE_GRUPO:
    "Você é dono de um ou mais grupos. Passe cada um pra outra pessoa ou exclua o grupo antes.",
  EXCLUSAO_JA_EM_ANDAMENTO: "Já existe um pedido de exclusão em andamento.",
  SOLICITACAO_EXCLUSAO_NAO_ENCONTRADA: "Não há pedido de exclusão pra cancelar.",
  SOLICITACAO_EXCLUSAO_JA_RESOLVIDA: "Esse pedido de exclusão já foi resolvido.",

  // Ciclo da partida
  JOGADOR_JA_NO_GRUPO: "Esse telefone já está no grupo.",
  JOGADOR_FORA_DO_GRUPO: "Esse jogador não está mais no grupo.",
  SORTEIO_FALHOU: "Não deu pra separar os times. Confira as fixações e os jogadores por time.",
  PARTIDA_ENCERRADA_SORTEIO_BLOQUEADO: "A partida já encerrou. Não dá mais pra refazer o sorteio.",
  PRAZO_EDICAO_GOL_EXPIRADO: "O prazo pra ajustar gols dessa partida já passou.",
  GOL_NAO_ENCONTRADO: "Esse gol não existe mais.",
  GOL_JA_CANCELADO: "Esse gol já está cancelado.",
  GOL_NAO_CANCELADO: "Esse gol não está cancelado.",
  GOL_JA_DESSE_JOGADOR: "Esse gol já é desse jogador.",
  GOL_CANCELADO_MIGRACAO_BLOQUEADA: "Reative o gol antes de migrar.",
  LANCES_DESATIVADOS: "Marcar lance importante está desativado no momento.",
  PARTIDA_NAO_ENCONTRADA: "Partida não encontrada.",
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
