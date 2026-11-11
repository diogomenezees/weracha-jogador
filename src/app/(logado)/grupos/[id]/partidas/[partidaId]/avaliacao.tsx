import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { avaliar, buscarAvaliacao } from "@/api/avaliacoes";
import type { AvaliadoDaPartida, EstadoAvaliacao } from "@/contrato/avaliacoes";
import { mensagemDoErro } from "@/mensagens-erro";
import { TelaCarregando, TelaErro } from "@/painel/ui";
import {
  BarraDeNota,
  nomeCurto,
  notaJaFechadaPraMim,
  textoFechaEm,
  textoNotaParcial,
  textoParticipacao,
} from "@/partida/AvaliacaoGalera";
import { BotaoPrimario, Cabecalho, Rodape, TelaPartida } from "@/partida/ui";
import { useSessao } from "@/sessao/contexto";
import { AvatarJogador } from "@/ui/AvatarJogador";
import { ArrowRight, PartyPopper, ThumbsUp } from "@/ui/Icone";
import { Text, FAMILIA_MONO } from "@/ui/Texto";
import { cores, raio } from "@/tema";
import { pedirAvaliacaoSePuder } from "@/avaliacao/pedirAvaliacao";

// Votação da avaliação pós-partida ("nota da galera"): um colega por tela, em
// ordem aleatória, arrasta e solta a bolinha = voto gravado (sem editar). Pular
// tira só desta sessão. No fim, autoavaliação opcional. Espelha
// weracha-site/app/grupos/[id]/partidas/[partidaId]/avaliacao/page.tsx.

type ItemFila =
  { tipo: "colega"; avaliado: AvaliadoDaPartida } | { tipo: "auto" };

const NOTA_INICIAL = 50;
// Carregando curto depois do voto (e no Pular): dá a sensação de "foi pro
// próximo" sem parar pra mostrar nada (o resumo do voto ninguém lia).
const TEMPO_TROCA_MS = 700;

