import { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";

import { buscarAvaliacao } from "@/api/avaliacoes";
import type { EstadoAvaliacao } from "@/contrato/avaliacoes";
import { ModalPerfil } from "@/jogadores/modais";
import { mensagemDoErro } from "@/mensagens-erro";
import { BotaoLaranja, TelaCarregando, TelaErro } from "@/painel/ui";
import { textoFechaEm } from "@/partida/AvaliacaoGalera";
import { GraficoNotasDaGalera } from "@/partida/GraficoNotasDaGalera";
import { useSessao } from "@/sessao/contexto";
import { BarChart3, Clock, Users } from "@/ui/Icone";
import { Navbar } from "@/ui/Navbar";
import { Text } from "@/ui/Texto";
import { TituloTela } from "@/ui/TituloTela";
import { cores } from "@/tema";

// "Notas da galera" (desde 2026-11-10): a média de cada jogador da partida num
// ranking em lista com barra (maior em cima, um card por jogador, toque abre o
// perfil), acima dele o cartão de status da votação. Pra qualquer membro do
// grupo (quem jogou ou não), parcial durante a votação e final depois. Abre
// tocando nos cards da avaliação no Resultado. Espelha
// weracha-site/app/grupos/[id]/partidas/[partidaId]/notas/page.tsx.
export default function NotasDaGalera() {
  const insets = useSafeAreaInsets();
  const { id, partidaId } = useLocalSearchParams<{ id: string; partidaId: string }>();
  const { chamarApi } = useSessao();
  const [estado, setEstado] = useState<EstadoAvaliacao | undefined>(undefined);
  const [erro, setErro] = useState<string | null>(null);
  const [tentativa, setTentativa] = useState(0);
  // Perfil aberto pelo toque num jogador do ranking (igual a tela de Jogadores).
  const [perfilId, setPerfilId] = useState<string | null>(null);

  const carregar = useCallback(() => buscarAvaliacao(chamarApi, partidaId), [chamarApi, partidaId]);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const e = await carregar();
        if (vivo) {
          setEstado(e);
          setErro(null);
        }
      } catch (e) {
        if (vivo) setErro(mensagemDoErro(e));
      }
    })();
    return () => {
      vivo = false;
    };
  }, [carregar, tentativa]);

  const voltar = <Navbar voltar="Resultado" />;

  if (erro) {
    return (
      <SafeAreaView style={styles.tela} edges={["top", "left", "right"]}>
        {voltar}
        <TelaErro
          mensagem={erro}
          onTentar={() => {
            setErro(null);
            setTentativa((t) => t + 1);
          }}
        />
      </SafeAreaView>
    );
  }
  if (estado === undefined) {
    return (
      <SafeAreaView style={styles.tela} edges={["top", "left", "right"]}>
        {voltar}
        <TelaCarregando mensagem="Carregando as notas..." />
      </SafeAreaView>
    );
  }

  // Site antigo (sem o campo) trata igual a "ainda não abriu".
  const ranking = estado.ranking ?? null;
  const comVoto = ranking?.filter((j) => j.media !== null).length ?? 0;

  return (
    <SafeAreaView style={styles.tela} edges={["top", "left", "right"]}>
      {voltar}
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: 40 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.cabecalho}>
          <TituloTela Icone={BarChart3}>Notas da galera</TituloTela>
          <View style={styles.subLinha}>
            <Users size={12} color={cores.slate400} />
            <Text style={styles.sub} numberOfLines={1}>
              {estado.grupoNome}
            </Text>
          </View>
        </View>

        {!ranking && estado.souJogador && estado.aberta ? (
          // Joguei e ainda não votei em todos: o site esconde a parcial pra não
          // influenciar o voto.
          <View style={styles.avaliarCaixa}>
            <Text style={styles.sub}>
              Avalie a galera pra ver as notas parciais. Assim ninguém é influenciado antes de
              votar.
            </Text>
            <BotaoLaranja
              titulo="Avaliar a galera"
              onPress={() => router.push(`/grupos/${id}/partidas/${partidaId}/avaliacao`)}
            />
          </View>
        ) : !ranking ? (
          <Text style={styles.sub}>A avaliação abre quando a partida acabar.</Text>
        ) : comVoto === 0 ? (
          <Text style={styles.sub}>Ninguém votou ainda.</Text>
        ) : (
          <>
            <StatusDaVotacao estado={estado} />
            <GraficoNotasDaGalera
              ranking={ranking}
              meuId={estado.meuId}
              onAbrirPerfil={setPerfilId}
            />
            <Text style={styles.nota}>
              Média das notas que cada um recebeu, de 0 a 100. A nota que cada um se deu não
              entra. Ninguém vê quem votou em quem.
            </Text>
          </>
        )}
      </ScrollView>
      <ModalPerfil
        key={perfilId ?? "sem-perfil"}
        aberto={perfilId !== null}
        chamarApi={chamarApi}
        grupoId={id}
        jogadorId={perfilId}
        onFechar={() => setPerfilId(null)}
      />
    </SafeAreaView>
  );
}

