const state = {
  contracts: [],
  activeId: null,
  activeContract: null,
  activeFiles: [],
  saveTimer: null,
  isLoading: false,
  settings: null,
  editorMode: "word",
  activePageIndex: 0,
  pages: [],
  currentView: "home",
  google: {
    tokenClient: null,
    accessToken: null,
    pickerReady: false
  }
};

const elements = {
  homeView: document.querySelector("#homeView"),
  editorView: document.querySelector("#editorView"),
  backBtn: document.querySelector("#backBtn"),
  settingsBtn: document.querySelector("#settingsBtn"),
  newContractBtn: document.querySelector("#newContractBtn"),
  homeDriveBtn: document.querySelector("#homeDriveBtn"),
  homeRecentBtn: document.querySelector("#homeRecentBtn"),
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
  downloadHtmlBtn: document.querySelector("#downloadHtmlBtn"),
  deleteBtn: document.querySelector("#deleteBtn"),
  addPageBtn: document.querySelector("#addPageBtn"),
  removePageBtn: document.querySelector("#removePageBtn"),
  prevPageBtn: document.querySelector("#prevPageBtn"),
  nextPageBtn: document.querySelector("#nextPageBtn"),
  pageIndicator: document.querySelector("#pageIndicator"),
  pageList: document.querySelector("#pageList"),
  editorShell: document.querySelector("#editorShell"),
  editorModeBadge: document.querySelector("#editorModeBadge"),
  editor: document.querySelector("#editor"),
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

document.querySelectorAll(".toolbar button[data-command]").forEach(button => {
  button.addEventListener("click", () => {
    document.execCommand(button.dataset.command, false, null);
    elements.editor.focus();
    scheduleSave();
  });
});

document.querySelectorAll(".toolbar button[data-action]").forEach(button => {
  button.addEventListener("click", () => {
    runEditorAction(button.dataset.action);
    elements.editor.focus();
    scheduleSave();
  });
});

elements.backBtn.addEventListener("click", () => navigateHome());
elements.settingsBtn.addEventListener("click", openSettings);
elements.newContractBtn.addEventListener("click", createContract);
elements.homeDriveBtn.addEventListener("click", connectGoogleDrive);
elements.homeRecentBtn.addEventListener("click", () => elements.documentGallery.scrollIntoView({ behavior: "smooth" }));
elements.homeTemplatesBtn.addEventListener("click", duplicateContract);
elements.searchInput.addEventListener("input", renderDocumentGallery);
elements.duplicateBtn.addEventListener("click", duplicateContract);
elements.insertTextFileBtn.addEventListener("click", insertMostRecentTextFile);
elements.connectDriveBtn.addEventListener("click", connectGoogleDrive);
elements.fileInput.addEventListener("change", event => uploadSelectedFile(event.target.files?.[0]));
elements.settingsCloseBtn.addEventListener("click", () => elements.settingsDialog.close());
elements.titleInput.addEventListener("input", scheduleSave);
elements.categoryInput.addEventListener("input", scheduleSave);
elements.editor.addEventListener("input", scheduleSave);
elements.wordModeBtn.addEventListener("click", () => setEditorMode("word"));
elements.pdfModeBtn.addEventListener("click", () => setEditorMode("pdf"));
elements.downloadHtmlBtn.addEventListener("click", downloadHtml);
elements.deleteBtn.addEventListener("click", deleteContract);
elements.addPageBtn.addEventListener("click", addPage);
elements.removePageBtn.addEventListener("click", removeCurrentPage);
elements.prevPageBtn.addEventListener("click", () => changePage(state.activePageIndex - 1));
elements.nextPageBtn.addEventListener("click", () => changePage(state.activePageIndex + 1));
elements.settingsForm.addEventListener("submit", saveSettings);
window.addEventListener("popstate", handleRoute);

boot();

async function boot() {
  await loadSettings();
  initializeGoogleClients();
  setEditorMode("word");
  await loadContracts();
  await handleRoute();
}

async function loadSettings() {
  const response = await fetch("/api/settings");
  const data = await response.json();
  state.settings = data.settings;
  hydrateSettingsForm();
  updateDriveStatus();
}

async function loadContracts() {
  const response = await fetch("/api/contracts");
  const data = await response.json();
  state.contracts = data.contracts;
  renderDocumentGallery();
}

async function handleRoute() {
  const url = new URL(window.location.href);
  const docId = url.searchParams.get("doc");

  if (!docId) {
    setView("home");
    if (state.contracts.length && !state.activeId) {
      await selectContract(state.contracts[0].id, { openEditor: false, replaceRoute: true });
    }
    return;
  }

  await selectContract(docId, { openEditor: true, replaceRoute: true });
}

async function selectContract(id, options = { openEditor: true, replaceRoute: false }) {
  if (!id) {
    return;
  }

  state.activeId = id;
  renderDocumentGallery();
  lockEditor(true);
  setStatus("Loading contract...");

  const response = await fetch(`/api/contracts/${id}`);
  if (!response.ok) {
    navigateHome();
    return;
  }

  const data = await response.json();
  state.activeContract = data.contract;
  state.activeFiles = data.files || [];
  elements.titleInput.value = data.contract.title;
  elements.categoryInput.value = data.contract.category;

  const parsed = parseStoredContent(data.contract.content, data.contract.title);
  state.pages = parsed.pages;
  state.activePageIndex = 0;
  syncEditorToPage();
  renderPageList();
  renderFileList();

  lockEditor(false);
  elements.duplicateBtn.disabled = false;
  elements.deleteBtn.disabled = false;
  elements.downloadHtmlBtn.disabled = false;
  setStatus(`Saved ${formatDate(data.contract.updatedAt)}`);

  if (options.openEditor) {
    setView("editor");
  }

  if (options.openEditor) {
    updateRoute(id, options.replaceRoute);
  }
}

function updateRoute(id, replace = false) {
  const url = new URL(window.location.href);
  if (!id) {
    url.searchParams.delete("doc");
  } else {
    url.searchParams.set("doc", id);
  }

  const next = `${url.pathname}${url.search}`;
  if (replace) {
    window.history.replaceState({}, "", next);
  } else {
    window.history.pushState({}, "", next);
  }
}

function navigateHome() {
  setView("home");
  updateRoute("", false);
}

function parseStoredContent(content, fallbackTitle) {
  if (typeof content === "string") {
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed.pages) && parsed.pages.length) {
        return {
          pages: parsed.pages.map((page, index) => ({
            id: page.id || cryptoRandomId(),
            name: page.name || `Page ${index + 1}`,
            html: typeof page.html === "string" ? page.html : defaultPageHtml(fallbackTitle)
          }))
        };
      }
    } catch {}
  }

  return {
    pages: [
      {
        id: cryptoRandomId(),
        name: "Page 1",
        html: typeof content === "string" && content.trim() ? content : defaultPageHtml(fallbackTitle)
      }
    ]
  };
}

