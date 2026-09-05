import { jsx, jsxs } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from "react";
function formatLastSeen(lastSeen) {
  if (!lastSeen) return "";
  const timestamp = typeof lastSeen === "string" ? new Date(lastSeen).getTime() : lastSeen;
  if (isNaN(timestamp) || timestamp <= 0) return "";
  const diffMs = Date.now() - timestamp;
  if (diffMs < 6e4) return "just now";
  const diffMins = Math.floor(diffMs / 6e4);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}
const UserPresenceStatus = ({
  userId,
  initialIsOnline = false,
  initialLastSeen = null,
  authToken,
  apiBase = "/api",
  showLabel = false,
  size = "md",
  position = "bottom-right",
  pollInterval = 0,
  className = "",
  dotClassName = "",
  children,
  onChange
}) => {
  const [isOnline, setIsOnline] = useState(initialIsOnline);
  const [lastSeen, setLastSeen] = useState(initialLastSeen);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  useEffect(() => {
    setIsOnline(initialIsOnline);
  }, [initialIsOnline]);
  useEffect(() => {
    setLastSeen(initialLastSeen);
  }, [initialLastSeen]);
  const fetchPresence = useCallback(async () => {
    if (!userId) return;
    try {
      setIsLoading(true);
      setError(null);
      const token = authToken || (typeof window !== "undefined" && window.localStorage ? window.localStorage.getItem("chatlk_token") : null);
      const headers = {
        Accept: "application/json"
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const response = await fetch(`${apiBase}/users/${encodeURIComponent(userId)}/presence`, {
        method: "GET",
        headers
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch presence (${response.status})`);
      }
      const data = await response.json();
      const online = Boolean(data.isOnline ?? data.is_online);
      const seen = data.lastSeen ?? data.last_seen ?? null;
      setIsOnline(online);
      setLastSeen(seen);
      if (onChange) {
        onChange({
          userId,
          isOnline: online,
          lastSeen: seen
        });
      }
    } catch (err) {
      setError(err?.message || "Unable to fetch presence");
    } finally {
      setIsLoading(false);
    }
  }, [userId, authToken, apiBase, onChange]);
  useEffect(() => {
    if (userId) {
      fetchPresence();
    }
    if (pollInterval > 0 && userId) {
      const intervalId = setInterval(fetchPresence, pollInterval);
      return () => clearInterval(intervalId);
    }
  }, [userId, fetchPresence, pollInterval]);
  const sizeMap = {
    sm: {
      dot: "w-2 h-2",
      badgeSize: "8px",
      ring: "ring-1 ring-white dark:ring-slate-900",
      text: "text-xs"
    },
    md: {
      dot: "w-2.5 h-2.5",
      badgeSize: "10px",
      ring: "ring-2 ring-white dark:ring-slate-900",
      text: "text-xs"
    },
    lg: {
      dot: "w-3.5 h-3.5",
      badgeSize: "14px",
      ring: "ring-2 ring-white dark:ring-slate-900",
      text: "text-sm"
    }
  }[size] || {
    dot: "w-2.5 h-2.5",
    badgeSize: "10px",
    ring: "ring-2 ring-white dark:ring-slate-900",
    text: "text-xs"
  };
  const positionClasses = {
    "top-right": "top-0 right-0 translate-x-1/4 -translate-y-1/4",
    "bottom-right": "bottom-0 right-0 translate-x-1/4 translate-y-1/4",
    "top-left": "top-0 left-0 -translate-x-1/4 -translate-y-1/4",
    "bottom-left": "bottom-0 left-0 -translate-x-1/4 translate-y-1/4",
    "inline": ""
  }[position];
  const statusLabel = isOnline ? "Online" : "Offline";
  const relativeSeen = formatLastSeen(lastSeen);
  const statusTitle = isOnline ? "Online" : relativeSeen ? `Offline \xB7 Last seen ${relativeSeen}` : "Offline";
  const dotColorClass = isOnline ? "bg-emerald-500 border-white" : "bg-slate-400 border-white";
  const dotInlineStyle = {
    backgroundColor: isOnline ? "#22c55e" : "#94a3b8",
    borderColor: "#ffffff",
    width: sizeMap.badgeSize,
    height: sizeMap.badgeSize,
    borderRadius: "9999px",
    flexShrink: 0
  };
  const dotElement = /* @__PURE__ */ jsx(
    "span",
    {
      id: `presence-dot-${userId || "user"}`,
      role: "status",
      "aria-label": statusLabel,
      title: statusTitle,
      "data-status": isOnline ? "online" : "offline",
      "data-user-id": userId || "",
      style: dotInlineStyle,
      className: `inline-block rounded-full transition-colors duration-200 ${dotColorClass} ${sizeMap.ring} ${dotClassName}`,
      children: /* @__PURE__ */ jsx("span", { className: "sr-only", children: statusLabel })
    }
  );
  if (children) {
    return /* @__PURE__ */ jsxs(
      "div",
      {
        id: `presence-wrapper-${userId || "user"}`,
        className: `relative inline-flex shrink-0 items-center justify-center ${className}`,
        children: [
          children,
          /* @__PURE__ */ jsx(
            "span",
            {
              className: `absolute z-10 flex items-center justify-center ${positionClasses}`,
              style: { pointerEvents: "none" },
              children: dotElement
            }
          )
        ]
      }
    );
  }
  return /* @__PURE__ */ jsxs(
    "div",
    {
      id: `presence-status-${userId || "user"}`,
      className: `inline-flex items-center gap-1.5 align-middle select-none ${className}`,
      title: statusTitle,
      children: [
        dotElement,
        showLabel && /* @__PURE__ */ jsx(
          "span",
          {
            id: `presence-label-${userId || "user"}`,
            className: `font-medium ${sizeMap.text} ${isOnline ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400"}`,
            children: isOnline ? "Online" : relativeSeen ? `Last seen ${relativeSeen}` : "Offline"
          }
        )
      ]
    }
  );
};
var UserPresenceStatus_default = UserPresenceStatus;
export {
  UserPresenceStatus,
  UserPresenceStatus_default as default
};
