function combineLegacyLessons(lessons) {
    return lessons
        .map((lesson) => `${lesson.title}\n\n${lesson.content}`)
        .join("\n\n");
}

module.exports = { combineLegacyLessons };
