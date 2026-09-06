import { jsx, jsxs } from "react/jsx-runtime";
const Calls = ({ items = [], onStartCall, onCallAgain, className = "" }) => /* @__PURE__ */ jsxs("section", { className: `calls-screen ${className}`, "aria-label": "Calls", children: [
  /* @__PURE__ */ jsxs("header", { className: "status-screen-header", children: [
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("span", { className: "eyebrow-label", children: "Stay connected" }),
      /* @__PURE__ */ jsx("h2", { children: "Calls" })
    ] }),
    onStartCall && /* @__PURE__ */ jsx("button", { type: "button", className: "status-create", onClick: () => onStartCall(false), "aria-label": "Start a call", children: "\u260E" })
  ] }),
  /* @__PURE__ */ jsxs("div", { className: "call-start-options", children: [
    /* @__PURE__ */ jsxs("button", { type: "button", onClick: () => onStartCall?.(false), children: [
      /* @__PURE__ */ jsx("span", { children: "\u260E" }),
      /* @__PURE__ */ jsx("strong", { children: "Voice call" }),
      /* @__PURE__ */ jsx("small", { children: "Audio calls are ready when you are" })
    ] }),
    /* @__PURE__ */ jsxs("button", { type: "button", onClick: () => onStartCall?.(true), children: [
      /* @__PURE__ */ jsx("span", { children: "\u25A3" }),
      /* @__PURE__ */ jsx("strong", { children: "Video call" }),
      /* @__PURE__ */ jsx("small", { children: "Start a face-to-face conversation" })
    ] })
  ] }),
  /* @__PURE__ */ jsxs("div", { className: "call-history", role: "list", children: [
    items.length === 0 && /* @__PURE__ */ jsx("p", { className: "empty", children: "Your recent calls will appear here." }),
    items.map((call) => /* @__PURE__ */ jsxs("button", { type: "button", className: "call-row", onClick: () => onCallAgain?.(call), role: "listitem", children: [
      /* @__PURE__ */ jsx("span", { className: "status-avatar", children: call.avatarUrl ? /* @__PURE__ */ jsx("img", { src: call.avatarUrl, alt: "" }) : call.name.charAt(0).toUpperCase() }),
      /* @__PURE__ */ jsxs("span", { children: [
        /* @__PURE__ */ jsx("strong", { children: call.name }),
        /* @__PURE__ */ jsxs("small", { children: [
          call.direction === "incoming" ? "\u2199 Incoming" : "\u2197 Outgoing",
          " \xB7 ",
          call.time
        ] })
      ] }),
      /* @__PURE__ */ jsx("span", { className: "call-kind", "aria-label": call.video ? "Video call" : "Voice call", children: call.video ? "\u25A3" : "\u260E" })
    ] }, call.id))
  ] })
] });
var Calls_default = Calls;
export {
  Calls,
  Calls_default as default
};
