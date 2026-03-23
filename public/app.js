const state = {
  contracts: [],
  activeId: null,
  activeFiles: [],
  settings: null,
  pages: [],
  activePageIndex: 0,
  editorMode: "word",
  writingMode: "editing",
  google: { tokenClient: null, accessToken: null, pickerReady: false }
};

const el = {
  homeView: document.querySelector("#homeView"),
  editorView: document.querySelector("#editorView"),
  backBtn: document.querySelector("#backBtn"),
  settingsBtn: document.querySelector("#settingsBtn"),
  newContractBtn: document.querySelector("#newContractBtn"),
  newGoogleDocBtn: document.querySelector("#newGoogleDocBtn"),
  homeDriveBtn: document.querySelector("#homeDriveBtn"),
  homeTemplatesBtn: document.querySelector("#homeTemplatesBtn"),
  searchInput: document.querySelector("#searchInput"),
  documentGallery: document.querySelector("#documentGallery"),
  galleryCount: document.querySelector("#galleryCount"),
  duplicateBtn: document.querySelector("#duplicateBtn"),
  insertTextFileBtn: document.querySelector("#insertTextFileBtn"),
  connectDriveBtn: document.querySelector("#connectDriveBtn"),
  driveStatus: document.querySelector("#driveStatus"),
  fileInput: document.querySelector("#fileInput"),
  titleInput: document.querySelector("#titleInput"),
  categoryInput: document.querySelector("#categoryInput"),
  saveStatus: document.querySelector("#saveStatus"),
  wordModeBtn: document.querySelector("#wordModeBtn"),
  pdfModeBtn: document.querySelector("#pdfModeBtn"),
  editingModeBtn: document.querySelector("#editingModeBtn"),
  suggestingModeBtn: document.querySelector("#suggestingModeBtn"),
  addCommentBtn: document.querySelector("#addCommentBtn"),
  openGoogleDocBtn: document.querySelector("#openGoogleDocBtn"),
  downloadHtmlBtn: document.querySelector("#downloadHtmlBtn"),
  deleteBtn: document.querySelector("#deleteBtn"),
  addPageBtn: document.querySelector("#addPageBtn"),
  removePageBtn: document.querySelector("#removePageBtn"),
  prevPageBtn: document.querySelector("#prevPageBtn"),
  nextPageBtn: document.querySelector("#nextPageBtn"),
  pageIndicator: document.querySelector("#pageIndicator"),
  pageList: document.querySelector("#pageList"),
  outlineList: document.querySelector("#outlineList"),
  wordCount: document.querySelector("#wordCount"),
  commentCount: document.querySelector("#commentCount"),
  commentsList: document.querySelector("#commentsList"),
  editorShell: document.querySelector("#editorShell"),
  editorModeBadge: document.querySelector("#editorModeBadge"),
  editor: document.querySelector("#editor"),
  pdfReviewPane: document.querySelector("#pdfReviewPane"),
  pdfFrame: document.querySelector("#pdfFrame"),
  pdfReviewLabel: document.querySelector("#pdfReviewLabel"),
  fileList: document.querySelector("#fileList"),
  fileCount: document.querySelector("#fileCount"),
  settingsDialog: document.querySelector("#settingsDialog"),
  settingsCloseBtn: document.querySelector("#settingsCloseBtn"),
  settingsForm: document.querySelector("#settingsForm"),
  googleDriveClientId: document.querySelector("#googleDriveClientId"),
  googleDriveApiKey: document.querySelector("#googleDriveApiKey"),
  googleDriveProjectNumber: document.querySelector("#googleDriveProjectNumber"),
  storageMode: document.querySelector("#storageMode")
};

