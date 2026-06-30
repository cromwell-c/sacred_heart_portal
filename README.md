# Aboso Church Membership Portal

## Overview

This repository now includes a new SQL backend for the Aboso Church portal.
The frontend continues to run from `frontend/index.html`, while the backend has been upgraded from Google Sheets to an SQLite-based star schema.

- `frontend/` contains the static portal UI.
- `backend/` contains the new Flask + SQLAlchemy backend.
- `code.gs` remains as a legacy Apps Script reference and is now deprecated.

## New backend architecture

The new backend uses:
- `backend/app.py` — Flask REST API entrypoint
- `backend/models.py` — star schema data model definitions
- `backend/db.py` — database connection and initialization
- `backend/migrate.py` — create database and optionally import existing Sheets data
- `backend/requirements.txt` — new backend dependencies

## Setup

1. Install the backend dependencies:

```powershell
python -m venv venv
venv\Scripts\activate
pip install -r backend/requirements.txt
```

2. Initialize the database:

```powershell
python backend/migrate.py --initdb
```

3. (Optional) Import the current Google Sheets data if you still have service account access:

```powershell
set SERVICE_ACCOUNT_FILE=C:\path\to\service-account.json
set SPREADSHEET_ID=your_spreadsheet_id_here
python backend/migrate.py --import-sheets
```

4. Run the backend locally:

```powershell
python backend/app.py
```

## API URL

When running locally, the API is available at:

```
http://localhost:5000/api
```

The client now also supports a GitHub Pages-friendly demo mode. If the backend is unavailable, the app falls back to local sample data automatically so you can still test the UI and workflows in the browser.

To override the API target manually, set `window.API_URL` or `localStorage.setItem('apiUrl','...')` before loading the app.

## Notes

- The SQL backend retains the same `action` API contract used by the frontend.
- New data is stored in `backend/church_portal.db` by default.
- The older Apps Script/Google Sheets backend is retained only as a legacy artifact.
- Use a production-ready WSGI server if deploying beyond local development.
