// The frontend is deployed separately from the API on Render.
const API_ORIGIN = "https://golearning.onrender.com";

function apiUrl(path) {
    return `${API_ORIGIN}${path}`;
}
