import { useState } from "react";
import { Screen } from "./Screen";

type Key = "a" | "b" | "c";

const HEART = "M14 25 C6 19 1 14 1 8.5 C1 4.4 4.2 1.5 8 1.5 C10.8 1.5 12.8 3.2 14 5.2 C15.2 3.2 17.2 1.5 20 1.5 C23.8 1.5 27 4.4 27 8.5 C27 14 22 19 14 25 Z";

const BUTTONS: { key: Key; x: number; y: number; label: string }[] = [
  { key: "a", x: 96, y: 299, label: "A: 선택 이동" },
  { key: "b", x: 136, y: 307, label: "B: 결정" },
  { key: "c", x: 176, y: 299, label: "C: 취소" },
];

/**
 * The handheld shell, drawn as SVG so it stays sharp at every size.
 * Clicking-and-dragging the shell moves the window.
 */
export function Device({ onPress, onDrag }: { onPress: (k: Key) => void; onDrag: () => void }) {
  const [pressed, setPressed] = useState<Key | null>(null);

  return (
    <div className="device">
      <svg
        className="shell"
        viewBox="0 0 300 350"
        width="300"
        height="350"
        onPointerDown={(e) => {
          if (e.button === 0) onDrag();
        }}
      >
        <defs>
          <radialGradient id="bodyGrad" cx="38%" cy="35%" r="75%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="70%" stopColor="#f4f7fb" />
            <stop offset="100%" stopColor="#d9e2ee" />
          </radialGradient>
          <linearGradient id="capGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8fc2ee" />
            <stop offset="100%" stopColor="#5893d2" />
          </linearGradient>
          <linearGradient id="earGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#7db6ea" />
            <stop offset="100%" stopColor="#4a86c8" />
          </linearGradient>
          <linearGradient id="bezelGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d8ecfa" />
            <stop offset="100%" stopColor="#b9d9f2" />
          </linearGradient>
          <radialGradient id="btnGrad" cx="40%" cy="35%" r="70%">
            <stop offset="0%" stopColor="#e3f2fd" />
            <stop offset="100%" stopColor="#9fcbee" />
          </radialGradient>
          <clipPath id="bodyClip">
            <path d="M150,60 C240,60 284,122 284,204 C284,290 224,340 150,340 C76,340 16,290 16,204 C16,122 60,60 150,60 Z" />
          </clipPath>
        </defs>

        {/* ears */}
        <g>
          <path d="M40,140 C30,100 30,62 44,38 C50,28 60,27 70,33 C96,48 116,66 130,84 Z" fill="url(#earGrad)" />
          <path d="M52,112 C48,90 50,66 58,50 C74,60 90,74 100,86 Z" fill="#3f78ba" opacity="0.35" />
          <path d="M260,140 C270,100 270,62 256,38 C250,28 240,27 230,33 C204,48 184,66 170,84 Z" fill="url(#earGrad)" />
          <path d="M248,112 C252,90 250,66 242,50 C226,60 210,74 200,86 Z" fill="#3f78ba" opacity="0.35" />
        </g>

        {/* body */}
        <path
          d="M150,60 C240,60 284,122 284,204 C284,290 224,340 150,340 C76,340 16,290 16,204 C16,122 60,60 150,60 Z"
          fill="url(#bodyGrad)"
          stroke="#c8d4e3"
          strokeWidth="1.5"
        />

        {/* blue cap with a soft peak in the middle */}
        <g clipPath="url(#bodyClip)">
          <path
            d="M0,0 H300 V136 C252,136 204,120 170,96 C158,88 142,88 130,96 C96,120 48,136 0,136 Z"
            fill="url(#capGrad)"
          />
          <path
            d="M0,136 C48,136 96,120 130,96 C142,88 158,88 170,96 C204,120 252,136 300,136"
            fill="none"
            stroke="#3f78ba"
            strokeOpacity="0.5"
            strokeWidth="2"
          />
          <ellipse cx="92" cy="92" rx="34" ry="9" fill="#fff" opacity="0.35" transform="rotate(-18 92 92)" />
          <ellipse cx="60" cy="230" rx="10" ry="40" fill="#fff" opacity="0.7" />
        </g>

        {/* screen bezel */}
        <rect x="68" y="128" width="164" height="166" rx="20" fill="url(#bezelGrad)" stroke="#9cc4e6" strokeWidth="2" />
        <rect x="75" y="135" width="150" height="150" rx="12" fill="#fff" opacity="0.6" />

        {/* button sockets */}
        {BUTTONS.map((b) => (
          <path key={b.key} d={HEART} transform={`translate(${b.x - 3} ${b.y - 3}) scale(1.22)`} fill="#e6edf5" />
        ))}
      </svg>

      <div className="screen-wrap">
        <Screen />
      </div>

      {BUTTONS.map((b) => (
        <button
          key={b.key}
          className={`heart-btn ${pressed === b.key ? "down" : ""}`}
          style={{ left: b.x, top: b.y }}
          aria-label={b.label}
          title={b.label}
          onPointerDown={(e) => {
            e.stopPropagation();
            setPressed(b.key);
            onPress(b.key);
          }}
          onPointerUp={() => setPressed(null)}
          onPointerLeave={() => setPressed(null)}
        >
          <svg viewBox="0 0 28 27" width="28" height="27">
            <path d={HEART} fill="url(#btnGrad)" stroke="#78aedb" strokeWidth="1.4" />
            <ellipse cx="9" cy="7" rx="3.2" ry="2" fill="#fff" opacity="0.8" />
          </svg>
        </button>
      ))}
    </div>
  );
}
