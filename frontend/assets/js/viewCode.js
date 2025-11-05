// viewCode.js
function setLanguageClass(tag) {
    const codeEl = document.getElementById("codeSnippet");
    if (!codeEl) return;
    // Map common tags to Prism languages
    const map = {
        js: 'language-javascript',
        javascript: 'language-javascript',
        ts: 'language-typescript',
        html: 'language-markup',
        css: 'language-css',
        json: 'language-json',
        py: 'language-python',
        python: 'language-python',
        sh: 'language-bash',
        bash: 'language-bash',
        sql: 'language-sql',
    };
    const key = String(tag || '').toLowerCase();
    const lang = map[key] || 'language-markup';
    // remove any previous language- classes
    codeEl.className = codeEl.className
        .split(' ')
        .filter(c => !c.startsWith('language-'))
        .concat([lang])
        .join(' ');
}

async function loadCode() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    let token = null;
    try { token = (typeof getToken === 'function') ? getToken() : (localStorage.getItem('token') || sessionStorage.getItem('token')); } catch(_) {}

    if (!id) {
        alert("لم يتم العثور على الكود");
        window.location.href = "dashboard.html";
        return;
    }

    try {
        const res = await fetch(`http://localhost:5000/api/codes/${id}`, {
            headers: token ? { "Authorization": `Bearer ${token}` } : {}
        });

        const data = await res.json();

        if (res.ok) {
            document.getElementById("codeTitle").innerText = data.title;
            document.getElementById("codeDescription").innerText = data.description || "لا يوجد وصف";
            document.getElementById("codeTag").innerText = data.tag || '';
            const codeEl = document.getElementById("codeSnippet");
            if (codeEl) {
                codeEl.textContent = data.code || '';
                setLanguageClass(data.tag);
                try { if (window.Prism && Prism.highlightElement) Prism.highlightElement(codeEl); } catch(_) {}
            }
            // copy button
            const copyBtn = document.getElementById('copyBtn');
            if (copyBtn) copyBtn.addEventListener('click', async ()=>{
                try {
                    await navigator.clipboard.writeText(data.code || '');
                    copyBtn.textContent = 'نُسخ!';
                    setTimeout(()=> copyBtn.textContent = 'نسخ الكود', 1200);
                } catch {
                    alert('تعذر نسخ الكود');
                }
            });
        } else {
            alert(data.message || "لم يتم العثور على الكود");
        }

    } catch (err) {
        console.error(err);
        alert("فشل الاتصال بالسيرفر.");
    }
}

document.addEventListener("DOMContentLoaded", loadCode);