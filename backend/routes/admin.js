const express = require("express");
const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");
const multer = require("multer");
const { pool } = require("../config/database");
const { LEARNING_NOTES_DIRECTORY, LEARNING_NOTES_MAX_BYTES } = require("../config/learningNotes");
const { refreshModuleCompletion } = require("./modules");

const router = express.Router();

const learningNotesUpload = multer({
    storage: multer.diskStorage({
        destination: LEARNING_NOTES_DIRECTORY,
        filename: (req, file, callback) => callback(null, `${crypto.randomUUID()}.pdf`)
    }),
    limits: { fileSize: LEARNING_NOTES_MAX_BYTES, files: 1 },
    fileFilter: (req, file, callback) => {
        if (file.mimetype !== "application/pdf" || path.extname(file.originalname).toLowerCase() !== ".pdf") {
            const error = new Error("Choose a PDF file.");
            error.statusCode = 400;
            return callback(error);
        }
        callback(null, true);
    }
});

async function removeLearningNotesFile(fileName) {
    if (!fileName || !/^[0-9a-f-]{36}\.pdf$/i.test(fileName)) return;
    try {
        await fs.unlink(path.join(LEARNING_NOTES_DIRECTORY, fileName));
    } catch (error) {
        if (error.code !== "ENOENT") throw error;
    }
}

