const express = require("express");
const crypto = require("node:crypto");
const path = require("node:path");
const { pool } = require("../config/database");
const { requireAuth } = require("../middleware/auth");
const { LEARNING_NOTES_MAX_BYTES } = require("../config/learningNotes");
const { createLearningNotesSignedUrl } = require("../config/supabaseStorage");
const { gradeQuiz } = require("../services/quiz");
const { renderCompletionCertificate } = require("../services/certificatePdf");

const router = express.Router();
const dashboardRouter = express.Router();

async function ensureFirstModuleUnlocked(studentId) {
    await pool.execute(
        `INSERT IGNORE INTO student_progress (student_id, module_id, is_unlocked)
         SELECT ?, id, TRUE FROM modules
         WHERE is_active = TRUE ORDER BY module_order LIMIT 1`,
        [studentId]
    );
}

async function isModuleComplete(connection, studentId, moduleId) {
    const [checks] = await connection.execute(
        `SELECT
            EXISTS (
                SELECT 1 FROM quiz_results
                WHERE student_id = ? AND module_id = ? AND passed = TRUE
            ) AS has_passed_quiz,
            NOT EXISTS (
                SELECT 1 FROM assignments a
                WHERE a.module_id = ? AND a.is_active = TRUE AND a.is_required = TRUE
                  AND NOT EXISTS (
                      SELECT 1 FROM assignment_submissions s
                      WHERE s.assignment_id = a.id AND s.student_id = ?
                        AND (
                            s.id = (
                                SELECT MAX(latest.id) FROM assignment_submissions latest
                                WHERE latest.assignment_id = a.id AND latest.student_id = ?
                            )
                            AND (
                                (a.requires_approval = TRUE AND s.status = 'approved')
                                OR (a.requires_approval = FALSE AND s.status IN ('submitted', 'pending', 'approved'))
                            )
                        )
                  )
            ) AS assignments_complete`,
        [studentId, moduleId, moduleId, studentId, studentId]
    );
    return Boolean(checks[0].has_passed_quiz && checks[0].assignments_complete);
}

async function isOverallCourseComplete(connection, studentId) {
    const [activeModules] = await connection.execute(
        "SELECT id, module_order FROM modules WHERE is_active = TRUE ORDER BY module_order"
    );
    if (activeModules.length !== 5
        || activeModules.some((module, index) => Number(module.module_order) !== index + 1)) return false;

    for (const module of activeModules) {
        if (!await isModuleComplete(connection, studentId, module.id)) return false;
    }
    return true;
}

async function refreshModuleCompletion(connection, studentId, moduleId) {
    if (!await isModuleComplete(connection, studentId, moduleId)) return false;

    await connection.execute(
        `INSERT INTO student_progress (student_id, module_id, is_completed, is_unlocked, completed_at)
         VALUES (?, ?, TRUE, TRUE, CURRENT_TIMESTAMP)
         ON DUPLICATE KEY UPDATE is_completed = TRUE, completed_at = COALESCE(completed_at, CURRENT_TIMESTAMP)`,
        [studentId, moduleId]
    );

    const [nextModules] = await connection.execute(
        `SELECT id FROM modules WHERE is_active = TRUE AND module_order > (
            SELECT module_order FROM modules WHERE id = ?
         ) ORDER BY module_order LIMIT 1`,
        [moduleId]
    );
    if (nextModules.length) {
        await connection.execute(
            `INSERT INTO student_progress (student_id, module_id, is_unlocked)
             VALUES (?, ?, TRUE)
             ON DUPLICATE KEY UPDATE is_unlocked = TRUE`,
            [studentId, nextModules[0].id]
        );
    }
    return true;
}

