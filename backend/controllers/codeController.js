// backend/controllers/codeController.js
const db = require('../models/db');

// Helper: normalize incoming tags from either `tag` (string) or `tags` (array)
function normalizeTags(body) {
  if (Array.isArray(body.tags)) return body.tags;
  if (typeof body.tag === 'string' && body.tag.trim()) return [body.tag];
  return [];
}

const listSnippets = async (req, res) => {
  try {
    const userId = req.userId;
    const { query: q, tag, language, favorite, pinned, hasDescription, sort } = req.query;

    const whereParts = ["s.user_id = ?"]; const params = [userId];
    if (q) { whereParts.push("s.title LIKE ?"); params.push(`%${q}%`); }
    if (typeof language === 'string' && language.trim()) {
      const langRaw = language.trim().toLowerCase();
      const aliases = [langRaw];
      if (langRaw === 'javascript') aliases.push('js');
      else if (langRaw === 'js') aliases.push('javascript');
      else if (langRaw === 'html') aliases.push('html5');
      else if (langRaw === 'css') aliases.push('css3');

      const inPlaceholders = aliases.map(() => '?').join(',');
      whereParts.push(`(
        LOWER(s.language_name) = ?
        OR EXISTS (
          SELECT 1 FROM snippet_tags stl
          JOIN tags tl ON tl.id = stl.tag_id
          WHERE stl.snippet_id = s.id AND LOWER(tl.name) IN (${inPlaceholders})
        )
      )`);
      params.push(langRaw, ...aliases);
    }
    if (hasDescription === '1') { whereParts.push("s.description IS NOT NULL AND s.description <> ''"); }
    if (tag) {
      whereParts.push(`EXISTS (SELECT 1 FROM snippet_tags st2 JOIN tags t2 ON t2.id = st2.tag_id WHERE st2.snippet_id = s.id AND t2.name = ?)`);
      params.push(tag);
    }

    let orderClause = "COALESCE(usm.pinned,0) DESC, s.updated_at DESC";
    if (sort === 'title_asc') orderClause = 's.title ASC';
    else if (sort === 'title_desc') orderClause = 's.title DESC';

    if (favorite === '1') whereParts.push('COALESCE(usm.favorite,0) = 1');
    if (pinned === '1') whereParts.push('COALESCE(usm.pinned,0) = 1');

    const sql = `
      SELECT s.id, s.title, s.description, s.language_name, s.created_at, s.updated_at,
             COALESCE(usm.favorite,0) AS favorite, COALESCE(usm.pinned,0) AS pinned,
             (
               SELECT GROUP_CONCAT(t.name)
               FROM snippet_tags st
               JOIN tags t ON t.id = st.tag_id
               WHERE st.snippet_id = s.id
             ) AS tag_list
      FROM snippets s
      LEFT JOIN user_snippet_meta usm ON usm.user_id = ? AND usm.snippet_id = s.id
      WHERE ${whereParts.join(' AND ')}
      ORDER BY ${orderClause}`;

    const [rows] = await db.query(sql, [userId, ...params]);

    const mapped = rows.map(r => ({
      id: r.id,
      title: r.title,
      description: r.description,
      tag: (r.tag_list || '').split(',')[0] || null,
      tags: (r.tag_list || '').split(',').filter(Boolean),
      language: r.language_name || null,
      favorite: !!r.favorite,
      pinned: !!r.pinned,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));

    res.json(mapped);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update an existing snippet (title, description, code, language, tags)
const updateSnippet = async (req, res) => {
  try {
    const userId = req.userId;
    const id = req.params.id;
    const { title, description, code } = req.body;
    const language_name = req.body.language_name || req.body.language || null;
    const tags = normalizeTags(req.body);

    const [exists] = await db.query('SELECT id FROM snippets WHERE id = ? AND user_id = ?', [id, userId]);
    if (!exists.length) return res.status(404).json({ message: 'Not found or no permission' });

    await db.query(
      'UPDATE snippets SET title = ?, description = ?, code = ?, language_name = ? WHERE id = ?',
      [title, description || null, code, language_name, id]
    );

    // Replace tags
    await db.query('DELETE FROM snippet_tags WHERE snippet_id = ?', [id]);
    if (Array.isArray(tags)) {
      for (const t of tags) {
        const tag = (t || '').trim().toLowerCase();
        if (!tag) continue;
        const [exist] = await db.query('SELECT id FROM tags WHERE name = ?', [tag]);
        let tagId;
        if (exist.length) tagId = exist[0].id;
        else {
          const [ins] = await db.query('INSERT INTO tags (name) VALUES (?)', [tag]);
          tagId = ins.insertId;
        }
        await db.query('INSERT INTO snippet_tags (snippet_id, tag_id) VALUES (?, ?)', [id, tagId]);
      }
    }

    res.json({ message: 'Snippet updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete a snippet and its tag references
const deleteSnippet = async (req, res) => {
  try {
    const userId = req.userId;
    const id = req.params.id;
    const [rows] = await db.query('SELECT id FROM snippets WHERE id = ? AND user_id = ?', [id, userId]);
    if (!rows.length) return res.status(404).json({ message: 'Not found or no permission' });

    await db.query('DELETE FROM snippet_tags WHERE snippet_id = ?', [id]);
    await db.query('DELETE FROM snippets WHERE id = ?', [id]);

    res.json({ message: 'Snippet deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

const createSnippet = async (req, res) => {
  try {
    const userId = req.userId;
    const { title, description, code } = req.body;
    const language_name = req.body.language_name || req.body.language || null;
    const tags = normalizeTags(req.body);
    if (!title || !code) return res.status(400).json({ message: 'Title and code required' });

    const [result] = await db.query(
      'INSERT INTO snippets (user_id, title, description, code, language_name) VALUES (?, ?, ?, ?, ?)',
      [userId, title, description || null, code, language_name]
    );
    const snippetId = result.insertId;

    if (Array.isArray(tags)) {
      for (const t of tags) {
        const tag = (t || '').trim().toLowerCase();
        if (!tag) continue;
        const [exist] = await db.query('SELECT id FROM tags WHERE name = ?', [tag]);
        let tagId;
        if (exist.length) tagId = exist[0].id;
        else {
          const [ins] = await db.query('INSERT INTO tags (name) VALUES (?)', [tag]);
          tagId = ins.insertId;
        }
        await db.query('INSERT INTO snippet_tags (snippet_id, tag_id) VALUES (?, ?)', [snippetId, tagId]);
      }
    }

    res.json({ message: 'Snippet created', id: snippetId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

const getSnippet = async (req, res) => {
  try {
    const userId = req.userId;
    const id = req.params.id;
    const [rows] = await db.query(
      `SELECT s.id, s.user_id, s.title, s.description, s.code, s.language_name, s.created_at, s.updated_at,
              COALESCE(usm.favorite,0) AS favorite, COALESCE(usm.pinned,0) AS pinned
       FROM snippets s
       LEFT JOIN user_snippet_meta usm ON usm.user_id = ? AND usm.snippet_id = s.id
       WHERE s.id = ? AND s.user_id = ?`,
      [userId, id, userId]
    );
    if (!rows.length) return res.status(404).json({ message: 'Not found' });
    const snippet = rows[0];
    const [tagsRows] = await db.query(
      'SELECT t.name FROM tags t JOIN snippet_tags st ON st.tag_id = t.id WHERE st.snippet_id = ?',
      [id]
    );
    const tags = tagsRows.map(r => r.name);
    const firstTag = tags[0] || null;

    // Return flat object to match frontend expectations
    res.json({
      id: snippet.id,
      title: snippet.title,
      description: snippet.description,
      code: snippet.code,
      tag: firstTag,
      language: snippet.language_name || null,
      favorite: !!rows[0].favorite,
      pinned: !!rows[0].pinned,
      created_at: snippet.created_at,
      updated_at: snippet.updated_at,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

/* removed duplicate broken deleteSnippet definition */

// Toggle favorite flag for a snippet (per user)
const toggleFavorite = async (req, res) => {
  try {
    const userId = req.userId;
    const id = req.params.id;
    const { favorite } = req.body || {};
    const [rows] = await db.query('SELECT id FROM snippets WHERE id = ? AND user_id = ?', [id, userId]);
    if (!rows.length) return res.status(404).json({ message: 'Not found or no permission' });
    const fav = favorite ? 1 : 0;
    // Insert with pinned default 0 if new; on duplicate, only update favorite
    await db.query(
      'INSERT INTO user_snippet_meta (user_id, snippet_id, favorite, pinned) VALUES (?, ?, ?, 0) ON DUPLICATE KEY UPDATE favorite = VALUES(favorite)',
      [userId, id, fav]
    );
    res.json({ message: 'Favorite updated', favorite: !!fav });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Toggle pinned flag for a snippet (per user)
const togglePinned = async (req, res) => {
  try {
    const userId = req.userId;
    const id = req.params.id;
    const { pinned } = req.body || {};
    const [rows] = await db.query('SELECT id FROM snippets WHERE id = ? AND user_id = ?', [id, userId]);
    if (!rows.length) return res.status(404).json({ message: 'Not found or no permission' });
    const pin = pinned ? 1 : 0;
    // Insert with favorite default 0 if new; on duplicate, only update pinned
    await db.query(
      'INSERT INTO user_snippet_meta (user_id, snippet_id, pinned, favorite) VALUES (?, ?, ?, 0) ON DUPLICATE KEY UPDATE pinned = VALUES(pinned)',
      [userId, id, pin]
    );
    res.json({ message: 'Pinned updated', pinned: !!pin });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Tags summary for sidebar (per user)
const tagsSummary = async (req, res) => {
  try {
    const userId = req.userId;
    const [rows] = await db.query(
      `SELECT t.name AS tag, COUNT(*) AS count
       FROM snippets s
       JOIN snippet_tags st ON st.snippet_id = s.id
       JOIN tags t ON t.id = st.tag_id
       WHERE s.user_id = ?
       GROUP BY t.name
       ORDER BY COUNT(*) DESC, t.name ASC`,
      [userId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { listSnippets, createSnippet, getSnippet, updateSnippet, deleteSnippet, toggleFavorite, togglePinned, tagsSummary };