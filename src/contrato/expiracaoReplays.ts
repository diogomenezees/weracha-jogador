// Regras de expiração dos replays, sem banco (o cliente também importa). O
// serviço que lê/apaga fica em lib/services/expiracaoReplays.ts; a regra
// inteira está em docs/especificacao/17-expiracao-de-replays.md.
//
// Resumo: o que a gente comunica é "replays com mais de 3 meses são apagados";
// na prática o vídeo vive 4 meses e o último mês é o aviso (selo "some em N
// dias" no card + push semanal pro dono do gol). Replay com ❤ de qualquer pessoa
// do grupo nunca expira.

// O número que aparece nos textos ("acima de 3 meses").
export const MESES_COMUNICADOS = 3;
// Idade em que o vídeo é de fato apagado.
export const MESES_ATE_APAGAR = 4;
// Quantos dias antes de apagar o card começa a mostrar o selo.
export const DIAS_DE_AVISO = 30;

function somarMeses(data: Date, meses: number): Date {
  const d = new Date(data.getTime());
  d.setUTCMonth(d.getUTCMonth() + meses);
  return d;
}

// Quando o replay criado em `criadoEm` vai ser apagado (se ninguém favoritar).
export function dataDeExpiracao(criadoEm: Date): Date {
  return somarMeses(criadoEm, MESES_ATE_APAGAR);
}

// Já passou da idade de expirar (só não sumiu se alguém deu ❤).
export function passouDaIdade(criadoEm: Date, agora: Date = new Date()): boolean {
  return dataDeExpiracao(criadoEm).getTime() <= agora.getTime();
}

// Já está no período de aviso (faltam DIAS_DE_AVISO dias ou menos).
export function emPeriodoDeAviso(criadoEm: Date, agora: Date = new Date()): boolean {
  return dataDeExpiracao(criadoEm).getTime() - agora.getTime() <= DIAS_DE_AVISO * 86_400_000;
}

// Dias inteiros que faltam (mínimo 0) até `expiraEm`, pro texto do selo.
export function diasAteExpirar(expiraEm: string | Date, agora: Date = new Date()): number {
  const fim = typeof expiraEm === "string" ? new Date(expiraEm) : expiraEm;
  return Math.max(0, Math.ceil((fim.getTime() - agora.getTime()) / 86_400_000));
}

// "some hoje" / "some amanhã" / "some em 12 dias".
export function textoPrazoExpiracao(expiraEm: string | Date, agora: Date = new Date()): string {
  const dias = diasAteExpirar(expiraEm, agora);
  if (dias === 0) return "some hoje";
  if (dias === 1) return "some amanhã";
  return `some em ${dias} dias`;
}

// Texto do banner da tela de Replays (site e app usam o mesmo).
export const TEXTO_AVISO_EXPIRACAO = `Replays com mais de ${MESES_COMUNICADOS} meses somem automaticamente. Toque no coração dos que você quer guardar por mais tempo.`;
// Na aba Favoritos o mesmo aviso vem pelo lado de quem já guardou.
export const TEXTO_AVISO_FAVORITOS = `Os vídeos favoritados ficam guardados aqui por mais tempo. Os outros somem depois de ${MESES_COMUNICADOS} meses.`;
