const state = {
  contracts: [],
  activeId: null,
  activeFiles: [],
  settings: null,
  currentView: "home",
  previousView: "home",
  pages: [],
  activePageIndex: 0,
  saveTimer: null,
  richEditor: null,
  google: { tokenClient: null, accessToken: null, pickerReady: false, pendingAction: null },
  pdfEditor: { fileId: null, fileName: "", sourceBase64: "", annotations: [], addTextMode: false, objectUrls: [] }
};

const el = {
  homeView: document.querySelector("#homeView"),
  editorView: document.querySelector("#editorView"),
  settingsView: document.querySelector("#settingsView"),
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
  wordCount: document.querySelector("#wordCount"),
  editor: document.querySelector("#editor"),
  pdfReviewPane: document.querySelector("#pdfReviewPane"),
  pdfReviewLabel: document.querySelector("#pdfReviewLabel"),
  pdfAddTextBtn: document.querySelector("#pdfAddTextBtn"),
  pdfSaveBtn: document.querySelector("#pdfSaveBtn"),
  pdfCloseBtn: document.querySelector("#pdfCloseBtn"),
  pdfCanvasList: document.querySelector("#pdfCanvasList"),
  fileList: document.querySelector("#fileList"),
  fileCount: document.querySelector("#fileCount"),
  driveImportLabel: document.querySelector("#driveImportLabel"),
  settingsDialog: document.querySelector("#settingsDialog"),
  settingsCloseBtn: document.querySelector("#settingsCloseBtn"),
  settingsForm: document.querySelector("#settingsForm"),
  appearanceTheme: document.querySelector("#appearanceTheme"),
  backgroundStyle: document.querySelector("#backgroundStyle"),
  uiLocale: document.querySelector("#uiLocale"),
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
el.pdfAddTextBtn.onclick = () => togglePdfTextMode();
el.pdfSaveBtn.onclick = () => saveEditedPdf();
el.pdfCloseBtn.onclick = () => hidePdf();
el.settingsCloseBtn.onclick = () => closeSettings();
el.generateCloseBtn.onclick = () => el.generateDialog.close();
el.aiDocCloseBtn.onclick = () => el.aiDocDialog.close();
el.titleInput.oninput = () => scheduleSave();
el.categoryInput.oninput = () => scheduleSave();
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
el.aiDocForm.onsubmit = submitAiGoogleDoc;
window.onpopstate = () => loadFromRoute();

boot();

async function boot() {
  await loadSettings();
  initPdfRuntime();
  await loadTinyMce();
  await initEditor();
  applyWorkspaceSettings();
  initGoogle();
  setButtonsDisabled(true);
  await loadContracts();
  await loadFromRoute();
}

function initPdfRuntime() {
  if (window.pdfjsLib?.GlobalWorkerOptions) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.js";
  }
}

function loadTinyMce() {
  return new Promise((resolve, reject) => {
    if (window.tinymce) {
      resolve();
      return;
    }

    const existing = document.querySelector('script[data-tinymce-loader="true"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("TinyMCE failed to load.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    const apiKey = state.settings?.tinyMceKey || "no-api-key";
    script.src = `https://cdn.tiny.cloud/1/${encodeURIComponent(apiKey)}/tinymce/8/tinymce.min.js`;
    script.referrerPolicy = "origin";
    script.crossOrigin = "anonymous";
    script.dataset.tinymceLoader = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("TinyMCE failed to load."));
    document.head.appendChild(script);
  });
}

