import { createFileRoute } from "@tanstack/react-router";

import { Transactions } from "@/components/fastcash/pages.jsx";
import { useFastCash } from "@/lib/fastcash/FastCashContext";

export const Route = createFileRoute("/transactions")({
  head: () => ({
    meta: [
      { title: "My Requests — Fast Cash" },
      {
        name: "description",
        content:
          "Track the status of every deposit and withdrawal request you have submitted to Fast Cash.",
      },
      { property: "og:title", content: "My Requests — Fast Cash" },
      {
        property: "og:description",
        content:
          "Track the status of every deposit and withdrawal request you have submitted to Fast Cash.",
      },
    ],
  }),
  component: Page,
});

function Page() {
  const { user, transactions, move, lang, t } = useFastCash();
  return <Transactions user={user} transactions={transactions} move={move} lang={lang} t={t} />;
}
