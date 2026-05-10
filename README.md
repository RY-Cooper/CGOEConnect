# CGOEConnect

React app for Stanford CGOE/HCP/MS students to connect around classes. **Auth and posts use mock data + `localStorage`** (`mockData.js`, `context/AuthContext.jsx`) — there is no backend.

## Prerequisites

- **Node.js** 18+
- **npm** (or pnpm / yarn)

## Run locally

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

## Build

```bash
npm run build
npm run preview
```

## Layout

| Path | Role |
|------|------|
| `App.jsx` | Routes + `AuthProvider` |
| `context/AuthContext.jsx` | Fake auth persisted under `cgoe_auth` / `cgoe_classes` |
| `mockData.js` | Shared demo users, classes, chats, posts, etc. |

Clear site data or remove `localStorage` keys `cgoe_auth` and `cgoe_classes` to reset onboarding.

## Demo data

### Login
Click **Sign in** with any email/password — it logs in as **Aisha Patel (u1)** and skips the onboarding flow.

### Mock users

| ID | Name | Program | Role |
|----|------|---------|------|
| u1 | Aisha Patel | CGOE | Student (default login) |
| u2 | James Wu | HCP | Moderator |
| u3 | Sofia Reyes | MS | Student |
| u4 | Derek Okafor | CGOE | Student |

### Classes

| ID | Course | Programs |
|----|--------|----------|
| cs229 | CS229 – Machine Learning | CGOE, MS, NDO, Certificate |
| cs231n | CS231N – Deep Learning for Vision | CGOE, MS, Professional Ed, Certificate |
| cs224n | CS224N – NLP with Deep Learning | CGOE, HCP, MS, NDO |
| ee364a | EE364A – Convex Optimization | MS, Certificate, Professional Ed |
| cs145 | CS145 – Data Management | CGOE, Professional Ed, Certificate |

Aisha is pre-enrolled in **cs229** and **cs231n**. Use the "Add a class" section on the home page to enroll in others.

### Subchats with demo content

| Chat | Class | Tag | Features shown |
|------|-------|-----|---------------|
| HW1 – Linear Regression | CS229 | HW | Multiple messages, image attachment, poll, emoji reactions, helpful votes |
| Midterm Study Group | CS229 | Study | Messages + scheduler widget |
| Assignment 2 – CNNs | CS231N | HW | Messages |
| Yapping about transformers | CS224N | Yap | Casual discussion thread |
| #introductions (general) | All | General | Community intro messages from all 4 users |
