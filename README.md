# Mahamaya Enterprise

A bilingual (English/Bengali) website for **Mahamaya Enterprise** — a local hardware, paint, electrical, and construction materials supplier.

## Features
- English / বাংলা language switcher
- Light / Dark theme toggle (persists after refresh)
- Product catalog with category images + product details modal
- Quick quote request form (saves to backend + WhatsApp message shortcut)
- Customer reviews + FAQ (loaded from backend)
- Admin dashboard to manage shop info + FAQs + view quote requests

## Tech Stack
- Frontend: HTML, CSS, JavaScript
- Backend: Node.js, Express (file-based JSON storage)

## Project Structure
- `backend/` — Express API + JSON storage
- `frontend/` — static site (HTML/CSS/JS + assets)

## Run Locally (Windows)
1) Open PowerShell in the project folder
2) Install backend dependencies and start the server:

```bash
cd backend
npm install
npm start
```

3) Open the site:
- Home: `http://localhost:3000/`
- Admin: `http://localhost:3000/admin.html`

## Deploy
### Frontend (Vercel)
This repo includes `vercel.json` so Vercel serves the static site from `frontend/`.

### Backend (separate host)
The backend writes to JSON files under `backend/data/`, so it should be deployed to a traditional Node host (e.g., Render/Railway).

After deploying the backend, set the API base URL in the browser once:

```js
localStorage.setItem('apiBase', 'https://YOUR-BACKEND-DOMAIN');
location.reload();
```

## Notes
- Data is stored in JSON files under `backend/data/`.
- Update phone/WhatsApp numbers in the frontend if needed.

## License
This project is for Mahamaya Enterprise.
