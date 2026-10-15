import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from "react-native";
import { Text } from "@/ui/Texto";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";

import { buscarDadosDoGrupo, vincularQuadra } from "@/api/grupos";
import { buscarQuadras, sugerirQuadra } from "@/api/quadras";
import { PilulaEsporte } from "@/grupo/PilulaEsporte";
import { CaixaErro } from "@/acesso/ui";
import { mensagemDoErro } from "@/mensagens-erro";
import { BotaoLaranja } from "@/painel/ui";
import { Navbar } from "@/ui/Navbar";
import { ScrollTeclado } from "@/ui/ScrollTeclado";
import { useDialogos } from "@/ui/Dialogos";
import { MapPin, MapPinPlus, TriangleAlert, Users } from "@/ui/Icone";
import { useSessao } from "@/sessao/contexto";
import { cores, raio } from "@/tema";
import type { Grupo, Quadra } from "@/contrato/tipos";

// Tela de cadastrar/vincular a quadra do grupo, igual a /grupos/[id]/quadra do
// site. Só o admin chega aqui (pelo aviso "Cadastre o local do jogo" da tela do
// grupo) e só enquanto o grupo não tem quadra: vincular é definitivo, então quem
// entrar fora disso volta. O campo de nome também busca quadras já cadastradas
// pro esporte, pra evitar cadastrar duplicada.

type CampoComErro = "nome" | "endereco";

