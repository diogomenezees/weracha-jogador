import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { Text } from "@/ui/Texto";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";

import { criarGrupo, listarEsportes } from "@/api/grupos";
import { CaixaErro } from "@/acesso/ui";
import { mensagemDoErro } from "@/mensagens-erro";
import { hojeISO, partidaEncerrada } from "@/partidas";
import { BotaoLaranja } from "@/painel/ui";
import { MapPin, TriangleAlert } from "@/ui/Icone";
import { Navbar } from "@/ui/Navbar";
import { ScrollTeclado } from "@/ui/ScrollTeclado";
import { SeletorData, SeletorDiaSemana, SeletorDuracao, SeletorHora } from "@/grupo/pickers";
import { useSessao } from "@/sessao/contexto";
import { cores, raio } from "@/tema";
import type { EsporteOpcao, TipoGrupo } from "@/contrato/tipos";

type LinhaHorario = { diaSemana: number; horaInicio: string; duracaoMin: number };
type LinhaAvulsa = { data: string; horaInicio: string; duracaoMin: number };

const HORARIO_PADRAO: LinhaHorario = { diaSemana: 1, horaInicio: "12:00", duracaoMin: 60 };
const avulsaPadrao = (): LinhaAvulsa => ({ data: hojeISO(), horaInicio: "12:00", duracaoMin: 60 });

