const params = new URLSearchParams(window.location.search);
const moduleId = Number(params.get("id"));
const message = document.querySelector("#page-message");
let moduleInfo;
let currentUser;
let quizQuestions = [];
let adminQuestions = [];

function el(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined && text !== null) node.textContent = text;
    if (className) node.className = className;
    return node;
}

async function api(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: { ...(options.body ? { "Content-Type": "application/json" } : {}), ...options.headers }
    });
    const data = await response.json().catch(() => ({}));
    if (response.status === 401) {
        window.location.assign("login.html");
        throw new Error("Please log in.");
    }
    if (!response.ok) throw new Error(data.error || "The request failed.");
    return data;
}

function showMessage(text, isError = false) {
    message.textContent = text;
    message.classList.toggle("notice-error", isError);
    message.classList.toggle("notice-success", !isError && Boolean(text));
}

function embedVideo(url) {
    if (!url) return null;
    try {
        const parsed = new URL(url);
        const host = parsed.hostname.toLowerCase();
        const videoId = host === "youtu.be"
            ? parsed.pathname.split("/").filter(Boolean)[0]
            : parsed.searchParams.get("v") || parsed.pathname.match(/^\/(?:embed|shorts)\/([^/?]+)/)?.[1];
        if (!["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "www.youtube-nocookie.com"].includes(host)
            || !videoId || !/^[A-Za-z0-9_-]{11}$/.test(videoId)) return null;
        return `https://www.youtube-nocookie.com/embed/${videoId}`;
    } catch {
        return null;
    }
}

async function loadModule() {
    if (!Number.isSafeInteger(moduleId) || moduleId < 1) throw new Error("The module link is invalid.");

    const { user } = await api("/api/auth/me");
    currentUser = user;
    document.querySelector("#add-assignment-button").hidden = user.role !== "admin";
    const [content, assignmentData, attemptHistory, questionData, resultData, submissionData] = await Promise.all([
        api(`/api/modules/${moduleId}`),
        api(`/api/modules/${moduleId}/assignments`),
        user.role === "student" ? userResults() : Promise.resolve([]),
        user.role === "admin"
            ? api(`/api/admin/modules/${moduleId}/questions`)
            : Promise.resolve({ questions: [] }),
        user.role === "admin"
            ? api(`/api/admin/results?moduleId=${moduleId}`)
            : Promise.resolve({ results: [] }),
        user.role === "admin"
            ? api(`/api/admin/submissions?moduleId=${moduleId}`)
            : Promise.resolve({ submissions: [] })
    ]);

    moduleInfo = content.module;
    document.title = `${moduleInfo.title} | GoLearning`;
    document.querySelector("#module-order").textContent = `MODULE ${moduleInfo.module_order}`;
    document.querySelector("#module-title").textContent = moduleInfo.title;
    document.querySelector("#module-description").textContent = moduleInfo.description;
    document.querySelector("#module-content").hidden = false;
    renderVideo([moduleInfo.youtube_video_url, moduleInfo.youtube_video_url_2]);
    renderLessons(content.lessons, moduleInfo);
    renderAssignments(assignmentData.assignments, user.role);
    renderAttemptHistory(attemptHistory);
    renderLearningNotes(moduleInfo.learning_notes);

    if (user.role === "admin") {
        document.querySelector("#quiz-panel").hidden = true;
        document.querySelector("#attempt-history-panel").hidden = true;
        document.querySelector("#admin-quiz-panel").hidden = false;
        document.querySelector("#admin-results-panel").hidden = false;
        document.querySelector("#admin-submissions-panel").hidden = false;
        adminQuestions = questionData.questions;
        renderAdminQuestions();
        renderAdminQuizResults(resultData.results);
        renderAdminSubmissions(submissionData.submissions);
        bindAssignmentReview();
        bindAdminManagement();
    } else {
        document.querySelector("#module-certificate-panel").hidden = false;
        renderModuleCertificate(moduleInfo.certificate_available);
        if (attemptHistory.some((attempt) => attempt.passed)) {
            document.querySelector("#open-quiz").hidden = true;
            document.querySelector("#quiz-result").textContent = "You have already passed this module quiz.";
        }
    }
}

function renderLearningNotes(notes) {
    const message = document.querySelector("#learning-notes-message");
    const download = document.querySelector("#learning-notes-download");
    if (!notes) {
        message.textContent = "Learning notes have not been uploaded for this module yet.";
        download.hidden = true;
        return;
    }
    const uploadedDate = new Date(notes.uploaded_at);
    const dateLabel = Number.isNaN(uploadedDate.getTime()) ? "" : ` Uploaded ${uploadedDate.toLocaleDateString()}.`;
    message.textContent = `${notes.original_file_name}${dateLabel}`;
    download.href = `/api/modules/${encodeURIComponent(moduleId)}/learning-notes/download`;
    download.hidden = false;
}

function renderModuleCertificate(available) {
    const status = document.querySelector("#module-certificate-status");
    const download = document.querySelector("#module-certificate-download");
    status.textContent = available
        ? "Available - you passed the quiz and completed all required assignment conditions."
        : "Locked - pass the quiz and complete any required assignments and approvals to unlock this reward.";
    download.href = `/api/modules/${encodeURIComponent(moduleId)}/certificate`;
    download.hidden = !available;
}

function renderAdminQuizResults(results) {
    const list = document.querySelector("#admin-results");
    list.replaceChildren();
    if (!results.length) list.append(el("p", "No quiz attempts for this module yet.", "muted"));
    for (const result of results) {
        list.append(el("p", `${result.full_name} (${result.email}) - ${result.score}/${result.total_questions} (${result.percentage}%) - ${result.passed ? "Passed" : "Not passed"} - attempt ${result.attempt_number}`));
    }
}

function renderAdminSubmissions(submissions) {
    const list = document.querySelector("#admin-submissions");
    list.replaceChildren();
    if (!submissions.length) {
        list.append(el("p", "No assignment submissions for this module yet.", "muted"));
        return;
    }
    for (const submission of submissions) {
        const row = el("article", null, "submission-record");
        row.append(el("h3", `${submission.student_name} - ${submission.assignment_title}`));
        row.append(el("p", `${submission.email} | ${submission.status}`));
        if (submission.instructions) {
            const checklist = el("div", null, "preserved-content submission-response");
            renderFormattedContent(checklist, submission.instructions, {
                checklistState: parseChecklistState(submission.instructions_state)
            });
            if (checklist.querySelector(".lesson-list-checklist")) {
                row.append(el("strong", "Assignment checklist"));
                row.append(checklist);
            }
        }
        row.append(el("strong", "Student response"));
        const response = el("div", null, "preserved-content submission-response");
        renderFormattedContent(response, submission.submission_text || "No text supplied.", {
            checklistState: parseChecklistState(submission.response_state)
        });
        row.append(response);
        if (submission.admin_feedback) {
            row.append(el("strong", "Feedback"));
            const feedback = el("div", null, "preserved-content submission-response");
            renderFormattedContent(feedback, submission.admin_feedback);
            row.append(feedback);
        }
        const reviewButton = el("button", "Review this submission", "button-secondary");
        reviewButton.type = "button";
        reviewButton.addEventListener("click", () => {
            const form = document.querySelector("#review-form");
            form.elements.submissionId.value = submission.id;
            form.elements.status.value = submission.status;
            form.elements.feedback.value = submission.admin_feedback || "";
            clearDialogError(form);
            document.querySelector("#review-dialog").showModal();
        });
        row.append(reviewButton);
        list.append(row);
    }
}

function bindAssignmentReview() {
    const form = document.querySelector("#review-form");
    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!form.reportValidity() || form.dataset.saving === "true") return;
        const dialog = form.closest("dialog");
        const data = new FormData(form);
        setDialogSaving(dialog, true);
        clearDialogError(form);
        try {
            await api(`/api/admin/submissions/${data.get("submissionId")}`, {
                method: "PATCH",
                body: JSON.stringify({ status: data.get("status"), feedback: data.get("feedback") })
            });
        } catch (error) {
            const notice = form.querySelector(".dialog-message");
            notice.textContent = error.message;
            notice.classList.add("notice-error");
            return;
        } finally {
            setDialogSaving(dialog, false);
        }
        dialog.close();
        showMessage("Assignment review saved.");
        try {
            const { submissions } = await api(`/api/admin/submissions?moduleId=${moduleId}`);
            renderAdminSubmissions(submissions);
        } catch (error) {
            showMessage(`Review saved, but submissions could not be refreshed: ${error.message}`, true);
        }
    });
}

