import { createFileRoute } from "@tanstack/react-router";

import { Withdraw } from "@/components/fastcash/pages.jsx";
import { useFastCash } from "@/lib/fastcash/FastCashContext";

export const Route = createFileRoute("/withdraw")({
  head: () => ({
    meta: [
      { title: "Withdrawal Request — Fast Cash" },
      {
        name: "description",
        content:
          "Submit your 1xBet withdrawal security code with your bank details and an agent will process the payout after review.",
      },
      { property: "og:title", content: "Withdrawal Request — Fast Cash" },
      {
        property: "og:description",
        content:
          "Submit your 1xBet withdrawal security code with your bank details and an agent will process the payout after review.",
      },
    ],
  }),
  component: Page,
});

function Page() {
  const { submit, form, setForm, notify, lang, t } = useFastCash();
  return (
    <Withdraw submit={submit} form={form} setForm={setForm} notify={notify} lang={lang} t={t} />
  );
}