function validId(value) {
    const id = Number(value);
    return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function parseModule(body = {}) {
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const videoUrl = typeof body.youtubeVideoUrl === "string" ? body.youtubeVideoUrl.trim() : "";
    const videoUrl2 = typeof body.youtubeVideoUrl2 === "string" ? body.youtubeVideoUrl2.trim() : "";
    const moduleOrder = Number(body.moduleOrder);
    const passingScore = Number(body.passingScore);
    const isActive = body.isActive === undefined ? true : body.isActive;

    if (!title || title.length > 160 || !description || !Number.isInteger(moduleOrder)
        || moduleOrder < 1 || moduleOrder > 255 || !Number.isFinite(passingScore)
        || passingScore < 0 || passingScore > 100 || typeof isActive !== "boolean") {
        return { error: "Enter a title, description, order from 1 to 255, passing score from 0 to 100, and valid active status." };
    }

    function normalizeVideoUrl(value) {
        if (!value) return null;
        try {
            const url = new URL(value);
            const host = url.hostname.toLowerCase();
            const validHost = ["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "www.youtube-nocookie.com"].includes(host);
            if (url.protocol !== "https:" || !validHost) throw new Error("Invalid host.");
            const videoId = host === "youtu.be"
                ? url.pathname.split("/").filter(Boolean)[0]
                : url.searchParams.get("v") || url.pathname.match(/^\/(?:embed|shorts)\/([^/?]+)/)?.[1];
            if (!videoId || !/^[A-Za-z0-9_-]{11}$/.test(videoId)) throw new Error("Invalid video ID.");
            return `https://www.youtube.com/watch?v=${videoId}`;
        } catch {
            return undefined;
        }
    }
    const savedVideoUrl = normalizeVideoUrl(videoUrl);
    const savedVideoUrl2 = normalizeVideoUrl(videoUrl2);
    if ((videoUrl && !savedVideoUrl) || (videoUrl2 && !savedVideoUrl2)) {
        return { error: "Enter a valid HTTPS YouTube video URL." };
    }
    if (videoUrl2 && moduleOrder !== 5) {
        return { error: "A second YouTube video is only allowed for Module 5." };
    }
    return { value: { title, description, videoUrl: savedVideoUrl, videoUrl2: savedVideoUrl2, moduleOrder, passingScore, isActive } };
}

function parseLesson(body = {}) {
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const content = typeof body.content === "string" ? body.content.trim() : "";
    const lessonOrder = Number(body.lessonOrder);
    if (!title || title.length > 160 || !content || !Number.isInteger(lessonOrder) || lessonOrder < 1 || lessonOrder > 65535) {
        return { error: "Enter a title, lesson content, and an order from 1 to 65,535." };
    }
    return { value: { title, content, lessonOrder } };
}

function parseAssignment(body = {}) {
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const instructions = typeof body.instructions === "string" ? body.instructions.trim() : "";
    if (!title || title.length > 160 || !instructions
        || typeof body.isRequired !== "boolean" || typeof body.requiresApproval !== "boolean"
        || (body.isActive !== undefined && typeof body.isActive !== "boolean")) {
        return { error: "Provide an assignment title, instructions, and valid required, approval, and active settings." };
    }
    return { value: { title, instructions, isRequired: body.isRequired, requiresApproval: body.requiresApproval, isActive: body.isActive !== false } };
}

router.get("/students", async (req, res, next) => {
    try {
        const [students] = await pool.query(
            `SELECT u.id, u.full_name, u.email, u.created_at,
                    COUNT(DISTINCT CASE WHEN p.is_completed = TRUE THEN p.module_id END) AS completed_modules,
                    COUNT(DISTINCT qr.id) AS quiz_attempts
             FROM users u
             LEFT JOIN student_progress p ON p.student_id = u.id
             LEFT JOIN quiz_results qr ON qr.student_id = u.id
             WHERE u.role = 'student'
             GROUP BY u.id ORDER BY u.created_at DESC`
        );
        res.json({ students });
    } catch (error) {
        next(error);
    }
});

router.patch("/students/:studentId", async (req, res, next) => {
    try {
        const studentId = validId(req.params.studentId);
        const fullName = typeof req.body.fullName === "string" ? req.body.fullName.trim() : "";
        const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
        if (!studentId || fullName.length < 2 || fullName.length > 160
            || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
            return res.status(400).json({ error: "Enter a valid name and email address." });
        }
        const [result] = await pool.execute(
            "UPDATE users SET full_name = ?, email = ? WHERE id = ? AND role = 'student'",
            [fullName, email, studentId]
        );
        if (!result.affectedRows) {
            const [existing] = await pool.execute("SELECT id FROM users WHERE id = ? AND role = 'student'", [studentId]);
            if (!existing.length) return res.status(404).json({ error: "Student not found." });
        }
        res.json({ message: "Student updated." });
    } catch (error) {
        next(error);
    }
});

router.delete("/students/:studentId", async (req, res, next) => {
    try {
        const studentId = validId(req.params.studentId);
        if (!studentId) return res.status(400).json({ error: "Invalid student." });
        const [result] = await pool.execute(
            "DELETE FROM users WHERE id = ? AND role = 'student'",
            [studentId]
        );
        if (!result.affectedRows) return res.status(404).json({ error: "Student not found." });
        res.json({ message: "Student account and associated data deleted." });
    } catch (error) {
        next(error);
    }
});

router.post("/modules", async (req, res, next) => {
    try {
        const parsed = parseModule(req.body);
        if (parsed.error) return res.status(400).json({ error: parsed.error });
        const m = parsed.value;
        const [existing] = await pool.execute(
            "SELECT id FROM modules WHERE LOWER(title) = LOWER(?) LIMIT 1",
            [m.title]
        );
        if (existing.length) {
            return res.status(409).json({ error: "A module with this title already exists." });
        }
        const [result] = await pool.execute(
            `INSERT INTO modules
                (title, description, youtube_video_url, youtube_video_url_2, module_order, quiz_passing_score, is_active)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [m.title, m.description, m.videoUrl, m.videoUrl2, m.moduleOrder, m.passingScore, m.isActive]
        );
        res.status(201).json({ id: result.insertId, message: "Module created." });
    } catch (error) {
        next(error);
    }
});

router.put("/modules/:moduleId/content", async (req, res, next) => {
    const body = req.body || {};
    const moduleId = validId(req.params.moduleId);
    const objective = typeof body.learningObjective === "string"
        ? body.learningObjective.trim()
        : "";
    const lessonContent = typeof body.lessonContent === "string"
        ? body.lessonContent.trim()
        : "";
    const moduleData = parseModule(body);

    if (!moduleId) return res.status(400).json({ error: "Invalid module." });
    if (objective.length < 2 || objective.length > 5000) {
        return res.status(400).json({ error: "Learning Objective is required and must be 2-5,000 characters." });
    }
    if (!lessonContent || lessonContent.length > 500000) {
        return res.status(400).json({ error: "Complete Lesson Content is required and must be no more than 500,000 characters." });
    }
    if (moduleData.error) return res.status(400).json({ error: moduleData.error });

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [existing] = await connection.execute(
            "SELECT id FROM modules WHERE id = ? FOR UPDATE",
            [moduleId]
        );
        if (!existing.length) {
            await connection.rollback();
            return res.status(404).json({ error: "Module not found." });
        }
        const m = moduleData.value;
        const [duplicateTitle] = await connection.execute(
            "SELECT id FROM modules WHERE LOWER(title) = LOWER(?) AND id <> ? LIMIT 1",
            [m.title, moduleId]
        );
        if (duplicateTitle.length) {
            await connection.rollback();
            return res.status(409).json({ error: "A module with this title already exists." });
        }
        await connection.execute(
            `UPDATE modules
             SET title = ?, description = ?, youtube_video_url = ?, youtube_video_url_2 = ?,
                 module_order = ?, quiz_passing_score = ?, is_active = ?, learning_objective = ?, lesson_content = ?
             WHERE id = ?`,
            [
                m.title, m.description, m.videoUrl, m.videoUrl2, m.moduleOrder,
                m.passingScore, m.isActive, objective, lessonContent, moduleId
            ]
        );
        await connection.commit();
        res.json({ message: "Module and lesson content saved." });
    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
});

router.patch("/modules/:moduleId", async (req, res, next) => {
    try {
        const moduleId = validId(req.params.moduleId);
        const parsed = parseModule(req.body);
        if (!moduleId) return res.status(400).json({ error: "Invalid module." });
        if (parsed.error) return res.status(400).json({ error: parsed.error });
        const m = parsed.value;
        const [result] = await pool.execute(
            `UPDATE modules SET title = ?, description = ?, youtube_video_url = ?,
                youtube_video_url_2 = ?, module_order = ?, quiz_passing_score = ?, is_active = ? WHERE id = ?`,
            [m.title, m.description, m.videoUrl, m.videoUrl2, m.moduleOrder, m.passingScore, m.isActive, moduleId]
        );
        if (!result.affectedRows) {
            const [existing] = await pool.execute("SELECT id FROM modules WHERE id = ?", [moduleId]);
            if (!existing.length) return res.status(404).json({ error: "Module not found." });
        }
        res.json({ message: "Module updated." });
    } catch (error) {
        next(error);
    }
});

router.delete("/modules/:moduleId", async (req, res, next) => {
    try {
        const moduleId = validId(req.params.moduleId);
        if (!moduleId) return res.status(400).json({ error: "Invalid module." });
        const [notes] = await pool.execute(
            "SELECT stored_file_name FROM module_learning_notes WHERE module_id = ?",
            [moduleId]
        );
        const [result] = await pool.execute("DELETE FROM modules WHERE id = ?", [moduleId]);
        if (!result.affectedRows) return res.status(404).json({ error: "Module not found." });
        await removeLearningNotesFile(notes[0]?.stored_file_name);
        res.json({ message: "Module and its associated learning data were deleted." });
    } catch (error) {
        next(error);
    }
});

router.post("/modules/:moduleId/learning-notes", (req, res, next) => {
    learningNotesUpload.single("pdf")(req, res, (error) => {
        if (error) return next(error);
        next();
    });
}, async (req, res, next) => {
    const moduleId = validId(req.params.moduleId);
    if (!moduleId) {
        if (req.file) await removeLearningNotesFile(req.file.filename);
        return res.status(400).json({ error: "Invalid module." });
    }
    if (!req.file) return res.status(400).json({ error: "Choose a PDF file to upload." });

    let fileHandle;
    try {
        fileHandle = await fs.open(req.file.path, "r");
        const signature = Buffer.alloc(5);
        const { bytesRead } = await fileHandle.read(signature, 0, signature.length, 0);
        if (bytesRead !== signature.length || signature.toString("ascii") !== "%PDF-") {
            await fileHandle.close();
            fileHandle = null;
            await removeLearningNotesFile(req.file.filename);
            return res.status(400).json({ error: "The uploaded file is not a valid PDF." });
        }
        await fileHandle.close();
        fileHandle = null;

        const connection = await pool.getConnection();
        let committed = false;
        try {
            await connection.beginTransaction();
            const [moduleRows] = await connection.execute(
                "SELECT id FROM modules WHERE id = ? FOR UPDATE",
                [moduleId]
            );
            if (!moduleRows.length) {
                await connection.rollback();
                await removeLearningNotesFile(req.file.filename);
                return res.status(404).json({ error: "Module not found." });
            }
            const [existingNotes] = await connection.execute(
                "SELECT stored_file_name FROM module_learning_notes WHERE module_id = ? FOR UPDATE",
                [moduleId]
            );
            await connection.execute(
                `INSERT INTO module_learning_notes
                    (module_id, original_file_name, stored_file_name, file_size)
                 VALUES (?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                    original_file_name = VALUES(original_file_name),
                    stored_file_name = VALUES(stored_file_name),
                    file_size = VALUES(file_size),
                    uploaded_at = CURRENT_TIMESTAMP`,
                [moduleId, path.basename(req.file.originalname).slice(0, 255), req.file.filename, req.file.size]
            );
            await connection.commit();
            committed = true;
            await removeLearningNotesFile(existingNotes[0]?.stored_file_name);
            res.status(201).json({ message: "Learning notes uploaded.", fileName: path.basename(req.file.originalname) });
        } catch (error) {
            if (!committed) await connection.rollback();
            if (!committed) {
                try {
                    await removeLearningNotesFile(req.file.filename);
                } catch (cleanupError) {
                    console.error("Could not remove a failed learning notes upload:", cleanupError);
                }
            }
            next(error);
        } finally {
            connection.release();
        }
    } catch (error) {
        if (fileHandle) await fileHandle.close();
        if (req.file) {
            try {
                await removeLearningNotesFile(req.file.filename);
            } catch (cleanupError) {
                console.error("Could not remove a failed learning notes upload:", cleanupError);
            }
        }
        next(error);
    }
});

router.delete("/modules/:moduleId/learning-notes", async (req, res, next) => {
    const moduleId = validId(req.params.moduleId);
    if (!moduleId) return res.status(400).json({ error: "Invalid module." });

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [notes] = await connection.execute(
            "SELECT stored_file_name FROM module_learning_notes WHERE module_id = ? FOR UPDATE",
            [moduleId]
        );
        if (!notes.length) {
            await connection.rollback();
            return res.status(404).json({ error: "This module has no learning notes to delete." });
        }
        await connection.execute("DELETE FROM module_learning_notes WHERE module_id = ?", [moduleId]);
        await connection.commit();
        await removeLearningNotesFile(notes[0].stored_file_name);
        res.json({ message: "Learning notes deleted." });
    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
});

router.post("/modules/:moduleId/lessons", async (req, res, next) => {
    try {
        const moduleId = validId(req.params.moduleId);
        const parsed = parseLesson(req.body);
        if (!moduleId) return res.status(400).json({ error: "Invalid module." });
        if (parsed.error) return res.status(400).json({ error: parsed.error });
        const l = parsed.value;
        const [result] = await pool.execute(
            "INSERT INTO lessons (module_id, title, content, lesson_order) VALUES (?, ?, ?, ?)",
            [moduleId, l.title, l.content, l.lessonOrder]
        );
        res.status(201).json({ id: result.insertId, message: "Lesson created." });
    } catch (error) {
        next(error);
    }
});

router.patch("/lessons/:lessonId", async (req, res, next) => {
    try {
        const lessonId = validId(req.params.lessonId);
        const parsed = parseLesson(req.body);
        if (!lessonId) return res.status(400).json({ error: "Invalid lesson." });
        if (parsed.error) return res.status(400).json({ error: parsed.error });
        const l = parsed.value;
        const [result] = await pool.execute(
            "UPDATE lessons SET title = ?, content = ?, lesson_order = ? WHERE id = ?",
            [l.title, l.content, l.lessonOrder, lessonId]
        );
        if (!result.affectedRows) {
            const [existing] = await pool.execute("SELECT id FROM lessons WHERE id = ?", [lessonId]);
            if (!existing.length) return res.status(404).json({ error: "Lesson not found." });
        }
        res.json({ message: "Lesson updated." });
    } catch (error) {
        next(error);
    }
});

router.delete("/lessons/:lessonId", async (req, res, next) => {
    try {
        const lessonId = validId(req.params.lessonId);
        if (!lessonId) return res.status(400).json({ error: "Invalid lesson." });
        const [result] = await pool.execute("DELETE FROM lessons WHERE id = ?", [lessonId]);
        if (!result.affectedRows) return res.status(404).json({ error: "Lesson not found." });
        res.json({ message: "Lesson deleted." });
    } catch (error) {
        next(error);
    }
});

router.post("/modules/:moduleId/questions", async (req, res, next) => {
    try {
        const moduleId = validId(req.params.moduleId);
        const question = typeof req.body.question === "string" ? req.body.question.trim() : "";
        const choices = req.body.answerChoices;
        const correctAnswer = typeof req.body.correctAnswer === "string" ? req.body.correctAnswer.trim() : "";
        const questionOrder = Number(req.body.questionOrder);
        if (!moduleId || !question || question.length > 2000 || !Array.isArray(choices)
            || choices.length < 2 || choices.length > 8
            || choices.some((choice) => typeof choice !== "string" || !choice.trim() || choice.length > 500)
            || new Set(choices).size !== choices.length || !choices.includes(correctAnswer)
            || !Number.isInteger(questionOrder) || questionOrder < 1 || questionOrder > 65535) {
            return res.status(400).json({ error: "Provide a question, 2-8 unique choices, a matching correct answer, and a valid order." });
        }
        const [result] = await pool.execute(
            `INSERT INTO quizzes (module_id, question, answer_choices, correct_answer, question_order)
             VALUES (?, ?, ?, ?, ?)`,
            [moduleId, question, JSON.stringify(choices), correctAnswer, questionOrder]
        );
        res.status(201).json({ id: result.insertId, message: "Question created." });
    } catch (error) {
        next(error);
    }
});

router.get("/modules/:moduleId/questions", async (req, res, next) => {
    try {
        const moduleId = validId(req.params.moduleId);
        if (!moduleId) return res.status(400).json({ error: "Invalid module." });
        const [questions] = await pool.execute(
            `SELECT id, question, answer_choices, correct_answer, question_order
             FROM quizzes WHERE module_id = ? ORDER BY question_order`,
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

router.patch("/questions/:questionId", async (req, res, next) => {
    try {
        const questionId = validId(req.params.questionId);
        const question = typeof req.body.question === "string" ? req.body.question.trim() : "";
        const choices = req.body.answerChoices;
        const correctAnswer = typeof req.body.correctAnswer === "string" ? req.body.correctAnswer.trim() : "";
        const questionOrder = Number(req.body.questionOrder);
        if (!questionId || !question || question.length > 2000 || !Array.isArray(choices)
            || choices.length < 2 || choices.length > 8
            || choices.some((choice) => typeof choice !== "string" || !choice.trim() || choice.length > 500)
            || new Set(choices).size !== choices.length || !choices.includes(correctAnswer)
            || !Number.isInteger(questionOrder) || questionOrder < 1 || questionOrder > 65535) {
            return res.status(400).json({ error: "Provide a question, 2-8 unique choices, a matching correct answer, and a valid order." });
        }
        const [result] = await pool.execute(
            `UPDATE quizzes SET question = ?, answer_choices = ?, correct_answer = ?,
                question_order = ? WHERE id = ?`,
            [question, JSON.stringify(choices), correctAnswer, questionOrder, questionId]
        );
        if (!result.affectedRows) {
            const [existing] = await pool.execute("SELECT id FROM quizzes WHERE id = ?", [questionId]);
            if (!existing.length) return res.status(404).json({ error: "Question not found." });
        }
        res.json({ message: "Question updated." });
    } catch (error) {
        next(error);
    }
});

router.delete("/questions/:questionId", async (req, res, next) => {
    try {
        const questionId = validId(req.params.questionId);
        if (!questionId) return res.status(400).json({ error: "Invalid question." });
        const [result] = await pool.execute("DELETE FROM quizzes WHERE id = ?", [questionId]);
        if (!result.affectedRows) return res.status(404).json({ error: "Question not found." });
        res.json({ message: "Question deleted." });
    } catch (error) {
        next(error);
    }
});

router.post("/modules/:moduleId/assignments", async (req, res, next) => {
    try {
        const moduleId = validId(req.params.moduleId);
        const parsed = parseAssignment(req.body);
        if (!moduleId) return res.status(400).json({ error: "Invalid module." });
        if (parsed.error) return res.status(400).json({ error: parsed.error });
        const a = parsed.value;
        const [result] = await pool.execute(
            `INSERT INTO assignments
                (module_id, title, instructions, is_required, requires_approval, is_active)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [moduleId, a.title, a.instructions, a.isRequired, a.requiresApproval, a.isActive]
        );
        res.status(201).json({ id: result.insertId, message: "Assignment created." });
    } catch (error) {
        next(error);
    }
});

router.patch("/assignments/:assignmentId", async (req, res, next) => {
    try {
        const assignmentId = validId(req.params.assignmentId);
        const parsed = parseAssignment(req.body);
        if (!assignmentId) return res.status(400).json({ error: "Invalid assignment." });
        if (parsed.error) return res.status(400).json({ error: parsed.error });
        const a = parsed.value;
        const [result] = await pool.execute(
            `UPDATE assignments SET title = ?, instructions = ?, is_required = ?,
                requires_approval = ?, is_active = ? WHERE id = ?`,
            [a.title, a.instructions, a.isRequired, a.requiresApproval, a.isActive, assignmentId]
        );
        if (!result.affectedRows) {
            const [existing] = await pool.execute("SELECT id FROM assignments WHERE id = ?", [assignmentId]);
            if (!existing.length) return res.status(404).json({ error: "Assignment not found." });
        }
        res.json({ message: "Assignment updated." });
    } catch (error) {
        next(error);
    }
});

router.delete("/assignments/:assignmentId", async (req, res, next) => {
    try {
        const assignmentId = validId(req.params.assignmentId);
        if (!assignmentId) return res.status(400).json({ error: "Invalid assignment." });
        const [result] = await pool.execute("DELETE FROM assignments WHERE id = ?", [assignmentId]);
        if (!result.affectedRows) return res.status(404).json({ error: "Assignment not found." });
        res.json({ message: "Assignment and its submissions deleted." });
    } catch (error) {
        next(error);
    }
});

router.get("/submissions", async (req, res, next) => {
    try {
        const moduleId = req.query.moduleId === undefined ? null : validId(req.query.moduleId);
        if (req.query.moduleId !== undefined && !moduleId) {
            return res.status(400).json({ error: "Invalid module." });
        }
        const [submissions] = await pool.execute(
            `SELECT s.id, s.assignment_id, s.student_id, s.submission_text, s.status,
                    s.admin_feedback, s.submitted_at, s.reviewed_at,
                    a.instructions, cp.instructions_state, cp.response_state,
                    u.full_name AS student_name, u.email,
                    a.title AS assignment_title, a.requires_approval, m.title AS module_title
             FROM assignment_submissions s
             JOIN users u ON u.id = s.student_id
             JOIN assignments a ON a.id = s.assignment_id
             JOIN modules m ON m.id = a.module_id
             LEFT JOIN assignment_checklist_progress cp
                ON cp.assignment_id = s.assignment_id AND cp.student_id = s.student_id
             WHERE s.id = (
                 SELECT MAX(latest.id) FROM assignment_submissions latest
                 WHERE latest.assignment_id = s.assignment_id AND latest.student_id = s.student_id
             )
             ${moduleId ? "AND m.id = ?" : ""}
             ORDER BY s.submitted_at DESC`,
            moduleId ? [moduleId] : []
        );
        res.json({ submissions });
    } catch (error) {
        next(error);
    }
});

router.patch("/submissions/:submissionId", async (req, res, next) => {
    const submissionId = validId(req.params.submissionId);
    const status = req.body.status;
    const feedback = typeof req.body.feedback === "string" ? req.body.feedback.trim() : "";
    if (!submissionId || !["approved", "rejected", "pending"].includes(status) || feedback.length > 5000) {
        return res.status(400).json({ error: "Choose a valid review status and feedback up to 5,000 characters." });
    }
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [submissions] = await connection.execute(
            `SELECT s.student_id, a.module_id FROM assignment_submissions s
             JOIN assignments a ON a.id = s.assignment_id WHERE s.id = ? FOR UPDATE`,
            [submissionId]
        );
        if (!submissions.length) {
            await connection.rollback();
            return res.status(404).json({ error: "Submission not found." });
        }
        const submission = submissions[0];
        await connection.execute(
            `UPDATE assignment_submissions SET status = ?, admin_feedback = ?, reviewed_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [status, feedback || null, submissionId]
        );
        await refreshModuleCompletion(connection, submission.student_id, submission.module_id);
        await connection.commit();
        res.json({ message: "Submission review saved." });
    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
});

router.get("/progress", async (req, res, next) => {
    try {
        const [progress] = await pool.query(
            `SELECT u.id AS student_id, u.full_name, u.email,
                    m.id AS module_id, m.title AS module_title,
                    COALESCE(p.is_unlocked, FALSE) AS is_unlocked,
                    COALESCE(p.is_completed, FALSE) AS is_completed,
                    (SELECT MAX(qr.percentage) FROM quiz_results qr
                     WHERE qr.student_id = u.id AND qr.module_id = m.id) AS best_score
             FROM users u CROSS JOIN modules m
             LEFT JOIN student_progress p ON p.student_id = u.id AND p.module_id = m.id
             WHERE u.role = 'student' ORDER BY u.full_name, m.module_order`
        );
        res.json({ progress });
    } catch (error) {
        next(error);
    }
});

router.get("/results", async (req, res, next) => {
    try {
        const moduleId = req.query.moduleId === undefined ? null : validId(req.query.moduleId);
        if (req.query.moduleId !== undefined && !moduleId) {
            return res.status(400).json({ error: "Invalid module." });
        }
        const [results] = await pool.execute(
            `SELECT qr.id, qr.score, qr.total_questions, qr.percentage, qr.passed,
                    qr.attempt_number, qr.submitted_at, u.id AS student_id,
                    u.full_name, u.email, m.title AS module_title
             FROM quiz_results qr
             JOIN users u ON u.id = qr.student_id
             JOIN modules m ON m.id = qr.module_id
             ${moduleId ? "WHERE qr.module_id = ?" : ""}
             ORDER BY qr.submitted_at DESC`,
            moduleId ? [moduleId] : []
        );
        res.json({ results });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
