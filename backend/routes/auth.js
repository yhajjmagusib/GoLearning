const express = require("express");
const bcrypt = require("bcryptjs");
const { pool } = require("../config/database");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

function publicUser(user) {
    return {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        role: user.role
    };
}

router.post("/register", async (req, res, next) => {
    try {
        const fullName = typeof req.body.fullName === "string" ? req.body.fullName.trim() : "";
        const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
        const password = typeof req.body.password === "string" ? req.body.password : "";

        if (fullName.length < 2 || fullName.length > 160) {
            return res.status(400).json({ error: "Enter a name between 2 and 160 characters." });
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
            return res.status(400).json({ error: "Enter a valid email address." });
        }
        if (password.length < 8 || password.length > 72) {
            return res.status(400).json({ error: "Password must be between 8 and 72 characters." });
        }

        const passwordHash = await bcrypt.hash(password, 12);
        const connection = await pool.getConnection();
        let user;
        try {
            await connection.beginTransaction();
            const [result] = await connection.execute(
                "INSERT INTO users (full_name, email, password_hash, role) VALUES (?, ?, ?, 'student')",
                [fullName, email, passwordHash]
            );
            user = { id: result.insertId, full_name: fullName, email, role: "student" };
            await connection.execute(
                `INSERT INTO student_progress (student_id, module_id, is_unlocked)
                 SELECT ?, id, TRUE FROM modules
                 WHERE is_active = TRUE ORDER BY module_order LIMIT 1`,
                [user.id]
            );
            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }

        await new Promise((resolve, reject) => {
            req.session.regenerate((error) => error ? reject(error) : resolve());
        });
        req.session.user = publicUser(user);

        await new Promise((resolve, reject) => {
            req.session.save((error) => error ? reject(error) : resolve());
        });

        res.status(201).json({ user: publicUser(user) });
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({ error: "An account with this email already exists." });
        }
        next(error);
    }
});

router.post("/login", async (req, res, next) => {
    try {
        const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
        const password = typeof req.body.password === "string" ? req.body.password : "";
        const [users] = await pool.execute(
            "SELECT id, full_name, email, password_hash, role FROM users WHERE email = ? LIMIT 1",
            [email]
        );

        if (!users.length || !(await bcrypt.compare(password, users[0].password_hash))) {
            return res.status(401).json({ error: "Email or password is incorrect." });
        }

        const user = publicUser(users[0]);
        await new Promise((resolve, reject) => {
            req.session.regenerate((error) => error ? reject(error) : resolve());
        });
        req.session.user = user;
        await new Promise((resolve, reject) => {
            req.session.save((error) => error ? reject(error) : resolve());
        });

        res.json({ user });
    } catch (error) {
        next(error);
    }
});

router.get("/me", requireAuth, (req, res) => {
    res.json({ user: req.session.user });
});

router.post("/logout", requireAuth, (req, res, next) => {
    req.session.destroy((error) => {
        if (error) return next(error);
        res.clearCookie("golearning.sid");
        res.json({ message: "You have been logged out." });
    });
});

module.exports = router;
