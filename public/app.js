const state = {
  contracts: [],
  activeId: null,
  activeContract: null,
  activeFiles: [],
  settings: null,
  pages: [],
  activePageIndex: 0,
  editorMode: "word",
  writingMode: "editing",
  saveTimer: null,
  richEditor: null,
  google: { tokenClient: null, accessToken: null, pickerReady: false, pendingAction: null }
};

const el = {
  homeView: document.querySelector("#homeView"),
  editorView: document.querySelector("#editorView"),
  backBtn: document.querySelector("#backBtn"),
  settingsBtn: document.querySelector("#settingsBtn"),
  settingsBtnEditor: document.querySelector("#settingsBtnEditor"),
  newContractBtn: document.querySelector("#newContractBtn"),
  createGoogleDocBtn: document.querySelector("#createGoogleDocBtn"),
  aiGoogleDocBtn: document.querySelector("#aiGoogleDocBtn"),
  importDriveBtn: document.querySelector("#importDriveBtn"),
  homeDriveBtn: document.querySelector("#homeDriveBtn"),
  homeTemplatesBtn: document.querySelector("#homeTemplatesBtn"),
  searchInput: document.querySelector("#searchInput"),
  documentGallery: document.querySelector("#documentGallery"),
  galleryCount: document.querySelector("#galleryCount"),
  editorDocStrip: document.querySelector("#editorDocStrip"),
  editorGalleryCount: document.querySelector("#editorGalleryCount"),
  duplicateBtn: document.querySelector("#duplicateBtn"),
  generateBtn: document.querySelector("#generateBtn"),
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
  downloadHtmlBtn: document.querySelector("#downloadHtmlBtn"),
  deleteBtn: document.querySelector("#deleteBtn"),
  createGoogleDocEditorBtn: document.querySelector("#createGoogleDocEditorBtn"),
  aiGoogleDocEditorBtn: document.querySelector("#aiGoogleDocEditorBtn"),
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
  driveImportLabel: document.querySelector("#driveImportLabel"),
  settingsDialog: document.querySelector("#settingsDialog"),
  settingsCloseBtn: document.querySelector("#settingsCloseBtn"),
  settingsForm: document.querySelector("#settingsForm"),
  googleDriveClientId: document.querySelector("#googleDriveClientId"),
  googleDriveApiKey: document.querySelector("#googleDriveApiKey"),
  googleDriveProjectNumber: document.querySelector("#googleDriveProjectNumber"),
  storageMode: document.querySelector("#storageMode"),
  generateDialog: document.querySelector("#generateDialog"),
  generateCloseBtn: document.querySelector("#generateCloseBtn"),
  generateForm: document.querySelector("#generateForm"),
  generateTitle: document.querySelector("#generateTitle"),
  generateInstructions: document.querySelector("#generateInstructions"),
  generateSource: document.querySelector("#generateSource"),
  generateHint: document.querySelector("#generateHint"),
  aiDocDialog: document.querySelector("#aiDocDialog"),
  aiDocCloseBtn: document.querySelector("#aiDocCloseBtn"),
  aiDocForm: document.querySelector("#aiDocForm"),
  aiDocTitle: document.querySelector("#aiDocTitle"),
  aiDocPrompt: document.querySelector("#aiDocPrompt"),
  aiDocUseCurrent: document.querySelector("#aiDocUseCurrent"),
  aiDocHint: document.querySelector("#aiDocHint"),
  workspaceBannerTitle: document.querySelector("#workspaceBannerTitle")
};

document.querySelectorAll(".tools-row [data-command]").forEach((btn) => {
  btn.onclick = () => execCmd(btn.dataset.command);
});
document.querySelectorAll(".tools-row [data-action]").forEach((btn) => {
  btn.onclick = () => runAction(btn.dataset.action);
});

