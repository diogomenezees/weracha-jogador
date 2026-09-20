import type { OpcoesRequisicao } from "@/api/cliente";

type ChamarApi = <T>(caminho: string, opcoes?: OpcoesRequisicao) => Promise<T>;

// POST /api/v1/contato — mensagem pra ouvidoria. Logado (Bearer): nome e telefone vêm da
// conta e o servidor dispensa o captcha do navegador (freio: 5 mensagens por hora). Ver
// 16-api-v1.md §5. 422/429 chegam como `ErroApi` com o `codigo` (CONTATO_*).
export async function enviarContato(
  chamarApi: ChamarApi,
  dados: { titulo: string; descricao: string }
): Promise<void> {
  await chamarApi<{ ok: true }>("/api/v1/contato", { metodo: "POST", corpo: dados });
}
