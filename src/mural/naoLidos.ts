import { useCallback, useSyncExternalStore } from "react";
import { useFocusEffect } from "expo-router";

import { contarNaoLidosDoMural } from "@/api/mural";
import { useSessao } from "@/sessao/contexto";

// Bolinha de não lidos do Mural no menu (☰ e item Mural). Um valor só pro app
// inteiro (cada tela tem a própria Navbar): a tela que ganha foco reconta, no
// máximo a cada INTERVALO_MS, e a tela Mural zera assim que abre.

const INTERVALO_MS = 30_000;

let valor = 0;
let buscadoEm = 0;
// Sobe a cada zerada: uma contagem que saiu antes dela e volta depois traz o
// número velho e não pode desfazer o zero (era isso que deixava a bolinha presa
// até fechar o app).
let geracao = 0;
const ouvintes = new Set<() => void>();

function definir(n: number) {
  valor = n;
  ouvintes.forEach((f) => f());
}

// Some com a bolinha na hora (a tela Mural chama ao abrir).
export function zerarMuralNaoLidos(): void {
  geracao++;
  buscadoEm = Date.now();
  definir(0);
}

// Marcar como visto falhou no servidor: a próxima tela que ganhar foco reconta.
export function recontarMuralNaoLidos(): void {
  buscadoEm = 0;
}

function assinar(f: () => void): () => void {
  ouvintes.add(f);
  return () => {
    ouvintes.delete(f);
  };
}

function lerValor(): number {
  return valor;
}

export function useMuralNaoLidos(): number {
  const { estado, chamarApi } = useSessao();
  const logado = estado.fase === "logado";
  const n = useSyncExternalStore(assinar, lerValor);

  useFocusEffect(
    useCallback(() => {
      if (!logado || Date.now() - buscadoEm < INTERVALO_MS) return;
      buscadoEm = Date.now();
      const minha = geracao;
      contarNaoLidosDoMural(chamarApi)
        .then((total) => {
          if (minha === geracao) definir(total);
        })
        .catch(() => {
          if (minha === geracao) buscadoEm = 0;
        });
    }, [logado, chamarApi])
  );

  return logado ? n : 0;
}
