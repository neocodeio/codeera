// main.js
// فحص حالة تسجيل الدخول
function getToken() {
    return localStorage.getItem("token") || (function(){ try { return sessionStorage.getItem("token"); } catch(_) { return null; } })();
}

function clearTokens() {
    try { localStorage.removeItem("token"); } catch(_) {}
    try { sessionStorage.removeItem("token"); } catch(_) {}
    try { localStorage.removeItem("session_persist"); } catch(_) {}
}

function checkAuth() {
    const token = getToken();
    const logoutBtn = document.getElementById("logoutBtn");
    const loginLink = document.getElementById("loginLink");
    const registerLink = document.getElementById("registerLink");
    const profileLink = document.getElementById("profileLink");
    const heroCta = document.getElementById("heroCta");
    const sessionBadge = document.getElementById("sessionBadge");

    if (!token) {
        if (logoutBtn) logoutBtn.style.display = "none";
        if (loginLink) {
            loginLink.style.display = "inline-block";
            loginLink.textContent = "سجل دخولك";
            loginLink.setAttribute("href", "login.html");
        }
        if (registerLink) registerLink.style.display = "inline-block";
        if (profileLink) profileLink.style.display = "none";
        if (heroCta) heroCta.setAttribute("href", "register.html");
    } else {
        if (logoutBtn) {
            logoutBtn.style.display = "block";
            logoutBtn.addEventListener("click", () => {
                clearTokens();
                alert("تم تسجيل الخروج");
                window.location.href = "index.html";
            });
        }
        if (loginLink) {
            loginLink.style.display = "inline-block";
            loginLink.textContent = "المستودع";
            loginLink.setAttribute("href", "dashboard.html");
        }
        if (registerLink) registerLink.style.display = "none";
        if (profileLink) profileLink.style.display = "inline-block";
        if (heroCta) heroCta.setAttribute("href", "dashboard.html");
        // session badge text
        if (sessionBadge) {
            const mode = localStorage.getItem("session_persist") === "persistent" ? "جلسة دائمة" : "جلسة مؤقتة";
            sessionBadge.textContent = mode;
            sessionBadge.style.color = localStorage.getItem("session_persist") === "persistent" ? "green" : "red";
        }
    }
}

document.addEventListener("DOMContentLoaded", checkAuth);
// Run immediately in case DOMContentLoaded already fired before this script loaded
try { checkAuth(); } catch (_) {}