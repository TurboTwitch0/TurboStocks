"use strict";

const BACKUP_VERSION = 1;
const BACKUP_LIMIT = 10 * 1024 * 1024;
const IMPORT_LOCK_KEY = "__turboStocksBackupImport";
const IMPORT_LOCK_NAME = "turbo-stocks-backup-import";
const BACKUP_KEYS = new Set([
    "novaUsers", "novaSession", "novaGuestAccount", "novaGuestLessons",
    "novaAccount", "novaLessonProgress", "novaProfile", "novaTheme",
    "turboGuestStateV2", "turboRememberTutor", "turboTutorHistory", "turboCommunityNotes"
]);
const SCOPEABLE_KEYS = new Set(["turboRememberTutor", "turboTutorHistory", "turboCommunityNotes"]);
const UNSAFE_KEYS = new Set(["__proto__", "prototype", "constructor"]);

function supportedBackupKey(key) {
    if (BACKUP_KEYS.has(key)) return true;
    const match = /^(turboRememberTutor|turboTutorHistory|turboCommunityNotes):(.+)$/.exec(key);
    if (!match || !SCOPEABLE_KEYS.has(match[1])) return false;
    if (match[2] === "guest") return true;
    try {
        const email = decodeURIComponent(match[2]);
        return encodeURIComponent(email) === match[2] && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    } catch { return false; }
}

function safeJSON(value, label) {
    let parsed;
    try { parsed = JSON.parse(value); }
    catch { throw new Error(`${label} is not valid JSON.`); }
    function walk(item, depth = 0) {
        if (depth > 40) throw new Error(`${label} is nested too deeply.`);
        if (Array.isArray(item)) {
            if (item.length > 5000) throw new Error(`${label} contains too many items.`);
            item.forEach(child => walk(child, depth + 1));
        } else if (item && typeof item === "object") {
            const keys = Object.keys(item);
            if (keys.length > 500) throw new Error(`${label} contains too many fields.`);
            for (const key of keys) {
                if (UNSAFE_KEYS.has(key)) throw new Error(`${label} contains an unsafe property name.`);
                walk(item[key], depth + 1);
            }
        }
    }
    walk(parsed);
    return parsed;
}

function plainRecord(value, allowed, required = []) {
    if (!value || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) return false;
    const keys = Object.keys(value);
    return keys.every(key => allowed.has(key) && !UNSAFE_KEYS.has(key)) && required.every(key => Object.hasOwn(value, key));
}

function validDate(value) { return typeof value === "string" && Number.isFinite(Date.parse(value)); }
function supportedSymbol(symbol) { return typeof symbol === "string" && Object.hasOwn(stocks, symbol); }
function validEmail(email) { return typeof email === "string" && email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }

function validateAccountData(account, label) {
    const accountFields = new Set(["cash", "positions", "history", "watchlist", "realizedPnl"]);
    if (!plainRecord(account, accountFields, ["cash", "positions", "history", "watchlist"])) throw new Error(`${label} has unsupported portfolio fields.`);
    window.PaperEngine.validateAccount(account);
    for (const symbol of [...Object.keys(account.positions), ...account.watchlist]) {
        if (!supportedSymbol(symbol)) throw new Error(`${label} contains unsupported sample symbol ${symbol}.`);
    }
    const positionFields = new Set(["shares", "averagePrice"]);
    for (const position of Object.values(account.positions)) {
        if (!plainRecord(position, positionFields, ["shares", "averagePrice"])) throw new Error(`${label} has an invalid position record.`);
    }
    if (account.history.length > 5000) throw new Error(`${label} has too many trades.`);
    const tradeFields = new Set(["symbol", "side", "shares", "price", "total", "timestamp", "source", "fees"]);
    for (const trade of account.history) {
        if (!plainRecord(trade, tradeFields, ["symbol", "side", "shares", "price"]) || !supportedSymbol(trade.symbol)) throw new Error(`${label} has an invalid or unsupported trade record.`);
        if (trade.total !== undefined && (!Number.isFinite(trade.total) || Math.abs(trade.total - trade.shares * trade.price) > Math.max(0.000001, trade.total * 1e-9))) throw new Error(`${label} has inconsistent trade totals.`);
        if (trade.timestamp !== undefined && !validDate(trade.timestamp)) throw new Error(`${label} has an invalid trade date.`);
        if (trade.source !== undefined && (typeof trade.source !== "string" || trade.source.length > 120)) throw new Error(`${label} has an invalid trade source.`);
        if (trade.fees !== undefined && (!Number.isFinite(trade.fees) || trade.fees < 0)) throw new Error(`${label} has invalid trade fees.`);
    }
}

