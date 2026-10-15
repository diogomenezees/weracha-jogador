---
name: expo-go
description: Sobe o app de jogador (weracha-jogador) no Expo Go do celular Android — diagnostica rede/firewall/ancoragem, confere o adb (USB ou depuração sem fio), sobe o Metro com o hostname certo, faz adb reverse 8081/3000 e abre o Expo Go. Usar quando o usuário pedir pra rodar/abrir/testar o app no celular, "subir o expo go", quando o celular não autoriza o USB, ou quando o app no celular mostra código velho.
---

# Expo Go no celular

Tudo está em [expo-go-celular.ps1](expo-go-celular.ps1). Rodar pela ferramenta PowerShell
(timeout de ~4 min: ele espera até 90s o usuário autorizar o USB e até 90s o Metro subir):

```powershell
powershell -ExecutionPolicy Bypass -File "C:\Users\Diogo Oliveira\projetos\weracha-system\weracha-jogador\.claude\skills\expo-go\expo-go-celular.ps1"
```

| Flag | Quando |
|---|---|
| (nenhuma) | Caso normal: celular no cabo. |
| `-Limpar` | Celular mostra código velho (watcher do Metro perde edições), ou Metro em estado estranho. Mata e sobe com `--clear`. |
| `-SoAbrir` | Só refaz `adb reverse` e reabre o Expo Go (ex.: depois de replugar o cabo). |
| `-Parear IP:porta -Codigo 123456` | USB não pede autorização → parear a **Depuração sem fio**. |
| `-Conectar IP:porta` | Conectar na depuração sem fio já pareada (pode vir junto do `-Parear`). |
| `-Wifi` | Sem adb nenhum: Metro anuncia o IP da LAN. Só funciona se o firewall liberar o node em uso. |

## O que o script verifica (em ordem)

1. **Rede do PC** — IP do Wi-Fi/Ethernet e perfil; avisa se a **ancoragem USB** do celular
   estiver ativa (adaptador "Remote NDIS": o PC passa a usar a internet do celular e o
   caminho Wi-Fi perde a rota).
2. **Firewall** — se existe regra de entrada liberando o `node.exe` **em uso**
   (`Get-Command node`). Hoje só existe pra `D:\program files\nodejs`, e o em uso é
   `C:\Program Files\nodejs` → Wi-Fi bloqueado, só adb funciona.
3. **adb** — se `unauthorized`, reinicia o servidor do adb (re-dispara o aviso) e espera até
   90s; confere modelo e se o Expo Go (`host.exp.exponent`) está instalado. Fixa
   `ANDROID_SERIAL` no device autorizado.
4. **Site local** na 3000 (só aviso).
5. **Metro** — reaproveita o da 8081 se o `hostUri` do manifesto bate com o modo (USB →
   `127.0.0.1:8081`, Wi-Fi → `IP:8081`); senão reinicia. Sobe em **janela separada**
   (logs visíveis, `r` recarrega).
6. **adb reverse** 8081 e 3000, conferido com `adb reverse --list`.
7. **force-stop** do Expo Go + `am start exp://127.0.0.1:8081`.

## Celular não pede autorização do USB (fica "unauthorized")

Pedir pro usuário, nesta ordem:
1. Plugar com o celular **desbloqueado**; puxar a barra de notificações → "Carregando via
   USB" → **Transferência de arquivos**.
2. Opções do desenvolvedor → **Revogar autorizações de depuração USB**, desligar e ligar
   **Depuração USB**, replugar.
3. Outro cabo/porta (cabo só de carga não faz dados).

Se nada disso fizer o aviso aparecer, usar a **depuração sem fio** (Android 11+, celular e
PC no mesmo Wi-Fi). Não precisa do aviso nem de firewall (é o PC que conecta no celular), e o
`adb reverse` funciona igual ao cabo:
1. Opções do desenvolvedor → **Depuração sem fio** → ligar → **Parear dispositivo com código
   de pareamento**. O usuário passa o `IP:porta` **dessa janela** e o código de 6 dígitos.
2. Rodar com `-Parear IP:porta -Codigo 123456 -Conectar IP:porta2`, onde `IP:porta2` é o
   endereço da **tela principal** da Depuração sem fio (porta diferente da de pareamento).
3. Das próximas vezes basta `-Conectar IP:porta2` (a porta muda quando a depuração sem fio é
   religada).

## App abre mas está velho / quebrado

- Código velho → `-Limpar`. Pra confirmar antes: pegar a URL do `launchAsset` em
  `curl -H "expo-platform: android" -H "Accept: application/expo+json" http://127.0.0.1:8081/`,
  baixar o bundle e dar grep num identificador novo.
- "Não foi possível falar com o servidor" → checar se o site está no ar, se o reverse da 3000
  continua (`adb reverse --list`; some quando o cabo desconecta → `-SoAbrir`) e se a
  engrenagem do login está em "Local".

## Por que desse jeito (não "simplificar")

- **Nunca `--localhost`**: neste Windows o Metro escuta só em IPv6 (`::1`) e o `adb reverse`
  entrega em `127.0.0.1` → manifesto vazio. Por isso `--lan` + `REACT_NATIVE_PACKAGER_HOSTNAME`.
- **Nunca `CI=1`**: desliga o reload.
- **`--go`**: o projeto tem `expo-dev-client`; sem a flag o Metro assume dev build.
- **force-stop antes do `am start`**: senão o Expo Go ignora o link e fica na Home.
- `$ErrorActionPreference = 'Continue'` e `start-server` via `cmd /c`: no PS 5.1 o stderr do
  adb ("daemon not running…") vira exceção com `Stop`.
- Arquivo salvo em **UTF-8 com BOM**: sem BOM o PS 5.1 lê como ANSI e quebra os acentos.
- Não tirar screenshot pra conferir a tela — o usuário valida visualmente.
- Liberar o firewall de vez (precisa admin, o usuário roda):
  `New-NetFirewallRule -DisplayName "node dev (8081,3000)" -Direction Inbound -Protocol TCP -LocalPort 8081,3000 -RemoteAddress LocalSubnet -Action Allow`
