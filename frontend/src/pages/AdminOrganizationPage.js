import React, { useState, useEffect, useCallback } from 'react';
import { LuCopy, LuRefreshCw, LuTrash2, LuPlus, LuX, LuCheck, LuLink } from 'react-icons/lu';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import AppShell from '../components/AppShell';
import { Alert, Badge, Button, Card, CardHeader, EmptyState, Input, PageHeader, PageLoader, Select, Tabs, useConfirm } from '../components/ui';
import { ROLE_LABELS, errorMessage } from '../utils';

const signupLink = (code) => `${window.location.origin}/signup?code=${code}`;

function CopyButton({ text, label = 'Copy link' }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt('Copy this link:', text);
    }
  };
  return (
    <Button variant="secondary" size="sm" icon={copied ? LuCheck : LuCopy} onClick={copy}>
      {copied ? 'Copied' : label}
    </Button>
  );
}

// Organization settings for owners and admins: join codes, groups and members
function AdminOrganizationPage() {
  const { user, currentMembership, refreshUser } = useAuth();
  const [org, setOrg] = useState(null);
  const [groups, setGroups] = useState([]);
  const [members, setMembers] = useState([]);
  const [message, setMessage] = useState(null);
  const [tab, setTab] = useState('invite');
  const [orgName, setOrgName] = useState('');
  const [newGroup, setNewGroup] = useState('');
  const [newMember, setNewMember] = useState({ email: '', role: 'examiner' });
  const [confirmDialog, confirm] = useConfirm();

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
      setMessage({ tone: 'danger', text: errorMessage(err, 'Failed to load the organization') });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Run a change, show its outcome and reload; resolves to whether it worked
  const act = async (request, successText) => {
    setMessage(null);
    try {
      await request();
      if (successText) setMessage({ tone: 'success', text: successText });
      await load();
      return true;
    } catch (err) {
      setMessage({ tone: 'danger', text: errorMessage(err) });
      return false;
    }
  };

  const confirmThen = async (options, request, successText) => {
    if (await confirm(options)) act(request, successText);
  };

  if (!org) {
    return <AppShell>{message ? <Alert tone={message.tone}>{message.text}</Alert> : <PageLoader />}</AppShell>;
  }

  const candidates = members.filter((m) => m.role === 'candidate');
  const staff = members.filter((m) => m.role !== 'candidate');

  return (
    <AppShell>
      <PageHeader title="Organization" description="Invite students, organize them into groups, and manage who can run exams." />

      {message && <Alert tone={message.tone} className="mb-6" onClose={() => setMessage(null)}>{message.text}</Alert>}

      <Tabs
        value={tab}
        onChange={setTab}
        className="mb-6"
        tabs={[
          { value: 'invite', label: 'Invite & groups', count: groups.length },
          { value: 'students', label: 'Students', count: candidates.length },
          { value: 'staff', label: 'Staff', count: staff.length },
          { value: 'settings', label: 'Settings' },
        ]}
      />

      {tab === 'invite' && (
        <div className="space-y-6">
          <Card>
            <CardHeader title="Organization join code" description="Anyone with this code can join as a student. Share the code, or the signup link that already contains it." />
            <div className="flex flex-wrap items-center gap-3 p-5">
              <span className="rounded-lg border border-dashed border-brand/50 bg-brand-soft/40 px-4 py-2 font-mono text-xl tracking-[0.25em] text-ink">
                {org.join_code}
              </span>
              <CopyButton text={signupLink(org.join_code)} />
              <Button
                variant="ghost"
                size="sm"
                icon={LuRefreshCw}
                onClick={() => confirmThen(
                  { title: 'Create a new join code?', description: 'The current code and links stop working. Students who already joined are not affected.', confirmLabel: 'New code' },
                  () => api.post('/org/join-code/regenerate'),
                  'New join code created',
                )}
              >
                New code
              </Button>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader
              title="Groups"
              description="Batches, classes or hiring rounds. Each group has its own code that also puts students into the group. Exams can be limited to groups."
            />
            {groups.length === 0 ? (
              <EmptyState title="No groups yet">Students who join with the organization code are in no group, and see exams open to everyone.</EmptyState>
            ) : (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr><th>Group</th><th>Join code</th><th className="text-right">Students</th><th /></tr>
                  </thead>
                  <tbody>
                    {groups.map((g) => (
                      <tr key={g.id}>
                        <td className="font-medium">{g.name}</td>
                        <td><span className="code-chip">{g.join_code}</span></td>
                        <td className="tabular text-right">{g.member_count}</td>
                        <td>
                          <div className="flex justify-end gap-1">
                            <CopyButton text={signupLink(g.join_code)} label="Link" />
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={LuRefreshCw}
                              aria-label="New code"
                              title="New code"
                              onClick={() => confirmThen(
                                { title: `New join code for ${g.name}?`, description: 'The current code and links for this group stop working.', confirmLabel: 'New code' },
                                () => api.post(`/org/groups/${g.id}/join-code/regenerate`),
                                'New group code created',
                              )}
                            />
                            <Button
                              variant="danger-ghost"
                              size="sm"
                              icon={LuTrash2}
                              aria-label="Delete group"
                              onClick={() => confirmThen(
                                { title: `Delete ${g.name}?`, description: 'Its students stay in the organization. Exams limited to only this group become open to everyone.', confirmLabel: 'Delete group', danger: true },
                                () => api.delete(`/org/groups/${g.id}`),
                                'Group deleted',
                              )}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <form
              className="flex gap-2 border-t border-line p-4"
              onSubmit={(e) => {
                e.preventDefault();
                act(() => api.post('/org/groups', { name: newGroup.trim() }), 'Group created').then((ok) => ok && setNewGroup(''));
              }}
            >
              <Input value={newGroup} onChange={(e) => setNewGroup(e.target.value)} placeholder="New group, e.g. HSC 2027 Batch A" required />
              <Button type="submit" icon={LuPlus}>Add</Button>
            </form>
          </Card>
        </div>
      )}

      {tab === 'students' && (
        <Card className="overflow-hidden">
          <CardHeader title="Students and their groups" description="Put students into groups so they see the right exams." />
          {candidates.length === 0 ? (
            <EmptyState icon={LuLink} title="No students yet">Share the join code from the Invite tab.</EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead><tr><th>Student</th><th>Groups</th><th className="w-48">Add to group</th></tr></thead>
                <tbody>
                  {candidates.map((m) => {
                    const available = groups.filter((g) => !m.groups.some((mg) => mg.id === g.id));
                    return (
                      <tr key={m.user_id}>
                        <td>
                          <p className="font-medium">{m.full_name || m.email}</p>
                          {m.full_name && <p className="text-xs text-muted">{m.email}</p>}
                        </td>
                        <td>
                          <div className="flex flex-wrap gap-1">
                            {m.groups.length === 0 && <span className="text-muted">—</span>}
                            {m.groups.map((g) => (
                              <Badge key={g.id} tone="brand" className="pr-1">
                                {g.name}
                                <button
                                  type="button"
                                  title={`Remove from ${g.name}`}
                                  className="rounded-full p-0.5 hover:bg-brand/20"
                                  onClick={() => act(() => api.delete(`/org/groups/${g.id}/members/${m.user_id}`))}
                                >
                                  <LuX className="h-3 w-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        </td>
                        <td>
                          {available.length > 0 && (
                            <Select
                              value=""
                              className="h-8 text-xs"
                              onChange={(e) => act(() => api.post(`/org/groups/${e.target.value}/members`, { user_ids: [m.user_id] }))}
                            >
                              <option value="">Choose a group…</option>
                              {available.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                            </Select>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {tab === 'staff' && (
        <Card className="overflow-hidden">
          <CardHeader
            title="Staff"
            description="Examiners manage questions, exams and grading. Admins can also manage students, groups and staff. Only owners can manage other owners."
          />
          <div className="overflow-x-auto">
            <table className="table">
              <thead><tr><th>Member</th><th className="w-44">Role</th><th /></tr></thead>
              <tbody>
                {staff.map((m) => {
                  const locked = m.role === 'owner' && !isOwner;
                  const isMe = m.user_id === user?.id;
                  return (
                    <tr key={m.user_id}>
                      <td>
                        <p className="font-medium">{m.full_name || m.email}{isMe && <span className="ml-2 text-xs font-normal text-muted">you</span>}</p>
                        {m.full_name && <p className="text-xs text-muted">{m.email}</p>}
                      </td>
                      <td>
                        <Select
                          value={m.role}
                          disabled={locked}
                          className="h-8 text-xs"
                          onChange={(e) => act(() => api.patch(`/org/members/${m.user_id}`, { role: e.target.value }), 'Role updated')}
                        >
                          {(locked ? ['owner'] : assignableRoles).map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                        </Select>
                      </td>
                      <td className="text-right">
                        {!locked && !isMe && (
                          <Button
                            variant="danger-ghost"
                            size="sm"
                            icon={LuTrash2}
                            aria-label="Remove"
                            onClick={() => confirmThen(
                              { title: `Remove ${m.email}?`, description: 'They lose access to this organization. Their account is kept.', confirmLabel: 'Remove', danger: true },
                              () => api.delete(`/org/members/${m.user_id}`),
                              'Member removed',
                            )}
                          />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <form
            className="flex flex-wrap gap-2 border-t border-line p-4"
            onSubmit={(e) => {
              e.preventDefault();
              act(() => api.post('/org/members', newMember), 'Member added').then((ok) => ok && setNewMember({ email: '', role: 'examiner' }));
            }}
          >
            <Input
              type="email"
              value={newMember.email}
              onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
              placeholder="Email of someone with an account"
              className="min-w-[220px] flex-1"
              required
            />
            <Select value={newMember.role} onChange={(e) => setNewMember({ ...newMember, role: e.target.value })} className="w-36">
              {assignableRoles.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </Select>
            <Button type="submit" icon={LuPlus}>Add</Button>
          </form>
        </Card>
      )}

      {tab === 'settings' && (
        <Card>
          <CardHeader title="Organization name" description="Shown to your staff and students." />
          <form
            className="flex gap-2 p-5"
            onSubmit={(e) => {
              e.preventDefault();
              act(async () => {
                await api.patch('/org', { name: orgName.trim() });
                await refreshUser(); // the name shows in the sidebar and organization picker
              }, 'Organization renamed');
            }}
          >
            <Input value={orgName} onChange={(e) => setOrgName(e.target.value)} minLength={2} required />
            <Button type="submit" disabled={orgName.trim() === org.name}>Save</Button>
          </form>
        </Card>
      )}
      {confirmDialog}
    </AppShell>
  );
}

export default AdminOrganizationPage;