async function userResults() {
    const response = await api(`/api/modules/${moduleId}/results`);
    return response.results;
}

function renderAttemptHistory(results) {
    const history = document.querySelector("#attempt-history");
    history.replaceChildren();
    if (!results.length) {
        history.append(el("p", "No attempts yet.", "muted"));
        return;
    }
    results.forEach((result) => {
        history.append(el("p", `Attempt ${result.attempt_number}: ${result.score}/${result.total_questions} (${result.percentage}%) - ${result.passed ? "Passed" : "Not passed"}`));
    });
}

function renderVideo(urls) {
    const container = document.querySelector("#video-container");
    container.replaceChildren();
    const videos = urls.filter(Boolean);
    if (!videos.length) {
        container.append(el("p", "No video lesson has been added for this module yet.", "muted"));
        return;
    }
    videos.forEach((url, index) => {
        const src = embedVideo(url);
        const video = el("div", null, "video-lesson");
        if (videos.length > 1) video.append(el("h3", `Video lesson ${index + 1}`));
        if (!src) {
            video.append(el("p", "This video link cannot be embedded. Ask an administrator to update it.", "muted"));
            container.append(video);
            return;
        }
        const frameWrap = el("div", null, "video-frame");
        const frame = el("iframe");
        frame.src = src;
        frame.title = `${moduleInfo.title} video lesson ${index + 1}`;
        frame.loading = "lazy";
        frame.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
        frame.allowFullscreen = true;
        frame.referrerPolicy = "strict-origin-when-cross-origin";
        frameWrap.append(frame);
        video.append(frameWrap);
        container.append(video);
    });
}

