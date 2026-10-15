import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "@/ui/Texto";

import { buscarDetalheEsporte } from "@/api/grupos";
import { ModalCartao } from "@/grupo/modais";
import { mensagemDoErro } from "@/mensagens-erro";
import { BolaFutebol, ChevronDown } from "@/ui/Icone";
import { useSessao } from "@/sessao/contexto";
import { cores, raio } from "@/tema";
import type { DetalheEsporte } from "@/contrato/tipos";

// Pílula do esporte com ícone, igual ao EsportePill do site
// (components/info-pill.tsx). `clicavel` abre o modal com a descrição do
// esporte e as posições (linha de pílulas do topo do grupo e do resultado).
export function PilulaEsporte({ esporte, clicavel = false }: { esporte: string; clicavel?: boolean }) {
  const [aberto, setAberto] = useState(false);
  const conteudo = (
    <>
      <BolaFutebol size={12} color={cores.branco} />
      <Text style={styles.pillTexto}>{esporte}</Text>
    </>
  );
  if (!clicavel) return <View style={styles.pill}>{conteudo}</View>;
  return (
    <>
      <Pressable style={styles.pill} onPress={() => setAberto(true)}>
        {conteudo}
      </Pressable>
      <ModalEsporte esporte={esporte} aberto={aberto} onFechar={() => setAberto(false)} />
    </>
  );
}

// Descrição do esporte + posições; tocar numa posição abre a descrição dela.
// Busca na primeira abertura e guarda, pra reabrir sem esperar.
function ModalEsporte({
  esporte,
  aberto,
  onFechar,
}: {
  esporte: string;
  aberto: boolean;
  onFechar: () => void;
}) {
  const { chamarApi } = useSessao();
  const [detalhe, setDetalhe] = useState<DetalheEsporte | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [posicaoAberta, setPosicaoAberta] = useState<string | null>(null);

  useEffect(() => {
    if (!aberto || detalhe?.esporte.nome === esporte) return;
    let vivo = true;
    buscarDetalheEsporte(chamarApi, esporte)
      .then((d) => {
        if (!vivo) return;
        setDetalhe(d);
        setErro(null);
      })
      .catch((e) => vivo && setErro(mensagemDoErro(e)));
    return () => {
      vivo = false;
    };
  }, [aberto, esporte, detalhe, chamarApi]);

  function fechar() {
    setPosicaoAberta(null);
    onFechar();
  }

  return (
    <ModalCartao aberto={aberto} onFechar={fechar}>
      <View style={styles.eyebrowLinha}>
        <BolaFutebol size={16} color={cores.teal} />
        <Text style={styles.eyebrow}>Esporte</Text>
      </View>
      <Text style={styles.titulo}>{esporte}</Text>
      {erro ? (
        <Text style={styles.erro}>{erro}</Text>
      ) : !detalhe ? (
        <Text style={styles.desc}>Carregando...</Text>
      ) : (
        <>
          <Text style={styles.desc}>{detalhe.esporte.descricao}</Text>
          {detalhe.posicoes.length > 0 && (
            <View style={styles.posicoesBloco}>
              <Text style={styles.posicoesRotulo}>Posições</Text>
              <ScrollView style={styles.posicoesLista} contentContainerStyle={{ gap: 6 }}>
                {detalhe.posicoes.map((p) => {
                  const aberta = posicaoAberta === p.id;
                  return (
                    <Pressable
                      key={p.id}
                      style={styles.posicao}
                      onPress={() => setPosicaoAberta(aberta ? null : p.id)}
                    >
                      <View style={styles.posicaoLinha}>
                        <Text style={styles.posicaoNome}>{p.nome}</Text>
                        <View style={aberta ? { transform: [{ rotate: "180deg" }] } : undefined}>
                          <ChevronDown size={16} color={cores.slate400} />
                        </View>
                      </View>
                      {aberta ? <Text style={styles.posicaoDesc}>{p.descricao}</Text> : null}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}
        </>
      )}
    </ModalCartao>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 999,
    backgroundColor: cores.tealDark,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  pillTexto: { fontSize: 12, fontWeight: "600", color: cores.branco },
  eyebrowLinha: { flexDirection: "row", alignItems: "center", gap: 6 },
  eyebrow: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.5,
    color: cores.teal,
    textTransform: "uppercase",
  },
  titulo: { fontSize: 18, fontWeight: "700", color: cores.branco },
  desc: { fontSize: 14, lineHeight: 20, color: cores.slate400 },
  erro: { fontSize: 13, color: cores.erroTexto },
  posicoesBloco: { gap: 8, marginTop: 6 },
  posicoesRotulo: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.5,
    color: cores.slate500,
    textTransform: "uppercase",
  },
  posicoesLista: { maxHeight: 300 },
  posicao: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.03)",
    gap: 4,
  },
  posicaoLinha: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  posicaoNome: { flexShrink: 1, fontSize: 14, fontWeight: "600", color: cores.branco },
  posicaoDesc: { fontSize: 12, lineHeight: 17, color: cores.slate400 },
});