function initEditor() {
  return new Promise((resolve) => {
    if (!window.tinymce) {
      resolve();
      return;
    }

    window.tinymce.init({
      target: el.editor,
      menubar: "file edit view insert format tools table help",
      statusbar: false,
      branding: false,
      promotion: false,
      resize: false,
      plugins: "lists link image table autoresize code wordcount",
      toolbar:
        "undo redo | blocks fontfamily fontsize | bold italic underline strikethrough | alignleft aligncenter alignright | bullist numlist outdent indent | table link image | removeformat code",
      min_height: 560,
      content_style:
        "body{font-family:'Segoe UI','Noto Sans','Arial Unicode MS',Arial,Helvetica,'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif;line-height:1.7;color:#202124;padding:24px;} p{margin:0 0 1em;} h1,h2,h3{line-height:1.25;}",
      setup(editor) {
        editor.on("init", () => {
          state.richEditor = editor;
          setEditorHtml("");
          applyWorkspaceSettings();
          resolve();
        });
        editor.on("input change keyup undo redo SetContent", () => {
          syncCurrentPageFromEditor();
          updateWordCount();
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
  el.appearanceTheme.value = state.settings.appearanceTheme || "aurora";
  el.backgroundStyle.value = state.settings.backgroundStyle || "glow";
  el.uiLocale.value = state.settings.uiLocale || "en-US";
  applyWorkspaceSettings();
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
  state.activeFiles = data.files || [];
  state.pages = parseStoredPages(data.contract.content, data.contract.title);
  state.activePageIndex = 0;
  el.titleInput.value = data.contract.title || "";
  el.categoryInput.value = data.contract.category || "";
  setEditorHtml(state.pages[0]?.html || "");
  el.workspaceBannerTitle.textContent = data.contract.title || "Contract Workspace";
  renderGallery();
  renderFiles();
  renderPageList();
  updateWordCount();
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
  el.editorGalleryCount.textContent = `${contracts.length} file${contracts.length === 1 ? "" : "s"}`;

  if (!contracts.length) {
    el.documentGallery.innerHTML =
      '<article class="gallery-empty">No contracts yet. Create one, import from Drive, or upload a file.</article>';
    el.editorDocStrip.innerHTML =
      '<article class="gallery-empty">Create a contract to start working inside the workspace.</article>';
    return;
  }

  el.documentGallery.innerHTML = contracts.map((contract) => renderContractCard(contract, false)).join("");
  el.editorDocStrip.innerHTML = contracts.map((contract) => renderContractCard(contract, true)).join("");

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
  renderPageList();
  updateWordCount();
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
  renderPageList();
  updateWordCount();
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

async function submitGenerateSimilar(event) {
  event.preventDefault();
  const sourceId = el.generateSource.value || state.activeId;
  if (!sourceId) {
    el.generateHint.textContent = "Pick a contract first.";
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

function openAiDocDialog() {
  el.aiDocTitle.value = state.activeId ? `${el.titleInput.value || "Contract"} Google Doc` : "New Google Doc";
  el.aiDocPrompt.value = "";
  el.aiDocUseCurrent.checked = true;
  el.aiDocHint.textContent = "This creates a real Google Doc in the connected Google account.";
  el.aiDocDialog.showModal();
}

async function submitAiGoogleDoc(event) {
  event.preventDefault();
  await generateAiGoogleDoc();
}

async function generateAiGoogleDoc() {
  if (!ensureGoogleDocReady(() => generateAiGoogleDoc())) return;
  const prompt = el.aiDocPrompt.value.trim();
  if (!prompt) {
    el.aiDocHint.textContent = "Add a prompt first.";
    return;
  }

  const referenceContent = state.activeId
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
      referenceContent: el.aiDocUseCurrent.checked ? referenceContent : ""
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

  const response = await fetch("/api/google-docs/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      accessToken: state.google.accessToken,
      title: state.activeId ? `${el.titleInput.value || "Contract"} Google Doc` : "New Google Doc",
      pages: state.activeId ? state.pages : [{ name: "Page 1", html: defaultHtml("New Google Doc") }]
    })
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

  if (isEditableImportFile(data.file)) await insertFile(data.file.id);
  if (isPdf(data.file)) await openPdf(data.file.id, data.file.name);
}

function renderFiles() {
  el.fileCount.textContent = `${state.activeFiles.length} file${state.activeFiles.length === 1 ? "" : "s"}`;
  el.insertTextFileBtn.disabled = !state.activeFiles.some(isEditableImportFile);
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
      ${isEditableImportFile(file) ? '<button class="ghost-btn" type="button" data-kind="insert">Insert</button>' : ""}
      ${isPdf(file) ? '<button class="ghost-btn" type="button" data-kind="pdf">Edit PDF</button>' : ""}
    `;
    actions.querySelectorAll("[data-kind]").forEach((button) => {
      button.onclick = () => fileAction(file, button.dataset.kind);
    });
    article.appendChild(actions);
    el.fileList.appendChild(article);
  });
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
  const file = state.activeFiles.find(isEditableImportFile);
  if (file) await insertFile(file.id);
}

async function insertFile(fileId) {
  const file = await fetchFile(fileId);
  const html = await fileToEditorHtml(file);
  insertEditorHtml(html);
  syncCurrentPageFromEditor();
  updateWordCount();
  scheduleSave();
}

async function openPdf(fileId, label) {
  const file = await fetchFile(fileId);
  state.pdfEditor.fileId = fileId;
  state.pdfEditor.fileName = label;
  state.pdfEditor.sourceBase64 = file.base64Data;
  state.pdfEditor.annotations = [];
  state.pdfEditor.addTextMode = false;
  el.pdfAddTextBtn.classList.remove("active");
  el.pdfReviewLabel.textContent = label;
  el.pdfReviewPane.classList.remove("hidden");
  await renderPdfEditor(file.base64Data);
}

function hidePdf() {
  state.pdfEditor.objectUrls.forEach((url) => URL.revokeObjectURL(url));
  state.pdfEditor.objectUrls = [];
  state.pdfEditor.fileId = null;
  state.pdfEditor.fileName = "";
  state.pdfEditor.sourceBase64 = "";
  state.pdfEditor.annotations = [];
  state.pdfEditor.addTextMode = false;
  el.pdfReviewPane.classList.add("hidden");
  el.pdfCanvasList.innerHTML = "";
  el.pdfReviewLabel.textContent = "No PDF selected";
}

function downloadHtml() {
  syncCurrentPageFromEditor();
  const html = state.pages.map((page) => `<section data-page="${esc(page.name)}">${page.html}</section>`).join("\n");
  const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${slug(el.titleInput.value || "contract")}.html`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function openSettings() {
  el.appearanceTheme.value = state.settings?.appearanceTheme || "aurora";
  el.backgroundStyle.value = state.settings?.backgroundStyle || "glow";
  el.uiLocale.value = state.settings?.uiLocale || "en-US";
  state.previousView = state.currentView === "settings" ? state.previousView : state.currentView;
  setView("settings");
}

function closeSettings() {
  setView(state.previousView || "home");
}

async function saveSettings(event) {
  event.preventDefault();
  const response = await fetch("/api/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      appearanceTheme: el.appearanceTheme.value,
      backgroundStyle: el.backgroundStyle.value,
      uiLocale: el.uiLocale.value
    })
  });
  const data = await response.json();
  state.settings = data.settings || {};
  applyWorkspaceSettings();
  initGoogle();
  updateDriveStatus("Cloud settings saved.");
  closeSettings();
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
        if (state.google.intent === "google-doc" && typeof state.google.pendingAction === "function") {
          const pendingAction = state.google.pendingAction;
          state.google.pendingAction = null;
          pendingAction();
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
    await createContract({ title: doc.name.replace(/\.[^.]+$/, "") || "Imported file", category: "Imported from Drive" });
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

  if (isEditableImportFile({ name: doc.name, mimeType: blob.type || mimeType })) {
    const importedHtml = await blobToEditorHtml(blob, doc.name, mimeType || blob.type);
    insertEditorHtml(importedHtml);
    syncCurrentPageFromEditor();
    updateWordCount();
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
  el.driveImportLabel.textContent = state.google.accessToken ? "Drive linked" : "Import from Drive";
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
  el.workspaceBannerTitle.textContent = "Contract Workspace";
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
  state.currentView = view;
  el.homeView.classList.toggle("hidden", view !== "home");
  el.editorView.classList.toggle("hidden", view !== "editor");
  el.settingsView.classList.toggle("hidden", view !== "settings");
}

function setButtonsDisabled(disabled) {
  el.duplicateBtn.disabled = disabled;
  el.generateBtn.disabled = disabled;
  el.insertTextFileBtn.disabled = disabled;
  el.downloadHtmlBtn.disabled = disabled;
  el.deleteBtn.disabled = disabled;
  el.createGoogleDocEditorBtn.disabled = disabled;
}

function setStatus(message) {
  el.saveStatus.textContent = message;
}

function fmtDate(value) {
  if (!value) return "just now";
  return new Date(value).toLocaleString(resolveLocale(), {
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

function applyWorkspaceSettings() {
  const theme = state.settings?.appearanceTheme || "aurora";
  const backgroundStyle = state.settings?.backgroundStyle || "glow";
  const locale = resolveLocale();
  const language = locale.toLowerCase().startsWith("vi") ? "vi" : "en";

  document.documentElement.lang = language;
  document.body.dataset.theme = theme;
  document.body.dataset.background = backgroundStyle;
  applyTranslations(language);

  if (state.richEditor?.getBody()) {
    state.richEditor.getBody().setAttribute("lang", language);
  }
}

function resolveLocale() {
  const locale = state.settings?.uiLocale || "en-US";
  if (locale === "en-US-u-em-emoji") return "en-US";
  return locale;
}

function applyTranslations(language) {
  const vi = language === "vi";

  document.title = vi ? "Kho Hop Dong" : "Contract Vault";
  text(el.settingsBtn, vi ? "Cai dat" : "Settings");
  text(el.settingsBtnEditor, vi ? "Cai dat" : "Settings");
  text(el.newContractBtn, vi ? "Tai lieu moi" : "Blank document");
  text(el.createGoogleDocBtn, vi ? "Tao Google Doc" : "Create Google Doc");
  text(el.aiGoogleDocBtn, vi ? "AI tao Google Doc" : "AI Google Doc");
  text(el.homeDriveBtn, vi ? "Mo Drive picker" : "Open Drive picker");
  text(el.homeTemplatesBtn, vi ? "Tao tuong tu" : "Generate similar");
  text(el.connectDriveBtn, vi ? "Ket noi Drive" : "Connect Drive");
  text(el.backBtn, vi ? "Quay lai" : "Back");
  text(el.createGoogleDocEditorBtn, vi ? "Tao Google Doc" : "Create Google Doc");
  text(el.aiGoogleDocEditorBtn, vi ? "AI tao Google Doc" : "AI to Google Doc");
  text(el.downloadHtmlBtn, vi ? "Tai xuong" : "Download");
  text(el.deleteBtn, vi ? "Xoa" : "Delete");
  text(el.insertTextFileBtn, vi ? "Chen tep" : "Insert file");
  text(el.duplicateBtn, vi ? "Nhan ban" : "Duplicate doc");
  text(el.generateBtn, vi ? "Tao tuong tu" : "Generate similar");
  text(el.prevPageBtn, vi ? "Truoc" : "Prev");
  text(el.nextPageBtn, vi ? "Sau" : "Next");
  text(el.addPageBtn, vi ? "Them trang" : "Add page");
  text(el.removePageBtn, vi ? "Xoa" : "Remove");
  text(el.settingsCloseBtn, vi ? "Quay lai" : "Back");
  text(document.querySelector(".home-brand"), vi ? "Kho Hop Dong" : "Contract Vault");
  text(document.querySelector(".hero-card .eyebrow"), vi ? "TAO MOI" : "Create");
  text(document.querySelector(".hero-card h1"), vi ? "Tao hop dong nhanh hon" : "Start contracts faster");
  text(
    document.querySelector(".hero-card .helper-copy"),
    vi
      ? "Mo tep, tao ban nhap moi, hoac nhan ban hop dong da luu ma khong can cai dat lai moi lan."
      : "Open a file, create a blank draft, or duplicate a saved contract without dealing with setup every time."
  );
  text(document.querySelector(".hero-side .eyebrow"), vi ? "DRIVE" : "Drive");
  text(document.querySelector(".hero-side h2"), vi ? "San sang dam may" : "Cloud ready");
  text(document.querySelector(".home-card .eyebrow"), vi ? "TAI LIEU" : "Documents");
  text(document.querySelector(".home-card h2"), vi ? "Tap tin hop dong" : "Your contract files");
  if (el.searchInput) {
    el.searchInput.placeholder = vi ? "Tim theo ten hop dong hoac danh muc" : "Search by contract name or category";
  }
  text(document.querySelector(".workspace-pill:not(.active)"), vi ? "Khong gian lam viec" : "Workspace");
  text(document.querySelector(".workspace-pill.active"), vi ? "Tai lieu cua toi" : "My Document");
  text(
    document.querySelector(".workspace-banner-copy span"),
    vi
      ? "Website cua ban van dieu khien trong khi tai lieu mo trong khong gian lam viec nho hon nay."
      : "Your website stays in control while the document opens inside this smaller workspace."
  );
  text(document.querySelector(".workspace-doc-strip .eyebrow"), vi ? "TAI LIEU" : "Documents");
  text(document.querySelector(".workspace-doc-strip h2"), vi ? "Chuyen doi tai lieu trong khong gian lam viec" : "Switch documents inside the workspace");
  text(document.querySelector(".docs-mark"), "Docs");
  text(document.querySelector(".static-pill"), vi ? "Trinh sua nhung" : "Embedded editor");
  text(document.querySelector(".mini-field span"), vi ? "Danh muc" : "Category");
  if (el.categoryInput) {
    el.categoryInput.placeholder = vi ? "Dich vu" : "Services";
  }
  text(document.querySelector(".editor-side-panel .sidebar-card .eyebrow"), vi ? "TRANG" : "Pages");
  text(document.querySelector(".editor-side-panel .sidebar-card h2"), vi ? "Cac trang tai lieu" : "Document pages");
  text(document.querySelectorAll(".editor-side-panel .sidebar-card .eyebrow")[1], vi ? "TEP" : "Files");
  text(document.querySelectorAll(".editor-side-panel .sidebar-card h2")[1], vi ? "Tap dinh kem" : "Attachments");
  text(document.querySelector(".settings-header .eyebrow"), vi ? "CAI DAT" : "Settings");
  text(document.querySelector(".settings-header h2"), vi ? "Ngon ngu, mau sac, va giao dien" : "Language, colors, and workspace style");
  text(document.querySelector(".settings-note-card strong"), vi ? "Da an khoa dam may" : "Cloud keys hidden");
  text(
    document.querySelector(".settings-note-card p"),
    vi
      ? "Thong tin Google va luu tru duoc giu o phia may chu va khong con hien de chinh sua trong trang nay."
      : "Google and storage credentials now stay on the server side and are no longer editable in this page."
  );

  const labels = document.querySelectorAll("#settingsForm label span");
  if (labels[0]) text(labels[0], vi ? "Giao dien mau" : "Color theme");
  if (labels[1]) text(labels[1], vi ? "Kieu nen" : "Background style");
  if (labels[2]) text(labels[2], vi ? "Ngon ngu va khu vuc" : "Language and locale");

  setOption(el.appearanceTheme, 0, vi ? "Xanh cuc quang" : "Aurora blue");
  setOption(el.appearanceTheme, 1, vi ? "Cam hoang hon" : "Sunset coral");
  setOption(el.appearanceTheme, 2, vi ? "Xanh rung" : "Forest mint");
  setOption(el.backgroundStyle, 0, vi ? "Phat mau" : "Color glow");
  setOption(el.backgroundStyle, 1, vi ? "Luoi mem" : "Soft mesh");
  setOption(el.backgroundStyle, 2, vi ? "Giay nhe" : "Paper calm");
  setOption(el.backgroundStyle, 3, vi ? "Nen toi" : "Dark ambient");
  setOption(el.uiLocale, 0, "English");
  setOption(el.uiLocale, 1, vi ? "Tieng Viet" : "Vietnamese");
  setOption(el.uiLocale, 2, vi ? "English + emoji" : "English + emoji");
  text(document.querySelector("#saveSettingsBtn"), vi ? "Luu cai dat" : "Save settings");
}

function text(node, value) {
  if (node) node.textContent = value;
}

function setOption(select, index, value) {
  if (select?.options?.[index]) select.options[index].textContent = value;
}

function getEditorHtml() {
  return state.richEditor ? state.richEditor.getContent() || "" : el.editor.value || "";
}

function setEditorHtml(html) {
  if (state.richEditor) {
    state.richEditor.setContent(html || "");
    return;
  }
  el.editor.value = html || "";
}

function getEditorText() {
  return state.richEditor ? state.richEditor.getContent({ format: "text" }) || "" : el.editor.value || "";
}

function insertEditorHtml(html) {
  if (state.richEditor) {
    state.richEditor.insertContent(html);
    return;
  }
  el.editor.value += html;
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
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
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

function isDocx(file) {
  const name = (file.name || "").toLowerCase();
  return file.mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || name.endsWith(".docx");
}

function isRtf(file) {
  const name = (file.name || "").toLowerCase();
  return /rtf/.test(file.mimeType || "") || name.endsWith(".rtf");
}

function isEditableImportFile(file) {
  return isTextFile(file) || isDocx(file) || isRtf(file);
}

function isPdf(file) {
  return file.mimeType === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

async function fileToEditorHtml(file) {
  const blob = toBlob(file.base64Data, file.mimeType);
  return blobToEditorHtml(blob, file.name, file.mimeType);
}

async function blobToEditorHtml(blob, name, mimeType = "") {
  if (isDocx({ name, mimeType })) {
    const arrayBuffer = await blob.arrayBuffer();
    const result = await window.mammoth.convertToHtml({ arrayBuffer });
    return `<section><h2>${esc(name)}</h2>${result.value}</section>`;
  }

  if (isRtf({ name, mimeType })) {
    const text = await blob.text();
    return `<section><h2>${esc(name)}</h2><pre>${esc(stripRtf(text))}</pre></section>`;
  }

  const text = await blob.text();
  if ((mimeType || "").includes("html") || /\.html?$/i.test(name)) {
    return `<section><h2>${esc(name)}</h2>${normalizeImportedHtml(text, name)}</section>`;
  }
  return `<section><h2>${esc(name)}</h2><pre>${esc(text)}</pre></section>`;
}

function stripRtf(text) {
  return String(text || "")
    .replace(/\\par[d]?/g, "\n")
    .replace(/\\'[0-9a-f]{2}/gi, "")
    .replace(/\\[a-z]+\d* ?/gi, "")
    .replace(/[{}]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function renderPdfEditor(base64Data) {
  if (!window.pdfjsLib) return;
  const pdfBytes = Uint8Array.from(atob(base64Data), (char) => char.charCodeAt(0));
  const pdf = await window.pdfjsLib.getDocument({ data: pdfBytes }).promise;
  el.pdfCanvasList.innerHTML = "";

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1.15 });
    const wrapper = document.createElement("div");
    wrapper.className = "pdf-page-wrap";
    wrapper.dataset.page = String(pageNumber);

    const canvas = document.createElement("canvas");
    canvas.className = "pdf-page-canvas";
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;

    const overlay = document.createElement("div");
    overlay.className = "pdf-page-overlay";
    overlay.style.width = `${viewport.width}px`;
    overlay.style.height = `${viewport.height}px`;
    overlay.onclick = (event) => handlePdfOverlayClick(event, pageNumber, viewport);

    wrapper.appendChild(canvas);
    wrapper.appendChild(overlay);
    el.pdfCanvasList.appendChild(wrapper);
  }
}

function togglePdfTextMode() {
  state.pdfEditor.addTextMode = !state.pdfEditor.addTextMode;
  el.pdfAddTextBtn.classList.toggle("active", state.pdfEditor.addTextMode);
}

function handlePdfOverlayClick(event, pageNumber, viewport) {
  if (!state.pdfEditor.addTextMode) return;
  const bounds = event.currentTarget.getBoundingClientRect();
  const x = event.clientX - bounds.left;
  const y = event.clientY - bounds.top;
  const textValue = window.prompt("Text to place on this PDF page:");
  if (!textValue) return;

  const note = {
    id: rid(),
    pageNumber,
    text: textValue,
    x,
    y,
    pageWidth: viewport.width,
    pageHeight: viewport.height
  };

  state.pdfEditor.annotations.push(note);
  drawPdfAnnotation(event.currentTarget, note);
}

function drawPdfAnnotation(overlay, note) {
  const badge = document.createElement("button");
  badge.type = "button";
  badge.className = "pdf-text-note";
  badge.style.left = `${note.x}px`;
  badge.style.top = `${note.y}px`;
  badge.textContent = note.text;
  badge.onclick = () => {
    if (!window.confirm("Remove this PDF note?")) return;
    state.pdfEditor.annotations = state.pdfEditor.annotations.filter((item) => item.id !== note.id);
    badge.remove();
  };
  overlay.appendChild(badge);
}

async function saveEditedPdf() {
  if (!state.pdfEditor.sourceBase64) return;
  const pdfBytes = Uint8Array.from(atob(state.pdfEditor.sourceBase64), (char) => char.charCodeAt(0));
  const pdfDoc = await window.PDFLib.PDFDocument.load(pdfBytes);
  const font = await pdfDoc.embedFont(window.PDFLib.StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();

  state.pdfEditor.annotations.forEach((note) => {
    const page = pages[note.pageNumber - 1];
    if (!page) return;
    const { width, height } = page.getSize();
    const x = (note.x / note.pageWidth) * width;
    const y = height - (note.y / note.pageHeight) * height;
    page.drawText(note.text, {
      x,
      y,
      size: 12,
      font,
      color: window.PDFLib.rgb(0.14, 0.26, 0.54)
    });
  });

  const savedBytes = await pdfDoc.save();
  const blob = new Blob([savedBytes], { type: "application/pdf" });
  const base64Data = await blobToBase64(blob);

  const response = await fetch(`/api/contracts/${state.activeId}/files`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: state.pdfEditor.fileName.replace(/\.pdf$/i, "") + "-edited.pdf",
      mimeType: "application/pdf",
      base64Data
    })
  });
  const data = await response.json();
  state.activeFiles.unshift(data.file);
  renderFiles();
  await openPdf(data.file.id, data.file.name);
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
