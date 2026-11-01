import { useWizard } from '../wizardContext';
import { colors, fieldStackStyle, labelStyle } from '../ui';
import { OptionCard } from '../components/Controls';
import { FieldError } from '../components/Controls';
import type { Mode } from '../types';

const MODES: { key: Mode; label: string; description: string }[] = [
  { key: 'online', label: 'Online', description: 'Meeting link' },
  { key: 'offline', label: 'Offline', description: 'In person at a venue' },
  { key: 'hybrid', label: 'Hybrid', description: 'Online and in person' },
];

export function BasicsStep() {
  const { draft, update, fieldErrors } = useWizard();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div style={fieldStackStyle}>
        <label htmlFor="f-title" style={labelStyle}>
          Class title
        </label>
        <input
          id="f-title"
          className="inp"
          type="text"
          placeholder="e.g. Intro to Photography"
          value={draft.title}
          onChange={(event) => update({ title: event.target.value })}
          aria-invalid={Boolean(fieldErrors.title)}
          aria-describedby={fieldErrors.title ? 'err-title' : undefined}
        />
        <FieldError id="err-title" message={fieldErrors.title} />
      </div>

      <div style={fieldStackStyle}>
        <label htmlFor="f-desc" style={labelStyle}>
          What will students learn? <span style={{ fontWeight: 500, color: colors.mutedSoft }}>(optional)</span>
        </label>
        <textarea
          id="f-desc"
          className="inp"
          rows={4}
          placeholder="A few lines about the class, who it is for, and what to bring."
          value={draft.description}
          onChange={(event) => update({ description: event.target.value })}
          style={{ resize: 'vertical' }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontWeight: 700 }} id="mode-label">
          How will it run?
        </div>
        <div role="group" aria-labelledby="mode-label" style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          {MODES.map((mode) => (
            <OptionCard
              key={mode.key}
              label={mode.label}
              description={mode.description}
              selected={draft.mode === mode.key}
              onClick={() => update({ mode: mode.key })}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
