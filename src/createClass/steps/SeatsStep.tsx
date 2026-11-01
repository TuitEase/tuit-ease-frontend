import { useWizard } from '../wizardContext';
import { naira, parseAmount } from '../format';
import { colors, fieldStackStyle, hintStyle, labelStyle } from '../ui';
import { FeePanel, FieldError, OptionCard, OptionRow, OptionsPanel } from '../components/Controls';

export function SeatsStep() {
  const { draft, update, fieldErrors, feePreview } = useWizard();
  const isPaid = draft.kind === 'paid';
  const count = draft.sessions.length;
  const amount = parseAmount(draft.price);

  const priceHint =
    count > 1
      ? `This is the total for the whole class. Students pay ${naira(amount)} once and attend all ${count} sessions (about ${naira(amount / count)} per session). They pay exactly this amount.`
      : `This class has 1 session, so students pay ${naira(amount)} once. Add more sessions in step 2 and this becomes the total for all of them.`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontWeight: 700 }} id="seat-label">
          Seats
        </div>
        <div role="group" aria-labelledby="seat-label" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'stretch' }}>
          <OptionCard
            label="Unlimited"
            description="Anyone with the link can book"
            selected={draft.capMode === 'unlimited'}
            onClick={() => update({ capMode: 'unlimited' })}
          />
          <OptionCard
            label="Limit seats"
            description="Close booking when full"
            selected={draft.capMode === 'limited'}
            onClick={() => update({ capMode: 'limited' })}
          />
        </div>
        {draft.capMode === 'limited' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 220 }}>
            <label htmlFor="f-cap" style={{ fontSize: 14, fontWeight: 600 }}>
              Number of seats
            </label>
            <input
              id="f-cap"
              className="inp"
              type="number"
              min={1}
              value={draft.capacity}
              onChange={(event) => update({ capacity: event.target.value })}
              aria-invalid={Boolean(fieldErrors.capacity)}
              aria-describedby={fieldErrors.capacity ? 'err-cap' : undefined}
            />
            <FieldError id="err-cap" message={fieldErrors.capacity} />
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontWeight: 700 }} id="kind-label">
          Is this class free or paid?
        </div>
        <div role="group" aria-labelledby="kind-label" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'stretch' }}>
          <OptionCard
            label="Free"
            description="No payment. ₦0 for you."
            selected={draft.kind === 'free'}
            onClick={() => update({ kind: 'free' })}
          />
          <OptionCard
            label="Paid"
            description="Students pay when they book"
            selected={draft.kind === 'paid'}
            onClick={() => update({ kind: 'paid' })}
          />
        </div>
      </div>

      {!isPaid && (
        <div style={fieldStackStyle}>
          <label htmlFor="f-group" style={labelStyle}>
            WhatsApp group or channel link <span style={{ fontWeight: 500, color: colors.mutedSoft }}>(recommended)</span>
          </label>
          <input
            id="f-group"
            className="inp"
            type="url"
            placeholder="https://chat.whatsapp.com/..."
            value={draft.groupLink}
            onChange={(event) => update({ groupLink: event.target.value })}
            aria-invalid={Boolean(fieldErrors.groupLink)}
            aria-describedby={fieldErrors.groupLink ? 'err-group' : undefined}
          />
          <FieldError id="err-group" message={fieldErrors.groupLink} />
          <div style={hintStyle}>
            Free classes get one confirmation message with the date, where to join and your group link, plus an add to
            calendar button. Your group is how you reach everyone after that.
          </div>
        </div>
      )}

      {isPaid && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-start' }}>
            <div style={{ flex: '1 1 260px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label htmlFor="f-price" style={labelStyle}>
                Price for the whole class (₦)
              </label>
              <input
                id="f-price"
                className="inp"
                type="number"
                min={0}
                step={500}
                value={draft.price}
                onChange={(event) => update({ price: event.target.value })}
                aria-invalid={Boolean(fieldErrors.price)}
                aria-describedby={fieldErrors.price ? 'err-price' : undefined}
              />
              <FieldError id="err-price" message={fieldErrors.price} />
              <div style={hintStyle}>{priceHint}</div>
            </div>
            <FeePanel
              fee={feePreview.fee}
              status={feePreview.status}
              message={feePreview.message}
              onRetry={feePreview.retry}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontWeight: 700 }}>
              Extras <span style={{ fontWeight: 500, color: colors.mutedSoft }}>(optional)</span>
            </div>
            <div style={{ color: colors.muted, fontSize: 14 }}>
              Reminders are already on: seat confirmation, day before and hour before every session, and a thank-you after
              the last one.
            </div>
          </div>

          <OptionsPanel>
            <OptionRow
              label="Let students pay in 2 parts"
              description="Half now, half later. We follow up on the second payment automatically."
              checked={draft.installments}
              onChange={() => update({ installments: !draft.installments })}
            />
            <OptionRow
              label="Waiting list"
              description="When seats run out, new sign-ups wait and freed seats go to the next person."
              checked={draft.waitlist}
              onChange={() => update({ waitlist: !draft.waitlist })}
            />
            <OptionRow
              label="Ask students to confirm their seat"
              description="A reminder asks them to reply YES. No reply, and the seat is offered to someone else."
              checked={draft.confirmSeat}
              onChange={() => update({ confirmSeat: !draft.confirmSeat })}
              last
            />
          </OptionsPanel>
        </div>
      )}
    </div>
  );
}