function serializePages() {
  return JSON.stringify({
    version: 1,
    pages: state.pages.map(page => ({
      id: page.id,
      name: page.name,
      html: page.html
    }))
  });
}

function filteredContracts() {
  const query = elements.searchInput.value.trim().toLowerCase();
  return state.contracts.filter(contract => {
    const haystack = `${contract.title} ${contract.category}`.toLowerCase();
    return haystack.includes(query);
  });
}

function renderDocumentGallery() {
  const filtered = filteredContracts();
  elements.galleryCount.textContent = `${filtered.length} file${filtered.length === 1 ? "" : "s"}`;
  elements.documentGallery.innerHTML = "";

  for (const contract of filtered) {
    const card = document.createElement("article");
    card.className = `gallery-card compact-card ${contract.id === state.activeId ? "active" : ""}`;
    card.innerHTML = `
      <button class="card-open-area" type="button">
        <div class="gallery-paper compact-paper">
          <div class="gallery-paper-top"></div>
          <h3>${escapeHtml(contract.title)}</h3>
          <p>${escapeHtml(contract.category)}</p>
          <div class="gallery-lines compact-lines">
            <span></span>
            <span></span>
          </div>
        </div>
      </button>
      <div class="gallery-card-meta compact-meta">
        <span>${contract.sourceContractId ? "Template copy" : "Base contract"}</span>
        <span>${formatDate(contract.updatedAt)}</span>
      </div>
      <div class="gallery-card-actions">
        <button class="ghost-btn card-action-open" type="button">Open</button>
        <button class="ghost-btn card-action-dup" type="button">Duplicate</button>
        <button class="ghost-btn card-action-edit" type="button">Edit</button>
      </div>
    `;

    card.querySelector(".card-open-area").addEventListener("click", () => selectContract(contract.id, { openEditor: true, replaceRoute: false }));
    card.querySelector(".card-action-open").addEventListener("click", () => selectContract(contract.id, { openEditor: false, replaceRoute: false }));
    card.querySelector(".card-action-edit").addEventListener("click", () => selectContract(contract.id, { openEditor: true, replaceRoute: false }));
    card.querySelector(".card-action-dup").addEventListener("click", async () => {
      state.activeId = contract.id;
      await duplicateContract();
    });

    elements.documentGallery.appendChild(card);
  }

  if (!filtered.length) {
    const empty = document.createElement("article");
    empty.className = "gallery-empty";
    empty.textContent = "No files found. Create a blank page to get started.";
    elements.documentGallery.appendChild(empty);
  }
}

