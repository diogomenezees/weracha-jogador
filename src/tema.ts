// Tokens de tema portados do site (weracha-site/app/globals.css). O app espelha
// o visual do site: fundo escuro, card com borda teal, botão laranja, caixas de
// aviso teal e de erro vermelhas. Não é Tailwind, é o mesmo resultado em
// StyleSheet do RN. Reutilizável por outras telas conforme forem portadas.

export const cores = {
  // Marca (globals.css: --brand-*)
  dark: "#161a22",
  tealDark: "#12897e",
  teal: "#1fb3a3",
  orange: "#f28c1e",
  orangeClaro: "#ffa23f",

  // Fundo um tom mais escuro que o `dark`, usado pelo carrossel de onboarding
  // (site: #0f1319).
  darkMaisEscuro: "#0f1319",

  // Neutros usados pelos textos do site (slate-*)
  branco: "#ffffff",
  slate200: "#e2e8f0",
  slate300: "#cbd5e1",
  slate400: "#94a3b8",
  slate500: "#64748b",
  slate600: "#475569",

  // Zinc, só pro InfoPill (Score) do site, que foge da escala slate de propósito.
  zinc500: "#71717a",

  // Âmbar de "precisa de atenção" (site: amber-400 / amber-500)
  ambar: "#fbbf24",
  ambarEscuro: "#f59e0b",

  // Erro (red-300 / red-500)
  erroTexto: "#fca5a5",
  erroBorda: "rgba(239, 68, 68, 0.3)",
  erroFundo: "rgba(239, 68, 68, 0.1)",

  // Ação destrutiva em menu/dropdown (site: DropdownMenuItem variant="destructive"
  // e o botão "Sair" do Navbar) — coral, deliberadamente diferente do vermelho
  // de status "cancelada"/erro acima.
  destrutivoTexto: "#F0997B",
  destrutivoIcone: "#D85A30",

  // Superfícies translúcidas sobre o fundo escuro (site usa white/[0.0x])
  cardFundo: "rgba(255, 255, 255, 0.04)",
  cardBorda: "rgba(31, 179, 163, 0.2)",
  campoFundo: "rgba(255, 255, 255, 0.05)",
  campoBorda: "rgba(31, 179, 163, 0.2)",
  avisoFundo: "rgba(31, 179, 163, 0.07)",
  avisoBorda: "rgba(31, 179, 163, 0.25)",
  linhaSutil: "rgba(255, 255, 255, 0.06)",
  superficieSutil: "rgba(255, 255, 255, 0.02)",
  superficieMedia: "rgba(255, 255, 255, 0.07)",
  ambarFundo: "rgba(251, 191, 36, 0.08)",
  ambarBorda: "rgba(251, 191, 36, 0.3)",
  laranjaFundo: "rgba(242, 140, 30, 0.08)",
  laranjaBorda: "rgba(242, 140, 30, 0.35)",
} as const;

export const raio = {
  campo: 10,
  card: 16,
} as const;

// O site usa Space Grotesk em todo texto e Geist Mono no "eyebrow". As fontes
// são carregadas no src/app/_layout.tsx; o wrapper src/ui/Texto.tsx resolve a
// família pelo fontWeight. Aqui os tokens já trazem fontFamily explícito pra
// funcionarem também em Animated.Text / Text cru.
export const fontes = {
  regular: "SpaceGrotesk_400Regular",
  medium: "SpaceGrotesk_500Medium",
  semibold: "SpaceGrotesk_600SemiBold",
  bold: "SpaceGrotesk_700Bold",
  light: "SpaceGrotesk_300Light",
  mono: "GeistMono_400Regular",
} as const;

export const tipografia = {
  titulo: { fontSize: 26, fontWeight: "700" as const, fontFamily: fontes.bold, color: cores.branco },
  subtitulo: { fontSize: 14, lineHeight: 22, fontFamily: fontes.regular, color: cores.slate400 },
  eyebrow: {
    fontSize: 11,
    fontFamily: fontes.mono,
    letterSpacing: 2,
    color: cores.teal,
    textTransform: "uppercase" as const,
  },
  rotulo: { fontSize: 13, fontWeight: "600" as const, fontFamily: fontes.semibold, color: cores.slate300 },
  corpo: { fontSize: 14, lineHeight: 21, fontFamily: fontes.regular, color: cores.slate200 },
} as const;
