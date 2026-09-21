import type { OpcoesRequisicao } from "@/api/cliente";
import type {
  ConfiguracaoPartida,
  EstadoAoVivo,
  EstadoAoVivoCompleto,
  GolComVideos,
  ModoSorteio,
  PreAlocacaoPartida,
  ResultadoSalvo,
} from "@/contrato/tipos";

type ChamarApi = <T>(caminho: string, opcoes?: OpcoesRequisicao) => Promise<T>;

// POST /api/v1/partidas/{partidaId}/cancelamento — cancela (justificativa
// opcional). 422 se a partida já tem resultado.
export function cancelarPartida(
  chamarApi: ChamarApi,
  partidaId: string,
  justificativa?: string
) {
  return chamarApi<{ ok: true }>(`/api/v1/partidas/${partidaId}/cancelamento`, {
    metodo: "POST",
    corpo: { justificativa: justificativa ?? "" },
  });
}

// DELETE /api/v1/partidas/{partidaId}/cancelamento — reativa (desfaz o cancelamento).
export function reativarPartida(chamarApi: ChamarApi, partidaId: string) {
  return chamarApi<{ ok: true }>(`/api/v1/partidas/${partidaId}/cancelamento`, {
    metodo: "DELETE",
  });
}

// PATCH /api/v1/partidas/{partidaId} — edita só a descrição.
export function editarDescricaoPartida(
  chamarApi: ChamarApi,
  partidaId: string,
  descricao: string
) {
  return chamarApi<{ ok: true }>(`/api/v1/partidas/${partidaId}`, {
    metodo: "PATCH",
    corpo: { descricao },
  });
}

// DELETE /api/v1/partidas/{partidaId} — exclui de vez uma partida já cancelada.
export function excluirPartida(chamarApi: ChamarApi, partidaId: string) {
  return chamarApi<{ ok: true }>(`/api/v1/partidas/${partidaId}`, { metodo: "DELETE" });
}

// ── Configuração + sorteio (16-api-v1.md §8, §12) ──────────────────────────

// GET /api/v1/partidas/{partidaId}/configuracao — tamanho de time, duração da
// rodada, gols pra encerrar. undefined se nunca foi salva.
export async function buscarConfiguracao(
  chamarApi: ChamarApi,
  partidaId: string
): Promise<ConfiguracaoPartida | undefined> {
  const { configuracao } = await chamarApi<{ configuracao: ConfiguracaoPartida | undefined }>(
    `/api/v1/partidas/${partidaId}/configuracao`
  );
  return configuracao;
}

// PUT /api/v1/partidas/{partidaId}/configuracao — upsert. Também reseta o
// cronômetro pra PARADO com o tempo recalculado.
export function salvarConfiguracao(
  chamarApi: ChamarApi,
  partidaId: string,
  dados: { jogadoresPorTime: number; duracaoRodadaMin: number; golsParaEncerrarRodada: number }
) {
  return chamarApi<{ ok: true; configuracao: ConfiguracaoPartida }>(
    `/api/v1/partidas/${partidaId}/configuracao`,
    { metodo: "PUT", corpo: dados }
  );
}

// GET /api/v1/partidas/{partidaId}/pre-alocacoes — fixações manuais de time.
export async function buscarPreAlocacoes(
  chamarApi: ChamarApi,
  partidaId: string
): Promise<PreAlocacaoPartida[]> {
  const { preAlocacoes } = await chamarApi<{ preAlocacoes: PreAlocacaoPartida[] }>(
    `/api/v1/partidas/${partidaId}/pre-alocacoes`
  );
  return preAlocacoes;
}

// PUT /api/v1/partidas/{partidaId}/pre-alocacoes — substitui todas de uma vez.
// `{}` limpa. `fixacoes` = { jogadorId: timeIndice (0-based) }.
export function salvarPreAlocacoes(
  chamarApi: ChamarApi,
  partidaId: string,
  fixacoes: Record<string, number>
) {
  return chamarApi<{ ok: true }>(`/api/v1/partidas/${partidaId}/pre-alocacoes`, {
    metodo: "PUT",
    corpo: { fixacoes },
  });
}

