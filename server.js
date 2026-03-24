const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { DatabaseSync } = require("node:sqlite");

const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = path.join(__dirname, "data");
const DB_PATH = path.join(DATA_DIR, "contracts.db");
const PUBLIC_DIR = path.join(__dirname, "public");

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(PUBLIC_DIR, { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec(`
  CREATE TABLE IF NOT EXISTS contracts (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'General',
    source_contract_id TEXT,
    encrypted_content TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS files (
    id TEXT PRIMARY KEY,
    contract_id TEXT NOT NULL,
    name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    encrypted_data TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    encrypted_value TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_contracts_updated_at
  ON contracts(updated_at DESC);

  CREATE INDEX IF NOT EXISTS idx_files_contract_id
  ON files(contract_id, updated_at DESC);
`);

const baseKey = getEncryptionKey();

seedIfEmpty();

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (url.pathname.startsWith("/api/")) {
      await handleApi(req, res, url);
      return;
    }

    serveStatic(url.pathname, res);
  } catch (error) {
    console.error(error);
    const status = error.statusCode || 500;
    sendJson(res, status, { error: error.message || "Internal server error." });
  }
});

server.listen(PORT, () => {
  console.log(`Contract editor running on http://localhost:${PORT}`);
});

async function handleApi(req, res, url) {
  if (req.method === "GET" && url.pathname === "/api/contracts") {
    const rows = db
      .prepare(`
        SELECT id, title, category, source_contract_id, created_at, updated_at
        FROM contracts
        ORDER BY updated_at DESC
      `)
      .all()
      .map(mapContractListItem);

    sendJson(res, 200, { contracts: rows });
    return;
  }

  if (req.method === "GET" && url.pathname.startsWith("/api/contracts/") && !url.pathname.includes("/files")) {
    const id = url.pathname.split("/").pop();
    const row = db
      .prepare(`
        SELECT id, title, category, source_contract_id, encrypted_content, created_at, updated_at
        FROM contracts
        WHERE id = ?
      `)
      .get(id);

    if (!row) {
      sendNotFound();
    }

    sendJson(res, 200, {
      contract: {
        id: row.id,
        title: row.title,
        category: row.category,
        sourceContractId: row.source_contract_id,
        content: decrypt(row.encrypted_content),
        createdAt: row.created_at,
        updatedAt: row.updated_at
      },
      files: listFilesForContract(id)
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/contracts") {
    const body = await readJson(req);
    const now = new Date().toISOString();
    const title = safeText(body.title, "Untitled contract");
    const category = safeText(body.category, "General");
    const content = typeof body.content === "string" ? body.content : defaultContractContent(title);
    const sourceContractId = typeof body.sourceContractId === "string" ? body.sourceContractId : null;
    const id = crypto.randomUUID();

    db.prepare(`
      INSERT INTO contracts (id, title, category, source_contract_id, encrypted_content, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, title, category, sourceContractId, encrypt(content), now, now);

    sendJson(res, 201, {
      contract: {
        id,
        title,
        category,
        sourceContractId,
        content,
        createdAt: now,
        updatedAt: now
      },
      files: []
    });
    return;
  }

  if (req.method === "PUT" && url.pathname.startsWith("/api/contracts/") && !url.pathname.includes("/files")) {
    const id = url.pathname.split("/").pop();
    const body = await readJson(req);
    const existing = db.prepare("SELECT id FROM contracts WHERE id = ?").get(id);

    if (!existing) {
      sendNotFound();
    }

    const now = new Date().toISOString();
    const title = safeText(body.title, "Untitled contract");
    const category = safeText(body.category, "General");
    const content = typeof body.content === "string" ? body.content : "";

    db.prepare(`
      UPDATE contracts
      SET title = ?, category = ?, encrypted_content = ?, updated_at = ?
      WHERE id = ?
    `).run(title, category, encrypt(content), now, id);

    sendJson(res, 200, {
      contract: {
        id,
        title,
        category,
        content,
        updatedAt: now
      }
    });
    return;
  }

  if (req.method === "POST" && url.pathname.endsWith("/duplicate")) {
    const id = url.pathname.split("/")[3];
    const source = db
      .prepare(`
        SELECT id, title, category, encrypted_content
        FROM contracts
        WHERE id = ?
      `)
      .get(id);

    if (!source) {
      sendNotFound("Source contract not found.");
    }

    const now = new Date().toISOString();
    const duplicateId = crypto.randomUUID();
    const title = `${source.title} Copy`;
    const content = decrypt(source.encrypted_content);

    db.prepare(`
      INSERT INTO contracts (id, title, category, source_contract_id, encrypted_content, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(duplicateId, title, source.category, source.id, encrypt(content), now, now);

    const sourceFiles = db
      .prepare(`
        SELECT name, mime_type, encrypted_data, size_bytes
        FROM files
        WHERE contract_id = ?
      `)
      .all(source.id);

    const insertFile = db.prepare(`
      INSERT INTO files (id, contract_id, name, mime_type, encrypted_data, size_bytes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const file of sourceFiles) {
      insertFile.run(
        crypto.randomUUID(),
        duplicateId,
        file.name,
        file.mime_type,
        file.encrypted_data,
        file.size_bytes,
        now,
        now
      );
    }

    sendJson(res, 201, {
      contract: {
        id: duplicateId,
        title,
        category: source.category,
        sourceContractId: source.id,
        content,
        createdAt: now,
        updatedAt: now
      },
      files: listFilesForContract(duplicateId)
    });
    return;
  }

  if (req.method === "DELETE" && url.pathname.startsWith("/api/contracts/") && !url.pathname.includes("/files")) {
    const id = url.pathname.split("/").pop();
    db.prepare("DELETE FROM files WHERE contract_id = ?").run(id);
    const info = db.prepare("DELETE FROM contracts WHERE id = ?").run(id);

    if (info.changes === 0) {
      sendNotFound();
    }

    sendJson(res, 200, { success: true });
    return;
  }

  if (req.method === "POST" && url.pathname.endsWith("/files")) {
    const contractId = url.pathname.split("/")[3];
    assertContractExists(contractId);

    const body = await readJson(req);
    const name = safeText(body.name, "uploaded-file");
    const mimeType = safeText(body.mimeType, "application/octet-stream");
    const base64Data = typeof body.base64Data === "string" ? body.base64Data : "";

    if (!base64Data) {
      badRequest("Missing file content.");
    }

    const binary = Buffer.from(base64Data, "base64");
    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    db.prepare(`
      INSERT INTO files (id, contract_id, name, mime_type, encrypted_data, size_bytes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, contractId, name, mimeType, encryptBinary(binary), binary.byteLength, now, now);

    sendJson(res, 201, {
      file: {
        id,
        contractId,
        name,
        mimeType,
        sizeBytes: binary.byteLength,
        createdAt: now,
        updatedAt: now
      }
    });
    return;
  }

  if (req.method === "GET" && /\/api\/contracts\/[^/]+\/files\/[^/]+$/.test(url.pathname)) {
    const [, , , contractId, , fileId] = url.pathname.split("/");
    assertContractExists(contractId);
    const row = db
      .prepare(`
        SELECT id, contract_id, name, mime_type, encrypted_data, size_bytes, created_at, updated_at
        FROM files
        WHERE id = ? AND contract_id = ?
      `)
      .get(fileId, contractId);

    if (!row) {
      sendNotFound("File not found.");
    }

    sendJson(res, 200, {
      file: {
        id: row.id,
        contractId: row.contract_id,
        name: row.name,
        mimeType: row.mime_type,
        sizeBytes: row.size_bytes,
        base64Data: decryptBinary(row.encrypted_data).toString("base64"),
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }
    });
    return;
  }

  if (req.method === "DELETE" && /\/api\/contracts\/[^/]+\/files\/[^/]+$/.test(url.pathname)) {
    const [, , , contractId, , fileId] = url.pathname.split("/");
    assertContractExists(contractId);
    const result = db.prepare("DELETE FROM files WHERE id = ? AND contract_id = ?").run(fileId, contractId);

    if (result.changes === 0) {
      sendNotFound("File not found.");
    }

    sendJson(res, 200, { success: true });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/settings") {
    sendJson(res, 200, {
      settings: {
        googleDriveClientId: getSetting("googleDriveClientId", ""),
        googleDriveApiKey: getSetting("googleDriveApiKey", ""),
        googleDriveProjectNumber: getSetting("googleDriveProjectNumber", ""),
        storageMode: getSetting("storageMode", "database"),
        tinyMceKey: getSetting("tinyMceKey", ""),
        appearanceTheme: getSetting("appearanceTheme", "aurora"),
        backgroundStyle: getSetting("backgroundStyle", "glow"),
        uiLocale: getSetting("uiLocale", "en-US")
      }
    });
    return;
  }

  if (req.method === "PUT" && url.pathname === "/api/settings") {
    const body = await readJson(req);
    const now = new Date().toISOString();
    if (Object.prototype.hasOwnProperty.call(body, "googleDriveClientId")) {
      putSetting("googleDriveClientId", safeText(body.googleDriveClientId || "", ""), now);
    }
    if (Object.prototype.hasOwnProperty.call(body, "googleDriveApiKey")) {
      putSetting("googleDriveApiKey", safeText(body.googleDriveApiKey || "", ""), now);
    }
    if (Object.prototype.hasOwnProperty.call(body, "googleDriveProjectNumber")) {
      putSetting("googleDriveProjectNumber", safeText(body.googleDriveProjectNumber || "", ""), now);
    }
    if (Object.prototype.hasOwnProperty.call(body, "storageMode")) {
      putSetting("storageMode", safeText(body.storageMode || "database", "database"), now);
    }
    putSetting("appearanceTheme", safeText(body.appearanceTheme || "aurora", "aurora"), now);
    putSetting("backgroundStyle", safeText(body.backgroundStyle || "glow", "glow"), now);
    putSetting("uiLocale", safeText(body.uiLocale || "en-US", "en-US"), now);

    sendJson(res, 200, {
      success: true,
      settings: {
        googleDriveClientId: getSetting("googleDriveClientId", ""),
        googleDriveApiKey: getSetting("googleDriveApiKey", ""),
        googleDriveProjectNumber: getSetting("googleDriveProjectNumber", ""),
        storageMode: getSetting("storageMode", "database"),
        tinyMceKey: getSetting("tinyMceKey", ""),
        appearanceTheme: getSetting("appearanceTheme", "aurora"),
        backgroundStyle: getSetting("backgroundStyle", "glow"),
        uiLocale: getSetting("uiLocale", "en-US")
      }
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/google-docs/create") {
    const body = await readJson(req);
    const accessToken = safeLongText(body.accessToken || "");
    const title = safeText(body.title, "New Google Doc");
    const pages = Array.isArray(body.pages) ? body.pages : [];

    if (!accessToken) {
      badRequest("Missing Google access token.");
    }

    const documentText = pagesToPlainText(pages, title);
    const created = await createGoogleDocument(accessToken, title, documentText);
    sendJson(res, 201, created);
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/google-docs/generate") {
    const body = await readJson(req);
    const accessToken = safeLongText(body.accessToken || "");
    const title = safeText(body.title, "Generated Google Doc");
    const prompt = safeLongText(body.prompt || "");
    const referenceContent = typeof body.referenceContent === "string" ? body.referenceContent.slice(0, 25000) : "";

    if (!accessToken) {
      badRequest("Missing Google access token.");
    }

    if (!prompt) {
      badRequest("Missing prompt.");
    }

    const generatedText = await generateContractText(prompt, referenceContent, title);
    const created = await createGoogleDocument(accessToken, title, generatedText);
    sendJson(res, 201, created);
    return;
  }

  sendNotFound("Route not found.");
}

function serveStatic(requestPath, res) {
  const normalized = requestPath === "/" ? "/index.html" : requestPath;
  const filePath = path.normalize(path.join(PUBLIC_DIR, normalized));

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, file) => {
    if (error) {
      res.writeHead(error.code === "ENOENT" ? 404 : 500, {
        "Content-Type": "text/plain; charset=utf-8"
      });
      res.end(error.code === "ENOENT" ? "Not found" : "Server error");
      return;
    }

    res.writeHead(200, { "Content-Type": contentType(filePath) });
    res.end(file);
  });
}

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8"
  };

  return map[ext] || "application/octet-stream";
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(payload));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 10_000_000) {
        reject(withStatus(new Error("Request too large"), 413));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch {
        reject(withStatus(new Error("Invalid JSON body"), 400));
      }
    });
    req.on("error", reject);
  });
}

