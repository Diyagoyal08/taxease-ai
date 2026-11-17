"use client";

import { useState } from "react";

// A ring split into coloured parts, with a label in the middle.
export function Donut({ segments, centerTop, centerBottom, size = 176 }) {
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((sum, s) => sum + s.value, 0) || 1;
  const description = segments.map((s) => `${s.label}: ${s.value}`).join(", ");

  return (
    <svg viewBox="0 0 160 160" width={size} height={size} role="img" aria-label={description}>
      <circle cx="80" cy="80" r={radius} fill="none" stroke="var(--track)" strokeWidth="22" />
      {segments.map((segment, index) => {
        const before = segments.slice(0, index).reduce((sum, s) => sum + s.value, 0);
        const length = (circumference * segment.value) / total;
        const visible = Math.max(length - 3, 0); // a small gap between parts
        return (
          <circle
            key={segment.label}
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke={segment.color}
            strokeWidth="22"
            strokeDasharray={`${visible} ${circumference - visible}`}
            strokeDashoffset={-(circumference * before) / total}
            transform="rotate(-90 80 80)"
          />
        );
      })}
      <text x="80" y="78" textAnchor="middle" className="donut-top">
        {centerTop}
      </text>
      <text x="80" y="98" textAnchor="middle" className="donut-bottom">
        {centerBottom}
      </text>
    </svg>
  );
}

// Tall rounded bars. items: [{ id, label, value, detail, urgent }]
export function CapsuleBars({ items }) {
  const [active, setActive] = useState(null);
  const max = Math.max(1, ...items.map((item) => item.value));

  return (
    <div className="bars" role="list">
      {items.map((item, index) => (
        <div className="bar-col" role="listitem" key={item.id}>
          <div className="capsule-wrap">
            <button
              type="button"
              className="capsule"
              aria-label={item.detail}
              onMouseEnter={() => setActive(index)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(index)}
              onBlur={() => setActive(null)}
            >
              <span
                className={"capsule-fill" + (item.urgent ? " urgent" : "")}
                style={{ "--h": `${Math.max(9, (item.value / max) * 100)}%` }}
              />
            </button>
            {active === index ? <span className="tip">{item.detail}</span> : null}
          </div>
          <span className="bar-value">{item.valueText}</span>
          <span className="bar-label">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
