export function BreathingAuraOrb({ compact = false, traveling = false }: { compact?: boolean; traveling?: boolean }) {
  return (
    <div className={`breathing-aura ${compact ? 'breathing-aura-compact' : ''} ${traveling ? 'breathing-aura-traveling' : ''}`} aria-hidden="true">
      <div className="aura-fluid">
        <span className="aura-peach" /><span className="aura-sun" />
        <span className="aura-mint" /><span className="aura-sky" />
      </div>
      <svg className="aura-grain" viewBox="0 0 300 300">
        <rect width="300" height="300" filter="url(#paper-grain-overlay)" />
      </svg>
    </div>
  );
}
