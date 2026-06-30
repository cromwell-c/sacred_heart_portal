# Sacred Heart of Jesus Church — Aboso Parish
## Membership Portal v2.2

A modern, responsive web application for managing church membership, dues payments, and financial transactions.

---

## 📋 Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running Locally](#running-locally)
- [Deployment](#deployment)
- [API Reference](#api-reference)
- [Security](#security)
- [Troubleshooting](#troubleshooting)

---

## ✨ Features

### Member Management
- ✅ Complete member registration with photo capture
- ✅ Advanced search by phone, national ID, or church member ID
- ✅ Thumbnail generation for efficient list display
- ✅ Member profile management

### Dues & Payments
- ✅ Record member dues payments
- ✅ Payment history tracking
- ✅ Collections summary reports
- ✅ Receipt generation and printing

### Finance Management
- ✅ Record revenue and expense transactions
- ✅ Categorized finance tracking
- ✅ Monthly/yearly cash flow reports
- ✅ Financial summaries and analysis

### User Management (Admin)
- ✅ Role-based access control (Admin, Data Entry, Finance, Viewer)
- ✅ User profile management
- ✅ Password management
- ✅ Activity tracking

---

## 🏗️ Architecture

### Tech Stack

**Backend:**
- Python 3.9+
- Flask 2.3 (REST API)
- SQLAlchemy 2.0 (ORM)
- SQLite (default database)

**Frontend:**
- Vanilla HTML5 / CSS3 / JavaScript (no frameworks)
- Responsive design
- Client-side validation

### System Components

```
Backend (Flask API)
├── app.py              # Main API dispatcher
├── models.py           # SQLAlchemy models (Star schema)
├── db.py               # Database initialization
├── images.py           # Image processing (capture, resize, compress)
├── config.py           # Configuration management
└── requirements.txt

Frontend (Single HTML file)
├── index.html          # All HTML/CSS/JS (modular code structure)
├── config.js           # Frontend configuration & constants
└── assets/             # Images, etc.

Database
└── church_portal.db    # SQLite database
```

### Database Schema (Star Schema)

**Dimensions:**
- `dim_user` - Portal users
- `dim_member` - Church members
- `dim_date` - Time dimension
- `dim_dues_type` - Types of member dues
- `dim_payment_method` - Payment methods
- `dim_finance_category` - Revenue/Expense categories

**Facts:**
- `fact_dues_payment` - Member payment records
- `fact_finance_transaction` - Income/expense records

---

## 📦 Prerequisites

- Python 3.9 or higher
- pip (Python package manager)
- Git (for version control)
- A modern web browser

---

## 🔧 Installation

### 1. Clone/Download the Project

```bash
cd "Aboso Church Proj"
```

### 2. Create Virtual Environment

**Windows (PowerShell):**
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

**macOS/Linux:**
```bash
python3 -m venv .venv
source .venv/bin/activate
```

### 3. Install Dependencies

```bash
# Upgrade pip
pip install --upgrade pip

# Install required packages
pip install -r backend/requirements.txt
```

### 4. Verify Installation

```bash
# Test Python environment
python --version
python -c "import flask; print(flask.__version__)"
```

---

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the project root:

```bash
# Database (defaults to SQLite)
DATABASE_URL=sqlite:///church_portal.db

# Server
FLASK_ENV=development
API_HOST=0.0.0.0
API_PORT=5000

# Security (change in production!)
SECRET_KEY=your-secret-key-here
PASSWORD_SALT=your-salt-here

# Logging
LOG_LEVEL=INFO
```

### Frontend Configuration

Update `frontend/config.js` for your environment:

```javascript
// Set API URL based on environment
const API_URL = window.API_URL || 
                localStorage.getItem('apiUrl') || 
                'http://localhost:5000/api';
```

**For production deployment:**
Set before loading the app:
```html
<script>
  window.API_URL = 'https://your-production-api.com/api';
</script>
<script src="config.js"></script>
```

---

## 🚀 Running Locally

### Start the Backend Server

```bash
# Activate virtual environment first
cd backend
python app.py
```

**Expected output:**
```
 * Running on http://0.0.0.0:5000
 * WARNING: This is a development server...
```

### Access the Frontend

Open in your browser:
```
http://localhost:5000
```

Or open `frontend/index.html` directly (limited functionality without backend).

### Default Login Credentials

- **Username:** `admin`
- **Password:** `admin1234`

⚠️ **IMPORTANT:** Change password immediately after first login.

---

## 🌐 Deployment

### Option 1: Deploy to Netlify (Frontend Only)

Frontend is a static SPA, can be hosted on Netlify:

1. **Build your app** (already optimized)
2. **Deploy to Netlify:**
   ```bash
   # Upload frontend/ folder or connect Git
   netlify deploy --prod --dir frontend/
   ```

### Option 2: Deploy Backend to Render

1. **Create Render account** at render.com
2. **Create new Web Service**
3. **Configure:**
   - Build command: `pip install -r backend/requirements.txt`
   - Start command: `python -m backend.app`
   - Set environment variables (DATABASE_URL, etc.)
4. **Deploy**

### Option 3: Deploy Backend to Railway

1. **Create Railway account** at railway.app
2. **Connect Git repository**
3. **Railway auto-detects Python**
4. **Deploy**

### Production Checklist

- [ ] Change SECRET_KEY and PASSWORD_SALT
- [ ] Use PostgreSQL instead of SQLite
- [ ] Enable HTTPS
- [ ] Set FLASK_ENV=production
- [ ] Enable proper logging
- [ ] Set up database backups
- [ ] Configure rate limiting
- [ ] Use a production WSGI server (Gunicorn)
- [ ] Set up error tracking (Sentry)
- [ ] Update CORS allowed origins

---

## 📡 API Reference

### Authentication

**Login:**
```bash
POST /api
action=loginUser&username=admin&password=admin1234
```

Response:
```json
{
  "success": true,
  "user_id": "USR-0001",
  "full_name": "System Administrator",
  "role": "admin"
}
```

### Member Management

**Get All Members:**
```bash
GET /api?action=getMembers
```

**Register Member:**
```bash
POST /api
action=registerMember
&first_name=Ama
&last_name=Mensah
&phone_primary=0244123456
&profile_photo=data:image/jpeg;base64,...
```

**Search Member:**
```bash
GET /api?action=searchMember&query=0244123456
```

### Dues Management

**Record Payment:**
```bash
POST /api
action=recordDuesPayment
&member_id=CHU-2026-0001
&dues_type=Tithe
&amount=100.00
&payment_method=Cash
```

**Get Member History:**
```bash
GET /api?action=getMemberDuesHistory&query=0244123456
```

---

## 🔒 Security

### Current Implementation

✅ **What's Implemented:**
- Password hashing (SHA256 + salt)
- Role-based access control (RBAC)
- Input validation and sanitization
- CORS protection
- Session management

⚠️ **Production Improvements Needed:**

1. **Use bcrypt instead of SHA256:**
```python
# Instead of: hashlib.sha256()
import bcrypt
hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt(12))
```

2. **Implement JWT tokens:**
```python
import jwt
token = jwt.encode({'user_id': user.id, 'exp': datetime.utcnow() + timedelta(hours=24)}, 
                   SECRET_KEY, algorithm='HS256')
```

3. **Add HTTPS/TLS** in production

4. **Implement rate limiting:**
```python
from flask_limiter import Limiter
limiter = Limiter(app, key_func=get_remote_address)
```

5. **Database:** Use PostgreSQL with encrypted connections

---

## 🐛 Troubleshooting

### "Module not found: flask_cors"

```bash
pip install Flask-CORS==4.0.0
```

### "Address already in use" port 5000

```bash
# Windows: Find and kill process on port 5000
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# macOS/Linux:
lsof -i :5000
kill -9 <PID>
```

### Profile photos not displaying

- Check if photo data is base64-encoded correctly
- Verify image size doesn't exceed 100KB
- Check browser console for JavaScript errors

### Database locked error

- Ensure only one instance of Flask is running
- Delete `church_portal.db-wal` and `church_portal.db-shm` files
- Restart the server

### API URL not found

1. Verify `config.js` is loaded
2. Check browser console: `console.log(API_URL)`
3. Ensure backend is running on configured URL

---

## 📝 License

This project is proprietary and confidential. For Sacred Heart of Jesus Catholic Church, Aboso Parish use only.

---

## 📞 Support

For issues, questions, or feature requests, contact the development team.

**Last Updated:** June 2026 | **Version:** 2.2
