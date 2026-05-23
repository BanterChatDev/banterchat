import React from 'react';
import { useRouter } from './router';
import { useAuth } from './hooks/useAuth';
import { useSocket } from './hooks/useSocket';
import { useRealtimeUser } from './hooks/useRealtimeUser';
import { useIdleDetection } from './hooks/useIdleDetection';
import { createGlobalHandlers } from './broadcasts';
import { usePermEvents } from './hooks/usePermEvents';
import { ROUTES } from './routes';
import Navbar from './components/landing/Navbar';
import Hero from './components/landing/Hero';
import Footer from './components/landing/Footer';
import Downloads from './components/landing/Downloads';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import ForgotPassword from './components/auth/ForgotPassword';
import GuildLayout from './components/guilds/GuildLayout';
import AdminPage from './components/adminpanel/AdminPage';
import ApplicationsPage from './components/developers/ApplicationsPage';
import ReportDispatcher from './components/reports/ReportDispatcher';
import Legal, { LEGAL_DOCS } from './components/legal/legal.jsx';
import { UIPrefsProvider, applyTheme } from './hooks/useUIPrefs';
import { AccessibilityPrefsProvider } from './hooks/useAccessibilityPrefs';
import { getThemeById } from './themes';
import { getLangById } from './lang';
import { applyLanguage, t as tBare } from './lang/apply';
import { ContextMenuProvider } from './components/contextmenu';
import { BlocksProvider } from './hooks/useBlocks';
import { GifFavoritesProvider } from './hooks/useGifFavorites';
import { DMListProvider } from './hooks/useDMList';
import { UnreadProvider } from './hooks/useChannelNotifications';
import { ThreadProvider } from './hooks/useThreads';
import { Notifications } from './components/notification';
import WarningModal from './components/notification/WarningModal';
import BanModal from './components/notification/BanModal';
import TabIndicator from './components/notification/TabIndicator';
import Spinner from './components/ui/Spinner';

export default function App() {
  const { path, navigate } = useRouter();
  const { user, loading, login, register, logout, setUser, verifyKeyfile, clearAllSessionState } = useAuth();
  useSocket(user);
  useRealtimeUser(user, setUser);
  useIdleDetection(user);
  usePermEvents(createGlobalHandlers());
  const lastThemeRef = React.useRef(null);
  const lastLangRef = React.useRef(null);

  if (user) {
    window.__currentUserId = user.id;
    const tid = user.theme_id || 'dark';
    if (tid !== lastThemeRef.current) {
      lastThemeRef.current = tid;
      applyTheme(getThemeById(tid));
    }
    const lid = user.lang_id || 'en_us';
    if (lid !== lastLangRef.current) {
      lastLangRef.current = lid;
      applyLanguage(getLangById(lid));
    }
  }

  
  React.useEffect(() => {
    const onForceLogout = () => {
      clearAllSessionState();
      setUser(null);
      navigate(ROUTES.login);
    };
    const onAdminKick = (ev) => {
      const { kind, reason } = ev.detail || {};
      const key = kind === 'banned'
        ? 'notifications.banned'
        : kind === 'suspended'
          ? (reason ? 'notifications.suspended_with_reason' : 'notifications.suspended')
          : kind === 'deleted'
            ? 'notifications.account_deleted'
            : 'notifications.session_ended';
      const msg = reason
        ? tBare(key).replace('{reason}', reason)
        : tBare(key);
      import('./components/notification/Notifications.jsx').then(m => m.notify(msg, 'error'));
      clearAllSessionState();
      setUser(null);
      navigate(ROUTES.login);
    };
    window.addEventListener('wsForceLogout', onForceLogout);
    window.addEventListener('wsAdminKick', onAdminKick);
    return () => {
      window.removeEventListener('wsForceLogout', onForceLogout);
      window.removeEventListener('wsAdminKick', onAdminKick);
    };
  }, [navigate, setUser, clearAllSessionState]);

  const renderAuthed = (child) => (
    <UIPrefsProvider initialTheme={getThemeById(user.theme_id || 'dark')} initialLang={getLangById(user.lang_id || 'en_us')}>
      {child}
    </UIPrefsProvider>
  );

  const content = (() => {
    if (loading) {
      return (
        <div className="h-screen flex items-center justify-center bg-[var(--bg-deepest)]">
          <Spinner />
        </div>
      );
    }

    if (path === ROUTES.login) {
      if (user) {
        navigate(ROUTES.channels, true);
        return null;
      }
      return <Login onLogin={login} onVerifyKeyfile={verifyKeyfile} navigate={navigate} />;
    }

    if (path === ROUTES.register) {
      if (user) {
        navigate(ROUTES.channels, true);
        return null;
      }
      return <Register onRegister={register} navigate={navigate} />;
    }

    if (path === ROUTES.forgotPassword) {
      return <ForgotPassword navigate={navigate} />;
    }

    if (path === ROUTES.developerApplications) {
      if (!user) {
        navigate(ROUTES.login, true);
        return null;
      }
      return <ApplicationsPage navigate={navigate} />;
    }
    if (path === ROUTES.messages || path.startsWith('/messages/') || path === ROUTES.channels || path.startsWith('/channels/')) {
      if (!user) {
        navigate(ROUTES.login, true);
        return null;
      }
      return renderAuthed(
        <BlocksProvider>
          <GifFavoritesProvider>
            <DMListProvider>
              <UnreadProvider user={user}>
                <ThreadProvider>
                  <TabIndicator />
                  <ContextMenuProvider user={user}>
                    <GuildLayout user={user} navigate={navigate} onLogout={logout} path={path} setUser={setUser} />
                  </ContextMenuProvider>
                </ThreadProvider>
              </UnreadProvider>
            </DMListProvider>
          </GifFavoritesProvider>
        </BlocksProvider>
      );
    }

    if (path === ROUTES.admin || path.startsWith('/admin/')) {
      if (!user) {
        navigate(ROUTES.login, true);
        return null;
      }
      return renderAuthed(
        <BlocksProvider>
          <ContextMenuProvider user={user}>
            <AdminPage user={user} navigate={navigate} path={path} />
          </ContextMenuProvider>
        </BlocksProvider>
      );
    }

    if (path === ROUTES.tos || path === '/terms') {
      return <Legal doc={LEGAL_DOCS.tos} navigate={navigate} user={user} />;
    }
    if (path === ROUTES.privacy) {
      return <Legal doc={LEGAL_DOCS.privacy} navigate={navigate} user={user} />;
    }
    if (path === ROUTES.guidelines) {
      return <Legal doc={LEGAL_DOCS.guidelines} navigate={navigate} user={user} />;
    }
    if (path === ROUTES.contentPolicy) {
      return <Legal doc={LEGAL_DOCS.contentPolicy} navigate={navigate} user={user} />;
    }

    if (path === ROUTES.downloads) {
      return <Downloads navigate={navigate} user={user} />;
    }

    if (path === ROUTES.home || path === '') {
      return (
        <div className="min-h-screen flex flex-col bg-[var(--bg-base)] text-white relative select-none">
          <Navbar navigate={navigate} user={user} />
          <Hero navigate={navigate} user={user} />  
          <Footer navigate={navigate} />
        </div>
      );
    }

    window.location.href = '/404.html';
    return null;
  })();

  return (
    <AccessibilityPrefsProvider>
      <Notifications />
      <ReportDispatcher />
      <WarningModal user={user} />
      <BanModal />
      {content}
    </AccessibilityPrefsProvider>
  );
}