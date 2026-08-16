# Phazon Academic Platform — Frontend Documentation

## Overview
The Phazon frontend is a static web application built using **HTML5**, **Vanilla JavaScript (ES6+)**, and **Vanilla CSS3** featuring Material Design styling and glassmorphism visual aesthetics.

---

## Directory Structure
```
frontend/
├── pages/               # HTML Page views grouped by role & domain
│   ├── admin/           # 16 Admin management & governance pages
│   ├── hod/             # 11 Head of Department oversight pages
│   ├── teacher/         # 9 Faculty class & attendance pages
│   ├── student/         # 16 Student portal & academic pages
│   ├── auth/            # Authentication & sign-in page
│   ├── courses/         # Course catalog & detail views
│   ├── grades/          # Semester transcript & grade views
│   ├── landing/         # Marketing & feature landing pages
│   ├── profile/         # User profile management
│   ├── progress/        # Student academic progress dashboard
│   └── search.html      # Global multi-entity search page
├── css/                 # CSS Design Tokens & Layout Modules
│   ├── variables.css
│   ├── style.css
│   ├── components.css
│   ├── layout.css
│   └── responsive.css
├── js/                  # Client-side JavaScript Controllers
│   ├── state.js         # Reactive UI state container
│   ├── data.js          # Mock data fallbacks & cache helpers
│   ├── ui.js            # Toast notifications & modal helpers
│   ├── auth-client.js   # Supabase Auth client & session guards
│   ├── auth.js          # Sign-in & registration form controller
│   └── api.js           # API fetch wrapper with Bearer token header
├── assets/              # Branding assets & images
├── index.html           # Main landing entry page
└── README.md
```

---

## UI Components & Design System
- **Colors**: Expressive Material HSL palette with sleek dark mode accents.
- **Typography**: Google Fonts (*Outfit* for headlines, *Inter* for body text).
- **Responsive Layout**: Designed for Desktop (1920x1080), Laptop (1366x768), Tablet (768x1024), and Mobile (390x844).
- **Interactive Controls**: Auto-initialising mobile navigation drawer (`#pz-mobile-toggle`), glassmorphic modals, data tables with pagination.
