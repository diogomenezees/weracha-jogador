import { Directory, File, Paths } from "expo-file-system";
import { requestPermissionsAsync, saveToLibraryAsync } from "expo-media-library/legacy";

export type ResultadoDownload = "salvo" | "sem-permissao" | "erro";

// Baixa o replay do R2 direto no celular e grava na Galeria. O link do R2 é público e
// o cliente nativo não sofre da limitação do navegador (que ignora `download` em link
// cross-origin, motivo do proxy /api/replays/download do site), então não precisa de
// backend nenhum: o arquivo vai do R2 pro cache do app e de lá pra Galeria.
export async function baixarReplay(link: string, nomeArquivo: string): Promise<ResultadoDownload> {
  let arquivo: File | null = null;
  try {
    // Só escrita, e só vídeo: o app não lê nada da Galeria do jogador.
    const permissao = await requestPermissionsAsync(true, ["video"]);
    if (!permissao.granted) return "sem-permissao";

    const destino = new Directory(Paths.cache, "replays");
    destino.create({ idempotent: true, intermediates: true });
    arquivo = new File(destino, nomeArquivo);
    // `idempotent`: baixar o mesmo replay de novo sobrescreve o do cache em vez de falhar.
    arquivo = await File.downloadFileAsync(link, arquivo, { idempotent: true });
    await saveToLibraryAsync(arquivo.uri);
    return "salvo";
  } catch {
    return "erro";
  } finally {
    // O cache é só passagem: a cópia que importa já está na Galeria.
    try {
      arquivo?.delete();
    } catch {
      // ignora
    }
  }
}

export function nomeArquivoReplay(tipo: "GOL" | "LANCE", id: string): string {
  return `${tipo === "LANCE" ? "lance" : "gol"}-${id}.mp4`;
}

export function mensagemDownload(r: ResultadoDownload): { titulo: string; texto: string } {
  switch (r) {
    case "salvo":
      return { titulo: "Replay salvo", texto: "O vídeo está na sua Galeria." };
    case "sem-permissao":
      return {
        titulo: "Sem permissão",
        texto: "Libere o acesso à Galeria nas configurações do celular pra salvar o replay.",
      };
    case "erro":
      return { titulo: "Não foi possível baixar", texto: "Confira a conexão e tente de novo." };
  }
}
