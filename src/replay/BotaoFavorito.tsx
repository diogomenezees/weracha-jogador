import { useEffect, useSyncExternalStore } from "react";
import { Pressable, StyleSheet } from "react-native";

import { buscarIdsFavoritos, definirFavorito } from "@/api/favoritos";
import { useSessao } from "@/sessao/contexto";
import { cores } from "@/tema";
import { Heart } from "@/ui/Icone";

type ChamarApi = ReturnType<typeof useSessao>["chamarApi"];

// Favoritos do jogador logado (coração nos cards de vídeo). Um store só pro app: os
// ids vêm UMA vez de GET /api/v1/replays/favoritos/ids e todo card lê daqui, então
// nenhum payload de vídeo carrega `favorito` e favoritar num card pinta o mesmo replay
// em qualquer tela aberta. Recarrega se o jogador logado mudar. Espelha
// weracha-site/components/botao-favorito.tsx.

let dono: string | null = null;
let ids: Set<string> | null = null;
let buscando: Promise<void> | null = null;
const ouvintes = new Set<() => void>();

function avisar() {
  for (const o of ouvintes) o();
}

function assinar(ouvinte: () => void) {
  ouvintes.add(ouvinte);
  return () => {
    ouvintes.delete(ouvinte);
  };
}

function garantirCarregado(jogadorId: string, chamarApi: ChamarApi) {
  if (dono !== jogadorId) {
    dono = jogadorId;
    ids = null;
    buscando = null;
  }
  if (ids || buscando) return;
  const p: Promise<void> = buscarIdsFavoritos(chamarApi)
    .then((lista) => {
      if (dono === jogadorId) ids = new Set(lista);
    })
    // Falha na busca: sem coração preenchido, mas o toque continua funcionando.
    .catch(() => {
      if (dono === jogadorId) ids = new Set();
    })
    .finally(() => {
      if (buscando === p) buscando = null;
      avisar();
    });
  buscando = p;
}

async function alternar(pedidoReplayId: string, chamarApi: ChamarApi) {
  const era = ids?.has(pedidoReplayId) ?? false;
  const trocar = (favorito: boolean) => {
    ids = new Set(ids ?? []);
    if (favorito) ids.add(pedidoReplayId);
    else ids.delete(pedidoReplayId);
    avisar();
  };
  // Otimista: pinta na hora e desfaz se a API recusar.
  trocar(!era);
  try {
    await definirFavorito(chamarApi, pedidoReplayId, !era);
  } catch {
    trocar(era);
  }
}

export function useFavorito(pedidoReplayId: string | null | undefined): boolean {
  const { estado, chamarApi } = useSessao();
  const jogadorId = estado.fase === "logado" ? estado.jogador.id : null;
  useEffect(() => {
    if (jogadorId) garantirCarregado(jogadorId, chamarApi);
  }, [jogadorId, chamarApi]);
  return useSyncExternalStore(assinar, () =>
    pedidoReplayId ? (ids?.has(pedidoReplayId) ?? false) : false
  );
}

// Coração vermelho: preenchido = favorito.
export function BotaoFavorito({ pedidoReplayId }: { pedidoReplayId: string }) {
  const { chamarApi } = useSessao();
  const favorito = useFavorito(pedidoReplayId);
  return (
    <Pressable
      hitSlop={8}
      style={styles.botao}
      onPress={() => void alternar(pedidoReplayId, chamarApi)}
      accessibilityRole="button"
      accessibilityLabel={favorito ? "Tirar dos favoritos" : "Favoritar"}
      accessibilityState={{ selected: favorito }}
    >
      <Heart
        size={19}
        color={favorito ? cores.favorito : cores.slate400}
        fill={favorito ? cores.favorito : "transparent"}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  botao: { padding: 2 },
});
