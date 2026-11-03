import { useEffect, useRef, useState, type ReactNode } from "react";
import { AppState, Linking, Pressable, StyleSheet, View } from "react-native";
import Constants from "expo-constants";
import { Text } from "@/ui/Texto";

import { buscarVersaoMinima, type VersaoMinima } from "@/api/versao";
import { ModalCartao } from "@/grupo/modais";
import { useSessao } from "@/sessao/contexto";
import { abaixoDaMinima } from "@/versao/comparar";
import { apagarTrava, guardarTrava, lerTravaGuardada } from "@/versao/travaGuardada";
import { cores, raio } from "@/tema";

// Gate de versão mínima: no boot (e ao voltar pro primeiro plano) pergunta ao
// site qual a versão mais antiga aceita. Abaixo dela, no lugar do app mostra
// "atualize pra continuar". Qualquer falha (sem rede, rota fora do ar, corpo
// estranho) deixa o app abrir normal: uma falha do site não pode trancar todo
// mundo pra fora. Precisa estar na 1ª versão publicada, senão versão antiga
// nunca poderia ser forçada a atualizar. Ver docs/11-roteiro-de-publicacao.md.
//
// Abaixo só da RECOMENDADA (desde o 1.1.0), o app abre normal com um aviso
// "tem versão nova" por cima. "Agora não" esconde até o app ser aberto do zero
// de novo (fica só na memória): volta a cada abertura, pra ninguém ficar
// esquecido numa versão velha, sem atrapalhar quem está no meio do uso.
//
// A trava da MÍNIMA não solta sozinha: uma vez travado nesta execução, uma
// resposta seguinte dizendo "liberado" (site com cache velho, rede trocando de
// servidor) não destrava, só reabrir o app do zero. E ela fica guardada no
// aparelho (travaGuardada.ts): no boot seguinte já abre travado, antes da
// resposta do site, e sem rede continua travado. A guardada só some quando o
// site responde que a versão atual está liberada (atualizou, ou o admin desceu
// a mínima). Fail-open continua valendo pra quem nunca foi travado.

const versaoAtual = Constants.expoConfig?.version ?? null;

// Pra trava guardada no disco, que vale antes de o site responder. Mesmo valor
// de URL_LOJA_ANDROID no site (lib/appVersao.ts).
const URL_LOJA = "https://play.google.com/store/apps/details?id=com.weracha.jogador";

function trava(minima: string | null): boolean {
  return !!versaoAtual && !!minima && abaixoDaMinima(versaoAtual, minima);
}

export function PortaoDeVersao({ children }: { children: ReactNode }) {
  const { estado, urlBase } = useSessao();
  // Espera a sessão carregar: é nela que o ambiente (Local/Produção) é lido, e a
  // URL certa só existe depois disso.
  const pronto = estado.fase !== "carregando";
  const [exigida, setExigida] = useState<VersaoMinima | null>(null);
  const [avisoFechado, setAvisoFechado] = useState(false);
  // Trava vinda do site NESTA execução: só sobe, nunca volta pra null.
  const [travaDaSessao, setTravaDaSessao] = useState<string | null>(null);
  // Trava guardada de uma execução anterior; undefined = ainda lendo do disco.
  const [travaDoDisco, setTravaDoDisco] = useState<string | null | undefined>(undefined);
  const siteRespondeu = useRef(false);
  const travadoNaSessao = useRef(false);

  useEffect(() => {
    void lerTravaGuardada().then((v) => {
      // Se o site já respondeu, a resposta dele vale mais que o disco.
      setTravaDoDisco(siteRespondeu.current ? null : v);
    });
  }, []);

  useEffect(() => {
    if (!pronto || !versaoAtual) return;
    let vivo = true;
    const checar = () => {
      buscarVersaoMinima(urlBase)
        .then((r) => {
          if (!vivo || !r) return;
          siteRespondeu.current = true;
          setExigida(r);
          if (trava(r.versaoMinima)) {
            travadoNaSessao.current = true;
            setTravaDaSessao((atual) =>
              atual && abaixoDaMinima(r.versaoMinima, atual) ? atual : r.versaoMinima
            );
            void guardarTrava(r.versaoMinima);
          } else if (!travadoNaSessao.current) {
            setTravaDoDisco(null);
            void apagarTrava();
          }
        })
        .catch(() => {});
    };
    checar();
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") checar();
    });
    return () => {
      vivo = false;
      sub.remove();
    };
  }, [pronto, urlBase]);

  // Lendo a trava do disco (milissegundos): não mostra o app ainda, senão quem
  // está travado veria a tela de trás piscar antes do bloqueio.
  if (travaDoDisco === undefined) return null;
  if (trava(travaDaSessao) || trava(travaDoDisco)) {
    return <TelaAtualizar urlLoja={exigida?.urlLoja ?? URL_LOJA} />;
  }
  const temVersaoNova =
    !!versaoAtual &&
    !!exigida?.versaoRecomendada &&
    abaixoDaMinima(versaoAtual, exigida.versaoRecomendada);
  return (
    <>
      {children}
      {exigida && (
        <ModalCartao
          aberto={temVersaoNova && !avisoFechado}
          onFechar={() => setAvisoFechado(true)}
        >
          <Text style={styles.avisoTitulo}>Tem versão nova do WeRacha</Text>
          <Text style={styles.avisoTexto}>
            Atualize pela loja pra ter as novidades e as correções mais recentes.
          </Text>
          <Pressable style={styles.botao} onPress={() => void Linking.openURL(exigida.urlLoja)}>
            <Text style={styles.botaoTexto}>Atualizar</Text>
          </Pressable>
          <Pressable style={styles.botaoSecundario} onPress={() => setAvisoFechado(true)}>
            <Text style={styles.botaoSecundarioTexto}>Agora não</Text>
          </Pressable>
        </ModalCartao>
      )}
    </>
  );
}

function TelaAtualizar({ urlLoja }: { urlLoja: string }) {
  return (
    <View style={styles.tela}>
      <Text style={styles.titulo}>Atualize o WeRacha</Text>
      <Text style={styles.texto}>
        Essa versão do app ficou antiga e não funciona mais. Atualize pela loja pra continuar.
      </Text>
      <Pressable style={styles.botao} onPress={() => void Linking.openURL(urlLoja)}>
        <Text style={styles.botaoTexto}>Atualizar</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: cores.dark,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    padding: 28,
  },
  titulo: { fontSize: 24, fontWeight: "700", color: cores.branco, textAlign: "center" },
  texto: { fontSize: 15, lineHeight: 22, color: cores.slate400, textAlign: "center" },
  botao: {
    marginTop: 10,
    alignSelf: "stretch",
    height: 48,
    borderRadius: raio.campo,
    backgroundColor: cores.orange,
    alignItems: "center",
    justifyContent: "center",
  },
  botaoTexto: { fontSize: 16, fontWeight: "700", color: cores.dark },
  avisoTitulo: { fontSize: 18, fontWeight: "700", color: cores.branco },
  avisoTexto: { fontSize: 14, lineHeight: 20, color: cores.slate400 },
  botaoSecundario: { height: 44, alignItems: "center", justifyContent: "center" },
  botaoSecundarioTexto: { fontSize: 15, color: cores.slate400 },
});
