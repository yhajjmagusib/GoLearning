require("dotenv").config();

const readline = require("node:readline");
const bcrypt = require("bcryptjs");
const { pool } = require("../config/database");

function ask(question) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise((resolve) => rl.question(question, (answer) => {
        rl.close();
        resolve(answer.trim());
    }));
}

function askPassword() {
    return new Promise((resolve, reject) => {
        const input = process.stdin;
        if (!input.isTTY || typeof input.setRawMode !== "function") {
            reject(new Error("Run this command in a terminal that supports hidden password input."));
            return;
        }

        process.stdout.write("Admin password (min 8 characters): ");
        let password = "";
        input.setEncoding("utf8");
        input.setRawMode(true);
        input.resume();
        const onData = (character) => {
            if (character === "\u0003") {
                input.setRawMode(false);
                input.removeListener("data", onData);
                process.stdout.write("\n");
                reject(new Error("Admin setup cancelled."));
                return;
            }
            if (character === "\r" || character === "\n") {
                input.setRawMode(false);
                input.removeListener("data", onData);
                process.stdout.write("\n");
                resolve(password);
                return;
            }
            if (character === "\u0008" || character === "\u007f") {
                password = password.slice(0, -1);
                return;
            }
            password += character;
        };
        input.on("data", onData);
    });
}

async function createAdmin() {
    const fullName = await ask("Admin full name: ");
    const email = (await ask("Admin email: ")).toLowerCase();
    const password = await askPassword();
    if (fullName.length < 2 || fullName.length > 160) {
        throw new Error("Name must be between 2 and 160 characters.");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
        throw new Error("Enter a valid email address.");
    }
    if (password.length < 8 || password.length > 72) {
        throw new Error("Password must be between 8 and 72 characters.");
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await pool.execute(
        "INSERT INTO users (full_name, email, password_hash, role) VALUES (?, ?, ?, 'admin')",
        [fullName, email, passwordHash]
    );
    console.log(`Admin account created for ${email}.`);
}

createAdmin()
    .catch((error) => {
        console.error("Admin setup failed:", error.code === "ER_DUP_ENTRY" ? "That email is already in use." : error.message);
        process.exitCode = 1;
    })
    .finally(() => pool.end());
