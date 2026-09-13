import { createContext, useContext, useRef, type ReactNode, type RefObject } from "react";
import type { View } from "react-native";
import { BlurTargetView } from "expo-blur";

// No Android, o blur de verdade dos modais (`blurMethod="dimezisBlurView"` nos
// vários <BlurView> do app) exige uma referência pra view que vai aparecer
// borrada atrás — sem ela o expo-blur cai silenciosamente num tint sólido sem
// desfoque (com um warning no console). `BlurTargetProvider` envolve a árvore
// inteira do app (ver src/app/_layout.tsx) com essa referência e distribui via
// contexto; cada <BlurView> lê com `useBlurTarget()` e passa como `blurTarget`.
// No iOS não faz diferença (o blur nativo não depende de blurTarget).
const ContextoBlurTarget = createContext<RefObject<View | null> | null>(null);

export function BlurTargetProvider({ children }: { children: ReactNode }) {
  const ref = useRef<View>(null);
  return (
    <ContextoBlurTarget.Provider value={ref}>
      <BlurTargetView ref={ref} style={{ flex: 1 }}>
        {children}
      </BlurTargetView>
    </ContextoBlurTarget.Provider>
  );
}

export function useBlurTarget(): RefObject<View | null> | undefined {
  return useContext(ContextoBlurTarget) ?? undefined;
}
