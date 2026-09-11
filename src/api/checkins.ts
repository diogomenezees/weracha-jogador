import type { OpcoesRequisicao } from "@/api/cliente";
import type { CheckIn, DadosDeApoioDaPartida, TipoPagamento } from "@/contrato/tipos";

type ChamarApi = <T>(caminho: string, opcoes?: OpcoesRequisicao) => Promise<T>;

// Rotas de check-in de partida. Ver 16-api-v1.md §14.

// GET /api/v1/partidas/{partidaId}/checkins — elenco + check-ins + posições +
// jogadores resolvidos, 1 leitura. Corpo direto, sem wrapper.
export function buscarApoioDaPartida(
  chamarApi: ChamarApi,
  partidaId: string
): Promise<DadosDeApoioDaPartida> {
  return chamarApi<DadosDeApoioDaPartida>(`/api/v1/partidas/${partidaId}/checkins`);
}

// POST /api/v1/partidas/{partidaId}/checkins/me — o próprio jogador confirma.
export async function fazerMeuCheckin(chamarApi: ChamarApi, partidaId: string): Promise<CheckIn> {
  const { checkin } = await chamarApi<{ checkin: CheckIn }>(
    `/api/v1/partidas/${partidaId}/checkins/me`,
    { metodo: "POST" }
  );
  return checkin;
}

// DELETE /api/v1/partidas/{partidaId}/checkins/me — cancela a própria presença.
export function cancelarMeuCheckin(chamarApi: ChamarApi, partidaId: string) {
  return chamarApi<{ ok: true }>(`/api/v1/partidas/${partidaId}/checkins/me`, {
    metodo: "DELETE",
  });
}

// POST /api/v1/partidas/{partidaId}/checkins — admin confirma outro jogador.
export async function fazerCheckinDeJogador(
  chamarApi: ChamarApi,
  partidaId: string,
  jogadorId: string
): Promise<CheckIn> {
  const { checkin } = await chamarApi<{ checkin: CheckIn }>(
    `/api/v1/partidas/${partidaId}/checkins`,
    { metodo: "POST", corpo: { jogadorId } }
  );
  return checkin;
}

// DELETE /api/v1/partidas/{partidaId}/checkins?jogadorId=<id> — admin remove.
export function removerCheckinDeJogador(
  chamarApi: ChamarApi,
  partidaId: string,
  jogadorId: string
) {
  return chamarApi<{ ok: true }>(
    `/api/v1/partidas/${partidaId}/checkins?jogadorId=${encodeURIComponent(jogadorId)}`,
    { metodo: "DELETE" }
  );
}

// PUT /api/v1/partidas/{partidaId}/checkins/{jogadorId}/pagamento — só a
// cobrança dessa partida (não o status de mensalista do grupo).
export function definirPagamentoCheckin(
  chamarApi: ChamarApi,
  partidaId: string,
  jogadorId: string,
  tipoPagamento: TipoPagamento
) {
  return chamarApi<{ ok: true }>(
    `/api/v1/partidas/${partidaId}/checkins/${jogadorId}/pagamento`,
    { metodo: "PUT", corpo: { tipoPagamento } }
  );
}
