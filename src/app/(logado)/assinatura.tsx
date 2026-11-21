import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import type { PurchasesPackage } from "react-native-purchases";

import {
  buscarTelaAssinatura,
  patrocinarGrupo,
  sincronizarAssinatura,
} from "@/api/assinatura";
import {
  buscarPacotePro,
  comprarPro,
  compraDisponivel,
  restaurarCompras,
} from "@/assinatura/revenuecat";
import { dataCurta, SeloPro, textoDoPatrocinio } from "@/assinatura/ui";
import { abrirNoNavegador, URL_PRIVACIDADE, URL_TERMOS } from "@/config/links";
import type { GrupoNaAssinatura, TelaAssinatura } from "@/contrato/tipos";
import { mensagemDoErro } from "@/mensagens-erro";
import { BotaoLaranja, Eyebrow, TelaCarregando, TelaErro } from "@/painel/ui";
import { useSessao } from "@/sessao/contexto";
import { cores, raio } from "@/tema";
import {
  Check,
  Cloud,
  CloudOff,
  Crown,
  ExternalLink,
  HeartHandshake,
} from "@/ui/Icone";
import { useDialogos } from "@/ui/Dialogos";
import { Navbar } from "@/ui/Navbar";
import { Text } from "@/ui/Texto";
import { TituloTela } from "@/ui/TituloTela";

// Tela "Assinatura": planos Free e Pro, a compra (só aqui no app, pela loja do
// aparelho via RevenueCat) e, embaixo, os grupos da pessoa com o estado de Pro;
// quem assina patrocina daqui (irreversível, com alerta). Espelha
// weracha-site/app/assinatura/page.tsx. Spec: weracha-site/docs/especificacao/20-assinatura-pro.md.

// Chave "Cobrança do Pro" do /admin desligada (o We Racha Cam ainda não está nas
// lojas, decidido 2026-11-20): some a gravação no celular, o Pro fica "Em breve" e
// nada leva pro RevenueCat (nem a busca do preço). Igual a planosConforme em
// weracha-site/lib/planos.ts.
const RECURSO_GRAVA_NO_CELULAR = "We Racha Cam grava os replays no celular";
const RECURSOS_FREE = [
  "Sem limite de jogadores no grupo",
  "Grupos, check-in, sorteio, ao vivo, resultado e artilheiros",
  RECURSO_GRAVA_NO_CELULAR,
];
const RECURSOS_PRO = [
  "Tudo do Free",
  "Gols salvos na nuvem em até 5 grupos",
  "O grupo inteiro assiste, comenta e baixa os gols",
  "Os replays ficam disponíveis por 4 meses",
];

