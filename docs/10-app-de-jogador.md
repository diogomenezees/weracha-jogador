# App de jogador: backlog e decisões em aberto

> O que **falta** no app de jogador (`weracha-jogador/`): validação em device, build EAS,
> lojas, push, observabilidade e o resto do backlog. O que já foi entregue, tela por tela,
> está em [`00-estado-do-app.md`](00-estado-do-app.md).
>
> Junta o antigo `10-app-de-jogador-decisoes-em-aberto.md` + `11-preparacao-pre-app.md` que
> viviam em `weracha-site/docs/pendente/`. O contrato que o app consome está pronto e
> exercitado ponta a ponta em
> [`../../weracha-site/docs/especificacao/16-api-v1.md`](../../weracha-site/docs/especificacao/16-api-v1.md).
> Débito de arquitetura da API que **não** depende do app fica em
> [`../../weracha-site/docs/pendente/09-debitos-tecnicos-api.md`](../../weracha-site/docs/pendente/09-debitos-tecnicos-api.md).
>
> Os números de seção abaixo (§1 a §10) são citados pelo site
> (`16-api-v1.md`): não renumerar.

---

## Estado (2026-09-21)

Todas as telas do site (menos `/admin/*`) estão portadas e nada cai mais em `/em-breve`.
**Mas nenhuma tela rodou em device ainda e o APK nunca foi gerado**: typecheck, lint e jest
passam, e endpoints foram verificados por curl no site Local, só isso. Enquanto a validação
abaixo não for feita, o app não conta como concluído.

### Em andamento: paridade visual/funcional com o site

Plano em 8 fases. As fases 2 a 4 estão feitas (ver [`00-estado-do-app.md`](00-estado-do-app.md)).
Sobram:

- **Fase 1 (EAS, parcial)**: `eas.json` criado (perfis `development`/`preview`/
  `production`). Deps: `expo-dev-client`, `react-native-svg`, `lucide-react-native`,
  `@expo-google-fonts/{space-grotesk,geist-mono}`. **Falta o dono rodar**
  `npx eas login` + `npx eas build -p android --profile development`, depois
  `npx eas credentials` pro SHA-256 real (troca o placeholder em
  `weracha-site/app/.well-known/assetlinks.json/route.ts`).
- **Fases 5-8 (pendentes)**: pager estilo Stories (`/replays`, `/resenha`), seletor de
  cor em configurar, compartilhar como imagem (`react-native-view-shot`), deep link de
  compartilhar replay (novo nos dois repos). Todas exigem o dev client da Fase 1.

### Validação em device (checklist)

Rodar contra o site Local (Expo Go em device físico com `adb reverse tcp:3000 tcp:3000`, ou o
APK do EAS) e riscar por tela. Nenhum item abaixo foi testado ainda:

- [ ] **Acesso:** os 4 caminhos (entrar, criar conta, criar senha, esqueci a senha) + erros
      (código errado, cooldown, senha curta). Aviso de spam e "Corrigir número" no reset.
- [ ] **Painel + onboarding:** os 3 estados do painel, os 3 slides do onboarding, a
      reativação de conta.
- [ ] **Criar grupo + tela do grupo:** os dois tipos de grupo, o ciclo de vida de partida
      (cancelar/reativar/excluir), vincular quadra, renovar mês, convite.
- [ ] **Artilheiros, resenha, enquetes, gerenciar jogadores:** votar, comentar (polling),
      gerenciar elenco, compartilhar rankings.
- [ ] **Ciclo da partida:** check-in → sorteio → ao vivo → resultado completo, correções
      pós-jogo, cores, fixação de time, erros (fixação impossível, prazo de edição de gol).
- [ ] **Navbar:** abrir/fechar a gaveta, navegação pra cada destino, "Sair" (deve cair no
      `/login` pelo redirect do `(logado)/_layout`).
- [ ] **Perfil:** salvar cada campo; upload de foto (o `PUT` do blob no R2 via `fetch` do RN
      é o ponto de risco: se o `Content-Length` não bater, o R2 recusa; plano B é
      `expo-file-system` `uploadAsync`); trocar senha; pedir exclusão + reativar; editar
      score/posição.
