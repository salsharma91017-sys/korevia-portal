/**
 * A small animated AI helper for the header. Pure inline SVG + CSS (see "Agent bot" in globals.css):
 * it bobs, blinks, waves, does a quick turn and a wiggle on a loop. Decorative only, and it stands
 * still for people who prefer reduced motion.
 */
export function AgentBot() {
  return (
    <span className="agent" aria-hidden="true">
      <span className="agent-bubble">Beep boop! Hard at work on your build.</span>
      <svg viewBox="0 0 48 58" width="38" height="46" focusable="false">
        <g className="agent-bob">
          <g className="agent-dance">
            {/* antenna */}
            <line x1="24" y1="7" x2="24" y2="13" stroke="#7ee0d4" strokeWidth="2" strokeLinecap="round" />
            <circle className="agent-light" cx="24" cy="5" r="3" fill="#2dd4bf" />
            {/* ears */}
            <rect x="4.5" y="19" width="3.5" height="9" rx="1.75" fill="#14b8a6" />
            <rect x="40" y="19" width="3.5" height="9" rx="1.75" fill="#14b8a6" />
            {/* head + visor */}
            <rect x="8" y="12" width="32" height="23" rx="9" fill="#eaf1ff" />
            <rect x="12" y="16" width="24" height="15" rx="6.5" fill="#0b1437" />
            <g className="agent-eyes">
              <circle cx="19" cy="23.5" r="3" fill="#2dd4bf" />
              <circle cx="29" cy="23.5" r="3" fill="#2dd4bf" />
            </g>
            <path d="M21 28.2 q3 2 6 0" fill="none" stroke="#7ee0d4" strokeWidth="1.4" strokeLinecap="round" />
            <circle cx="14.2" cy="27.5" r="1.4" fill="#7c3aed" opacity=".7" />
            <circle cx="33.8" cy="27.5" r="1.4" fill="#7c3aed" opacity=".7" />
            {/* body */}
            <rect x="14" y="37" width="20" height="14" rx="5" fill="#eaf1ff" />
            <circle className="agent-core" cx="24" cy="44" r="3.2" fill="#7c3aed" />
            {/* arms */}
            <rect className="agent-arm-l" x="8" y="38" width="5" height="11" rx="2.5" fill="#c9d8f5" />
            <rect className="agent-arm-r" x="35" y="38" width="5" height="11" rx="2.5" fill="#c9d8f5" />
            {/* feet */}
            <rect className="agent-foot-l" x="16.5" y="51" width="6" height="4.5" rx="2" fill="#14b8a6" />
            <rect className="agent-foot-r" x="25.5" y="51" width="6" height="4.5" rx="2" fill="#14b8a6" />
          </g>
        </g>
      </svg>
    </span>
  );
}
