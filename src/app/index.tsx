import { Redirect } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { useSessao } from "@/sessao/contexto";

// Porta de entrada: decide pra onde mandar conforme a sessão guardada no
// aparelho. Enquanto lê o SecureStore, mostra só o spinner.
export default function Entrada() {
  const { estado } = useSessao();

  if (estado.fase === "carregando") {
    return (
      <View style={styles.centro}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <Redirect href={estado.fase === "logado" ? "/grupos" : "/login"} />;
}

const styles = StyleSheet.create({
  centro: { flex: 1, alignItems: "center", justifyContent: "center" },
});