el.backBtn.onclick = () => goHome();
el.settingsBtn.onclick = () => openSettings();
el.settingsBtnEditor.onclick = () => openSettings();
el.newContractBtn.onclick = () => createContract();
el.createGoogleDocBtn.onclick = () => createGoogleDocFromCurrent();
el.aiGoogleDocBtn.onclick = () => openAiDocDialog();
el.importDriveBtn.onclick = () => connectGoogleDrive("import");
el.homeDriveBtn.onclick = () => connectGoogleDrive("import");
el.homeTemplatesBtn.onclick = () => openGenerateDialog();
el.searchInput.oninput = () => renderGallery();
el.duplicateBtn.onclick = () => duplicateContract();
el.generateBtn.onclick = () => openGenerateDialog();
el.insertTextFileBtn.onclick = () => insertRecentText();
el.connectDriveBtn.onclick = () => connectGoogleDrive("import");
el.fileInput.onchange = (event) => uploadFile(event.target.files?.[0]);
el.settingsCloseBtn.onclick = () => el.settingsDialog.close();
el.generateCloseBtn.onclick = () => el.generateDialog.close();
el.titleInput.oninput = () => scheduleSave();
el.categoryInput.oninput = () => scheduleSave();
el.wordModeBtn.onclick = () => setEditorMode("word");
el.pdfModeBtn.onclick = () => setEditorMode("pdf");
el.editingModeBtn.onclick = () => setWritingMode("editing");
el.suggestingModeBtn.onclick = () => setWritingMode("suggesting");
el.addCommentBtn.onclick = () => addComment();
el.downloadHtmlBtn.onclick = () => downloadHtml();
el.deleteBtn.onclick = () => deleteContract();
el.createGoogleDocEditorBtn.onclick = () => createGoogleDocFromCurrent();
el.aiGoogleDocEditorBtn.onclick = () => openAiDocDialog();
el.addPageBtn.onclick = () => addPage();
el.removePageBtn.onclick = () => removePage();
el.prevPageBtn.onclick = () => changePage(state.activePageIndex - 1);
el.nextPageBtn.onclick = () => changePage(state.activePageIndex + 1);
el.settingsForm.onsubmit = saveSettings;
el.generateForm.onsubmit = submitGenerateSimilar;
el.aiDocCloseBtn.onclick = () => el.aiDocDialog.close();
el.aiDocForm.onsubmit = submitAiGoogleDoc;
window.onpopstate = () => loadFromRoute();

boot();

async function boot() {
  await initEditor();
  await loadSettings();
  initGoogle();
  setEditorMode("word");
  setWritingMode("editing");
  setButtonsDisabled(true);
  await loadContracts();
  await loadFromRoute();
}

function initEditor() {
  return new Promise((resolve) => {
    if (!window.tinymce) {
      resolve();
      return;
    }

    window.tinymce.init({
      target: el.editor,
      menubar: false,
      statusbar: false,
      branding: false,
      resize: false,
      promotion: false,
      plugins: "lists table link image autoresize",
      toolbar: false,
      min_height: 520,
      setup(editor) {
        editor.on("init", () => {
          state.richEditor = editor;
          setEditorHtml("");
          resolve();
        });
        editor.on("input change keyup undo redo SetContent", () => {
          syncCurrentPageFromEditor();
          refreshInspector();
          scheduleSave();
        });
      }
    });
  });
}

async function loadSettings() {
  const response = await fetch("/api/settings");
  const data = await response.json();
  state.settings = data.settings || {};
  el.googleDriveClientId.value = state.settings.googleDriveClientId || "";
  el.googleDriveApiKey.value = state.settings.googleDriveApiKey || "";
  el.googleDriveProjectNumber.value = state.settings.googleDriveProjectNumber || "";
  el.storageMode.value = state.settings.storageMode || "database";
  updateDriveStatus("Drive not connected.");
}

async function loadContracts() {
  const response = await fetch("/api/contracts");
  const data = await response.json();
  state.contracts = data.contracts || [];
  renderGallery();
}

async function loadFromRoute() {
  const id = new URL(window.location.href).searchParams.get("doc");
  if (!id && state.contracts.length) {
    await openContract(state.contracts[0].id, true);
    return;
  }
  if (!id) {
    setView("home");
    return;
  }
  await openContract(id, true);
}

function parseStoredPages(content, title) {
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed.pages) && parsed.pages.length) {
      return parsed.pages.map((page, index) => ({
        id: page.id || rid(),
        name: page.name || `Page ${index + 1}`,
        html: page.html || defaultHtml(title),
        comments: Array.isArray(page.comments) ? page.comments : []
      }));
    }
  } catch {}
  return [{ id: rid(), name: "Page 1", html: content || defaultHtml(title), comments: [] }];
}

async function openContract(id, replaceRoute = false) {
  const response = await fetch(`/api/contracts/${id}`);
  if (!response.ok) return;
  const data = await response.json();
  state.activeId = id;
  state.activeContract = data.contract;
  state.activeFiles = data.files || [];
  state.pages = parseStoredPages(data.contract.content, data.contract.title);
  state.activePageIndex = 0;
  el.titleInput.value = data.contract.title || "";
  el.categoryInput.value = data.contract.category || "";
  setEditorHtml(state.pages[0]?.html || "");
  if (el.workspaceBannerTitle) {
    el.workspaceBannerTitle.textContent = data.contract.title || "Contract Workspace";
  }
  renderGallery();
  renderFiles();
  refreshInspector();
  setButtonsDisabled(false);
  setView("editor");
  setStatus(`Saved ${fmtDate(data.contract.updatedAt)}`);
  setRoute(id, replaceRoute);
}

