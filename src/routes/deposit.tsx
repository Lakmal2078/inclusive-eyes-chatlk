import { createFileRoute } from "@tanstack/react-router";

import { Deposit } from "@/components/fastcash/pages.jsx";
import { useFastCash } from "@/lib/fastcash/FastCashContext";

export const Route = createFileRoute("/deposit")({
  head: () => ({
    meta: [
      { title: "Deposit Request — Fast Cash" },
      {
        name: "description",
        content:
          "Send your deposit to an agent bank or iPay account, then submit your Player ID, amount and receipt for review.",
      },
      { property: "og:title", content: "Deposit Request — Fast Cash" },
      {
        property: "og:description",
        content:
          "Send your deposit to an agent bank or iPay account, then submit your Player ID, amount and receipt for review.",
      },
    ],
  }),
  component: Page,
});

function Page() {
  const { submit, form, setForm, config, notify, lang, t } = useFastCash();
  return (
    <Deposit
      submit={submit}
      form={form}
      setForm={setForm}
      config={config}
      notify={notify}
      lang={lang}
      t={t}
    />
  );
}
