import { createFileRoute } from "@tanstack/react-router";

import { PromotionsPage } from "@/components/fastcash/pages.jsx";
import { useFastCash } from "@/lib/fastcash/FastCashContext";

export const Route = createFileRoute("/promotions")({
  head: () => ({
    meta: [
      { title: "Promotions & Bonus Code — Fast Cash" },
      {
        name: "description",
        content:
          "Current 1xBet promo code and bonus information for players registering through Fast Cash.",
      },
      { property: "og:title", content: "Promotions & Bonus Code — Fast Cash" },
      {
        property: "og:description",
        content:
          "Current 1xBet promo code and bonus information for players registering through Fast Cash.",
      },
    ],
  }),
  component: Page,
});

function Page() {
  const { move, notify, t } = useFastCash();
  return <PromotionsPage move={move} notify={notify} t={t} />;
}