- [ ] **Replays, Parcerias, Sorteio rápido, Contato:** telas portadas sem rodar em device.
- [ ] **Convite:** colar link válido/inválido/revogado, entrar logado e via login, cair na
      tela certa pra cada `destino` (grupo / check-in aberto / enquete).
- [ ] **Paridade com o site (fases 2-4):** fontes, ícones, confete de gol, vídeo embutido
      (pôster/capa, um por vez) e "Baixar vídeo" na Galeria. Este último exige o dev client
      ou APK (`expo-media-library` é plugin nativo novo).

### Próximo passo

1. **Build EAS (APK preview)** pra rodar sem o Metro/notebook. Expo Go carrega o JS da
   máquina; com o notebook desligado o app não abre. Precisa de `eas.json` + conta Expo
   grátis (`npx eas login` + `npx eas build -p android --profile preview`).
2. **Disparar a conta Apple Developer** (§4 abaixo): é puro lead time, a verificação leva
   dias a semanas. Fazer em paralelo, não esperar o app pronto.
3. **Rodar o checklist de validação acima em device.** É o que separa "telas portadas" de
   "app concluído".
4. Deixar necessidade real puxar o resto: push, deep links (link de compartilhar replay),
   camadas 2/3 do anti-abuso de SMS, OpenAPI. Nada disso bloqueia validar.

---

## Aberto

### 1. Ciclo de token: o que falta

- [ ] `POST /api/v1/auth/refresh` com rotação + detecção de reuse (refresh usado
      2x revoga a cadeia daquele device). **Adiado de propósito**: com 10 dias
      deslizantes o re-login silencioso do app (401 → `POST /api/v1/auth/token`
      com a senha guardada) cobre o caso comum. Refresh só entra se a UX de
      "digitar a senha" incomodar. Esse endpoint também vai precisar do rate
      limiting quando existir.
- [ ] Tela "meus aparelhos" (web e app), unificando `sessoes` + `tokensAcesso` na
      mesma visão. `revogado_em` e `nome_dispositivo` já existem pra isso.
- [ ] TTL exato do refresh token (o do access está em 10 dias, revisável).

### 2. Push notifications

Não existe nada de push hoje (nem site, nem Cam). O app de jogador é o primeiro
cliente que justifica: lembrete de check-in, "sorteio saiu", "seu gol foi
gravado", resposta na resenha, "artilheiro do mês definido". É um subsistema
inteiro, não um endpoint.

- [ ] **Infra de job agendado (Vercel Cron)** — não existe hoje (renovação de
      partida é manual, fila de exclusão é atendida na mão). Serve pra dois usos:
      lembrete de check-in (push agendado X horas antes da partida) e automatizar
      a fila de `solicitacoes_exclusao`. Uma infra, dois consumidores.
- [ ] **Transporte**: Expo Push (camada única sobre FCM + APNs, combina com o
      EAS/RN escolhido) vs. FCM/APNs direto. Inclinação: Expo Push pela
      simplicidade, migrar só se precisar de recurso que o Expo não expõe.
- [ ] **Schema**: tabela de device push tokens (`jogadorId`, token, plataforma,
      `criadoEm`/`ultimoUsoEm`/`revogadoEm`). Regra do CLAUDE.md do site: coluna
      `.defaultNow()` nasce `{ withTimezone: true }`. Precisa entrar nos 3 pontos
      de exclusão/anonimização de jogador (mesmo tratamento de `tokensAcesso`).
      Decidir se é tabela própria ou coluna em `tokensAcesso` (1 device = 1 token
      de acesso + 1 push token; provavelmente vale juntar).
- [ ] **Serviço de envio** (Expo Push é um POST HTTP) + mapa de gatilhos em
      `lib/services/*`. Testável agora com um token registrado na mão; o app só
      pluga o registro do token dele depois. Alguns gatilhos são reação a ação de
      outro usuário (resposta na resenha), outros são agendados (lembrete de
      check-in) e dependem do cron acima.