function appendFormattedText(parent, text) {
    const inlinePattern = /(\*\*[^*\n]+\*\*|\*[^*\n]+\*|_[^_\n]+_)/g;
    let lastIndex = 0;
    let match;
    while ((match = inlinePattern.exec(text)) !== null) {
        parent.append(document.createTextNode(text.slice(lastIndex, match.index)));
        const isBold = match[0].startsWith("**");
        const formatted = document.createElement(isBold ? "strong" : "em");
        formatted.textContent = isBold ? match[0].slice(2, -2) : match[0].slice(1, -1);
        parent.append(formatted);
        lastIndex = inlinePattern.lastIndex;
    }
    parent.append(document.createTextNode(text.slice(lastIndex)));
}

function renderFormattedContent(container, text, { checklistState = [], onChecklistChange } = {}) {
    container.replaceChildren();
    const lines = text.replace(/\r\n?/g, "\n").split("\n");
    let paragraph = [];
    let list = null;
    let listType = "";
    let checklistIndex = 0;

    const flushParagraph = () => {
        if (!paragraph.length) return;
        const element = document.createElement("p");
        element.className = "lesson-paragraph";
        appendFormattedText(element, paragraph.join(" "));
        container.append(element);
        paragraph = [];
    };

    for (const line of lines) {
        const checklist = line.match(/^\s*(?:[-*]|•)\s+\[\s*([xX]?)\s*\]\s+(.+?)\s*$/u);
        const item = checklist || line.match(/^\s*(?:([-*])|([–—])|(\d+)[.)]|•)\s+(.+?)\s*$/u);
        if (item) {
            flushParagraph();
            const type = checklist ? "checklist" : item[2] ? "dash" : item[3] ? "number" : "bullet";
            if (!list || listType !== type) {
                list = document.createElement(type === "number" ? "ol" : "ul");
                if (type !== "number") list.className = `lesson-list-${type}`;
                container.append(list);
                listType = type;
            }
            const entry = document.createElement("li");
            if (checklist) {
                const checkbox = document.createElement("input");
                checkbox.type = "checkbox";
                checkbox.checked = checklistState[checklistIndex] ?? checklist[1].toLowerCase() === "x";
                checkbox.disabled = !onChecklistChange;
                checkbox.setAttribute("aria-label", checklist[2]);
                if (onChecklistChange) {
                    checkbox.addEventListener("change", async () => {
                        const checkboxes = [...container.querySelectorAll(".lesson-list-checklist input[type=checkbox]")];
                        const previous = !checkbox.checked;
                        checkboxes.forEach((item) => { item.disabled = true; });
                        try {
                            await onChecklistChange(checkboxes.map((item) => item.checked));
                        } catch (error) {
                            checkbox.checked = previous;
                            showMessage(`Checklist progress could not be saved: ${error.message}`, true);
                        } finally {
                            checkboxes.forEach((item) => { item.disabled = !onChecklistChange; });
                        }
                    });
                }
                entry.append(checkbox, document.createTextNode(" "));
                appendFormattedText(entry, checklist[2]);
                checklistIndex += 1;
            } else {
                appendFormattedText(entry, item[4]);
            }
            list.append(entry);
        } else if (line.trim()) {
            list = null;
            listType = "";
            paragraph.push(line.trim());
        } else {
            flushParagraph();
            list = null;
            listType = "";
        }
    }
    flushParagraph();
}

