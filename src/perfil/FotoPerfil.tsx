import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { Text } from "@/ui/Texto";
import * as ImagePicker from "expo-image-picker";
import { File } from "expo-file-system";
import { FileSystemUploadType, uploadAsync } from "expo-file-system/legacy";

import type { OpcoesRequisicao } from "@/api/cliente";
import { definirFotoUrl, pedirUrlUploadFoto } from "@/api/perfil";
import { mensagemDoErro } from "@/mensagens-erro";
import { AvatarJogador } from "@/ui/AvatarJogador";
import { Camera } from "@/ui/Icone";
import { cores } from "@/tema";

type ChamarApi = <T>(caminho: string, opcoes?: OpcoesRequisicao) => Promise<T>;

const TIPOS_ACEITOS = ["image/jpeg", "image/png", "image/webp"];

// Uma imagem de verdade tem bem mais que isso. Barra arquivo vazio ou texto de erro.
const MIN_BYTES_FOTO = 1024;

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
    // Sem pedir permissão de galeria: o seletor do sistema (Android Photo Picker, PHPicker
    // no iOS) entrega só a foto que a pessoa escolheu, sem o app ler a biblioteca. Pedir
    // READ_MEDIA_IMAGES aqui bloquearia quem negar e ainda pesaria na revisão da Play.
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
      // O arquivo é lido pelo lado nativo (uploadAsync), não por `fetch(uri).blob()`: no
      // Android o fetch de uma URI de arquivo devolvia o texto "File not found" (14 bytes),
      // que ia pro R2 no lugar da foto e deixava o avatar preto, sem nenhum erro.
      const arquivo = new File(asset.uri);
      const tamanho = arquivo.size ?? asset.fileSize ?? 0;
      if (!arquivo.exists || tamanho < MIN_BYTES_FOTO) {
        throw new Error("Não foi possível ler a foto escolhida.");
      }
      let contentType = asset.mimeType ?? "image/jpeg";
      if (!TIPOS_ACEITOS.includes(contentType)) contentType = "image/jpeg";

      const { url, linkPublico } = await pedirUrlUploadFoto(chamarApi, contentType, tamanho);
      const envio = await uploadAsync(url, asset.uri, {
        httpMethod: "PUT",
        uploadType: FileSystemUploadType.BINARY_CONTENT,
        headers: { "Content-Type": contentType },
      });
      if (envio.status < 200 || envio.status >= 300) {
        throw new Error(`R2 respondeu ${envio.status}`);
      }

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
            <Camera size={14} color={cores.dark} />
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
  acoes: { flexDirection: "row", gap: 16 },
  link: { fontSize: 13, color: cores.teal },
  linkRemover: { fontSize: 13, color: cores.erroTexto },
  inativo: { opacity: 0.5 },
  erro: { fontSize: 12, color: cores.erroTexto, textAlign: "center" },
});
