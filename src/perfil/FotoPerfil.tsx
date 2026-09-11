import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";

import type { OpcoesRequisicao } from "@/api/cliente";
import { definirFotoUrl, pedirUrlUploadFoto } from "@/api/perfil";
import { mensagemDoErro } from "@/mensagens-erro";
import { AvatarJogador } from "@/ui/AvatarJogador";
import { cores } from "@/tema";

type ChamarApi = <T>(caminho: string, opcoes?: OpcoesRequisicao) => Promise<T>;

const TIPOS_ACEITOS = ["image/jpeg", "image/png", "image/webp"];

// Foto de perfil: escolhe da galeria (expo-image-picker), pede a URL assinada
// (POST /api/v1/perfil/foto/upload-url), faz o PUT direto no R2 e persiste a
// URL pública (PUT /api/v1/perfil/foto). Igual o site, a imagem nunca passa
// pelo backend. `null` remove.
export function FotoPerfil({
  jogadorId,
  nome,
  fotoUrl,
  chamarApi,
  onAtualizada,
}: {
  jogadorId: string;
  nome: string;
  fotoUrl: string | null;
  chamarApi: ChamarApi;
  onAtualizada: (fotoUrl: string | null) => void;
}) {
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function escolher() {
    setErro(null);
    const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissao.granted) {
      setErro("Libere o acesso às fotos pra escolher uma imagem.");
      return;
    }
    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (resultado.canceled) return;
    const asset = resultado.assets[0];

    setOcupado(true);
    try {
      const blob = await (await fetch(asset.uri)).blob();
      let contentType = asset.mimeType || blob.type || "image/jpeg";
      if (!TIPOS_ACEITOS.includes(contentType)) contentType = "image/jpeg";

      const { url, linkPublico } = await pedirUrlUploadFoto(chamarApi, contentType, blob.size);
      const envio = await fetch(url, {
        method: "PUT",
        body: blob,
        headers: { "Content-Type": contentType },
      });
      if (!envio.ok) throw new Error(`R2 respondeu ${envio.status}`);

      await definirFotoUrl(chamarApi, linkPublico);
      onAtualizada(linkPublico);
    } catch (e) {
      setErro(mensagemDoErro(e));
    } finally {
      setOcupado(false);
    }
  }

  async function remover() {
    setErro(null);
    setOcupado(true);
    try {
      await definirFotoUrl(chamarApi, null);
      onAtualizada(null);
    } catch (e) {
      setErro(mensagemDoErro(e));
    } finally {
      setOcupado(false);
    }
  }

  return (
    <View style={styles.wrap}>
      <Pressable style={styles.avatarBotao} onPress={() => void escolher()} disabled={ocupado}>
        <AvatarJogador id={jogadorId} nome={nome} fotoUrl={fotoUrl} tamanho={104} />
        <View style={styles.badge}>
          {ocupado ? (
            <ActivityIndicator size="small" color={cores.dark} />
          ) : (
            <Text style={styles.badgeTexto}>📷</Text>
          )}
        </View>
      </Pressable>
      <View style={styles.acoes}>
        <Pressable hitSlop={6} onPress={() => void escolher()} disabled={ocupado}>
          <Text style={[styles.link, ocupado && styles.inativo]}>
            {fotoUrl ? "Trocar foto" : "Adicionar foto"}
          </Text>
        </Pressable>
        {fotoUrl ? (
          <Pressable hitSlop={6} onPress={() => void remover()} disabled={ocupado}>
            <Text style={[styles.linkRemover, ocupado && styles.inativo]}>Remover</Text>
          </Pressable>
        ) : null}
      </View>
      {erro ? <Text style={styles.erro}>{erro}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", gap: 8 },
  avatarBotao: { position: "relative" },
  badge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: cores.orange,
    borderWidth: 2,
    borderColor: cores.dark,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeTexto: { fontSize: 14 },
  acoes: { flexDirection: "row", gap: 16 },
  link: { fontSize: 13, color: cores.teal },
  linkRemover: { fontSize: 13, color: cores.erroTexto },
  inativo: { opacity: 0.5 },
  erro: { fontSize: 12, color: cores.erroTexto, textAlign: "center" },
});
