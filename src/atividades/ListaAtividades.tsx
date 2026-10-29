import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { router, type Href } from "expo-router";

import { Text } from "@/ui/Texto";
import { AvatarJogador } from "@/ui/AvatarJogador";
import {
  ChevronRight,
  MessageCircle,
  SlidersHorizontal,
  UserPlus,
  Vote,
  type LucideIcon,
} from "@/ui/Icone";
import { cores, raio } from "@/tema";
import {
  descreverMudancaDeScore,
  descreverMudancasConfiguracao,
  nomeDeExibicao,
  type AtividadeGrupo,
} from "@/contrato/atividades";

// "Atividades recentes": replays comentados, enquetes novas, dedo duro
// (score), mudança da partida e entrada pelo convite. Usada no Painel (todos
// os grupos, com o nome do grupo em cada linha) e na tela do grupo, abaixo de
// "Partidas anteriores" (`noGrupo`, sem o nome do grupo). Cada tela põe o seu
// título em volta. Todo card com borda esquerda reta; teal se abre algo, cinza
// se é só leitura. Porta de weracha-site/components/atividades-recentes.tsx.

// "há 5 min", "há 3 h", "ontem", "12/09", relativo ao carregamento da tela.
export function tempoDesde(iso: string, agora: number): string {
  const data = new Date(iso);
  const min = Math.floor((agora - data.getTime()) / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const horas = Math.floor(min / 60);
  if (horas < 24) return `há ${horas} h`;
  if (horas < 48) return "ontem";
  return `${String(data.getDate()).padStart(2, "0")}/${String(data.getMonth() + 1).padStart(2, "0")}`;
}

type Linha = {
  titulo: string;
  texto: ReactNode;
  // Quem fez a ação (no comentário, o autor do último).
  avatar: { id?: string; nome: string; fotoUrl: string | null };
  icone: LucideIcon;
  extra: string | null;
  destino: Href | null;
};

function montarLinha(a: AtividadeGrupo, noGrupo: boolean): Linha | null {
  switch (a.tipo) {
    case "COMENTARIO": {
      const c = a.ultimoComentario;
      return {
        titulo: a.replayTipo === "GOL" ? `Gol de ${a.jogadorNome ?? "jogador"}` : "Lance importante",
        texto: c.bloqueado ? (
          <Text style={styles.italico}>Comentário de usuário bloqueado</Text>
        ) : (
          <>
            <Text style={styles.autor}>{c.autorNome}:</Text> {c.texto}
          </>
        ),
        avatar: { nome: c.autorNome, fotoUrl: c.bloqueado ? null : c.autorFotoUrl },
        icone: MessageCircle,
        extra: `${a.totalComentarios} ${a.totalComentarios === 1 ? "comentário" : "comentários"}`,
        destino: `/grupos/${a.grupoId}/resenha?video=${a.pedidoReplayId}`,
      };
    }
    case "ENQUETE":
      return {
        titulo: "Nova enquete",
        texto: (
          <>
            <Text style={styles.autor}>{nomeDeExibicao(a.autor)}:</Text> {a.pergunta}
          </>
        ),
        avatar: a.autor,
        icone: Vote,
        extra: null,
        destino: `/grupos/${a.grupoId}/enquetes?enquete=${a.enqueteId}`,
      };
    case "SCORE":
      return {
        titulo: "Dedo duro",
        texto: `${nomeDeExibicao(a.autor)} ${descreverMudancaDeScore({
          autorId: a.autor.id,
          alvo: a.alvo,
          de: a.de,
          para: a.para,
        })}`,
        avatar: a.autor,
        icone: SlidersHorizontal,
        extra: null,
        destino: `/grupos/${a.grupoId}/jogadores`,
      };
    case "CONFIGURACAO":
      return {
        titulo: "Partida mudou",
        texto: `${nomeDeExibicao(a.autor)} mudou: ${descreverMudancasConfiguracao(a)}`,
        avatar: a.autor,
        icone: SlidersHorizontal,
        extra: null,
        // Na tela do grupo já é o destino.
        destino: noGrupo ? null : `/grupos/${a.grupoId}`,
      };
    case "ENTROU_POR_CONVITE":
      return {
        titulo: a.voltou ? "De volta ao grupo" : "Novo jogador",
        texto: `${nomeDeExibicao(a.autor)} ${a.voltou ? "voltou ao grupo pelo convite" : "entrou pelo convite"}`,
        avatar: a.autor,
        icone: UserPlus,
        extra: null,
        destino: `/grupos/${a.grupoId}/jogadores`,
      };
    default:
      // Tipo que o site passou a mandar depois desta versão do app.
      return null;
  }
}

export function ListaAtividades({
  atividades,
  agora,
  noGrupo = false,
}: {
  atividades: AtividadeGrupo[];
  agora: number;
  noGrupo?: boolean;
}) {
  const linhas = atividades.flatMap((a) => {
    const l = montarLinha(a, noGrupo);
    return l ? [{ a, l }] : [];
  });
  return (
    <View style={styles.lista}>
      {linhas.map(({ a, l }) => {
        const meta = [noGrupo ? null : a.grupoNome, l.extra].filter(Boolean).join(" · ");
        const Icone = l.icone;
        const destino = l.destino;
        return (
          <Pressable
            key={a.id}
            style={[styles.linha, destino ? styles.clicavel : styles.soLeitura]}
            disabled={!destino}
            onPress={destino ? () => router.push(destino) : undefined}
          >
            <View>
              <AvatarJogador
                id={l.avatar.id}
                nome={l.avatar.nome}
                fotoUrl={l.avatar.fotoUrl}
                tamanho={36}
              />
              <View style={styles.seloIcone}>
                <Icone size={10} color={cores.teal} />
              </View>
            </View>
            <View style={styles.corpo}>
              <View style={styles.linhaEntre}>
                <Text style={[styles.titulo, styles.encolhe]} numberOfLines={1}>
                  {l.titulo}
                </Text>
                <Text style={styles.tempo}>{tempoDesde(a.criadoEm, agora)}</Text>
              </View>
              {/* Quebra até 2 linhas; o que passar disso some com "…". */}
              <Text style={styles.texto} numberOfLines={2}>
                {l.texto}
              </Text>
              {meta ? (
                <Text style={styles.meta} numberOfLines={1}>
                  {meta}
                </Text>
              ) : null}
            </View>
            {destino ? <ChevronRight size={16} color={cores.slate500} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  lista: { gap: 8 },
  linha: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderLeftWidth: 3,
    borderTopRightRadius: raio.campo,
    borderBottomRightRadius: raio.campo,
    backgroundColor: cores.cardFundo,
  },
  // Todo card no mesmo formato (borda esquerda reta, cantos só à direita,
  // igual ao card de partida); só a cor muda: teal abre algo, cinza é só leitura.
  clicavel: { borderColor: cores.cardBorda, borderLeftColor: cores.teal },
  soLeitura: { borderColor: "rgba(100, 116, 139, 0.2)", borderLeftColor: cores.slate500 },
  seloIcone: {
    position: "absolute",
    right: -4,
    bottom: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: cores.darkMaisEscuro,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  corpo: { flex: 1, minWidth: 0 },
  encolhe: { flexShrink: 1, minWidth: 0 },
  linhaEntre: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 8 },
  titulo: { fontSize: 14, fontWeight: "600", color: cores.branco },
  tempo: { fontSize: 11, color: cores.slate500 },
  texto: { fontSize: 12, color: cores.slate400 },
  autor: { fontSize: 12, color: cores.slate300 },
  italico: { fontSize: 12, fontStyle: "italic", color: cores.slate400 },
  meta: { marginTop: 2, fontSize: 11, color: cores.slate500 },
});