function renderPageList() {
  elements.pageList.innerHTML = "";
  elements.pageIndicator.textContent = `Page ${state.activePageIndex + 1} of ${state.pages.length}`;
  elements.prevPageBtn.disabled = state.activePageIndex === 0;
  elements.nextPageBtn.disabled = state.activePageIndex >= state.pages.length - 1;
  elements.removePageBtn.disabled = state.pages.length <= 1;

  state.pages.forEach((page, index) => {
    const button = document.createElement("button");
    button.className = `page-card ${index === state.activePageIndex ? "active" : ""}`;
    button.innerHTML = `<strong>${escapeHtml(page.name)}</strong><span>${index === state.activePageIndex ? "Open now" : "Open page"}</span>`;
    button.addEventListener("click", () => changePage(index));
    elements.pageList.appendChild(button);
  });
}

function syncEditorToPage() {
  const page = state.pages[state.activePageIndex];
  elements.editor.innerHTML = page?.html || "";
  renderPageList();
}

function storeCurrentPageHtml() {
  if (state.pages[state.activePageIndex]) {
    state.pages[state.activePageIndex].html = elements.editor.innerHTML;
  }
}

function changePage(nextIndex) {
  if (nextIndex < 0 || nextIndex >= state.pages.length) {
    return;
  }
  storeCurrentPageHtml();
  state.activePageIndex = nextIndex;
  syncEditorToPage();
}

function addPage() {
  storeCurrentPageHtml();
  state.pages.push({
    id: cryptoRandomId(),
    name: `Page ${state.pages.length + 1}`,
    html: defaultPageHtml(elements.titleInput.value || "New contract")
  });
  state.activePageIndex = state.pages.length - 1;
  syncEditorToPage();
  scheduleSave();
}

function removeCurrentPage() {
  if (state.pages.length <= 1) {
    return;
  }
  state.pages.splice(state.activePageIndex, 1);
  state.activePageIndex = Math.max(0, state.activePageIndex - 1);
  syncEditorToPage();
  scheduleSave();
}

function setView(view) {
  state.currentView = view;
  elements.homeView.classList.toggle("hidden", view !== "home");
  elements.editorView.classList.toggle("hidden", view !== "editor");
  elements.backBtn.classList.toggle("hidden", view !== "editor");
}