function renderGallery() {
  const query = el.searchInput.value.trim().toLowerCase();
  const contracts = state.contracts.filter((contract) =>
    `${contract.title} ${contract.category}`.toLowerCase().includes(query)
  );

  el.galleryCount.textContent = `${contracts.length} file${contracts.length === 1 ? "" : "s"}`;
  if (el.editorGalleryCount) {
    el.editorGalleryCount.textContent = `${contracts.length} file${contracts.length === 1 ? "" : "s"}`;
  }

  if (!contracts.length) {
    el.documentGallery.innerHTML =
      '<article class="gallery-empty">No contracts yet. Create one, import from Drive, or upload a file.</article>';
    if (el.editorDocStrip) {
      el.editorDocStrip.innerHTML = '<article class="gallery-empty">Create a contract to start working inside the workspace.</article>';
    }
    return;
  }

  el.documentGallery.innerHTML = contracts.map((contract) => renderContractCard(contract, false)).join("");
  if (el.editorDocStrip) {
    el.editorDocStrip.innerHTML = contracts.map((contract) => renderContractCard(contract, true)).join("");
  }

  document.querySelectorAll("[data-open]").forEach((button) => {
    button.onclick = async () => {
      await openContract(button.dataset.open);
    };
  });

  document.querySelectorAll("[data-duplicate]").forEach((button) => {
    button.onclick = async () => {
      state.activeId = button.dataset.duplicate;
      await duplicateContract();
    };
  });

  document.querySelectorAll("[data-generate]").forEach((button) => {
    button.onclick = () => openGenerateDialog(button.dataset.generate);
  });
}

function renderContractCard(contract, compact) {
  const compactClass = compact ? "strip-card" : "compact-card";
  const paperClass = compact ? "strip-paper" : "compact-paper";
  const metaClass = compact ? "strip-meta" : "compact-meta";
  const actions = compact
    ? ""
    : `<div class="gallery-card-actions">
        <button class="ghost-btn" type="button" data-duplicate="${contract.id}">Duplicate</button>
        <button class="ghost-btn" type="button" data-generate="${contract.id}">Generate similar</button>
      </div>`;

  return `
    <article class="gallery-card ${compactClass} ${contract.id === state.activeId ? "active" : ""}">
      <button class="card-open-area" type="button" data-open="${contract.id}">
        <div class="gallery-paper ${paperClass}">
          <div class="gallery-paper-top"></div>
          <h3>${esc(contract.title)}</h3>
          <p>${esc(contract.category)}</p>
          <div class="gallery-lines compact-lines"><span></span><span></span><span></span></div>
        </div>
      </button>
      <div class="gallery-card-meta ${metaClass}">
        <span>${contract.sourceContractId ? "Generated copy" : "Original"}</span>
        <span>${fmtDate(contract.updatedAt)}</span>
      </div>
      ${actions}
    </article>
  `;
}

function renderFiles() {
  el.fileCount.textContent = `${state.activeFiles.length} file${state.activeFiles.length === 1 ? "" : "s"}`;
  el.insertTextFileBtn.disabled = !state.activeFiles.some(isTextFile);
  el.fileList.innerHTML = "";

  if (!state.activeFiles.length) {
    el.fileList.innerHTML = '<p class="empty-note">No files attached yet. Upload or import one.</p>';
    return;
  }

  state.activeFiles.forEach((file) => {
    const article = document.createElement("article");
    article.className = "file-item";
    article.innerHTML = `
      <h3>${esc(file.name)}</h3>
      <div class="file-meta">
        <span>${esc(file.mimeType)}</span>
        <span>${fmtBytes(file.sizeBytes)}</span>
      </div>
    `;

    const actions = document.createElement("div");
    actions.className = "file-item-actions";
    actions.innerHTML = `
      <button class="ghost-btn" type="button" data-kind="download">Download</button>
      ${isTextFile(file) ? '<button class="ghost-btn" type="button" data-kind="insert">Insert</button>' : ""}
      ${isPdf(file) ? '<button class="ghost-btn" type="button" data-kind="pdf">Review PDF</button>' : ""}
    `;

    actions.querySelectorAll("[data-kind]").forEach((button) => {
      button.onclick = () => fileAction(file, button.dataset.kind);
    });

    article.appendChild(actions);
    el.fileList.appendChild(article);
  });
}

function refreshInspector() {
  renderPageList();
  renderOutline();
  renderComments();
  updateWordCount();
}

