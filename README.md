# Time Tracker – The Computer Squad

A web app for an onsite IT repair company. Technicians time their jobs with a server-side timer,
and the support team reviews the time and approves the labour cost before invoicing.

Built for IFQ636 Assessment 1 by extending the provided Task Manager starter project.

**Deployed app:** `http://<EC2 public IP>:3000` (the IP changes when the instance restarts)

## Features

**Standard User (technician):** log in, view assigned jobs, start / stop / resume the timer,
add notes, submit a job (time and notes lock once submitted).

**Administrator (support team):** create, edit and delete jobs; correct recorded times; see the labour
cost; review and approve submitted jobs (editing an approved job returns it to Under review);
create, edit and deactivate user accounts.

**Billing rule:** call-out fee + 15-minute blocks × labour rate. Minimum one block; after that a
partial block is charged only if it reaches 5 minutes. Applied to the total time across all segments.

## Architecture

```
React frontend (port 3000)  →  Express API (port 5001)  →  MongoDB Atlas
```

- **Frontend:** React, React Router, axios, Tailwind (`frontend/src`)
- **Backend:** Node.js, Express, JWT login, role checks in `middleware/authMiddleware.js` (`backend`)
- **Data:** Mongoose models `User` and `Job`
- **Tests:** 87 backend tests with Mocha, Chai and Sinon (`backend/test`)

## Local setup

Requires Node.js 22+ and a MongoDB Atlas database.

```bash
git clone https://github.com/NoorudeenElsabawi/time-tracker.git
cd time-tracker/backend
npm install
```

Copy `backend/.env.example` to `backend/.env` and fill in `MONGO_URI`, `JWT_SECRET`, `PORT=5001`
and the `SEED_` values. The `.env` file is git-ignored and must never be committed.

```bash
npm run seed   # creates the first Administrator and two test technicians
npm test       # runs the backend tests
npm run dev    # starts the API on port 5001
```

In a second terminal:

```bash
cd frontend
npm install
npm start      # opens http://localhost:3000
```

Test login details are in the submitted report, not in this public repository.

## Deployment (AWS EC2)

Deployed manually to a university AWS account (Sydney region): Ubuntu 24.04, t3.medium,
security group `student-allowed-sg-6`. Ports 22, 3000 and 5001 are open only to specific IP
addresses, never `0.0.0.0/0`.

```bash
# 1. Connect
ssh -i <key>.pem ubuntu@<public-ip>

# 2. Install Node 22 and PM2
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash
source ~/.bashrc
nvm install 22
npm install -g pm2

# 3. Backend (create backend/.env on the server with nano first)
git clone https://github.com/NoorudeenElsabawi/time-tracker.git
cd time-tracker/backend
npm install
pm2 start server.js --name backend

# 4. Frontend
cd ../frontend
npm install
npm run build
pm2 serve build 3000 --name frontend --spa

# 5. Restart automatically when the instance reboots
pm2 startup    # run the sudo command it prints
pm2 save
```

The frontend calls the API on port 5001 of whatever address the page was loaded from, so it keeps
working after the public IP changes. This was tested by stopping and starting the instance.

## Known limitations

- The public IP changes on every restart, so the app URL changes too.
- Plain HTTP only (no HTTPS).
- MongoDB Atlas accepts connections from any IP (protected by password) because the server's IP changes.
- `npm audit` warnings and a Mongoose `strictQuery` warning come from the starter project's older packages.
- Time segments can be corrected but not added or removed, and approved jobs cannot be deleted.
- A deactivated user who is still logged in is blocked on their next action but not logged out automatically.
- Only the backend has automated tests; the frontend was tested manually.