function safeText(value, fallback) {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, 180) : fallback;
}

function safeLongText(value) {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim().slice(0, 25000);
}

function getEncryptionKey() {
  const raw = process.env.CONTRACTS_ENCRYPTION_KEY;

  if (raw) {
    return crypto.createHash("sha256").update(raw).digest();
  }

  const devFallback = crypto.createHash("sha256").update("local-dev-contracts-key").digest();
  console.warn("Using development encryption key. Set CONTRACTS_ENCRYPTION_KEY in production.");
  return devFallback;
}

function encrypt(plainText) {
  return encryptBuffer(Buffer.from(String(plainText), "utf8"));
}

function decrypt(payload) {
  return decryptBuffer(payload).toString("utf8");
}

function encryptBinary(buffer) {
  return encryptBuffer(buffer);
}

function decryptBinary(payload) {
  return decryptBuffer(payload);
}

function encryptBuffer(buffer) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", baseKey, iv);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), encrypted.toString("base64")].join(".");
}

function decryptBuffer(payload) {
  const [ivText, tagText, dataText] = String(payload).split(".");
  const decipher = crypto.createDecipheriv("aes-256-gcm", baseKey, Buffer.from(ivText, "base64"));
  decipher.setAuthTag(Buffer.from(tagText, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataText, "base64")),
    decipher.final()
  ]);
}