function renderPageList() {
  el.pageIndicator.textContent = `Page ${state.activePageIndex + 1} of ${Math.max(state.pages.length, 1)}`;
  el.pageList.innerHTML = state.pages
    .map(
      (page, index) => `
        <button class="page-card ${index === state.activePageIndex ? "active" : ""}" type="button" data-index="${index}">
          <strong>${esc(page.name)}</strong>
          <span>${index === state.activePageIndex ? "Open now" : "Switch page"}</span>
        </button>
      `
    )
    .join("");

  el.pageList.querySelectorAll("[data-index]").forEach((button) => {
    button.onclick = () => changePage(Number(button.dataset.index));
  });
}

function renderOutline() {
  const page = state.pages[state.activePageIndex];
  const wrapper = document.createElement("div");
  wrapper.innerHTML = page?.html || "";
  const headings = [...wrapper.querySelectorAll("h1, h2, h3")];

  if (!headings.length) {
    el.outlineList.innerHTML = '<p class="empty-note">Use headings to build an outline.</p>';
    return;
  }

  el.outlineList.innerHTML = headings
    .map(
      (heading, index) => `
        <button class="outline-item" type="button" data-heading="${index}">
          ${index + 1}. ${esc(heading.textContent.trim() || "Untitled heading")}
        </button>
      `
    )
    .join("");

  el.outlineList.querySelectorAll("[data-heading]").forEach((button) => {
    button.onclick = () => {
      focusEditor();
    };
  });
}

function renderComments() {
  const comments = state.pages[state.activePageIndex]?.comments || [];
  el.commentCount.textContent = String(comments.length);

  if (!comments.length) {
    el.commentsList.innerHTML = '<p class="empty-note">No comments on this page yet.</p>';
    return;
  }

  el.commentsList.innerHTML = comments
    .map(
      (comment) => `
        <article class="comment-item">
          <strong>${esc(comment.author || "You")}</strong>
          <p>${esc(comment.text)}</p>
          <small>${fmtDate(comment.createdAt)}</small>
        </article>
      `
    )
    .join("");
}

function updateWordCount() {
  const text = getEditorText().trim();
  const total = text ? text.split(/\s+/).length : 0;
  el.wordCount.textContent = `${total} words`;
}

function syncCurrentPageFromEditor() {
  if (!state.pages[state.activePageIndex]) return;
  state.pages[state.activePageIndex].html = getEditorHtml();
}

function changePage(index) {
  if (index < 0 || index >= state.pages.length) return;
  syncCurrentPageFromEditor();
  state.activePageIndex = index;
  setEditorHtml(state.pages[index].html);
  hidePdf();
  refreshInspector();
}

function addPage() {
  state.pages.push({
    id: rid(),
    name: `Page ${state.pages.length + 1}`,
    html: defaultHtml(el.titleInput.value || "New contract"),
    comments: []
  });
  changePage(state.pages.length - 1);
  scheduleSave();
}

function removePage() {
  if (state.pages.length <= 1) return;
  state.pages.splice(state.activePageIndex, 1);
  state.activePageIndex = Math.max(0, state.activePageIndex - 1);
  setEditorHtml(state.pages[state.activePageIndex].html);
  hidePdf();
  refreshInspector();
  scheduleSave();
}

async function createContract(seed = {}) {
  const title = seed.title || "New contract";
  const category = seed.category || "General";
  const content =
    seed.content ||
    JSON.stringify({
      version: 2,
      pages: [{ id: rid(), name: "Page 1", html: defaultHtml(title), comments: [] }]
    });

  const response = await fetch("/api/contracts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, category, content })
  });
  const data = await response.json();
  state.contracts.unshift(listItem(data.contract, data.files));
  renderGallery();
  await openContract(data.contract.id);
  return data.contract.id;
}

async function duplicateContract() {
  if (!state.activeId) return;
  const response = await fetch(`/api/contracts/${state.activeId}/duplicate`, { method: "POST" });
  const data = await response.json();
  state.contracts.unshift(listItem(data.contract, data.files));
  renderGallery();
  await openContract(data.contract.id);
}

function openGenerateDialog(sourceId = state.activeId) {
  const source = state.contracts.find((contract) => contract.id === sourceId);
  el.generateSource.value = sourceId || "";
  el.generateHint.textContent = source
    ? `Using "${source.title}" as the starting point.`
    : "Open or select a contract first so the new one has something to copy.";
  el.generateTitle.value = source ? `${source.title} Copy` : "Generated contract";
  el.generateInstructions.value = "";
  el.generateDialog.showModal();
}