export default function QuadraDoGrupo() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { chamarApi } = useSessao();
  const { confirmar } = useDialogos();
  const insets = useSafeAreaInsets();

  const [grupo, setGrupo] = useState<Grupo | null>(null);
  const [nome, setNome] = useState("");
  const [endereco, setEndereco] = useState("");
  const [existentes, setExistentes] = useState<Quadra[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [erroCampo, setErroCampo] = useState<{ campo: CampoComErro; mensagem: string } | null>(
    null
  );
  const nomeRef = useRef<TextInput>(null);
  const enderecoRef = useRef<TextInput>(null);

  // Mesmo padrão do formulário de criar grupo: borda vermelha + mensagem embaixo
  // do primeiro campo vazio, e o teclado abre nele.
  function apontarCampo(campo: CampoComErro, mensagem: string) {
    setErroCampo({ campo, mensagem });
    (campo === "nome" ? nomeRef : enderecoRef).current?.focus();
  }

  function limparErroDo(campo: CampoComErro) {
    setErroCampo((atual) => (atual?.campo === campo ? null : atual));
  }

  function voltarParaGrupo() {
    if (router.canGoBack()) router.back();
    else router.replace(`/grupos/${id}`);
  }

  useEffect(() => {
    let vivo = true;
    buscarDadosDoGrupo(chamarApi, id)
      .then((d) => {
        if (!vivo) return;
        if (!d.grupo || d.grupo.meuPapel !== "ADMIN" || d.grupo.quadraId) {
          router.replace(`/grupos/${id}`);
          return;
        }
        setGrupo(d.grupo);
      })
      .catch(() => vivo && router.replace(`/grupos/${id}`));
    return () => {
      vivo = false;
    };
  }, [chamarApi, id]);

  const termo = nome.trim();
  useEffect(() => {
    if (!grupo || termo.length < 2) return;
    let vivo = true;
    buscarQuadras(chamarApi, grupo.esporte, termo)
      .then((qs) => vivo && setExistentes(qs))
      .catch(() => vivo && setExistentes([]));
    return () => {
      vivo = false;
    };
  }, [chamarApi, grupo, termo]);
  const sugestoes = termo.length < 2 ? [] : existentes;

  async function vincular(quadraNova: boolean, existente?: Quadra) {
    if (!grupo) return;
    setErro(null);
    setSalvando(true);
    try {
      const quadraId = quadraNova
        ? (await sugerirQuadra(chamarApi, { nome: nome.trim(), endereco: endereco.trim(), esporte: grupo.esporte })).id
        : existente!.id;
      await vincularQuadra(chamarApi, grupo.id, quadraId);
      voltarParaGrupo();
    } catch (e) {
      setErro(mensagemDoErro(e));
      setSalvando(false);
    }
  }

  function pedirConfirmacao(existente?: Quadra) {
    setErro(null);
    setErroCampo(null);
    if (!existente) {
      if (!nome.trim()) {
        apontarCampo("nome", "Dê um nome para a quadra.");
        return;
      }
      if (!endereco.trim()) {
        apontarCampo("endereco", "Informe o endereço da quadra.");
        return;
      }
    }
    confirmar({
      eyebrow: "Vincular quadra",
      Icone: MapPin,
      titulo: existente
        ? `Vincular "${existente.nome}" a esse grupo?`
        : `Cadastrar e vincular "${nome.trim()}"?`,
      descricao: "Depois de vinculada, não dá pra trocar a quadra desse grupo. Confirme se é essa mesmo.",
      confirmarLabel: "Vincular quadra",
      onConfirmar: () => void vincular(!existente, existente),
    });
  }

  if (!grupo) {
    return (
      <SafeAreaView style={styles.tela} edges={["top", "left", "right"]}>
        <Navbar voltar="Grupo" />
        <View style={styles.carregando}>
          <ActivityIndicator color={cores.teal} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.tela} edges={["top", "left", "right"]}>
      <Navbar voltar="Grupo" />

      <ScrollTeclado contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View>
          <View style={styles.tituloLinha}>
            <MapPinPlus size={20} color={cores.branco} />
            <Text style={styles.h1}>Cadastrar quadra</Text>
          </View>
          <View style={styles.subLinha}>
            <Users size={12} color={cores.slate400} />
            <Text style={styles.sub} numberOfLines={1}>
              {grupo.nome}
            </Text>
          </View>
          <View style={{ alignSelf: "flex-start", marginTop: 8 }}>
            <PilulaEsporte esporte={grupo.esporte} />
          </View>
          <Text style={styles.intro}>
            Esse endereço fica visível pra todos os jogadores e ajuda a galera a chegar no jogo sem
            se perder.
          </Text>
        </View>

        <View style={styles.campo}>
          <Text style={styles.label}>Nome da quadra</Text>
          <TextInput
            ref={nomeRef}
            style={[styles.input, erroCampo?.campo === "nome" && styles.inputErro]}
            value={nome}
            onChangeText={(v) => {
              setNome(v);
              limparErroDo("nome");
            }}
            placeholder="Ex.: Arena do Bairro"
            placeholderTextColor={cores.slate500}
          />
          {erroCampo?.campo === "nome" && <MensagemCampo texto={erroCampo.mensagem} />}
        </View>

        {sugestoes.length > 0 && (
          <View style={styles.campo}>
            <Text style={styles.label}>Já cadastradas com esse nome</Text>
            <Text style={styles.dica}>
              Se for uma dessas, toque nela pra vincular em vez de cadastrar de novo.
            </Text>
            {sugestoes.map((q) => (
              <Pressable
                key={q.id}
                style={styles.quadraItem}
                onPress={() => pedirConfirmacao(q)}
                disabled={salvando}
              >
                <MapPin size={14} color={cores.teal} />
                <View style={{ flex: 1 }}>
                  <View style={styles.quadraNomeLinha}>
                    <Text style={styles.quadraNome}>{q.nome}</Text>
                    {q.status !== "VALIDADA" && (
                      <View style={styles.pendentePill}>
                        <Text style={styles.pendenteTexto}>Em validação</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.quadraEndereco}>{q.endereco}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}

        <View style={styles.campo}>
          <Text style={styles.label}>Endereço</Text>
          <TextInput
            ref={enderecoRef}
            style={[styles.input, erroCampo?.campo === "endereco" && styles.inputErro]}
            value={endereco}
            onChangeText={(v) => {
              setEndereco(v);
              limparErroDo("endereco");
            }}
            placeholder="Rua, número, bairro"
            placeholderTextColor={cores.slate500}
          />
          {erroCampo?.campo === "endereco" && <MensagemCampo texto={erroCampo.mensagem} />}
        </View>

        {erro ? <CaixaErro>{erro}</CaixaErro> : null}
      </ScrollTeclado>

      <View style={[styles.rodape, { paddingBottom: 14 + insets.bottom }]}>
        <BotaoLaranja titulo="Cadastrar quadra" onPress={() => pedirConfirmacao()} carregando={salvando} />
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
  carregando: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 130, gap: 20 },
  tituloLinha: { flexDirection: "row", alignItems: "center", gap: 6 },
  h1: { fontSize: 24, fontWeight: "700", color: cores.branco },
  subLinha: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  sub: { flexShrink: 1, fontSize: 14, color: cores.slate400 },
  campo: { gap: 8 },
  label: { fontSize: 13, fontWeight: "600", color: cores.slate300 },
  intro: { marginTop: 12, fontSize: 14, lineHeight: 20, color: cores.slate400 },
  dica: { fontSize: 12, color: cores.slate500 },
  input: {
    height: 46,
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: cores.campoBorda,
    backgroundColor: cores.campoFundo,
    paddingHorizontal: 12,
    fontSize: 15,
    color: cores.branco,
  },
  inputErro: { borderColor: cores.erroTexto },
  mensagemCampo: { flexDirection: "row", alignItems: "center", gap: 6 },
  mensagemCampoTexto: { flex: 1, fontSize: 13, color: cores.erroTexto },
  quadraItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: cores.cardBorda,
    backgroundColor: cores.superficieSutil,
  },
  quadraNomeLinha: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  quadraNome: { fontSize: 14, color: cores.branco },
  quadraEndereco: { fontSize: 12, color: cores.slate500 },
  pendentePill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: cores.ambarBorda,
    backgroundColor: cores.ambarFundo,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  pendenteTexto: { fontSize: 10, fontWeight: "700", color: cores.ambar, textTransform: "uppercase" },
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
