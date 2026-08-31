import { createFileRoute } from "@tanstack/react-router";

import { Register } from "@/components/fastcash/pages.jsx";
import { useFastCash } from "@/lib/fastcash/FastCashContext";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create Account — Fast Cash" },
      {
        name: "description",
        content:
          "Create a Fast Cash account to save your Player ID and follow every request you submit.",
      },
      { property: "og:title", content: "Create Account — Fast Cash" },
      {
        property: "og:description",
        content:
          "Create a Fast Cash account to save your Player ID and follow every request you submit.",
      },
    ],
  }),
  component: Page,
});

function Page() {
  const { form, setForm, notify, setUser, move, t } = useFastCash();
  return (
    <Register form={form} setForm={setForm} notify={notify} setUser={setUser} move={move} t={t} />
  );
}
