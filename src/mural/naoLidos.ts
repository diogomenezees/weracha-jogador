import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "expo-router";

import { contarNaoLidosDoMural } from "@/api/mural";
import { useSessao } from "@/sessao/contexto";

// Bolinha de não lidos do Mural no menu (☰ e item Mural). Um valor só pro app
// inteiro (cada tela tem a própria Navbar): a tela que ganha foco reconta, no
// máximo a cada INTERVALO_MS, e a tela Mural zera depois de marcar como visto.
// Mesmo comportamento do site (components/navbar.tsx).

const INTERVALO_MS = 30_000;

// Mesmo tempo do site (SEGUNDOS_PARA_MARCAR_VISTO em weracha-site/lib/muralCliente.ts).
export const SEGUNDOS_PARA_MARCAR_VISTO = 3;

let valor = 0;
let buscadoEm = 0;
const ouvintes = new Set<(n: number) => void>();

function definir(n: number) {
  valor = n;
  ouvintes.forEach((f) => f(n));
}

export function zerarMuralNaoLidos(): void {
  buscadoEm = Date.now();
  definir(0);
}

export function useMuralNaoLidos(): number {
  const { estado, chamarApi } = useSessao();
  const logado = estado.fase === "logado";
  const [n, setN] = useState(valor);

  useEffect(() => {
    ouvintes.add(setN);
    return () => {
      ouvintes.delete(setN);
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!logado || Date.now() - buscadoEm < INTERVALO_MS) return;
      buscadoEm = Date.now();
      contarNaoLidosDoMural(chamarApi)
        .then(definir)
        .catch(() => {
          buscadoEm = 0;
        });
    }, [logado, chamarApi])
  );

  return logado ? n : 0;
}
