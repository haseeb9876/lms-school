# Resume plan for the Pakistan school LMS

## Current status
- The project already has a Next.js starter structure for a school LMS.
- Core pages are in place: home, login, dashboard, onboarding, settings, and docs.
- Role-based auth demo flow is implemented with principal/teacher/student/parent demo users.
- Prisma schema and API route scaffolding for school onboarding and settings are present.

## What is already working conceptually
- Login flow using demo credentials.
- Session cookie creation and parsing.
- Principal dashboard entry point.
- School settings form UI.

## Recommended next milestone
Focus on Phase 1 completion:
1. Make the school onboarding flow fully functional.
2. Persist school settings in the database.
3. Add secure access control for role-specific pages.
4. Build the class and student management screens.

## Suggested implementation order
1. Fix environment setup for Node.js and npm.
2. Install dependencies and run the app locally.
3. Connect Prisma to a local PostgreSQL database.
4. Implement the settings API to save data to Prisma.
5. Add a simple list/edit UI for classes and students.
6. Add basic attendance and exam modules.

## Quick local start commands
```bash
cd /home/ubuntu/lms-school
npm install
npx prisma generate
npx prisma db push
npm run dev
```

## Notes for the next session
- Keep the product focused on Pakistani schools: English/Urdu support, mobile-first design, and low-bandwidth friendly UI.
- Use the principal dashboard as the main control center.
- Keep the first release simple and practical rather than trying to build everything at once.