function openAiDocDialog() {
  el.aiDocTitle.value = state.activeId ? `${el.titleInput.value || "Contract"} Google Doc` : "New Google Doc";
  el.aiDocPrompt.value = "";
  el.aiDocUseCurrent.checked = true;
  el.aiDocHint.textContent = "This creates a real Google Doc in the connected Google account.";
  el.aiDocDialog.showModal();
}

async function submitGenerateSimilar(event) {
  event.preventDefault();
  const sourceId = el.generateSource.value || state.activeId;
  if (!sourceId) {
    el.generateHint.textContent = "Pick a contract card first, then try generate similar again.";
    return;
  }

  const sourceResponse = await fetch(`/api/contracts/${sourceId}`);
  if (!sourceResponse.ok) return;
  const data = await sourceResponse.json();
  const pages = parseStoredPages(data.contract.content, data.contract.title);
  const instructions = el.generateInstructions.value.trim();
  const title = el.generateTitle.value.trim() || `${data.contract.title} Copy`;

  const generatedPages = pages.map((page, index) => ({
    ...page,
    id: rid(),
    name: index === 0 ? "Page 1" : page.name,
    html: index === 0 ? applyGenerationInstructions(page.html, title, instructions, data.contract.title) : page.html
  }));

  const newId = await createContract({
    title,
    category: data.contract.category,
    content: JSON.stringify({ version: 2, pages: generatedPages })
  });

  el.generateDialog.close();
  await openContract(newId);
}

async function submitAiGoogleDoc(event) {
  event.preventDefault();
  await generateAiGoogleDoc();
}

async function generateAiGoogleDoc() {
  if (!ensureGoogleDocReady(() => generateAiGoogleDoc())) return;
  const prompt = el.aiDocPrompt.value.trim();
  if (!prompt) {
    el.aiDocHint.textContent = "Add a prompt for the AI first.";
    return;
  }

  const referenceContent =
    el.aiDocUseCurrent.checked && state.activeId
      ? JSON.stringify({ title: el.titleInput.value, category: el.categoryInput.value, pages: state.pages })
      : "";

  el.aiDocHint.textContent = "Generating Google Doc...";

  const response = await fetch("/api/google-docs/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      accessToken: state.google.accessToken,
      title: el.aiDocTitle.value.trim() || "Generated Google Doc",
      prompt,
      referenceContent
    })
  });

  const data = await response.json();
  if (!response.ok) {
    el.aiDocHint.textContent = data.error || "Could not generate the Google Doc.";
    return;
  }

  el.aiDocHint.innerHTML = `Created Google Doc: <a href="${escAttr(data.documentUrl)}" target="_blank" rel="noreferrer">open document</a>`;
  window.open(data.documentUrl, "_blank", "noopener,noreferrer");
}

async function createGoogleDocFromCurrent() {
  if (!ensureGoogleDocReady(() => createGoogleDocFromCurrent())) return;

  const payload = {
    accessToken: state.google.accessToken,
    title: state.activeId ? `${el.titleInput.value || "Contract"} Google Doc` : "New Google Doc",
    pages: state.activeId ? state.pages : [{ name: "Page 1", html: defaultHtml("New Google Doc") }]
  };

  updateDriveStatus("Creating Google Doc...");
  const response = await fetch("/api/google-docs/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  if (!response.ok) {
    updateDriveStatus(data.error || "Could not create the Google Doc.");
    return;
  }

  updateDriveStatus(`Google Doc created: ${data.title}`);
  window.open(data.documentUrl, "_blank", "noopener,noreferrer");
}

function applyGenerationInstructions(html, newTitle, instructions, sourceTitle) {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = html || defaultHtml(newTitle);
  const firstHeading = wrapper.querySelector("h1");
  if (firstHeading) firstHeading.textContent = newTitle;
  else wrapper.prepend(htmlToNode(`<h1>${esc(newTitle)}</h1>`));

  if (instructions) {
    wrapper.prepend(
      htmlToNode(`
        <section class="generated-brief">
          <p><strong>Generated from:</strong> ${esc(sourceTitle)}</p>
          <p><strong>Requested changes:</strong> ${esc(instructions)}</p>
        </section>
      `)
    );
  }

  return wrapper.innerHTML;
}

async function deleteContract() {
  if (!state.activeId || !window.confirm("Delete this contract permanently?")) return;
  await fetch(`/api/contracts/${state.activeId}`, { method: "DELETE" });
  state.contracts = state.contracts.filter((contract) => contract.id !== state.activeId);
  state.activeId = null;
  state.activeContract = null;
  state.activeFiles = [];
  state.pages = [];
  renderGallery();
  renderFiles();
  setButtonsDisabled(true);
  goHome();
}

function scheduleSave() {
  if (!state.activeId) return;
  clearTimeout(state.saveTimer);
  setStatus("Saving...");
  state.saveTimer = window.setTimeout(() => saveContract(), 700);
}