export default function Assinatura() {
  const insets = useSafeAreaInsets();
  const { chamarApi, estado } = useSessao();
  const { avisar, confirmar } = useDialogos();
  const meuId = estado.fase === "logado" ? estado.jogador.id : undefined;

  const [dados, setDados] = useState<TelaAssinatura | null>(null);
  const [pacote, setPacote] = useState<PurchasesPackage | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [tentativa, setTentativa] = useState(0);
  const [atualizando, setAtualizando] = useState(false);
  const [comprando, setComprando] = useState(false);
  const [patrocinando, setPatrocinando] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setDados(await buscarTelaAssinatura(chamarApi));
  }, [chamarApi]);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        await carregar();
        if (vivo) setErro(null);
      } catch (e) {
        if (vivo) setErro(mensagemDoErro(e));
      }
    })();
    return () => {
      vivo = false;
    };
  }, [carregar, tentativa]);

  // Preço vem da loja (offering do RevenueCat). Sem chave/SDK, sem botão de compra.
  // Com a cobrança desligada no site, nem consulta (o Pro está "Em breve").
  const cobrancaLigada = dados?.cobrancaLigada ?? false;
  useEffect(() => {
    if (!cobrancaLigada || !compraDisponivel()) return;
    buscarPacotePro()
      .then(setPacote)
      .catch((e) => console.warn("[assinatura] sem offering:", e));
  }, [cobrancaLigada]);

  async function atualizar() {
    setAtualizando(true);
    try {
      await carregar();
      setErro(null);
    } catch (e) {
      setErro(mensagemDoErro(e));
    } finally {
      setAtualizando(false);
    }
  }

  // Depois de comprar/restaurar: o site reconsulta o RevenueCat.
  async function sincronizarEAtualizar(): Promise<boolean> {
    try {
      await sincronizarAssinatura(chamarApi);
      await carregar();
      return true;
    } catch {
      return false;
    }
  }

  async function assinar() {
    if (!pacote) return;
    setComprando(true);
    try {
      const r = await comprarPro(pacote);
      if (r === "cancelou") return;
      const ok = await sincronizarEAtualizar();
      avisar(
        ok ? "Você agora é Pro" : "Compra feita",
        ok
          ? "Agora escolha o grupo que você quer patrocinar, aqui embaixo."
          : "A loja confirmou a compra, mas o We Racha ainda não atualizou. Puxe a tela pra baixo em alguns segundos.",
        { eyebrow: "Assinatura", Icone: Crown },
      );
    } catch (e) {
      avisar("Não deu pra assinar", mensagemDoErro(e), {
        eyebrow: "Assinatura",
      });
    } finally {
      setComprando(false);
    }
  }

  async function restaurar() {
    setComprando(true);
    try {
      await restaurarCompras();
      await sincronizarEAtualizar();
      avisar(
        "Compras restauradas",
        "Se você já tinha o Pro nesta conta da loja, ele está de volta.",
        {
          eyebrow: "Assinatura",
        },
      );
    } catch (e) {
      avisar("Não deu pra restaurar", mensagemDoErro(e), {
        eyebrow: "Assinatura",
      });
    } finally {
      setComprando(false);
    }
  }

  function pedirPatrocinio(grupo: GrupoNaAssinatura) {
    if (!dados) return;
    confirmar({
      eyebrow: "Patrocinar grupo",
      titulo: `Patrocinar ${grupo.nome}?`,
      descricao: `O grupo vira Pro na hora e os gols passam a ir pra nuvem a partir da próxima gravação. Ele ocupa 1 das suas ${dados.vagas.max} vagas e não dá pra desfazer depois.`,
      confirmarLabel: "Patrocinar",
      Icone: HeartHandshake,
      onConfirmar: () => void patrocinar(grupo),
    });
  }

  async function patrocinar(grupo: GrupoNaAssinatura) {
    setPatrocinando(grupo.id);
    try {
      await patrocinarGrupo(chamarApi, grupo.id);
      await carregar();
      avisar(
        `${grupo.nome} agora é Pro`,
        "A galera do grupo foi avisada. No próximo racha, os gols vão pra nuvem.",
        {
          eyebrow: "Patrocínio",
          Icone: HeartHandshake,
        },
      );
    } catch (e) {
      avisar("Não deu pra patrocinar", mensagemDoErro(e), {
        eyebrow: "Patrocínio",
      });
    } finally {
      setPatrocinando(null);
    }
  }

  if (erro && !dados) {
    return (
      <SafeAreaView style={styles.tela} edges={["top", "left", "right"]}>
        <Navbar voltar="Painel" />
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
  if (!dados) {
    return (
      <SafeAreaView style={styles.tela} edges={["top", "left", "right"]}>
        <Navbar voltar="Painel" />
        <TelaCarregando mensagem="Carregando a assinatura..." />
      </SafeAreaView>
    );
  }

  const a = dados.assinatura;
  const souPro = !!a?.pro;
  const podePatrocinar =
    dados.cobrancaLigada && souPro && dados.vagas.usadas < dados.vagas.max;
  // Comprar só com a cobrança ligada no site: antes disso todo grupo já é Pro.
  const podeComprar = dados.cobrancaLigada && !souPro && compraDisponivel();

  return (
    <SafeAreaView style={styles.tela} edges={["top", "left", "right"]}>
      <Navbar voltar="Painel" />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: 40 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={atualizando}
            onRefresh={() => void atualizar()}
            tintColor={cores.teal}
            colors={[cores.teal]}
          />
        }
      >
        <View style={styles.cabecalho}>
          <TituloTela Icone={Crown}>Assinatura</TituloTela>
          <Text style={styles.sub}>
            O Free organiza o racha inteiro. O Pro acrescenta uma coisa só: os
            gols na nuvem, pro grupo todo assistir.
          </Text>
        </View>

        <View style={styles.plano}>
          <Text style={styles.planoNome}>Free</Text>
          <Text style={styles.preco}>Grátis</Text>
          {RECURSOS_FREE.filter(
            (r) => dados.cobrancaLigada || r !== RECURSO_GRAVA_NO_CELULAR,
          ).map((r) => (
            <LinhaRecurso key={r} texto={r} />
          ))}
        </View>

        <View style={[styles.plano, styles.planoPro]}>
          <View style={styles.linhaTitulo}>
            <Text style={styles.planoNome}>Pro</Text>
            {souPro ? (
              <Text style={styles.seuPlano}>SEU PLANO</Text>
            ) : !dados.cobrancaLigada ? (
              <Text style={styles.emBreveSelo}>EM BREVE</Text>
            ) : null}
          </View>
          <Text style={styles.preco}>
            {pacote?.product.priceString ?? "R$ 19,90"}
            <Text style={styles.periodo}> /mês</Text>
          </Text>
          <Text style={styles.porJogador}>
            R$ 1,00 por jogador num grupo de 20
          </Text>
          {RECURSOS_PRO.map((r) => (
            <LinhaRecurso key={r} texto={r} destaque={r.startsWith("Gols")} />
          ))}

          {souPro && a ? (
            <View style={styles.situacao}>
              <Text style={styles.situacaoTexto}>
                {a.emCarencia
                  ? "O pagamento não passou e a loja está tentando de novo. Confira a forma de pagamento na loja pra não perder o Pro."
                  : a.renova
                    ? `Renova sozinho em ${a.proAte ? dataCurta(a.proAte) : "-"}.`
                    : `Renovação cancelada. O Pro vale até ${a.proAte ? dataCurta(a.proAte) : "-"}.`}
              </Text>
              <Text style={styles.vagas}>
                Você patrocina {dados.vagas.usadas} de {dados.vagas.max} grupos.
              </Text>
              {a.urlGerenciar && (
                <Pressable
                  onPress={() => abrirNoNavegador(a.urlGerenciar!)}
                  style={styles.linkLinha}
                >
                  <Text style={styles.link}>Gerenciar assinatura na loja</Text>
                  <ExternalLink size={12} color={cores.teal} />
                </Pressable>
              )}
            </View>
          ) : podeComprar ? (
            <View style={styles.compra}>
              <BotaoLaranja
                titulo={
                  pacote
                    ? `Assinar por ${pacote.product.priceString}/mês`
                    : "Carregando o preço..."
                }
                onPress={() => void assinar()}
                carregando={comprando || !pacote}
                Icone={Crown}
              />
              <Text style={styles.letraMiuda}>
                Assinatura mensal com renovação automática, cobrada pela{" "}
                {pacote?.product ? "loja do seu celular" : "loja"}. Cancele
                quando quiser nas configurações da loja.{" "}
                <Text
                  style={styles.link}
                  onPress={() => abrirNoNavegador(URL_TERMOS)}
                >
                  Termos de uso
                </Text>
                {" · "}
                <Text
                  style={styles.link}
                  onPress={() => abrirNoNavegador(URL_PRIVACIDADE)}
                >
                  Privacidade
                </Text>
              </Text>
            </View>
          ) : !dados.cobrancaLigada ? (
            <View style={styles.compra}>
              <View style={styles.emBreveBotao}>
                <Text style={styles.emBreveBotaoTexto}>Em breve</Text>
              </View>
              <Text style={styles.letraMiuda}>
                Quando lançar, você assina por aqui e escolhe os grupos que vai patrocinar.
              </Text>
            </View>
          ) : null}
          {dados.cobrancaLigada && compraDisponivel() && (
            <Pressable
              onPress={() => void restaurar()}
              disabled={comprando}
              style={styles.restaurar}
            >
              <Text style={styles.link}>Restaurar compras</Text>
            </Pressable>
          )}
        </View>

        {/* Grupos só pra quem assina: sem assinatura não dá pra fazer nada com eles. */}
        {souPro && (
          <>
            <Eyebrow>Seus grupos</Eyebrow>
            {!dados.cobrancaLigada && (
              <View style={styles.nota}>
                <CloudOff size={14} color={cores.teal} />
                <Text style={styles.notaTexto}>
                  Por enquanto a nuvem está liberada pra todos os grupos.
                </Text>
              </View>
            )}
            {dados.grupos.length === 0 && (
              <Text style={styles.notaTexto}>
                Você ainda não está em nenhum grupo.
              </Text>
            )}
            {dados.grupos.map((g) => (
              <LinhaGrupo
                key={g.id}
                grupo={g}
                meuId={meuId}
                cobrancaLigada={dados.cobrancaLigada}
                podePatrocinar={podePatrocinar}
                patrocinando={patrocinando === g.id}
                onPatrocinar={() => pedirPatrocinio(g)}
              />
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function LinhaRecurso({
  texto,
  destaque,
}: {
  texto: string;
  destaque?: boolean;
}) {
  const Icone = destaque ? Cloud : Check;
  return (
    <View style={styles.recurso}>
      <Icone size={15} color={cores.teal} />
      <Text style={[styles.recursoTexto, destaque && styles.recursoDestaque]}>
        {texto}
      </Text>
    </View>
  );
}

function LinhaGrupo({
  grupo,
  meuId,
  cobrancaLigada,
  podePatrocinar,
  patrocinando,
  onPatrocinar,
}: {
  grupo: GrupoNaAssinatura;
  meuId?: string;
  cobrancaLigada: boolean;
  podePatrocinar: boolean;
  patrocinando: boolean;
  onPatrocinar: () => void;
}) {
  let detalhe: string | null = null;
  if (!grupo.souMembro && grupo.pro.ate) {
    detalhe = `${grupo.excluido ? "Grupo excluído" : "Você saiu"}. A vaga fica ocupada até ${dataCurta(grupo.pro.ate)}.`;
  } else if (cobrancaLigada && grupo.pro.pro) {
    detalhe =
      textoDoPatrocinio(grupo.pro, meuId) +
      (grupo.pro.ate ? `, Pro até ${dataCurta(grupo.pro.ate)}` : "");
  } else if (cobrancaLigada) {
    detalhe = "Sem Pro: os gols ficam só no celular do We Racha Cam.";
  }
  return (
    <View style={styles.grupo}>
      <View style={styles.flex}>
        <Text style={styles.grupoNome} numberOfLines={1}>
          {grupo.nome}
        </Text>
        <SeloPro pro={grupo.pro} meuId={meuId} style={styles.seloGrupo} semFree />
        {detalhe && <Text style={styles.grupoDetalhe}>{detalhe}</Text>}
      </View>
      {podePatrocinar && !grupo.pro.pro && grupo.souMembro && (
        <Pressable
          onPress={onPatrocinar}
          disabled={patrocinando}
          style={styles.botaoPatrocinar}
        >
          {patrocinando ? (
            <ActivityIndicator color={cores.dark} size="small" />
          ) : (
            <Text style={styles.botaoPatrocinarTexto}>Patrocinar</Text>
          )}
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.dark },
  scroll: { paddingHorizontal: 20, paddingTop: 8, gap: 12 },
  cabecalho: { gap: 6, marginBottom: 4 },
  sub: { color: cores.slate400, fontSize: 14 },
  flex: { flex: 1, minWidth: 0 },
  plano: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: raio.card,
    padding: 18,
    gap: 8,
  },
  planoPro: {
    borderColor: "rgba(31,179,163,0.5)",
    backgroundColor: "rgba(18,137,126,0.12)",
  },
  linhaTitulo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  planoNome: { color: cores.branco, fontSize: 20, fontWeight: "700" },
  seuPlano: {
    color: cores.orange,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },
  preco: { color: cores.branco, fontSize: 28, fontWeight: "700" },
  periodo: { color: cores.slate400, fontSize: 15, fontWeight: "400" },
  porJogador: { color: cores.teal, fontSize: 13, marginTop: -4 },
  recurso: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  recursoTexto: { color: cores.slate300, fontSize: 14, flex: 1 },
  recursoDestaque: { color: cores.branco, fontWeight: "600" },
  situacao: { marginTop: 8, gap: 6 },
  situacaoTexto: { color: cores.slate300, fontSize: 13 },
  vagas: { color: cores.branco, fontSize: 14, fontWeight: "600" },
  compra: { marginTop: 10, gap: 10 },
  emBreveSelo: {
    color: cores.orange,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    backgroundColor: "rgba(242,140,30,0.15)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    overflow: "hidden",
  },
  emBreveBotao: {
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: "rgba(242,140,30,0.4)",
    backgroundColor: "rgba(242,140,30,0.1)",
  },
  emBreveBotaoTexto: { color: cores.orange, fontSize: 15, fontWeight: "600" },
  letraMiuda: { color: cores.slate500, fontSize: 11, lineHeight: 16 },
  linkLinha: { flexDirection: "row", alignItems: "center", gap: 6 },
  link: { color: cores.teal, fontSize: 12 },
  restaurar: { alignSelf: "center", paddingVertical: 8 },
  nota: { flexDirection: "row", gap: 8, alignItems: "center" },
  notaTexto: { color: cores.slate400, fontSize: 12, flex: 1 },
  grupo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: raio.campo,
    padding: 12,
  },
  grupoNome: { color: cores.branco, fontSize: 14, fontWeight: "600" },
  seloGrupo: { marginTop: 4 },
  grupoDetalhe: { color: cores.slate400, fontSize: 12, marginTop: 4 },
  botaoPatrocinar: {
    backgroundColor: cores.orange,
    borderRadius: raio.campo,
    paddingHorizontal: 12,
    paddingVertical: 9,
    minWidth: 92,
    alignItems: "center",
  },
  botaoPatrocinarTexto: { color: cores.dark, fontSize: 13, fontWeight: "700" },
});
