# HCIBS Orientation Amazing Race Website 2026

A full-stack web platform to support the Orientation Amazing Race. The system consolidates all operational needs — including scoring, station management, group tracking, submissions, and administrative controls — into a unified and scalable interface.

This repository serves both as the production codebase for the current year and a reusable foundation for future batches of council to deploy and extend.

**Live deployment:** [https://hcibso.web.app](https://hcibso.web.app)

**Tech Stack:** React (Vite, TypeScript), Firebase Authentication, Firestore, Firebase Storage, Firebase Hosting, Cloud Functions

---

## Features Overview

### Participant Interface (Guest and All Users)

**Home**

* View storyline and general race information

**Game Info**

* Full listings of stations and side quests with descriptions
* Annotated MRT Map (PDF)

**Leaderboard**

* Live, continuously updating group rankings with automatic tie-breaking
* Toggle between Group and House views (if House system enabled)

---

### OGL Interface

**Group Dashboard**

* Current group score and rank
* Completion summary for stations and side quests (Progress Rings)
* Announcement feed

**My Journey**

  - Guided flow: select next station → travelling → arrival
  - Station list and status indicators
  - Real-time ETA updates
  - Chat with Station Masters when travelling
  - Lunch break mode
  - Submission portal for unmanned stations
=======
* Guided flow: select next station → travelling → arrival
* Station list and live traffic status indicators (Open/Closed)
* Real-time ETA updates (pushes notifications to relevant Station Masters)
* Lunch break mode
* Submission portal for unmanned stations (Photo/Video upload)

**Side Quests**

* Side quest list and submission portal
* Automatic greying out upon completion

---

### Station Master Interface (SM)

**Station Dashboard**

  - Open/close stations (temporary or permanent)
  - Monitor relevant group movement and statuses (OTW, arrived)
  - View ETA information
  - Chat with Groups that are on the way
  - Lunch break mode
* Open/close stations (temporary "Lunch" or permanent "Close")
* Monitor relevant group movement and statuses (OTW, arrived)
* View ETA information
* Lunch break mode (blocks incoming groups until queue clears)
>>>>>>> origin/main

**Scoring Tools**

* Unified modal to award points for main station tasks **or** side quests
* Optional notes for administrative logging
* "Change Station" flexibility feature

---

### Admin Panel

Comprehensive system-level access for race coordinators.

**Mission Control (Dashboard)**

* Station view: overall station statuses and queue lengths
* Group view: status, current location, destination, and ETA

**Database Management**

* Manage Users, Groups, Stations, Houses, and Side Quests
* CRUD operations with sort/filter functionality
* Assign OGLs to Groups and Groups to Houses
* Score editor (add/deduct scores with reasons)

**Announcement Management**

* Broadcast announcements (Push Notification + In-App Toast)
* Delete announcements

**Game Control**

* Start/stop the race (locks/unlocks OGL UI)
* Full system reset (scores, logs, uploads)

**Score Log**

* Real-time score logs with sorting and filtering by Source/Type

**Submission Gallery**

* All photo/video uploads grouped by task
* Preview submissions
* Download submissions as ZIP archives per task

---

## Essential Project Structure

```
hcibs-ori/
├── functions/       # Backend Cloud Functions (Node.js)
├── public/          # Static assets (Logo, Manifest, Service Worker)
├── src/
│   ├── components/  # Reusable UI widgets (Modals, Uploaders)
│   ├── context/     # Global State (Auth, Game Status)
│   ├── pages/       # Main Views (Dashboards, Management Pages)
│   ├── theme.ts     # Custom Material UI Theme
│   └── firebase.ts  # Firebase Initialization
├── firestore.rules  # Database Security Rules
└── firebase.json    # Deployment Configuration
```

---

## Local Development

### 1. Clone the Repository

```bash
git clone https://github.com/HY-Yap/hcibs-ori.git
cd hcibs-ori
```

### 2. Install Dependencies

```bash
npm install

# Install Backend Dependencies (CRITICAL STEP)
cd functions && npm install && cd ..
```

### 3. Environment Variables

Create a `.env.local` file:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

### 4. Push Notification Configuration

If you change the Firebase project, update:

* `public/firebase-messaging-sw.js` → `firebaseConfig`
* `src/components/NotificationHandler.tsx` → `VAPID_KEY`

### 5. Development Server

```bash
npm run dev
```

---

## Deployment (Firebase)

**Requirements:**

```bash
npm install -g firebase-tools
firebase login
```

**Deployment steps:**

```bash
# 1. Build optimized React app
npm run build

# 2. Deploy frontend, backend, and rules
firebase deploy
```

**Note:** Cloud Functions require Blaze Plan (card needed). Usage typically remains within free tier.

---

## Operational Runbook (For Future Councils)

### 1. Resetting for a New Year

⚠️ **WARNING:** Production database contains previous years' data.

* Go to Firebase Console.
* Manually delete all Firestore collections and Storage files.

**Bootstrap the First Admin:**

1. Create user in Authentication (e.g., `admin@hcibs.org`)
2. Copy User UID
3. Create `users` collection → document ID = UID
4. Add field: `role: "ADMIN"`
5. Log in via UI to configure rest of system

### 2. Event Setup Order

* Create Stations & Side Quests
* Create Houses
* Create Users (SMs, OGLs)
* Create Groups
* Assign OGLs (Manage Groups)
* Assign Houses (Manage Houses)

### 3. Disaster Recovery

* **App Crash:** Refresh (stateless; re-syncs)
* **Wrong Score:** Check Score Log → fix via Edit Score
* **Emergency Stop:** Use **STOP GAME** in Admin Controls
* **Failed Uploads:** Check Submission Gallery; OGLs may re-upload

---

## Firestore Structure (High-Level)

```
announcements/
game/
groups/
houses/
scoreLog/
sideQuests/
stations/
users/
```

---

## Notes for Future Councils

* Station, side quest, and group data are fully editable from Admin Panel.
* Ensure user roles are correct before deployment.
* Avoid modifying Firestore/Storage rules unless required.
* System is modular and extensible for future batches.
