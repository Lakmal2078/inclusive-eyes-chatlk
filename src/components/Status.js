import { jsx, jsxs } from "react/jsx-runtime";
const Status = ({ items = [], onCreate, onOpen, className = "" }) => /* @__PURE__ */ jsxs("section", { className: `status-screen ${className}`, "aria-label": "Status updates", children: [
  /* @__PURE__ */ jsxs("header", { className: "status-screen-header", children: [
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("span", { className: "eyebrow-label", children: "Updates" }),
      /* @__PURE__ */ jsx("h2", { children: "Status" })
    ] }),
    onCreate && /* @__PURE__ */ jsx("button", { type: "button", className: "status-create", onClick: onCreate, "aria-label": "Add status", children: "\uFF0B" })
  ] }),
  /* @__PURE__ */ jsxs("button", { type: "button", className: "my-status-row", onClick: onCreate, children: [
    /* @__PURE__ */ jsx("span", { className: "status-avatar status-avatar-own", children: "\uFF0B" }),
    /* @__PURE__ */ jsxs("span", { children: [
      /* @__PURE__ */ jsx("strong", { children: "My status" }),
      /* @__PURE__ */ jsx("small", { children: "Add a text, photo, or video update" })
    ] })
  ] }),
  /* @__PURE__ */ jsxs("div", { className: "status-list", role: "list", children: [
    items.length === 0 && /* @__PURE__ */ jsx("p", { className: "empty", children: "No recent status updates." }),
    items.map((status) => /* @__PURE__ */ jsxs("button", { type: "button", className: `status-row ${status.viewed ? "viewed" : ""}`, onClick: () => onOpen?.(status), role: "listitem", children: [
      /* @__PURE__ */ jsx("span", { className: "status-avatar", children: status.avatarUrl ? /* @__PURE__ */ jsx("img", { src: status.avatarUrl, alt: "" }) : status.name.charAt(0).toUpperCase() }),
      /* @__PURE__ */ jsxs("span", { children: [
        /* @__PURE__ */ jsx("strong", { children: status.name }),
        /* @__PURE__ */ jsxs("small", { children: [
          status.time,
          status.preview ? ` \xB7 ${status.preview}` : ""
        ] })
      ] })
    ] }, status.id))
  ] })
] });
var Status_default = Status;
export {
  Status,
  Status_default as default
};
