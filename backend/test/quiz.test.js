const test = require("node:test");
const assert = require("node:assert/strict");
const { gradeQuiz } = require("../services/quiz");

const questions = [
    { id: 10, answer_choices: ["A", "B"], correct_answer: "A" },
    { id: 11, answer_choices: JSON.stringify(["C", "D"]), correct_answer: "D" }
];

test("grades all answers and checks the configured passing percentage", () => {
    assert.deepEqual(
        gradeQuiz(questions, [
            { questionId: 10, answer: "A" },
            { questionId: 11, answer: "D" }
        ], 80),
        { score: 2, totalQuestions: 2, percentage: 100, passed: true }
    );
});

test("records a failed attempt instead of trusting a client score", () => {
    assert.deepEqual(
        gradeQuiz(questions, [
            { questionId: 10, answer: "B" },
            { questionId: 11, answer: "D" }
        ], 80),
        { score: 1, totalQuestions: 2, percentage: 50, passed: false }
    );
});

test("rejects incomplete, duplicate, unknown, and invalid-choice answers", () => {
    assert.throws(() => gradeQuiz(questions, [{ questionId: 10, answer: "A" }], 80), /Answer every question/);
    assert.throws(() => gradeQuiz(questions, [
        { questionId: 10, answer: "A" },
        { questionId: 10, answer: "B" }
    ], 80), /duplicate/);
    assert.throws(() => gradeQuiz(questions, [
        { questionId: 10, answer: "A" },
        { questionId: 99, answer: "D" }
    ], 80), /valid choice/);
    assert.throws(() => gradeQuiz(questions, [
        { questionId: 10, answer: "Not a choice" },
        { questionId: 11, answer: "D" }
    ], 80), /valid choice/);
});
