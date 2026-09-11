import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Text } from "@/ui/Texto";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";

import { buscarConvite, processarConvite } from "@/api/convites";
import { ErroApi } from "@/api/erros";
import {
  guardarConvitePendente,
  limparConvitePendente,
} from "@/acesso/convitePendente";
import { BotaoPrimario, CaixaErro, Cartao, Eyebrow } from "@/acesso/ui";
import { rotaDoConvite } from "@/convites";
import { useSessao } from "@/sessao/contexto";
import { mensagemDoErro } from "@/mensagens-erro";
import { cores, tipografia } from "@/tema";
import type { ConvitePublico } from "@/contrato/tipos";

// Destino do link de convite (`https://weracha.app/convite/{token}` /
// `weracha://convite/{token}`). Deslogado: guarda o token e manda pro login, que
// entra no grupo ao terminar. Logado: entra no grupo na hora.
export default function ConviteScreen() {
  const { estado, urlBase, chamarApi } = useSessao();
  const params = useLocalSearchParams<{
    token: string;
    partida?: string;
    enquete?: string;
  }>();
  const token = params.token;
  const alvo = { partidaId: params.partida ?? null, enqueteId: params.enquete ?? null };

  const [convite, setConvite] = useState<ConvitePublico | null>(null);
  const [erro, setErro] = useState<string | null>(
    token ? null : "Link de convite incompleto."
  );
  const [carregando, setCarregando] = useState(!!token);
  const [entrando, setEntrando] = useState(false);

  // Busca o convite (rota pública) assim que o token estiver disponível.
  useEffect(() => {
    if (!token) return;
    let ativo = true;
    buscarConvite(urlBase, token, alvo)
      .then((c) => {
        if (!ativo) return;
        setConvite(c);
        setErro(null);
      })
      .catch((e) => {
        if (!ativo) return;
        setErro(
          e instanceof ErroApi && e.codigo === "CONVITE_INVALIDO"
            ? "Esse convite não é mais válido. Peça um link novo pro admin do grupo."
            : mensagemDoErro(e)
        );
      })
      .finally(() => ativo && setCarregando(false));
    return () => {
      ativo = false;
    };
    // urlBase/token bastam; `alvo` é derivado deles via params.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlBase, token]);

  const entrarNoGrupo = useCallback(async () => {
    if (!convite) return;
    setEntrando(true);
    setErro(null);
    try {
      const r = await processarConvite(chamarApi, convite.token, alvo);
      limparConvitePendente();
      router.replace(rotaDoConvite(r.destino, r.grupoId));
    } catch (e) {
      setErro(mensagemDoErro(e));
      setEntrando(false);
    }
    // alvo é derivado de params estáveis nesta tela
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convite, chamarApi]);

  function irParaLogin() {
    if (!convite) return;
    guardarConvitePendente({
      token: convite.token,
      partidaId: alvo.partidaId,
      enqueteId: alvo.enqueteId,
    });
    router.replace("/login");
  }

  const conteudo = () => {
    if (estado.fase === "carregando" || carregando) {
      return <ActivityIndicator size="large" color={cores.teal} />;
    }

    if (erro && !convite) {
      return (
        <>
          <CaixaErro>{erro}</CaixaErro>
          <BotaoPrimario titulo="Ir pro início" onPress={() => router.replace("/")} />
        </>
      );
    }

    if (!convite) return null;

    return (
      <>
        <View>
          <Eyebrow>Convite</Eyebrow>
          <Text style={tipografia.titulo}>{convite.grupoNome}</Text>
          <Text style={[tipografia.subtitulo, styles.sub]}>
            {estado.fase === "logado"
              ? "Toque pra entrar no grupo."
              : "Entre ou crie sua conta pra participar do grupo."}
          </Text>
        </View>
        {erro ? <CaixaErro>{erro}</CaixaErro> : null}
        {estado.fase === "logado" ? (
          <BotaoPrimario
            titulo="Entrar no grupo"
            onPress={() => void entrarNoGrupo()}
            carregando={entrando}
          />
        ) : (
          <BotaoPrimario titulo="Entrar ou criar conta" onPress={irParaLogin} />
        )}
      </>
    );
  };

  return (
    <SafeAreaView style={styles.tela} edges={["top", "left", "right"]}>
      <View style={styles.centro}>
        <Cartao>{conteudo()}</Cartao>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.dark },
  centro: { flex: 1, justifyContent: "center", padding: 24 },
  sub: { marginTop: 8 },
});
