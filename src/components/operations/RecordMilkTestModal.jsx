import { useState } from 'react';
import BaseModal from '../ui/BaseModal';
import AlertBanner from '../ui/AlertBanner';
import SubmitButton from '../auth/SubmitButton';
import CowSelect from './CowSelect';
import { dateTimeInputToIso, nowLocalDateTimeInput } from '../../lib/localDate';
import { safetyCopy as copy } from '../../i18n/safety';

// The backend's limit on a test name.
const MAX_TEST_TYPE_LENGTH = 60;
const RESULTS = [
  { value: 'PASS', label: copy.pass, hint: copy.passHint },
  { value: 'FAIL', label: copy.fail, hint: copy.failHint },
];

/** Records a residue or quality test on a cow's milk. The page saves it. */
export default function RecordMilkTestModal({ cows, initialCowId = '', cowName, onClose, onSubmit, isPending, error }) {
  const [cowId, setCowId] = useState(initialCowId ? String(initialCowId) : '');
  const [testType, setTestType] = useState(copy.testTypes[0]);
  const [result, setResult] = useState('');
  const [testedAt, setTestedAt] = useState(() => nowLocalDateTimeInput());
  const [notes, setNotes] = useState('');
  const canSave = cowId && testType.trim() && result && testedAt;
  const resultHint = RESULTS.find((option) => option.value === result)?.hint;

  const submit = (event) => {
    event.preventDefault();
    if (!canSave) return;
    onSubmit({ cowId: Number(cowId), testType: testType.trim(), result, testedAt: dateTimeInputToIso(testedAt), notes: notes.trim() || null });
  };

  return (
    <BaseModal isOpen onClose={onClose} title={copy.recordTestTitle(cowName)}>
      <form onSubmit={submit} noValidate className="space-y-4">
        {error && <AlertBanner type="danger" message={error} compact />}
        {!initialCowId && <CowSelect id="test-cow" cows={cows} value={cowId} onChange={setCowId} />}
        <div>
          <label htmlFor="test-type" className="mb-1.5 block text-field-label text-ink-muted">{copy.testType}</label>
          <input id="test-type" list="milk-test-types" value={testType} maxLength={MAX_TEST_TYPE_LENGTH} onChange={(event) => setTestType(event.target.value)} placeholder={copy.testTypePlaceholder} className="input-machined w-full text-control" required />
          <datalist id="milk-test-types">{copy.testTypes.map((type) => <option key={type} value={type} />)}</datalist>
        </div>
        <fieldset>
          <legend className="mb-1.5 block text-field-label text-ink-muted">{copy.testResult}</legend>
          <div className="grid grid-cols-2 gap-2">
            {RESULTS.map((option) => (
              <label key={option.value} className={`flex min-h-11 cursor-pointer items-center justify-center rounded-md border text-field-label transition-colors ${result === option.value ? 'border-brand bg-brand-50 text-brand-900' : 'border-ink/15 bg-card text-ink hover:border-brand/40'}`}>
                <input type="radio" name="milk-test-result" value={option.value} checked={result === option.value} onChange={() => setResult(option.value)} className="sr-only" />
                {option.label}
              </label>
            ))}
          </div>
          {resultHint && <p className="mt-1.5 text-meta text-ink-muted" role="status">{resultHint}</p>}
        </fieldset>
        <div>
          <label htmlFor="test-at" className="mb-1.5 block text-field-label text-ink-muted">{copy.testedAt}</label>
          <input id="test-at" type="datetime-local" value={testedAt} max={nowLocalDateTimeInput()} onChange={(event) => setTestedAt(event.target.value)} className="input-machined w-full text-control" required />
        </div>
        <div>
          <label htmlFor="test-notes" className="mb-1.5 block text-field-label text-ink-muted">{copy.testNotes}</label>
          <textarea id="test-notes" rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder={copy.testNotesPlaceholder} className="input-machined w-full text-control" />
        </div>
        <SubmitButton pending={isPending} pendingLabel={copy.holding} disabled={!canSave}>{copy.testSubmit}</SubmitButton>
      </form>
    </BaseModal>
  );
}