function validateLessonProgress(value, label) {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object.`);
    const ids = new Set(lessons.map(lesson => lesson.id));
    const fields = new Set(["completed", "score", "total", "percent", "date"]);
    for (const [id, record] of Object.entries(value)) {
        if (!ids.has(id) || !plainRecord(record, fields, ["completed"]) || typeof record.completed !== "boolean") throw new Error(`${label} contains an unsupported lesson record.`);
        if (record.score !== undefined && (!Number.isInteger(record.score) || record.score < 0)) throw new Error(`${label} has an invalid quiz score.`);
        if (record.total !== undefined && (!Number.isInteger(record.total) || record.total < 1 || record.total > 100 || (record.score ?? 0) > record.total)) throw new Error(`${label} has an invalid quiz total.`);
        if (record.percent !== undefined && (!Number.isFinite(record.percent) || record.percent < 0 || record.percent > 100)) throw new Error(`${label} has an invalid quiz percentage.`);
        if (record.date !== undefined && !validDate(record.date)) throw new Error(`${label} has an invalid completion date.`);
    }
}

function validatePasswordHash(hash, allowUnset = false) {
    if (allowUnset && hash === null) return true;
    if (typeof hash !== "string") return false;
    if (/^[a-f\d]{64}$/i.test(hash)) return true; // Legacy SHA-256, upgraded at next sign-in.
    const parts = hash.split("$");
    return parts.length === 4 && parts[0] === "pbkdf2" && /^\d+$/.test(parts[1]) && Number(parts[1]) >= 100000 && Number(parts[1]) <= 1000000 && /^[a-f\d]{32}$/i.test(parts[2]) && /^[a-f\d]{64}$/i.test(parts[3]);
}

function validateUsers(users) {
    if (!users || typeof users !== "object" || Array.isArray(users) || Object.keys(users).length > 500) throw new Error("Profile collection is invalid or too large.");
    const fields = new Set(["name", "email", "passwordHash", "account", "lessonProgress", "createdAt"]);
    for (const [email, user] of Object.entries(users)) {
        if (!validEmail(email) || email !== email.toLowerCase() || !plainRecord(user, fields, ["name", "email", "passwordHash", "account", "lessonProgress"]) || user.email !== email || typeof user.name !== "string" || !user.name.trim() || user.name.length > 80 || !validatePasswordHash(user.passwordHash, true)) throw new Error("A demo profile has invalid identity, name, or password data.");
        validateAccountData(user.account, `Profile ${email}`);
        validateLessonProgress(user.lessonProgress, `Profile ${email} lesson progress`);
        if (user.createdAt !== undefined && !validDate(user.createdAt)) throw new Error(`Profile ${email} has an invalid creation date.`);
    }
    return users;
}

function validateChat(value, label) {
    if (!Array.isArray(value) || value.length > 40) throw new Error(`${label} must contain no more than 40 messages.`);
    const fields = new Set(["role", "content"]);
    for (const item of value) if (!plainRecord(item, fields, ["role", "content"]) || !["user", "assistant"].includes(item.role) || typeof item.content !== "string" || item.content.length > 12000) throw new Error(`${label} contains an invalid message.`);
}

function validateNotes(value, label) {
    if (!Array.isArray(value) || value.length > 80) throw new Error(`${label} must contain no more than 80 notes.`);
    const fields = new Set(["id", "symbol", "source", "tone", "claim", "createdAt"]), ids = new Set();
    for (const note of value) {
        if (!plainRecord(note, fields, ["id", "symbol", "source", "tone", "claim", "createdAt"]) || typeof note.id !== "string" || !/^[A-Za-z0-9_-]{1,80}$/.test(note.id) || ids.has(note.id) || !supportedSymbol(note.symbol) || typeof note.source !== "string" || !note.source.trim() || note.source.length > 80 || !["bullish", "mixed", "bearish", "unverified"].includes(note.tone) || typeof note.claim !== "string" || !note.claim.trim() || note.claim.length > 600 || !validDate(note.createdAt)) throw new Error(`${label} contains an invalid note.`);
        ids.add(note.id);
    }
}

function validateBackup(payload) {
    const rootFields = new Set(["product", "formatVersion", "exportedAt", "data"]);
    if (!plainRecord(payload, rootFields, ["product", "formatVersion", "data"]) || payload.product !== "Turbo Stocks" || payload.formatVersion !== BACKUP_VERSION || !payload.data || typeof payload.data !== "object" || Array.isArray(payload.data)) throw new Error("This is not a supported Turbo Stocks backup.");
    if (payload.exportedAt !== undefined && !validDate(payload.exportedAt)) throw new Error("The backup export date is invalid.");
    const keys = Object.keys(payload.data);
    if (!keys.length || keys.length > 500) throw new Error("The backup has an invalid number of saved items.");
    let byteCount = 0;
    for (const [key, value] of Object.entries(payload.data)) {
        if (!supportedBackupKey(key) || typeof value !== "string") throw new Error(`Unsupported backup storage key: ${key}.`);
        byteCount += new TextEncoder().encode(key).length + new TextEncoder().encode(value).length;
        if (byteCount > BACKUP_LIMIT) throw new Error("The backup exceeds the 10 MB import limit.");
        let parsed;
        if (/^[\[{]/.test(value)) parsed = safeJSON(value, `Saved data for ${key}`);
        if (key === "novaUsers") validateUsers(parsed);
        else if (key === "novaSession" && value && !validEmail(value)) throw new Error("The active profile email is invalid.");
        else if (key === "novaTheme" && !["light", "dark"].includes(value)) throw new Error("The saved theme setting is invalid.");
        else if (["novaGuestAccount", "novaAccount"].includes(key) && parsed !== null) validateAccountData(parsed, key);
        else if (key === "turboGuestStateV2") {
            const fields = new Set(["account", "lessonProgress"]);
            if (!plainRecord(parsed, fields, ["account", "lessonProgress"])) throw new Error("Guest portfolio data has unsupported fields.");
            validateAccountData(parsed.account, "Guest portfolio"); validateLessonProgress(parsed.lessonProgress, "Guest lesson progress");
        } else if (["novaGuestLessons", "novaLessonProgress"].includes(key)) validateLessonProgress(parsed, key);
        else if (key === "novaProfile") {
            const fields = new Set(["email", "name", "signedInAt"]);
            if (!plainRecord(parsed, fields, ["email"]) || !validEmail(parsed.email) || (parsed.name !== undefined && (typeof parsed.name !== "string" || parsed.name.length > 80)) || (parsed.signedInAt !== undefined && !validDate(parsed.signedInAt))) throw new Error("Legacy profile data is invalid.");
        } else if (key === "turboTutorHistory" || key.startsWith("turboTutorHistory:")) validateChat(parsed, key);
        else if (key === "turboCommunityNotes" || key.startsWith("turboCommunityNotes:")) validateNotes(parsed, key);
        else if ((key === "turboRememberTutor" || key.startsWith("turboRememberTutor:")) && !["true", "false"].includes(value)) throw new Error("Tutor history preference is invalid.");
    }

    const users = payload.data.novaUsers ? JSON.parse(payload.data.novaUsers) : {};
    const legacy = payload.data.novaProfile ? JSON.parse(payload.data.novaProfile) : null;
    if (payload.data.novaSession && !Object.hasOwn(users, payload.data.novaSession) && legacy?.email !== payload.data.novaSession) throw new Error("The active profile does not match a profile in this backup.");
    if (legacy && users[legacy.email] && users[legacy.email].email !== legacy.email) throw new Error("Legacy and current profile records do not agree.");
    for (const key of keys) {
        const scope = /^(?:turboRememberTutor|turboTutorHistory|turboCommunityNotes):(.+)$/.exec(key)?.[1];
        if (scope && scope !== "guest") {
            const email = decodeURIComponent(scope);
            if (!Object.hasOwn(users, email) && legacy?.email !== email) throw new Error(`Profile-specific data for ${email} has no matching profile.`);
        }
    }
    return payload.data;
}

function snapshotAppData() {
    const data = {};
    for (let index = 0; index < localStorage.length; index++) {
        const key = localStorage.key(index);
        if (supportedBackupKey(key)) data[key] = localStorage.getItem(key);
    }
    return data;
}

function backupPayload(data) { return { product: "Turbo Stocks", formatVersion: BACKUP_VERSION, exportedAt: new Date().toISOString(), data }; }

function downloadJSON(payload, filename) {
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
    const link = document.createElement("a"); link.href = url; link.download = filename; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
}

function exportLocalBackup() {
    try {
        const data = snapshotAppData();
        const serialized = JSON.stringify(backupPayload(data), null, 2);
        if (new TextEncoder().encode(serialized).length > BACKUP_LIMIT) throw new Error("Backup exceeds the 10 MB file limit.");
        downloadJSON(backupPayload(data), "turbo-stocks-browser-backup.json");
    } catch (error) { reportStorage(`Could not export browser storage: ${error.message || "Allow site storage and try again."}`); }
}
window.exportLocalBackup = exportLocalBackup;

function activeImportLock(raw) {
    if (!raw) return false;
    try { const lock = JSON.parse(raw); return !Number.isFinite(lock.expiresAt) || lock.expiresAt > Date.now(); }
    catch { return true; }
}

function acquireImportLock() {
    const current = localStorage.getItem(IMPORT_LOCK_KEY);
    if (activeImportLock(current)) throw new Error("A backup import is already running in another tab. Wait and try again.");
    if (current) localStorage.removeItem(IMPORT_LOCK_KEY);
    const token = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const raw = JSON.stringify({ token, expiresAt: Date.now() + 120000 });
    localStorage.setItem(IMPORT_LOCK_KEY, raw);
    if (localStorage.getItem(IMPORT_LOCK_KEY) !== raw) throw new Error("Could not reserve browser storage for this import. Close other tabs and retry.");
    return token;
}

async function exclusiveImport(callback) {
    if (navigator.locks?.request) {
        return navigator.locks.request(IMPORT_LOCK_NAME, { mode: "exclusive", ifAvailable: true }, lock => {
            if (!lock) throw new Error("A backup import is already active in another tab.");
            return callback();
        });
    }
    return callback();
}

function statusText(node, message) { if (node) { node.textContent = message; node.replaceChildren?.(); } }

function restoreSnapshot(previous, imported) {
    const keys = new Set([...Object.keys(previous), ...Object.keys(imported)]), failures = [];
    for (const key of keys) {
        try {
            if (Object.hasOwn(previous, key)) localStorage.setItem(key, previous[key]);
            else localStorage.removeItem(key);
        } catch { failures.push(key); }
    }
    for (const key of keys) {
        try { if (localStorage.getItem(key) !== (Object.hasOwn(previous, key) ? previous[key] : null)) failures.push(key); }
        catch { failures.push(key); }
    }
    return [...new Set(failures)];
}

function recoveryDownload(previous, status) {
    try {
        const url = URL.createObjectURL(new Blob([JSON.stringify(backupPayload(previous), null, 2)], { type: "application/json" }));
        statusText(status, "Automatic rollback could not be fully verified. Download this recovery file and keep it safe: ");
        const link = document.createElement("a"); link.href = url; link.download = "turbo-stocks-recovery-backup.json"; link.textContent = "Download recovery backup"; status.appendChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 10 * 60 * 1000);
    } catch { statusText(status, "Automatic rollback could not be verified, and a recovery download could not be prepared. Stop using this tab. Check browser storage and export any remaining data before reloading."); }
}

function changedCategories(keys) {
    const categories = [];
    if (keys.some(key => ["novaUsers", "novaProfile", "novaSession"].includes(key))) categories.push("profiles and active profile");
    if (keys.some(key => /Account|StateV2/.test(key))) categories.push("paper portfolios and trades");
    if (keys.some(key => /Lessons|Progress/.test(key))) categories.push("lesson progress");
    if (keys.some(key => /TutorHistory/.test(key))) categories.push("tutor chats");
    if (keys.some(key => /CommunityNotes/.test(key))) categories.push("community notes");
    if (keys.some(key => /Theme|RememberTutor/.test(key))) categories.push("preferences");
    return categories.length ? categories.join(", ") : "saved app data";
}

async function performImport(input, status) {
    const token = acquireImportLock();
    let completed = false, refresh = false;
    try {
        const file = input.files?.[0];
        if (!file) return false;
        if (!Number.isFinite(file.size) || file.size > BACKUP_LIMIT) throw new Error("Choose a backup file no larger than 10 MB.");
        const text = await file.text();
        if (new TextEncoder().encode(text).length > BACKUP_LIMIT) throw new Error("The backup exceeds the 10 MB import limit.");
        const imported = validateBackup(safeJSON(text, "Backup file"));
        const previous = snapshotAppData(), initialSignature = JSON.stringify(Object.entries(previous).sort(([a], [b]) => a.localeCompare(b)));
        const previousUsers = previous.novaUsers ? Object.keys(JSON.parse(previous.novaUsers)).length : 0;
        const importedUsers = imported.novaUsers ? Object.keys(JSON.parse(imported.novaUsers)).length : 0;
        const affected = [...new Set([...Object.keys(previous), ...Object.keys(imported)])];
        const approved = window.confirm(`Backup replacement preview\nCurrent saved items: ${Object.keys(previous).length}\nItems in backup: ${Object.keys(imported).length}\nDemo profiles: ${previousUsers} current → ${importedUsers} in backup\nAffected categories: ${changedCategories(affected)}\nTurbo Stocks keys missing from the backup will be removed. Other applications' browser data is not included. Continue?`);
        if (!approved) return false;
        const current = snapshotAppData(), currentSignature = JSON.stringify(Object.entries(current).sort(([a], [b]) => a.localeCompare(b)));
        if (currentSignature !== initialSignature) throw new Error("Saved data changed while the backup was being reviewed. Nothing was replaced; retry the import.");

        try {
            for (const key of Object.keys(previous)) localStorage.removeItem(key);
            for (const [key, value] of Object.entries(imported)) localStorage.setItem(key, value);
            for (const key of affected) if (localStorage.getItem(key) !== (Object.hasOwn(imported, key) ? imported[key] : null)) throw new Error("A saved value did not match the imported backup.");
            completed = true; refresh = true;
        } catch (error) {
            const failed = restoreSnapshot(previous, imported);
            if (failed.length) recoveryDownload(previous, status);
            else statusText(status, `Import failed (${error.message || "browser storage rejected the write"}). The previous Turbo Stocks data was restored and verified.`);
            return false;
        }
    } finally {
        try {
            const raw = localStorage.getItem(IMPORT_LOCK_KEY);
            if (raw && JSON.parse(raw).token === token) localStorage.removeItem(IMPORT_LOCK_KEY);
        } catch {
            if (completed) { completed = false; statusText(status, "Backup data was saved, but the cross-tab import lock could not be cleared. Close other Turbo Stocks tabs and reload after storage works again."); }
        }
    }
    if (refresh && completed) {
        window.refreshWorkspaceFromStorage?.();
        statusText(status, "Backup imported and the current profile, portfolio, lessons, chats, and notes were refreshed.");
    }
    return completed;
}

