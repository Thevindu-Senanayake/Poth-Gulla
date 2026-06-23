import { useApp } from '../App';
import { createBooking } from '../api/bookings';

function QRGrid({ cells }) {
  const size = 11;
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${size}, 1fr)`,
      width: 200,
      height: 200,
      border: '6px solid #0c2a1a',
      borderRadius: 10,
      overflow: 'hidden',
      background: '#fff',
    }}>
      {cells.map((cell, i) => (
        <div key={i} style={{ background: cell.bg }} />
      ))}
    </div>
  );
}

function DatePicker({ label, value, onChange }) {
  return (
    <div style={{ flex: 1 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#7c7e93', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 }}>
        {label}
      </label>
      <input
        type="date"
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          width: '100%',
          border: '1.5px solid #e7e7ef',
          borderRadius: 8,
          padding: '9px 12px',
          fontSize: 13,
          fontFamily: "'IBM Plex Mono', monospace",
          color: '#1a1b2e',
          outline: 'none',
          boxSizing: 'border-box',
          background: '#f8f8fc',
        }}
      />
    </div>
  );
}

function CoverIcon({ resource }) {
  if (!resource) return null;
  const paths = (resource.iconPath || '').split('M').filter(Boolean);
  return (
    <div style={{
      width: 54,
      height: 66,
      background: resource.color || '#15803d',
      borderRadius: 8,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    }}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {paths.map((d, j) => <path key={j} d={'M' + d} />)}
      </svg>
    </div>
  );
}

export default function BookingModal() {
  const { bookingModal, setBookingModal, setPage, qrCells, showToast, refresh } = useApp();
  const { stage, resource, bookDate, bookReturn, msg = '', loanToken, busy } = bookingModal;

  function close() {
    setBookingModal(prev => ({ ...prev, open: false }));
  }

  function setStage(s) {
    setBookingModal(prev => ({ ...prev, stage: s }));
  }

  function setDate(field, val) {
    setBookingModal(prev => ({ ...prev, [field]: val }));
  }

  function setMsg(val) {
    setBookingModal(prev => ({ ...prev, msg: val }));
  }

  // Build a valid ISO window, clamped to the backend's per-type duration caps
  // (BOOK ≤ 14d, DEVICE ≤ 7d, ROOM ≤ 4h — see server domain.constants.ts).
  function buildWindow() {
    const start = new Date(`${bookDate}T09:00:00`);
    const type = resource?.type;
    let end;
    if (type === 'room') {
      end = new Date(start.getTime() + 2 * 60 * 60 * 1000); // 2h slot
    } else {
      const capDays = type === 'device' ? 7 : 14;
      end = new Date(`${bookReturn}T09:00:00`);
      const maxEnd = new Date(start.getTime() + capDays * 24 * 60 * 60 * 1000);
      if (end <= start || end > maxEnd) end = maxEnd;
    }
    return { startAt: start.toISOString(), endAt: end.toISOString() };
  }

  // Single submit — backend decides APPROVED | PENDING | WAITLIST and we branch on the result.
  async function submitBooking() {
    if (busy) return;
    setBookingModal(prev => ({ ...prev, busy: true }));
    try {
      const { startAt, endAt } = buildWindow();
      const booking = await createBooking({
        resourceType: (resource?.type || 'book').toUpperCase(),
        resourceId: resource?.id,
        startAt, endAt,
        message: msg?.trim() || undefined,
      });
      refresh();
      const next = booking.status === 'APPROVED' ? 'qr' : booking.status === 'PENDING' ? 'pending' : 'done';
      setBookingModal(prev => ({ ...prev, busy: false, stage: next, loanToken: booking.qrToken || prev.loanToken }));
    } catch (e) {
      setBookingModal(prev => ({ ...prev, busy: false }));
      showToast(e?.response?.data?.message ?? 'Booking failed');
    }
  }

  const Overlay = ({ children }) => (
    <div
      onClick={close}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(6,24,15,0.58)',
        backdropFilter: 'blur(6px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#fff',
        borderRadius: 18,
        width: 480,
        maxWidth: '96vw',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 24px 60px rgba(6,24,15,0.22)',
      }}>
        {children}
      </div>
    </div>
  );

  const ModalHeader = ({ title, onClose }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px 16px', borderBottom: '1px solid #f0f0f6' }}>
      <h2 style={{ fontFamily: "'Spectral', serif", fontSize: 18, fontWeight: 700, color: '#1a1b2e', margin: 0 }}>{title}</h2>
      <button onClick={onClose || close} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9b9db2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );

  const BtnRow = ({ children }) => (
    <div style={{ display: 'flex', gap: 10, padding: '16px 24px 22px' }}>
      {children}
    </div>
  );

  const CancelBtn = ({ onClick }) => (
    <button onClick={onClick || close} style={{
      flex: 1,
      background: '#f0f0f6',
      color: '#3a3b4e',
      border: 'none',
      borderRadius: 9,
      padding: '11px',
      fontSize: 13,
      fontWeight: 700,
      cursor: 'pointer',
    }}>
      Cancel
    </button>
  );

  const PrimaryBtn = ({ onClick, children }) => (
    <button onClick={onClick} style={{
      flex: 1,
      background: '#16a34a',
      color: '#fff',
      border: 'none',
      borderRadius: 9,
      padding: '11px',
      fontSize: 13,
      fontWeight: 700,
      cursor: 'pointer',
    }}>
      {children}
    </button>
  );

  /* ── Stage: booking ── */
  if (stage === 'booking') return (
    <Overlay>
      <ModalHeader title="Book resource" />
      <div style={{ padding: '18px 24px' }}>
        <div style={{ display: 'flex', gap: 14, marginBottom: 20 }}>
          <CoverIcon resource={resource} />
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1b2e', marginBottom: 3 }}>{resource?.title}</div>
            <div style={{ fontSize: 12, color: '#7c7e93' }}>{resource?.author}</div>
            <div style={{ fontSize: 11, color: '#9b9db2', marginTop: 2 }}>{resource?.cat}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <DatePicker label="Pickup date" value={bookDate} onChange={v => setDate('bookDate', v)} />
          <DatePicker label="Return date" value={bookReturn} onChange={v => setDate('bookReturn', v)} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#7c7e93', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 }}>
            Justification (optional)
          </label>
          <textarea
            placeholder="Why do you need this resource?"
            value={msg}
            onChange={e => setMsg(e.target.value)}
            style={{
              width: '100%',
              border: '1.5px solid #e7e7ef',
              borderRadius: 8,
              padding: '9px 12px',
              fontSize: 13,
              color: '#1a1b2e',
              fontFamily: "'Public Sans', sans-serif",
              resize: 'vertical',
              minHeight: 72,
              outline: 'none',
              boxSizing: 'border-box',
              background: '#f8f8fc',
            }}
          />
        </div>

        <div style={{
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: 8,
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 4,
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }} />
          <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}>Available now · Pick up at front desk</span>
        </div>
      </div>
      <BtnRow>
        <CancelBtn />
        <PrimaryBtn onClick={submitBooking}>{busy ? 'Booking…' : 'Confirm booking'}</PrimaryBtn>
      </BtnRow>
    </Overlay>
  );

  /* ── Stage: approval ── */
  if (stage === 'approval') return (
    <Overlay>
      <ModalHeader title="Submit for approval" />
      <div style={{ padding: '18px 24px' }}>
        <div style={{
          background: '#fefce8',
          border: '1px solid #fde68a',
          borderRadius: 10,
          padding: '14px 16px',
          display: 'flex',
          gap: 12,
          marginBottom: 18,
          alignItems: 'flex-start',
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <path d="M12 9v4M12 17h.01" />
          </svg>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#92400e', marginBottom: 4 }}>High-value device · Approval required</div>
            <div style={{ fontSize: 12, color: '#b45309', lineHeight: 1.5 }}>
              This device requires Tier 4 or above, or explicit admin approval. Your request will be reviewed by a staff member.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 14, marginBottom: 18 }}>
          <CoverIcon resource={resource} />
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1b2e', marginBottom: 3 }}>{resource?.title}</div>
            <div style={{ fontSize: 12, color: '#7c7e93' }}>{resource?.author}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 4 }}>
          <DatePicker label="Pickup date" value={bookDate} onChange={v => setDate('bookDate', v)} />
          <DatePicker label="Return date" value={bookReturn} onChange={v => setDate('bookReturn', v)} />
        </div>
      </div>
      <BtnRow>
        <CancelBtn />
        <button onClick={submitBooking} style={{
          flex: 1,
          background: '#d97706',
          color: '#fff',
          border: 'none',
          borderRadius: 9,
          padding: '11px',
          fontSize: 13,
          fontWeight: 700,
          cursor: 'pointer',
        }}>
          {busy ? 'Submitting…' : 'Submit for approval'}
        </button>
      </BtnRow>
    </Overlay>
  );

  /* ── Stage: waitlist ── */
  if (stage === 'waitlist') return (
    <Overlay>
      <ModalHeader title="Join waitlist" />
      <div style={{ padding: '18px 24px' }}>
        <div style={{
          background: '#fdf2f8',
          border: '1px solid #fbcfe8',
          borderRadius: 10,
          padding: '14px 16px',
          display: 'flex',
          gap: 12,
          marginBottom: 18,
          alignItems: 'flex-start',
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#db2777" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
            <path d="M4 7h16M4 12h16M4 17h10" />
          </svg>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#9d174d', marginBottom: 4 }}>All copies currently on loan</div>
            <div style={{ fontSize: 12, color: '#be185d', lineHeight: 1.5 }}>
              You can join the waitlist. Add a justification message to improve your priority score — staff may promote you ahead of the queue.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 14, marginBottom: 18 }}>
          <CoverIcon resource={resource} />
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1b2e', marginBottom: 3 }}>{resource?.title}</div>
            <div style={{ fontSize: 12, color: '#7c7e93' }}>{resource?.author}</div>
          </div>
        </div>

        <div style={{ marginBottom: 4 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#7c7e93', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 }}>
            Justification message (recommended)
          </label>
          <textarea
            placeholder="Explain why you need this resource. A strong message may boost your waitlist position."
            value={msg}
            onChange={e => setMsg(e.target.value)}
            style={{
              width: '100%',
              border: '1.5px solid #e7e7ef',
              borderRadius: 8,
              padding: '9px 12px',
              fontSize: 13,
              color: '#1a1b2e',
              fontFamily: "'Public Sans', sans-serif",
              resize: 'vertical',
              minHeight: 88,
              outline: 'none',
              boxSizing: 'border-box',
              background: '#f8f8fc',
            }}
          />
        </div>
      </div>
      <BtnRow>
        <CancelBtn />
        <button onClick={submitBooking} style={{
          flex: 1,
          background: '#db2777',
          color: '#fff',
          border: 'none',
          borderRadius: 9,
          padding: '11px',
          fontSize: 13,
          fontWeight: 700,
          cursor: 'pointer',
        }}>
          {busy ? 'Joining…' : 'Join waitlist'}
        </button>
      </BtnRow>
    </Overlay>
  );

  /* ── Stage: qr ── */
  if (stage === 'qr') return (
    <Overlay>
      <ModalHeader title="Booking confirmed" />
      <div style={{ padding: '18px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{
          background: '#dcfce7',
          border: '1px solid #bbf7d0',
          borderRadius: 20,
          padding: '5px 14px',
          fontSize: 12,
          fontWeight: 700,
          color: '#16a34a',
          marginBottom: 14,
          letterSpacing: 0.3,
        }}>
          Booking confirmed
        </div>

        <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1b2e', marginBottom: 4, textAlign: 'center' }}>{resource?.title}</div>
        <div style={{ fontSize: 12, color: '#7c7e93', marginBottom: 20 }}>Show this QR at the collection desk</div>

        <QRGrid cells={qrCells} />

        <div style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 14,
          fontWeight: 700,
          color: '#0c2a1a',
          letterSpacing: 2,
          marginTop: 16,
          marginBottom: 20,
          wordBreak: 'break-all',
          textAlign: 'center',
          maxWidth: 280,
        }}>
          {loanToken || '—'}
        </div>

        <div style={{
          display: 'flex',
          gap: 12,
          fontSize: 12,
          color: '#7c7e93',
          marginBottom: 4,
          textAlign: 'center',
        }}>
          <span>{bookDate} → {bookReturn}</span>
        </div>
      </div>
      <BtnRow>
        <button onClick={() => { setPage('mybookings'); close(); }} style={{
          flex: 1,
          background: '#16a34a',
          color: '#fff',
          border: 'none',
          borderRadius: 9,
          padding: '11px',
          fontSize: 13,
          fontWeight: 700,
          cursor: 'pointer',
        }}>
          View my bookings
        </button>
        <button onClick={close} style={{
          flex: 1,
          background: '#f0f0f6',
          color: '#3a3b4e',
          border: 'none',
          borderRadius: 9,
          padding: '11px',
          fontSize: 13,
          fontWeight: 700,
          cursor: 'pointer',
        }}>
          Close
        </button>
      </BtnRow>
    </Overlay>
  );

  /* ── Stage: pending ── */
  if (stage === 'pending') return (
    <Overlay>
      <ModalHeader title="Sent for approval" />
      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <div style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: '#fef2e2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
        }}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 7v5l3 2M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18z" />
          </svg>
        </div>
        <div style={{ fontSize: 17, fontWeight: 700, color: '#1a1b2e', marginBottom: 8 }}>Request submitted</div>
        <div style={{ fontSize: 13, color: '#7c7e93', lineHeight: 1.6, marginBottom: 20 }}>
          Your booking request for <strong>{resource?.title}</strong> is pending staff review. You'll be notified when it's approved or declined.
        </div>
      </div>
      <BtnRow>
        <button onClick={() => { setPage('mybookings'); close(); }} style={{
          flex: 1,
          background: '#16a34a',
          color: '#fff',
          border: 'none',
          borderRadius: 9,
          padding: '11px',
          fontSize: 13,
          fontWeight: 700,
          cursor: 'pointer',
        }}>
          View my bookings
        </button>
      </BtnRow>
    </Overlay>
  );

  /* ── Stage: done (waitlist joined) ── */
  if (stage === 'done') return (
    <Overlay>
      <ModalHeader title="Waitlist joined" />
      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <div style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: '#fdf2f8',
          border: '3px solid #fbcfe8',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
        }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 22, fontWeight: 800, color: '#db2777' }}>#2</span>
        </div>
        <div style={{ fontSize: 17, fontWeight: 700, color: '#1a1b2e', marginBottom: 8 }}>You're on the waitlist</div>
        <div style={{ fontSize: 13, color: '#7c7e93', lineHeight: 1.6, marginBottom: 8 }}>
          You've joined the waitlist for <strong>{resource?.title}</strong>.
        </div>
        <div style={{ fontSize: 12, color: '#be185d', fontWeight: 600, marginBottom: 20 }}>
          Your justification will be reviewed by staff and may boost your position.
        </div>
      </div>
      <BtnRow>
        <button onClick={() => { setPage('waitlist'); close(); }} style={{
          flex: 1,
          background: '#db2777',
          color: '#fff',
          border: 'none',
          borderRadius: 9,
          padding: '11px',
          fontSize: 13,
          fontWeight: 700,
          cursor: 'pointer',
        }}>
          View my waitlist
        </button>
        <CancelBtn onClick={close} />
      </BtnRow>
    </Overlay>
  );

  /* ── Stage: loanQR ── */
  if (stage === 'loanQR') return (
    <Overlay>
      <ModalHeader title="Your loan QR" />
      <div style={{ padding: '18px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1b2e', marginBottom: 4, textAlign: 'center' }}>{resource?.title}</div>
        <div style={{ fontSize: 12, color: '#7c7e93', marginBottom: 18 }}>{resource?.meta || resource?.author}</div>

        <QRGrid cells={qrCells} />

        <div style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 14,
          fontWeight: 700,
          color: '#0c2a1a',
          letterSpacing: 2,
          marginTop: 16,
          marginBottom: 14,
          wordBreak: 'break-all',
          textAlign: 'center',
          maxWidth: 280,
        }}>
          {loanToken || '—'}
        </div>

        <div style={{
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: 8,
          padding: '10px 14px',
          fontSize: 12,
          color: '#16a34a',
          fontWeight: 600,
          textAlign: 'center',
          marginBottom: 4,
        }}>
          Show this QR at the desk to return this item
        </div>
      </div>
      <BtnRow>
        <button onClick={close} style={{
          flex: 1,
          background: '#16a34a',
          color: '#fff',
          border: 'none',
          borderRadius: 9,
          padding: '11px',
          fontSize: 13,
          fontWeight: 700,
          cursor: 'pointer',
        }}>
          Close
        </button>
      </BtnRow>
    </Overlay>
  );

  return null;
}
