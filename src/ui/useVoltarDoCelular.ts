import { useCallback, useEffect, useRef } from "react";
import { BackHandler } from "react-native";
import { useFocusEffect } from "expo-router";

// Faz o botão/gesto de voltar do celular desfazer um estado da própria tela (ex.: fechar os
// replays abertos inline) em vez de sair pra tela anterior. Só intercepta com `ativo` ligado
// e com a tela em foco, então não briga com telas empilhadas por baixo. O listener do
// BackHandler mais recente responde primeiro, por isso este ganha do voltar do expo-router.
export function useVoltarDoCelular(ativo: boolean, aoVoltar: () => void) {
  const aoVoltarRef = useRef(aoVoltar);
  useEffect(() => {
    aoVoltarRef.current = aoVoltar;
  });

  useFocusEffect(
    useCallback(() => {
      if (!ativo) return;
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        aoVoltarRef.current();
        return true;
      });
      return () => sub.remove();
    }, [ativo])
  );
}
