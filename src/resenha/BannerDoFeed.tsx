import { useEffect, useState } from "react";

import { buscarCampanhasNoAr } from "@/api/parceiros";
import type { BannerDoFeed as Banner } from "@/contrato/bannersDoFeed";
import type { CampanhaNoAr } from "@/contrato/tipos";
import { BannerCampanha } from "@/resenha/BannerCampanha";
import { BannerExpiracao } from "@/resenha/BannerExpiracao";
import { BannerInstagram } from "@/resenha/BannerInstagram";
import { useSessao } from "@/sessao/contexto";

// Espelha weracha-site/components/banner-do-feed.tsx.
//
// Campanhas de parceiro no ar, buscadas uma vez por tela (a ordem vem
// embaralhada do servidor e fica fixa enquanto a tela está aberta). Falha vira
// lista vazia: banner de parceiro é extra, não pode derrubar o feed, e sem
// campanha os espaços ficam todos com o do Instagram.
export function useCampanhasNoAr(): CampanhaNoAr[] {
  const { chamarApi } = useSessao();
  const [campanhas, setCampanhas] = useState<CampanhaNoAr[]>([]);
  useEffect(() => {
    let vivo = true;
    buscarCampanhasNoAr(chamarApi)
      .then((lista) => {
        if (vivo) setCampanhas(lista);
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [chamarApi]);
  return campanhas;
}

// Desenha o banner escolhido por bannerDoFeedDepoisDe (src/contrato/bannersDoFeed.ts).
export function BannerDoFeed({ banner, campanhas }: { banner: Banner; campanhas: CampanhaNoAr[] }) {
  if (banner.tipo === "campanha") {
    const campanha = campanhas[banner.campanha];
    return campanha ? <BannerCampanha campanha={campanha} /> : null;
  }
  if (banner.tipo === "expiracao") return <BannerExpiracao />;
  return <BannerInstagram mensagem={banner.mensagem} />;
}
