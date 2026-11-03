const message = document.querySelector("#page-message");
const moduleCache = new Map();
let currentUser;
let modules = [];
let maxLearningNotesBytes = 10 * 1024 * 1024;
let dashboardRefreshTimer;
let dashboardRefreshInProgress = false;

function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined && text !== null) node.textContent = text;
    if (className) node.className = className;
    return node;
}

async function api(url, options = {}) {
    const isFormData = options.body instanceof FormData;
    const response = await fetch(url, {
        ...options,
        cache: "no-store",
        headers: { ...(options.body && !isFormData ? { "Content-Type": "application/json" } : {}), ...options.headers }
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

function iconButton(label, iconClass, className = "") {
    const button = element("button", null, className);
    button.type = "button";
    const icon = element("i");
    icon.className = `fi ${iconClass}`;
    icon.setAttribute("aria-hidden", "true");
    button.append(icon, document.createTextNode(` ${label}`));
    button.setAttribute("aria-label", label);
    return button;
}

function closeDialog(dialog) {
    if (dialog.open) dialog.close();
}

async function loadDashboard() {
    const { user } = await api("/api/auth/me");
    currentUser = user;
    document.querySelector("#welcome-name").textContent = user.fullName;
    if (user.role === "admin") {
        document.querySelector("#dashboard-title").textContent = "Administrator dashboard";
        document.querySelector("#dashboard-intro").textContent = "Manage the course, learners, and assignment reviews.";
        document.querySelector("#admin-dashboard").hidden = false;
        await loadAdminDashboard();
    } else {
        document.querySelector("#student-dashboard").hidden = false;
        await loadStudentDashboard();
    }
}

async function loadStudentDashboard() {
    const data = await api("/api/dashboard/summary");
    modules = data.modules;
    const cards = document.querySelector("#module-cards");
    cards.replaceChildren();
    const completed = modules.filter((module) => Boolean(module.is_completed)).length;
    document.querySelector("#progress-summary").textContent = `${completed} of ${modules.length} modules completed`;
    const progressPercent = modules.length ? Math.round(completed / modules.length * 100) : 0;
    document.querySelector("#course-progress").value = progressPercent;
    document.querySelector("#course-progress-label").textContent = `${progressPercent}%`;
    if (modules.length && completed === modules.length) {
        document.querySelector("#dashboard-intro").textContent = "Congratulations - you have completed all five course modules.";
    }
    const certificateStatus = document.querySelector("#overall-certificate-status");
    const certificateDownload = document.querySelector("#overall-certificate-download");
    const hasOverallCertificate = data.overallCertificateAvailable === true;
    certificateStatus.textContent = hasOverallCertificate
        ? "Available - all five modules and their required activities are complete."
        : "Locked until all five modules and their required activities are complete.";
    certificateDownload.hidden = !hasOverallCertificate;

    for (const module of modules) {
        const card = element("article", null, "module-card");
        const status = module.is_completed ? "Completed" : module.is_unlocked ? "Available" : "Locked";
        card.append(element("span", `MODULE ${module.module_order}`, "eyebrow"));
        card.append(element("h3", module.title));
        card.append(element("p", module.description));
        card.append(element("span", status, `status-badge ${module.is_completed ? "status-complete" : module.is_unlocked ? "status-available" : "status-locked"}`));
        card.append(element("span",
            `Module reward: ${module.certificate_available ? "Available" : "Locked"}`,
            `status-badge ${module.certificate_available ? "status-available" : "status-locked"}`));
        if (module.best_score !== null) card.append(element("p", `Best quiz score: ${module.best_score}%`, "muted"));
        if (module.certificate_available) {
            const reward = element("a", null, "button button-secondary certificate-download");
            reward.href = `/api/modules/${encodeURIComponent(module.id)}/certificate`;
            reward.setAttribute("aria-label", `Download ${module.title} module reward certificate`);
            const rewardIcon = element("i");
            rewardIcon.className = "fi fi-rr-download";
            rewardIcon.setAttribute("aria-hidden", "true");
            reward.append(rewardIcon, document.createTextNode(" Download module reward"));
            card.append(reward);
        }
        const link = element("a", module.is_unlocked ? "Open module" : "Complete previous module");
        link.className = `button ${module.is_unlocked ? "" : "button-disabled"}`;
        if (module.is_unlocked) {
            link.href = `module.html?id=${encodeURIComponent(module.id)}`;
        } else {
            link.setAttribute("aria-disabled", "true");
        }
        card.append(link);
        cards.append(card);
    }
}

async function loadAdminDashboard() {
    const [summary, moduleData] = await Promise.all([
        api("/api/dashboard/summary"),
        api("/api/modules")
    ]);
    modules = moduleData.modules;
    maxLearningNotesBytes = moduleData.maxLearningNotesBytes;
    const totals = document.querySelector("#admin-totals");
    totals.replaceChildren();
    for (const [label, value] of Object.entries({
        "Students": summary.totals.students,
        "Modules": summary.totals.modules
    })) {
        const card = element("article", null, "stat-card");
        card.append(element("strong", String(value)), element("span", label));
        totals.append(card);
    }
    renderModules();
    if (!moduleCache.has("dialogsBound")) {
        setupDialogControls();
        moduleCache.set("dialogsBound", true);
    }
    bindManagementForms();
}

function scheduleDashboardRefresh() {
    if (!currentUser || document.visibilityState === "hidden") return;
    window.clearTimeout(dashboardRefreshTimer);
    dashboardRefreshTimer = window.setTimeout(async () => {
        if (dashboardRefreshInProgress || document.visibilityState === "hidden") return;
        dashboardRefreshInProgress = true;
        try {
            if (currentUser.role === "admin") {
                await loadAdminDashboard();
            } else {
                await loadStudentDashboard();
            }
        } catch (error) {
            showMessage(`Dashboard refresh failed: ${error.message}`, true);
        } finally {
            dashboardRefreshInProgress = false;
        }
    }, 250);
}

function renderModules() {
    const list = document.querySelector("#admin-module-list");
    list.replaceChildren();
    for (const module of modules) {
        const row = element("div", null, "record-row");
        const information = element("div", null, "module-row-info");
        information.append(element("strong", `${module.module_order}. ${module.title}${module.is_active ? "" : " (inactive)"}`));
        information.append(element("span", module.description, "muted"));
        information.append(element("span", module.notes_file_name
            ? `Learning notes: ${module.notes_file_name} (uploaded ${formatDate(module.notes_uploaded_at)})`
            : "No learning notes PDF uploaded.", "muted"));
        row.append(information);
        const actions = element("div", null, "module-row-actions");
        const viewButton = element("a", null, "button button-secondary");
        viewButton.href = `module.html?id=${encodeURIComponent(module.id)}`;
        viewButton.setAttribute("aria-label", `View ${module.title}`);
        const viewIcon = element("i");
        viewIcon.className = "fi fi-rr-eye";
        viewIcon.setAttribute("aria-hidden", "true");
        viewButton.append(viewIcon, document.createTextNode(" View"));
        actions.append(viewButton);
        const contentExists = typeof module.lesson_content === "string" && module.lesson_content.trim().length > 0;
        const contentButton = iconButton(contentExists ? "Edit" : "Add", contentExists ? "fi-rr-edit" : "fi-rr-plus");
        contentButton.addEventListener("click", () => openModuleContentEditor(module));
        actions.append(contentButton);
        const notesButton = iconButton(module.notes_file_name ? "Manage PDF" : "Add PDF", "fi-rr-upload", "button-secondary");
        notesButton.addEventListener("click", () => openLearningNotesDialog(module));
        actions.append(notesButton);
        const deleteButton = iconButton("Delete", "fi-rr-trash", "button-danger");
        deleteButton.addEventListener("click", async () => {
            if (!window.confirm(`Delete "${module.title}" and all related lessons, quizzes, assignments, learning notes, and progress? This cannot be undone.`)) return;
            deleteButton.disabled = true;
            try {
                await api(`/api/admin/modules/${module.id}`, { method: "DELETE" });
                showMessage("Module and related data deleted.");
                await loadAdminDashboard();
            } catch (error) {
                showMessage(error.message, true);
                deleteButton.disabled = false;
            }
        });
        actions.append(deleteButton);
        row.append(actions);
        list.append(row);
    }
}

function formatDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString();
}

function openLearningNotesDialog(module) {
    const dialog = document.querySelector("#learning-notes-dialog");
    const form = document.querySelector("#learning-notes-form");
    form.reset();
    form.elements.moduleId.value = module.id;
    form.elements.pdf.required = true;
    document.querySelector("#learning-notes-dialog-title").textContent = `${module.title} learning notes`;
    document.querySelector("#learning-notes-current").textContent = module.notes_file_name
        ? `Current PDF: ${module.notes_file_name} (uploaded ${formatDate(module.notes_uploaded_at)}). Select a new PDF to replace it.`
        : "No learning notes have been uploaded for this module yet.";
    document.querySelector("#learning-notes-limit").textContent =
        `PDF only. Maximum file size: ${(maxLearningNotesBytes / (1024 * 1024)).toFixed(1)} MB.`;
    form.querySelector(".dialog-message").textContent = "";
    form.querySelector(".dialog-message").classList.remove("notice-error");
    document.querySelector("#delete-learning-notes-button").hidden = !module.notes_file_name;
    dialog.showModal();
}

function bindLearningNotesForm() {
    const form = document.querySelector("#learning-notes-form");
    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!form.reportValidity() || form.dataset.saving === "true") return;
        const file = form.elements.pdf.files[0];
        const notice = form.querySelector(".dialog-message");
        if (file.size > maxLearningNotesBytes) {
            notice.textContent = `The PDF must be no larger than ${(maxLearningNotesBytes / (1024 * 1024)).toFixed(1)} MB.`;
            notice.classList.add("notice-error");
            return;
        }

        const dialog = form.closest("dialog");
        const submitButton = form.querySelector('button[type="submit"]');
        const closers = dialog.querySelectorAll("[data-close-dialog]");
        form.dataset.saving = "true";
        submitButton.disabled = true;
        closers.forEach((button) => { button.disabled = true; });
        notice.textContent = "";
        notice.classList.remove("notice-error");
        try {
            await api(`/api/admin/modules/${form.elements.moduleId.value}/learning-notes`, {
                method: "POST",
                body: new FormData(form)
            });
            closeDialog(dialog);
            showMessage("Learning notes PDF uploaded.");
            try {
                await loadAdminDashboard();
            } catch (error) {
                showMessage(`Learning notes were uploaded, but the module list could not refresh: ${error.message}`, true);
            }
        } catch (error) {
            notice.textContent = error.message;
            notice.classList.add("notice-error");
        } finally {
            delete form.dataset.saving;
            submitButton.disabled = false;
            closers.forEach((button) => { button.disabled = false; });
        }
    });

    document.querySelector("#delete-learning-notes-button").addEventListener("click", async (event) => {
        const button = event.currentTarget;
        const moduleId = form.elements.moduleId.value;
        const module = modules.find((item) => Number(item.id) === Number(moduleId));
        if (!module || !window.confirm(`Delete the learning notes PDF for "${module.title}"?`)) return;
        button.disabled = true;
        try {
            await api(`/api/admin/modules/${moduleId}/learning-notes`, { method: "DELETE" });
            closeDialog(form.closest("dialog"));
            showMessage("Learning notes PDF deleted.");
            try {
                await loadAdminDashboard();
            } catch (error) {
                showMessage(`Learning notes were deleted, but the module list could not refresh: ${error.message}`, true);
            }
        } catch (error) {
            showMessage(error.message, true);
            button.disabled = false;
        }
    });
}

