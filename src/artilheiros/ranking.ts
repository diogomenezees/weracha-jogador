import { CHAVE_GERAL, type DadosArtilheiros, type LinhaRanking } from "@/contrato/tipos";

// Deriva o ranking de um período a partir de `DadosArtilheiros` (a resposta vem
// centrada no jogador; cada período é reconstruído no cliente). Espelha o
// `useMemo` de weracha-site/components/tela-artilheiros.tsx.

export type LinhaComIndice = LinhaRanking & { indice: number };

export function rankingDoPeriodo(dados: DadosArtilheiros, chave: string): LinhaComIndice[] {
  return dados.jogadores
    .flatMap((j, indice) => {
      const s = j.porPeriodo[chave];
      if (!s) return [];
      return [
        {
          indice,
          nome: j.nome,
          apelido: j.apelido,
          fotoUrl: j.fotoUrl,
          souEu: j.souEu,
          gols: s.gols,
          posicao: s.posicao,
        },
      ];
    })
    .sort((a, b) => a.posicao - b.posicao);
}

/** Jogadores sem gol no período (só faz sentido no escopo grupo, onde a
 * resposta traz o elenco todo). */
export function zeradosDoPeriodo(
  dados: DadosArtilheiros,
  chave: string
): { nome: string; apelido: string | null; fotoUrl: string | null; indice: number }[] {
  return dados.jogadores
    .map((j, indice) => ({ j, indice }))
    .filter(({ j }) => !j.porPeriodo[chave])
    .map(({ j, indice }) => ({
      nome: j.nome,
      apelido: j.apelido,
      fotoUrl: j.fotoUrl,
      indice,
    }));
}

export function golsLabel(n: number): string {
  return `${n} ${n === 1 ? "gol" : "gols"}`;
}

/** "Agosto/25" → "agosto" (minúsculo, sem o ano). */
export function mesNaFrase(rotulo: string): string {
  return rotulo.replace(/\/\d\d$/, "").toLowerCase();
}

export { CHAVE_GERAL };
