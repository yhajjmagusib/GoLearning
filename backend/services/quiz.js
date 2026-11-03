function choicesFor(question) {
    return typeof question.answer_choices === "string"
        ? JSON.parse(question.answer_choices)
        : question.answer_choices;
}

function gradeQuiz(questions, answers, passingScore) {
    if (!Array.isArray(answers) || answers.length !== questions.length || questions.length === 0) {
        throw new Error("Answer every question in the quiz.");
    }

    const answerMap = new Map();
    for (const answer of answers) {
        if (!answer || !Number.isSafeInteger(answer.questionId) || typeof answer.answer !== "string"
            || answerMap.has(answer.questionId)) {
            throw new Error("Quiz answers contain invalid or duplicate questions.");
        }
        answerMap.set(answer.questionId, answer.answer);
    }

    let score = 0;
    for (const question of questions) {
        const choices = choicesFor(question);
        const answer = answerMap.get(question.id);
        if (answer === undefined || !choices.includes(answer)) {
            throw new Error("Select a valid choice for each question.");
        }
        if (answer === question.correct_answer) score += 1;
    }

    const percentage = Number(((score / questions.length) * 100).toFixed(2));
    return {
        score,
        totalQuestions: questions.length,
        percentage,
        passed: percentage >= Number(passingScore)
    };
}

module.exports = { gradeQuiz };
