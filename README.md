# HCIBS Orientation Amazing Race Website 2026

A full-stack web platform to support the Orientation Amazing Race. The system consolidates all operational needs — including scoring, station management, group tracking, submissions, and administrative controls — into a unified and scalable interface.

This repository serves both as the production codebase for the current year and a reusable foundation for future batches of council to deploy and extend.

**Live deployment:** [https://hcibso.web.app](https://hcibso.web.app)

**Tech stack:** React (Vite, TypeScript), Firebase Authentication, Firestore, Firebase Storage, Firebase Hosting

---

## Features Overview

### Participant Interface (Guest and All Users)

- **Home**

  - View storyline and general race information

- **Game Info**

  - Full listings of stations and side quests with descriptions
  - Annotated MRT Map (PDF)

- **Leaderboard**

  - Live, continuously updating group rankings

---

### OGL Interface

- **Group Dashboard**

  - Current group score and rank
  - Completion summary for stations and side quests
  - Announcement feed

- **My Journey**

  - Guided flow: select next station → travelling → arrival
  - Station list and status indicators
  - Real-time ETA updates
  - Lunch break mode
  - Submission portal for unmanned stations

- **Side Quests**

  - Side quest list and submission
  - Automatic greying out upon completion

---

### Station Master Interface (SM)

- **Station Dashboard**

  - Open/close stations (temporary or permanent)
  - Monitor relevant group movement and statuses (OTW, arrived)
  - View ETA information

- **Scoring Tools**

  - Award and deduct points
  - Optional notes for administrative logging
  - Mark side quests as complete

---

### Admin Panel

Comprehensive system-level access for race coordinators.

- **Mission Control (Dashboard)**

  - Station view: overall station statuses
  - Group view: status, current location, destination, and ETA
  - Send announcements to all users

- **Database Management**

  - Manage Users, Groups, Stations, and Side Quests
  - CRUD operations with sort/filter functionality
  - Score editor (add/deduct scores with reasons)

- **Game Control**

  - Start/stop the race
  - Full system reset (scores, logs, uploads)

- **Score Log**

  - Real-time score logs with sorting and filtering

- **Submission Gallery**

  - All photo/video uploads grouped by task
  - Preview submissions without download
  - Download submissions as ZIP archives by task

---

## Essential Project Structure

```
hcibs-ori/
├── functions
│   └── src/
├── public/
├── src/
│   ├── components/
│   ├── context/
│   ├── pages/
├── firebase.json
└── README.md
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
```

### 3. Environment Variables

Create a `.env.local` file in the root directory:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

### 4. Development Server

```bash
npm run dev
```

---

## Deployment (Firebase)

Requirements:

```
npm install -g firebase-tools
firebase login
```

Deployment steps:

```bash
firebase init
npm run build
firebase deploy --only hosting
```

Future councils only need to:

1. Update `.env.local` with Firebase credentials
2. Configure authorised domains in Firebase Authentication
3. Deploy to a new or existing Firebase Hosting site

---

## Firestore Structure (High-Level)

```
announcements/
game/
groups/
scoreLog/
sideQuests/
stations/
users/
```

---

## Notes for Future Councils

- Station, side quest, and group data can be fully modified from the Admin Panel without changing underlying logic.
- Ensure that roles are correctly assigned in Firebase Authentication before deployment.
- Avoid modifying Firestore or Storage rules unless necessary.
- The system is modular and designed to support future extension.

---

## License

This project is provided under the MIT License and may be adapted by future HCI Boarders' Council batches for orientation use.
