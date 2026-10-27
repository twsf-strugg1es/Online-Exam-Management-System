import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { LuArrowLeft, LuCopy, LuPlus, LuX } from 'react-icons/lu';
import api from '../api';
import AppShell from '../components/AppShell';
import { Alert, Button, Card, CardHeader, Field, Input, PageHeader, PageLoader, Select, Textarea, cx } from '../components/ui';
import { QUESTION_TYPE_LABELS, errorMessage } from '../utils';
import { useI18n } from '../i18n';

const CHOICE_TYPES = ['single_choice', 'multi_choice'];
const MAX_OPTIONS = 10;
const LETTERS = 'ABCDEFGHIJ';
const EMPTY = { title: '', description: '', type: 'single_choice', complexity: 'medium', max_score: '1', options: ['', '', '', ''], correct: [], tags: [] };

// Tags as chips: Enter or comma adds one, suggestions come from tags already in the bank
function TagInput({ value, onChange, suggestions }) {
  const { t } = useI18n();
  const [draft, setDraft] = useState('');
  const add = (raw) => {
    const tag = raw.trim().replace(/^#/, '').toLowerCase();
    if (tag && !value.includes(tag)) onChange([...value, tag]);
    setDraft('');
  };
  return (
    <div>
      {value.length > 0 && (
        <ul className="mb-2 flex flex-wrap gap-1.5">
          {value.map((tag) => (
            <li key={tag} className="tag gap-1 normal-case">
              #{tag}
              <button type="button" onClick={() => onChange(value.filter((x) => x !== tag))} className="-me-1 rounded p-0.5 hover:text-danger" aria-label={t('Remove {{tag}}', { tag })}>
                <LuX className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <Input
        id="tags"
        list="tag-suggestions"
        value={draft}
        placeholder={t('e.g. physics, class 9')}
        onChange={(e) => (e.target.value.endsWith(',') ? add(e.target.value.slice(0, -1)) : setDraft(e.target.value))}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(draft); } }}
        onBlur={() => draft && add(draft)}
      />
      <datalist id="tag-suggestions">
        {suggestions.filter((s) => !value.includes(s)).map((s) => <option key={s} value={s} />)}
      </datalist>
    </div>
  );
}

// Write a question (/admin-questions/new) or edit one (/admin-questions/:id/edit)
function QuestionEditorPage() {
  const { questionId } = useParams();
  const editing = Boolean(questionId);
  const navigate = useNavigate();
  const { t } = useI18n();
  const [form, setForm] = useState(editing ? null : EMPTY);
  const [locked, setLocked] = useState(null);
  const [allTags, setAllTags] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/admin/questions/')
      .then((res) => setAllTags([...new Set(res.data.flatMap((q) => q.tags || []))].sort()))
      .catch(() => setAllTags([]));
  }, []);

  useEffect(() => {
    if (!editing) return;
    // Opening another question (e.g. a fresh duplicate) reuses this page: drop the old one first
    setForm(null);
    setLocked(null);
    setError('');
    api.get(`/admin/questions/${questionId}`)
      .then(({ data }) => {
        const options = Array.isArray(data.options) ? data.options.map(String) : [];
        const correct = data.correct_answers == null ? [] : [].concat(data.correct_answers).map(String);
        setForm({
          title: data.title,
          description: data.description || '',
          type: data.type,
          complexity: data.complexity,
          max_score: String(data.max_score),
          options: options.length ? options : EMPTY.options,
          correct,
          tags: data.tags || [],
        });
        setLocked(data.edit_blocked);
      })
      .catch((err) => setError(errorMessage(err, 'Question not found')));
  }, [editing, questionId]);

  const isChoice = form && CHOICE_TYPES.includes(form.type);
  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });
  const setOption = (i, text) => {
    const options = [...form.options];
    const before = options[i];
    options[i] = text;
    // A marked answer follows its option when the text changes
    setForm({ ...form, options, correct: form.correct.map((c) => (c === before ? text : c)) });
  };
  const removeOption = (i) => setForm({ ...form, options: form.options.filter((_, j) => j !== i), correct: form.correct.filter((c) => c !== form.options[i]) });
  const toggleCorrect = (text) => {
    if (form.type === 'single_choice') return setForm({ ...form, correct: [text] });
    setForm({ ...form, correct: form.correct.includes(text) ? form.correct.filter((c) => c !== text) : [...form.correct, text] });
  };

  // The same checks the server makes, so the teacher sees them before saving
  const problem = useMemo(() => {
    if (!form) return null;
    if (!form.title.trim()) return t('Write the question.');
    if (!(Number(form.max_score) >= 1)) return t('Points must be at least 1.');
    if (!isChoice) return null;
    const options = form.options.map((o) => o.trim());
    if (options.some((o) => !o)) return t('Fill in every option or remove the empty ones.');
    if (options.length < 2) return t('Add at least two options.');
    if (new Set(options).size !== options.length) return t('Two options have the same text.');
    if (!form.correct.some((c) => options.includes(c.trim()))) return t('Mark the correct answer.');
    return null;
  }, [form, isChoice, t]);

  const save = async () => {
    setError('');
    if (problem) return setError(problem);
    setSaving(true);
    const payload = {
      title: form.title,
      description: form.description || null,
      type: form.type,
      complexity: form.complexity,
      max_score: parseInt(form.max_score, 10),
      options: isChoice ? form.options.map((o) => o.trim()) : null,
      correct_answers: isChoice ? (form.type === 'single_choice' ? form.correct[0].trim() : form.correct.map((c) => c.trim())) : null,
      tags: form.tags,
    };
    try {
      if (editing) await api.put(`/admin/questions/${questionId}`, payload);
      else await api.post('/admin/questions/', payload);
      navigate('/admin-questions');
    } catch (err) {
      setError(errorMessage(err, 'Could not save the question'));
      setSaving(false);
    }
  };

  const duplicate = async () => {
    try {
      const { data } = await api.post(`/admin/questions/${questionId}/duplicate`);
      navigate(`/admin-questions/${data.id}/edit`);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  if (!form) return <AppShell width="narrow">{error ? <Alert tone="danger">{error}</Alert> : <PageLoader />}</AppShell>;

  return (
    <AppShell width="narrow">
      <Link to="/admin-questions" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <LuArrowLeft className="h-4 w-4 rtl:-scale-x-100" /> {t('Question bank')}
      </Link>
      <PageHeader title={editing ? t('Edit question') : t('New question')} />

      {locked && (
        <Alert tone="warn" className="mb-6" title={t('Editing is closed')}>
          <p>{t(locked)}</p>
          <Button size="sm" variant="secondary" icon={LuCopy} className="mt-2" onClick={duplicate}>{t('Duplicate and edit the copy')}</Button>
        </Alert>
      )}

      <fieldset disabled={!!locked} className="min-w-0 space-y-6">
        <Card>
          <CardHeader title={t('Details')} />
          <div className="grid gap-5 p-5 sm:grid-cols-3">
            <Field label={t('Question')} htmlFor="title" className="sm:col-span-3">
              <Textarea id="title" rows={3} value={form.title} onChange={set('title')} autoFocus={!editing} />
            </Field>
            <Field label={t('Notes')} htmlFor="description" optional hint={t('Only staff see this, for example the source or how to grade it.')} className="sm:col-span-3">
              <Textarea id="description" rows={2} value={form.description} onChange={set('description')} />
            </Field>
            <Field label={t('Type')} htmlFor="type">
              <Select id="type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value, correct: e.target.value === 'single_choice' ? form.correct.slice(0, 1) : form.correct })}>
                {Object.entries(QUESTION_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{t(label)}</option>)}
              </Select>
            </Field>
            <Field label={t('Difficulty')} htmlFor="complexity">
              <Select id="complexity" value={form.complexity} onChange={set('complexity')}>
                <option value="easy">{t('Easy')}</option>
                <option value="medium">{t('Medium')}</option>
                <option value="hard">{t('Hard')}</option>
              </Select>
            </Field>
            <Field label={t('Points')} htmlFor="points">
              <Input id="points" type="number" min="1" max="100" value={form.max_score} onChange={set('max_score')} />
            </Field>
          </div>
        </Card>

        {isChoice ? (
          <Card>
            <CardHeader
              title={t('Answer options')}
              description={form.type === 'single_choice' ? t('Select the bubble of the one correct answer.') : t('Select the bubble of every correct answer.')}
            />
            <ul className="divide-y divide-line">
              {form.options.map((option, i) => {
                const correct = form.correct.includes(option) && option.trim() !== '';
                return (
                  <li key={i} className="flex items-center gap-3 px-5 py-3">
                    <label className="cursor-pointer">
                      <input
                        type={form.type === 'single_choice' ? 'radio' : 'checkbox'}
                        name="correct"
                        className="peer sr-only"
                        checked={correct}
                        disabled={!option.trim()}
                        onChange={() => toggleCorrect(option)}
                      />
                      <span className={cx('bubble peer-focus-visible:ring-2 peer-focus-visible:ring-brand/40', correct && 'bubble-filled')} aria-hidden>{LETTERS[i]}</span>
                      <span className="sr-only">{t('Option {{letter}} is correct', { letter: LETTERS[i] })}</span>
                    </label>
                    <Input value={option} onChange={(e) => setOption(i, e.target.value)} placeholder={t('Option {{letter}}', { letter: LETTERS[i] })} aria-label={t('Option {{letter}}', { letter: LETTERS[i] })} />
                    <Button variant="ghost" size="sm" icon={LuX} onClick={() => removeOption(i)} disabled={form.options.length <= 2} aria-label={t('Remove option {{letter}}', { letter: LETTERS[i] })} />
                  </li>
                );
              })}
            </ul>
            {form.options.length < MAX_OPTIONS && (
              <div className="border-t border-line px-5 py-3">
                <Button variant="ghost" size="sm" icon={LuPlus} onClick={() => setForm({ ...form, options: [...form.options, ''] })}>{t('Add option')}</Button>
              </div>
            )}
          </Card>
        ) : (
          <Alert tone="info">
            {form.type === 'text' ? t('Students type their answer. An examiner grades it.') : t('Students upload a photo of their work. An examiner grades it.')}
          </Alert>
        )}

        <Card>
          <CardHeader title={t('Tags')} description={t('Find questions by topic, chapter or class. Press Enter or type a comma after each tag.')} />
          <div className="p-5">
            <TagInput value={form.tags} onChange={(tags) => setForm({ ...form, tags })} suggestions={allTags} />
          </div>
        </Card>
      </fieldset>

      <div className="sticky bottom-0 z-10 -mx-4 mt-8 border-t border-line bg-paper px-4 py-4 sm:-mx-8 sm:px-8">
        {error && <Alert tone="danger" className="mb-3">{error}</Alert>}
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={() => navigate('/admin-questions')}>{t('Cancel')}</Button>
          <Button loading={saving} disabled={saving || !!locked} onClick={save}>{editing ? t('Save changes') : t('Add question')}</Button>
        </div>
      </div>
    </AppShell>
  );
}

export default QuestionEditorPage;