// Cartão de status acima do gráfico: pílula Parcial/Final, quantos já votaram
// com uma barra de progresso e, embaixo, até quando muda (ou que encerrou). Uma
// fonte só, em tamanhos diferentes, em vez de tudo numa frase. Espelha o
// StatusDaVotacao do site.
function StatusDaVotacao({ estado }: { estado: EstadoAvaliacao }) {
  const p = estado.participacao;
  const progresso = p && p.total > 0 ? Math.min(1, p.votaram / p.total) : 0;
  const fecha = textoFechaEm(estado.fechaEm);
  return (
    <View style={styles.statusCaixa}>
      <View style={styles.statusLinha}>
        <View style={[styles.pilula, estado.aberta ? styles.pilulaParcial : styles.pilulaFinal]}>
          <Text style={[styles.pilulaTexto, { color: estado.aberta ? cores.teal : cores.branco }]}>
            {estado.aberta ? "Parcial" : "Final"}
          </Text>
        </View>
        {p ? (
          <Text style={styles.contagem}>
            <Text style={styles.contagemForte}>{p.votaram}</Text> de {p.total}{" "}
            {estado.aberta ? "já " : ""}
            {p.votaram === 1 ? "votou" : "votaram"}
          </Text>
        ) : null}
      </View>
      {p ? (
        <View style={styles.trilho}>
          <View
            style={[
              styles.preenchido,
              {
                width: `${progresso * 100}%`,
                backgroundColor: estado.aberta ? cores.teal : cores.slate400,
              },
            ]}
          />
        </View>
      ) : null}
      <View style={styles.prazoLinha}>
        <Clock size={12} color={cores.slate400} />
        <Text style={styles.prazo}>
          {estado.aberta
            ? `Pode mudar até ${fecha.charAt(0).toLowerCase()}${fecha.slice(1)}`
            : "Votação encerrada"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.dark },
  scroll: { paddingHorizontal: 16, paddingTop: 8, gap: 18 },
  cabecalho: { gap: 2 },
  subLinha: { flexDirection: "row", alignItems: "center", gap: 4 },
  sub: { flexShrink: 1, fontSize: 14, color: cores.slate400 },
  avaliarCaixa: { gap: 12 },
  statusCaixa: {
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  statusLinha: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  pilula: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 2 },
  pilulaParcial: { backgroundColor: "rgba(31, 179, 163, 0.15)" },
  pilulaFinal: { backgroundColor: "rgba(255, 255, 255, 0.1)" },
  pilulaTexto: { fontSize: 12, fontWeight: "600" },
  contagem: { fontSize: 14, color: cores.slate400 },
  contagemForte: { fontWeight: "600", color: cores.branco },
  trilho: { height: 6, borderRadius: 3, overflow: "hidden", backgroundColor: "rgba(255, 255, 255, 0.1)" },
  preenchido: { height: "100%", borderRadius: 3 },
  prazoLinha: { flexDirection: "row", alignItems: "center", gap: 6 },
  prazo: { fontSize: 12, color: cores.slate400 },
  nota: { fontSize: 12, color: cores.slate500 },
});
