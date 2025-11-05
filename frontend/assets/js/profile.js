// profile.js
function _getTokenCompat(){
    try { if (typeof getToken === 'function') return getToken(); } catch(_) {}
    try { return localStorage.getItem('token') || sessionStorage.getItem('token'); } catch(_) { return null; }
}

async function loadProfile() {
    const token = _getTokenCompat();

    if (!token) {
        alert("يجب تسجيل الدخول أولاً");
        window.location.href = "login.html";
        return;
    }

    try {
        const res = await fetch("http://localhost:5000/api/user/me", {
            headers: { "Authorization": `Bearer ${token}` }
        });

        const payload = await res.json();

        if (res.ok && payload && payload.user) {
            const u = payload.user;
            const displayNameEl = document.getElementById("displayName");
            const usernameEl = document.getElementById("username");
            const emailEl = document.getElementById("email");
            const joinedEl = document.getElementById("joinedAt");
            const editName = document.getElementById('editName');
            const editUsername = document.getElementById('editUsername');
            const editAvatar = document.getElementById('editAvatar');
            const avatarPreview = document.getElementById('avatarPreview');

            if (displayNameEl) displayNameEl.innerText = u.name || u.email || "-";
            if (usernameEl) usernameEl.innerText = u.username || "-";
            if (emailEl) emailEl.innerText = u.email || "-";
            if (joinedEl) joinedEl.innerText = u.created_at ? new Date(u.created_at).toLocaleDateString() : "-";

            if (editName) editName.value = u.name || '';
            if (editUsername) editUsername.value = u.username || '';
            if (editAvatar) editAvatar.value = u.avatar || '';
            if (avatarPreview && u.avatar) {
                avatarPreview.style.backgroundImage = `url('${u.avatar}')`;
                avatarPreview.style.backgroundSize = 'cover';
                avatarPreview.style.backgroundPosition = 'center';
                avatarPreview.textContent = '';
            }
            if (editAvatar && avatarPreview) {
                editAvatar.addEventListener('input', (e)=>{
                    const url = e.target.value.trim();
                    if (url) {
                        avatarPreview.style.backgroundImage = `url('${url}')`;
                        avatarPreview.style.backgroundSize = 'cover';
                        avatarPreview.style.backgroundPosition = 'center';
                        avatarPreview.textContent = '';
                    } else {
                        avatarPreview.style.backgroundImage = '';
                        avatarPreview.textContent = '👤';
                    }
                });
            }
        } else {
            alert((payload && payload.message) || "خطأ في جلب البيانات");
        }
    } catch (err) {
        console.error(err);
        alert("فشل الاتصال بالسيرفر.");
    }
}

async function submitProfile(e){
    e.preventDefault();
    const token = _getTokenCompat();
    if (!token) return;

    const name = document.getElementById('editName')?.value || '';
    const username = document.getElementById('editUsername')?.value || '';
    const avatar = document.getElementById('editAvatar')?.value || '';

    try {
        const res = await fetch('http://localhost:5000/api/user/me', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ name, username, avatar })
        });
        const data = await res.json();
        if (res.ok) {
            alert('تم تحديث الملف الشخصي');
            // refresh view
            await loadProfile();
        } else {
            alert(data.message || 'فشل تحديث الملف');
        }
    } catch (err) {
        console.error(err);
        alert('خطأ في الاتصال بالسيرفر.');
    }
}

document.addEventListener("DOMContentLoaded", ()=>{
    loadProfile();
    const form = document.getElementById('editProfileForm');
    if (form) form.addEventListener('submit', submitProfile);
});