- [ ] **Preferências**: tela no app pra ligar/desligar por categoria; coluna(s)
      no jogador ou tabela à parte. Default de cada categoria.
- [ ] **iOS**: pedido de permissão de notificação (prompt nativo), tratamento de
      "negado".

### 3. Deep links / universal links

**Feito pro link de convite (2026-09-07):**
- Site: `app/convite/[token]/page.tsx` (redireciona pro `/login?convite=...` na
  web), `app/.well-known/{assetlinks.json,apple-app-site-association}/route.ts`
  (⚠️ **fingerprint SHA-256 e Apple Team ID ainda são placeholder** — trocar
  depois do EAS/conta Apple; sem isso o link abre com o seletor "abrir com" em
  vez de direto), `proxy.ts` libera `/convite/` e `/.well-known/`. Os 3
  geradores de link do site (`grupos/[id]`, `enquetes`, `grupos/[id]/enquetes`)
  passaram a emitir `weracha.app/convite/{token}` no lugar de `/login?convite=`.
- App: `app.json` com `intentFilters` (Android, `pathPrefix: /convite`,
  `autoVerify`) + `associatedDomains` (iOS). Rota `src/app/convite/[token].tsx`:
  deslogado guarda o token (`src/acesso/convitePendente.ts`) e manda pro login,
  que entra no grupo ao terminar (`useFluxoAcesso.concluirLogin`); logado, botão
  "Entrar no grupo" chama `POST /api/v1/convites/{token}`. `src/api/convites.ts`.
- **Testável agora** em Expo Go via `exp://<ip>:8081/--/convite/<token>`. O app
  link `https://` de verdade só depois do EAS Build (Expo Go não registra
  intent filter).
- **Entrada manual + `destino` (2026-09-10):** além do deep link, tela
  `/entrar-por-convite` pra colar o link (o painel sem grupo aponta pra ela). O
  `destino` da resposta do `POST /convites/{token}` agora é seguido de verdade
  (`processarConviteEIrParaDestino` em `src/convites.ts`): grupo / check-in
  aberto / enquete, tanto no toque de "Entrar no grupo" quanto no login vindo
  de convite. Ver a seção "Feito" acima.

- [ ] Link de **compartilhar replay** — mesma estrutura, quando as telas de
      replay existirem no app.

### 4. Distribuição nas lojas

- [ ] **Contas**: Apple Developer Program (US$ 99/ano, **pessoa física ou empresa
      — decidir**), Google Play Console (US$ 25, pagamento único). A conta Apple é
      o item de maior lead time do projeto (verificação de dias a semanas):
      disparar já, em paralelo com o scaffold. Google Play pode esperar.
- [ ] **Política de privacidade com URL pública** em `weracha.app`. A substância
      LGPD já existe
      ([`15-exclusao-de-conta.md`](../../weracha-site/docs/especificacao/15-exclusao-de-conta.md),
      [`12-termos-e-privacidade.md`](../../weracha-site/docs/especificacao/12-termos-e-privacidade.md));
      falta o documento público hospedado e o link nas duas lojas.
- [ ] **Privacy nutrition labels** (Apple) / **Data safety form** (Google):
      declarar o que o app coleta (telefone, nome, foto, vídeo; localização não).
      A Apple audita.
- [ ] **Review da Apple** é mais rígido e demora (semanas na 1ª submissão).
      Motivos comuns de rejeição pra revisar antes: login que exige telefone sem
      alternativa; conteúdo gerado por usuário (resenha/replays) sem ferramenta
      de denúncia e bloqueio visível; "Sign in with Apple" obrigatório se houver
      login social (não há, então ok).
- [ ] **Exclusão de conta acessível de dentro do app** — a Apple exige desde
      2022. O fluxo já existe (`/api/v1/conta/exclusao`), só garantir que está
      navegável no app.

### 5. Escopo do v1 e gate de versão mínima