async function importLocalBackup(input) {
    const status = document.getElementById("backupStatus");
    try {
        const run = () => performImport(input, status);
        if (navigator.locks?.request) await exclusiveImport(run);
        else await run();
    } catch (error) { statusText(status, `Import failed: ${error.message || "Check the file and browser storage."}`); }
    finally { if (input) input.value = ""; }
}
window.importLocalBackup = importLocalBackup;

function csvCell(value) {
    let text = String(value ?? "");
    if (/^[\s]*[=+@\-]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
}

function exportTradeHistoryCsv() {
    try {
        const trades = window.getFilteredTradeHistory?.() || [];
        const status = document.getElementById("historyExportStatus");
        if (!trades.length) { if (status) status.textContent = "No matching trades to export."; return; }
        const rows = [["timestamp", "side", "symbol", "shares", "sample_price", "total", "source", "fees"], ...trades.map(trade => [trade.timestamp || "", trade.side, trade.symbol, trade.shares, trade.price, trade.total ?? trade.shares * trade.price, trade.source || "", trade.fees ?? 0])];
        const blob = new Blob(["\uFEFF" + rows.map(row => row.map(csvCell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob), link = document.createElement("a"); link.href = url; link.download = "turbo-stocks-trade-history.csv"; link.click();
        if (status) status.textContent = `Exported ${trades.length} matching trades as CSV.`;
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { const status = document.getElementById("historyExportStatus"); if (status) status.textContent = "Could not export trade history. Try again or use Export browser backup."; }
}
window.exportTradeHistoryCsv = exportTradeHistoryCsv;

document.addEventListener("DOMContentLoaded", () => {
    const resetHelpPopovers = () => document.querySelectorAll(".help-trigger").forEach(trigger => trigger.setAttribute("aria-expanded", "false"));
    resetHelpPopovers();
    window.addEventListener("pageshow", resetHelpPopovers);
    document.getElementById("thirdPartyCharts")?.addEventListener("load", () => { if (document.querySelector("#markets-page.active")) loadTradingView(true); });
    const connection = document.getElementById("connectionStatus"), refreshConnection = () => { connection.hidden = navigator.onLine; };
    window.addEventListener("online", refreshConnection); window.addEventListener("offline", refreshConnection); refreshConnection();
    function keyboardCards() {
        document.querySelectorAll(".stock-item[onclick],.search-result[onclick]").forEach(el => {
            el.tabIndex = 0; el.setAttribute("role", "button");
            if (!el.dataset.keyboardReady) { el.dataset.keyboardReady = "true"; el.addEventListener("keydown", event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); el.click(); } }); }
        });
    }
    keyboardCards();
    new MutationObserver(keyboardCards).observe(document.getElementById("main-content"), { childList: true, subtree: true });
    document.addEventListener("click", event => {
        const trigger=event.target.closest?.(".help-trigger");
        document.querySelectorAll(".help-trigger[aria-expanded='true']").forEach(open=>{if(open!==trigger)open.setAttribute("aria-expanded","false");});
        if(trigger)trigger.setAttribute("aria-expanded",trigger.getAttribute("aria-expanded")==="true"?"false":"true");
    });
    document.addEventListener("keydown", event => {
        if(event.key!=="Escape")return;
        const open=document.querySelector(".help-trigger[aria-expanded='true']");
        if(open){open.setAttribute("aria-expanded","false");open.focus();}
    });
    const previousFocus = new Map();
    for (const modal of document.querySelectorAll(".modal")) new MutationObserver(() => {
        if (modal.classList.contains("open")) { previousFocus.set(modal, document.activeElement); modal.querySelector("input:not([hidden]),button")?.focus(); }
        else previousFocus.get(modal)?.focus();
    }).observe(modal, { attributes: true, attributeFilter: ["class"] });
    document.addEventListener("keydown", event => {
        const modal = [...document.querySelectorAll(".modal.open")].at(-1); if (!modal) return;
        if (event.key === "Escape") { closeAuth(); closeLesson(); return; }
        if (event.key === "Tab") {
            const nodes = [...modal.querySelectorAll("button,input,a[href],textarea,select")].filter(el => !el.hidden && !el.disabled && el.getClientRects().length);
            const first = nodes[0], last = nodes.at(-1); if (!first) return;
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        }
    });
    window.addEventListener("storage", event => {
        if (event.key === IMPORT_LOCK_KEY) {
            if (event.newValue) reportStorage("A backup is being imported in another tab. Saving is paused here.");
            else { window.refreshWorkspaceFromStorage?.(); reportStorage("Saved data was refreshed after the backup import in another tab."); }
            return;
        }
        if (![
            "novaSession", "novaUsers", "turboGuestStateV2", "novaGuestAccount", "novaGuestLessons", "novaTheme",
            "novaAccount", "novaLessonProgress", "novaProfile", "turboRememberTutor", "turboTutorHistory", "turboCommunityNotes"
        ].includes(event.key) && !/^(turboRememberTutor|turboTutorHistory|turboCommunityNotes):/.test(event.key || "")) return;
        if (activeImportLock(localStorage.getItem(IMPORT_LOCK_KEY))) return;
        window.refreshWorkspaceFromStorage?.();
        reportStorage("Local progress was updated from another tab.");
    });
    if ("serviceWorker" in navigator && window.isSecureContext) navigator.serviceWorker.register("/sw.js").catch(() => console.warn("Offline application shell could not be registered."));
});

document.addEventListener("DOMContentLoaded", () => {
    const input = document.getElementById("globalSearch");
    const results = document.getElementById("searchResults");
    const container = input?.closest(".global-search");
    if (!container || !results) return;
    const close = () => { results.style.display = "none"; };
    window.fitSearchResults = () => {
        const viewport = window.visualViewport;
        const bottom = viewport ? viewport.offsetTop + viewport.height : window.innerHeight;
        const top = container.getBoundingClientRect().bottom + 4;
        results.style.setProperty("--search-height", Math.max(0, Math.min(440, bottom - top - 12)) + "px");
    };
    window.addEventListener("resize", window.fitSearchResults);
    window.addEventListener("scroll", window.fitSearchResults, { passive: true });
    window.visualViewport?.addEventListener("resize", window.fitSearchResults);
    window.visualViewport?.addEventListener("scroll", window.fitSearchResults);
    input.addEventListener("focus", () => { if (input.value.trim()) globalSearch(); });
    document.addEventListener("pointerdown", event => { if (!container.contains(event.target)) close(); });
    container.addEventListener("focusout", event => { if (!container.contains(event.relatedTarget)) close(); });
    container.addEventListener("keydown", event => {
        if (event.key === "Escape") { input.focus(); close(); return; }
        if (!["ArrowDown", "ArrowUp"].includes(event.key)) return;
        event.preventDefault();
        if (results.style.display !== "block") globalSearch();
        const buttons = [...results.querySelectorAll("button")];
        if (!buttons.length) return;
        const index = buttons.indexOf(document.activeElement);
        const next = event.key === "ArrowDown" ? (index + 1) % buttons.length : (index <= 0 ? buttons.length - 1 : index - 1);
        buttons[next].focus();
        buttons[next].scrollIntoView({ block: "nearest" });
    });
});