function embaralhar<T>(lista: T[]): T[] {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

function montarFila(estado: EstadoAvaliacao): ItemFila[] {
  const colegas = embaralhar(
    estado.avaliados.filter((a) => a.minhaNota === null),
  ).map((avaliado) => ({ tipo: "colega" as const, avaliado }));
  return estado.minhaAutoavaliacao === null
    ? [...colegas, { tipo: "auto" }]
    : colegas;
}

export default function TelaAvaliacao() {
  const { id, partidaId } = useLocalSearchParams<{
    id: string;
    partidaId: string;
  }>();
  const { chamarApi } = useSessao();
  // A TelaPartida só protege o topo: o rodapé (Pular) soma a barra de
  // navegação do Android, igual ao Rodape das outras telas da partida.
  const insets = useSafeAreaInsets();
  const irProResultado = () =>
    router.replace(`/grupos/${id}/partidas/${partidaId}/resultado`);

  const [estado, setEstado] = useState<EstadoAvaliacao | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [tentativa, setTentativa] = useState(0);
  const [fila, setFila] = useState<ItemFila[]>([]);
  const [indice, setIndice] = useState(0);
  const [nota, setNota] = useState(NOTA_INICIAL);
  const [enviando, setEnviando] = useState(false);
  const [erroVoto, setErroVoto] = useState<string | null>(null);
  const [trocando, setTrocando] = useState(false);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const e = await buscarAvaliacao(chamarApi, partidaId);
        if (!vivo) return;
        setEstado(e);
        setFila(montarFila(e));
        setIndice(0);
        setErro(null);
      } catch (e) {
        if (vivo) setErro(mensagemDoErro(e));
      }
    })();
    return () => {
      vivo = false;
    };
  }, [chamarApi, partidaId, tentativa]);

  useEffect(
    () => () => {
      if (temporizador.current) clearTimeout(temporizador.current);
    },
    [],
  );

  // Fim da fila: busca o estado de novo (só o estado, sem remontar a fila) pra
  // tela final mostrar a parcial e a participação atualizadas. Uma vez só.
  const fimDaFila = estado !== null && fila.length > 0 && indice >= fila.length;
  const atualizouNoFim = useRef(false);
  const votouNestaTela = useRef(false);
  useEffect(() => {
    if (!fimDaFila || atualizouNoFim.current) return;
    atualizouNoFim.current = true;
    // Notas enviadas: momento feliz e sempre depois do jogo (a avaliação só abre com a
    // partida encerrada). Só pra quem votou agora, não pra quem reabriu a tela já feita.
    if (votouNestaTela.current) pedirAvaliacaoSePuder("notas-enviadas", 2000);
    buscarAvaliacao(chamarApi, partidaId)
      .then(setEstado)
      .catch(() => {});
  }, [fimDaFila, chamarApi, partidaId]);

  const avancar = useCallback(() => {
    setTrocando(false);
    setErroVoto(null);
    setNota(NOTA_INICIAL);
    setIndice((i) => i + 1);
  }, []);

  const proximo = useCallback(() => {
    setTrocando(true);
    temporizador.current = setTimeout(avancar, TEMPO_TROCA_MS);
  }, [avancar]);

  async function votar(valor: number) {
    const item = fila[indice];
    if (!item || enviando || trocando || !estado) return;
    setEnviando(true);
    setErroVoto(null);
    try {
      await avaliar(
        chamarApi,
        partidaId,
        item.tipo === "auto" ? estado.meuId : item.avaliado.id,
        valor,
      );
      votouNestaTela.current = true;
      proximo();
    } catch (e) {
      setErroVoto(mensagemDoErro(e));
    } finally {
      setEnviando(false);
    }
  }

  if (erro) {
    return (
      <TelaPartida voltar="Resultado" onVoltar={irProResultado}>
        <TelaErro
          mensagem={erro}
          onTentar={() => {
            setErro(null);
            setTentativa((t) => t + 1);
          }}
        />
      </TelaPartida>
    );
  }
  if (!estado) {
    return (
      <TelaPartida voltar="Resultado" onVoltar={irProResultado}>
        <TelaCarregando mensagem="Carregando a avaliação..." />
      </TelaPartida>
    );
  }

  const total = estado.avaliados.length;
  const jaAvaliados = estado.avaliados.filter(
    (a) => a.minhaNota !== null,
  ).length;
  const item = fila[indice];

  if (!estado.aberta || !estado.souJogador || !item) {
    const fim = estado.aberta && estado.souJogador;
    const parcial = fim ? estado.minhaNotaParcial : null;
    const participacao = fim ? textoParticipacao(estado) : null;
    // Todo mundo já me avaliou: a nota não muda mais (sai o "parcial" e o aviso de prazo).
    const notaFechada = fim && notaJaFechadaPraMim(estado);
    const motivo = fim
      ? parcial
        ? `A nota pode mudar até a votação fechar, ${textoFechaEm(estado.fechaEm)}.`
        : `Sua nota aparece no resultado da partida quando a votação fechar, ${textoFechaEm(estado.fechaEm)}.`
      : !estado.souJogador
        ? "Só quem jogou essa partida avalia a galera."
        : estado.encerrada
          ? "A votação dessa partida já fechou. Veja o resultado na tela da partida."
          : "A avaliação abre quando a partida acabar.";
    return (
      <TelaPartida voltar="Resultado" onVoltar={irProResultado}>
        <View style={styles.topoFim}>
          <Cabecalho titulo="Nota da galera" Icone={ThumbsUp} grupoNome={estado.grupoNome ?? ""} />
        </View>
        <View style={styles.centro}>
          {fim ? (
            <PartyPopper size={48} color={cores.orange} />
          ) : (
            <ThumbsUp size={40} color={cores.slate500} />
          )}
          {/* Com a nota parcial à mostra, o "Valeu!" sobra: fica só o ícone. */}
          {fim && parcial?.media == null && <Text style={styles.valeu}>Valeu!</Text>}
          {/* Parcial + autoavaliação + quem falta votar (site antigo sem os campos: só o texto). */}
          {parcial && (
            <View style={styles.parcialCaixa}>
              {parcial.media !== null ? (
                <>
                  <Text style={styles.parcialRotulo}>
                    {notaFechada ? "Sua nota final" : "Sua nota parcial"}
                  </Text>
                  <Text style={styles.parcialNumero}>{parcial.media}</Text>
                </>
              ) : (
                <Text style={styles.parcialTexto}>{textoNotaParcial(estado)}</Text>
              )}
              {/* A minha autoavaliação, pra comparar com a da galera (só eu vejo). */}
              {estado.minhaAutoavaliacao !== null && (
                <View style={styles.parcialAuto}>
                  <Text style={styles.parcialAutoTexto}>Você se deu {estado.minhaAutoavaliacao}</Text>
                </View>
              )}
              {/* Sem a quantidade de avaliações: quantas pessoas me avaliaram não
                  importa pro jogador, só quem ainda falta votar. */}
              {participacao && <Text style={styles.parcialSub}>{participacao}</Text>}
            </View>
          )}
          {!notaFechada && <Text style={styles.motivo}>{motivo}</Text>}
        </View>
        <Rodape
          primario={
            <BotaoPrimario
              titulo="Ver resultado"
              cor="teal"
              onPress={irProResultado}
            />
          }
        />
      </TelaPartida>
    );
  }

  const colegasNaFila = fila.filter((f) => f.tipo === "colega").length;
  const passouNaFila = Math.min(indice, colegasNaFila);
  const posicao = Math.min(
    total,
    jaAvaliados + passouNaFila + (item.tipo === "colega" ? 1 : 0),
  );
  const progresso = total === 0 ? 1 : posicao / total;

  return (
    <TelaPartida voltar="Resultado" onVoltar={irProResultado}>
      <View style={[styles.corpo, { paddingBottom: 24 + insets.bottom }]}>
        {/* Mesmo cabeçalho das outras telas da partida (título + grupo embaixo). */}
        <Cabecalho titulo="Nota da galera" Icone={ThumbsUp} grupoNome={estado.grupoNome ?? ""} />
        <View style={styles.progressoLinha}>
          <View style={styles.progressoTrilho}>
            <View
              style={[styles.progressoCheio, { width: `${progresso * 100}%` }]}
            />
          </View>
          <Text style={styles.progressoTexto}>
            {item.tipo === "auto" ? "Você" : `${posicao} de ${total}`}
          </Text>
        </View>

        {enviando || trocando ? (
          // Soltou a bolinha (ou pulou): carregando até o próximo jogador.
          <View
            style={styles.meio}
            accessibilityLabel="Carregando o próximo jogador"
          >
            <ActivityIndicator size="large" color={cores.orange} />
          </View>
        ) : (
          <View style={styles.meio}>
            {item.tipo === "colega" ? (
              <>
                <AvatarJogador
                  id={item.avaliado.id}
                  nome={item.avaliado.nome}
                  fotoUrl={item.avaliado.fotoUrl}
                  tamanho={112}
                />
                <View style={{ alignItems: "center" }}>
                  <Text style={styles.nome}>
                    {item.avaliado.apelido?.trim() || item.avaliado.nome}
                  </Text>
                  {item.avaliado.apelido?.trim() ? (
                    <Text style={styles.nomeCompleto}>
                      {item.avaliado.nome}
                    </Text>
                  ) : null}
                </View>
                <Text style={styles.pergunta}>
                  Como foi a partida do {nomeCurto(item.avaliado)} hoje?
                </Text>
              </>
            ) : (
              <>
                <ThumbsUp size={64} color={cores.teal} />
                <Text style={styles.nome}>E você, como foi hoje?</Text>
                <Text style={styles.dica}>
                  Opcional. Não entra na média que os outros veem: serve pra
                  comparar com a nota da galera.
                </Text>
              </>
            )}

            <View style={{ width: "100%", alignItems: "center" }}>
              <BarraDeNota
                valor={nota}
                onMudar={setNota}
                onSoltar={(v) => void votar(v)}
              />
              <Text style={styles.dica}>
                Arraste a bolinha e solte. A nota não pode ser trocada.
              </Text>
              {erroVoto && <Text style={styles.erro}>{erroVoto}</Text>}
            </View>
          </View>
        )}

        {/* Só o Pular, à direita: o "3 de N" já está na barra do topo. */}
        <View style={styles.rodapeLinha}>
          {!enviando && !trocando && (
            <Pressable hitSlop={10} onPress={proximo} style={styles.pular}>
              <Text style={styles.pularTexto}>Pular</Text>
              <ArrowRight size={16} color={cores.slate300} />
            </Pressable>
          )}
        </View>
      </View>
    </TelaPartida>
  );
}