function openModuleContentEditor(module) {
    const dialog = document.querySelector("#module-content-dialog");
    const form = document.querySelector("#module-content-form");
    const hasContent = typeof module.lesson_content === "string" && module.lesson_content.trim().length > 0;
    document.querySelector("#module-content-title").textContent = hasContent
        ? "Edit Module Lesson Content"
        : "Add Module Lesson Content";
    form.elements.moduleId.value = module.id;
    form.elements.title.value = module.title;
    form.elements.description.value = module.description || "";
    form.elements.moduleOrder.value = module.module_order;
    form.elements.passingScore.value = module.quiz_passing_score;
    form.elements.youtubeVideoUrl.value = module.youtube_video_url || "";
    form.elements.youtubeVideoUrl2.value = module.youtube_video_url_2 || "";
    updateSecondVideoField(form);
    form.elements.isActive.checked = Boolean(module.is_active);
    form.elements.learningObjective.value = module.learning_objective || "";
    form.elements.lessonContent.value = module.lesson_content || "";
    form.querySelector(".dialog-message").textContent = "";
    dialog.showModal();
}

function bindLessonFormatting() {
    const toolbar = document.querySelector("#lesson-format-toolbar");
    const editor = document.querySelector("#lesson-content-editor");

    toolbar.addEventListener("click", (event) => {
        const button = event.target.closest("[data-format]");
        if (!button) return;

        const format = button.dataset.format;
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        const value = editor.value;

        if (format === "bold") {
            const selected = value.slice(start, end);
            const text = selected || "bold text";
            const replacement = `**${text}**`;
            editor.setRangeText(replacement, start, end, "select");
            if (!selected) {
                editor.setSelectionRange(start + 2, start + 2 + text.length);
            }
        } else {
            const lineStart = start === 0 ? 0 : value.lastIndexOf("\n", start - 1) + 1;
            let lineEnd = value.indexOf("\n", end);
            if (lineEnd === -1) lineEnd = value.length;
            if (end > start && value[end - 1] === "\n") lineEnd = end - 1;
            const lines = value.slice(lineStart, lineEnd).split("\n");
            const prefix = format === "bullet" ? "- "
                : format === "dash" ? "– "
                    : "1. ";
            const replacement = lines
                .map((line) => line.trim() || lines.length === 1 ? `${prefix}${line}` : line)
                .join("\n");
            editor.setRangeText(replacement, lineStart, lineEnd, "select");
        }
        editor.focus();
    });
}