function pagesToPlainText(pages, fallbackTitle) {
  if (!Array.isArray(pages) || pages.length === 0) {
    return htmlToPlainText(defaultContractContent(fallbackTitle));
  }

  return pages
    .map((page, index) => {
      const pageName = safeText(page?.name || `Page ${index + 1}`, `Page ${index + 1}`);
      const html = typeof page?.html === "string" ? page.html : "";
      return `${pageName}\n${"=".repeat(pageName.length)}\n\n${htmlToPlainText(html)}`;
    })
    .join("\n\n");
}

function htmlToPlainText(html) {
  return String(html || "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<\/(p|div|h1|h2|h3|h4|h5|h6|li|tr|section)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function createGoogleDocument(accessToken, title, contentText) {
  const createResponse = await fetch("https://docs.googleapis.com/v1/documents", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ title })
  });

  if (!createResponse.ok) {
    const message = await createResponse.text();
    throw withStatus(new Error(`Google Docs create failed: ${message}`), 502);
  }

  const created = await createResponse.json();
  const insertText = contentText && contentText.trim() ? contentText.trim() : "New document";

  const updateResponse = await fetch(`https://docs.googleapis.com/v1/documents/${created.documentId}:batchUpdate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      requests: [
        {
          insertText: {
            location: { index: 1 },
            text: insertText
          }
        }
      ]
    })
  });

  if (!updateResponse.ok) {
    const message = await updateResponse.text();
    throw withStatus(new Error(`Google Docs update failed: ${message}`), 502);
  }

  return {
    documentId: created.documentId,
    title,
    documentUrl: `https://docs.google.com/document/d/${created.documentId}/edit`
  };
}