document.querySelectorAll(".tools-row [data-command]").forEach(btn => btn.onclick = () => execCmd(btn.dataset.command));
document.querySelectorAll(".tools-row [data-action]").forEach(btn => btn.onclick = () => runAction(btn.dataset.action));
el.backBtn.onclick = () => goHome();
el.settingsBtn.onclick = () => openSettings();
el.newContractBtn.onclick = () => createContract();
el.newGoogleDocBtn.onclick = () => window.open("https://docs.new", "_blank", "noopener,noreferrer");
el.homeDriveBtn.onclick = () => connectGoogleDrive();
el.homeTemplatesBtn.onclick = () => duplicateContract();
el.searchInput.oninput = () => renderGallery();
el.duplicateBtn.onclick = () => duplicateContract();
el.insertTextFileBtn.onclick = () => insertRecentText();
el.connectDriveBtn.onclick = () => connectGoogleDrive();
el.fileInput.onchange = e => uploadFile(e.target.files?.[0]);
el.settingsCloseBtn.onclick = () => el.settingsDialog.close();
el.titleInput.oninput = scheduleSave;
el.categoryInput.oninput = scheduleSave;
el.editor.oninput = () => {
  if (state.pages[state.activePageIndex]) state.pages[state.activePageIndex].html = el.editor.innerHTML;
  refreshSidebars();
  scheduleSave();
};
el.wordModeBtn.onclick = () => setEditorMode("word");
el.pdfModeBtn.onclick = () => setEditorMode("pdf");
el.editingModeBtn.onclick = () => setWritingMode("editing");
el.suggestingModeBtn.onclick = () => setWritingMode("suggesting");
el.addCommentBtn.onclick = () => addComment();
el.openGoogleDocBtn.onclick = () => window.open("https://docs.google.com/document/u/0/", "_blank", "noopener,noreferrer");
el.downloadHtmlBtn.onclick = () => downloadHtml();
el.deleteBtn.onclick = () => deleteContract();
el.addPageBtn.onclick = () => addPage();
el.removePageBtn.onclick = () => removePage();
el.prevPageBtn.onclick = () => changePage(state.activePageIndex - 1);
el.nextPageBtn.onclick = () => changePage(state.activePageIndex + 1);
el.settingsForm.onsubmit = saveSettings;
window.onpopstate = () => loadFromRoute();

boot();

async function boot() {
  await loadSettings();
  initGoogle();
  setEditorMode("word");
  setWritingMode("editing");
  await loadContracts();
  await loadFromRoute();
}

async function loadSettings() {
  const r = await fetch("/api/settings");
  const data = await r.json();
  state.settings = data.settings;
  el.googleDriveClientId.value = state.settings.googleDriveClientId || "";
  el.googleDriveApiKey.value = state.settings.googleDriveApiKey || "";
  el.googleDriveProjectNumber.value = state.settings.googleDriveProjectNumber || "";
  el.storageMode.value = state.settings.storageMode || "database";
  updateDriveStatus();
}

async function loadContracts() {
  const r = await fetch("/api/contracts");
  state.contracts = (await r.json()).contracts;
  renderGallery();
}

async function loadFromRoute() {
  const id = new URL(window.location.href).searchParams.get("doc");
  if (!id) return setView("home");
  await openContract(id, true);
}

function parseContent(content, title) {
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed.pages) && parsed.pages.length) return parsed.pages.map((p, i) => ({ id: p.id || rid(), name: p.name || `Page ${i + 1}`, html: p.html || defaultHtml(title), comments: p.comments || [] }));
  } catch {}
  return [{ id: rid(), name: "Page 1", html: content || defaultHtml(title), comments: [] }];
}

async function openContract(id, pushRoute) {
  state.activeId = id;
  const r = await fetch(`/api/contracts/${id}`);
  const data = await r.json();
  state.activeFiles = data.files || [];
  state.pages = parseContent(data.contract.content, data.contract.title);
  state.activePageIndex = 0;
  el.titleInput.value = data.contract.title;
  el.categoryInput.value = data.contract.category;
  el.editor.innerHTML = state.pages[0].html;
  renderGallery();
  refreshSidebars();
  renderFiles();
  el.duplicateBtn.disabled = false;
  el.deleteBtn.disabled = false;
  el.downloadHtmlBtn.disabled = false;
  setView("editor");
  if (pushRoute) setRoute(id);
}

