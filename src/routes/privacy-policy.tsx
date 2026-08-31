import { createFileRoute } from "@tanstack/react-router";

import { PrivacyPolicyPage } from "@/components/fastcash/pages.jsx";
import { useFastCash } from "@/lib/fastcash/FastCashContext";

export const Route = createFileRoute("/privacy-policy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Fast Cash" },
      {
        name: "description",
        content:
          "How Fast Cash collects, uses and protects the information you share when requesting deposits and withdrawals.",
      },
      { property: "og:title", content: "Privacy Policy — Fast Cash" },
      {
        property: "og:description",
        content:
          "How Fast Cash collects, uses and protects the information you share when requesting deposits and withdrawals.",
      },
    ],
  }),
  component: Page,
});

function Page() {
  const { t } = useFastCash();
  return <PrivacyPolicyPage t={t} />;
}