async function saveContract() {
  if (!state.activeId) return;
  syncCurrentPageFromEditor();
  const response = await fetch(`/api/contracts/${state.activeId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: el.titleInput.value.trim() || "Untitled contract",
      category: el.categoryInput.value.trim() || "General",
      content: JSON.stringify({ version: 2, pages: state.pages })
    })
  });
  const data = await response.json();
  const current = state.contracts.find((contract) => contract.id === state.activeId);
  if (current) {
    current.title = data.contract.title;
    current.category = data.contract.category;
    current.updatedAt = data.contract.updatedAt;
  }
  renderGallery();
  setStatus(`Saved ${fmtDate(data.contract.updatedAt)}`);
}

async function uploadFile(file) {
  if (!file) return;
  if (!state.activeId) await createContract();

  const base64Data = await asBase64(file);
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
  renderFiles();

  if (isTextFile(data.file)) await insertFile(data.file.id);
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
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = file.name;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function insertRecentText() {
  const file = state.activeFiles.find(isTextFile);
  if (file) await insertFile(file.id);
}

async function insertFile(fileId) {
  const file = await fetchFile(fileId);
  const text = atob(file.base64Data);
  insertEditorHtml(file.mimeType.includes("html") ? text : `<h2>${esc(file.name)}</h2><pre>${esc(text)}</pre>`);
  syncCurrentPageFromEditor();
  refreshInspector();
  scheduleSave();
}

async function openPdf(fileId, label) {
  const file = await fetchFile(fileId);
  const blob = toBlob(file.base64Data, file.mimeType);
  el.pdfFrame.src = URL.createObjectURL(blob);
  el.pdfReviewLabel.textContent = label;
  el.pdfReviewPane.classList.remove("hidden");
  setEditorMode("pdf");
}

function hidePdf() {
  el.pdfReviewPane.classList.add("hidden");
  el.pdfFrame.removeAttribute("src");
  el.pdfReviewLabel.textContent = "No PDF selected";
}

function downloadHtml() {
  syncCurrentPageFromEditor();
  const html = state.pages
    .map((page) => `<section data-page="${esc(page.name)}">${page.html}</section>`)
    .join("\n");
  const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${slug(el.titleInput.value || "contract")}.html`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function execCmd(command) {
  if (state.richEditor) {
    state.richEditor.execCommand(command);
  }
  focusEditor();
}

function runAction(action) {
  if (action === "h1") applyBlockFormat("h1");
  if (action === "h2") applyBlockFormat("h2");
  if (action === "paragraph") applyBlockFormat("p");
  if (action === "table") {
    insertEditorHtml("<table><thead><tr><th>Item</th><th>Due date</th><th>Notes</th></tr></thead><tbody><tr><td></td><td></td><td></td></tr></tbody></table><p></p>");
  }
  if (action === "signature") {
    insertEditorHtml("<p>Signature: ____________________________</p><p>Name: _________________________________</p>");
  }
  if (action === "smartchip") {
    insertEditorHtml('<span class="smart-chip">@Client Name</span>');
  }
  if (action === "dropdownchip") {
    insertEditorHtml('<span class="smart-chip dropdown-chip">Status: Draft</span>');
  }
  if (action === "meetingnotes") {
    insertEditorHtml("<h2>Meeting notes</h2><p><strong>Date:</strong> [Add date]</p><p><strong>Attendees:</strong> [Add names]</p><ul><li>Decision 1</li><li>Action item 1</li></ul>");
  }
  syncCurrentPageFromEditor();
  refreshInspector();
  scheduleSave();
}

function setEditorMode(mode) {
  state.editorMode = mode;
  const isWord = mode === "word";
  el.wordModeBtn.classList.toggle("active", isWord);
  el.pdfModeBtn.classList.toggle("active", !isWord);
  el.editorShell.classList.toggle("word-mode", isWord);
  el.editorShell.classList.toggle("pdf-mode", !isWord);
  if (state.richEditor) {
    const body = state.richEditor.getBody();
    if (body) body.classList.toggle("pdf-editor", !isWord);
  } else {
    el.editor.classList.toggle("pdf-editor", !isWord);
  }
  el.editorModeBadge.textContent = isWord ? "Pages mode" : "PDF review mode";
}

function setWritingMode(mode) {
  state.writingMode = mode;
  el.editingModeBtn.classList.toggle("active", mode === "editing");
  el.suggestingModeBtn.classList.toggle("active", mode === "suggesting");
  if (state.richEditor) {
    const body = state.richEditor.getBody();
    if (body) body.classList.toggle("suggesting-editor", mode === "suggesting");
  } else {
    el.editor.classList.toggle("suggesting-editor", mode === "suggesting");
  }
}

function addComment() {
  if (!state.pages[state.activePageIndex]) return;
  const text = window.prompt("Add a comment for this page:");
  if (!text) return;
  state.pages[state.activePageIndex].comments.unshift({
    id: rid(),
    author: "You",
    text,
    createdAt: new Date().toISOString()
  });
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
  const response = await fetch("/api/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      googleDriveClientId: el.googleDriveClientId.value.trim(),
      googleDriveApiKey: el.googleDriveApiKey.value.trim(),
      googleDriveProjectNumber: el.googleDriveProjectNumber.value.trim(),
      storageMode: el.storageMode.value
    })
  });
  const data = await response.json();
  state.settings = data.settings || {};
  initGoogle();
  updateDriveStatus("Cloud settings saved.");
  el.settingsDialog.close();
}

