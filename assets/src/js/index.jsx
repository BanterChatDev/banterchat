import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import DiscoveryApp from './components/discovery/public/DiscoveryApp';
import { loadServerConfig } from './config';

const isDiscoverySubdomain = /^guilds\./i.test(window.location.hostname);

const container = document.getElementById('root');
const root = createRoot(container);

loadServerConfig().finally(() => {
  root.render(isDiscoverySubdomain ? <DiscoveryApp /> : <App />);
});