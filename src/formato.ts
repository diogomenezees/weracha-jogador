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

export function ehHoje(data: string | Date): boolean {
  const d = data instanceof Date ? data : new Date(data);
  const hoje = new Date();
  return (
    d.getFullYear() === hoje.getFullYear() &&
    d.getMonth() === hoje.getMonth() &&
    d.getDate() === hoje.getDate()
  );
}

/** Segundos → `45s` / `1min 20s` / `2min` (cooldown de reenvio de SMS). */
export function formatarCooldown(segundos: number): string {
  if (segundos < 60) return `${segundos}s`;
  const min = Math.floor(segundos / 60);
  const seg = segundos % 60;
  return seg > 0 ? `${min}min ${seg}s` : `${min}min`;
}

/** `Date` → `Qui · 15 set` (cabeçalho do painel). */
export function rotuloDoDia(d: Date): string {
  const dia = String(d.getDate());
  const mes = new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(d).replace(".", "");
  return `${DIAS[d.getDay()]} · ${dia} ${mes}`;
}
