import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { Text } from "@/ui/Texto";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";

import { criarGrupo, listarEsportes } from "@/api/grupos";
import { CaixaErro } from "@/acesso/ui";
import { mensagemDoErro } from "@/mensagens-erro";
import { hojeISO, partidaEncerrada } from "@/partidas";
import { BotaoLaranja } from "@/painel/ui";
import { Navbar } from "@/ui/Navbar";
import { SeletorData, SeletorDiaSemana, SeletorDuracao, SeletorHora } from "@/grupo/pickers";
import { useSessao } from "@/sessao/contexto";
import { cores, raio } from "@/tema";
import type { EsporteOpcao, TipoGrupo } from "@/contrato/tipos";

type LinhaHorario = { diaSemana: number; horaInicio: string; duracaoMin: number };
type LinhaAvulsa = { data: string; horaInicio: string; duracaoMin: number };

const HORARIO_PADRAO: LinhaHorario = { diaSemana: 1, horaInicio: "12:00", duracaoMin: 60 };
const avulsaPadrao = (): LinhaAvulsa => ({ data: hojeISO(), horaInicio: "12:00", duracaoMin: 60 });

function dataHoraJaPassou(data: string, hora: string, duracaoMin: number): boolean {
  const [a, m, d] = data.split("-").map(Number);
  const [hh, mm] = hora.split(":").map(Number);
  return partidaEncerrada(new Date(a, m - 1, d, hh, mm), duracaoMin);
}

