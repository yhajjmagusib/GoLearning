require("dotenv").config();

const { pool } = require("../config/database");
const { combineLegacyLessons } = require("../services/legacyLessons");

async function migrateLegacyLessons() {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [modules] = await connection.query(
            `SELECT id, title FROM modules
             WHERE lesson_content IS NULL OR lesson_content = ''
             ORDER BY module_order`
        );
        let migrated = 0;

        for (const module of modules) {
            const [lessons] = await connection.execute(
                `SELECT title, content FROM lessons
                 WHERE module_id = ? ORDER BY lesson_order, id`,
                [module.id]
            );
            if (!lessons.length) continue;

            const completeContent = combineLegacyLessons(lessons);
            await connection.execute(
                "UPDATE modules SET lesson_content = ? WHERE id = ? AND (lesson_content IS NULL OR lesson_content = '')",
                [completeContent, module.id]
            );
            migrated += 1;
        }

        await connection.commit();
        console.log(`Copied legacy lesson content into ${migrated} module record(s). Original lesson rows were preserved.`);
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
        await pool.end();
    }
}

migrateLegacyLessons().catch((error) => {
    console.error("Legacy lesson migration failed:", error.message);
    process.exitCode = 1;
});