function setupDialogControls() {
    document.querySelectorAll("[data-close-dialog]").forEach((button) => {
        button.addEventListener("click", () => closeDialog(button.closest("dialog")));
    });
    document.querySelectorAll("dialog").forEach((dialog) => {
        dialog.addEventListener("cancel", (event) => {
            if (dialog.dataset.saving === "true") event.preventDefault();
        });
    });
    document.querySelectorAll("[data-open-dialog]").forEach((button) => {
        button.addEventListener("click", () => {
            const dialog = document.getElementById(button.dataset.openDialog);
            if (!dialog) return;
            const form = dialog.querySelector("form");
            if (form) {
                form.reset();
                const notice = form.querySelector(".dialog-message");
                if (notice) {
                    notice.textContent = "";
                    notice.classList.remove("notice-error");
                }
                const moduleSelect = form.querySelector('select[name="moduleId"]');
                if (moduleSelect) moduleSelect.dispatchEvent(new Event("change"));
            }
            dialog.showModal();
        });
    });
    document.querySelector("#add-module-button").addEventListener("click", () => {
        const form = document.querySelector("#add-module-form");
        form.reset();
        form.elements.moduleOrder.value = modules.reduce(
            (maximum, module) => Math.max(maximum, Number(module.module_order) || 0), 0
        ) + 1;
        form.querySelector(".dialog-message").textContent = "";
        document.querySelector("#add-module-dialog").showModal();
    });
    bindLessonFormatting();
    bindLearningNotesForm();
}

