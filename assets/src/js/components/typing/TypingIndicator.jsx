import React, { useMemo } from 'react';
import { useTypingUsers } from '../../hooks/useTypingUsers';
import TypingDots from './TypingDots';
import { useT } from '../../hooks/useT';

export default function TypingIndicator({ channelId, userId }) {
  const allTypers = useTypingUsers(channelId);
  const t = useT();

  const text = useMemo(() => {
    const names = Object.entries(allTypers).filter(([uid]) => uid !== userId).map(([, name]) => name);
    if (names.length === 0) return '';
    if (names.length === 1) return t('typing.one_template').replace('{a}', names[0]);
    if (names.length === 2) return t('typing.two_template').replace('{a}', names[0]).replace('{b}', names[1]);
    if (names.length === 3) return t('typing.three_template').replace('{a}', names[0]).replace('{b}', names[1]).replace('{c}', names[2]);
    return t('typing.many_template').replace('{a}', names[0]).replace('{b}', names[1]).replace('{n}', names.length - 2);
  }, [allTypers, userId, t]);

  return (
    <div className="h-6 px-4 flex items-center flex-shrink-0">
      {text && (
        <span className="text-xs text-[rgb(var(--content-base)/0.4)] truncate">
          <span className="mr-1.5 align-middle"><TypingDots size="sm" /></span>
          {text}
        </span>
      )}
    </div>
  );
}