function renderGallery() {
  const q = el.searchInput.value.trim().toLowerCase();
  const docs = state.contracts.filter(c => `${c.title} ${c.category}`.toLowerCase().includes(q));
  el.galleryCount.textContent = `${docs.length} file${docs.length === 1 ? "" : "s"}`;
  el.documentGallery.innerHTML = docs.map(c => `
    <article class="gallery-card compact-card ${c.id === state.activeId ? "active" : ""}">
      <button class="card-open-area" type="button" data-id="${c.id}">
        <div class="gallery-paper compact-paper">
          <div class="gallery-paper-top"></div>
          <h3>${esc(c.title)}</h3><p>${esc(c.category)}</p>
          <div class="gallery-lines compact-lines"><span></span><span></span></div>
        </div>
      </button>
      <div class="gallery-card-meta compact-meta"><span>${c.sourceContractId ? "Template copy" : "Base contract"}</span><span>${fmtDate(c.updatedAt)}</span></div>
      <div class="gallery-card-actions">
        <button class="ghost-btn open-doc" data-id="${c.id}" type="button">Open</button>
        <button class="ghost-btn dup-doc" data-id="${c.id}" type="button">Duplicate</button>
        <button class="ghost-btn edit-doc" data-id="${c.id}" type="button">Edit</button>
      </div>
    </article>`).join("") || `<article class="gallery-empty">No files found. Create a blank page to get started.</article>`;
  el.documentGallery.querySelectorAll("[data-id]").forEach(btn => btn.onclick = async () => {
    state.activeId = btn.dataset.id;
    if (btn.classList.contains("dup-doc")) return duplicateContract();
    await openContract(btn.dataset.id, true);
  });
}

function refreshSidebars() {
  const page = state.pages[state.activePageIndex];
  el.pageIndicator.textContent = `Page ${state.activePageIndex + 1} of ${state.pages.length}`;
  el.pageList.innerHTML = state.pages.map((p, i) => `<button class="page-card ${i === state.activePageIndex ? "active" : ""}" data-index="${i}"><strong>${esc(p.name)}</strong><span>${i === state.activePageIndex ? "Open now" : "Open page"}</span></button>`).join("");
  el.pageList.querySelectorAll("[data-index]").forEach(btn => btn.onclick = () => changePage(Number(btn.dataset.index)));
  const wrapper = document.createElement("div");
  wrapper.innerHTML = page?.html || "";
  const headings = [...wrapper.querySelectorAll("h1,h2,h3")];
  el.outlineList.innerHTML = headings.length ? headings.map((h, i) => `<button class="outline-item" data-outline="${i}">${i + 1}. ${esc(h.textContent.trim() || "Untitled heading")}</button>`).join("") : `<p class="empty-note">Add headings to build the outline.</p>`;
  el.commentsList.innerHTML = (page?.comments || []).length ? page.comments.map(c => `<article class="comment-item"><strong>${esc(c.author || "You")}</strong><p>${esc(c.text)}</p><small>${fmtDate(c.createdAt)}</small></article>`).join("") : `<p class="empty-note">No comments on this page yet.</p>`;
  el.commentCount.textContent = String((page?.comments || []).length);
  const words = el.editor.innerText.trim();
  el.wordCount.textContent = `${words ? words.split(/\s+/).length : 0} words`;
}

function renderFiles() {
  el.fileCount.textContent = `${state.activeFiles.length} file${state.activeFiles.length === 1 ? "" : "s"}`;
  el.insertTextFileBtn.disabled = !state.activeFiles.some(isTextFile);
  el.fileList.innerHTML = state.activeFiles.length ? "" : `<p class="empty-note">No attachments yet.</p>`;
  state.activeFiles.forEach(file => {
    const article = document.createElement("article");
    article.className = "file-item";
    article.innerHTML = `<h3>${esc(file.name)}</h3><div class="file-meta"><span>${esc(file.mimeType)}</span><span>${fmtBytes(file.sizeBytes)}</span></div>`;
    const actions = document.createElement("div");
    actions.className = "file-item-actions";
    actions.innerHTML = `<button class="ghost-btn" data-kind="download">Download</button>${isTextFile(file) ? `<button class="ghost-btn" data-kind="insert">Insert</button>` : ""}${isPdf(file) ? `<button class="ghost-btn" data-kind="pdf">Review PDF</button>` : ""}`;
    actions.querySelectorAll("[data-kind]").forEach(btn => btn.onclick = () => fileAction(file, btn.dataset.kind));
    article.appendChild(actions);
    el.fileList.appendChild(article);
  });
}

function changePage(index) {
  if (index < 0 || index >= state.pages.length) return;
  state.pages[state.activePageIndex].html = el.editor.innerHTML;
  state.activePageIndex = index;
  el.editor.innerHTML = state.pages[index].html;
  hidePdf();
  refreshSidebars();
}

