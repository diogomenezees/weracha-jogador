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

export function lerConvitePendente(): ConvitePendente | null {
  return pendente;
}

export function limparConvitePendente(): void {
  pendente = null;
}
