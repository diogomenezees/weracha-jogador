// Sorteio rápido de times: 100% local, sem score nem histórico. Cópia literal de
// weracha-site/lib/sorteio.ts (helper puro, sem dependência) — mantém em sincronia
// à mão, igual o resto de src/contrato/.

export type JogadorSorteado = { nome: string; capitao: boolean };

export function sortearTimes(params: {
  nomes: string[];
  numTimes: number;
  sortearCapitao: boolean;
}): JogadorSorteado[][] {
  const { nomes, numTimes, sortearCapitao } = params;
  if (numTimes < 1 || nomes.length === 0) return [];

  const embaralhados = embaralhar(nomes);
  const times: JogadorSorteado[][] = Array.from({ length: numTimes }, () => []);
  embaralhados.forEach((nome, i) => {
    times[i % numTimes].push({ nome, capitao: false });
  });

  if (sortearCapitao) {
    for (const time of times) {
      if (time.length === 0) continue;
      time[Math.floor(Math.random() * time.length)].capitao = true;
    }
  }

  return times;
}

function embaralhar<T>(itens: T[]): T[] {
  const copia = [...itens];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}
