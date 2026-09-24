import type { ComentarioResenha } from "@/contrato/tipos";

// Junta a lista local (com envios otimistas recém-feitos) com a do servidor,
// preservando por até 20s um comentário local que o servidor ainda não
// devolveu. Cópia de `reconciliarComentarios` de
// weracha-site/components/comentarios-resenha.tsx.
export function reconciliarComentarios(
  local: ComentarioResenha[],
  servidor: ComentarioResenha[]
): ComentarioResenha[] {
  const porId = new Map(servidor.map((c) => [c.id, c]));
  const agora = Date.now();
  for (const c of local) {
    if (porId.has(c.id)) continue;
    if (agora - new Date(c.criadoEm).getTime() < 20_000) porId.set(c.id, c);
  }
  return [...porId.values()].sort(
    (a, b) => new Date(a.criadoEm).getTime() - new Date(b.criadoEm).getTime()
  );
}

// Janela em que o autor pode apagar o próprio comentário (min). Depois disso,
// só admin do grupo / dono do site. Espelha JANELA_APAGAR_COMENTARIO_MIN do site.
export const JANELA_APAGAR_COMENTARIO_MIN = 5;

export function podeApagarComentario(
  comentario: ComentarioResenha,
  meuJogadorId: string | null,
  podeModerar: boolean
): boolean {
  if (podeModerar) return true;
  if (!meuJogadorId || comentario.autor.id !== meuJogadorId) return false;
  const idadeMin = (Date.now() - new Date(comentario.criadoEm).getTime()) / 60_000;
  return idadeMin <= JANELA_APAGAR_COMENTARIO_MIN;
}

// Denunciar vale pro comentário de OUTRA pessoa (o próprio, o autor apaga). O
// servidor recusa o resto (COMENTARIO_DENUNCIA_PROPRIO, GRUPO_NAO_MEMBRO).
export function podeDenunciarComentario(
  comentario: ComentarioResenha,
  meuJogadorId: string | null
): boolean {
  return !!meuJogadorId && comentario.autor.id !== meuJogadorId;
}
