import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CloseIcon, ArrowLeftIcon } from '../icons';
import { useT } from '../../hooks/useT';

export default function FullscreenLayout({ title, subtitle, tabs, onClose, defaultTab, children, onBeforeLeave, sidebarFooter, sidebarHeader }) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);
  const [shaking, setShaking] = useState(false);
  const shakeTimer = useRef(null);
  const t = useT();

  const triggerShake = useCallback(() => {
    setShaking(true);
    clearTimeout(shakeTimer.current);
    shakeTimer.current = setTimeout(() => setShaking(false), 500);
  }, []);

  const guardedAction = useCallback((action) => {
    if (onBeforeLeave && !onBeforeLeave()) {
      triggerShake();
      return;
    }
    action();
  }, [onBeforeLeave, triggerShake]);

  const guardedSetTab = useCallback((id) => {
    if (id === activeTab) return;
    guardedAction(() => setActiveTab(id));
  }, [activeTab, guardedAction]);

  const guardedClose = useCallback(() => {
    guardedAction(onClose);
  }, [guardedAction, onClose]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') guardedClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [guardedClose]);

  useEffect(() => () => clearTimeout(shakeTimer.current), []);

  return (
    <div className="fixed inset-0 z-50 text-white flex" style={{ background: 'var(--bg-gradient, var(--bg-base))', backgroundColor: 'var(--bg-base)' }}>
      <div className="flex flex-col sm:flex-row w-full h-full">
        <div className="flex sm:flex-col sm:w-56 bg-[var(--bg-secondary)] border-b sm:border-b-0 sm:border-r border-[var(--border-default)] shrink-0">
          <div className="hidden sm:flex items-center justify-between px-4 py-4 border-b border-white/[0.04]">
            {sidebarHeader || (subtitle ? (
              <div className="min-w-0">
                <span className="text-[10px] font-semibold text-white/25 uppercase tracking-wider">{title}</span>
                <p className="text-xs text-white/40 mt-0.5 truncate">{subtitle}</p>
              </div>
            ) : (
              <span className="text-[10px] font-semibold text-white/25 uppercase tracking-wider">{title}</span>
            ))}
            <button onClick={guardedClose} className="text-white/20 hover:text-white/50 transition-colors p-1 rounded-lg hover:bg-white/[0.06]">
              <CloseIcon className="w-4 h-4" />
            </button>
          </div>
          <div className="flex sm:flex-col flex-1 p-2 gap-0.5 overflow-x-auto sm:overflow-x-visible">
            {tabs.map((tab, idx) => {
              const prevGroup = idx > 0 ? tabs[idx - 1].group : undefined;
              const showGroupHeader = tab.group && tab.group !== prevGroup;
              return (
                <React.Fragment key={tab.id}>
                  {showGroupHeader && (
                    <div className="hidden sm:flex items-center gap-2 px-3 pt-3 pb-1.5">
                      <span className="text-[10px] font-semibold text-white/25 uppercase tracking-wider">{tab.groupLabel || tab.group}</span>
                      <div className="flex-1 h-px bg-white/[0.06]" />
                    </div>
                  )}
                  <button
                    onClick={() => guardedSetTab(tab.id)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-[13px] whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                        ? 'bg-white/[0.08] text-white/90 font-medium'
                        : 'text-white/35 hover:text-white/60 hover:bg-white/[0.04]'
                    }`}
                  >
                    <span className={activeTab === tab.id ? 'text-white/50' : 'text-white/20'}>{tab.icon}</span>
                    {tab.label}
                  </button>
                </React.Fragment>
              );
            })}
          </div>
          {sidebarFooter}
          <div className="hidden sm:block p-2 border-t border-white/[0.04]">
            <button
              onClick={guardedClose}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-[13px] text-white/35 hover:text-white/60 hover:bg-white/[0.04] transition-colors"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              {t('common.back_to_chat')}
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.04] sm:hidden">
            <h2 className="text-sm font-semibold text-white/80">
              {tabs.find(t => t.id === activeTab)?.label}
            </h2>
            <button onClick={guardedClose} className="text-white/20 hover:text-white/50 transition-colors p-1 rounded-lg hover:bg-white/[0.06]">
              <CloseIcon className="w-4 h-4" />
            </button>
          </div>
          <div className={`flex-1 w-full ${tabs.find(t => t.id === activeTab)?.flush ? 'overflow-hidden flex-col' : 'overflow-y-auto p-4 sm:p-6'} ${shaking ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}>
            {children(activeTab)}
          </div>
        </div>
      </div>
    </div>
  );
}