// Campo que a validação apontou: recebe borda vermelha + mensagem embaixo, e a
// tela rola até ele (e abre o teclado, se for de texto). Mesmo efeito do
// `required` + mensagem do site (weracha-site/app/grupos/novo/page.tsx).
type CampoComErro = "nome" | "datas" | "esporte";

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
  const [erroCampo, setErroCampo] = useState<{ campo: CampoComErro; mensagem: string } | null>(
    null
  );
  const [salvando, setSalvando] = useState(false);

  const rolagemRef = useRef<ScrollView | null>(null);
  const nomeRef = useRef<TextInput>(null);
  const esporteRef = useRef<TextInput>(null);
  // Posição (y) de cada campo dentro da rolagem, medida no onLayout.
  const posicaoDoCampo = useRef<Partial<Record<CampoComErro, number>>>({});

  function apontarCampo(campo: CampoComErro, mensagem: string) {
    setErroCampo({ campo, mensagem });
    const y = posicaoDoCampo.current[campo] ?? 0;
    rolagemRef.current?.scrollTo({ y: Math.max(0, y - 16), animated: true });
    // Depois da rolagem, abre o teclado no campo de texto (o ScrollTeclado
    // ajusta a posição quando o teclado sobe).
    setTimeout(() => {
      if (campo === "nome") nomeRef.current?.focus();
      if (campo === "esporte") esporteRef.current?.focus();
    }, 350);
  }

  function limparErroDo(campo: CampoComErro) {
    setErroCampo((atual) => (atual?.campo === campo ? null : atual));
  }

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
    limparErroDo("datas");
  }

  async function salvar() {
    setErro(null);
    setErroCampo(null);
    if (!nome.trim()) {
      apontarCampo("nome", "Dê um nome para o grupo.");
      return;
    }
    if (tipo === "AVULSO") {
      if (avulsas.length === 0) {
        apontarCampo("datas", "Adicione pelo menos uma data.");
        return;
      }
      if (avulsas.some((d) => dataHoraJaPassou(d.data, d.horaInicio, d.duracaoMin))) {
        apontarCampo("datas", "Uma das datas escolhidas já passou. Escolha datas e horários futuros.");
        return;
      }
    }
    if (!esporte) {
      apontarCampo("esporte", "Escolha o esporte.");
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
      // bemVindo=1 abre uma vez o modal "Agora, traga a galera" na tela do grupo.
      router.replace(`/grupos/${grupo.id}?bemVindo=1`);
    } catch (e) {
      setErro(mensagemDoErro(e));
      setSalvando(false);
      // A caixa de erro fica no fim do formulário: rola até ela pra não parecer
      // que o botão não fez nada.
      setTimeout(() => rolagemRef.current?.scrollToEnd({ animated: true }), 50);
    }
  }

  return (
    <SafeAreaView style={styles.tela} edges={["top", "left", "right"]}>
      <Navbar voltar="Painel" />

      <ScrollTeclado
        rolagemRef={rolagemRef}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.h1}>Criar grupo</Text>

        <View
          style={styles.campo}
          onLayout={(e) => (posicaoDoCampo.current.nome = e.nativeEvent.layout.y)}
        >
          <Text style={styles.label}>Nome do grupo</Text>
          <TextInput
            ref={nomeRef}
            value={nome}
            onChangeText={(v) => {
              setNome(v);
              limparErroDo("nome");
            }}
            placeholder="Futebol da segunda"
            placeholderTextColor={cores.slate500}
            style={[styles.input, erroCampo?.campo === "nome" && styles.inputErro]}
          />
          {erroCampo?.campo === "nome" && <MensagemCampo texto={erroCampo.mensagem} />}
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
          <View
            style={styles.campo}
            onLayout={(e) => (posicaoDoCampo.current.datas = e.nativeEvent.layout.y)}
          >
            <Text style={styles.label}>Datas</Text>
            {avulsas.map((d, i) => (
              <View
                key={i}
                style={[
                  styles.linha,
                  erroCampo?.campo === "datas" &&
                    dataHoraJaPassou(d.data, d.horaInicio, d.duracaoMin) &&
                    styles.linhaErro,
                ]}
              >
                <SeletorData iso={d.data} onChange={(v) => setAvulsa(i, { data: v })} minIso={hojeISO()} />
                <SeletorHora hhmm={d.horaInicio} onChange={(v) => setAvulsa(i, { horaInicio: v })} />
                <SeletorDuracao min={d.duracaoMin} onChange={(v) => setAvulsa(i, { duracaoMin: v })} />
                {avulsas.length > 1 && (
                  <Pressable onPress={() => setAvulsas((p) => p.filter((_, idx) => idx !== i))}>
                    <Text style={styles.remover}>Remover data</Text>
                  </Pressable>
                )}
              </View>
            ))}
            {erroCampo?.campo === "datas" && <MensagemCampo texto={erroCampo.mensagem} />}
            <Pressable
              onPress={() => {
                setAvulsas((p) => [...p, avulsaPadrao()]);
                limparErroDo("datas");
              }}
            >
              <Text style={styles.adicionar}>+ Adicionar data</Text>
            </Pressable>
          </View>
        )}

        <View
          style={styles.campo}
          onLayout={(e) => (posicaoDoCampo.current.esporte = e.nativeEvent.layout.y)}
        >
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
                ref={esporteRef}
                value={termoEsporte}
                onChangeText={setTermoEsporte}
                placeholder={esportes.length ? "Buscar esporte..." : "Carregando esportes..."}
                placeholderTextColor={cores.slate500}
                editable={esportes.length > 0}
                style={[styles.input, erroCampo?.campo === "esporte" && styles.inputErro]}
              />
              {erroCampo?.campo === "esporte" && <MensagemCampo texto={erroCampo.mensagem} />}
              <View style={styles.dropdown}>
                {esportesFiltrados.map((e) => (
                  <Pressable
                    key={e.id}
                    style={styles.opcao}
                    onPress={() => {
                      setEsporte(e.nome);
                      setTermoEsporte("");
                      setErro(null);
                      limparErroDo("esporte");
                    }}
                  >
                    <Text style={styles.opcaoTexto}>{e.nome}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}
        </View>

        <View style={styles.nota}>
          <MapPin size={16} color={cores.teal} />
          <Text style={styles.notaTexto}>
            Depois de salvar, você pode vincular a <Text style={styles.notaDestaque}>quadra</Text> dentro do
            grupo.
          </Text>
        </View>

        {erro && <CaixaErro>{erro}</CaixaErro>}
      </ScrollTeclado>

      <View style={[styles.rodape, { paddingBottom: 12 + insets.bottom }]}>
        <BotaoLaranja titulo="Salvar" onPress={() => void salvar()} carregando={salvando} />
      </View>
    </SafeAreaView>
  );
}

function MensagemCampo({ texto }: { texto: string }) {
  return (
    <View style={styles.mensagemCampo}>
      <TriangleAlert size={14} color={cores.erroTexto} />
      <Text style={styles.mensagemCampoTexto}>{texto}</Text>
    </View>
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
  inputErro: { borderColor: cores.erroTexto },
  mensagemCampo: { flexDirection: "row", alignItems: "center", gap: 6 },
  mensagemCampoTexto: { flex: 1, fontSize: 13, color: cores.erroTexto },
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
  linhaErro: { borderColor: cores.erroTexto },
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
  nota: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: cores.linhaSutil,
    backgroundColor: cores.avisoFundo,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  notaTexto: { flex: 1, fontSize: 13, lineHeight: 19, color: cores.slate400 },
  notaDestaque: { fontWeight: "600", color: cores.slate300 },
  rodape: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    borderTopColor: cores.cardBorda,
    backgroundColor: cores.dark,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
});