// GET /api/v1/partidas/{partidaId}/resultado — sorteio ativo, ou undefined.
export async function buscarResultadoAtivo(
  chamarApi: ChamarApi,
  partidaId: string
): Promise<ResultadoSalvo | undefined> {
  const { resultado } = await chamarApi<{ resultado: ResultadoSalvo | undefined }>(
    `/api/v1/partidas/${partidaId}/resultado`
  );
  return resultado;
}

// POST /api/v1/partidas/{partidaId}/resultado — roda o balanceamento no
// servidor e salva como ativo. Única porta pra gerar sorteio. 422 se uma
// fixação excede a capacidade do time.
export async function gerarSorteio(
  chamarApi: ChamarApi,
  partidaId: string,
  jogadoresPorTime: number,
  modoSorteio: ModoSorteio
): Promise<ResultadoSalvo> {
  const { resultado } = await chamarApi<{ ok: true; resultado: ResultadoSalvo }>(
    `/api/v1/partidas/${partidaId}/resultado`,
    { metodo: "POST", corpo: { jogadoresPorTime, modoSorteio } }
  );
  return resultado;
}

// POST /api/v1/partidas/{partidaId}/resultado/refazer — desativa o resultado e
// apaga gols/lances/replays/comentários. Pré-alocações sobrevivem. 422 se a
// partida já encerrou.
export function refazerSorteio(chamarApi: ChamarApi, partidaId: string) {
  return chamarApi<{ ok: true }>(`/api/v1/partidas/${partidaId}/resultado/refazer`, {
    metodo: "POST",
  });
}

// GET /api/v1/partidas/{partidaId}/resultado/ultimo-modo-sorteio — modo do
// resultado mais recente (ativo ou não), pra pré-selecionar no configurar.
export async function buscarUltimoModoSorteio(
  chamarApi: ChamarApi,
  partidaId: string
): Promise<ModoSorteio | null> {
  const { modoSorteio } = await chamarApi<{ modoSorteio: ModoSorteio | null }>(
    `/api/v1/partidas/${partidaId}/resultado/ultimo-modo-sorteio`
  );
  return modoSorteio;
}

// ── Ao vivo (16-api-v1.md §12) ────────────────────────────────────────────

// GET /api/v1/partidas/{partidaId}/ao-vivo — estado completo (sem wrapper).
// Faz get-or-create de config/estado (efeito colateral leve, idempotente).
export function buscarEstadoAoVivo(
  chamarApi: ChamarApi,
  partidaId: string
): Promise<EstadoAoVivoCompleto> {
  return chamarApi<EstadoAoVivoCompleto>(`/api/v1/partidas/${partidaId}/ao-vivo`);
}

// GET /api/v1/partidas/{partidaId}/gols — do mais recente pro mais antigo.
// `incluirCancelados` (tela de Resultado) traz também o gol cancelado.
export async function buscarGols(
  chamarApi: ChamarApi,
  partidaId: string,
  opcoes: { incluirCancelados?: boolean } = {}
): Promise<GolComVideos[]> {
  const query = opcoes.incluirCancelados ? "?incluirCancelados=true" : "";
  const { gols } = await chamarApi<{ gols: GolComVideos[] }>(
    `/api/v1/partidas/${partidaId}/gols${query}`
  );
  return gols;
}

// GET /api/v1/partidas/{partidaId}/lances — lances importantes (tipo LANCE).
export async function buscarLances(
  chamarApi: ChamarApi,
  partidaId: string
): Promise<GolComVideos[]> {
  const { lances } = await chamarApi<{ lances: GolComVideos[] }>(
    `/api/v1/partidas/${partidaId}/lances`
  );
  return lances;
}

// PUT /api/v1/partidas/{partidaId}/cronometro — play/pause.
export async function acaoCronometro(
  chamarApi: ChamarApi,
  partidaId: string,
  acao: "play" | "pause"
): Promise<EstadoAoVivo> {
  const { estado } = await chamarApi<{ estado: EstadoAoVivo }>(
    `/api/v1/partidas/${partidaId}/cronometro`,
    { metodo: "PUT", corpo: { acao } }
  );
  return estado;
}

