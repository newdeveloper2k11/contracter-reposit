# Contract Vault

Contract Vault is a starter web app for creating, editing, duplicating, importing, and managing contracts with encrypted storage.

## What it does

- Rich text contract editor with Word-like formatting controls
- Create a new contract or generate one from an existing contract
- Upload files into a contract workspace and keep a visible file list with names and sizes
- Insert text-like uploaded files into the editor
- Autosave contract changes
- Encrypt contracts and uploaded files before saving them to the database
- Store Google Drive integration settings in the encrypted database
- Import or upload Drive files through Google Picker after providing Google Cloud credentials

## Run locally

1. Open PowerShell in `C:\Users\VoTro\OneDrive\Pictures\Desktop\contractor project`
2. Set an encryption key:

   ```powershell
   $env:CONTRACTS_ENCRYPTION_KEY="replace-with-a-strong-secret"
   ```

3. Start the server:

   ```powershell
   node server.js
   ```

4. Open `http://localhost:3000`

## Google Drive setup

This app uses the current browser-side Google Identity Services token flow and Google Picker.

Add these values in the Cloud settings dialog:

- Google OAuth client ID
- Google API key
- Google Cloud project number

After that:

1. Click `Connect Drive`
2. Grant access
3. Pick or upload a Drive file
4. The selected file is imported into the encrypted contract workspace

## Online storage

The current starter uses SQLite because it runs with no extra packages, but the app is structured so that the server is the storage boundary, not the browser. When you deploy it to a cloud server or VPS, the data is stored online on that server instead of on the user's computer.

For production, the next recommended move is replacing SQLite with a managed online database such as PostgreSQL, Supabase, Neon, or Turso.

## Files

- `server.js`: API routes, encrypted storage, settings, file uploads
- `public/index.html`: application layout and settings dialog
- `public/styles.css`: Word-like UI styling
- `public/app.js`: editor, autosave, uploads, Google Drive picker flow

## Production notes

- Deploy behind HTTPS before using Google OAuth in production
- Keep `CONTRACTS_ENCRYPTION_KEY` in a secret manager
- Add user authentication and per-user access control before handling real client contracts
- Move from SQLite to a managed hosted database for fully online persistence
