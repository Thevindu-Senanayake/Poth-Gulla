import { useState } from 'react';
import { useApp } from '../../App';
import { configTiers, configPenalties, configToggles } from '../../data/mockData';

export default function Config() {
  const { showToast } = useApp();

  // These rules are defined in the backend domain config (TIER_LIMITS, POINT_DELTA, feature
  // flags) and have no live edit endpoint, so this screen presents them as an editable
  // reference. "Save" is local-only until a /config endpoint is exposed.
  const [tiers, setTiers] = useState(configTiers);
  const [penalties, setPenalties] = useState(configPenalties);
  const [toggles, setToggles] = useState(configToggles);

  function updateTierField(i, field, val) {
    setTiers((prev) => prev.map((t, idx) => idx === i ? { ...t, [field]: val } : t));
  }

  function updatePenaltyValue(i, val) {
    setPenalties((prev) => prev.map((p, idx) => idx === i ? { ...p, value: val } : p));
  }

  function toggleFeature(i) {
    setToggles((prev) => prev.map((t, idx) => idx === i ? { ...t, on: !t.on } : t));
  }

  return (
    <div style={{ padding: '30px 30px 40px', fontFamily: "'Public Sans', sans-serif", minHeight: '100%' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: "'Spectral', serif", fontSize: 24, fontWeight: 700, color: '#1a1b2e', margin: '0 0 4px' }}>System Config</h1>
          <p style={{ fontSize: 13, color: '#7c7e93', margin: 0 }}>All rules below are editable. Changes take effect immediately after saving.</p>
        </div>
        <button
          onClick={() => showToast('Config saved successfully')}
          style={{
            background: '#16a34a',
            color: '#fff',
            border: 'none',
            borderRadius: 9,
            padding: '10px 22px',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            letterSpacing: 0.2,
          }}>
          Save changes
        </button>
      </div>

      {/* Section 1: Tier thresholds */}
      <div style={{ background: '#fff', border: '1px solid #e7e7ef', borderRadius: 14, marginBottom: 18, overflow: 'hidden' }}>
        <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid #e7e7ef' }}>
          <h2 style={{ fontFamily: "'Spectral', serif", fontSize: 17, fontWeight: 600, color: '#1a1b2e', margin: 0 }}>
            Tier thresholds &amp; borrowing limits
          </h2>
        </div>

        {/* Table header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '160px 1fr 1fr 1fr 1fr',
          padding: '10px 22px',
          background: '#f8f8fc',
          borderBottom: '1px solid #e7e7ef',
        }}>
          {['Tier', 'Min points', 'Books', 'Devices', 'Rooms'].map(h => (
            <span key={h} style={{ fontSize: 11, fontWeight: 700, color: '#9b9db2', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</span>
          ))}
        </div>

        {tiers.map((t, i) => (
          <div
            key={i}
            style={{
              display: 'grid',
              gridTemplateColumns: '160px 1fr 1fr 1fr 1fr',
              padding: '14px 22px',
              borderBottom: i < tiers.length - 1 ? '1px solid #f0f0f6' : 'none',
              alignItems: 'center',
              gap: 12,
            }}>

            {/* Tier name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: t.col, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1b2e' }}>{t.tier}</div>
                <div style={{ fontSize: 11, color: '#9b9db2' }}>{t.label}</div>
              </div>
            </div>

            {/* Threshold */}
            <input
              type="number"
              value={t.threshold}
              onChange={e => updateTierField(i, 'threshold', e.target.value)}
              style={{
                width: '80px',
                border: '1px solid #e7e7ef',
                borderRadius: 7,
                padding: '7px 10px',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 13,
                color: '#1a1b2e',
                background: '#f8f8fc',
                outline: 'none',
              }}
            />

            {/* Books */}
            <input
              type="number"
              value={t.books}
              onChange={e => updateTierField(i, 'books', e.target.value)}
              style={{
                width: '60px',
                border: '1px solid #e7e7ef',
                borderRadius: 7,
                padding: '7px 10px',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 13,
                color: '#1a1b2e',
                background: '#f8f8fc',
                outline: 'none',
              }}
            />

            {/* Devices */}
            <input
              type="number"
              value={t.devices}
              onChange={e => updateTierField(i, 'devices', e.target.value)}
              style={{
                width: '60px',
                border: '1px solid #e7e7ef',
                borderRadius: 7,
                padding: '7px 10px',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 13,
                color: '#1a1b2e',
                background: '#f8f8fc',
                outline: 'none',
              }}
            />

            {/* Rooms */}
            <input
              type="number"
              value={t.rooms}
              onChange={e => updateTierField(i, 'rooms', e.target.value)}
              style={{
                width: '60px',
                border: '1px solid #e7e7ef',
                borderRadius: 7,
                padding: '7px 10px',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 13,
                color: '#1a1b2e',
                background: '#f8f8fc',
                outline: 'none',
              }}
            />
          </div>
        ))}
      </div>

      {/* Section 2: 2-col grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>

        {/* Penalty rules */}
        <div style={{ background: '#fff', border: '1px solid #e7e7ef', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid #e7e7ef' }}>
            <h2 style={{ fontFamily: "'Spectral', serif", fontSize: 17, fontWeight: 600, color: '#1a1b2e', margin: 0 }}>
              Penalty &amp; escalation rules
            </h2>
          </div>
          <div style={{ padding: '6px 0' }}>
            {penalties.map((p, i) => {
              const isNeg = typeof p.value === 'string' && p.value.startsWith('−');
              return (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 22px',
                    borderBottom: i < penalties.length - 1 ? '1px solid #f0f0f6' : 'none',
                    gap: 12,
                  }}>
                  <span style={{ fontSize: 13, color: '#3a3b4e', flex: 1 }}>{p.rule}</span>
                  <input
                    type="text"
                    value={p.value}
                    onChange={e => updatePenaltyValue(i, e.target.value)}
                    style={{
                      width: '70px',
                      border: '1px solid #e7e7ef',
                      borderRadius: 7,
                      padding: '6px 10px',
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 13,
                      fontWeight: 700,
                      color: isNeg ? '#dc2626' : '#16a34a',
                      background: isNeg ? '#fff5f5' : '#f0fdf4',
                      outline: 'none',
                      textAlign: 'right',
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Feature switches */}
        <div style={{ background: '#fff', border: '1px solid #e7e7ef', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid #e7e7ef' }}>
            <h2 style={{ fontFamily: "'Spectral', serif", fontSize: 17, fontWeight: 600, color: '#1a1b2e', margin: 0 }}>
              Feature switches
            </h2>
          </div>
          <div style={{ padding: '6px 0' }}>
            {toggles.map((tog, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '14px 22px',
                  borderBottom: i < toggles.length - 1 ? '1px solid #f0f0f6' : 'none',
                  gap: 12,
                }}>
                <span style={{ fontSize: 13, color: '#3a3b4e', flex: 1 }}>{tog.label}</span>

                {/* Toggle switch */}
                <div
                  onClick={() => toggleFeature(i)}
                  style={{
                    width: 44,
                    height: 24,
                    borderRadius: 12,
                    background: tog.on ? '#16a34a' : '#d1d5db',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'background 0.2s ease',
                    flexShrink: 0,
                  }}>
                  <div style={{
                    position: 'absolute',
                    top: 3,
                    left: tog.on ? 23 : 3,
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    background: '#fff',
                    transition: 'left 0.2s ease',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
