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
            const userName = u.name || u.email || "مستخدم";
            
            // Profile Header
            const displayNameEl = document.getElementById("displayName");
            const usernameEl = document.getElementById("username");
            const avatarInitialEl = document.getElementById("avatarInitial");
            
            if (displayNameEl) displayNameEl.innerText = userName;
            if (usernameEl) usernameEl.innerText = u.username || "user";
            if (avatarInitialEl) {
                // Get first letter of name for avatar
                avatarInitialEl.innerText = userName.charAt(0).toUpperCase();
            }
            
            // Info Cards
            const displayNameInfoEl = document.getElementById("displayNameInfo");
            const usernameInfoEl = document.getElementById("usernameInfo");
            const emailEl = document.getElementById("email");
            const joinedEl = document.getElementById("joinedAt");
            const editName = document.getElementById('editName');
            const editUsername = document.getElementById('editUsername');
            const editAvatar = document.getElementById('editAvatar');
            const avatarPreview = document.getElementById('avatarPreview');

            if (displayNameInfoEl) displayNameInfoEl.innerText = userName;
            if (usernameInfoEl) usernameInfoEl.innerText = u.username || "-";
            if (emailEl) emailEl.innerText = u.email || "-";
<<<<<<< HEAD
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
=======
            if (joinedEl) {
                const joinDate = u.created_at ? new Date(u.created_at).toLocaleDateString('ar-EG', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                }) : "-";
                joinedEl.innerText = joinDate;
            }
            
            // Calculate member days
            const memberDaysEl = document.getElementById("memberDays");
            if (memberDaysEl && u.created_at) {
                const joinDate = new Date(u.created_at);
                const today = new Date();
                const diffTime = Math.abs(today - joinDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                memberDaysEl.innerText = diffDays;
            }
            
            // Load snippets count
            loadSnippetsCount(token);
            
>>>>>>> 4452500b15866af99366c6d6822b6c49531fe9ec
        } else {
            alert((payload && payload.message) || "خطأ في جلب البيانات");
        }
    } catch (err) {
        console.error(err);
        alert("فشل الاتصال بالسيرفر.");
    }
}

<<<<<<< HEAD
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
=======
async function loadSnippetsCount(token) {
    try {
        const res = await fetch("http://localhost:5000/api/snippets", {
            headers: { "Authorization": `Bearer ${token}` }
        });
        
        const payload = await res.json();
        
        if (res.ok && payload && payload.snippets) {
            const snippets = payload.snippets;
            
            // Total snippets
            const totalSnippetsEl = document.getElementById("totalSnippets");
            if (totalSnippetsEl) {
                totalSnippetsEl.innerText = snippets.length;
            }
            
            // Total unique tags
            const totalTagsEl = document.getElementById("totalTags");
            if (totalTagsEl) {
                const uniqueTags = new Set(snippets.map(s => s.tag).filter(t => t));
                totalTagsEl.innerText = uniqueTags.size;
            }
        }
    } catch (err) {
        console.error("Error loading snippets:", err);
    }
}

document.addEventListener("DOMContentLoaded", loadProfile);
>>>>>>> 4452500b15866af99366c6d6822b6c49531fe9ec