async function handleDialogSubmit(form, operation, successMessage) {
    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!form.reportValidity()) return;
        const dialog = form.closest("dialog");
        const submitButton = form.querySelector('button[type="submit"]');
        const closers = dialog.querySelectorAll("[data-close-dialog]");
        const notice = form.querySelector(".dialog-message");
        submitButton.disabled = true;
        closers.forEach((button) => { button.disabled = true; });
        dialog.dataset.saving = "true";
        if (notice) notice.textContent = "";

        try {
            await operation(new FormData(form), form);
            closeDialog(dialog);
            showMessage(successMessage);
            try {
                await loadAdminDashboard();
            } catch (error) {
                showMessage(`${successMessage} The list could not refresh: ${error.message}`, true);
            }
        } catch (error) {
            if (notice) {
                notice.textContent = error.message;
                notice.classList.add("notice-error");
            } else {
                showMessage(error.message, true);
            }
        } finally {
            delete dialog.dataset.saving;
            submitButton.disabled = false;
            closers.forEach((button) => { button.disabled = false; });
        }
    });
}

function bindManagementForms() {
    if (moduleCache.has("formsBound")) return;
    moduleCache.set("formsBound", true);
    const addModuleForm = document.querySelector("#add-module-form");
    const moduleContentForm = document.querySelector("#module-content-form");
    [addModuleForm, moduleContentForm].forEach((form) => {
        const orderInput = form.elements.moduleOrder;
        orderInput.addEventListener("input", () => updateSecondVideoField(form));
        orderInput.addEventListener("change", () => updateSecondVideoField(form));
        updateSecondVideoField(form);
    });
    handleDialogSubmit(document.querySelector("#add-module-form"), async (data) => {
        await api("/api/admin/modules", {
            method: "POST",
            body: JSON.stringify({
                title: data.get("title"),
                description: data.get("description"),
                moduleOrder: Number(data.get("moduleOrder")),
                passingScore: Number(data.get("passingScore")),
                youtubeVideoUrl: data.get("youtubeVideoUrl"),
                youtubeVideoUrl2: data.get("youtubeVideoUrl2"),
                isActive: data.has("isActive")
            })
        });
        document.querySelector("#add-module-form").reset();
        updateSecondVideoField(document.querySelector("#add-module-form"));
    }, "Module created. Add its lesson content when ready.");

    handleDialogSubmit(document.querySelector("#module-content-form"), async (data) => {
        await api(`/api/admin/modules/${data.get("moduleId")}/content`, {
            method: "PUT",
            body: JSON.stringify({
                title: data.get("title"),
                description: data.get("description"),
                moduleOrder: Number(data.get("moduleOrder")),
                passingScore: Number(data.get("passingScore")),
                youtubeVideoUrl: data.get("youtubeVideoUrl"),
                youtubeVideoUrl2: data.get("youtubeVideoUrl2"),
                isActive: data.has("isActive"),
                learningObjective: data.get("learningObjective"),
                lessonContent: data.get("lessonContent")
            })
        });
    }, "Module lesson content saved.");

}

function updateSecondVideoField(form) {
    const field = form.querySelector("[data-second-video-field]");
    const input = field.querySelector("input");
    const isModuleFive = Number(form.elements.moduleOrder.value) === 5;
    field.hidden = !isModuleFive;
    input.disabled = !isModuleFive;
}

document.querySelector("#logout-button").addEventListener("click", async () => {
    try {
        await api("/api/auth/logout", { method: "POST" });
        window.location.assign("index.html");
    } catch (error) { showMessage(error.message, true); }
});

window.addEventListener("focus", scheduleDashboardRefresh);
window.addEventListener("pageshow", (event) => {
    if (event.persisted) scheduleDashboardRefresh();
});
document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") scheduleDashboardRefresh();
});
window.setInterval(scheduleDashboardRefresh, 30000);

loadDashboard().catch((error) => showMessage(error.message, true));
