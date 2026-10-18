import { useEffect, useState } from "react";
import { Keyboard, Platform } from "react-native";

// Altura do teclado no Android (0 no iOS e com ele fechado), já sem a barra de
// navegação. Pra Modal até a borda (navigationBarTranslucent): a janela dele não
// encolhe com o teclado e o KeyboardAvoidingView não tem o que fazer, então
// quem tem campo embaixo precisa desviar na mão. No iOS o KeyboardAvoidingView
// resolve. Versão animada (Reanimated) em src/ui/FolhaArrastavel.tsx.
export function useAlturaTecladoAndroid(): number {
  const [altura, setAltura] = useState(0);
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const mostrou = Keyboard.addListener("keyboardDidShow", (e) =>
      setAltura(Math.max(0, e.endCoordinates.height))
    );
    const escondeu = Keyboard.addListener("keyboardDidHide", () => setAltura(0));
    return () => {
      mostrou.remove();
      escondeu.remove();
    };
  }, []);
  return altura;
}
