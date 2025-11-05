// dashboard.js (enhanced)
let codesData = [];
let filteredData = [];
let pageIndex = 0;
const PAGE_SIZE = 12;
let activeTags = new Set();
let selectedIds = new Set();

const favKey = 'codeera_favorites';
const trashKey = 'codeera_trash_v1';
const getFavs = () => {
  try { return new Set(JSON.parse(localStorage.getItem(favKey) || '[]')); } catch { return new Set(); }
};
const setFavs = (set) => localStorage.setItem(favKey, JSON.stringify(Array.from(set)));

const getTrash = () => {
  try { return JSON.parse(localStorage.getItem(trashKey) || '[]'); } catch { return []; }
};
const setTrash = (arr) => localStorage.setItem(trashKey, JSON.stringify(arr));
const addToTrash = (item) => {
  const t = getTrash();
  // avoid duplicates
  if (!t.some(x => Number(x.id) === Number(item.id))) {
    t.push({ ...item, deleted_at: Date.now() });
    setTrash(t);
  }
};
const removeFromTrash = (id) => {
  setTrash(getTrash().filter(x => Number(x.id) !== Number(id)));
};

function toast(msg, type = 'success') {
  const cont = document.getElementById('toastContainer');
  if (!cont) return;
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  cont.appendChild(t);
  setTimeout(() => { t.remove(); }, 3000);
}

function fuzzyMatch(text, query) {
  if (!query) return true;
  text = (text || '').toLowerCase();
  query = query.toLowerCase();
  // simple fuzzy: allow any chars in-between
  const pattern = query.split('').map(ch => ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*');
  try { return new RegExp(pattern).test(text); } catch { return text.includes(query); }
}

function highlight(text, query) {
  if (!query) return text;
  const esc = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(esc, 'ig');
  return (text || '').replace(re, (m) => `<mark>${m}</mark>`);
}

function buildTagChips(tags) {
  const wrap = document.getElementById('tagsFilter');
  if (!wrap) return;
  wrap.innerHTML = '';
  const all = document.createElement('span');
  all.className = `chip${activeTags.size === 0 ? ' active':''}`;
  all.textContent = 'الكل';
  all.addEventListener('click', () => { activeTags.clear(); updateAll(); });
  wrap.appendChild(all);
  // compute counts
  const counts = {};
  codesData.forEach(c => { const t = c.tag || '-'; counts[t] = (counts[t]||0)+1; });
  tags.forEach(tag => {
    const chip = document.createElement('span');
    chip.className = `chip${activeTags.has(tag) ? ' active':''}`;
    // basic icon based on tag
    const icon = document.createElement('span');
    icon.className = 'chip-dot';
    const label = document.createElement('span');
    label.textContent = ` ${tag || '-'} (${counts[tag] || 0})`;
    chip.append(icon, label);
    chip.addEventListener('click', () => {
      if (activeTags.has(tag)) activeTags.delete(tag); else activeTags.add(tag);
      updateAll();
    });
    wrap.appendChild(chip);
  });
}

function updateStats(list) {
  const total = list.length;
  const last7 = list.filter(c => c.updated_at && (Date.now() - new Date(c.updated_at).getTime()) <= 7*24*3600*1000).length;
  const tagCounts = {};
  list.forEach(c => { const t = c.tag || '-'; tagCounts[t] = (tagCounts[t]||0)+1; });
  const top = Object.entries(tagCounts).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([t,c])=>`${t} (${c})`).join(', ') || '-';
  const q = (id) => document.getElementById(id);
  if (q('statTotal')) q('statTotal').textContent = total;
  if (q('statLast7')) q('statLast7').textContent = last7;
  if (q('statTopTags')) q('statTopTags').textContent = top;
}

function makeSkeletons(count = PAGE_SIZE) {
  const sk = document.getElementById('skeletonContainer');
  if (!sk) return;
  sk.innerHTML = '';
  for (let i=0;i<count;i++) {
    const card = document.createElement('div');
    card.className = 'skeleton-card';
    card.innerHTML = `
      <div class="skeleton-line w80"></div>
      <div class="skeleton-gap"></div>
      <div class="skeleton-line w60"></div>
      <div class="skeleton-gap"></div>
      <div class="skeleton-line w40"></div>
    `;
    sk.appendChild(card);
  }
}

