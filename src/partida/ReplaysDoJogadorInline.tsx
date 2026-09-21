import { StyleSheet, View } from "react-native";
import { Text } from "@/ui/Texto";

import { CardsReplay } from "@/partida/CardsReplay";
import { AvatarJogador } from "@/ui/AvatarJogador";
import { cores } from "@/tema";
import type { GolComVideos } from "@/contrato/tipos";

// Replays de UM jogador numa partida, abertos DENTRO da tela (resultado / ao vivo) no
// lugar da lista de artilheiros/histórico, em vez de num modal (o pager travava dentro
// de modal, ver memória weracha_pager_replay_scroll_snap). Porte de
// `ReplaysDoJogadorInline` do site (weracha-site/components/replays-do-jogador-inline.tsx).
// Sem botão de voltar aqui: quem usa liga `useVoltarDoCelular` (o voltar do celular fecha
// os replays) e trocar de aba também volta pra lista.
export function ReplaysDoJogadorInline({
  jogador,
  gols,
  grupoNome,
  apenasUmGol = false,
  comentar,
}: {
  jogador: { id: string; nome: string; fotoUrl: string | null };
  gols: GolComVideos[];
  grupoNome: string;
  /** Aberto pela linha do tempo: a lista tem só o gol tocado, e o subtítulo diz isso. */
  apenasUmGol?: boolean;
  /** Só a tela de Resultado passa o suporte a comentário. */
  comentar?: Parameters<typeof CardsReplay>[0]["comentar"];
}) {
  return (
    <View style={{ gap: 10 }}>
      <View style={styles.jogador}>
        <AvatarJogador id={jogador.id} nome={jogador.nome} fotoUrl={jogador.fotoUrl} tamanho={48} />
        <View style={{ flex: 1 }}>
          <Text style={styles.jogadorNome} numberOfLines={1}>
            {jogador.nome}
          </Text>
          <Text style={styles.jogadorSub}>
            {apenasUmGol
              ? "Replay desse gol"
              : `${gols.length} replay${gols.length === 1 ? "" : "s"} nessa partida`}
          </Text>
        </View>
      </View>
      <CardsReplay
        gols={gols}
        grupoNome={grupoNome}
        vazioTexto="Nenhum replay desse jogador nessa partida."
        comentar={comentar}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  jogador: { flexDirection: "row", alignItems: "center", gap: 12 },
  jogadorNome: { fontSize: 18, fontWeight: "700", color: cores.branco },
  jogadorSub: { fontSize: 12, color: cores.slate400 },
});