function addPage() {
  state.pages.push({ id: rid(), name: `Page ${state.pages.length + 1}`, html: defaultHtml(el.titleInput.value || "New contract"), comments: [] });
  changePage(state.pages.length - 1);
  scheduleSave();
}

function removePage() {
  if (state.pages.length <= 1) return;
  state.pages.splice(state.activePageIndex, 1);
  changePage(Math.max(0, state.activePageIndex - 1));
  scheduleSave();
}

async function createContract() {
  const r = await fetch("/api/contracts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "New contract", category: "General", content: JSON.stringify({ version: 2, pages: [{ id: rid(), name: "Page 1", html: defaultHtml("New contract"), comments: [] }] }) })
  });
  const data = await r.json();
  state.contracts.unshift(listItem(data.contract, data.files));
  renderGallery();
  await openContract(data.contract.id, true);
}

async function duplicateContract() {
  if (!state.activeId) return;
  const r = await fetch(`/api/contracts/${state.activeId}/duplicate`, { method: "POST" });
  const data = await r.json();
  state.contracts.unshift(listItem(data.contract, data.files));
  renderGallery();
  await openContract(data.contract.id, true);
}

async function deleteContract() {
  if (!state.activeId || !window.confirm("Delete this contract permanently?")) return;
  await fetch(`/api/contracts/${state.activeId}`, { method: "DELETE" });
  state.contracts = state.contracts.filter(c => c.id !== state.activeId);
  state.activeId = null;
  state.pages = [];
  state.activeFiles = [];
  renderGallery();
  renderFiles();
  goHome();
}

function scheduleSave() {
  if (!state.activeId) return;
  clearTimeout(state.saveTimer);
  state.saveTimer = setTimeout(saveContract, 700);
}

