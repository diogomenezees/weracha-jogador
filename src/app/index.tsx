import { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { jaViuIntro } from "@/intro/vista";
import { useSessao } from "@/sessao/contexto";

// Porta de entrada: decide pra onde mandar conforme a sessão guardada no
// aparelho. Enquanto lê o SecureStore, mostra só o spinner. Deslogado que nunca
// viu a intro vai pra `/intro` (que termina no `/login`). Link de convite não
// passa por aqui: abre direto `convite/[token]`.
export default function Entrada() {
  const { estado } = useSessao();
  const [introVista, setIntroVista] = useState<boolean | null>(null);

  useEffect(() => {
    let ativo = true;
    void jaViuIntro().then((v) => ativo && setIntroVista(v));
    return () => {
      ativo = false;
    };
  }, []);

  if (estado.fase === "carregando" || (estado.fase !== "logado" && introVista === null)) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (estado.fase === "logado") return <Redirect href="/painel" />;
  return <Redirect href={introVista ? "/login" : "/intro"} />;
}

const styles = StyleSheet.create({
  centro: { flex: 1, alignItems: "center", justifyContent: "center" },
});