// POST /api/v1/partidas/{partidaId}/cronometro/trinta-segundos — +30s.
export async function adicionarTrintaSegundos(
  chamarApi: ChamarApi,
  partidaId: string
): Promise<EstadoAoVivo> {
  const { estado } = await chamarApi<{ estado: EstadoAoVivo }>(
    `/api/v1/partidas/${partidaId}/cronometro/trinta-segundos`,
    { metodo: "POST" }
  );
  return estado;
}

// POST /api/v1/partidas/{partidaId}/cronometro/resetar — volta pra duração
// cheia e marca início de rodada nova.
export async function resetarCronometro(
  chamarApi: ChamarApi,
  partidaId: string
): Promise<EstadoAoVivo> {
  const { estado } = await chamarApi<{ estado: EstadoAoVivo }>(
    `/api/v1/partidas/${partidaId}/cronometro/resetar`,
    { metodo: "POST" }
  );
  return estado;
}

// POST /api/v1/partidas/{partidaId}/gols — marca gol pra um jogador (cria o
// pedido de replay que o We Racha Cam consulta).
export function marcarGol(chamarApi: ChamarApi, partidaId: string, jogadorId: string) {
  return chamarApi<{ ok: true }>(`/api/v1/partidas/${partidaId}/gols`, {
    metodo: "POST",
    corpo: { jogadorId },
  });
}

// DELETE /api/v1/partidas/{partidaId}/gols?jogadorId=<id> — desfaz o gol mais
// recente do jogador (idempotente).
export function desmarcarGol(chamarApi: ChamarApi, partidaId: string, jogadorId: string) {
  return chamarApi<{ ok: true }>(
    `/api/v1/partidas/${partidaId}/gols?jogadorId=${encodeURIComponent(jogadorId)}`,
    { metodo: "DELETE" }
  );
}

// POST /api/v1/partidas/{partidaId}/lances — pedido de replay de um lance
// importante. 422 se "lances importantes" está desativado no site.
export function marcarLance(chamarApi: ChamarApi, partidaId: string) {
  return chamarApi<{ ok: true }>(`/api/v1/partidas/${partidaId}/lances`, { metodo: "POST" });
}

// ── Correções pós-jogo (tela de Resultado, dentro do prazo de edição) ──────

// PUT /api/v1/partidas/{partidaId}/gols/{jogadorId} — define o TOTAL de gols do
// jogador. Só aumenta: total menor que o atual dá 422 (GOL_REDUCAO_NAO_PERMITIDA),
// pra tirar gol é o cancelamento. Não gera pedido de replay.
export function corrigirGols(
  chamarApi: ChamarApi,
  partidaId: string,
  jogadorId: string,
  quantidade: number
) {
  return chamarApi<{ ok: true }>(`/api/v1/partidas/${partidaId}/gols/${jogadorId}`, {
    metodo: "PUT",
    corpo: { quantidade },
  });
}

// POST /api/v1/gols/{golId}/cancelamento — soft delete reversível.
export function cancelarGol(chamarApi: ChamarApi, golId: string) {
  return chamarApi<{ ok: true }>(`/api/v1/gols/${golId}/cancelamento`, { metodo: "POST" });
}

// DELETE /api/v1/gols/{golId}/cancelamento — reativa.
export function reativarGol(chamarApi: ChamarApi, golId: string) {
  return chamarApi<{ ok: true }>(`/api/v1/gols/${golId}/cancelamento`, { metodo: "DELETE" });
}

// POST /api/v1/gols/{golId}/migracao — migra o gol pra outro jogador (membro
// atual do grupo). Preserva o rastro do dono original.
export function migrarGol(chamarApi: ChamarApi, golId: string, novoJogadorId: string) {
  return chamarApi<{ ok: true }>(`/api/v1/gols/${golId}/migracao`, {
    metodo: "POST",
    corpo: { novoJogadorId },
  });
}
