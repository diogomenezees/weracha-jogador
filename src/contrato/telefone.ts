// ─────────────────────────────────────────────────────────────────────────────
// CONTRATO COPIADO DO SITE — Nível 1. Fonte: weracha-site/lib/telefone.ts.
// Só os helpers PUROS (sem dependência de servidor). A validação forte
// (`erroTelefone`, com lista de DDD) roda no servidor; aqui fica só o mínimo
// pro campo de login formatar enquanto digita.
// ─────────────────────────────────────────────────────────────────────────────

/** Tira tudo que não é dígito. É o formato que a API espera no campo `telefone`. */
export function normalizarTelefone(valor: string): string {
  return valor.replace(/\D/g, "");
}

/** `11968978166` → `(11) 96897-8166`. Formata parcial enquanto o usuário digita. */
export function formatarTelefoneBR(valor: string | null | undefined): string {
  if (!valor) return "";
  const digitos = valor.replace(/\D/g, "").slice(0, 11);

  if (digitos.length === 0) return "";
  if (digitos.length <= 2) return `(${digitos}`;
  if (digitos.length <= 7) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2)}`;
  }
  return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7, 11)}`;
}
