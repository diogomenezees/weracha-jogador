import type { OpcoesRequisicao } from "@/api/cliente";
import type { AssinaturaDoJogador, ResumoPro, TelaAssinatura } from "@/contrato/tipos";

type ChamarApi = <T>(caminho: string, opcoes?: OpcoesRequisicao) => Promise<T>;

// Assinatura Pro. Contrato em weracha-site/docs/especificacao/16-api-v1.md §16;
// regras em weracha-site/docs/especificacao/20-assinatura-pro.md.

// GET /api/v1/assinatura — tela Assinatura: plano, vagas e os grupos com o estado de Pro.
export function buscarTelaAssinatura(chamarApi: ChamarApi): Promise<TelaAssinatura> {
  return chamarApi<TelaAssinatura>("/api/v1/assinatura");
}

// GET /api/v1/assinatura/resumo — se mostra as entradas (painel, menu, perfil) e
// o banner das telas que juntam grupos. Tudo false com a cobrança desligada.
export function buscarResumoPro(chamarApi: ChamarApi): Promise<ResumoPro> {
  return chamarApi<ResumoPro>("/api/v1/assinatura/resumo");
}

// POST /api/v1/assinatura/sincronizar — depois de comprar/restaurar no
// RevenueCat: o site reconsulta o RevenueCat (o app nunca diz "sou Pro").
export function sincronizarAssinatura(
  chamarApi: ChamarApi
): Promise<{ ok: true; assinatura: AssinaturaDoJogador | null }> {
  return chamarApi("/api/v1/assinatura/sincronizar", { metodo: "POST" });
}

// POST /api/v1/grupos/{id}/patrocinar — irreversível; a tela confirma antes.
export function patrocinarGrupo(chamarApi: ChamarApi, grupoId: string): Promise<{ ok: true }> {
  return chamarApi(`/api/v1/grupos/${grupoId}/patrocinar`, { metodo: "POST" });
}