function parseChecklistState(state) {
    if (Array.isArray(state)) return state;
    if (typeof state === "string") {
        const parsed = JSON.parse(state);
        if (Array.isArray(parsed) && parsed.every((value) => typeof value === "boolean")) return parsed;
    }
    return [];
}

function saveAssignmentChecklist(assignmentId, type, state) {
    return api(`/api/modules/${moduleId}/assignments/${assignmentId}/checklist`, {
        method: "PUT",
        body: JSON.stringify({ type, state })
    });
}

function createFormatToolbar(label) {
    const toolbar = el("div", null, "format-toolbar");
    toolbar.setAttribute("role", "toolbar");
    toolbar.setAttribute("aria-label", label);
    const formats = [
        ["bold", "Bold", "B"],
        ["italic", "Italic", "I"],
        ["checklist", "Checklist", "Checklist"],
        ["bullet", "Bullet list", "Bullet list"],
        ["number", "Numbered list", "Numbered list"]
    ];
    for (const [format, title, text] of formats) {
        const button = el("button", text, "button-secondary");
        button.type = "button";
        button.dataset.format = format;
        button.setAttribute("aria-label", `${title} selected text`);
        toolbar.append(button);
    }
    return toolbar;
}

function applyTextFormat(textarea, format) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;
    if (format === "bold" || format === "italic") {
        const marker = format === "bold" ? "**" : "*";
        const selected = value.slice(start, end);
        const text = selected || (format === "bold" ? "bold text" : "italic text");
        textarea.setRangeText(`${marker}${text}${marker}`, start, end, "select");
        if (!selected) textarea.setSelectionRange(start + marker.length, start + marker.length + text.length);
        textarea.focus();
        return;
    }

    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const lineEndIndex = value.indexOf("\n", end);
    const lineEnd = lineEndIndex < 0 ? value.length : lineEndIndex;
    const lines = value.slice(lineStart, lineEnd).split("\n");
    const patterns = {
        checklist: /^\s*[-*]\s+\[[ xX]\]\s+/,
        bullet: /^\s*[-*]\s+/,
        number: /^\s*\d+[.)]\s+/
    };
    const pattern = patterns[format];
    const shouldRemove = lines.every((line) => pattern.test(line));
    const formattedLines = lines.map((line, index) => {
        if (!line.trim()) return line;
        if (shouldRemove) return line.replace(pattern, "");
        const content = line.replace(/^\s*(?:(?:[-*])|(?:\d+[.)])|(?:\[[ xX]\]))\s+/, "");
        if (format === "checklist") return `- [ ] ${content}`;
        if (format === "number") return `${index + 1}. ${content}`;
        return `- ${content}`;
    }).join("\n");
    textarea.setRangeText(formattedLines, lineStart, lineEnd, "select");
    textarea.focus();
}

document.addEventListener("click", (event) => {
    const button = event.target.closest(".format-toolbar [data-format]");
    if (!button) return;
    const textarea = button.closest("label")?.querySelector("textarea");
    if (textarea) applyTextFormat(textarea, button.dataset.format);
});

