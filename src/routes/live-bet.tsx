import { createFileRoute } from "@tanstack/react-router";

import { GuideSportsPage } from "@/components/fastcash/pages.jsx";
import { useFastCash } from "@/lib/fastcash/FastCashContext";

export const Route = createFileRoute("/live-bet")({
  head: () => ({
    meta: [
      { title: "Live Betting Guide — Fast Cash" },
      {
        name: "description",
        content:
          "How live in-play betting works on 1xBet, and how to top up your balance quickly with Fast Cash.",
      },
      { property: "og:title", content: "Live Betting Guide — Fast Cash" },
      {
        property: "og:description",
        content:
          "How live in-play betting works on 1xBet, and how to top up your balance quickly with Fast Cash.",
      },
    ],
  }),
  component: Page,
});

function Page() {
  const { move, t } = useFastCash();
  return <GuideSportsPage move={move} t={t} />;
}
