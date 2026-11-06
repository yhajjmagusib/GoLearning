// The frontend is deployed separately from the API on Render.
const API_ORIGIN = "https://golearning.onrender.com";

function apiUrl(path) {
    return `${API_ORIGIN}${path}`;
}

function setButtonLoading(button, loading) {
    if (!button) return;
    button.classList.toggle("is-loading", loading);
    button.setAttribute("aria-busy", loading ? "true" : "false");
    button.disabled = loading;
}

const loadingStyle = document.createElement("style");
loadingStyle.textContent = `
    button.is-loading { cursor: wait; opacity: .7; }
    button.is-loading::after { content: "  ⏳"; }
`;
document.head.appendChild(loadingStyle);