function renderFileList() {
  elements.fileList.innerHTML = "";
  elements.fileCount.textContent = `${state.activeFiles.length} file${state.activeFiles.length === 1 ? "" : "s"}`;
  elements.insertTextFileBtn.disabled = !state.activeFiles.some(isTextLikeFile);

  if (!state.activeFiles.length) {
    const empty = document.createElement("p");
    empty.className = "drive-status";
    empty.textContent = "No attachments yet.";
    elements.fileList.appendChild(empty);
    return;
  }

  for (const file of state.activeFiles) {
    const item = document.createElement("article");
    item.className = "file-item";
    item.innerHTML = `
      <h3>${escapeHtml(file.name)}</h3>
      <div class="file-meta">
        <span>${escapeHtml(file.mimeType)}</span>
        <span>${formatBytes(file.sizeBytes)}</span>
      </div>
    `;

    const actions = document.createElement("div");
    actions.className = "file-item-actions";

    const downloadBtn = document.createElement("button");
    downloadBtn.className = "ghost-btn";
    downloadBtn.textContent = "Download";
    downloadBtn.addEventListener("click", () => downloadFile(file.id));
    actions.appendChild(downloadBtn);

    if (isTextLikeFile(file)) {
      const insertBtn = document.createElement("button");
      insertBtn.className = "ghost-btn";
      insertBtn.textContent = "Insert";
      insertBtn.addEventListener("click", () => insertFileIntoEditor(file.id));
      actions.appendChild(insertBtn);
    }

    item.appendChild(actions);
    elements.fileList.appendChild(item);
  }
}

async function createContract() {
  const response = await fetch("/api/contracts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "New contract",
      category: "General",
      content: JSON.stringify({
        version: 1,
        pages: [{ id: cryptoRandomId(), name: "Page 1", html: defaultPageHtml("New contract") }]
      })
    })
  });
  const data = await response.json();
  state.contracts.unshift(toListItem(data.contract, data.files));
  renderDocumentGallery();
  await selectContract(data.contract.id, { openEditor: true, replaceRoute: false });
}

async function duplicateContract() {
  if (!state.activeId) {
    return;
  }

  const response = await fetch(`/api/contracts/${state.activeId}/duplicate`, { method: "POST" });
  const data = await response.json();
  state.contracts.unshift(toListItem(data.contract, data.files));
  renderDocumentGallery();
  await selectContract(data.contract.id, { openEditor: true, replaceRoute: false });
}

async function deleteContract() {
  if (!state.activeId || !window.confirm("Delete this contract permanently?")) {
    return;
  }

  await fetch(`/api/contracts/${state.activeId}`, { method: "DELETE" });
  state.contracts = state.contracts.filter(contract => contract.id !== state.activeId);
  state.activeId = null;
  state.activeContract = null;
  state.activeFiles = [];
  state.pages = [];
  renderDocumentGallery();
  renderFileList();
  navigateHome();
}

function scheduleSave() {
  if (!state.activeId || state.isLoading) {
    return;
  }
  clearTimeout(state.saveTimer);
  state.saveTimer = window.setTimeout(saveActiveContract, 700);
}