function renderLessons(lessons, module) {
    const list = document.querySelector("#lesson-list");
    list.replaceChildren();
    const objective = document.querySelector("#learning-objective");
    const content = document.querySelector("#complete-lesson-content");
    const hasCompleteContent = typeof module.lesson_content === "string" && module.lesson_content.trim().length > 0;
    renderFormattedContent(objective, module.learning_objective || "No learning objective has been added yet.");
    renderFormattedContent(content, module.lesson_content || "No complete lesson content has been added yet.");
    if (hasCompleteContent) {
        document.querySelector("#legacy-lessons-section").hidden = true;
        return;
    }
    document.querySelector("#legacy-lessons-section").hidden = false;
    if (!lessons.length) list.append(el("p", "No lessons have been added yet.", "muted"));
    lessons.forEach((lesson) => {
        const article = el("article", null, "lesson");
        article.append(el("h3", `${lesson.lesson_order}. ${lesson.title}`));
        article.append(el("p", lesson.content));
        list.append(article);
    });
}

function createIconButton(label, iconClass, className = "") {
    const button = el("button", null, className);
    button.type = "button";
    button.setAttribute("aria-label", label);
    const icon = el("i");
    icon.className = `fi ${iconClass}`;
    icon.setAttribute("aria-hidden", "true");
    button.append(icon, document.createTextNode(` ${label}`));
    return button;
}

function renderAssignments(assignments, role) {
    const list = document.querySelector("#assignment-list");
    list.replaceChildren();
    if (!assignments.length) {
        list.append(el("p", "There are no assignments for this module."));
        return;
    }

    assignments.forEach((assignment) => {
        const card = el("article", null, "assignment-card");
        card.append(el("h3", assignment.title));
        const instructions = el("div", null, "preserved-content assignment-instructions");
        const instructionsState = parseChecklistState(assignment.instructions_state);
        const responseState = parseChecklistState(assignment.response_state);
        renderFormattedContent(instructions, assignment.instructions, {
            checklistState: instructionsState,
            onChecklistChange: role === "student"
                ? (state) => saveAssignmentChecklist(assignment.id, "instructions", state)
                : null
        });
        card.append(instructions);
        if (role === "admin") {
            card.append(el("p", `${assignment.is_required ? "Required" : "Optional"}${assignment.requires_approval ? " - administrator approval required" : ""} | ${assignment.is_active ? "Active" : "Inactive"}`));
            const actions = el("div", null, "module-management-actions");
            const editButton = createIconButton("Edit", "fi-rr-edit", "button-secondary");
            editButton.addEventListener("click", () => openAssignmentEditor(assignment));
            const deleteButton = createIconButton("Delete", "fi-rr-trash", "button-danger");
            deleteButton.addEventListener("click", () => deleteAssignment(assignment, deleteButton));
            actions.append(editButton, deleteButton);
            card.append(actions);
        } else {
            if (instructions.querySelector(".lesson-list-checklist")) {
                card.append(el("p", "Click the checkboxes to track your progress. Your checklist is saved to your account; submit your response separately.", "muted checklist-help"));
            }
            const status = assignment.submission_status || "Not submitted";
            card.append(el("p", `${assignment.is_required ? "Required" : "Optional"}${assignment.requires_approval ? " - administrator approval required" : ""} | Status: ${status}`));
            if (assignment.submission_text) {
                card.append(el("strong", "Your submitted response"));
                const response = el("div", null, "preserved-content submission-response");
                renderFormattedContent(response, assignment.submission_text, {
                    checklistState: responseState,
                    onChecklistChange: (state) => saveAssignmentChecklist(assignment.id, "response", state)
                });
                card.append(response);
                if (response.querySelector(".lesson-list-checklist")) {
                    card.append(el("p", "Click the checkboxes to mark completed items. Progress is saved to your account.", "muted checklist-help"));
                }
            }
            if (assignment.admin_feedback) {
                card.append(el("strong", "Feedback"));
                const feedback = el("div", null, "preserved-content submission-response muted");
                renderFormattedContent(feedback, assignment.admin_feedback);
                card.append(feedback);
            }
            renderStudentSubmission(card, assignment);
        }
        list.append(card);
    });
}

