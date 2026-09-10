# We Racha — app de jogador (weracha-jogador)

App móvel (React Native + Expo) pro jogador comum de pelada. É o **terceiro**
projeto do workspace, cada um com seu próprio git, sem monorepo:

- **site** (`../weracha-site/`) — Next.js, frontend + backend. Expõe a API `/api/v1/*`
  que este app consome.
- **cam** (`../weracha-cam/`) — app Android nativo (Kotlin) que grava os replays.
  Roda num celular fixo no tripé. Público e ciclo de vida diferentes deste app.
- **app** (este) — instalado por todo mundo do grupo. Só fala com o site por HTTP.

Ver `../CLAUDE.md` (workspace) e `../weracha-site/docs/pendente/10-app-de-jogador.md`
(decisões e backlog do app).

## Como o app fala com o site

- Sempre HTTP contra `/api/v1/*`, autenticado por `Authorization: Bearer <token>`.
- Token emitido em `POST /api/v1/auth/token` (telefone + senha). Expira em **10
  dias deslizantes**; num `401` o app re-loga sozinho com a senha guardada no
  SecureStore (`src/sessao/`). Não há tela de "digite a senha de novo" no caminho
  comum.
- Contrato completo: `../weracha-site/docs/especificacao/16-api-v1.md`. Formato de erro
  fixo `{ codigo, mensagem, detalhe? }` — a UI decide a mensagem pelo `codigo`
  (enum estável), **nunca** pelo texto `mensagem` (PT-BR de debug).

## `src/contrato/` é cópia do site, não invente divergência

Nível 1 do compartilhamento ("copiar com disciplina"). `codigos-erro.ts`,
`tipos.ts` e `telefone.ts` são cópia literal de arquivos do repo do site (ver
`src/contrato/README.md` pra origem de cada um). Ao mexer nesses conceitos no
site, reflita aqui e rode `npm test` — o teste trava a lista de códigos de erro.
Não copiar componente React, código de servidor, Zod nem Drizzle.

## Rodando

```bash
npm install
npm start            # Metro; a no terminal abre no emulador Android
npm run android      # abre direto no emulador/device Android
npm test             # jest (contrato)
npm run typecheck    # tsc --noEmit
npm run lint
```

Pra falar com o site local (`next dev` na porta 3000), escolha "Local" na
engrenagem da tela de login:
- Emulador Android: o app usa `http://10.0.2.2:3000` (localhost do host).
- Device físico via USB: rode `adb reverse tcp:3000 tcp:3000` e o app usa
  `http://localhost:3000`.

`java`/`gradle`/`adb` não estão no PATH do sistema (ver `../CLAUDE.md` pros
caminhos do Android Studio). Build nativo real só quando for pra loja (EAS).

## Convenções

- **Só arquivos de rota e layout em `src/app/`** (expo-router, file-based). Todo
  o resto do código em `src/` (`api/`, `sessao/`, `contrato/`, `config/`).
- Rota `(logado)/` é grupo protegido: `src/app/(logado)/_layout.tsx` redireciona
  pro `/login` sem sessão. A home logada é `(logado)/painel.tsx` (`/painel`,
  espelha `weracha-site/app/painel`); peças de UI dele em `src/painel/ui.tsx`.
- **Tela do grupo** (`(logado)/grupos/[id]/index.tsx`) espelha
  `weracha-site/app/grupos/[id]/page.tsx`; as sub-telas são irmãs
  (`artilheiros.tsx`, `resenha.tsx`, `enquetes/`, `jogadores.tsx`). Peças de UI
  em `src/grupo/` (`modais.tsx`, `MenuAcoes.tsx` — action sheet, o `Alert.alert`
  do RN corta em 3 botões no Android; `pickers.tsx` — data/hora via
  `@react-native-community/datetimepicker`), e por área em
  `src/{artilheiros,resenha,enquetes,jogadores}/`. Avatar em
  `src/ui/AvatarJogador.tsx`. Janela de check-in e formatação de partida em
  `src/partidas.ts` (sem fuso SP explícito: o cliente é local).
- Chat da resenha faz polling só enquanto `AppState.currentState === "active"`.
- Vídeo de replay abre no player do sistema (`Linking.openURL`), sem `expo-video`.
- Sub-telas ainda não portadas (check-in, ao vivo, resultado) caem em
  `(logado)/em-breve.tsx` (`?titulo=`).
- **Perfil vem do contexto de sessão.** `useSessao().estado.jogador` é `MeuPerfil`
  (do cache no boot). Tela logada que precisa do perfil fresco chama
  `recarregarPerfil()` (`GET /api/v1/me`) no mount; o contexto atualiza estado +
  SecureStore. Nunca refazer o fetch de `/me` por conta própria numa tela.
- **Nenhum texto visível pro usuário usa travessão ("—") pra montar frase.** Ponto,
  vírgula ou duas frases. (Mesma regra do site; vale pra tela, não pra comentário
  nem doc.)
- Credencial (token/senha) vive em SecureStore + `useRef`, nunca no state do React
  nem em log. (Exceção herdada: o campo de senha da tela de acesso é um
  `TextInput` controlado por `useState` enquanto o usuário digita — some no
  submit; nada é logado.)
- **Visual portado do site.** Tokens de cor/tipografia em `src/tema.ts` (espelham
  `weracha-site/app/globals.css`: fundo `#161a22`, teal, laranja). Peças de UI
  compartilhadas da tela de acesso em `src/acesso/ui.tsx`. Ao criar tela nova,
  puxar de `src/tema.ts` em vez de hardcodar cor.
- **Fluxo de acesso** (entrar / criar conta / criar senha / esqueci a senha) vive
  em `src/acesso/` (`useFluxoAcesso.ts` + `TelaAcesso.tsx`), espelhando
  `weracha-site/app/login/page.tsx`. `src/app/login.tsx` é só o wrapper de rota.
