import { createFileRoute } from "@tanstack/react-router";

import { Support } from "@/components/fastcash/pages.jsx";
import { useFastCash } from "@/lib/fastcash/FastCashContext";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "Support & FAQ — Fast Cash" },
      {
        name: "description",
        content:
          "Get answers about deposits, withdrawals, Player IDs and responsible gambling, or reach an agent on WhatsApp.",
      },
      { property: "og:title", content: "Support & FAQ — Fast Cash" },
      {
        property: "og:description",
        content:
          "Get answers about deposits, withdrawals, Player IDs and responsible gambling, or reach an agent on WhatsApp.",
      },
    ],
  }),
  component: Page,
});

function Page() {
  const { chat, chatText, setChatText, sendChat, config, notify, lang, t } = useFastCash();
  return (
    <Support
      chat={chat}
      chatText={chatText}
      setChatText={setChatText}
      sendChat={sendChat}
      config={config}
      notify={notify}
      lang={lang}
      t={t}
    />
  );
}
