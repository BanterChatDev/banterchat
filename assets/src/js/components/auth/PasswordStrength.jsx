import React from 'react';
import { useT } from '../../hooks/useT';

const LEVELS = [
  { labelKey: 'auth.password_strength.coal', color: '#6b7280', minScore: 0 },
  { labelKey: 'auth.password_strength.iron', color: '#ef4444', minScore: 1 },
  { labelKey: 'auth.password_strength.stone', color: '#f59e0b', minScore: 2 },
  { labelKey: 'auth.password_strength.diamond', color: '#3b82f6', minScore: 3 },
  { labelKey: 'auth.password_strength.gem', color: '#10b981', minScore: 4 },
];

function getScore(pw) {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (pw.length >= 16) score++;
  const types = [/[a-z]/, /[A-Z]/, /\d/, /[^a-zA-Z0-9]/].filter(r => r.test(pw)).length;
  if (types >= 2) score++;
  if (types >= 3) score++;
  const unique = new Set(pw.toLowerCase()).size;
  if (unique <= 3) score -= 2;
  else if (pw.length >= 6 && unique / pw.length < 0.4) score--;
  return Math.max(0, Math.min(score, 4));
}

export default function PasswordStrength({ password }) {
  const t = useT();
  if (!password) return null;
  const score = getScore(password);
  const level = LEVELS[score];
  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1">
        {LEVELS.map((l, i) => (
          <div
            key={i}
            className="h-1 flex-1 rounded-full transition-all duration-300"
            style={{ backgroundColor: i <= score ? level.color : 'rgba(255,255,255,0.06)' }}
          />
        ))}
      </div>
      <p className="text-[10px] font-semibold uppercase tracking-wider transition-colors duration-300" style={{ color: level.color }}>
        {t(level.labelKey)}
      </p>
    </div>
  );
}