function renderStudentSubmission(card, assignment) {
    const form = el("form", null, "submission-form");
    const label = el("label", "Your response");
    const textarea = el("textarea");
    textarea.name = "text";
    textarea.required = true;
    textarea.maxLength = 20000;
    textarea.rows = 4;
    textarea.placeholder = "Write your assignment response here";
    label.append(textarea);
    label.append(createFormatToolbar("Format your assignment response"));
    form.append(label);
    const submit = el("button", assignment.submission_status ? "Submit a replacement" : "Submit assignment");
    submit.type = "submit";
    form.append(submit);
    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        submit.disabled = true;
        try {
            const result = await api(`/api/modules/${moduleId}/assignments/${assignment.id}/submissions`, {
                method: "POST",
                body: JSON.stringify({ text: textarea.value })
            });
            moduleInfo.certificate_available = result.moduleCompleted;
            renderModuleCertificate(result.moduleCompleted);
            showMessage("Assignment submitted.");
            try {
                const updated = await api(`/api/modules/${moduleId}/assignments`);
                renderAssignments(updated.assignments, "student");
            } catch (error) {
                showMessage(`Your submission was saved, but its status could not be refreshed: ${error.message}`, true);
            }
        } catch (error) {
            showMessage(error.message, true);
            submit.disabled = false;
        }
    });
    card.append(form);
}

function renderAdminQuestions() {
    const list = document.querySelector("#admin-question-list");
    list.replaceChildren();
    if (!adminQuestions.length) {
        list.append(el("p", "Wala pang quiz questions para sa module na ito.", "muted"));
        return;
    }
    adminQuestions.forEach((question) => {
        const item = el("article", null, "module-management-item");
        item.append(el("div", `${question.question_order}. ${question.question}`, "module-management-item-title"));
        item.append(el("p", `Choices: ${question.answer_choices.join(" · ")}`, "muted"));
        item.append(el("p", `Correct answer: ${question.correct_answer}`, "muted"));
        const actions = el("div", null, "module-management-actions");
        const editButton = createIconButton("Edit", "fi-rr-edit", "button-secondary");
        editButton.addEventListener("click", () => openQuestionEditor(question));
        const deleteButton = createIconButton("Delete", "fi-rr-trash", "button-danger");
        deleteButton.addEventListener("click", () => deleteQuestion(question, deleteButton));
        actions.append(editButton, deleteButton);
        item.append(actions);
        list.append(item);
    });
}

function openQuestionEditor(question = null) {
    const form = document.querySelector("#question-editor-form");
    form.reset();
    clearDialogError(form);
    form.elements.questionId.value = question?.id || "";
    form.elements.question.value = question?.question || "";
    form.elements.answerChoices.value = question?.answer_choices.join("\n") || "";
    form.elements.correctAnswer.value = question?.correct_answer || "";
    form.elements.questionOrder.value = question?.question_order || adminQuestions.length + 1;
    document.querySelector("#question-dialog-title").textContent = question ? "Edit Quiz Question" : "Add Quiz Question";
    document.querySelector("#question-editor-dialog").showModal();
}

function openAssignmentEditor(assignment = null) {
    const form = document.querySelector("#assignment-editor-form");
    form.reset();
    clearDialogError(form);
    form.elements.assignmentId.value = assignment?.id || "";
    form.elements.title.value = assignment?.title || "";
    form.elements.instructions.value = assignment?.instructions || "";
    form.elements.isRequired.checked = assignment ? Boolean(assignment.is_required) : true;
    form.elements.requiresApproval.checked = assignment ? Boolean(assignment.requires_approval) : false;
    form.elements.isActive.checked = assignment ? Boolean(assignment.is_active) : true;
    document.querySelector("#assignment-dialog-title").textContent = assignment ? "Edit Assignment" : "Add Assignment";
    document.querySelector("#assignment-editor-dialog").showModal();
}

function clearDialogError(form) {
    const notice = form.querySelector(".dialog-message");
    notice.textContent = "";
    notice.classList.remove("notice-error");
}

