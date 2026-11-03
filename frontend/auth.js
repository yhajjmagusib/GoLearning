const authForm = document.querySelector("#register-form, #login-form");
const message = document.querySelector("#form-message");

if (authForm) {
    function clearAuthForm() {
        authForm.reset();
        authForm.querySelectorAll("input, textarea").forEach((field) => {
            if (field.type === "checkbox" || field.type === "radio") {
                field.checked = field.defaultChecked;
            } else {
                field.value = "";
            }
        });
    }

    clearAuthForm();
    window.addEventListener("pageshow", () => {
        clearAuthForm();
        message.textContent = "";
    });

    authForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        message.textContent = "";
        const form = new FormData(authForm);
        const isRegistration = authForm.id === "register-form";
        const password = form.get("password");

        if (isRegistration && password !== form.get("confirmPassword")) {
            message.textContent = "The passwords do not match.";
            clearAuthForm();
            return;
        }

        const payload = isRegistration
            ? { fullName: form.get("fullName"), email: form.get("email"), password }
            : { email: form.get("email"), password };

        try {
            const response = await fetch(`/api/auth/${isRegistration ? "register" : "login"}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            clearAuthForm();
            if (!response.ok) throw new Error(result.error || "Unable to sign in.");
            window.location.assign("dashboard.html");
        } catch (error) {
            clearAuthForm();
            message.textContent = error.message;
        }
    });
}
