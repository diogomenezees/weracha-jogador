import { Redirect, Stack } from "expo-router";

import { useSessao } from "@/sessao/contexto";
import { useNotificacoes } from "@/notificacoes/useNotificacoes";
import { cores } from "@/tema";

// Tudo abaixo de `(logado)/` exige sessão. Sem ela, volta pro login.
export default function LayoutLogado() {
  const { estado } = useSessao();

  if (estado.fase === "carregando") return null;
  if (estado.fase === "deslogado") return <Redirect href="/login" />;

  return <StackLogado />;
}

// Separado pra o hook de push só montar com sessão (hooks não podem vir depois
// dos returns acima).
function StackLogado() {
  useNotificacoes();

  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: cores.dark } }}
      initialRouteName="painel"
    />
  );
}