async function saveActiveContract() {
  if (!state.activeId) {
    return;
  }
  storeCurrentPageHtml();

  const payload = {
    title: elements.titleInput.value.trim() || "Untitled contract",
    category: elements.categoryInput.value.trim() || "General",
    content: serializePages()
  };

  const response = await fetch(`/api/contracts/${state.activeId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  const item = state.contracts.find(contract => contract.id === state.activeId);
  if (item) {
    item.title = data.contract.title;
    item.category = data.contract.category;
    item.updatedAt = data.contract.updatedAt;
  }
  renderDocumentGallery();
  setStatus(`Saved ${formatDate(data.contract.updatedAt)}`);
}

async function uploadSelectedFile(file) {
  if (!file || !state.activeId) {
    return;
  }

  const base64Data = await readFileAsBase64(file);
  const response = await fetch(`/api/contracts/${state.activeId}/files`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: file.name,
      mimeType: file.type || "application/octet-stream",
      base64Data
    })
  });
  const data = await response.json();
  state.activeFiles.unshift(data.file);
  syncFileCountOnList();
  renderFileList();
  setView("editor");
  elements.fileInput.value = "";
}

async function downloadFile(fileId) {
  const response = await fetch(`/api/contracts/${state.activeId}/files/${fileId}`);
  const data = await response.json();
  const file = data.file;
  const blob = base64ToBlob(file.base64Data, file.mimeType);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  link.click();
  URL.revokeObjectURL(url);
}

async function insertMostRecentTextFile() {
  const latest = state.activeFiles.find(isTextLikeFile);
  if (latest) {
    await insertFileIntoEditor(latest.id);
  }
}

async function insertFileIntoEditor(fileId) {
  const response = await fetch(`/api/contracts/${state.activeId}/files/${fileId}`);
  const data = await response.json();
  const file = data.file;
  const text = atob(file.base64Data);
  document.execCommand("insertHTML", false, file.mimeType.includes("html") ? text : `<h2>${escapeHtml(file.name)}</h2><pre>${escapeHtml(text)}</pre>`);
  scheduleSave();
}

function downloadHtml() {
  storeCurrentPageHtml();
  const html = state.pages.map(page => `<section data-page="${escapeHtml(page.name)}">${page.html}</section>`).join("\n");
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${slugify(elements.titleInput.value || "contract")}.html`;
  link.click();
  URL.revokeObjectURL(url);
}

function runEditorAction(action) {
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
  elements.wordModeBtn.classList.toggle("active", isWord);
  elements.pdfModeBtn.classList.toggle("active", !isWord);
  elements.editorShell.classList.toggle("word-mode", isWord);
  elements.editorShell.classList.toggle("pdf-mode", !isWord);
  elements.editor.classList.toggle("pdf-editor", !isWord);
  elements.editorModeBadge.textContent = isWord ? "Pages mode" : "Pageless mode";
}

function openSettings() {
  hydrateSettingsForm();
  elements.settingsDialog.showModal();
}

async function saveSettings(event) {
  event.preventDefault();
  const payload = {
    googleDriveClientId: elements.googleDriveClientId.value.trim(),
    googleDriveApiKey: elements.googleDriveApiKey.value.trim(),
    googleDriveProjectNumber: elements.googleDriveProjectNumber.value.trim(),
    storageMode: elements.storageMode.value
  };

  const response = await fetch("/api/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  state.settings = data.settings;
  initializeGoogleClients();
  updateDriveStatus();
  elements.settingsDialog.close();
  setStatus("Cloud settings saved.");
}

function hydrateSettingsForm() {
  elements.googleDriveClientId.value = state.settings?.googleDriveClientId || "";
  elements.googleDriveApiKey.value = state.settings?.googleDriveApiKey || "";
  elements.googleDriveProjectNumber.value = state.settings?.googleDriveProjectNumber || "";
  elements.storageMode.value = state.settings?.storageMode || "database";
}

function initializeGoogleClients() {
  state.google.tokenClient = null;
  if (!state.settings?.googleDriveClientId) {
    updateDriveStatus();
    return;
  }

  if (window.google?.accounts?.oauth2) {
    state.google.tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: state.settings.googleDriveClientId,
      scope: "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly",
      callback: response => {
        if (response.error) {
          elements.driveStatus.textContent = `Drive authorization failed: ${response.error}`;
          return;
        }
        state.google.accessToken = response.access_token;
        updateDriveStatus();
        openDrivePicker();
      }
    });
  }

  if (window.gapi?.load) {
    window.gapi.load("picker", () => {
      state.google.pickerReady = true;
    });
  }

  updateDriveStatus();
}