function initGoogle() {
  state.google.tokenClient = null;
  state.google.pickerReady = false;

  if (!state.settings?.googleDriveClientId) return;

  if (window.google?.accounts?.oauth2) {
    state.google.tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: state.settings.googleDriveClientId,
      scope:
        "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/documents",
      callback: async (response) => {
        if (response.error) {
          updateDriveStatus(`Drive authorization failed: ${response.error}`);
          return;
        }
        state.google.accessToken = response.access_token;
        updateDriveStatus("Drive connected.");
        if (state.google.intent === "google-doc") {
          if (typeof state.google.pendingAction === "function") {
            const pendingAction = state.google.pendingAction;
            state.google.pendingAction = null;
            pendingAction();
          }
          return;
        }
        await openPicker();
      }
    });
  }

  if (window.gapi?.load) {
    window.gapi.load("picker", () => {
      state.google.pickerReady = true;
    });
  }
}

function connectGoogleDrive(mode = "import") {
  state.google.intent = mode;
  if (
    !state.settings?.googleDriveClientId ||
    !state.settings?.googleDriveApiKey ||
    !state.settings?.googleDriveProjectNumber
  ) {
    openSettings();
    return;
  }

  if (!state.google.tokenClient) initGoogle();
  if (!state.google.tokenClient) {
    updateDriveStatus("Google sign-in is still loading.");
    return;
  }

  if (state.google.accessToken) {
    openPicker();
    return;
  }

  updateDriveStatus("Requesting Drive access...");
  state.google.tokenClient.requestAccessToken({ prompt: "consent" });
}

function ensureGoogleDocReady(action) {
  if (
    !state.settings?.googleDriveClientId ||
    !state.settings?.googleDriveApiKey ||
    !state.settings?.googleDriveProjectNumber
  ) {
    openSettings();
    return false;
  }

  if (!state.google.accessToken) {
    state.google.pendingAction = action || null;
    connectGoogleDrive("google-doc");
    return false;
  }

  return true;
}

async function openPicker() {
  if (!window.google?.picker || !state.google.accessToken || !state.google.pickerReady) {
    updateDriveStatus("Google Picker is still loading.");
    return;
  }

  const picker = new google.picker.PickerBuilder()
    .setAppId(state.settings.googleDriveProjectNumber)
    .setDeveloperKey(state.settings.googleDriveApiKey)
    .setOAuthToken(state.google.accessToken)
    .addView(new google.picker.DocsView(google.picker.ViewId.DOCS))
    .addView(new google.picker.DocsView(google.picker.ViewId.PDFS))
    .addView(new google.picker.DocsUploadView())
    .setCallback(async (data) => {
      if (data.action !== google.picker.Action.PICKED || !data.docs?.length) return;
      await importDriveFile(data.docs[0]);
    })
    .build();

  picker.setVisible(true);
}

