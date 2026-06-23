import { useEffect, useState } from 'react';
import { useApp } from '../App';
import { registerUser, updateUser } from '../api/users';
import { getBook, addCopy, retireCopy } from '../api/catalogue';

const FIELD_STYLE = {
  width: '100%', padding: '9px 12px', borderRadius: 9,
  border: '1.5px solid #e7e7ef', background: '#f8f8fc',
  fontSize: 13, color: '#16231b', outline: 'none', boxSizing: 'border-box',
  fontFamily: "'Public Sans', sans-serif",
};
const LABEL_STYLE = { fontSize: 11, fontWeight: 600, color: '#5c5e72', display: 'block', marginBottom: 5 };

const ROLE_ENUM = { student: 'STUDENT', lecturer: 'LECTURER', staff: 'LIBRARY_STAFF', admin: 'ADMIN' };

const COPY_META = {
  AVAILABLE: { label: 'Available', bg: '#dcfce7', col: '#16a34a' },
  BORROWED: { label: 'On loan', bg: '#dbeafe', col: '#1d4ed8' },
  UNDER_MAINTENANCE: { label: 'Maintenance', bg: '#fef2e2', col: '#d97706' },
  RETIRED: { label: 'Retired', bg: '#fee2e2', col: '#dc2626' },
};