async function generateContractText(prompt, referenceContent, title) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw withStatus(new Error("OPENAI_API_KEY is not set on the server."), 400);
  }

  const model = process.env.OPENAI_MODEL || "gpt-5";
  const input = [
    {
      role: "system",
      content: [
        {
          type: "input_text",
          text:
            "Write a professional contract or agreement draft. Return plain text only, with clear headings and clauses. Do not use markdown fences."
        }
      ]
    },
    {
      role: "user",
      content: [
        {
          type: "input_text",
          text: `Title: ${title}\n\nPrompt:\n${prompt}\n\nReference content:\n${referenceContent || "None"}`
        }
      ]
    }
  ];

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      input
    })
  });

  if (!response.ok) {
    const message = await response.text();
    throw withStatus(new Error(`OpenAI generation failed: ${message}`), 502);
  }

  const data = await response.json();
  const text =
    data.output_text ||
    extractTextFromResponse(data) ||
    `${title}\n\n${prompt}`;

  return String(text).trim();
}

function extractTextFromResponse(data) {
  if (!Array.isArray(data?.output)) {
    return "";
  }

  return data.output
    .flatMap((item) => item.content || [])
    .filter((item) => item.type === "output_text")
    .map((item) => item.text || "")
    .join("\n")
    .trim();
}