- [ ] **O que entra na primeira versão.** A API cobre tudo (perfil, grupos,
      check-in, ao vivo, resultado, resenha, replays, enquetes, convites,
      exclusão de conta) incluindo as escritas de admin/dono **de grupo** — só as
      telas `/admin/*` do site (esportes, quadras, usuários, ouvidoria) ficaram
      fora de propósito. Decidir se o v1 do app é completo ou um subconjunto
      (ex.: só leitura + check-in, gestão de grupo fica pro site por enquanto).
- [ ] **Gate de versão mínima**: endpoint tipo `GET /api/v1/app/versao-minima`
      (ou header na resposta) que o app checa no boot; abaixo do mínimo, tela
      bloqueante "atualize pra continuar". Necessário porque não dá pra forçar
      todo mundo a atualizar e o contrato vai evoluir. Definir a política
      (quantas versões pra trás são suportadas).

### 6. Observabilidade do app

- [ ] **Crash reporting** (Sentry ou equivalente no RN) — decidir antes de
      shippar, senão bug silencioso em device de terceiro é invisível.
- [ ] **Analytics de uso** — decidir se entra e qual (o site já usa analytics da
      Cloudflare; app é outro contexto). Cuidado com o que declarar nas lojas
      (seção 4).

### 7. Anti-abuso de SMS: camadas 2 e 3

A camada 1 (teto por telefone) + kill-switch manual já estão em produção e são
suficientes pra escala de pelada. O resto só entra se aparecer abuso real.

- [ ] **Camada 2 — teto por IP.** Recusar se um IP pediu códigos demais/hora ou
      tocou muitos telefones distintos/dia (pega a enumeração que a camada 1 não
      vê). **Provavelmente NÃO com tabela no Postgres**: usar Upstash Redis
      (`@upstash/ratelimit`) ou regra de Vercel Firewall/WAF. Cloudflare Rate
      Limiting seria o ideal mas exige o tráfego passar pelo proxy da Cloudflare
      (só quando a separação de deploy acontecer, seção 8).
- [ ] **Camada 3 — disjuntor global automático.** A metade manual está feita.
      Falta a automática (sem e-mail): tabela `sms_enviados` append-only, um card
      no `/admin` "X SMS na última hora / Y hoje", e acima de
      `LIMITE_GLOBAL_SMS_HORA` (≈30) ligar `sms_habilitado = false` sozinho +
      botão "Retomar". Vem depois da camada 1 rodar um tempo em produção.
- [ ] **App attestation** (Play Integrity no Android + App Attest no iOS) —
      **decidido em 2026-09-06: não agora.** Fica anotado como a opção forte se
      aparecer abuso real depois do app no ar (precisa de verificação
      server-side do token de atestação). Secret no build descartado (fraco,
      extraível do APK/IPA).
- [ ] Buraco: `iniciarVerificacaoTelefone` cria a linha de `jogadores` antes de
      enviar o SMS — enumerar números enche o banco de lixo. Exige mover o código
      pendente pra fora da tabela `jogadores`, ou uma varredura no cron que apaga
      linha sem `senhaHash`/`telefoneValidadoEm`/vínculo mais velha que X dias.
