# MISP Dashboard Startup Instructions

## Prerequisites
Make sure you have a `.env` file in the root directory if you need to pass environment variables (like `GEMINI_API_KEY` for the backend).

---

## 1. Using Docker Compose (Recommended for Backend)

Your project already has a `docker-compose.yml` configured for the backend. This is the easiest way to run it.

```bash
# In the misp-dashboard directory:
docker compose up --build
```
*(This starts the backend on `http://localhost:8000`)*

---

## 2. Running Explicitly (Without Docker Compose)

### Backend (Local Python Environment)

If you want to run the backend natively without Docker:

```bash
cd backend
# Create and activate a virtual environment (optional but recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the FastAPI server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
*(The backend will be available at `http://localhost:8000`)*

### Backend (Standalone Docker)

If you just want to run the Dockerfile directly without `docker-compose`:

```bash
cd backend
docker build -t misp-backend .
docker run -p 8000:8000 --env-file ../.env misp-backend
```

---

## 3. Starting the Frontend (React + Vite)

The frontend needs to be run separately using Node.js:

```bash
cd frontend

# Install the Node.js dependencies
npm install

# Start the development server
npm run dev
```
*(The frontend will typically be available at `http://localhost:5173`)*
