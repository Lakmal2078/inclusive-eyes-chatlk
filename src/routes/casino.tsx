import { createFileRoute } from "@tanstack/react-router";

import { GuideCasinoPage } from "@/components/fastcash/pages.jsx";
import { useFastCash } from "@/lib/fastcash/FastCashContext";

export const Route = createFileRoute("/casino")({
  head: () => ({
    meta: [
      { title: "Casino Guide — Fast Cash" },
      {
        name: "description",
        content: "How to play 1xBet casino games and fund your account through Fast Cash agents.",
      },
      { property: "og:title", content: "Casino Guide — Fast Cash" },
      {
        property: "og:description",
        content: "How to play 1xBet casino games and fund your account through Fast Cash agents.",
      },
    ],
  }),
  component: Page,
});

function Page() {
  const { move, t } = useFastCash();
  return <GuideCasinoPage move={move} t={t} />;
}
