// Comparação de versão semver simples (X.Y.Z) pro gate de versão mínima. Só lê os
// três primeiros números; sufixo (-beta) e partes faltando não quebram.

function partes(versao: string): [number, number, number] | null {
  const m = /^\s*v?(\d+)(?:\.(\d+))?(?:\.(\d+))?/.exec(versao);
  if (!m) return null;
  return [Number(m[1]), Number(m[2] ?? 0), Number(m[3] ?? 0)];
}

/**
 * true só quando as DUAS versões são legíveis e `atual` é menor que `minima`.
 * Versão ilegível nunca bloqueia (fail-open): melhor abrir o app do que trancar
 * todo mundo por causa de um texto estranho vindo do servidor.
 */
export function abaixoDaMinima(atual: string, minima: string): boolean {
  const a = partes(atual);
  const m = partes(minima);
  if (!a || !m) return false;
  for (let i = 0; i < 3; i++) {
    if (a[i] !== m[i]) return a[i] < m[i];
  }
  return false;
}
