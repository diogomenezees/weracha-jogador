import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet } from "react-native";
import { Text } from "@/ui/Texto";

import { baixarReplay, mensagemDownload } from "@/replay/baixarReplay";
import { Check, Download } from "@/ui/Icone";
import { useDialogos } from "@/ui/Dialogos";
import { cores, raio } from "@/tema";

// Botão laranja "Baixar vídeo" do card de replay (espelha BotaoBaixarVideo de
// weracha-site/components/gols-pager.tsx). Diferente do site, aqui o download tem
// conclusão de verdade, então o estado "pronto" só aparece depois do vídeo estar na Galeria.
export function BotaoBaixarVideo({ link, nomeArquivo }: { link: string; nomeArquivo: string }) {
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

  return (
    <Pressable
      style={[styles.botao, estado === "baixando" && { opacity: 0.8 }]}
      onPress={() => void baixar()}
      disabled={estado === "baixando"}
    >
      {estado === "baixando" ? (
        <ActivityIndicator size="small" color={cores.dark} />
      ) : estado === "pronto" ? (
        <Check size={16} color={cores.dark} />
      ) : (
        <Download size={16} color={cores.dark} />
      )}
      <Text style={styles.texto}>
        {estado === "baixando"
          ? "Baixando..."
          : estado === "pronto"
            ? "Salvo na Galeria"
            : "Baixar vídeo"}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  botao: {
    height: 40,
    borderRadius: raio.campo,
    backgroundColor: cores.orange,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  texto: { fontSize: 14, fontWeight: "700", color: cores.dark },
});