async function saveContract() {
  if (!state.activeId) return;
  state.pages[state.activePageIndex].html = el.editor.innerHTML;
  const r = await fetch(`/api/contracts/${state.activeId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: el.titleInput.value.trim() || "Untitled contract", category: el.categoryInput.value.trim() || "General", content: JSON.stringify({ version: 2, pages: state.pages }) })
  });
  const data = await r.json();
  const item = state.contracts.find(c => c.id === state.activeId);
  if (item) {
    item.title = data.contract.title;
    item.category = data.contract.category;
    item.updatedAt = data.contract.updatedAt;
  }
  renderGallery();
  setStatus(`Saved ${fmtDate(data.contract.updatedAt)}`);
}

async function uploadFile(file) {
  if (!file) return;
  if (!state.activeId) await createContract();
  const base64Data = await asBase64(file);
  const r = await fetch(`/api/contracts/${state.activeId}/files`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: file.name, mimeType: file.type || "application/octet-stream", base64Data })
  });
  const data = await r.json();
  state.activeFiles.unshift(data.file);
  renderFiles();
  renderGallery();
  setView("editor");
  if (isPdf(data.file)) await openPdf(data.file.id, data.file.name);
}

async function fileAction(file, kind) {
  if (kind === "download") return downloadFile(file.id);
  if (kind === "insert") return insertFile(file.id);
  if (kind === "pdf") return openPdf(file.id, file.name);
}

async function downloadFile(fileId) {
  const file = await fetchFile(fileId);
  const blob = toBlob(file.base64Data, file.mimeType);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  a.click();
  URL.revokeObjectURL(url);
}

async function insertRecentText() {
  const latest = state.activeFiles.find(isTextFile);
  if (latest) await insertFile(latest.id);
}

async function insertFile(fileId) {
  const file = await fetchFile(fileId);
  const text = atob(file.base64Data);
  document.execCommand("insertHTML", false, file.mimeType.includes("html") ? text : `<h2>${esc(file.name)}</h2><pre>${esc(text)}</pre>`);
  refreshDerivedViews();
  scheduleSave();
}

async function openPdf(fileId, label) {
  const file = await fetchFile(fileId);
  const blob = toBlob(file.base64Data, file.mimeType);
  el.pdfFrame.src = URL.createObjectURL(blob);
  el.pdfReviewLabel.textContent = label;
  el.pdfReviewPane.classList.remove("hidden");
}

function hidePdf() {
  el.pdfReviewPane.classList.add("hidden");
  el.pdfFrame.removeAttribute("src");
  el.pdfReviewLabel.textContent = "No PDF selected";
}

function downloadHtml() {
  state.pages[state.activePageIndex].html = el.editor.innerHTML;
  const html = state.pages.map(p => `<section data-page="${esc(p.name)}">${p.html}</section>`).join("\n");
  const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slug(el.titleInput.value || "contract")}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

function execCmd(command) {
  document.execCommand(command, false, null);
  el.editor.focus();
}

function runAction(action) {
  if (action === "h1") return document.execCommand("formatBlock", false, "<h1>");
  if (action === "h2") return document.execCommand("formatBlock", false, "<h2>");
  if (action === "paragraph") return document.execCommand("formatBlock", false, "<p>");
  if (action === "table") return document.execCommand("insertHTML", false, `<table><thead><tr><th>Item</th><th>Due date</th><th>Notes</th></tr></thead><tbody><tr><td></td><td></td><td></td></tr></tbody></table><p></p>`);
  if (action === "signature") return document.execCommand("insertHTML", false, `<p>Signature: ____________________________</p><p>Name: _________________________________</p>`);
  if (action === "smartchip") return document.execCommand("insertHTML", false, `<span class="smart-chip">@Client Name</span>`);
  if (action === "dropdownchip") return document.execCommand("insertHTML", false, `<span class="smart-chip dropdown-chip">Status: Draft</span>`);
  if (action === "meetingnotes") return document.execCommand("insertHTML", false, `<h2>Meeting notes</h2><p><strong>Date:</strong> [Add date]</p><p><strong>Attendees:</strong> [Add names]</p><ul><li>Decision 1</li><li>Action item 1</li></ul>`);
}

function setEditorMode(mode) {
  state.editorMode = mode;
  const isWord = mode === "word";
  el.wordModeBtn.classList.toggle("active", isWord);
  el.pdfModeBtn.classList.toggle("active", !isWord);
  el.editorShell.classList.toggle("word-mode", isWord);
  el.editorShell.classList.toggle("pdf-mode", !isWord);
  el.editor.classList.toggle("pdf-editor", !isWord);
  el.editorModeBadge.textContent = isWord ? "Pages mode" : "Pageless mode";
}

function setWritingMode(mode) {
  state.writingMode = mode;
  el.editingModeBtn.classList.toggle("active", mode === "editing");
  el.suggestingModeBtn.classList.toggle("active", mode === "suggesting");
  el.editor.classList.toggle("suggesting-editor", mode === "suggesting");
}

function addComment() {
  const text = window.prompt("Add a comment for this page:");
  if (!text) return;
  state.pages[state.activePageIndex].comments.unshift({ id: rid(), author: "You", text, createdAt: new Date().toISOString() });
  renderComments();
  scheduleSave();
}

function openSettings() {
  el.googleDriveClientId.value = state.settings?.googleDriveClientId || "";
  el.googleDriveApiKey.value = state.settings?.googleDriveApiKey || "";
  el.googleDriveProjectNumber.value = state.settings?.googleDriveProjectNumber || "";
  el.storageMode.value = state.settings?.storageMode || "database";
  el.settingsDialog.showModal();
}

async function saveSettings(event) {
  event.preventDefault();
  const r = await fetch("/api/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      googleDriveClientId: el.googleDriveClientId.value.trim(),
      googleDriveApiKey: el.googleDriveApiKey.value.trim(),
      googleDriveProjectNumber: el.googleDriveProjectNumber.value.trim(),
      storageMode: el.storageMode.value
    })
  });
  state.settings = (await r.json()).settings;
  initGoogle();
  updateDriveStatus();
  el.settingsDialog.close();
}

function initGoogle() {
  state.google.tokenClient = null;
  if (!state.settings?.googleDriveClientId) return;
  if (window.google?.accounts?.oauth2) {
    state.google.tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: state.settings.googleDriveClientId,
      scope: "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly",
      callback: resp => {
        if (resp.error) return (el.driveStatus.textContent = `Drive authorization failed: ${resp.error}`);
        state.google.accessToken = resp.access_token;
        updateDriveStatus();
        openPicker();
      }
    });
  }
  if (window.gapi?.load) window.gapi.load("picker", () => (state.google.pickerReady = true));
}

function connectGoogleDrive() {
  if (!state.settings?.googleDriveClientId || !state.settings?.googleDriveApiKey || !state.settings?.googleDriveProjectNumber) return openSettings();
  if (!state.google.tokenClient) initGoogle();
  if (!state.google.tokenClient) return (el.driveStatus.textContent = "Google sign-in is still loading.");
  if (state.google.accessToken) return openPicker();
  el.driveStatus.textContent = "Requesting Drive access...";
  state.google.tokenClient.requestAccessToken({ prompt: "consent" });
}

function openPicker() {
  if (!window.google?.picker || !state.google.accessToken || !state.google.pickerReady) return (el.driveStatus.textContent = "Google Picker is still loading.");
  const picker = new google.picker.PickerBuilder()
    .setAppId(state.settings.googleDriveProjectNumber)
    .setDeveloperKey(state.settings.googleDriveApiKey)
    .setOAuthToken(state.google.accessToken)
    .addView(new google.picker.DocsView(google.picker.ViewId.DOCS))
    .addView(new google.picker.DocsUploadView())
    .setCallback(async data => {
      if (data.action !== google.picker.Action.PICKED || !data.docs?.length) return;
      const doc = data.docs[0];
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${doc.id}?alt=media`, { headers: { Authorization: `Bearer ${state.google.accessToken}` } });
      if (!res.ok) return (el.driveStatus.textContent = "Could not download the selected Drive file.");
      const blob = await res.blob();
      const base64Data = await blobToBase64(blob);
      if (!state.activeId) await createContract();
      const upload = await fetch(`/api/contracts/${state.activeId}/files`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: doc.name, mimeType: blob.type || doc.mimeType || "application/octet-stream", base64Data })
      });
      const data2 = await upload.json();
      state.activeFiles.unshift(data2.file);
      renderFiles();
    })
    .build();
  picker.setVisible(true);
}

