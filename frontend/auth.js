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
        const submitButton = event.submitter || authForm.querySelector('button[type="submit"]');
        if (submitButton.disabled) return;
        setButtonLoading(submitButton, true);
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
            if (!/^[^\s@]+@gmail\.com$/i.test(String(payload.email || "").trim())) {
                throw new Error("Please use a valid @gmail.com email address.");
            }
            const response = await fetch(apiUrl(`/api/auth/${isRegistration ? "register" : "login"}`), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            clearAuthForm();
            if (!response.ok) throw new Error(result.error || "Unable to sign in.");
            window.alert(isRegistration
                ? "Registration successful! You can now log in."
                : "Login successful! Welcome to GoLearning.");
            window.location.assign(isRegistration ? "login.html" : "dashboard.html");
        } catch (error) {
            clearAuthForm();
            message.textContent = error.message;
            if (!isRegistration) {
                window.alert(error.message);
            }
        } finally {
            setButtonLoading(submitButton, false);
        }
    });
}
