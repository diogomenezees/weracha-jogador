// Formatação de data/hora pro usuário. Usa o fuso do aparelho (o jogador está
// no Brasil). A lógica de fuso explícito (America/Sao_Paulo) que o site tem no
// servidor não vale aqui: o cliente é local por natureza.

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/** `2026-09-15T21:30:00Z` → `Seg, 15/09 · 21:30`. */
export function formatarDataPartida(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const dia = String(d.getDate()).padStart(2, "0");
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const hora = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${DIAS[d.getDay()]}, ${dia}/${mes} · ${hora}:${min}`;
}

export function ehHoje(iso: string): boolean {
  const d = new Date(iso);
  const hoje = new Date();
  return (
    d.getFullYear() === hoje.getFullYear() &&
    d.getMonth() === hoje.getMonth() &&
    d.getDate() === hoje.getDate()
  );
}