function renderBatch(list, append=false, queryStr='') {
  const container = document.getElementById('codesContainer');
  if (!container) return;
  if (!append) container.innerHTML = '';
  const favs = getFavs();

  const slice = list.slice(pageIndex*PAGE_SIZE, (pageIndex+1)*PAGE_SIZE);
  slice.forEach(code => {
    const card = document.createElement('div');
    card.className = 'code-card';
    const safeTitle = code.title ?? '-';
    const safeDesc = code.description || 'بدون وصف';
    const safeTag = code.tag || '-';
    const updatedAt = code.updated_at ? new Date(code.updated_at).toLocaleDateString() : '';
    const id = Number(code.id);

    const checked = selectedIds.has(id) ? 'checked' : '';
    const isFav = favs.has(id);

    card.innerHTML = `
      <div class="card-header">
        <div class="header-left" style="gap:8px;">
          <input type="checkbox" class="select-chk" data-id="${id}" ${checked} />
          <div class="titles">
            <div class="card-sub"><span class="chip"><span class="chip-dot"></span>${safeTag}</span></div>
            <h3 class="card-title" title="${safeTitle}">${highlight(safeTitle, queryStr)}</h3>
          </div>
        </div>
        <button class="btn-sm ${isFav? 'btn-primary':'btn-ghost'} fav-btn" data-id="${id}">${isFav? 'مُثبّت':'تثبيت'}</button>
      </div>
      <p class="card-desc">${highlight(safeDesc, queryStr)}</p>
      <div>
        <div class="card-meta">${updatedAt ? `آخر تحديث: ${updatedAt}` : ''}</div>
        <div class="card-actions three" style="margin-top:8px;">
          <button class="btn-sm btn-primary view-btn" data-id="${id}">عرض <i class="ri-eye-line"></i></button>
          <button class="btn-sm btn-ghost edit-btn" data-id="${id}">تعديل <i class="ri-pencil-fill"></i></button>
          <button class="btn-sm btn-ghost danger del-btn" data-id="${id}">حذف <i class="ri-delete-bin-line"></i></button>
        </div>
      </div>`;

    container.appendChild(card);
    if (checked) card.classList.add('selected');
  });

  bindCardEvents();
}

function bindCardEvents() {
  const container = document.getElementById('codesContainer');
  if (!container) return;
  container.querySelectorAll('.view-btn').forEach(btn => btn.addEventListener('click', (e)=>{
    const id = Number(e.currentTarget.getAttribute('data-id')); viewCode(id);
  }));
  container.querySelectorAll('.edit-btn').forEach(btn => btn.addEventListener('click', (e)=>{
    const id = Number(e.currentTarget.getAttribute('data-id')); editCode(id);
  }));
  container.querySelectorAll('.del-btn').forEach(btn => btn.addEventListener('click', async (e)=>{
    const id = Number(e.currentTarget.getAttribute('data-id')); await deleteCode(id);
  }));
  container.querySelectorAll('.fav-btn').forEach(btn => btn.addEventListener('click', (e)=>{
    const id = Number(e.currentTarget.getAttribute('data-id'));
    const favs = getFavs();
    if (favs.has(id)) favs.delete(id); else favs.add(id);
    setFavs(favs);
    updateAll(true);
    toast('تم تحديث المثبّتات');
  }));
  container.querySelectorAll('.select-chk').forEach(chk => chk.addEventListener('change', (e)=>{
    const id = Number(e.currentTarget.getAttribute('data-id'));
    const card = e.currentTarget.closest('.code-card');
    if (e.currentTarget.checked) { selectedIds.add(id); card?.classList.add('selected'); }
    else { selectedIds.delete(id); card?.classList.remove('selected'); }
    updateBulkBar();
  }));
}

function updateBulkBar() {
  const bulk = document.getElementById('bulkBar');
  const count = document.getElementById('selectedCount');
  const has = selectedIds.size > 0;
  if (bulk) bulk.style.display = has ? 'flex' : 'none';
  if (count) count.textContent = selectedIds.size;
}

