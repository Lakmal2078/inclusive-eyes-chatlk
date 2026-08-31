import { createFileRoute } from "@tanstack/react-router";

import AdminPanel from "@/components/fastcash/AdminPanel.jsx";
import { api } from "@/lib/fastcash/api";
import { useFastCash } from "@/lib/fastcash/FastCashContext";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Portal — Fast Cash" },
      {
        name: "description",
        content:
          "Fast Cash administrator dashboard for agent bank accounts, request processing and system settings.",
      },
      { property: "og:title", content: "Admin Portal — Fast Cash" },
      {
        property: "og:description",
        content:
          "Fast Cash administrator dashboard for agent bank accounts, request processing and system settings.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminRoute,
});

function AdminRoute() {
  const { user, setUser, notify, lang, t, move } = useFastCash();
  return (
    <AdminPanel
      user={user}
      setUser={setUser}
      api={api}
      notify={notify}
      lang={lang}
      t={t}
      move={move}
    />
  );
}
