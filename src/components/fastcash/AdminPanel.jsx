import React, { useState, useEffect, useCallback } from "react";

export default function AdminPanel({ user, setUser, api, notify, lang = "en", t, move }) {
  const [activeTab, setActiveTab] = useState("bankDetails"); // 'overview' | 'bankDetails' | 'transactions' | 'settings'
  const [loading, setLoading] = useState(false);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [systemSettings, setSystemSettings] = useState({
    whatsappNumber: "+94765865387",
    minTransaction: 1000,
    maxTransaction: 500000,
    promoCode: "VGSL",
  });
  const [stats, setStats] = useState(null);
  const [allTransactions, setAllTransactions] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [sportsRuns, setSportsRuns] = useState([]);
  const [sportsTips, setSportsTips] = useState([]);

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  // Editing / adding account state
  const [editingAccount, setEditingAccount] = useState(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [accountForm, setAccountForm] = useState({
    id: "",
    name: "",
    number: "",
    icon: "🏦",
    type: "BANK",
    active: true,
  });

  // Filter state for transactions
  const [txSearch, setTxSearch] = useState("");
  const [txFilterStatus, setTxFilterStatus] = useState("ALL");
  const [txFilterType, setTxFilterType] = useState("ALL");
  const [selectedSlipImage, setSelectedSlipImage] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const adminT = t?.admin || {};

  // Fetch overview & bank details when logged in as ADMIN
  const loadAdminData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api("/api/admin/overview");
      setStats(data.stats || null);
      setAllTransactions(data.transactions || []);
      setBankAccounts(data.agentBankDetails || []);
      if (data.systemSettings) {
        setSystemSettings(data.systemSettings);
      }
      if (data.users) {
        setUsersList(data.users);
      }
      try {
        const sports = await api("/api/admin/sports-tips");
        setSportsRuns(sports.runs || []);
        setSportsTips(sports.tips || []);
      } catch (sportsError) {
        console.warn("[Sports Tips Admin Load Error]:", sportsError);
      }
    } catch (err) {
      console.error("[Admin Data Load Error]:", err);
      // Try fallback to bank-details endpoint
      try {
        const bd = await api("/api/admin/bank-details");
        setBankAccounts(bd.agentBankDetails || []);
        if (bd.systemSettings) setSystemSettings(bd.systemSettings);
      } catch (innerErr) {
        console.warn("[Bank details fallback error]:", innerErr);
      }
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    if (user?.role === "ADMIN") {
      loadAdminData();
    }
  }, [user, loadAdminData]);

  // Handle Admin Login
  const handleAdminLogin = async (e) => {
    if (e) e.preventDefault();
    setLoginError("");
    setLoading(true);
    try {
      const res = await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: loginEmail.trim(), password: loginPassword }),
      });
      if (res.user?.role !== "ADMIN") {
        throw new Error(
          adminT.unauthorizedMsg || "This account does not have Administrator privileges.",
        );
      }
      setUser(res.user);
      notify(t?.messages?.welcomeBack || "Welcome back, Administrator!");
    } catch (err) {
      setLoginError(err.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogout = async () => {
    try {
      await api("/api/auth/logout", { method: "POST" });
    } catch (err) {
      console.warn("Logout error:", err);
    }
    setUser(null);
    notify(adminT.logoutBtn || "Signed out of admin portal");
  };

  // Open modal/form to add a new account
  const startAddNewAccount = () => {
    setAccountForm({
      id: `acc_${Date.now()}`,
      name: "",
      number: "",
      icon: "🏦",
      type: "BANK",
      active: true,
    });
    setIsAddingNew(true);
    setEditingAccount(null);
  };

  // Open modal/form to edit an account
  const startEditAccount = (acc) => {
    setAccountForm({ ...acc });
    setEditingAccount(acc.id);
    setIsAddingNew(false);
  };

  const cancelAccountEdit = () => {
    setEditingAccount(null);
    setIsAddingNew(false);
    setAccountForm({ id: "", name: "", number: "", icon: "🏦", type: "BANK", active: true });
  };

  // Save single account form (either add or edit)
  const handleSaveAccountForm = async (e) => {
    e.preventDefault();
    if (!accountForm.name.trim() || !accountForm.number.trim()) {
      notify("Please enter both Account Name and Number.");
      return;
    }

    let updatedList = [...bankAccounts];
    if (isAddingNew) {
      const newAcc = {
        ...accountForm,
        id: accountForm.id || `acc_${Date.now()}`,
      };
      updatedList.push(newAcc);
    } else {
      updatedList = updatedList.map((a) => (a.id === accountForm.id ? { ...accountForm } : a));
    }

    setLoading(true);
    try {
      const res = await api("/api/admin/bank-details", {
        method: "PUT",
        body: JSON.stringify({
          agentBankDetails: updatedList,
          systemSettings,
        }),
      });
      setBankAccounts(res.agentBankDetails || updatedList);
      notify(adminT.savedSuccess || "Bank account saved successfully!");
      cancelAccountEdit();
    } catch (err) {
      notify(err.message || "Failed to save bank account.");
    } finally {
      setLoading(false);
    }
  };

  // Delete an account
  const handleDeleteAccount = async (idToDelete) => {
    if (bankAccounts.length <= 1) {
      notify("Cannot delete the last remaining payment account.");
      return;
    }
    const confirmed = window.confirm(
      adminT.deleteConfirm || "Are you sure you want to delete this bank account?",
    );
    if (!confirmed) return;

    setLoading(true);
    try {
      const res = await api(`/api/admin/bank-details/${idToDelete}`, { method: "DELETE" });
      setBankAccounts(res.agentBankDetails || bankAccounts.filter((a) => a.id !== idToDelete));
      notify("Bank account removed successfully.");
    } catch (err) {
      notify(err.message || "Failed to delete account.");
    } finally {
      setLoading(false);
    }
  };

  // Toggle account active/inactive
  const handleToggleActive = async (acc) => {
    const updatedList = bankAccounts.map((a) =>
      a.id === acc.id ? { ...a, active: !a.active } : a,
    );
    setBankAccounts(updatedList);
    try {
      await api("/api/admin/bank-details", {
        method: "PUT",
        body: JSON.stringify({
          agentBankDetails: updatedList,
          systemSettings,
        }),
      });
      notify(`${acc.name} is now ${!acc.active ? "Active" : "Hidden"}.`);
    } catch (err) {
      notify(err.message || "Failed to update status.");
    }
  };

  // Save system settings
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api("/api/admin/bank-details", {
        method: "PUT",
        body: JSON.stringify({
          agentBankDetails: bankAccounts,
          systemSettings: {
            whatsappNumber: systemSettings.whatsappNumber,
            minTransaction: Number(systemSettings.minTransaction),
            maxTransaction: Number(systemSettings.maxTransaction),
            promoCode: systemSettings.promoCode,
          },
        }),
      });
      if (res.systemSettings) setSystemSettings(res.systemSettings);
      notify(adminT.settingsSavedSuccess || "System settings saved successfully!");
    } catch (err) {
      notify(err.message || "Failed to save settings.");
    } finally {
      setLoading(false);
    }
  };

  // Update transaction status
  const handleUpdateTxStatus = async (txId, newStatus) => {
    let reason = "";
    if (newStatus === "REJECTED") {
      reason =
        window.prompt(
          "Enter the rejection reason shown to the player:",
          rejectionReason || "Payment could not be verified.",
        ) || "";
      if (!reason.trim()) return;
      setRejectionReason(reason);
    }
    setLoading(true);
    try {
      const res = await api(`/api/admin/transactions/${txId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus, rejectionReason: reason.trim() || undefined }),
      });
      setAllTransactions((prev) => prev.map((t) => (t.id === txId ? res.transaction : t)));
      notify(`Transaction ${txId} marked as ${newStatus}.`);
    } catch (err) {
      notify(err.message || "Failed to update transaction status.");
    } finally {
      setLoading(false);
    }
  };

  // Filtered transactions list
  const filteredTransactions = allTransactions.filter((tx) => {
    if (txFilterStatus !== "ALL" && tx.status !== txFilterStatus) return false;
    if (txFilterType !== "ALL" && tx.type !== txFilterType) return false;
    if (txSearch.trim()) {
      const q = txSearch.toLowerCase();
      const matchId = (tx.id || "").toLowerCase().includes(q);
      const matchPlayer = (tx.playerId || "").toLowerCase().includes(q);
      const matchName = (tx.name || "").toLowerCase().includes(q);
      const matchRef = (tx.refNumber || tx.journalNumber || tx.reference || "")
        .toLowerCase()
        .includes(q);
      const matchBank = (tx.bank || tx.paymentMethod || "").toLowerCase().includes(q);
      return matchId || matchPlayer || matchName || matchRef || matchBank;
    }
    return true;
  });

  // If user is not logged in as ADMIN, show Admin Login View
  if (!user || user.role !== "ADMIN") {
    return (
      <section
        className="panel"
        style={{ maxWidth: "520px", margin: "40px auto", padding: "32px" }}
      >
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "rgba(182, 255, 53, 0.12)",
              color: "var(--green)",
              padding: "6px 14px",
              borderRadius: "20px",
              fontSize: "12px",
              fontWeight: "800",
              letterSpacing: "0.5px",
              marginBottom: "14px",
            }}
          >
            {adminT.portalBadge || "⚙️ FAST CASH ADMIN PORTAL"}
          </div>
          <h1 style={{ fontSize: "26px", margin: "0 0 8px" }}>
            {adminT.loginTitle || "Admin Sign In"}
          </h1>
          <p style={{ color: "var(--muted)", fontSize: "14px", margin: 0 }}>
            {adminT.loginSubtitle ||
              "Enter administrator credentials to manage bank accounts, update settings, and process player requests."}
          </p>
        </div>

        {loginError && (
          <div
            style={{
              background: "rgba(255, 77, 77, 0.15)",
              border: "1px solid #ff4d4d",
              color: "#ff6b6b",
              padding: "12px 14px",
              borderRadius: "10px",
              fontSize: "13px",
              marginBottom: "18px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            ⚠️ {loginError}
          </div>
        )}

        <form onSubmit={handleAdminLogin} style={{ display: "grid", gap: "16px" }}>
          <label style={{ display: "grid", gap: "6px", fontSize: "13px", fontWeight: "600" }}>
            {adminT.emailLabel || "Admin Email"}
            <input
              type="email"
              required
              placeholder="admin@fastcash.lk"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              style={{
                padding: "12px 14px",
                borderRadius: "10px",
                background: "var(--bg)",
                border: "1px solid var(--line)",
                color: "var(--ink)",
              }}
            />
          </label>

          <label style={{ display: "grid", gap: "6px", fontSize: "13px", fontWeight: "600" }}>
            {adminT.passwordLabel || "Admin Password"}
            <input
              type="password"
              required
              placeholder="••••••••••••"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              style={{
                padding: "12px 14px",
                borderRadius: "10px",
                background: "var(--bg)",
                border: "1px solid var(--line)",
                color: "var(--ink)",
              }}
            />
          </label>

          <button
            type="submit"
            className="green"
            disabled={loading}
            style={{
              padding: "14px",
              borderRadius: "10px",
              fontSize: "15px",
              fontWeight: "800",
              marginTop: "6px",
            }}
          >
            {loading ? "Signing in..." : adminT.loginBtn || "Sign In to Admin Portal"}
          </button>
        </form>

        <div
          style={{
            marginTop: "24px",
            paddingTop: "20px",
            borderTop: "1px solid var(--line)",
            textAlign: "center",
          }}
        >
          <button
            type="button"
            onClick={() => move("Home")}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--muted)",
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            {adminT.backToApp || "← Return to Fast Cash App"}
          </button>
        </div>
      </section>
    );
  }

  // --- LOGGED IN ADMIN DASHBOARD ---
  return (
    <div className="admin-shell">
      {/* Top Admin Bar */}
      <div className="admin-topbar">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <span
              style={{
                background: "rgba(182, 255, 53, 0.15)",
                color: "var(--green)",
                padding: "3px 10px",
                borderRadius: "8px",
                fontSize: "11px",
                fontWeight: "800",
                textTransform: "uppercase",
              }}
            >
              {adminT.portalBadge || "ADMIN CONTROL CENTER"}
            </span>
            <span className="admin-user-email">
              Logged in as <b>{user.email}</b>
            </span>
          </div>
          <h1 style={{ fontSize: "22px", margin: 0, color: "var(--ink)" }}>
            {adminT.portalTitle || "Administrator Control Dashboard"}
          </h1>
        </div>

        <div className="admin-topbar-actions">
          <button
            type="button"
            onClick={loadAdminData}
            title="Refresh data"
            style={{
              padding: "8px 14px",
              borderRadius: "8px",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid var(--line)",
              color: "var(--ink)",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            🔄 Refresh
          </button>
          <button
            type="button"
            onClick={() => move("Home")}
            style={{
              padding: "8px 14px",
              borderRadius: "8px",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid var(--line)",
              color: "var(--ink)",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            {adminT.backToApp || "← App"}
          </button>
          <button
            type="button"
            onClick={handleAdminLogout}
            style={{
              padding: "8px 14px",
              borderRadius: "8px",
              background: "rgba(255, 77, 77, 0.15)",
              border: "1px solid rgba(255, 77, 77, 0.4)",
              color: "#ff6b6b",
              fontSize: "13px",
              fontWeight: "700",
              cursor: "pointer",
            }}
          >
            {adminT.logoutBtn || "Sign Out"}
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="admin-tabs" role="tablist" aria-label="Admin dashboard sections">
        {[
          { id: "bankDetails", label: adminT.tabBankDetails || "🏦 Bank & Payment Accounts" },
          {
            id: "transactions",
            label: `${adminT.tabTransactions || "📥 Transactions"} (${allTransactions.length})`,
          },
          { id: "sportsTips", label: adminT.tabSportsTips || "🏏 Sports Tips" },
          { id: "settings", label: adminT.tabSettings || "⚙️ System Settings" },
          { id: "overview", label: adminT.tabOverview || "📊 Stats Overview" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`admin-tab ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
            aria-selected={activeTab === tab.id}
            role="tab"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* --- TAB 1: BANK & PAYMENT ACCOUNTS --- */}
      {activeTab === "bankDetails" && (
        <section style={{ display: "grid", gap: "24px" }}>
          <div
            style={{
              background: "var(--panel)",
              border: "1px solid var(--line)",
              borderRadius: "16px",
              padding: "24px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "12px",
                marginBottom: "16px",
              }}
            >
              <div>
                <h2 style={{ fontSize: "20px", margin: "0 0 6px", color: "var(--ink)" }}>
                  {adminT.bankAccountsHeader || "Official Agent Bank & Payment Accounts"}
                </h2>
                <p style={{ color: "var(--muted)", fontSize: "13px", margin: 0 }}>
                  {adminT.bankAccountsDesc ||
                    "These accounts are displayed live to all users on the Deposit screen. Any additions, updates, or removals take effect immediately."}
                </p>
              </div>

              <button
                type="button"
                onClick={startAddNewAccount}
                className="green"
                style={{
                  padding: "10px 18px",
                  borderRadius: "10px",
                  fontSize: "14px",
                  fontWeight: "800",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                {adminT.addAccountBtn || "+ Add Bank / Payment Account"}
              </button>
            </div>

            {/* Account Form Modal/Inline Editor */}
            {(isAddingNew || editingAccount) && (
              <form
                onSubmit={handleSaveAccountForm}
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "2px solid var(--green)",
                  borderRadius: "14px",
                  padding: "20px",
                  marginBottom: "20px",
                  display: "grid",
                  gap: "16px",
                }}
              >
                <div
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
                >
                  <h3 style={{ margin: 0, fontSize: "16px", color: "var(--green)" }}>
                    {isAddingNew
                      ? adminT.addModalTitle || "➕ Add New Payment Account"
                      : adminT.editModalTitle || "✏️ Edit Payment Account"}
                  </h3>
                  <button
                    type="button"
                    onClick={cancelAccountEdit}
                    aria-label={adminT.cancelBtn || "Close account editor"}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--muted)",
                      fontSize: "18px",
                      cursor: "pointer",
                    }}
                  >
                    <span aria-hidden="true">×</span>
                  </button>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: "14px",
                  }}
                >
                  <label
                    style={{ display: "grid", gap: "6px", fontSize: "13px", fontWeight: "600" }}
                  >
                    {adminT.accountName || "Bank / Service Name (e.g. BOC Walasmulla)"}
                    <input
                      type="text"
                      required
                      placeholder="e.g. Commercial Bank (Colombo)"
                      value={accountForm.name}
                      onChange={(e) =>
                        setAccountForm((prev) => ({ ...prev, name: e.target.value }))
                      }
                      style={{
                        padding: "10px 12px",
                        borderRadius: "8px",
                        background: "var(--bg)",
                        border: "1px solid var(--line)",
                        color: "var(--ink)",
                      }}
                    />
                  </label>

                  <label
                    style={{ display: "grid", gap: "6px", fontSize: "13px", fontWeight: "600" }}
                  >
                    {adminT.accountNumber || "Account or Mobile Phone Number"}
                    <input
                      type="text"
                      required
                      placeholder="e.g. 105456146706 or 0740452530"
                      value={accountForm.number}
                      onChange={(e) =>
                        setAccountForm((prev) => ({ ...prev, number: e.target.value }))
                      }
                      style={{
                        padding: "10px 12px",
                        borderRadius: "8px",
                        background: "var(--bg)",
                        border: "1px solid var(--line)",
                        color: "var(--ink)",
                      }}
                    />
                  </label>

                  <label
                    style={{ display: "grid", gap: "6px", fontSize: "13px", fontWeight: "600" }}
                  >
                    {adminT.accountType || "Account Type"}
                    <select
                      value={accountForm.type}
                      onChange={(e) =>
                        setAccountForm((prev) => ({
                          ...prev,
                          type: e.target.value,
                          icon: e.target.value === "IPAY" ? "📱" : "🏦",
                        }))
                      }
                      style={{
                        padding: "10px 12px",
                        borderRadius: "8px",
                        background: "var(--bg)",
                        border: "1px solid var(--line)",
                        color: "var(--ink)",
                      }}
                    >
                      <option value="BANK">{adminT.typeBank || "Bank Account (🏦)"}</option>
                      <option value="IPAY">{adminT.typeIpay || "iPay / Mobile Wallet (📱)"}</option>
                      <option value="OTHER">{adminT.typeOther || "Other Provider (💳)"}</option>
                    </select>
                  </label>

                  <label
                    style={{ display: "grid", gap: "6px", fontSize: "13px", fontWeight: "600" }}
                  >
                    {adminT.accountIcon || "Icon (Emoji)"}
                    <input
                      type="text"
                      maxLength="4"
                      value={accountForm.icon}
                      onChange={(e) =>
                        setAccountForm((prev) => ({ ...prev, icon: e.target.value }))
                      }
                      style={{
                        padding: "10px 12px",
                        borderRadius: "8px",
                        background: "var(--bg)",
                        border: "1px solid var(--line)",
                        color: "var(--ink)",
                      }}
                    />
                  </label>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <input
                    type="checkbox"
                    id="accountActiveCheckbox"
                    checked={accountForm.active !== false}
                    onChange={(e) =>
                      setAccountForm((prev) => ({ ...prev, active: e.target.checked }))
                    }
                    style={{ width: "18px", height: "18px", cursor: "pointer" }}
                  />
                  <label
                    htmlFor="accountActiveCheckbox"
                    style={{ fontSize: "13px", fontWeight: "600", cursor: "pointer" }}
                  >
                    {adminT.accountActive || "Active (Visible to users on deposit page)"}
                  </label>
                </div>

                <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    onClick={cancelAccountEdit}
                    style={{
                      padding: "10px 16px",
                      borderRadius: "8px",
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid var(--line)",
                      color: "var(--ink)",
                      cursor: "pointer",
                    }}
                  >
                    {adminT.cancelBtn || "Cancel"}
                  </button>
                  <button
                    type="submit"
                    className="green"
                    disabled={loading}
                    style={{ padding: "10px 20px", borderRadius: "8px", fontWeight: "800" }}
                  >
                    {loading ? "Saving..." : adminT.saveAccountBtn || "Save Account"}
                  </button>
                </div>
              </form>
            )}

            {/* List of Accounts */}
            <div style={{ display: "grid", gap: "12px" }}>
              {bankAccounts.map((acc, index) => (
                <div
                  key={acc.id || index}
                  style={{
                    background:
                      acc.active === false ? "rgba(255,255,255,0.01)" : "rgba(255,255,255,0.04)",
                    border: "1px solid var(--line)",
                    borderRadius: "12px",
                    padding: "16px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "12px",
                    opacity: acc.active === false ? 0.6 : 1,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                    <div
                      style={{
                        fontSize: "24px",
                        background: "rgba(255,255,255,0.06)",
                        width: "46px",
                        height: "46px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: "10px",
                      }}
                    >
                      {acc.icon || (acc.type === "IPAY" ? "📱" : "🏦")}
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <strong style={{ fontSize: "16px", color: "var(--ink)" }}>
                          {acc.name}
                        </strong>
                        {acc.active === false && (
                          <span
                            style={{
                              fontSize: "10px",
                              background: "rgba(255,77,77,0.2)",
                              color: "#ff6b6b",
                              padding: "2px 6px",
                              borderRadius: "4px",
                              fontWeight: "700",
                            }}
                          >
                            HIDDEN
                          </span>
                        )}
                        <span
                          style={{
                            fontSize: "10px",
                            background: "rgba(34,199,255,0.15)",
                            color: "var(--blue)",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            fontWeight: "700",
                          }}
                        >
                          {acc.type || "BANK"}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: "14px",
                          fontFamily: "monospace",
                          color: "var(--green)",
                          marginTop: "4px",
                          letterSpacing: "1px",
                          fontWeight: "700",
                        }}
                      >
                        {acc.number}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <button
                      type="button"
                      onClick={() => handleToggleActive(acc)}
                      aria-label={`${acc.active === false ? "Show" : "Hide"} ${acc.name} for users`}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "6px",
                        fontSize: "12px",
                        fontWeight: "600",
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid var(--line)",
                        color: "var(--ink)",
                        cursor: "pointer",
                      }}
                    >
                      {acc.active === false ? "👁️ Show" : "👁️ Hide"}
                    </button>
                    <button
                      type="button"
                      onClick={() => startEditAccount(acc)}
                      aria-label={`${adminT.editAccount || "Edit"} ${acc.name}`}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "6px",
                        fontSize: "12px",
                        fontWeight: "700",
                        background: "rgba(34, 199, 255, 0.15)",
                        border: "1px solid rgba(34, 199, 255, 0.3)",
                        color: "var(--blue)",
                        cursor: "pointer",
                      }}
                    >
                      ✏️ {adminT.editAccount || "Edit"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteAccount(acc.id)}
                      aria-label={`${adminT.deleteAccount || "Delete"} ${acc.name}`}
                      disabled={bankAccounts.length <= 1}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "6px",
                        fontSize: "12px",
                        fontWeight: "700",
                        background: "rgba(255, 77, 77, 0.12)",
                        border: "1px solid rgba(255, 77, 77, 0.3)",
                        color: "#ff6b6b",
                        cursor: bankAccounts.length <= 1 ? "not-allowed" : "pointer",
                      }}
                    >
                      🗑️ {adminT.deleteAccount || "Delete"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* --- TAB 2: TRANSACTIONS MANAGER --- */}
      {activeTab === "transactions" && (
        <section
          style={{
            background: "var(--panel)",
            border: "1px solid var(--line)",
            borderRadius: "16px",
            padding: "24px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
              marginBottom: "18px",
            }}
          >
            <h2 style={{ fontSize: "20px", margin: 0, color: "var(--ink)" }}>
              {adminT.tabTransactions || "Transactions Manager"}
            </h2>

            {/* Filter controls */}
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
              <input
                type="search"
                aria-label="Search transactions"
                placeholder={adminT.txSearchPlaceholder || "Search Player ID, Ref, Name, Bank..."}
                value={txSearch}
                onChange={(e) => setTxSearch(e.target.value)}
                style={{
                  padding: "8px 12px",
                  borderRadius: "8px",
                  background: "var(--bg)",
                  border: "1px solid var(--line)",
                  color: "var(--ink)",
                  fontSize: "13px",
                  minWidth: 0,
                  flex: "1 1 200px",
                }}
              />

              <select
                value={txFilterType}
                onChange={(e) => setTxFilterType(e.target.value)}
                style={{
                  padding: "8px 12px",
                  borderRadius: "8px",
                  background: "var(--bg)",
                  border: "1px solid var(--line)",
                  color: "var(--ink)",
                  fontSize: "13px",
                }}
              >
                <option value="ALL">All Types</option>
                <option value="DEPOSIT">Deposits Only</option>
                <option value="WITHDRAWAL">Withdrawals Only</option>
              </select>

              <select
                value={txFilterStatus}
                onChange={(e) => setTxFilterStatus(e.target.value)}
                style={{
                  padding: "8px 12px",
                  borderRadius: "8px",
                  background: "var(--bg)",
                  border: "1px solid var(--line)",
                  color: "var(--ink)",
                  fontSize: "13px",
                }}
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">Pending Only</option>
                <option value="PROCESSING">Processing Only</option>
                <option value="COMPLETED">Completed Only</option>
                <option value="REJECTED">Rejected Only</option>
              </select>
            </div>
          </div>

          {filteredTransactions.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "40px 20px",
                color: "var(--muted)",
                fontSize: "14px",
              }}
            >
              {adminT.noTransactions || "No transactions match the selected filters."}
            </div>
          ) : (
            <div style={{ display: "grid", gap: "14px" }}>
              {filteredTransactions.map((tx) => {
                const statusColor =
                  tx.status === "COMPLETED"
                    ? "var(--green)"
                    : tx.status === "REJECTED"
                      ? "#ff6b6b"
                      : tx.status === "PROCESSING"
                        ? "var(--blue)"
                        : "#ffc857";
                return (
                  <div
                    key={tx.id}
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid var(--line)",
                      borderRadius: "12px",
                      padding: "16px",
                      display: "grid",
                      gap: "12px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        flexWrap: "wrap",
                        gap: "8px",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            marginBottom: "4px",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: "800",
                              padding: "2px 8px",
                              borderRadius: "6px",
                              background:
                                tx.type === "DEPOSIT"
                                  ? "rgba(182,255,53,0.15)"
                                  : "rgba(34,199,255,0.15)",
                              color: tx.type === "DEPOSIT" ? "var(--green)" : "var(--blue)",
                            }}
                          >
                            {tx.type}
                          </span>
                          <strong style={{ fontSize: "15px", color: "var(--ink)" }}>{tx.id}</strong>
                          <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                            {new Date(tx.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <div style={{ fontSize: "14px", color: "var(--ink)" }}>
                          Player ID: <b style={{ color: "var(--blue)" }}>{tx.playerId}</b>
                          {tx.name ? ` • Name: ${tx.name}` : ""}
                          {tx.bank ? ` • Bank: ${tx.bank}` : ""}
                          {tx.paymentMethod ? ` • Method: ${tx.paymentMethod}` : ""}
                          {tx.accountNumber ? ` • Acc: ${tx.accountNumber}` : ""}
                          {tx.refNumber || tx.journalNumber
                            ? ` • Ref: ${tx.refNumber || tx.journalNumber}`
                            : ""}
                          {tx.securityCode ? ` • Sec Code: ${tx.securityCode}` : ""}
                        </div>
                      </div>

                      {tx.rejectionReason && (
                        <div
                          style={{
                            marginTop: "8px",
                            padding: "8px",
                            borderRadius: "6px",
                            background: "rgba(255,77,77,.1)",
                            color: "#ff8a9b",
                            fontSize: "12px",
                          }}
                        >
                          <strong>Rejection reason:</strong> {tx.rejectionReason}
                        </div>
                      )}
                      <div style={{ textAlign: "right" }}>
                        <div
                          style={{
                            fontSize: "18px",
                            fontWeight: "800",
                            color: tx.type === "DEPOSIT" ? "var(--green)" : "var(--blue)",
                          }}
                        >
                          LKR {Number(tx.amount || 0).toLocaleString()}
                        </div>
                        <span
                          style={{
                            display: "inline-block",
                            fontSize: "11px",
                            fontWeight: "800",
                            padding: "3px 8px",
                            borderRadius: "6px",
                            background: `${statusColor}22`,
                            color: statusColor,
                            marginTop: "4px",
                          }}
                        >
                          ● {tx.status}
                        </span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        flexWrap: "wrap",
                        alignItems: "center",
                        borderTop: "1px solid var(--line)",
                        paddingTop: "10px",
                      }}
                    >
                      {tx.receiptImage && (
                        <button
                          type="button"
                          onClick={() => setSelectedSlipImage(tx.receiptImage)}
                          style={{
                            padding: "6px 12px",
                            borderRadius: "6px",
                            fontSize: "12px",
                            fontWeight: "700",
                            background: "rgba(255,255,255,0.08)",
                            border: "1px solid var(--line)",
                            color: "var(--ink)",
                            cursor: "pointer",
                          }}
                        >
                          {adminT.viewSlipBtn || "🔍 View Slip Image"}
                        </button>
                      )}

                      {tx.status !== "COMPLETED" && (
                        <button
                          type="button"
                          onClick={() => handleUpdateTxStatus(tx.id, "COMPLETED")}
                          style={{
                            padding: "6px 12px",
                            borderRadius: "6px",
                            fontSize: "12px",
                            fontWeight: "800",
                            background: "rgba(182,255,53,0.2)",
                            border: "1px solid var(--green)",
                            color: "var(--green)",
                            cursor: "pointer",
                          }}
                        >
                          {adminT.actionApprove || "✓ Approve (Complete)"}
                        </button>
                      )}

                      {tx.status !== "PROCESSING" && tx.status !== "COMPLETED" && (
                        <button
                          type="button"
                          onClick={() => handleUpdateTxStatus(tx.id, "PROCESSING")}
                          style={{
                            padding: "6px 12px",
                            borderRadius: "6px",
                            fontSize: "12px",
                            fontWeight: "700",
                            background: "rgba(34,199,255,0.15)",
                            border: "1px solid var(--blue)",
                            color: "var(--blue)",
                            cursor: "pointer",
                          }}
                        >
                          {adminT.actionProcess || "⏳ Mark Processing"}
                        </button>
                      )}

                      {tx.status !== "REJECTED" && (
                        <button
                          type="button"
                          onClick={() => handleUpdateTxStatus(tx.id, "REJECTED")}
                          style={{
                            padding: "6px 12px",
                            borderRadius: "6px",
                            fontSize: "12px",
                            fontWeight: "700",
                            background: "rgba(255,77,77,0.15)",
                            border: "1px solid rgba(255,77,77,0.4)",
                            color: "#ff6b6b",
                            cursor: "pointer",
                          }}
                        >
                          {adminT.actionReject || "✕ Reject"}
                        </button>
                      )}

                      <a
                        href={`https://wa.me/${(systemSettings.whatsappNumber || "+94765865387").replace(/[^0-9]/g, "")}?text=${encodeURIComponent(`Hello! Regarding your Fast Cash request ${tx.id} for 1xBet Player ID ${tx.playerId}:`)}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          padding: "6px 12px",
                          borderRadius: "6px",
                          fontSize: "12px",
                          fontWeight: "700",
                          background: "rgba(37, 211, 102, 0.15)",
                          border: "1px solid #25D366",
                          color: "#25D366",
                          textDecoration: "none",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        {adminT.actionWhatsApp || "💬 WhatsApp"}
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* --- TAB 3: SPORTS TIPS --- */}
      {activeTab === "sportsTips" && (
        <section style={{ display: "grid", gap: "18px" }}>
          <div
            style={{
              background: "var(--panel)",
              border: "1px solid var(--line)",
              borderRadius: "16px",
              padding: "24px",
            }}
          >
            <h2 style={{ margin: "0 0 8px", color: "var(--green)" }}>
              {adminT.sportsTipsTitle || "🏏 Cricket & Football Tips"}{" "}
              <small style={{ color: "var(--muted)", fontSize: 12 }}>
                ({sportsTips.length} recent)
              </small>
            </h2>
            <p style={{ color: "var(--muted)", fontSize: "13px", margin: "0 0 16px" }}>
              {adminT.sportsTipsDesc ||
                "Monitor the latest scheduled runs. The public board shows only fresh, published picks and never guarantees a result."}
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 10,
              }}
            >
              {["morning", "noon", "evening"].map((slot) => {
                const run = sportsRuns.find((item) => item.slot === slot);
                return (
                  <div
                    key={slot}
                    style={{ border: "1px solid var(--line)", borderRadius: 10, padding: 12 }}
                  >
                    <strong style={{ display: "block", textTransform: "capitalize" }}>
                      {slot}
                    </strong>
                    <small
                      style={{
                        color: run?.status === "succeeded" ? "var(--green)" : "var(--muted)",
                      }}
                    >
                      {run ? `${run.status} · ${run.tip_count || 0} tips` : "No run recorded"}
                    </small>
                  </div>
                );
              })}
            </div>
          </div>
          <div
            style={{
              background: "var(--panel)",
              border: "1px solid var(--line)",
              borderRadius: "16px",
              padding: "24px",
              overflowX: "auto",
            }}
          >
            <h3 style={{ margin: "0 0 12px" }}>{adminT.sportsRunsTitle || "Recent update runs"}</h3>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: 8 }}>Sport</th>
                  <th style={{ textAlign: "left", padding: 8 }}>Slot</th>
                  <th style={{ textAlign: "left", padding: 8 }}>Status</th>
                  <th style={{ textAlign: "left", padding: 8 }}>Started</th>
                  <th style={{ textAlign: "left", padding: 8 }}>Error</th>
                </tr>
              </thead>
              <tbody>
                {sportsRuns.slice(0, 12).map((run) => (
                  <tr key={run.id}>
                    <td style={{ padding: 8 }}>{run.sport}</td>
                    <td style={{ padding: 8 }}>{run.slot}</td>
                    <td
                      style={{
                        padding: 8,
                        color: run.status === "succeeded" ? "var(--green)" : "#ffc857",
                      }}
                    >
                      {run.status}
                    </td>
                    <td style={{ padding: 8 }}>{new Date(run.started_at).toLocaleString()}</td>
                    <td style={{ padding: 8, color: "#ff8b8b" }}>{run.error_message || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div
            style={{
              background: "rgba(34,199,255,.08)",
              border: "1px solid rgba(34,199,255,.3)",
              borderRadius: 12,
              padding: 14,
              fontSize: 13,
            }}
          >
            {adminT.sportsScheduleNote ||
              "Scheduler: configure the deployed update-sports-tips Edge Function for 08:00, 12:00 and 18:00 Asia/Colombo. Keep ODDS_API_KEY server-side only."}
          </div>
        </section>
      )}

      {/* --- TAB 4: SYSTEM SETTINGS --- */}
      {activeTab === "settings" && (
        <section
          style={{
            background: "var(--panel)",
            border: "1px solid var(--line)",
            borderRadius: "16px",
            padding: "24px",
            maxWidth: "650px",
          }}
        >
          <h2 style={{ fontSize: "20px", margin: "0 0 6px", color: "var(--ink)" }}>
            {adminT.settingsHeader || "System & WhatsApp Configuration"}
          </h2>
          <p style={{ color: "var(--muted)", fontSize: "13px", margin: "0 0 20px" }}>
            Update global parameters including the active agent WhatsApp phone number, referral
            bonus promo code, and allowed transaction limits.
          </p>

          <form onSubmit={handleSaveSettings} style={{ display: "grid", gap: "16px" }}>
            <label style={{ display: "grid", gap: "6px", fontSize: "13px", fontWeight: "600" }}>
              {adminT.whatsappLabel || "WhatsApp Agent Support Phone Number (with +94)"}
              <input
                type="text"
                required
                placeholder="+94765865387"
                value={systemSettings.whatsappNumber || ""}
                onChange={(e) =>
                  setSystemSettings((prev) => ({ ...prev, whatsappNumber: e.target.value }))
                }
                style={{
                  padding: "10px 14px",
                  borderRadius: "8px",
                  background: "var(--bg)",
                  border: "1px solid var(--line)",
                  color: "var(--ink)",
                }}
              />
            </label>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              <label style={{ display: "grid", gap: "6px", fontSize: "13px", fontWeight: "600" }}>
                {adminT.minTxLabel || "Minimum Transaction Amount (LKR)"}
                <input
                  type="number"
                  min="10"
                  max="1000000"
                  required
                  value={systemSettings.minTransaction || 1000}
                  onChange={(e) =>
                    setSystemSettings((prev) => ({
                      ...prev,
                      minTransaction: Number(e.target.value),
                    }))
                  }
                  style={{
                    padding: "10px 14px",
                    borderRadius: "8px",
                    background: "var(--bg)",
                    border: "1px solid var(--line)",
                    color: "var(--ink)",
                  }}
                />
              </label>

              <label style={{ display: "grid", gap: "6px", fontSize: "13px", fontWeight: "600" }}>
                {adminT.maxTxLabel || "Maximum Transaction Amount (LKR)"}
                <input
                  type="number"
                  min="100"
                  max="10000000"
                  required
                  value={systemSettings.maxTransaction || 500000}
                  onChange={(e) =>
                    setSystemSettings((prev) => ({
                      ...prev,
                      maxTransaction: Number(e.target.value),
                    }))
                  }
                  style={{
                    padding: "10px 14px",
                    borderRadius: "8px",
                    background: "var(--bg)",
                    border: "1px solid var(--line)",
                    color: "var(--ink)",
                  }}
                />
              </label>
            </div>

            <label style={{ display: "grid", gap: "6px", fontSize: "13px", fontWeight: "600" }}>
              {adminT.promoCodeLabel || "Official 1xBet Referral Promo Code"}
              <input
                type="text"
                placeholder="VGSL"
                value={systemSettings.promoCode || "VGSL"}
                onChange={(e) =>
                  setSystemSettings((prev) => ({ ...prev, promoCode: e.target.value }))
                }
                style={{
                  padding: "10px 14px",
                  borderRadius: "8px",
                  background: "var(--bg)",
                  border: "1px solid var(--line)",
                  color: "var(--ink)",
                  fontWeight: "700",
                  letterSpacing: "1px",
                }}
              />
            </label>

            <button
              type="submit"
              className="green"
              disabled={loading}
              style={{
                padding: "12px 20px",
                borderRadius: "10px",
                fontWeight: "800",
                fontSize: "14px",
                marginTop: "10px",
              }}
            >
              {loading ? "Saving Settings..." : adminT.saveSettingsBtn || "Save System Settings"}
            </button>
          </form>
        </section>
      )}

      {/* --- TAB 4: STATS OVERVIEW --- */}
      {activeTab === "overview" && (
        <section style={{ display: "grid", gap: "20px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "16px",
            }}
          >
            <div
              style={{
                background: "var(--panel)",
                border: "1px solid var(--line)",
                borderRadius: "14px",
                padding: "20px",
              }}
            >
              <div style={{ fontSize: "13px", color: "var(--muted)", marginBottom: "6px" }}>
                {adminT.statsUsers || "Total Registered Users"}
              </div>
              <div style={{ fontSize: "28px", fontWeight: "800", color: "var(--ink)" }}>
                {stats?.users || usersList.length || 0}
              </div>
            </div>

            <div
              style={{
                background: "var(--panel)",
                border: "1px solid var(--line)",
                borderRadius: "14px",
                padding: "20px",
              }}
            >
              <div style={{ fontSize: "13px", color: "var(--muted)", marginBottom: "6px" }}>
                {adminT.statsTransactions || "Total Requests"}
              </div>
              <div style={{ fontSize: "28px", fontWeight: "800", color: "var(--blue)" }}>
                {stats?.transactions || allTransactions.length || 0}
              </div>
            </div>

            <div
              style={{
                background: "var(--panel)",
                border: "1px solid var(--line)",
                borderRadius: "14px",
                padding: "20px",
              }}
            >
              <div style={{ fontSize: "13px", color: "var(--muted)", marginBottom: "6px" }}>
                {adminT.statsPending || "Pending Reviews"}
              </div>
              <div style={{ fontSize: "28px", fontWeight: "800", color: "#ffc857" }}>
                {stats?.pending ||
                  allTransactions.filter((t) => t.status === "PENDING").length ||
                  0}
              </div>
            </div>

            <div
              style={{
                background: "var(--panel)",
                border: "1px solid var(--line)",
                borderRadius: "14px",
                padding: "20px",
              }}
            >
              <div style={{ fontSize: "13px", color: "var(--muted)", marginBottom: "6px" }}>
                {adminT.statsCompleted || "Completed"}
              </div>
              <div style={{ fontSize: "28px", fontWeight: "800", color: "var(--green)" }}>
                {stats?.completed ||
                  allTransactions.filter((t) => t.status === "COMPLETED").length ||
                  0}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Slip Image Viewer Modal */}
      {selectedSlipImage && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.85)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "var(--panel)",
              border: "1px solid var(--line)",
              borderRadius: "16px",
              padding: "20px",
              maxWidth: "600px",
              width: "100%",
              maxHeight: "90vh",
              display: "grid",
              gap: "14px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: "16px", color: "var(--ink)" }}>
                Deposit Receipt Slip
              </h3>
              <button
                type="button"
                onClick={() => setSelectedSlipImage(null)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--ink)",
                  fontSize: "22px",
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>
            <div style={{ overflow: "auto", textAlign: "center", maxHeight: "70vh" }}>
              <img
                src={selectedSlipImage}
                alt="Deposit Slip"
                style={{
                  maxWidth: "100%",
                  maxHeight: "65vh",
                  objectFit: "contain",
                  borderRadius: "8px",
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