function seedIfEmpty() {
  const row = db.prepare("SELECT COUNT(*) AS count FROM contracts").get();
  if (row.count > 0) {
    return;
  }

  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const title = "Master Services Agreement";
  db.prepare(`
    INSERT INTO contracts (id, title, category, source_contract_id, encrypted_content, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, title, "Services", null, encrypt(defaultContractContent(title)), now, now);
}

function defaultContractContent(title) {
  return `
    <h1>${escapeHtml(title)}</h1>
    <p><strong>Parties:</strong> [Client Name] and [Contractor Name]</p>
    <p><strong>Effective date:</strong> ${new Date().toLocaleDateString()}</p>
    <h2>Scope of work</h2>
    <p>Describe the services, deliverables, and milestones for this agreement.</p>
    <h2>Payment terms</h2>
    <p>Include fee structure, invoice timing, due dates, and late payment rules.</p>
    <h2>Confidentiality</h2>
    <p>Define what information is confidential and how it should be protected.</p>
    <h2>Deliverables table</h2>
    <table>
      <thead>
        <tr><th>Milestone</th><th>Date</th><th>Amount</th></tr>
      </thead>
      <tbody>
        <tr><td>Kickoff</td><td>[Date]</td><td>[$]</td></tr>
      </tbody>
    </table>
    <h2>Signatures</h2>
    <p>Client: ____________________</p>
    <p>Contractor: ____________________</p>
  `.trim();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function mapContractListItem(row) {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    sourceContractId: row.source_contract_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    fileCount: Number(
      db.prepare("SELECT COUNT(*) AS count FROM files WHERE contract_id = ?").get(row.id).count
    )
  };
}

function listFilesForContract(contractId) {
  return db
    .prepare(`
      SELECT id, contract_id, name, mime_type, size_bytes, created_at, updated_at
      FROM files
      WHERE contract_id = ?
      ORDER BY updated_at DESC
    `)
    .all(contractId)
    .map(row => ({
      id: row.id,
      contractId: row.contract_id,
      name: row.name,
      mimeType: row.mime_type,
      sizeBytes: row.size_bytes,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
}

function assertContractExists(contractId) {
  const row = db.prepare("SELECT id FROM contracts WHERE id = ?").get(contractId);
  if (!row) {
    sendNotFound("Contract not found.");
  }
}

function getSetting(key, fallback) {
  const envMap = {
    googleDriveClientId: process.env.GOOGLE_DRIVE_CLIENT_ID,
    googleDriveApiKey: process.env.GOOGLE_DRIVE_API_KEY,
    googleDriveProjectNumber: process.env.GOOGLE_DRIVE_PROJECT_NUMBER,
    storageMode: process.env.STORAGE_MODE,
    tinyMceKey: process.env.TinyMCE_KEY || process.env.TINYMCE_KEY
  };
  if (envMap[key]) {
    return envMap[key];
  }
  const row = db.prepare("SELECT encrypted_value FROM app_settings WHERE key = ?").get(key);
  if (!row) {
    return fallback;
  }
  return decrypt(row.encrypted_value);
}

function putSetting(key, value, updatedAt) {
  db.prepare(`
    INSERT INTO app_settings (key, encrypted_value, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET
      encrypted_value = excluded.encrypted_value,
      updated_at = excluded.updated_at
  `).run(key, encrypt(String(value || "")), updatedAt);
}

function withStatus(error, statusCode) {
  error.statusCode = statusCode;
  return error;
}

function badRequest(message) {
  throw withStatus(new Error(message), 400);
}

function sendNotFound(message = "Contract not found.") {
  throw withStatus(new Error(message), 404);
}
