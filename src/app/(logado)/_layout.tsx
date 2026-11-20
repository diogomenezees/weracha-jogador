import { useEffect } from "react";
import { Redirect, Stack } from "expo-router";

import { useSessao } from "@/sessao/contexto";
import { useNotificacoes } from "@/notificacoes/useNotificacoes";
import { registrarPrimeiroUso } from "@/avaliacao/pedirAvaliacao";
import { prepararRevenueCat } from "@/assinatura/revenuecat";
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
  // RevenueCat (assinatura Pro): vincula o jogador logado ao SDK.
  const { estado } = useSessao();
  const jogadorId = estado.fase === "logado" ? estado.jogador.id : null;
  useEffect(() => {
    if (jogadorId) void prepararRevenueCat(jogadorId);
  }, [jogadorId]);
  // Início da contagem do uso mínimo antes de pedir avaliação na loja.
  useEffect(() => {
    void registrarPrimeiroUso();
  }, []);

  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: cores.dark } }}
      initialRouteName="painel"
    />
  );
}