function updateDriveStatus() {
  el.driveStatus.textContent = !state.settings?.googleDriveClientId ? "Drive not connected. Add Google Cloud keys in Cloud settings." : state.google.accessToken ? "Drive ready." : "Drive already configured.";
}

function setRoute(id, replace = false) {
  const url = new URL(window.location.href);
  if (id) url.searchParams.set("doc", id);
  else url.searchParams.delete("doc");
  const next = `${url.pathname}${url.search}`;
  if (replace) history.replaceState({}, "", next);
  else history.pushState({}, "", next);
}

function goHome() {
  setView("home");
  setRoute("", false);
}

async function fetchFile(fileId) {
  const r = await fetch(`/api/contracts/${state.activeId}/files/${fileId}`);
  return (await r.json()).file;
}

function listItem(contract, files = []) {
  return { id: contract.id, title: contract.title, category: contract.category, sourceContractId: contract.sourceContractId, updatedAt: contract.updatedAt, createdAt: contract.createdAt, fileCount: files.length };
}

function setView(view) {
  el.homeView.classList.toggle("hidden", view !== "home");
  el.editorView.classList.toggle("hidden", view !== "editor");
  el.backBtn.classList.toggle("hidden", view !== "editor");
}

function lockEditor(disabled) {
  el.titleInput.disabled = disabled;
  el.categoryInput.disabled = disabled;
  el.editor.contentEditable = disabled ? "false" : "true";
}

function setStatus(message) {
  el.saveStatus.textContent = message;
}

function fmtDate(v) {
  if (!v) return "just now";
  return new Date(v).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function fmtBytes(v) {
  if (v < 1024) return `${v} B`;
  if (v < 1024 * 1024) return `${(v / 1024).toFixed(1)} KB`;
  return `${(v / (1024 * 1024)).toFixed(1)} MB`;
}

function defaultHtml(title) {
  return `<h1>${esc(title)}</h1><p>Write your contract content here.</p><p>Add terms, pricing, and signatures on this page.</p>`;
}

function esc(v) {
  return String(v).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function slug(v) {
  return String(v).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function rid() {
  return Math.random().toString(36).slice(2, 10);
}

function isTextFile(file) {
  return /text|json|xml|html|markdown/.test(file.mimeType);
}

function isPdf(file) {
  return file.mimeType === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

function asBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function toBlob(base64, mimeType) {
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
  return new Blob([bytes], { type: mimeType || "application/octet-stream" });
}
