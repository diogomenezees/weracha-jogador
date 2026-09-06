import { Redirect, Stack } from "expo-router";

import { useSessao } from "@/sessao/contexto";

// Tudo abaixo de `(logado)/` exige sessão. Sem ela, volta pro login.
export default function LayoutLogado() {
  const { estado } = useSessao();

  if (estado.fase === "carregando") return null;
  if (estado.fase === "deslogado") return <Redirect href="/login" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
