import { createFileRoute } from "@tanstack/react-router";

import SportsTips from "@/components/fastcash/SportsTips.jsx";
import { useFastCash } from "@/lib/fastcash/FastCashContext";

export const Route = createFileRoute("/sports")({
  head: () => ({
    meta: [
      { title: "Sports Betting Guide — Fast Cash" },
      {
        name: "description",
        content:
          "How sports betting works on 1xBet, and how to fund your account through Fast Cash.",
      },
      { property: "og:title", content: "Sports Betting Guide — Fast Cash" },
      {
        property: "og:description",
        content:
          "How sports betting works on 1xBet, and how to fund your account through Fast Cash.",
      },
    ],
  }),
  component: Page,
});

function Page() {
  const { lang } = useFastCash();
  return <SportsTips lang={lang} />;
}