const styles = StyleSheet.create({
  corpo: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 14,
  },
  progressoLinha: { flexDirection: "row", alignItems: "center", gap: 12 },
  progressoTrilho: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
  },
  progressoCheio: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: cores.orange,
  },
  progressoTexto: {
    fontFamily: FAMILIA_MONO,
    fontSize: 12,
    color: cores.slate400,
  },
  // paddingBottom: sobe o miolo (o cabeçalho em cima empurrava o centro pra baixo).
  meio: { flex: 1, alignItems: "center", justifyContent: "center", gap: 20, paddingBottom: 48 },
  nome: {
    fontSize: 20,
    fontWeight: "700",
    color: cores.branco,
    textAlign: "center",
  },
  nomeCompleto: { fontSize: 13, color: cores.slate400 },
  pergunta: { fontSize: 17, color: cores.slate200, textAlign: "center" },
  dica: {
    marginTop: 10,
    fontSize: 12,
    color: cores.slate500,
    textAlign: "center",
  },
  erro: {
    marginTop: 10,
    fontSize: 13,
    color: cores.erroTexto,
    textAlign: "center",
  },
  rodapeLinha: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    minHeight: 32,
  },
  pular: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
  },
  pularTexto: { fontSize: 14, fontWeight: "500", color: cores.slate300 },
  topoFim: { paddingHorizontal: 24, paddingTop: 12 },
  centro: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    // Sobe o conteúdo: o Rodape ("Ver resultado") é absoluto e cobre o fim da área,
    // então o centro calculado ficava baixo. 140 ≈ altura do rodapé + folga.
    paddingBottom: 140,
    gap: 14,
  },
  valeu: { fontSize: 24, fontWeight: "700", color: cores.branco },
  parcialCaixa: {
    alignSelf: "stretch",
    alignItems: "center",
    borderRadius: raio.card,
    borderWidth: 1,
    borderColor: cores.avisoBorda,
    backgroundColor: cores.avisoFundo,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  parcialRotulo: { fontSize: 16, fontWeight: "600", color: cores.teal },
  parcialNumero: {
    fontFamily: FAMILIA_MONO,
    fontSize: 36,
    fontWeight: "700",
    color: cores.branco,
  },
  parcialSub: { marginTop: 4, fontSize: 14, color: cores.slate400, textAlign: "center" },
  parcialTexto: { fontSize: 14, color: cores.slate300, textAlign: "center" },
  // Selo laranja (cor do ❤) da autoavaliação, pra comparar com a parcial de relance.
  parcialAuto: {
    marginTop: 8,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: "rgba(242, 140, 30, 0.15)",
  },
  parcialAutoTexto: { fontSize: 14, fontWeight: "600", color: cores.orange },
  motivo: {
    fontSize: 15,
    color: cores.slate300,
    textAlign: "center",
    lineHeight: 22,
  },
});
