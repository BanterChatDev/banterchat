import { createRoot } from 'react-dom/client';
import { Passphrase } from './Passphrase';
import { Settings } from './Settings';

const VIEWS = {
  passphrase: Passphrase,
  settings: Settings,
};

function pickView() {
  const params = new URLSearchParams(window.location.search);
  const name = params.get('view') || 'passphrase';
  return VIEWS[name] || Passphrase;
}

const View = pickView();
createRoot(document.getElementById('root')).render(<View />);