import { useEffect, useState, type ReactNode } from "react";
import { AppState, Linking, Pressable, StyleSheet, View } from "react-native";
import Constants from "expo-constants";
import { Text } from "@/ui/Texto";

import { buscarVersaoMinima, type VersaoMinima } from "@/api/versao";
import { ModalCartao } from "@/grupo/modais";
import { useSessao } from "@/sessao/contexto";
import { abaixoDaMinima } from "@/versao/comparar";
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

const versaoAtual = Constants.expoConfig?.version ?? null;

export function PortaoDeVersao({ children }: { children: ReactNode }) {
  const { estado, urlBase } = useSessao();
  // Espera a sessão carregar: é nela que o ambiente (Local/Produção) é lido, e a
  // URL certa só existe depois disso.
  const pronto = estado.fase !== "carregando";
  const [exigida, setExigida] = useState<VersaoMinima | null>(null);
  const [avisoFechado, setAvisoFechado] = useState(false);

  useEffect(() => {
    if (!pronto || !versaoAtual) return;
    let vivo = true;
    const checar = () => {
      buscarVersaoMinima(urlBase)
        .then((r) => {
          if (vivo) setExigida(r);
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

  if (versaoAtual && exigida && abaixoDaMinima(versaoAtual, exigida.versaoMinima)) {
    return <TelaAtualizar urlLoja={exigida.urlLoja} />;
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