export default function CriarGrupo() {
  const { chamarApi } = useSessao();
  const insets = useSafeAreaInsets();

  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<TipoGrupo>("RECORRENTE");
  const [horarios, setHorarios] = useState<LinhaHorario[]>([HORARIO_PADRAO]);
  const [avulsas, setAvulsas] = useState<LinhaAvulsa[]>([avulsaPadrao()]);

  const [esportes, setEsportes] = useState<EsporteOpcao[]>([]);
  const [erroEsportes, setErroEsportes] = useState(false);
  const [esporte, setEsporte] = useState("");
  const [termoEsporte, setTermoEsporte] = useState("");

  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  // Sem setState síncrono aqui: só nos callbacks da promise (regra
  // react-hooks/set-state-in-effect). O retry religa via `tentarEsportes`.
  const carregarEsportes = useCallback(() => {
    listarEsportes(chamarApi)
      .then(({ esportes: lista }) => {
        setEsportes(lista);
        setErroEsportes(false);
      })
      .catch(() => setErroEsportes(true));
  }, [chamarApi]);

  useEffect(() => {
    carregarEsportes();
  }, [carregarEsportes]);

  function tentarEsportes() {
    setErroEsportes(false);
    carregarEsportes();
  }

  const esportesFiltrados = esportes.filter((e) =>
    e.nome.toLowerCase().includes(termoEsporte.toLowerCase())
  );

  function setHorario(i: number, patch: Partial<LinhaHorario>) {
    setHorarios((prev) => prev.map((h, idx) => (idx === i ? { ...h, ...patch } : h)));
  }
  function setAvulsa(i: number, patch: Partial<LinhaAvulsa>) {
    setAvulsas((prev) => prev.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));
  }

  async function salvar() {
    setErro(null);
    if (!nome.trim()) {
      setErro("Dê um nome para o grupo.");
      return;
    }
    if (tipo === "AVULSO") {
      if (avulsas.length === 0) {
        setErro("Adicione pelo menos uma data.");
        return;
      }
      if (avulsas.some((d) => dataHoraJaPassou(d.data, d.horaInicio, d.duracaoMin))) {
        setErro("Uma das datas escolhidas já passou. Escolha datas e horários futuros.");
        return;
      }
    }
    if (!esporte) {
      setErro("Escolha o esporte.");
      return;
    }

    setSalvando(true);
    try {
      const grupo = await criarGrupo(chamarApi, {
        nome: nome.trim(),
        tipo,
        esporte,
        horariosRecorrentes: tipo === "RECORRENTE" ? horarios : undefined,
        datasAvulsas: tipo === "AVULSO" ? avulsas : undefined,
      });
      router.replace(`/grupos/${grupo.id}`);
    } catch (e) {
      setErro(mensagemDoErro(e));
      setSalvando(false);
    }
  }

  return (
    <SafeAreaView style={styles.tela} edges={["top", "left", "right"]}>
      <Navbar voltar="Painel" />

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.h1}>Criar grupo</Text>

        <View style={styles.campo}>
          <Text style={styles.label}>Nome do grupo</Text>
          <TextInput
            value={nome}
            onChangeText={setNome}
            placeholder="Futebol da segunda"
            placeholderTextColor={cores.slate500}
            style={styles.input}
          />
        </View>

        <View style={styles.campo}>
          <Text style={styles.label}>Tipo</Text>
          <View style={styles.toggle}>
            {(["RECORRENTE", "AVULSO"] as const).map((op) => (
              <Pressable
                key={op}
                onPress={() => setTipo(op)}
                style={[styles.toggleBtn, tipo === op && styles.toggleBtnAtivo]}
              >
                <Text style={[styles.toggleTexto, tipo === op && styles.toggleTextoAtivo]}>
                  {op === "RECORRENTE" ? "Recorrente" : "Avulso"}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {tipo === "RECORRENTE" ? (
          <View style={styles.campo}>
            <Text style={styles.label}>Horários</Text>
            {horarios.map((h, i) => (
              <View key={i} style={styles.linha}>
                <SeletorDiaSemana dia={h.diaSemana} onChange={(d) => setHorario(i, { diaSemana: d })} />
                <SeletorHora hhmm={h.horaInicio} onChange={(v) => setHorario(i, { horaInicio: v })} />
                <SeletorDuracao min={h.duracaoMin} onChange={(v) => setHorario(i, { duracaoMin: v })} />
                {horarios.length > 1 && (
                  <Pressable onPress={() => setHorarios((p) => p.filter((_, idx) => idx !== i))}>
                    <Text style={styles.remover}>Remover horário</Text>
                  </Pressable>
                )}
              </View>
            ))}
            <Pressable onPress={() => setHorarios((p) => [...p, HORARIO_PADRAO])}>
              <Text style={styles.adicionar}>+ Adicionar horário</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.campo}>
            <Text style={styles.label}>Datas</Text>
            {avulsas.map((d, i) => (
              <View key={i} style={styles.linha}>
                <SeletorData iso={d.data} onChange={(v) => setAvulsa(i, { data: v })} />
                <SeletorHora hhmm={d.horaInicio} onChange={(v) => setAvulsa(i, { horaInicio: v })} />
                <SeletorDuracao min={d.duracaoMin} onChange={(v) => setAvulsa(i, { duracaoMin: v })} />
                {avulsas.length > 1 && (
                  <Pressable onPress={() => setAvulsas((p) => p.filter((_, idx) => idx !== i))}>
                    <Text style={styles.remover}>Remover data</Text>
                  </Pressable>
                )}
              </View>
            ))}
            <Pressable onPress={() => setAvulsas((p) => [...p, avulsaPadrao()])}>
              <Text style={styles.adicionar}>+ Adicionar data</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.campo}>
          <Text style={styles.label}>Esporte</Text>
          {esporte ? (
            <View style={styles.esporteEscolhido}>
              <Text style={styles.esporteEscolhidoTexto}>{esporte}</Text>
              <Pressable onPress={() => { setEsporte(""); setTermoEsporte(""); }}>
                <Text style={styles.trocar}>Trocar</Text>
              </Pressable>
            </View>
          ) : erroEsportes ? (
            <View style={styles.esporteErro}>
              <Text style={styles.esporteErroTexto}>Não deu pra carregar os esportes.</Text>
              <Pressable onPress={tentarEsportes}>
                <Text style={styles.trocar}>Tentar de novo</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <TextInput
                value={termoEsporte}
                onChangeText={setTermoEsporte}
                placeholder={esportes.length ? "Buscar esporte..." : "Carregando esportes..."}
                placeholderTextColor={cores.slate500}
                editable={esportes.length > 0}
                style={styles.input}
              />
              <View style={styles.dropdown}>
                {esportesFiltrados.map((e) => (
                  <Pressable
                    key={e.id}
                    style={styles.opcao}
                    onPress={() => {
                      setEsporte(e.nome);
                      setTermoEsporte("");
                      setErro(null);
                    }}
                  >
                    <Text style={styles.opcaoTexto}>{e.nome}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}
        </View>

        <Text style={styles.nota}>Depois de salvar, vincule a quadra dentro do grupo.</Text>

        {erro && <CaixaErro>{erro}</CaixaErro>}
      </ScrollView>

      <View style={[styles.rodape, { paddingBottom: 14 + insets.bottom }]}>
        <BotaoLaranja titulo="Salvar" onPress={() => void salvar()} carregando={salvando} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.dark },
  scroll: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 140, gap: 20 },
  h1: { fontSize: 24, fontWeight: "700", color: cores.branco },
  campo: { gap: 8 },
  label: { fontSize: 13, fontWeight: "600", color: cores.slate300 },
  input: {
    height: 48,
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: cores.campoBorda,
    backgroundColor: cores.campoFundo,
    paddingHorizontal: 14,
    fontSize: 16,
    color: cores.branco,
  },
  toggle: { flexDirection: "row", gap: 8 },
  toggleBtn: {
    flex: 1,
    height: 44,
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: cores.campoBorda,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleBtnAtivo: { backgroundColor: cores.teal, borderColor: cores.teal },
  toggleTexto: { fontSize: 14, color: cores.slate300 },
  toggleTextoAtivo: { color: cores.dark, fontWeight: "700" },
  linha: {
    gap: 12,
    borderWidth: 1,
    borderColor: cores.linhaSutil,
    borderRadius: raio.card,
    padding: 12,
  },
  remover: { fontSize: 13, color: cores.erroTexto },
  adicionar: { fontSize: 14, fontWeight: "600", color: cores.teal },
  esporteEscolhido: {
    height: 48,
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: cores.teal,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  esporteEscolhidoTexto: { fontSize: 16, color: cores.branco },
  esporteErro: {
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: cores.erroBorda,
    backgroundColor: cores.erroFundo,
    padding: 12,
    gap: 6,
  },
  esporteErroTexto: { fontSize: 14, color: cores.erroTexto },
  trocar: { fontSize: 13, fontWeight: "600", color: cores.teal },
  dropdown: { gap: 2 },
  opcao: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: raio.campo,
    backgroundColor: cores.superficieSutil,
  },
  opcaoTexto: { fontSize: 15, color: cores.branco },
  nota: { fontSize: 13, color: cores.slate400 },
  rodape: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    borderTopColor: cores.cardBorda,
    backgroundColor: cores.dark,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
});
