import { createFileRoute } from "@tanstack/react-router";

import { Guide1xBetPage } from "@/components/fastcash/pages.jsx";
import { useFastCash } from "@/lib/fastcash/FastCashContext";

export const Route = createFileRoute("/1xbet")({
  head: () => ({
    meta: [
      { title: "1xBet Registration Guide — Fast Cash" },
      {
        name: "description",
        content:
          "Step-by-step guide to registering a 1xBet account and finding your Player ID for deposits and withdrawals.",
      },
      { property: "og:title", content: "1xBet Registration Guide — Fast Cash" },
      {
        property: "og:description",
        content:
          "Step-by-step guide to registering a 1xBet account and finding your Player ID for deposits and withdrawals.",
      },
    ],
  }),
  component: Page,
});

function Page() {
  const { move, t } = useFastCash();
  return <Guide1xBetPage move={move} t={t} />;
}
