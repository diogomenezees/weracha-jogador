import { ehCodigoErro, type CodigoErro } from "@/contrato/codigos-erro";
import type { RespostaErro } from "@/contrato/tipos";

// Erro de qualquer chamada a `/api/v1/*`. Carrega o `codigo` estável do
// contrato (16-api-v1.md §2) — a UI decide a mensagem a partir dele, não do
// texto `mensagem` (que é PT-BR de debug).
export class ErroApi extends Error {
  readonly codigo: CodigoErro | "SEM_RESPOSTA" | "RESPOSTA_INVALIDA";
  readonly status: number;
  readonly detalhe?: Record<string, unknown>;

  constructor(args: {
    codigo: ErroApi["codigo"];
    mensagem: string;
    status: number;
    detalhe?: Record<string, unknown>;
  }) {
    super(args.mensagem);
    this.name = "ErroApi";
    this.codigo = args.codigo;
    this.status = args.status;
    this.detalhe = args.detalhe;
  }
}

/** Falha de rede/DNS/timeout: nem chegou a ter resposta HTTP. */
export function erroSemResposta(causa: unknown): ErroApi {
  return new ErroApi({
    codigo: "SEM_RESPOSTA",
    mensagem: causa instanceof Error ? causa.message : "Sem conexão com o servidor.",
    status: 0,
  });
}

/** Constrói o `ErroApi` a partir do corpo de erro da API. */
export function erroDaResposta(status: number, corpo: unknown): ErroApi {
  if (corpo && typeof corpo === "object" && "codigo" in corpo) {
    const c = corpo as Partial<RespostaErro>;
    if (ehCodigoErro(c.codigo)) {
      return new ErroApi({
        codigo: c.codigo,
        mensagem: typeof c.mensagem === "string" ? c.mensagem : c.codigo,
        status,
        detalhe: c.detalhe,
      });
    }
  }
  return new ErroApi({
    codigo: "RESPOSTA_INVALIDA",
    mensagem: `Resposta ${status} fora do formato { codigo, mensagem }.`,
    status,
  });
}
