# We Racha (app de jogador)

App móvel do jogador de pelada. React Native + Expo (SDK 57), TypeScript,
expo-router. Consome a API `/api/v1/*` do site We Racha.

## Rodar

```bash
npm install
npm start
```

- `a` no terminal do Metro abre no emulador Android.
- `npm run android` / `npm run ios` abrem direto.
- Escolha o servidor (Local / Produção) na engrenagem da tela de login.

## Comandos

| Comando | O quê |
|---|---|
| `npm start` | Metro bundler |
| `npm run android` / `ios` / `web` | abre na plataforma |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | jest (trava o contrato copiado do site) |
| `npm run lint` | eslint (config do Expo) |

## Estrutura

```
src/
  app/                 rotas (expo-router). SÓ telas e layouts aqui.
    _layout.tsx        SessaoProvider + Stack
    index.tsx          porta de entrada: redireciona por sessão
    login.tsx          login contra POST /api/v1/auth/token
    (logado)/          grupo protegido (redireciona sem sessão)
      _layout.tsx
      partidas.tsx     placeholder da home logada
  api/                 cliente HTTP + erros + chamadas
  sessao/              SecureStore do Bearer + contexto de sessão + re-login em 401
  config/              URL base do servidor (Local / Produção), em runtime
  contrato/            CÓPIA do repo do site (Nível 1). Ver contrato/README.md
  mensagens-erro.ts    codigo de erro -> texto pro usuário
__tests__/             jest
```

## Estado

Scaffold + tela de login funcionando (fatia 1). Backlog e decisões:
`../weracha-site/docs/pendente/10-app-de-jogador.md`.

> O template do Expo trouxe algumas libs que ainda não são usadas (`@expo/ui`,
> `expo-symbols`, `expo-glass-effect`, `expo-web-browser`, `expo-image`). Dá pra
> podar quando estabilizar o conjunto de telas.
