# GoLearning

GoLearning is a beginner-oriented learning site built with HTML, CSS, vanilla JavaScript, Node.js, Express, and MySQL. The backend serves the frontend pages and API from one local origin.

## Local setup with XAMPP

Use Node.js 18 or newer.

1. Start **MySQL** in the XAMPP Control Panel. Apache is optional because Express serves the website.
2. Open phpMyAdmin, select **Import**, and import `database/schema.sql`. It creates the `golearning` database and missing tables without dropping or resetting existing records.
3. If you imported an older schema, run the applicable migrations in phpMyAdmin: `database/migrations/001_add_module_access_time.sql` if `student_progress.first_accessed_at` is missing, `database/migrations/002_add_complete_module_content.sql` if the two module content columns are missing, `database/migrations/003_add_learning_notes_and_certificates.sql`, `database/migrations/004_add_second_module_video.sql`, and `database/migrations/005_save_checklists_and_update_submissions.sql`. Migration 005 keeps the latest submission for each student and assignment, then prevents duplicate submissions and creates the shared checklist-progress table.
4. In this folder, copy `.env.example` to `.env`. Set `DB_USER` and `DB_PASSWORD` to the MySQL credentials configured for your XAMPP installation. A common local XAMPP default is `root` with a blank password; use the credentials you actually configured.
5. Replace `SESSION_SECRET` with a private random value at least 32 characters long. For example, run `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"` in the backend folder, then copy the output into `.env`.
6. Install dependencies: `npm install`.
7. If your database already had lesson rows before the complete-lesson format, run `npm run migrate-legacy-lessons` once after applying migration 002. This copies ordered lesson titles and content into each module's complete lesson content field and leaves every original lesson row intact. The script only fills modules whose complete lesson content is empty.
8. Seed the five modules, their starter lessons, and one clearly marked development-only quiz question per module: `npm run seed`. The seed is safe to run again; it does not add duplicate modules, lessons, or sample quiz questions. Add or replace sample quiz questions before using the course as final curriculum.
9. Create the first administrator from a terminal with hidden password input: `npm run create-admin`. Admin accounts cannot be created through the public registration form.
10. Start the app: `npm start`.
11. Visit `http://localhost:5000`. Check `http://localhost:5000/api/health` for the database connection status.

Do not commit `.env` or share its contents. The provided `.env.example` is only a template.

## What is implemented

- Student registration, login, logout, hashed passwords, and MySQL-backed sessions.
- Role-protected student and administrator API routes.
- Dashboard and module pages redirect unauthenticated visitors to login; backend authorization remains enforced independently.
- Student dashboard with module cards, progress, and assignment status grouped by module.
- Protected admin PDF learning-notes upload, replace, and delete; students with access to a module can download its notes. The upload limit defaults to 10 MB and can be changed with `LEARNING_NOTES_MAX_BYTES`.
- Nameless module reward certificates become available after the existing quiz and required-assignment completion rules are met. The provided `frontend/certificate/Module1-Certificate.jpg` through `Module5-Certificate.jpg` files are used as the rewards.
- Students who satisfy the existing completion requirements for all five active modules can download a personalized PDF using the supplied `frontend/certificate/CompleteAllModule-Certificate.jpg` template. The student's registered name is read from MySQL, and its first issue date and unique certificate number are saved for subsequent downloads.
- Database-backed module learning objectives and complete lesson content, with safe text rendering that preserves line breaks. Existing individual lesson rows remain available as a legacy fallback. YouTube embeds use real stored links; modules without a video link say that one is not yet available.
- Multiple-choice quiz modal. The server returns choices without correct answers, validates submitted answers, calculates scores, stores each attempt, and blocks another attempt after a pass.
- Text assignment submissions, replacement submissions that update the existing record, status display, optional administrator review, and private student ownership checks. Student checklist progress is saved to MySQL and shown to administrators. File uploads are not implemented.
- Server-checked progression: a student must pass the module quiz and meet all active required assignment submission/approval conditions. Previously unlocked modules remain accessible, and the fifth module completes the course.
- Administrator tools for student accounts, modules, complete module content, questions, assignments, submission reviews, progress, and quiz results. Module viewing and editing use responsive popup dialogs; add/edit forms also use dialogs. Destructive actions require confirmation.
- Admin interface icons use Flaticon UIcons; the dashboard includes a Flaticon attribution link. Follow Flaticon's current asset licensing terms if redistributing the site.

The sample questions created by the seed script are development placeholders, not a complete final quiz curriculum. The five modules intentionally start without video URLs; an administrator can add real YouTube URLs in the module editor.

## Checks

Run `npm test` in the backend folder for certificate PDF generation, legacy lesson migration, quiz scoring, and MySQL session-store unit tests. Run `npm audit` to review dependency advisories.

The application must be tested against a running local MySQL/XAMPP database to verify schema import, registration, login, quiz persistence, assignment progression, PDF upload/download, and certificate issuance. If `/api/health` returns HTTP 503, check that MySQL is running and that `.env` matches its host, port, database, username, and password.