- [ ] Buraco: `iniciarRecuperacaoSenha` responde `TELEFONE_NAO_CADASTRADO` —
      oráculo de enumeração. Responder genérico ("se existir conta, mandamos o
      código") custa a mensagem clara que o app quer mostrar. Decisão de UX no
      meio.
- Turnstile no fluxo web continua; o app usa o caminho novo. Não remover.

### 8. Infra quando o app estiver perto de shippar

- [ ] **Migração do Cam** de `/api/cam/*` pra `/api/v1/cam/*` e do
      `POST /api/auth/token` pra `/api/v1/auth/token`, com janela de dupla
      listagem (rota antiga reexporta o handler por N meses, header
      `Deprecation`/`Sunset`). Registrar a nota em
      [`13-we-racha-cam-api.md`](../../weracha-site/docs/especificacao/13-we-racha-cam-api.md)
      quando entrar em planejamento (arquivo vive nos dois repos).
- [ ] **Separar o deploy de front e back.** A API já está extraída (`lib/services/*`
      + route handlers `Request`/`Response` padrão, portável). Discutido em
      2026-09-04: domínio e deploy do site continuam na Vercel (Next.js),
      analytics e R2 já na Cloudflare. Ideia é migrar só a API (não o front) pra
      **Cloudflare Workers** quando essa separação acontecer de verdade, não
      antes. Sem decisão fechada.
- [ ] **CORS** — gatilho é a separação de deploy acima; hoje site e API são o
      mesmo domínio Vercel, então não existe cross-origin de verdade ainda.

### 9. Compartilhar contrato site ↔ app

- **Nível 1 (atual): copiar com disciplina.** `weracha-jogador/src/contrato/` tem a
  cópia literal do enum de `weracha-site/lib/api/codigosErro.ts`, dos tipos de
  request/response e de 2-3 helpers puros (telefone), com README apontando pra
  origem e um teste que fixa os valores do enum (quebra no desalinho). **NÃO**
  copiar componente React, código de servidor, Zod, Drizzle.
- [ ] **Nível 2**: pacote privado `@weracha/contrato` (GitHub Packages), só
      contrato/códigos de erro/validadores puros, zero React. **Gatilho**:
      primeiro bug de drift em produção, ou terceira vez editando o mesmo trecho
      copiado.
- [ ] **Nível 3**: gerar client do OpenAPI (seção 10). Só se a API crescer muito.
- `git submodule`/`subtree` e monorepo descartados (o segundo contraria a
  estrutura do workspace).

### 10. Formalizar o contrato como OpenAPI

- [ ] [`16-api-v1.md`](../../weracha-site/docs/especificacao/16-api-v1.md) é prosa
      hoje. Uma spec OpenAPI de verdade (a) valida que o contrato está completo e
      consistente antes de o app depender dele, (b) vira a fonte pro client do
      app se for pro Nível 3, (c) pega inconsistência de status/shape que a prosa
      esconde.

---

## Decisões já fechadas (não reabrir sem motivo)

- **Tecnologia: React Native + Expo** (2026-09-05). iOS sem Mac deixou de ser
  diferencial (EAS Build compila iOS na nuvem); continuidade de React com o site;
  projeto solo. Kotlin Multiplatform e Flutter descartados.
- **Dois apps separados** (2026-09-04): We Racha Cam (grava, celular fixo no
  tripé, foreground service `microphone`) e app de jogador (todo mundo instala).
  Público e ciclo de vida diferentes demais pra juntar.
- **Token do app**: 10 dias deslizantes, re-login silencioso em 401. **Token do
  Cam**: sem expiração (celular fixo não pode deslogar numa pelada).
- **App attestation**: não agora (ver seção 7).
- **Camada 2 de anti-abuso**: adiada, e não com tabela no Postgres (ver seção 7).

## Relação com outros documentos

- [`00-estado-do-app.md`](00-estado-do-app.md)
  — o que o app já entrega, tela por tela, e a preparação pré-app no site.
- [`11-roteiro-de-publicacao.md`](11-roteiro-de-publicacao.md)
  — este backlog em **ordem de execução** até a Play Store (inclui o mini onboarding e o Cam).
- [`../../weracha-site/docs/especificacao/16-api-v1.md`](../../weracha-site/docs/especificacao/16-api-v1.md)
  — contrato de tudo que já está no ar; qualquer rota nova das seções acima entra
  lá quando sair do papel.
- [`../../weracha-site/docs/pendente/09-debitos-tecnicos-api.md`](../../weracha-site/docs/pendente/09-debitos-tecnicos-api.md)
  — débito de arquitetura da API que não depende do app.
- [`../../weracha-site/docs/especificacao/13-we-racha-cam-api.md`](../../weracha-site/docs/especificacao/13-we-racha-cam-api.md)
  — molde técnico do Cam; recebe a nota de migração pra `/api/v1/cam/*` (seção 8).
- [`../CLAUDE.md`](../CLAUDE.md) — regras do repo do app.
