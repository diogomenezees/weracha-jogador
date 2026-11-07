import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet } from "react-native";

import { baixarReplay, mensagemDownload } from "@/replay/baixarReplay";
import { Check, Download } from "@/ui/Icone";
import { useDialogos } from "@/ui/Dialogos";
import { cores } from "@/tema";

// Estado do download (parado → baixando → pronto por 3s) e o aviso de erro.
// Diferente do site, aqui o download tem conclusão de verdade, então o "pronto"
// só aparece depois do vídeo estar na Galeria.
function useBaixarReplay(link: string, nomeArquivo: string) {
  const { avisar } = useDialogos();
  const [estado, setEstado] = useState<"parado" | "baixando" | "pronto">("parado");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  async function baixar() {
    if (estado === "baixando") return;
    setEstado("baixando");
    const resultado = await baixarReplay(link, nomeArquivo);
    if (resultado === "salvo") {
      setEstado("pronto");
      timer.current = setTimeout(() => setEstado("parado"), 3000);
    } else {
      setEstado("parado");
      const { titulo, texto } = mensagemDownload(resultado);
      avisar(titulo, texto);
    }
  }

  return { estado, baixar };
}

// Ícone de baixar ao lado do ❤ no cabeçalho de todo card de replay (Resultado,
// Resenha, Meus replays, Favoritos), desde 2026-11-06 no lugar do botão laranja
// "Baixar vídeo" embaixo do vídeo (espelha BotaoBaixarVideo de
// weracha-site/components/gols-pager.tsx). Spinner enquanto baixa e ✓ quando o
// vídeo chega na Galeria.
export function BotaoBaixarVideoIcone({
  link,
  nomeArquivo,
}: {
  link: string;
  nomeArquivo: string;
}) {
  const { estado, baixar } = useBaixarReplay(link, nomeArquivo);
  return (
    <Pressable
      hitSlop={8}
      onPress={() => void baixar()}
      disabled={estado === "baixando"}
      accessibilityRole="button"
      accessibilityLabel={estado === "pronto" ? "Vídeo salvo na Galeria" : "Baixar vídeo"}
    >
      {estado === "baixando" ? (
        <ActivityIndicator size="small" color={cores.orange} style={styles.iconeSpinner} />
      ) : estado === "pronto" ? (
        <Check size={19} color={cores.teal} />
      ) : (
        <Download size={19} color={cores.orange} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Mesmo espaço do ícone de 19, pra não mexer o ❤ e o ⋮ do lado.
  iconeSpinner: { width: 19, height: 19 },
});