function connectGoogleDrive() {
  if (!state.settings?.googleDriveClientId || !state.settings?.googleDriveApiKey || !state.settings?.googleDriveProjectNumber) {
    openSettings();
    return;
  }
  if (!state.google.tokenClient) initializeGoogleClients();
  if (!state.google.tokenClient) {
    elements.driveStatus.textContent = "Google sign-in is still loading.";
    return;
  }
  if (state.google.accessToken) return openDrivePicker();
  elements.driveStatus.textContent = "Requesting Drive access...";
  state.google.tokenClient.requestAccessToken({ prompt: "consent" });
}

function openDrivePicker() {
  if (!window.google?.picker || !state.google.accessToken || !state.google.pickerReady) {
    elements.driveStatus.textContent = "Google Picker is still loading.";
    return;
  }

  const picker = new google.picker.PickerBuilder()
    .setAppId(state.settings.googleDriveProjectNumber)
    .setDeveloperKey(state.settings.googleDriveApiKey)
    .setOAuthToken(state.google.accessToken)
    .addView(new google.picker.DocsView(google.picker.ViewId.DOCS))
    .addView(new google.picker.DocsUploadView())
    .setCallback(handleDrivePickerSelection)
    .build();
  picker.setVisible(true);
}

async function handleDrivePickerSelection(data) {
  if (!window.google?.picker || data.action !== google.picker.Action.PICKED || !data.docs?.length) return;
  const doc = data.docs[0];

  try {
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${doc.id}?alt=media`, {
      headers: { Authorization: `Bearer ${state.google.accessToken}` }
    });
    if (!response.ok) throw new Error("Could not download the selected Drive file.");

    const blob = await response.blob();
    const base64Data = await blobToBase64(blob);
    const uploadResponse = await fetch(`/api/contracts/${state.activeId}/files`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: doc.name,
        mimeType: blob.type || doc.mimeType || "application/octet-stream",
        base64Data
      })
    });
    const uploadData = await uploadResponse.json();
    state.activeFiles.unshift(uploadData.file);
    syncFileCountOnList();
    renderFileList();
  } catch (error) {
    elements.driveStatus.textContent = error.message;
  }
}

function updateDriveStatus() {
  if (!state.settings?.googleDriveClientId) {
    elements.driveStatus.textContent = "Drive not connected. Add Google Cloud keys in Cloud settings.";
    return;
  }
  elements.driveStatus.textContent = state.google.accessToken ? "Drive ready." : "Drive already configured.";
}

function syncFileCountOnList() {
  const item = state.contracts.find(contract => contract.id === state.activeId);
  if (item) item.fileCount = state.activeFiles.length;
  renderDocumentGallery();
}

function lockEditor(disabled) {
  state.isLoading = disabled;
  elements.titleInput.disabled = disabled;
  elements.categoryInput.disabled = disabled;
  elements.editor.contentEditable = disabled ? "false" : "true";
}

function setView(view) {
  state.currentView = view;
  elements.homeView.classList.toggle("hidden", view !== "home");
  elements.editorView.classList.toggle("hidden", view !== "editor");
  elements.backBtn.classList.toggle("hidden", view !== "editor");
}

function setStatus(message) {
  elements.saveStatus.textContent = message;
}

function formatDate(value) {
  if (!value) return "just now";
  return new Date(value).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function formatBytes(value) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function toListItem(contract, files = []) {
  return {
    id: contract.id,
    title: contract.title,
    category: contract.category,
    sourceContractId: contract.sourceContractId,
    updatedAt: contract.updatedAt,
    createdAt: contract.createdAt,
    fileCount: files.length
  };
}

function defaultPageHtml(title) {
  return `<h1>${escapeHtml(title)}</h1><p>Write your contract content here.</p><p>Add terms, pricing, and signatures on this page.</p>`;
}

function escapeHtml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function slugify(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function readFileAsBase64(file) {
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

function base64ToBlob(base64, mimeType) {
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
  return new Blob([bytes], { type: mimeType || "application/octet-stream" });
}

function isTextLikeFile(file) {
  return /text|json|xml|html|markdown/.test(file.mimeType);
}

function cryptoRandomId() {
  return Math.random().toString(36).slice(2, 10);
}
