import { createFileRoute } from "@tanstack/react-router";

import { Home } from "@/components/fastcash/pages.jsx";
import { useFastCash } from "@/lib/fastcash/FastCashContext";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Fast Cash — 1xBet Deposit & Withdrawal Support in Sri Lanka" },
      {
        name: "description",
        content:
          "Fast, simple deposit and withdrawal assistance for 1xBet players in Sri Lanka. Agent bank accounts, receipt upload and WhatsApp support.",
      },
      {
        property: "og:title",
        content: "Fast Cash — 1xBet Deposit & Withdrawal Support in Sri Lanka",
      },
      {
        property: "og:description",
        content:
          "Fast, simple deposit and withdrawal assistance for 1xBet players in Sri Lanka. Agent bank accounts, receipt upload and WhatsApp support.",
      },
    ],
  }),
  component: Page,
});

function Page() {
  const { move, notify, t } = useFastCash();
  return <Home move={move} notify={notify} t={t} />;
}
