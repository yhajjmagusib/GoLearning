require("dotenv").config();

const { pool } = require("../config/database");

const curriculum = [
    {
        title: "Digital Literacy",
        description: "Build essential computer, internet, and online safety skills.",
        lessons: [
            ["Basic Computer and Internet Skills", "Learn how to use common computer hardware, operating systems, files, browsers, and search engines."],
            ["Digital Tools and Online Safety", "Practice using everyday digital tools and protecting personal information online."]
        ],
        sampleQuestion: ["SAMPLE QUESTION: Which tool is commonly used to visit websites?", ["Web browser", "Spreadsheet", "Calculator"], "Web browser"]
    },
    {
        title: "Communication Skills",
        description: "Develop clear, respectful communication for learning and work.",
        lessons: [
            ["Verbal and Written Communication", "Practice organizing ideas and communicating clearly in speech, messages, and documents."],
            ["Professional Communication", "Learn respectful workplace communication, active listening, and appropriate tone."]
        ],
        sampleQuestion: ["SAMPLE QUESTION: What is a useful way to show active listening?", ["Interrupt to respond quickly", "Pay attention and ask relevant questions", "Change the topic"], "Pay attention and ask relevant questions"]
    },
    {
        title: "Leadership and Teamwork",
        description: "Learn to contribute to teams, lead responsibly, and make decisions.",
        lessons: [
            ["Leadership", "Explore responsible leadership, setting goals, and supporting a team."],
            ["Cooperation and Teamwork", "Practice collaboration, sharing responsibilities, and resolving disagreements."],
            ["Decision-Making", "Use a simple process to compare options and make thoughtful decisions."]
        ],
        sampleQuestion: ["SAMPLE QUESTION: What helps a team work effectively?", ["Clear shared responsibilities", "Keeping information from teammates", "Avoiding all discussion"], "Clear shared responsibilities"]
    },
    {
        title: "Time Management",
        description: "Plan work, prioritize tasks, and build productive routines.",
        lessons: [
            ["Planning and Prioritizing Tasks", "Set goals, break work into manageable tasks, and prioritize deadlines."],
            ["Productivity", "Build focused work habits and review progress without overloading your schedule."]
        ],
        sampleQuestion: ["SAMPLE QUESTION: What is a helpful first step when managing several tasks?", ["Ignore deadlines", "List tasks and prioritize them", "Try to do everything at once"], "List tasks and prioritize them"]
    },
    {
        title: "Career and Employment Skills",
        description: "Prepare for job applications, interviews, and professional life.",
        lessons: [
            ["Resume and Interview Preparation", "Create a clear resume and prepare concise examples for common interview questions."],
            ["Professionalism and Interview Preparation", "Practice workplace expectations, interview etiquette, and follow-up."]
        ],
        sampleQuestion: ["SAMPLE QUESTION: What should a resume emphasize?", ["Relevant skills and experience", "Unrelated personal details", "Every task ever completed"], "Relevant skills and experience"]
    }
];

async function seedModules() {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        for (let index = 0; index < curriculum.length; index += 1) {
            const item = curriculum[index];
            const order = index + 1;
            const [existing] = await connection.execute(
                "SELECT id FROM modules WHERE title = ? LIMIT 1",
                [item.title]
            );
            let moduleId;
            if (existing.length) {
                moduleId = existing[0].id;
            } else {
                const [orderCollision] = await connection.execute(
                    "SELECT title FROM modules WHERE module_order = ? LIMIT 1",
                    [order]
                );
                if (orderCollision.length) {
                    throw new Error(
                        `Module order ${order} is already used by "${orderCollision[0].title}". Resolve this in the database before seeding.`
                    );
                }
                const [result] = await connection.execute(
                    `INSERT INTO modules (title, description, module_order)
                     VALUES (?, ?, ?)`,
                    [item.title, item.description, order]
                );
                moduleId = result.insertId;
            }

            for (let lessonIndex = 0; lessonIndex < item.lessons.length; lessonIndex += 1) {
                const [lessonTitle, content] = item.lessons[lessonIndex];
                const lessonOrder = lessonIndex + 1;
                const [lessonExists] = await connection.execute(
                    "SELECT id FROM lessons WHERE module_id = ? AND title = ? LIMIT 1",
                    [moduleId, lessonTitle]
                );
                if (lessonExists.length) continue;
                const [lessonOrderCollision] = await connection.execute(
                    "SELECT title FROM lessons WHERE module_id = ? AND lesson_order = ? LIMIT 1",
                    [moduleId, lessonOrder]
                );
                if (lessonOrderCollision.length) {
                    throw new Error(
                        `Lesson order ${lessonOrder} in "${item.title}" is already used by "${lessonOrderCollision[0].title}".`
                    );
                }

                await connection.execute(
                    "INSERT INTO lessons (module_id, title, content, lesson_order) VALUES (?, ?, ?, ?)",
                    [moduleId, lessonTitle, content, lessonOrder]
                );
            }

            const [quizExists] = await connection.execute(
                "SELECT id FROM quizzes WHERE module_id = ? LIMIT 1",
                [moduleId]
            );
            if (!quizExists.length) {
                const [question, choices, correctAnswer] = item.sampleQuestion;
                await connection.execute(
                    `INSERT INTO quizzes (module_id, question, answer_choices, correct_answer, question_order)
                     VALUES (?, ?, ?, ?, 1)`,
                    [moduleId, question, JSON.stringify(choices), correctAnswer]
                );
            }
        }
        await connection.commit();
        console.log("Seeded the five GoLearning modules and their lessons.");
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
        await pool.end();
    }
}

seedModules().catch((error) => {
    console.error("Module seeding failed:", error.message);
    process.exitCode = 1;
});
