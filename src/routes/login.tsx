import { createFileRoute } from "@tanstack/react-router";

import { Login } from "@/components/fastcash/pages.jsx";
import { useFastCash } from "@/lib/fastcash/FastCashContext";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign In — Fast Cash" },
      {
        name: "description",
        content: "Sign in to your Fast Cash account to track your deposit and withdrawal requests.",
      },
      { property: "og:title", content: "Sign In — Fast Cash" },
      {
        property: "og:description",
        content: "Sign in to your Fast Cash account to track your deposit and withdrawal requests.",
      },
    ],
  }),
  component: Page,
});

function Page() {
  const { login, logout, user, form, setForm, move, t } = useFastCash();
  return (
    <Login
      login={login}
      logout={logout}
      user={user}
      form={form}
      setForm={setForm}
      move={move}
      t={t}
    />
  );
}