export default function AdminModal() {
  const { adminModal, setAdminModal, showToast, refresh } = useApp();
  const { mode, uf = {}, editUser, copiesBook } = adminModal;

  const [password, setPassword] = useState('');
  const [tier, setTier] = useState(editUser?.tierNum || 3);
  const [busy, setBusy] = useState(false);

  // Copies management
  const [copies, setCopies] = useState(null);
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    if (mode === 'copies' && copiesBook) {
      getBook(copiesBook.id).then((b) => setCopies(b.raw?.copies || [])).catch(() => setCopies([]));
    }
  }, [mode, copiesBook]);

  function close() { setAdminModal((m) => ({ ...m, open: false })); }
  function setUf(key, val) { setAdminModal((m) => ({ ...m, uf: { ...m.uf, [key]: val } })); }

  async function handleSubmit() {
    setBusy(true);
    try {
      if (mode === 'addUser') {
        if (!uf.uname?.trim() || !uf.uemail?.trim()) throw new Error('Name and email are required');
        if ((password || '').length < 8) throw new Error('Password must be at least 8 characters');
        await registerUser({ email: uf.uemail.trim(), name: uf.uname.trim(), password, role: ROLE_ENUM[uf.urole] || 'STUDENT' });
        showToast(`${uf.uname.trim()} added as ${uf.urole}`);
      } else if (mode === 'editUser') {
        const body = { name: uf.uname?.trim(), role: ROLE_ENUM[uf.urole] || 'STUDENT' };
        if (uf.urole === 'student' || uf.urole === 'lecturer') body.tier = Number(tier);
        await updateUser(editUser.id, body);
        showToast(`${uf.uname?.trim()} updated`);
      }
      refresh();
      close();
    } catch (e) {
      showToast(e?.response?.data?.message ?? e?.message ?? 'Action failed');
    } finally {
      setBusy(false);
    }
  }

  async function doAddCopy() {
    if (!newTag.trim()) { showToast('Enter an asset tag'); return; }
    try {
      const c = await addCopy(copiesBook.id, newTag.trim());
      setCopies((prev) => [...(prev || []), c]);
      setNewTag('');
      showToast('Copy added');
      refresh();
    } catch (e) { showToast(e?.response?.data?.message ?? 'Could not add copy'); }
  }

  async function doRetire(copy) {
    try {
      await retireCopy(copy.id);
      setCopies((prev) => prev.map((c) => (c.id === copy.id ? { ...c, status: 'RETIRED' } : c)));
      showToast('Copy retired');
      refresh();
    } catch (e) { showToast(e?.response?.data?.message ?? 'Could not retire copy'); }
  }

  const title = mode === 'addUser' ? 'Add User' : mode === 'editUser' ? 'Edit User' : mode === 'copies' ? 'Manage Copies' : 'Admin';
  const isUserForm = mode === 'addUser' || mode === 'editUser';

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className="pg-pop" style={{ background: '#fff', borderRadius: 20, width: mode === 'copies' ? 520 : 440, maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 24px 60px rgba(0,0,0,.18)' }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #f0f0f8', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#16231b' }}>{title}</div>
          <button onClick={close} style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: '#f4f4f8', color: '#7c7e93', cursor: 'pointer', fontSize: 18 }}>×</button>
        </div>

        <div style={{ padding: '20px 24px' }}>
          {isUserForm && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={LABEL_STYLE}>Full name</label>
                <input style={FIELD_STYLE} value={uf.uname || ''} onChange={(e) => setUf('uname', e.target.value)} placeholder="e.g. Kavya Rajapaksa" />
              </div>
              <div>
                <label style={LABEL_STYLE}>Email {mode === 'editUser' && <span style={{ color: '#9b9db2' }}>(read-only)</span>}</label>
                <input type="email" style={{ ...FIELD_STYLE, opacity: mode === 'editUser' ? 0.6 : 1 }} disabled={mode === 'editUser'} value={uf.uemail || ''} onChange={(e) => setUf('uemail', e.target.value)} placeholder="name@iit.ac.lk" />
              </div>
              {mode === 'addUser' && (
                <div>
                  <label style={LABEL_STYLE}>Temporary password (min 8 chars)</label>
                  <input type="password" style={FIELD_STYLE} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
                </div>
              )}
              <div>
                <label style={LABEL_STYLE}>Role</label>
                <select style={{ ...FIELD_STYLE, cursor: 'pointer' }} value={uf.urole || 'student'} onChange={(e) => setUf('urole', e.target.value)}>
                  <option value="student">Student</option>
                  <option value="lecturer">Lecturer</option>
                  <option value="staff">Library Staff</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              {mode === 'editUser' && (uf.urole === 'student' || uf.urole === 'lecturer') && (
                <div>
                  <label style={LABEL_STYLE}>Tier (sets points to tier floor)</label>
                  <select style={{ ...FIELD_STYLE, cursor: 'pointer' }} value={tier} onChange={(e) => setTier(e.target.value)}>
                    {[1, 2, 3, 4, 5].map((t) => <option key={t} value={t}>Tier {t}</option>)}
                  </select>
                </div>
              )}
            </div>
          )}

          {mode === 'copies' && copiesBook && (
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#16231b', marginBottom: 16 }}>{copiesBook.title}</div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                <input style={{ ...FIELD_STYLE, fontFamily: "'IBM Plex Mono', monospace" }} value={newTag} onChange={(e) => setNewTag(e.target.value)} placeholder="New copy asset tag e.g. BK-CC-004" />
                <button onClick={doAddCopy} style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: 9, padding: '0 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>Add copy</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {copies === null && <div style={{ fontSize: 13, color: '#9b9db2' }}>Loading copies…</div>}
                {copies?.length === 0 && <div style={{ fontSize: 13, color: '#9b9db2' }}>No copies yet.</div>}
                {copies?.map((copy) => {
                  const meta = COPY_META[copy.status] || COPY_META.AVAILABLE;
                  return (
                    <div key={copy.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 10, border: '1px solid #e7e7ef', background: '#f8f8fc' }}>
                      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: '#16231b' }}>{copy.assetTag}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: meta.bg, color: meta.col }}>{meta.label}</span>
                        {copy.status !== 'RETIRED' && copy.status !== 'BORROWED' && (
                          <button onClick={() => doRetire(copy)} style={{ background: '#fff', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 7, padding: '4px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Retire</button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid #f0f0f8', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={close} style={{ padding: '9px 18px', borderRadius: 9, border: '1.5px solid #e7e7ef', background: '#fff', color: '#5c5e72', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {mode === 'copies' ? 'Done' : 'Cancel'}
          </button>
          {isUserForm && (
            <button onClick={handleSubmit} disabled={busy} style={{ padding: '9px 20px', borderRadius: 9, border: 'none', background: busy ? '#86efac' : 'linear-gradient(135deg,#16a34a,#22c55e)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: busy ? 'default' : 'pointer', boxShadow: '0 4px 14px rgba(22,163,74,.25)' }}>
              {busy ? 'Saving…' : mode === 'addUser' ? 'Add User' : 'Save Changes'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