function bindDialogCloseButtons() {
    document.querySelectorAll("[data-close-dialog]").forEach((button) => {
        button.addEventListener("click", () => {
            const dialog = button.closest("dialog");
            if (dialog?.dataset.saving !== "true") dialog?.close();
        });
    });
    document.querySelectorAll(".management-dialog").forEach((dialog) => {
        dialog.addEventListener("cancel", (event) => {
            if (dialog.dataset.saving === "true") event.preventDefault();
        });
    });
}

function setDialogSaving(dialog, saving) {
    if (saving) dialog.dataset.saving = "true";
    else delete dialog.dataset.saving;
    dialog.querySelectorAll("button").forEach((button) => { button.disabled = saving; });
}

function bindDialogForm(form, endpoint, payloadForData, afterSave) {
    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!form.reportValidity() || form.dataset.saving === "true") return;

        const data = new FormData(form);
        const dialog = form.closest("dialog");
        const notice = form.querySelector(".dialog-message");
        const idField = form.id === "question-editor-form" ? "questionId" : "assignmentId";
        const id = data.get(idField);
        setDialogSaving(dialog, true);
        clearDialogError(form);
        try {
            await api(endpoint(id), {
                method: id ? "PATCH" : "POST",
                body: JSON.stringify(payloadForData(data))
            });
            dialog.close();
            showMessage("Na-save ang mga pagbabago.");
            try {
                await afterSave();
            } catch (error) {
                showMessage(`Na-save ang pagbabago, pero hindi na-refresh ang listahan: ${error.message}`, true);
            }
        } catch (error) {
            notice.textContent = error.message;
            notice.classList.add("notice-error");
        } finally {
            setDialogSaving(dialog, false);
        }
    });
}

async function refreshAdminModuleData() {
    const [questionData, assignmentData] = await Promise.all([
        api(`/api/admin/modules/${moduleId}/questions`),
        api(`/api/modules/${moduleId}/assignments`)
    ]);
    adminQuestions = questionData.questions;
    renderAdminQuestions();
    renderAssignments(assignmentData.assignments, "admin");
}

function bindAdminManagement() {
    bindDialogCloseButtons();
    document.querySelector("#add-question-button").addEventListener("click", () => openQuestionEditor());
    document.querySelector("#add-assignment-button").addEventListener("click", () => openAssignmentEditor());

    bindDialogForm(
        document.querySelector("#question-editor-form"),
        (id) => id
            ? `/api/admin/questions/${id}`
            : `/api/admin/modules/${moduleId}/questions`,
        (data) => ({
            question: data.get("question"),
            answerChoices: data.get("answerChoices").split(/\r?\n/).map((choice) => choice.trim()).filter(Boolean),
            correctAnswer: data.get("correctAnswer"),
            questionOrder: Number(data.get("questionOrder"))
        }),
        refreshAdminModuleData
    );
    bindDialogForm(
        document.querySelector("#assignment-editor-form"),
        (id) => id
            ? `/api/admin/assignments/${id}`
            : `/api/admin/modules/${moduleId}/assignments`,
        (data) => ({
            title: data.get("title"),
            instructions: data.get("instructions"),
            isRequired: data.has("isRequired"),
            requiresApproval: data.has("requiresApproval"),
            isActive: data.has("isActive")
        }),
        refreshAdminModuleData
    );
}

async function deleteQuestion(question, button) {
    if (!window.confirm(`Delete quiz question ${question.question_order}?`)) return;
    button.disabled = true;
    try {
        await api(`/api/admin/questions/${question.id}`, { method: "DELETE" });
        showMessage("Quiz question deleted.");
        await refreshAdminModuleData();
    } catch (error) {
        showMessage(error.message, true);
        button.disabled = false;
    }
}

async function deleteAssignment(assignment, button) {
    if (!window.confirm(`Delete "${assignment.title}" and its submissions? This cannot be undone.`)) return;
    button.disabled = true;
    try {
        await api(`/api/admin/assignments/${assignment.id}`, { method: "DELETE" });
        showMessage("Assignment deleted.");
        await refreshAdminModuleData();
    } catch (error) {
        showMessage(error.message, true);
        button.disabled = false;
    }
}

