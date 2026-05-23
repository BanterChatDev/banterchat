import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import ContextMenu, { CTX_MENU_EXIT_MS } from './ContextMenu';
import { useBlocks } from '../../hooks/useBlocks';

const ContextMenuContext = createContext(null);

const registry = [];

export function registerContextMenuItems(id, matcher, itemsFn) {
  const existing = registry.findIndex(r => r.id === id);
  if (existing !== -1) registry[existing] = { id, matcher, itemsFn };
  else registry.push({ id, matcher, itemsFn });
}

export function useContextMenu() {
  const ctx = useContext(ContextMenuContext);
  if (!ctx) {
    return {
      openMenu: () => {},
      closeMenu: () => {},
    };
  }
  return ctx;
}

export function ContextMenuProvider({ children, user }) {
  const [menu, setMenu] = useState(null);
  const [isExiting, setIsExiting] = useState(false);
  const exitTimer = useRef(null);
  const { isBlocked } = useBlocks();

  const openMenu = useCallback((e, context, opts) => {
    e.preventDefault();
    e.stopPropagation();
    clearTimeout(exitTimer.current);
    setIsExiting(false);
    window.dispatchEvent(new Event('scrollLock'));
    const ctx = { ...context, user, isBlocked };
    const items = [];
    for (const reg of registry) {
      if (reg.matcher(e, ctx)) {
        items.push(...reg.itemsFn(e, ctx));
      }
    }
    if (items.length === 0) {
      window.dispatchEvent(new Event('scrollUnlock'));
      return;
    }
    setMenu({ x: e.clientX, y: e.clientY, items, context: ctx, width: opts?.width || null });
  }, [user, isBlocked]);

  const closeMenu = useCallback(() => {
    setIsExiting(true);
    window.dispatchEvent(new Event('scrollUnlock'));
    clearTimeout(exitTimer.current);
    exitTimer.current = setTimeout(() => {
      setMenu(null);
      setIsExiting(false);
    }, CTX_MENU_EXIT_MS);
  }, []);

  useEffect(() => () => clearTimeout(exitTimer.current), []);

  useEffect(() => {
    if (!menu || isExiting) return;
    const clickHandler = () => closeMenu();
    let scrollArmed = false;
    const armTimer = setTimeout(() => { scrollArmed = true; }, 150);
    const scrollHandler = () => { if (scrollArmed) closeMenu(); };
    window.addEventListener('click', clickHandler);
    window.addEventListener('scroll', scrollHandler, true);
    return () => {
      clearTimeout(armTimer);
      window.removeEventListener('click', clickHandler);
      window.removeEventListener('scroll', scrollHandler, true);
    };
  }, [menu, isExiting, closeMenu]);

  return (
    <ContextMenuContext.Provider value={{ openMenu, closeMenu }}>
      {children}
      {menu && <ContextMenu x={menu.x} y={menu.y} items={menu.items} width={menu.width} onClose={closeMenu} isExiting={isExiting} />}
    </ContextMenuContext.Provider>
  );
}