import { useState, type ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet } from "react-native";

import { Text } from "@/ui/Texto";
import { ArrowLeftRight, Ban, RotateCcw } from "@/ui/Icone";
import { cancelarGol, migrarGol, reativarGol } from "@/api/partidas";
import { MenuAcoes, type ItemMenu } from "@/grupo/MenuAcoes";
import { ModalCartao, ModalConfirmar } from "@/grupo/modais";
import { Eyebrow } from "@/partida/ui";
import { mensagemDoErro } from "@/mensagens-erro";
import { useSessao } from "@/sessao/contexto";
import { cores, raio } from "@/tema";
import type { GolComVideos } from "@/contrato/tipos";

// Correção de gol pela linha do tempo (menu ⋮ de cada gol no PainelGols):
// migrar pra outro jogador, cancelar (soft delete) e reativar. Usado na tela
// de Resultado e na tela Ao vivo (admin corrige durante o jogo, sem anotar pra
// depois). Espelha weracha-site/components/correcao-de-gols.tsx. Quem/quando
// pode é regra do servidor (admin do grupo, até 24h depois do fim da partida).
//
// Uso: `const correcao = useCorrecaoDeGols()` no topo do componente (antes de
// qualquer return), `onMenuGol={(gol) => correcao.abrirMenu(gol, contexto)}` no
// PainelGols e `{correcao.elementos}` no JSX.

export type ContextoCorrecaoDeGols = {
  // Candidatos a receber um gol migrado (o servidor ainda exige que seja
  // membro do grupo). O dono atual é tirado da lista aqui.
  jogadores: { id: string; nome: string }[];
  // Recarrega o que a tela mostra depois que a correção deu certo.
  aoAlterar: () => Promise<void>;
  aoErro: (mensagem: string) => void;
};

type GolNoContexto = { gol: GolComVideos; contexto: ContextoCorrecaoDeGols };

export function useCorrecaoDeGols(): {
  abrirMenu: (gol: GolComVideos, contexto: ContextoCorrecaoDeGols) => void;
  elementos: ReactNode;
} {
  const { chamarApi } = useSessao();
  const [menu, setMenu] = useState<GolNoContexto | null>(null);
  const [migrar, setMigrar] = useState<GolNoContexto | null>(null);
  // Gol que o menu pediu pra cancelar: confirma antes (igual ao site).
  const [cancelar, setCancelar] = useState<GolNoContexto | null>(null);
  const [cancelando, setCancelando] = useState(false);

  async function executar(alvo: GolNoContexto, fn: () => Promise<unknown>) {
    try {
      await fn();
      await alvo.contexto.aoAlterar();
    } catch (e) {
      alvo.contexto.aoErro(mensagemDoErro(e));
    }
  }

  const itens: ItemMenu[] = !menu
    ? []
    : // Cancelar é a última opção (a mais destrutiva), igual o site.
      menu.gol.cancelado
      ? [
          {
            rotulo: "Reativar gol",
            Icone: RotateCcw,
            onPress: () => {
              const alvo = menu;
              void executar(alvo, () => reativarGol(chamarApi, alvo.gol.golId));
            },
          },
        ]
      : [
          { rotulo: "Migrar pra outro jogador", Icone: ArrowLeftRight, onPress: () => setMigrar(menu) },
          { rotulo: "Cancelar gol", Icone: Ban, destrutivo: true, onPress: () => setCancelar(menu) },
        ];

  const elementos = (
    <>
      <MenuAcoes
        aberto={menu !== null}
        titulo={menu?.gol.jogador ? `Gol de ${menu.gol.jogador.nome}` : "Gol"}
        itens={itens}
        onFechar={() => setMenu(null)}
      />

      <ModalConfirmar
        aberto={cancelar !== null}
        Icone={Ban}
        eyebrow="Cancelar gol"
        titulo={`Cancelar esse gol de ${cancelar?.gol.jogador?.nome ?? ""}?`}
        descricao={
          cancelar && cancelar.gol.videos.length > 0
            ? "O gol sai do ranking de artilheiros, da contagem e da resenha. Fica na linha do tempo marcado como cancelado, e o replay continua disponível ali como registro. Dá pra reativar o gol depois."
            : "O gol sai do ranking de artilheiros e da contagem. Fica registrado na linha do tempo que foi cancelado, e dá pra reativar depois."
        }
        destrutivo
        confirmarLabel="Sim, cancelar"
        ocupado={cancelando}
        onConfirmar={async () => {
          const alvo = cancelar;
          if (!alvo) return;
          setCancelando(true);
          await executar(alvo, () => cancelarGol(chamarApi, alvo.gol.golId));
          setCancelando(false);
          setCancelar(null);
        }}
        onFechar={() => {
          if (!cancelando) setCancelar(null);
        }}
      />

      {migrar && (
        <ModalMigrarGol
          nome={migrar.gol.jogador?.nome ?? ""}
          jogadores={migrar.contexto.jogadores
            .filter((j) => j.id !== migrar.gol.jogador?.id)
            .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))}
          onFechar={() => setMigrar(null)}
          onSalvar={(novoJogadorId) => {
            const alvo = migrar;
            setMigrar(null);
            void executar(alvo, () => migrarGol(chamarApi, alvo.gol.golId, novoJogadorId));
          }}
        />
      )}
    </>
  );

  return { abrirMenu: (gol, contexto) => setMenu({ gol, contexto }), elementos };
}

function ModalMigrarGol({
  nome,
  jogadores,
  onFechar,
  onSalvar,
}: {
  nome: string;
  jogadores: { id: string; nome: string }[];
  onFechar: () => void;
  onSalvar: (novoJogadorId: string) => void;
}) {
  const [sel, setSel] = useState<string | null>(jogadores[0]?.id ?? null);
  return (
    <ModalCartao aberto onFechar={onFechar}>
      <Eyebrow>Migrar gol</Eyebrow>
      <Text style={styles.titulo}>Migrar o gol de {nome} pra quem?</Text>
      <Text style={styles.desc}>
        Use quando o gol foi marcado no jogador errado. Fica registrado que {nome} era o dono
        original.
      </Text>
      {jogadores.length === 0 ? (
        <Text style={styles.desc}>Não há outro jogador nessa partida.</Text>
      ) : (
        <>
          <ScrollView style={{ maxHeight: 220 }}>
            {jogadores.map((j) => (
              <Pressable
                key={j.id}
                style={[styles.opcao, sel === j.id && styles.opcaoAtiva]}
                onPress={() => setSel(j.id)}
              >
                <Text style={styles.opcaoTexto}>{j.nome}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <Pressable style={styles.botao} disabled={!sel} onPress={() => sel && onSalvar(sel)}>
            <Text style={styles.botaoTexto}>Migrar gol</Text>
          </Pressable>
        </>
      )}
    </ModalCartao>
  );
}

const styles = StyleSheet.create({
  titulo: { fontSize: 18, fontWeight: "700", color: cores.branco },
  desc: { fontSize: 13, lineHeight: 19, color: cores.slate400 },
  opcao: {
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: raio.campo,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: "transparent",
    backgroundColor: cores.superficieSutil,
  },
  opcaoAtiva: { borderColor: cores.teal, backgroundColor: cores.avisoFundo },
  opcaoTexto: { fontSize: 15, color: cores.branco },
  botao: {
    height: 48,
    borderRadius: raio.campo,
    backgroundColor: cores.orange,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  botaoTexto: { fontSize: 15, fontWeight: "700", color: cores.dark },
});