async function openQuiz() {
    try {
        const data = await api(`/api/modules/${moduleId}/quiz`);
        quizQuestions = data.questions;
        if (!quizQuestions.length) throw new Error("This module does not have any quiz questions yet.");
        const sampleQuiz = quizQuestions.some((question) => question.question.startsWith("SAMPLE QUESTION:"));
        const quizNotice = document.querySelector("#quiz-notice");
        quizNotice.hidden = !sampleQuiz;
        quizNotice.textContent = sampleQuiz
            ? "This quiz contains sample development questions and is not the final curriculum."
            : "";
        const container = document.querySelector("#quiz-questions");
        container.replaceChildren();
        document.querySelector("#quiz-submit-result").hidden = true;
        document.querySelector("#quiz-form button[type=submit]").hidden = false;
        quizQuestions.forEach((question, index) => {
            const fieldset = el("fieldset", null, "quiz-question");
            fieldset.append(el("legend", `${index + 1}. ${question.question}`));
            question.answer_choices.forEach((choice, choiceIndex) => {
                const label = el("label", null, "choice-label");
                const input = el("input");
                input.type = "radio";
                input.name = `question-${question.id}`;
                input.value = choice;
                input.required = choiceIndex === 0;
                label.append(input, document.createTextNode(` ${choice}`));
                fieldset.append(label);
            });
            container.append(fieldset);
        });
        document.querySelector("#quiz-result").textContent = "";
        document.querySelector("#quiz-dialog").showModal();
    } catch (error) {
        showMessage(error.message, true);
    }
}

document.querySelector("#open-quiz").addEventListener("click", openQuiz);
document.querySelector("#cancel-quiz").addEventListener("click", () => document.querySelector("#quiz-dialog").close());
document.querySelector("#quiz-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const answers = quizQuestions.map((question) => ({
        questionId: question.id,
        answer: document.querySelector(`[name="question-${question.id}"]:checked`)?.value
    }));
    if (answers.some((answer) => !answer.answer)) {
        document.querySelector("#quiz-submit-result").textContent = "Please answer every question.";
        document.querySelector("#quiz-submit-result").hidden = false;
        return;
    }
    const submitButton = document.querySelector("#quiz-form button[type=submit]");
    submitButton.disabled = true;
    try {
        const result = await api(`/api/modules/${moduleId}/quiz/submit`, {
            method: "POST",
            body: JSON.stringify({ answers })
        });
        const resultMessage =
            `Score: ${result.score}/${result.totalQuestions} (${result.percentage}%). ` +
            `${result.passed ? "Passed!" : `Not passed. You need ${result.passingScore}% to pass.`}` +
            `${result.moduleCompleted ? " This module is complete and the next module is unlocked." : ""}`;
        const popupResult = document.querySelector("#quiz-submit-result");
        popupResult.textContent = resultMessage;
        popupResult.classList.toggle("notice-success", result.passed);
        popupResult.classList.toggle("notice-error", !result.passed);
        popupResult.hidden = false;
        document.querySelectorAll("#quiz-questions input").forEach((input) => { input.disabled = true; });
        submitButton.hidden = true;
        document.querySelector("#quiz-result").textContent = resultMessage;
        moduleInfo.certificate_available = result.moduleCompleted;
        renderModuleCertificate(result.moduleCompleted);
        if (result.passed) document.querySelector("#open-quiz").hidden = true;
        userResults()
            .then((history) => renderAttemptHistory(history))
            .catch((error) => showMessage(`Quiz saved, but history could not be refreshed: ${error.message}`, true));
    } catch (error) {
        const popupResult = document.querySelector("#quiz-submit-result");
        popupResult.textContent = error.message;
        popupResult.classList.remove("notice-success");
        popupResult.classList.add("notice-error");
        popupResult.hidden = false;
    } finally {
        if (!submitButton.hidden) submitButton.disabled = false;
    }
});

document.querySelector("#logout-button").addEventListener("click", async () => {
    try {
        await api("/api/auth/logout", { method: "POST" });
        window.location.assign("index.html");
    } catch (error) {
        showMessage(error.message, true);
    }
});

loadModule().catch((error) => showMessage(error.message, true));
