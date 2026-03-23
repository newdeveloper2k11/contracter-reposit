const state = {
  contracts: [],
  activeId: null,
  activeContract: null,
  activeFiles: [],
  saveTimer: null,
  isLoading: false,
  settings: null,
  google: {
    tokenClient: null,
    accessToken: null,
    pickerReady: false
  }
};

const elements = {
  contractList: document.querySelector("#contractList"),
  searchInput: document.querySelector("#searchInput"),
  newContractBtn: document.querySelector("#newContractBtn"),
  duplicateBtn: document.querySelector("#duplicateBtn"),
  settingsBtn: document.querySelector("#settingsBtn"),
  deleteBtn: document.querySelector("#deleteBtn"),
  downloadHtmlBtn: document.querySelector("#downloadHtmlBtn"),
  titleInput: document.querySelector("#titleInput"),
  categoryInput: document.querySelector("#categoryInput"),
  editor: document.querySelector("#editor"),
  saveStatus: document.querySelector("#saveStatus"),
  fileInput: document.querySelector("#fileInput"),
  insertTextFileBtn: document.querySelector("#insertTextFileBtn"),
  connectDriveBtn: document.querySelector("#connectDriveBtn"),
  fileList: document.querySelector("#fileList"),
  fileCount: document.querySelector("#fileCount"),
  driveStatus: document.querySelector("#driveStatus"),
  settingsDialog: document.querySelector("#settingsDialog"),
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

elements.searchInput.addEventListener("input", renderContractList);
elements.newContractBtn.addEventListener("click", createContract);
elements.duplicateBtn.addEventListener("click", duplicateContract);
elements.settingsBtn.addEventListener("click", openSettings);
elements.deleteBtn.addEventListener("click", deleteContract);
elements.downloadHtmlBtn.addEventListener("click", downloadHtml);
elements.titleInput.addEventListener("input", scheduleSave);
elements.categoryInput.addEventListener("input", scheduleSave);
elements.editor.addEventListener("input", scheduleSave);
elements.fileInput.addEventListener("change", event => uploadSelectedFile(event.target.files?.[0]));
elements.insertTextFileBtn.addEventListener("click", insertMostRecentTextFile);
elements.connectDriveBtn.addEventListener("click", connectGoogleDrive);
elements.settingsForm.addEventListener("submit", saveSettings);

boot();

async function boot() {
  await loadSettings();
  initializeGoogleClients();
  await loadContracts();
}

async function loadSettings() {
  const response = await fetch("/api/settings");
  const data = await response.json();
  state.settings = data.settings;
  hydrateSettingsForm();
  updateDriveStatus();
}

async function loadContracts() {
  setStatus("Loading contracts...");
  const response = await fetch("/api/contracts");
  const data = await response.json();
  state.contracts = data.contracts;
  renderContractList();

  if (state.contracts[0]) {
    await selectContract(state.contracts[0].id);
  } else {
    setStatus("No contracts yet.");
  }
}

async function selectContract(id) {
  state.activeId = id;
  renderContractList();
  lockEditor(true);
  setStatus("Loading contract...");

  const response = await fetch(`/api/contracts/${id}`);
  const data = await response.json();
  state.activeContract = data.contract;
  state.activeFiles = data.files || [];
  elements.titleInput.value = data.contract.title;
  elements.categoryInput.value = data.contract.category;
  elements.editor.innerHTML = data.contract.content;
  renderFileList();
  lockEditor(false);
  elements.duplicateBtn.disabled = false;
  elements.deleteBtn.disabled = false;
  elements.downloadHtmlBtn.disabled = false;
  setStatus(`Saved ${formatDate(data.contract.updatedAt)}`);
}

function renderContractList() {
  const query = elements.searchInput.value.trim().toLowerCase();
  const filtered = state.contracts.filter(contract => {
    const haystack = `${contract.title} ${contract.category}`.toLowerCase();
    return haystack.includes(query);
  });

  elements.contractList.innerHTML = "";

  for (const contract of filtered) {
    const button = document.createElement("button");
    button.className = `contract-item ${contract.id === state.activeId ? "active" : ""}`;
    button.innerHTML = `
      <h3>${escapeHtml(contract.title)}</h3>
      <div class="contract-meta">
        <span>${escapeHtml(contract.category)}</span>
        <span>${contract.fileCount} files</span>
      </div>
      <div class="contract-meta">
        <span>${contract.sourceContractId ? "Generated" : "Original"}</span>
        <span>${formatDate(contract.updatedAt)}</span>
      </div>
    `;
    button.addEventListener("click", () => selectContract(contract.id));
    elements.contractList.appendChild(button);
  }

  if (!filtered.length) {
    const empty = document.createElement("p");
    empty.className = "subtle";
    empty.textContent = "No contracts match your search.";
    elements.contractList.appendChild(empty);
  }
}

function renderFileList() {
  elements.fileList.innerHTML = "";
  elements.fileCount.textContent = `${state.activeFiles.length} file${state.activeFiles.length === 1 ? "" : "s"}`;
  elements.insertTextFileBtn.disabled = !state.activeFiles.some(isTextLikeFile);

  if (!state.activeFiles.length) {
    const empty = document.createElement("p");
    empty.className = "drive-status";
    empty.textContent = "Upload documents, templates, PDFs, or text files here.";
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
      <div class="file-meta">
        <span>${formatDate(file.updatedAt)}</span>
        <span>${isTextLikeFile(file) ? "Insertable" : "Stored"}</span>
      </div>
    `;

    const actions = document.createElement("div");
    actions.className = "file-item-actions";

    const downloadBtn = document.createElement("button");
    downloadBtn.className = "secondary-btn";
    downloadBtn.textContent = "Download";
    downloadBtn.addEventListener("click", () => downloadFile(file.id));
    actions.appendChild(downloadBtn);

    if (isTextLikeFile(file)) {
      const insertBtn = document.createElement("button");
      insertBtn.className = "secondary-btn";
      insertBtn.textContent = "Insert";
      insertBtn.addEventListener("click", () => insertFileIntoEditor(file.id));
      actions.appendChild(insertBtn);
    }

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "danger-btn";
    deleteBtn.textContent = "Remove";
    deleteBtn.addEventListener("click", () => deleteFile(file.id));
    actions.appendChild(deleteBtn);

    item.appendChild(actions);
    elements.fileList.appendChild(item);
  }
}

async function createContract() {
  setStatus("Creating contract...");
  const response = await fetch("/api/contracts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "New contract",
      category: "General"
    })
  });
  const data = await response.json();
  state.contracts.unshift(toListItem(data.contract, data.files));
  await selectContract(data.contract.id);
}

async function duplicateContract() {
  if (!state.activeId) {
    return;
  }

  setStatus("Generating from selected contract...");
  const response = await fetch(`/api/contracts/${state.activeId}/duplicate`, {
    method: "POST"
  });
  const data = await response.json();
  state.contracts.unshift(toListItem(data.contract, data.files));
  await selectContract(data.contract.id);
}

async function deleteContract() {
  if (!state.activeId) {
    return;
  }

  const confirmed = window.confirm("Delete this contract permanently?");
  if (!confirmed) {
    return;
  }

  setStatus("Deleting...");
  await fetch(`/api/contracts/${state.activeId}`, { method: "DELETE" });
  state.contracts = state.contracts.filter(contract => contract.id !== state.activeId);
  state.activeId = null;
  state.activeContract = null;
  state.activeFiles = [];
  elements.titleInput.value = "";
  elements.categoryInput.value = "";
  elements.editor.innerHTML = "";
  elements.duplicateBtn.disabled = true;
  elements.deleteBtn.disabled = true;
  elements.downloadHtmlBtn.disabled = true;
  renderContractList();
  renderFileList();

  if (state.contracts[0]) {
    await selectContract(state.contracts[0].id);
  } else {
    setStatus("Contract deleted.");
  }
}

function scheduleSave() {
  if (!state.activeId || state.isLoading) {
    return;
  }

  setStatus("Saving draft...");
  clearTimeout(state.saveTimer);
  state.saveTimer = window.setTimeout(saveActiveContract, 700);
}

async function saveActiveContract() {
  if (!state.activeId) {
    return;
  }

  const payload = {
    title: elements.titleInput.value.trim() || "Untitled contract",
    category: elements.categoryInput.value.trim() || "General",
    content: elements.editor.innerHTML
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

  renderContractList();
  setStatus(`Saved ${formatDate(data.contract.updatedAt)}`);
}

async function uploadSelectedFile(file) {
  if (!file || !state.activeId) {
    return;
  }

  setStatus(`Uploading ${file.name}...`);
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
  elements.fileInput.value = "";
  setStatus(`Uploaded ${file.name}`);
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

async function deleteFile(fileId) {
  await fetch(`/api/contracts/${state.activeId}/files/${fileId}`, { method: "DELETE" });
  state.activeFiles = state.activeFiles.filter(file => file.id !== fileId);
  syncFileCountOnList();
  renderFileList();
  setStatus("File removed.");
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
  const markup = file.mimeType.includes("html")
    ? text
    : `<h2>${escapeHtml(file.name)}</h2><pre>${escapeHtml(text)}</pre>`;

  document.execCommand("insertHTML", false, markup);
  scheduleSave();
  setStatus(`Inserted ${file.name} into the document.`);
}

function downloadHtml() {
  if (!state.activeContract) {
    return;
  }

  const html = `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>${escapeHtml(elements.titleInput.value || "Contract")}</title>
      </head>
      <body>${elements.editor.innerHTML}</body>
    </html>
  `.trim();

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${slugify(elements.titleInput.value || "contract")}.html`;
  link.click();
  URL.revokeObjectURL(url);
}

function runEditorAction(action) {
  if (action === "h1") {
    document.execCommand("formatBlock", false, "<h1>");
    return;
  }

  if (action === "h2") {
    document.execCommand("formatBlock", false, "<h2>");
    return;
  }

  if (action === "paragraph") {
    document.execCommand("formatBlock", false, "<p>");
    return;
  }

  if (action === "table") {
    document.execCommand(
      "insertHTML",
      false,
      `<table><thead><tr><th>Item</th><th>Due date</th><th>Notes</th></tr></thead><tbody><tr><td></td><td></td><td></td></tr></tbody></table><p></p>`
    );
    return;
  }

  if (action === "signature") {
    document.execCommand(
      "insertHTML",
      false,
      `<p>Signature: ____________________________</p><p>Name: _________________________________</p>`
    );
  }
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

  if (!state.google.tokenClient) {
    initializeGoogleClients();
  }

  if (!state.google.tokenClient) {
    elements.driveStatus.textContent = "Google Identity Services has not loaded yet.";
    return;
  }

  if (state.google.accessToken) {
    openDrivePicker();
    return;
  }

  elements.driveStatus.textContent = "Requesting Drive access...";
  state.google.tokenClient.requestAccessToken({ prompt: "consent" });
}

function openDrivePicker() {
  if (!window.google?.picker || !state.google.accessToken || !state.google.pickerReady) {
    elements.driveStatus.textContent = "Google Picker is still loading.";
    return;
  }

  const docsView = new google.picker.DocsView(google.picker.ViewId.DOCS);
  const uploadView = new google.picker.DocsUploadView();

  const picker = new google.picker.PickerBuilder()
    .setAppId(state.settings.googleDriveProjectNumber)
    .setDeveloperKey(state.settings.googleDriveApiKey)
    .setOAuthToken(state.google.accessToken)
    .addView(docsView)
    .addView(uploadView)
    .setCallback(handleDrivePickerSelection)
    .build();

  picker.setVisible(true);
  elements.driveStatus.textContent = "Drive connected.";
}

async function handleDrivePickerSelection(data) {
  if (!window.google?.picker) {
    return;
  }

  if (data.action !== google.picker.Action.PICKED || !data.docs?.length) {
    return;
  }

  const doc = data.docs[0];
  elements.driveStatus.textContent = `Importing ${doc.name} from Drive...`;

  try {
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${doc.id}?alt=media`, {
      headers: {
        Authorization: `Bearer ${state.google.accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error("The selected Drive file could not be downloaded directly.");
    }

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

    if (isTextLikeFile(uploadData.file)) {
      await insertFileIntoEditor(uploadData.file.id);
    }

    elements.driveStatus.textContent = `Imported ${doc.name} from Drive.`;
  } catch (error) {
    elements.driveStatus.textContent = error.message;
  }
}

function updateDriveStatus() {
  if (!state.settings?.googleDriveClientId) {
    elements.driveStatus.textContent = "Drive not connected. Add Google Cloud keys in Cloud settings.";
    return;
  }

  if (state.google.accessToken) {
    elements.driveStatus.textContent = `Drive ready in ${state.settings.storageMode} mode.`;
    return;
  }

  elements.driveStatus.textContent = "Drive configured. Click Connect Drive to import or upload.";
}

function setStatus(message) {
  elements.saveStatus.textContent = message;
}

function formatDate(value) {
  if (!value) {
    return "just now";
  }

  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function formatBytes(value) {
  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

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

function syncFileCountOnList() {
  const item = state.contracts.find(contract => contract.id === state.activeId);
  if (item) {
    item.fileCount = state.activeFiles.length;
  }
  renderContractList();
}

function lockEditor(disabled) {
  state.isLoading = disabled;
  elements.titleInput.disabled = disabled;
  elements.categoryInput.disabled = disabled;
  elements.editor.contentEditable = disabled ? "false" : "true";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function slugify(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      resolve(result.split(",")[1]);
    };
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