router.get("/", async (req, res, next) => {
    try {
        if (req.session.user.role === "student") {
            await ensureFirstModuleUnlocked(req.session.user.id);
            const [modules] = await pool.execute(
                `SELECT m.id, m.title, m.description, m.module_order,
                        COALESCE(p.is_unlocked, FALSE) AS is_unlocked,
                        COALESCE(p.is_completed, FALSE) AS is_completed
                 FROM modules m
                 LEFT JOIN student_progress p ON p.module_id = m.id AND p.student_id = ?
                 WHERE m.is_active = TRUE ORDER BY m.module_order`,
                [req.session.user.id]
            );
            return res.json({ modules });
        }

        const [modules] = await pool.query(
            `SELECT m.id, m.title, m.description, m.learning_objective, m.lesson_content,
                    m.youtube_video_url, m.youtube_video_url_2, m.module_order, m.quiz_passing_score, m.is_active,
                    n.original_file_name AS notes_file_name, n.file_size AS notes_file_size,
                    n.uploaded_at AS notes_uploaded_at
             FROM modules m
             LEFT JOIN module_learning_notes n ON n.module_id = m.id
             ORDER BY m.module_order`
        );
        res.json({ modules, maxLearningNotesBytes: LEARNING_NOTES_MAX_BYTES });
    } catch (error) {
        next(error);
    }
});

router.get("/:moduleId", async (req, res, next) => {
    try {
        const moduleId = Number(req.params.moduleId);
        if (!Number.isSafeInteger(moduleId) || moduleId < 1) {
            return res.status(400).json({ error: "Invalid module." });
        }
        const [modules] = await pool.execute(
            `SELECT id, title, description, learning_objective, lesson_content,
                    youtube_video_url, youtube_video_url_2, module_order, quiz_passing_score, is_active
             FROM modules WHERE id = ? LIMIT 1`,
            [moduleId]
        );
        if (!modules.length || (req.session.user.role === "student" && !modules[0].is_active)) {
            return res.status(404).json({ error: "Module not found." });
        }
        const module = modules[0];

        if (req.session.user.role === "student") {
            await ensureFirstModuleUnlocked(req.session.user.id);
            const [progress] = await pool.execute(
                "SELECT is_unlocked FROM student_progress WHERE student_id = ? AND module_id = ?",
                [req.session.user.id, moduleId]
            );
            if (!progress.length || !progress[0].is_unlocked) {
                return res.status(403).json({ error: "This module is locked. Complete the previous module first." });
            }
            await pool.execute(
                `UPDATE student_progress SET first_accessed_at = COALESCE(first_accessed_at, CURRENT_TIMESTAMP)
                 WHERE student_id = ? AND module_id = ?`,
                [req.session.user.id, moduleId]
            );
        }

        const [lessons] = await pool.execute(
            "SELECT id, title, content, lesson_order FROM lessons WHERE module_id = ? ORDER BY lesson_order",
            [moduleId]
        );
        const [learningNotes] = await pool.execute(
            `SELECT original_file_name, file_size, uploaded_at
             FROM module_learning_notes WHERE module_id = ?`,
            [moduleId]
        );
        const certificateAvailable = req.session.user.role === "student"
            && Number(module.module_order) >= 1
            && Number(module.module_order) <= 5
            ? await isModuleComplete(pool, req.session.user.id, moduleId)
            : false;
        res.json({
            module: {
                ...module,
                learning_notes: learningNotes[0] || null,
                certificate_available: certificateAvailable
            },
            lessons
        });
    } catch (error) {
        next(error);
    }
});

router.get("/:moduleId/learning-notes/download", async (req, res, next) => {
    try {
        const moduleId = Number(req.params.moduleId);
        if (!Number.isSafeInteger(moduleId) || moduleId < 1) {
            return res.status(400).json({ error: "Invalid module." });
        }
        if (req.session.user.role === "student") {
            const [access] = await pool.execute(
                `SELECT p.is_unlocked FROM student_progress p
                 JOIN modules m ON m.id = p.module_id
                 WHERE p.student_id = ? AND p.module_id = ? AND p.is_unlocked = TRUE AND m.is_active = TRUE`,
                [req.session.user.id, moduleId]
            );
            if (!access.length) {
                return res.status(403).json({ error: "This module is locked or unavailable." });
            }
        }

        const [notes] = await pool.execute(
            `SELECT n.original_file_name, n.stored_file_name, m.title
             FROM module_learning_notes n
             JOIN modules m ON m.id = n.module_id
             WHERE n.module_id = ? AND m.is_active = TRUE`,
            [moduleId]
        );
        if (!notes.length) return res.status(404).json({ error: "Learning notes have not been uploaded for this module." });
        const signedUrl = await createLearningNotesSignedUrl(notes[0].stored_file_name);
        res.set("Cache-Control", "no-store");
        res.set("X-Content-Type-Options", "nosniff");
        res.redirect(302, signedUrl);
    } catch (error) {
        next(error);
    }
});

