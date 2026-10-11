import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import AdminSidebar from '../components/AdminSidebar';
import api from '../api';
import Button from '../components/Button';

const ROLE_LABELS = { owner: 'Owner', admin: 'Admin', examiner: 'Examiner', candidate: 'Student' };

const errorMessage = (err, fallback) => {
  const detail = err.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map((d) => d.msg).join(', ');
  return fallback;
};

const signupLink = (code) => `${window.location.origin}/signup?code=${code}`;

// Organization settings for owners and admins: join codes, groups and members
function AdminOrganizationPage() {
  const { user, logout, currentMembership, refreshUser } = useAuth();
  const { theme } = useTheme();
  const [org, setOrg] = useState(null);
  const [groups, setGroups] = useState([]);
  const [members, setMembers] = useState([]);
  const [message, setMessage] = useState(null); // { text, isError }
  const [orgName, setOrgName] = useState('');
  const [newGroup, setNewGroup] = useState('');
  const [newMember, setNewMember] = useState({ email: '', role: 'examiner' });

  const isOwner = currentMembership?.role === 'owner';
  const assignableRoles = isOwner ? ['owner', 'admin', 'examiner', 'candidate'] : ['admin', 'examiner', 'candidate'];

  const load = useCallback(async () => {
    try {
      const [orgRes, groupsRes, membersRes] = await Promise.all([
        api.get('/org'), api.get('/org/groups'), api.get('/org/members'),
      ]);
      setOrg(orgRes.data);
      setOrgName(orgRes.data.name);
      setGroups(groupsRes.data);
      setMembers(membersRes.data);
    } catch (err) {
      setMessage({ text: errorMessage(err, 'Failed to load the organization'), isError: true });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Run a change, show its outcome and reload everything; resolves to whether it worked
  const act = async (request, successText) => {
    setMessage(null);
    try {
      await request();
      if (successText) setMessage({ text: successText, isError: false });
      await load();
      return true;
    } catch (err) {
      setMessage({ text: errorMessage(err, 'Something went wrong'), isError: true });
      return false;
    }
  };

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setMessage({ text: 'Copied to clipboard', isError: false });
    } catch {
      setMessage({ text: `Copy failed. The link is: ${text}`, isError: true });
    }
  };

  const renameOrg = (e) => {
    e.preventDefault();
    act(async () => {
      await api.patch('/org', { name: orgName.trim() });
      await refreshUser(); // the name shows in the sidebar and organization picker
    }, 'Organization renamed');
  };

  const createGroup = (e) => {
    e.preventDefault();
    act(() => api.post('/org/groups', { name: newGroup.trim() }), 'Group created').then((ok) => ok && setNewGroup(''));
  };

  const addMember = (e) => {
    e.preventDefault();
    act(() => api.post('/org/members', newMember), 'Member added').then((ok) => ok && setNewMember({ email: '', role: 'examiner' }));
  };

  const confirmThen = (question, request, successText) => {
    if (window.confirm(question)) act(request, successText);
  };

  const styles = {
    section: { backgroundColor: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: '10px', padding: '24px', marginBottom: '24px' },
    h2: { margin: '0 0 6px 0', color: theme.primary, fontSize: '20px' },
    hint: { margin: '0 0 16px 0', color: theme.secondary, fontSize: '14px' },
    row: { display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' },
    input: { flex: 1, minWidth: '180px', padding: '10px 14px', borderRadius: '6px', border: `1px solid ${theme.border}`, backgroundColor: theme.inputBg, color: theme.inputText, fontSize: '14px' },
    select: { padding: '8px 10px', borderRadius: '6px', border: `1px solid ${theme.border}`, backgroundColor: theme.inputBg, color: theme.inputText, fontSize: '14px' },
    code: { fontFamily: 'monospace', fontSize: '18px', letterSpacing: '3px', color: theme.text, padding: '6px 12px', border: `1px dashed ${theme.primary}`, borderRadius: '6px' },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: '14px', color: theme.text },
    th: { textAlign: 'left', padding: '10px', borderBottom: `2px solid ${theme.border}`, color: theme.secondary, fontWeight: 600 },
    td: { padding: '10px', borderBottom: `1px solid ${theme.border}`, verticalAlign: 'middle' },
    link: { background: 'none', border: 'none', color: theme.primary, cursor: 'pointer', padding: '0 8px 0 0', fontSize: '14px' },
    danger: { background: 'none', border: 'none', color: theme.danger, cursor: 'pointer', padding: 0, fontSize: '14px' },
    chip: { display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', marginRight: '6px', borderRadius: '12px', border: `1px solid ${theme.primary}`, color: theme.primary, fontSize: '12px' },
    smallButton: { width: 'auto', padding: '8px 16px', fontSize: '14px' },
  };

  const candidates = members.filter((m) => m.role === 'candidate');
  const staff = members.filter((m) => m.role !== 'candidate');

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: theme.background, fontFamily: 'Roboto, sans-serif' }}>
      <AdminSidebar user={user} onLogout={logout} />

      <div style={{ marginLeft: '70px', flex: 1, padding: '30px', overflow: 'auto' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <h1 style={{ margin: '0 0 24px 0', color: theme.primary, fontSize: '28px' }}>Organization</h1>

          {message && (
            <div style={{ marginBottom: '20px', padding: '12px 16px', borderLeft: `4px solid ${message.isError ? theme.danger : theme.success}`, color: message.isError ? theme.danger : theme.success, backgroundColor: theme.cardBg, borderRadius: '4px' }}>
              {message.text}
            </div>
          )}

          {org && (
            <div style={styles.section}>
              <h2 style={styles.h2}>Students join with this code</h2>
              <p style={styles.hint}>
                Anyone with the code can join as a student. Share the code, or a signup link that already contains it.
                Group codes below also put the student into that group.
              </p>
              <div style={{ ...styles.row, marginBottom: '20px' }}>
                <span style={styles.code}>{org.join_code}</span>
                <button style={styles.link} onClick={() => copy(signupLink(org.join_code))}>Copy signup link</button>
                <button
                  style={styles.danger}
                  onClick={() => confirmThen(
                    'Create a new join code? The current code and links will stop working.',
                    () => api.post('/org/join-code/regenerate'),
                    'New join code created',
                  )}
                >
                  New code
                </button>
              </div>
              <form style={styles.row} onSubmit={renameOrg}>
                <input style={styles.input} value={orgName} onChange={(e) => setOrgName(e.target.value)} minLength={2} required />
                <Button type="submit" style={styles.smallButton} disabled={orgName.trim() === org.name}>Rename</Button>
              </form>
            </div>
          )}

          <div style={styles.section}>
            <h2 style={styles.h2}>Groups</h2>
            <p style={styles.hint}>
              Batches, classes or hiring rounds. An exam assigned to groups is only visible to students in them;
              an exam with no groups is open to every student in the organization.
            </p>
            {groups.length > 0 && (
              <table style={{ ...styles.table, marginBottom: '16px' }}>
                <thead>
                  <tr>
                    <th style={styles.th}>Name</th>
                    <th style={styles.th}>Join code</th>
                    <th style={styles.th}>Students</th>
                    <th style={styles.th}></th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map((g) => (
                    <tr key={g.id}>
                      <td style={styles.td}>{g.name}</td>
                      <td style={styles.td}><code>{g.join_code}</code></td>
                      <td style={styles.td}>{g.member_count}</td>
                      <td style={{ ...styles.td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button style={styles.link} onClick={() => copy(signupLink(g.join_code))}>Copy link</button>
                        <button
                          style={styles.link}
                          onClick={() => confirmThen(
                            `Create a new join code for ${g.name}? The current one will stop working.`,
                            () => api.post(`/org/groups/${g.id}/join-code/regenerate`),
                            'New group code created',
                          )}
                        >
                          New code
                        </button>
                        <button
                          style={styles.danger}
                          onClick={() => confirmThen(
                            `Delete the group ${g.name}? Its students stay in the organization, and exams for only this group become open to everyone.`,
                            () => api.delete(`/org/groups/${g.id}`),
                            'Group deleted',
                          )}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <form style={styles.row} onSubmit={createGroup}>
              <input style={styles.input} value={newGroup} onChange={(e) => setNewGroup(e.target.value)} placeholder="New group name, e.g. HSC 2027 Batch A" required />
              <Button type="submit" style={styles.smallButton}>Add group</Button>
            </form>
          </div>

          <div style={styles.section}>
            <h2 style={styles.h2}>Staff</h2>
            <p style={styles.hint}>
              Examiners manage questions, exams and grading. Admins can also manage groups and members. Owners can also manage other owners.
            </p>
            <table style={{ ...styles.table, marginBottom: '16px' }}>
              <thead>
                <tr>
                  <th style={styles.th}>Email</th>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Role</th>
                  <th style={styles.th}></th>
                </tr>
              </thead>
              <tbody>
                {staff.map((m) => {
                  const locked = m.role === 'owner' && !isOwner;
                  return (
                    <tr key={m.user_id}>
                      <td style={styles.td}>{m.email}{m.user_id === user?.id ? ' (you)' : ''}</td>
                      <td style={styles.td}>{m.full_name || '-'}</td>
                      <td style={styles.td}>
                        <select
                          style={styles.select}
                          value={m.role}
                          disabled={locked}
                          onChange={(e) => act(() => api.patch(`/org/members/${m.user_id}`, { role: e.target.value }), 'Role updated')}
                        >
                          {(locked ? ['owner'] : assignableRoles).map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                        </select>
                      </td>
                      <td style={{ ...styles.td, textAlign: 'right' }}>
                        {!locked && (
                          <button
                            style={styles.danger}
                            onClick={() => confirmThen(`Remove ${m.email} from the organization?`, () => api.delete(`/org/members/${m.user_id}`), 'Member removed')}
                          >
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <form style={styles.row} onSubmit={addMember}>
              <input
                style={styles.input}
                type="email"
                value={newMember.email}
                onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                placeholder="Email of an existing account"
                required
              />
              <select style={styles.select} value={newMember.role} onChange={(e) => setNewMember({ ...newMember, role: e.target.value })}>
                {assignableRoles.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
              <Button type="submit" style={styles.smallButton}>Add</Button>
            </form>
          </div>

          <div style={styles.section}>
            <h2 style={styles.h2}>Student groups</h2>
            <p style={styles.hint}>Put students into groups. Results and removal are on the Students page.</p>
            {candidates.length === 0 ? (
              <p style={{ color: theme.secondary, margin: 0 }}>No students yet. Share the join code above.</p>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Student</th>
                    <th style={styles.th}>Groups</th>
                    <th style={styles.th}>Add to group</th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((m) => {
                    const available = groups.filter((g) => !m.groups.some((mg) => mg.id === g.id));
                    return (
                      <tr key={m.user_id}>
                        <td style={styles.td}>{m.full_name || m.email}<div style={{ color: theme.secondary, fontSize: '12px' }}>{m.full_name ? m.email : ''}</div></td>
                        <td style={styles.td}>
                          {m.groups.length === 0 ? <span style={{ color: theme.secondary }}>-</span> : m.groups.map((g) => (
                            <span key={g.id} style={styles.chip}>
                              {g.name}
                              <button
                                title={`Remove from ${g.name}`}
                                style={{ ...styles.danger, fontSize: '12px' }}
                                onClick={() => act(() => api.delete(`/org/groups/${g.id}/members/${m.user_id}`))}
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </td>
                        <td style={styles.td}>
                          {available.length > 0 && (
                            <select
                              style={styles.select}
                              value=""
                              onChange={(e) => act(() => api.post(`/org/groups/${e.target.value}/members`, { user_ids: [m.user_id] }))}
                            >
                              <option value="">Choose…</option>
                              {available.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                            </select>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminOrganizationPage;
