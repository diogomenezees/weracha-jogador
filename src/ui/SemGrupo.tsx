import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { listarMeusGrupos } from "@/api/grupos";
import { BotaoLaranja } from "@/painel/ui";
import { useSessao } from "@/sessao/contexto";
import { cores } from "@/tema";
import { ArrowRight, Plus, type LucideIcon } from "@/ui/Icone";
import { Text } from "@/ui/Texto";

// Estado das telas gerais (Performance, Artilheiros, Enquetes, Replays) pra quem
// ainda não tem grupo. Espelha weracha-site/components/estado-sem-grupo.tsx: o
// conteúdo fica centralizado, sem caixa, e a ação vai pro rodapé fixo. No app o
// rodapé tem só o botão laranja (o voltar fica na Navbar): "Começar" (onboarding)
// pra quem nunca fez o tour, "Criar grupo" pra quem já fez.

// Espaço que a tela deixa embaixo pro rodapé fixo não cobrir o conteúdo.
export const ALTURA_RODAPE_SEM_GRUPO = 96;

export function EstadoSemGrupo({
  Icone,
  titulo,
  texto,
}: {
  Icone: LucideIcon;
  titulo: string;
  texto: string;
}) {
  return (
    <View style={styles.estado}>
      <View style={styles.icone}>
        <Icone size={32} color={cores.teal} />
      </View>
      <Text style={styles.titulo}>{titulo}</Text>
      <Text style={styles.texto}>{texto}</Text>
    </View>
  );
}

export function RodapeSemGrupo() {
  const insets = useSafeAreaInsets();
  const { estado } = useSessao();
  const onboardingFeito = estado.fase === "logado" && !!estado.jogador.onboardingConcluidoEm;
  return (
    <View style={[styles.rodape, { paddingBottom: 12 + insets.bottom }]}>
      {onboardingFeito ? (
        <BotaoLaranja rodape titulo="Criar grupo" Icone={Plus} onPress={() => router.push("/criar-grupo")} />
      ) : (
        <BotaoLaranja rodape titulo="Começar" Icone={ArrowRight} onPress={() => router.push("/onboarding")} />
      )}
    </View>
  );
}

// Mesmo desenho do estado sem grupo, pra qualquer vazio de tela (ex.: nenhuma
// enquete ainda): ícone, título e texto centralizados, sem caixa.
export const EstadoVazio = EstadoSemGrupo;

// Rodapé fixo com um botão laranja (ex.: "Criar enquete"), mesmo desenho do
// RodapeSemGrupo.
export function RodapeComBotao({
  titulo,
  Icone,
  onPress,
}: {
  titulo: string;
  Icone?: LucideIcon;
  onPress: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.rodape, { paddingBottom: 12 + insets.bottom }]}>
      <BotaoLaranja rodape titulo={titulo} Icone={Icone} onPress={onPress} />
    </View>
  );
}

export type GrupoResumido = { id: string; nome: string };

// Grupos ativos da pessoa (id + nome), pra tela que não sabe sozinha (Enquetes,
// Replays). undefined enquanto carrega; null se a busca falhar.
export function useMeusGrupos(): GrupoResumido[] | null | undefined {
  const { chamarApi } = useSessao();
  const [grupos, setGrupos] = useState<GrupoResumido[] | null | undefined>(undefined);
  useEffect(() => {
    let vivo = true;
    listarMeusGrupos(chamarApi)
      .then((g) => vivo && setGrupos(g.map((x) => ({ id: x.id, nome: x.nome }))))
      .catch(() => vivo && setGrupos(null));
    return () => {
      vivo = false;
    };
  }, [chamarApi]);
  return grupos;
}

// Atalho: null enquanto carrega; falha conta como "tem grupo" (não troca a tela à toa).
export function useTemGrupo(): boolean | null {
  const grupos = useMeusGrupos();
  if (grupos === undefined) return null;
  return grupos === null ? true : grupos.length > 0;
}

const styles = StyleSheet.create({
  estado: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    paddingHorizontal: 12,
  },
  icone: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(31,179,163,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  titulo: { marginTop: 20, fontSize: 20, fontWeight: "700", color: cores.branco, textAlign: "center" },
  texto: {
    marginTop: 8,
    maxWidth: 300,
    fontSize: 14,
    lineHeight: 21,
    color: cores.slate400,
    textAlign: "center",
  },
  rodape: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    borderTopColor: cores.cardBorda,
    backgroundColor: cores.dark,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
});