router.get("/:moduleId/certificate", async (req, res, next) => {
    try {
        const moduleId = Number(req.params.moduleId);
        if (!Number.isSafeInteger(moduleId) || moduleId < 1) {
            return res.status(400).json({ error: "Invalid module." });
        }
        if (req.session.user.role !== "student") {
            return res.status(403).json({ error: "Module rewards are available to students only." });
        }
        const [modules] = await pool.execute(
            "SELECT id, title, module_order FROM modules WHERE id = ? AND is_active = TRUE",
            [moduleId]
        );
        if (!modules.length) return res.status(404).json({ error: "Module not found." });
        if (!await isModuleComplete(pool, req.session.user.id, moduleId)) {
            return res.status(403).json({ error: "Complete the required module activities to unlock this reward." });
        }
        const module = modules[0];
        if (module.module_order < 1 || module.module_order > 5) {
            return res.status(404).json({ error: "A certificate template is not available for this module." });
        }

        const certificatePath = path.join(
            __dirname, "..", "..", "frontend", "certificate", `Module${module.module_order}-Certificate.jpg`
        );
        res.set("Cache-Control", "no-store");
        res.set("X-Content-Type-Options", "nosniff");
        res.download(certificatePath, `golearning-module-${module.module_order}-certificate.jpg`, (error) => {
            if (error) next(error);
        });
    } catch (error) {
        next(error);
    }
});

router.get("/:moduleId/quiz", async (req, res, next) => {
    try {
        const moduleId = Number(req.params.moduleId);
        const [access] = await pool.execute(
            `SELECT m.id FROM modules m
             LEFT JOIN student_progress p ON p.module_id = m.id AND p.student_id = ?
             WHERE m.id = ?
               AND ( ? = 'admin' OR (m.is_active = TRUE AND p.is_unlocked = TRUE) )`,
            [req.session.user.id, moduleId, req.session.user.role]
        );
        if (!access.length) {
            return res.status(403).json({ error: "This module is locked or unavailable." });
        }
        const [questions] = await pool.execute(
            "SELECT id, question, answer_choices, question_order FROM quizzes WHERE module_id = ? ORDER BY question_order",
            [moduleId]
        );
        res.json({ questions: questions.map((question) => ({
            ...question,
            answer_choices: typeof question.answer_choices === "string"
                ? JSON.parse(question.answer_choices)
                : question.answer_choices
        })) });
    } catch (error) {
        next(error);
    }
});