async function importDriveFile(doc) {
  updateDriveStatus(`Importing ${doc.name}...`);
  const mimeType = doc.mimeType || "";

  if (mimeType === "application/vnd.google-apps.document") {
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${doc.id}/export?mimeType=text/html`,
      { headers: { Authorization: `Bearer ${state.google.accessToken}` } }
    );
    if (!response.ok) {
      updateDriveStatus("Could not import that Google Doc.");
      return;
    }
    const html = await response.text();
    const content = JSON.stringify({
      version: 2,
      pages: [{ id: rid(), name: "Page 1", html: normalizeImportedHtml(html, doc.name), comments: [] }]
    });
    await createContract({ title: doc.name, category: "Imported from Drive", content });
    updateDriveStatus(`Imported ${doc.name} into the website editor.`);
    return;
  }

  const downloadResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${doc.id}?alt=media`, {
    headers: { Authorization: `Bearer ${state.google.accessToken}` }
  });

  if (!downloadResponse.ok) {
    updateDriveStatus("Could not download the selected Drive file.");
    return;
  }

  const blob = await downloadResponse.blob();
  const base64Data = await blobToBase64(blob);

  if (!state.activeId) {
    await createContract({
      title: doc.name.replace(/\.[^.]+$/, "") || "Imported file",
      category: "Imported from Drive"
    });
  }

  const uploadResponse = await fetch(`/api/contracts/${state.activeId}/files`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: doc.name,
      mimeType: blob.type || mimeType || "application/octet-stream",
      base64Data
    })
  });
  const uploadData = await uploadResponse.json();
  state.activeFiles.unshift(uploadData.file);
  renderFiles();

  if (isTextMime(blob.type || mimeType)) {
    const text = await blob.text();
    insertEditorHtml(`<section><h2>${esc(doc.name)}</h2><pre>${esc(text)}</pre></section>`);
    syncCurrentPageFromEditor();
    refreshInspector();
    scheduleSave();
  }

  if (isPdf(uploadData.file)) {
    await openPdf(uploadData.file.id, uploadData.file.name);
  }

  updateDriveStatus(`Imported ${doc.name}.`);
}

function normalizeImportedHtml(html, fallbackTitle) {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = html;
  const body = wrapper.querySelector("body");
  const content = body ? body.innerHTML : wrapper.innerHTML;
  return content || defaultHtml(fallbackTitle);
}

function updateDriveStatus(message) {
  el.driveStatus.textContent = message;
  if (el.driveImportLabel) {
    el.driveImportLabel.textContent = state.google.accessToken ? "Drive linked" : "Import from Drive";
  }
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
  if (el.workspaceBannerTitle) {
    el.workspaceBannerTitle.textContent = "Contract Workspace";
  }
}

async function fetchFile(fileId) {
  const response = await fetch(`/api/contracts/${state.activeId}/files/${fileId}`);
  const data = await response.json();
  return data.file;
}

function listItem(contract, files = []) {
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

function setView(view) {
  el.homeView.classList.toggle("hidden", view !== "home");
  el.editorView.classList.toggle("hidden", view !== "editor");
}

function setButtonsDisabled(disabled) {
  el.duplicateBtn.disabled = disabled;
  el.generateBtn.disabled = disabled;
  el.insertTextFileBtn.disabled = disabled;
  el.downloadHtmlBtn.disabled = disabled;
  el.deleteBtn.disabled = disabled;
}

function setStatus(message) {
  el.saveStatus.textContent = message;
}

function fmtDate(value) {
  if (!value) return "just now";
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function fmtBytes(value) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function defaultHtml(title) {
  return `<h1>${esc(title)}</h1><p>Write your contract content here.</p><p>Add terms, pricing, signatures, and clauses on this page.</p>`;
}

function getEditorHtml() {
  if (state.richEditor) {
    return state.richEditor.getContent() || "";
  }
  return el.editor.value || "";
}

function setEditorHtml(html) {
  if (state.richEditor) {
    state.richEditor.setContent(html || "");
    applyEditorBodyClasses();
    return;
  }
  el.editor.value = html || "";
}

function getEditorText() {
  if (state.richEditor) {
    return state.richEditor.getContent({ format: "text" }) || "";
  }
  return el.editor.value || "";
}

function focusEditor() {
  if (state.richEditor) {
    state.richEditor.focus();
    return;
  }
  el.editor.focus();
}

function insertEditorHtml(html) {
  if (state.richEditor) {
    state.richEditor.insertContent(html);
    return;
  }
  el.editor.value += html;
}

function applyBlockFormat(tagName) {
  if (state.richEditor) {
    state.richEditor.execCommand("FormatBlock", false, tagName);
    return;
  }
}

function applyEditorBodyClasses() {
  if (!state.richEditor) return;
  const body = state.richEditor.getBody();
  if (!body) return;
  body.classList.toggle("pdf-editor", state.editorMode !== "word");
  body.classList.toggle("suggesting-editor", state.writingMode === "suggesting");
}

function htmlToNode(html) {
  const template = document.createElement("template");
  template.innerHTML = html.trim();
  return template.content.firstElementChild;
}

function esc(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escAttr(value) {
  return esc(value).replaceAll("`", "&#96;");
}

function slug(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function rid() {
  return Math.random().toString(36).slice(2, 10);
}

function isTextFile(file) {
  return isTextMime(file.mimeType || "");
}

function isTextMime(mimeType) {
  return /text|json|xml|html|markdown/.test(mimeType);
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
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new Blob([bytes], { type: mimeType || "application/octet-stream" });
}
