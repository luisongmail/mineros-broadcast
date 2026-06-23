import React from 'react';
import type { ScorebugProps } from './types';

const NAVY = '#1B2F5B';
const RED = '#D71920';
const GOLD = '#D4AF37';
const DARK = '#0D1B30';
const WHITE = '#FFFFFF';

const teamLabelStyle: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 800,
  letterSpacing: 1.5,
  lineHeight: 1,
  color: WHITE,
};

const scoreStyle: React.CSSProperties = {
  fontSize: 34,
  fontWeight: 900,
  lineHeight: 1,
  color: WHITE,
};

const sectionLabelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 1.2,
  textTransform: 'uppercase',
  color: 'rgba(255,255,255,0.68)',
};

const hiddenTextStyle: React.CSSProperties = {
  display: 'none',
};

function renderBase(active: boolean, extraStyle: React.CSSProperties): React.ReactNode {
  return (
    <span
      style={{
        position: 'absolute',
        width: 14,
        height: 14,
        borderRadius: 2,
        transform: 'rotate(45deg)',
        background: active ? GOLD : 'rgba(255,255,255,0.12)',
        border: `1px solid ${active ? GOLD : 'rgba(255,255,255,0.35)'}`,
        boxShadow: active ? '0 0 12px rgba(212,175,55,0.45)' : 'none',
        ...extraStyle,
      }}
    />
  );
}

export function Scorebug({ game }: ScorebugProps) {
  const { homeTeam, awayTeam, score, inning, inningHalf, outs, bases, count } = game;
  const safeOuts = outs >= 0 && outs <= 2 ? outs : null;
  const inningMarker = inningHalf === 'bottom' ? '▼' : '▲';

  return (
    <section
      className="mb-shell"
      style={{
        position: 'absolute',
        left: 60,
        bottom: 60,
        display: 'flex',
        alignItems: 'stretch',
        minWidth: 620,
        background: NAVY,
        border: `2px solid ${GOLD}`,
        borderRadius: 6,
        overflow: 'hidden',
        boxShadow: '0px 10px 28px rgba(0,0,0,0.38)',
        fontFamily: 'Inter, Arial, sans-serif',
      }}
    >
      <div style={{ width: 8, background: RED }} />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 18,
          padding: '16px 18px',
          background: `linear-gradient(90deg, ${DARK} 0%, ${NAVY} 100%)`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={teamLabelStyle}>{awayTeam.shortName}</span>
          <span style={scoreStyle}>{score.away}</span>
        </div>

        <div style={{ width: 1, alignSelf: 'stretch', background: 'rgba(255,255,255,0.14)' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={scoreStyle}>{score.home}</span>
          <span style={{ ...teamLabelStyle, color: GOLD }}>{homeTeam.shortName}</span>
        </div>
      </div>

      <div style={{ width: 3, background: GOLD }} />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '14px 16px',
          background: DARK,
          borderLeft: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <span style={{ fontSize: 24, color: GOLD, lineHeight: 1 }}>{inningMarker}</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={sectionLabelStyle}>Inning</span>
          <span style={{ fontSize: 28, fontWeight: 900, color: WHITE, lineHeight: 1 }}>{inning}</span>
        </div>
      </div>

      <div style={{ width: 1, background: 'rgba(255,255,255,0.12)' }} />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: '14px 16px',
          background: DARK,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={sectionLabelStyle}>Outs</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {[0, 1, 2].map((index) => (
              <span
                key={index}
                style={{
                  width: 11,
                  height: 11,
                  borderRadius: '50%',
                  background: safeOuts !== null && index < safeOuts ? RED : 'rgba(255,255,255,0.16)',
                  border: '1px solid rgba(255,255,255,0.28)',
                  boxShadow: safeOuts !== null && index < safeOuts ? '0 0 10px rgba(215,25,32,0.45)' : 'none',
                }}
              />
            ))}
          </div>
          {safeOuts !== null && (
            <span style={hiddenTextStyle}>{safeOuts === 2 ? `${safeOuts} OUTS` : `${safeOuts} OUT`}</span>
          )}
        </div>

        <div style={{ width: 1, alignSelf: 'stretch', background: 'rgba(255,255,255,0.1)' }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={sectionLabelStyle}>Bases</span>
          <div style={{ position: 'relative', width: 44, height: 28 }}>
            {renderBase(bases.second, { top: 0, left: 15 })}
            {renderBase(bases.third, { top: 12, left: 3 })}
            {renderBase(bases.first, { top: 12, left: 27 })}
          </div>
          <span style={hiddenTextStyle}>1B:{bases.first ? '●' : '○'}</span>
          <span style={hiddenTextStyle}>2B:{bases.second ? '●' : '○'}</span>
          <span style={hiddenTextStyle}>3B:{bases.third ? '●' : '○'}</span>
        </div>
      </div>

      {count && (
        <>
          <div style={{ width: 1, background: 'rgba(255,255,255,0.12)' }} />
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: 6,
              minWidth: 84,
              padding: '14px 16px',
              background: '#08101F',
            }}
          >
            <span style={{ fontSize: 18, fontWeight: 800, color: WHITE, lineHeight: 1 }}>B {count.balls}</span>
            <span style={{ fontSize: 18, fontWeight: 800, color: WHITE, lineHeight: 1 }}>S {count.strikes}</span>
          </div>
        </>
      )}
    </section>
  );
}
