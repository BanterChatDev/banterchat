import React from 'react';
import { useRouter } from '../../../router';
import DiscoveryHome from './DiscoveryHome';
import DiscoverySearchPage from './DiscoverySearchPage';
import DiscoveryTagPage from './DiscoveryTagPage';
import DiscoveryNav from './DiscoveryNav';
import { useT } from '../../../hooks/useT';

export default function DiscoveryApp() {
  const t = useT();
  const { path, search, navigate, match } = useRouter();

  let content;
  const tagMatch = match('/tag/:tag');
  if (path === '/' || path === '') {
    content = <DiscoveryHome navigate={navigate} />;
  } else if (path === '/search') {
    content = <DiscoverySearchPage navigate={navigate} search={search} />;
  } else if (tagMatch) {
    content = <DiscoveryTagPage tag={decodeURIComponent(tagMatch.tag)} navigate={navigate} />;
  } else {
    if (typeof window !== 'undefined') {
      window.location.href = path;
    }
    return null;
  }

  return (
    <div className="discovery-app">
      <DiscoveryNav navigate={navigate} />
      <main className="discovery-main">
        {content}
      </main>
      <footer className="discovery-footer">
        {t('discovery.public_footer')}
      </footer>
    </div>
  );
}