import type { Href } from "expo-router";

// Extrai o token de um convite colado pelo usuário. Aceita a URL completa
// (`https://weracha.app/convite/<token>`, `weracha://convite/<token>`,
// `exp://192.168.0.10:8081/--/convite/<token>`) ou o token solto. Devolve null se
// não sobrar nada com cara de token (`crypto.randomBytes(9).toString("base64url")`
// no site: 12 chars do alfabeto A-Za-z0-9_-).
export function tokenDeConvite(texto: string): string | null {
  const limpo = texto.trim();
  if (!limpo) return null;
  const naUrl = limpo.match(/convite\/([^/?#\s]+)/i);
  const bruto = (naUrl ? naUrl[1] : limpo).replace(/[?#].*$/, "").trim();
  return /^[A-Za-z0-9_-]{6,}$/.test(bruto) ? bruto : null;
}

// O `destino` que `POST /api/v1/convites/{token}` devolve é um caminho do site
// (`/grupos/{id}`, `/grupos/{id}/partidas/{id}/checkin`,
// `/grupos/{id}/enquetes?enquete={id}`). As rotas do app têm o mesmo formato, então
// o caminho serve direto; só validamos o prefixo e caímos na tela do grupo se vier
// algo inesperado.
export function rotaDoConvite(destino: string, grupoId: string): Href {
  return (destino.startsWith("/grupos/") ? destino : `/grupos/${grupoId}`) as Href;
}
