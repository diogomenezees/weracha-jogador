import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import { ModalAviso, ModalConfirmar } from "@/grupo/modais";
import type { LucideIcon } from "@/ui/Icone";

// Substitui o `Alert.alert` nativo (caixa branca do Android, que destoa do resto
// do app e corta em 3 botões) por modais no padrão do app: escuros, com blur,
// os mesmos `ModalAviso`/`ModalConfirmar` das outras telas. Uso imperativo, como
// o Alert, pra não precisar de estado de "aberto" em cada tela:
//
//   const { avisar, confirmar } = useDialogos();
//   avisar("Não deu pra atualizar", mensagemDoErro(e));
//   confirmar({ eyebrow: "Convite", titulo: "Gerar link novo?", descricao: "...", onConfirmar });
//
// Um aviso e uma confirmação por vez (o provider guarda só o último). Fica no
// topo da árvore (src/app/_layout.tsx), dentro do BlurTargetProvider.

type Confirmacao = {
  eyebrow: string;
  titulo: string;
  descricao: string;
  confirmarLabel?: string;
  destrutivo?: boolean;
  Icone?: LucideIcon;
  onConfirmar: () => void;
};

type Aviso = { titulo: string; texto: string };

type Contexto = {
  avisar: (titulo: string, texto: string) => void;
  confirmar: (c: Confirmacao) => void;
};

const DialogosContext = createContext<Contexto | null>(null);

export function DialogosProvider({ children }: { children: ReactNode }) {
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [conf, setConf] = useState<Confirmacao | null>(null);

  const avisar = useCallback((titulo: string, texto: string) => setAviso({ titulo, texto }), []);
  const confirmar = useCallback((c: Confirmacao) => setConf(c), []);
  const valor = useMemo(() => ({ avisar, confirmar }), [avisar, confirmar]);

  return (
    <DialogosContext.Provider value={valor}>
      {children}
      <ModalAviso
        aberto={aviso !== null}
        titulo={aviso?.titulo ?? ""}
        texto={aviso?.texto ?? ""}
        onFechar={() => setAviso(null)}
      />
      <ModalConfirmar
        aberto={conf !== null}
        Icone={conf?.Icone}
        eyebrow={conf?.eyebrow ?? ""}
        titulo={conf?.titulo ?? ""}
        descricao={conf?.descricao ?? ""}
        confirmarLabel={conf?.confirmarLabel}
        destrutivo={conf?.destrutivo}
        onConfirmar={() => {
          const c = conf;
          setConf(null);
          c?.onConfirmar();
        }}
        onFechar={() => setConf(null)}
      />
    </DialogosContext.Provider>
  );
}

export function useDialogos(): Contexto {
  const ctx = useContext(DialogosContext);
  if (!ctx) throw new Error("useDialogos precisa estar dentro de <DialogosProvider>.");
  return ctx;
}