function applyFiltersAndSearch() {
  const q = (document.getElementById('searchInput')?.value || '').trim();
  const tags = activeTags;
  const favs = getFavs();
  const trashedIds = new Set(getTrash().map(x => Number(x.id)));
  let list = codesData.filter(c => !trashedIds.has(Number(c.id)));
  // tag filter
  if (tags.size > 0) list = list.filter(c => tags.has(c.tag || '-'));
  // fuzzy search on title and description
  if (q) list = list.filter(c => fuzzyMatch(c.title||'', q) || fuzzyMatch(c.description||'', q));
  // favorites pinned to top
  list.sort((a,b)=>{
    const af = favs.has(Number(a.id)) ? 1:0;
    const bf = favs.has(Number(b.id)) ? 1:0;
    if (af !== bf) return bf - af;
    // recent first
    const at = a.updated_at ? new Date(a.updated_at).getTime() : 0;
    const bt = b.updated_at ? new Date(b.updated_at).getTime() : 0;
    return bt - at;
  });
  filteredData = list;
  updateStats(filteredData);
  return { list: filteredData, query: q };
}

function updateAll(keepPage=false) {
  const { list, query } = applyFiltersAndSearch();
  const uniqueTags = Array.from(new Set(codesData.map(c => c.tag || '-'))).filter(Boolean);
  buildTagChips(uniqueTags);
  if (!keepPage) pageIndex = 0;
  const container = document.getElementById('codesContainer');
  const skeletons = document.getElementById('skeletonContainer');
  if (container) container.innerHTML = '';
  if (skeletons) skeletons.style.display = 'none';
  if (list.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'card';
    empty.style.margin = '8px 0';
    empty.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;">
        <p class="muted" style="margin:0;">لا توجد نتائج مطابقة.</p>
        <a href="add-code.html" class="btn">إنشاء كود جديد</a>
      </div>`;
    container.appendChild(empty);
    return;
  }
  renderBatch(list, false, query);
}

function loadMoreIfNeeded() {
  const sentinel = document.getElementById('skeletonContainer');
  if (!sentinel || sentinel._ioAttached) return;
  const io = new IntersectionObserver((entries)=>{
    if (entries.some(e=>e.isIntersecting)) {
      const list = filteredData;
      if ((pageIndex+1)*PAGE_SIZE >= list.length) return;
      pageIndex++;
      makeSkeletons();
      sentinel.style.display = 'grid';
      setTimeout(()=>{
        sentinel.style.display = 'none';
        renderBatch(list, true, (document.getElementById('searchInput')?.value||'').trim());
      }, 400);
    }
  }, { rootMargin: '200px' });
  io.observe(sentinel);
  sentinel._ioAttached = true;
}

async function loadCodes() {
    const token = localStorage.getItem("token");
    if (!token) {
        alert("الرجاء تسجيل الدخول أولاً");
        window.location.href = "login.html";
        return;
    }

    try {
        const res = await fetch("http://localhost:5000/api/codes", {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Cache-Control": "no-cache"
            },
            cache: "no-store"
        });
        const data = await res.json();

        if (res.ok) {
            codesData = Array.isArray(data) ? data : [];
            updateAll();
            makeSkeletons();
            loadMoreIfNeeded();
        } else {
            toast(data.message || "فشل في تحميل الأكواد", 'error');
        }
    } catch (err) {
        console.error(err);
        toast("خطأ في الاتصال بالسيرفر.", 'error');
    }
}

function viewCode(id) {
    window.location.href = `view-code.html?id=${id}`;
}

function editCode(id) {
    window.location.href = `edit-code.html?id=${id}`;
}

async function deleteCode(id) {
    // Soft delete locally (move to trash)
    const item = codesData.find(c => Number(c.id) === Number(id));
    if (!item) return;
    if (!confirm("هل أنت متأكد أنك تريد نقل هذا الكود إلى سلة المحذوفات؟")) return;
    addToTrash(item);
    selectedIds.delete(Number(id));
    updateAll();
    updateBulkBar();
    toast("نُقل إلى سلة المحذوفات");
}

document.addEventListener("DOMContentLoaded", () => {
    loadCodes();
    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            selectedIds.clear();
            updateBulkBar();
            updateAll();
        });
    }

    const bulkBtn = document.getElementById('bulkDeleteBtn');
    if (bulkBtn) bulkBtn.addEventListener('click', async () => {
      if (selectedIds.size === 0) return;
      if (!confirm('هل تريد نقل العناصر المحددة إلى سلة المحذوفات؟')) return;
      const ids = Array.from(selectedIds);
      try {
        await Promise.all(ids.map(id => deleteCode(id)));
      } finally {
        selectedIds.clear();
        updateBulkBar();
      }
    });

    const selectAllBtn = document.getElementById('selectAllBtn');
    if (selectAllBtn) selectAllBtn.addEventListener('click', ()=>{
      const ids = filteredData.map(c => Number(c.id));
      ids.forEach(id => selectedIds.add(id));
      // reflect in UI
      document.querySelectorAll('#codesContainer .select-chk').forEach(chk => { chk.checked = true; chk.dispatchEvent(new Event('change')); });
      updateBulkBar();
    });

    const clearSelectionBtn = document.getElementById('clearSelectionBtn');
    if (clearSelectionBtn) clearSelectionBtn.addEventListener('click', ()=>{
      selectedIds.clear();
      document.querySelectorAll('#codesContainer .select-chk').forEach(chk => { chk.checked = false; chk.dispatchEvent(new Event('change')); });
      updateBulkBar();
    });

    // Trash modal events
    const trashBtn = document.getElementById('trashBtn');
    const trashModal = document.getElementById('trashModal');
    const closeTrash = document.getElementById('closeTrash');
    const trashList = document.getElementById('trashList');

    function renderTrash() {
      if (!trashList) return;
      trashList.innerHTML = '';
      const items = getTrash().sort((a,b)=> (b.deleted_at||0) - (a.deleted_at||0));
      if (items.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'card';
        empty.style.margin = '8px 0';
        empty.innerHTML = `<p class="muted">سلة المحذوفات فارغة.</p>`;
        trashList.appendChild(empty);
        return;
      }
      items.forEach(it => {
        const card = document.createElement('div');
        card.className = 'code-card';
        const date = it.deleted_at ? new Date(it.deleted_at).toLocaleDateString() : '';
        card.innerHTML = `
          <div class="card-header">
            <div class="header-left"><div class="titles"><h3 class="card-title">${it.title || '-'}</h3></div></div>
          </div>
          <p class="card-desc">${it.description || 'بدون وصف'}</p>
          <div>
            <div class="card-meta">تاريخ الحذف: ${date}</div>
            <div class="card-actions three" style="margin-top:8px;">
              <button class="btn-sm btn-primary restore" data-id="${it.id}">استعادة</button>
              <button class="btn-sm btn-ghost danger purge" data-id="${it.id}">حذف نهائي</button>
            </div>
          </div>`;
        trashList.appendChild(card);
      });
      // bind
      trashList.querySelectorAll('.restore').forEach(btn=>btn.addEventListener('click', (e)=>{
        const id = Number(e.currentTarget.getAttribute('data-id'));
        removeFromTrash(id);
        updateAll();
        renderTrash();
        toast('تمت الاستعادة');
      }));
      trashList.querySelectorAll('.purge').forEach(btn=>btn.addEventListener('click', async (e)=>{
        const id = Number(e.currentTarget.getAttribute('data-id'));
        if (!confirm('حذف نهائي؟ لا يمكن التراجع.')) return;
        try {
          const token = localStorage.getItem('token');
          await fetch(`http://localhost:5000/api/codes/${id}`, { method:'DELETE', headers:{ 'Authorization': `Bearer ${token}` } });
        } catch {}
        removeFromTrash(id);
        updateAll();
        renderTrash();
        toast('تم الحذف النهائي');
      }));
    }

    if (trashBtn && trashModal) {
      trashBtn.addEventListener('click', ()=>{ trashModal.style.display = 'block'; renderTrash(); });
    }
    if (closeTrash && trashModal) closeTrash.addEventListener('click', ()=>{ trashModal.style.display = 'none'; });
});