router.post("/:moduleId/quiz/submit", async (req, res, next) => {
    const studentId = req.session.user.id;
    const moduleId = Number(req.params.moduleId);
    const answers = req.body.answers;

    if (req.session.user.role !== "student") {
        return res.status(403).json({ error: "Only students can submit quizzes." });
    }
    if (!Number.isSafeInteger(moduleId) || moduleId < 1 || !Array.isArray(answers) || !answers.length) {
        return res.status(400).json({ error: "Submit a valid set of quiz answers." });
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [progress] = await connection.execute(
            "SELECT is_unlocked FROM student_progress WHERE student_id = ? AND module_id = ? FOR UPDATE",
            [studentId, moduleId]
        );
        if (!progress.length || !progress[0].is_unlocked) {
            await connection.rollback();
            return res.status(403).json({ error: "This module is locked." });
        }
        const [priorPass] = await connection.execute(
            "SELECT id FROM quiz_results WHERE student_id = ? AND module_id = ? AND passed = TRUE LIMIT 1",
            [studentId, moduleId]
        );
        if (priorPass.length) {
            await connection.rollback();
            return res.status(409).json({ error: "You have already passed this module quiz." });
        }
        const [questions] = await connection.execute(
            "SELECT id, answer_choices, correct_answer FROM quizzes WHERE module_id = ?",
            [moduleId]
        );
        const [moduleRows] = await connection.execute(
            "SELECT quiz_passing_score FROM modules WHERE id = ? AND is_active = TRUE",
            [moduleId]
        );
        if (!moduleRows.length) {
            await connection.rollback();
            return res.status(404).json({ error: "Module not found." });
        }
        let grade;
        try {
            grade = gradeQuiz(questions, answers, moduleRows[0].quiz_passing_score);
        } catch (error) {
            await connection.rollback();
            return res.status(400).json({ error: error.message });
        }
        const [attemptRows] = await connection.execute(
            "SELECT COALESCE(MAX(attempt_number), 0) + 1 AS next_attempt FROM quiz_results WHERE student_id = ? AND module_id = ?",
            [studentId, moduleId]
        );
        await connection.execute(
            `INSERT INTO quiz_results
                (student_id, module_id, score, total_questions, percentage, passed, attempt_number)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                studentId, moduleId, grade.score, grade.totalQuestions,
                grade.percentage, grade.passed, attemptRows[0].next_attempt
            ]
        );
        const completed = await refreshModuleCompletion(connection, studentId, moduleId);
        await connection.commit();
        res.status(201).json({
            score: grade.score,
            totalQuestions: grade.totalQuestions,
            percentage: grade.percentage,
            passed: grade.passed,
            passingScore: Number(moduleRows[0].quiz_passing_score),
            moduleCompleted: completed
        });
    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
});

router.get("/:moduleId/assignments", async (req, res, next) => {
    try {
        const moduleId = Number(req.params.moduleId);
        const [access] = await pool.execute(
            `SELECT m.id FROM modules m
             LEFT JOIN student_progress p ON p.module_id = m.id AND p.student_id = ?
             WHERE m.id = ?
               AND ( ? = 'admin' OR (m.is_active = TRUE AND p.is_unlocked = TRUE) )`,
            [req.session.user.id, moduleId, req.session.user.role]
        );
        if (!access.length) {
            return res.status(403).json({ error: "This module is locked or unavailable." });
        }
        const [assignments] = await pool.execute(
            `SELECT a.id, a.title, a.instructions, a.is_required, a.requires_approval, a.is_active,
                    s.submission_text, s.status AS submission_status, s.admin_feedback, s.submitted_at,
                    cp.instructions_state, cp.response_state
             FROM assignments a
             LEFT JOIN assignment_submissions s ON s.id = (
                 SELECT MAX(s2.id) FROM assignment_submissions s2
                 WHERE s2.assignment_id = a.id AND s2.student_id = ?
             )
             LEFT JOIN assignment_checklist_progress cp
                ON cp.assignment_id = a.id AND cp.student_id = ?
             WHERE a.module_id = ? AND ( ? = 'admin' OR a.is_active = TRUE ) ORDER BY a.id`,
            [req.session.user.id, req.session.user.id, moduleId, req.session.user.role]
        );
        res.json({ assignments });
    } catch (error) {
        next(error);
    }
});

router.put("/:moduleId/assignments/:assignmentId/checklist", async (req, res, next) => {
    if (req.session.user.role !== "student") {
        return res.status(403).json({ error: "Only students can update assignment checklist progress." });
    }
    const moduleId = Number(req.params.moduleId);
    const assignmentId = Number(req.params.assignmentId);
    const { type, state } = req.body || {};
    if (!Number.isSafeInteger(moduleId) || moduleId < 1
        || !Number.isSafeInteger(assignmentId) || assignmentId < 1
        || !["instructions", "response"].includes(type)
        || !Array.isArray(state) || state.length > 200
        || state.some((checked) => typeof checked !== "boolean")) {
        return res.status(400).json({ error: "Provide valid checklist progress." });
    }

    try {
        const [assignments] = await pool.execute(
            `SELECT a.id FROM assignments a
             JOIN student_progress p ON p.module_id = a.module_id
                AND p.student_id = ? AND p.is_unlocked = TRUE
             WHERE a.id = ? AND a.module_id = ? AND a.is_active = TRUE`,
            [req.session.user.id, assignmentId, moduleId]
        );
        if (!assignments.length) {
            return res.status(403).json({ error: "This assignment is not available." });
        }

        if (type === "instructions") {
            await pool.execute(
                `INSERT INTO assignment_checklist_progress
                    (assignment_id, student_id, instructions_state, response_state)
                 VALUES (?, ?, ?, JSON_ARRAY())
                 ON DUPLICATE KEY UPDATE instructions_state = VALUES(instructions_state)`,
                [assignmentId, req.session.user.id, JSON.stringify(state)]
            );
        } else {
            await pool.execute(
                `INSERT INTO assignment_checklist_progress
                    (assignment_id, student_id, instructions_state, response_state)
                 VALUES (?, ?, JSON_ARRAY(), ?)
                 ON DUPLICATE KEY UPDATE response_state = VALUES(response_state)`,
                [assignmentId, req.session.user.id, JSON.stringify(state)]
            );
        }
        res.json({ message: "Checklist progress saved." });
    } catch (error) {
        next(error);
    }
});

router.get("/:moduleId/results", async (req, res, next) => {
    try {
        const moduleId = Number(req.params.moduleId);
        if (req.session.user.role !== "student") {
            return res.status(403).json({ error: "Student quiz history is private." });
        }
        const [access] = await pool.execute(
            "SELECT is_unlocked FROM student_progress WHERE student_id = ? AND module_id = ?",
            [req.session.user.id, moduleId]
        );
        if (!access.length || !access[0].is_unlocked) {
            return res.status(403).json({ error: "This module is locked." });
        }
        const [results] = await pool.execute(
            `SELECT score, total_questions, percentage, passed, attempt_number, submitted_at
             FROM quiz_results WHERE student_id = ? AND module_id = ? ORDER BY attempt_number DESC`,
            [req.session.user.id, moduleId]
        );
        res.json({ results });
    } catch (error) {
        next(error);
    }
});

router.post("/:moduleId/assignments/:assignmentId/submissions", async (req, res, next) => {
    if (req.session.user.role !== "student") {
        return res.status(403).json({ error: "Only students can submit assignments." });
    }
    const moduleId = Number(req.params.moduleId);
    const assignmentId = Number(req.params.assignmentId);
    const text = typeof req.body.text === "string" ? req.body.text.trim() : "";
    if (!text || text.length > 20000) {
        return res.status(400).json({ error: "Enter an assignment response (up to 20,000 characters)." });
    }
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [assignments] = await connection.execute(
            `SELECT a.id, a.requires_approval FROM assignments a
             JOIN student_progress p ON p.module_id = a.module_id AND p.student_id = ? AND p.is_unlocked = TRUE
             WHERE a.id = ? AND a.module_id = ? AND a.is_active = TRUE`,
            [req.session.user.id, assignmentId, moduleId]
        );
        if (!assignments.length) {
            await connection.rollback();
            return res.status(403).json({ error: "This assignment is not available." });
        }
        const status = assignments[0].requires_approval ? "pending" : "submitted";
        await connection.execute(
            `INSERT INTO assignment_submissions (assignment_id, student_id, submission_text, status)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE submission_text = VALUES(submission_text),
                 status = VALUES(status), admin_feedback = NULL,
                 submitted_at = CURRENT_TIMESTAMP, reviewed_at = NULL`,
            [assignmentId, req.session.user.id, text, status]
        );
        await connection.execute(
            `UPDATE assignment_checklist_progress SET response_state = JSON_ARRAY()
             WHERE assignment_id = ? AND student_id = ?`,
            [assignmentId, req.session.user.id]
        );
        const moduleCompleted = await refreshModuleCompletion(connection, req.session.user.id, moduleId);
        await connection.commit();
        res.json({ message: "Assignment submitted.", moduleCompleted });
    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
});

dashboardRouter.get("/summary", async (req, res, next) => {
    try {
        const studentId = req.session.user.id;
        if (req.session.user.role === "student") {
            await ensureFirstModuleUnlocked(studentId);
            const [modules] = await pool.execute(
                `SELECT m.id, m.title, m.description, m.module_order,
                        COALESCE(p.is_unlocked, FALSE) AS is_unlocked,
                        COALESCE(p.is_completed, FALSE) AS is_completed,
                        (SELECT MAX(qr.percentage) FROM quiz_results qr
                         WHERE qr.student_id = ? AND qr.module_id = m.id) AS best_score
                 FROM modules m
                 LEFT JOIN student_progress p ON p.module_id = m.id AND p.student_id = ?
                 WHERE m.is_active = TRUE ORDER BY m.module_order`,
                [studentId, studentId]
            );
            for (const module of modules) {
                module.certificate_available = Number(module.module_order) >= 1
                    && Number(module.module_order) <= 5
                    && await isModuleComplete(pool, studentId, module.id);
            }
            const [assignments] = await pool.execute(
                `SELECT a.title, a.module_id, a.is_required, a.requires_approval,
                        s.submission_text, s.status, s.admin_feedback, s.submitted_at
                 FROM assignments a JOIN modules m ON m.id = a.module_id
                 LEFT JOIN assignment_submissions s ON s.id = (
                     SELECT MAX(s2.id) FROM assignment_submissions s2
                     WHERE s2.assignment_id = a.id AND s2.student_id = ?
                 )
                 WHERE a.is_active = TRUE AND (a.is_required = TRUE OR s.id IS NOT NULL)
                 ORDER BY m.module_order, a.id`,
                [studentId]
            );
            const overallCertificateAvailable = await isOverallCourseComplete(pool, studentId);
            return res.json({ modules, assignments, overallCertificateAvailable });
        }

        const [[students]] = await pool.query(
            "SELECT COUNT(*) AS total FROM users WHERE role = 'student'"
        );
        const [[moduleCount]] = await pool.query(
            "SELECT COUNT(*) AS total FROM modules"
        );
        const [[submissionCount]] = await pool.query(
            "SELECT COUNT(*) AS total FROM assignment_submissions WHERE status = 'pending'"
        );
        res.json({ totals: { students: students.total, modules: moduleCount.total, pendingSubmissions: submissionCount.total } });
    } catch (error) {
        next(error);
    }
});

dashboardRouter.get("/certificate", async (req, res, next) => {
    if (req.session.user.role !== "student") {
        return res.status(403).json({ error: "The overall certificate is available to students only." });
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const studentId = req.session.user.id;
        const [students] = await connection.execute(
            "SELECT full_name FROM users WHERE id = ? AND role = 'student' FOR UPDATE",
            [studentId]
        );
        if (!students.length) {
            await connection.rollback();
            return res.status(404).json({ error: "Student account not found." });
        }
        if (!await isOverallCourseComplete(connection, studentId)) {
            await connection.rollback();
            return res.status(403).json({ error: "Complete all five modules and their required activities to unlock the course certificate." });
        }

        const [existingCertificates] = await connection.execute(
            `SELECT certificate_number, DATE_FORMAT(issued_at, '%M %e, %Y') AS issued_date
             FROM course_certificates WHERE student_id = ? LIMIT 1`,
            [studentId]
        );
        let certificate = existingCertificates[0];
        if (!certificate) {
            const certificateNumber = `GL-${crypto.randomUUID().toUpperCase()}`;
            await connection.execute(
                `INSERT INTO course_certificates
                    (student_id, certificate_number)
                 VALUES (?, ?)`,
                [studentId, certificateNumber]
            );
            const [issuedCertificates] = await connection.execute(
                `SELECT certificate_number, DATE_FORMAT(issued_at, '%M %e, %Y') AS issued_date
                 FROM course_certificates WHERE student_id = ? LIMIT 1`,
                [studentId]
            );
            certificate = issuedCertificates[0];
        }
        await connection.commit();

        const pdf = await renderCompletionCertificate({
            fullName: students[0].full_name,
            issuedDate: certificate.issued_date
        });
        res.set({
            "Cache-Control": "no-store",
            "Content-Type": "application/pdf",
            "Content-Disposition": 'attachment; filename="golearning-course-completion-certificate.pdf"',
            "X-Content-Type-Options": "nosniff"
        });
        res.send(pdf);
    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
});

module.exports = {
    router,
    dashboardRouter,
    refreshModuleCompletion,
    isModuleComplete,
    isOverallCourseComplete
};
