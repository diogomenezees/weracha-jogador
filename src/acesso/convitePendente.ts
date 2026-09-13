// Carrega o convite da tela `/convite/[token]` (aberta deslogado por um link)
// até o fim do login. Estado de módulo, não persistente: é um repasse dentro da
// mesma sessão do app, some se o app for morto no meio (aí o link já foi
// "gasto" e o usuário pediria outro). Ver src/app/convite/[token].tsx e
// useFluxoAcesso.concluirLogin.

export type ConvitePendente = {
  token: string;
  partidaId?: string | null;
  enqueteId?: string | null;
};

let pendente: ConvitePendente | null = null;

export function guardarConvitePendente(c: ConvitePendente): void {
  pendente = c;
}

// Lê E limpa, atômico. É a única forma de ler o convite pendente de propósito:
// `useFluxoAcesso` chama isso uma vez no mount da tela de login (não dentro de
// `concluirLogin`, que só roda bem depois) — assim, se o usuário abandonar o
// login sem terminar (volta, digita outro telefone, sai do app e reabre bem
// depois), o valor já não existe mais pra "vazar" pro próximo login que
// completar nessa tela, de uma conta sem nenhuma relação com o convite.
export function consumirConvitePendente(): ConvitePendente | null {
  const c = pendente;
  pendente = null;
  return c;
}
