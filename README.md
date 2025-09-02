
# SmileCare Full‑Stack Upgrade (SQLite)

This adds:
- Client account creation & login
- Client booking & viewing their own appointments
- Staff login & viewing all patients and all appointments
- SQLite storage

## Run backend
```bash
cd backend
npm install
node server.js
# backend at http://localhost:4000
```
Optional: `JWT_SECRET` and `PORT` env vars.

Seeded staff account:
- Email: `staff@smilecare.com`
- Password: `password123`

## Run frontend (Vite + Tailwind)
```bash
cd frontend
npm install
npm run dev
```
Create a `.env` in `frontend` if your API is not on localhost:4000:
```
VITE_API_URL=http://localhost:4000
```

## Integrate with your existing single‑file site
If you prefer to patch your current file, focus on:
- Replace localStorage appointment logic with calls to the backend routes.
- Add "Create Account", "Login", "My Appointments" (client) and "Staff" tabs.
- Use the fetch examples in `src/App.jsx`.
```
