import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { registerServiceWorker } from './pwa/registerSW'

createRoot(document.getElementById("root")!).render(<App />);

// Register the service worker after mount. The wrapper refuses to register
// in dev, previews, iframes, or when ?sw=off is set.
registerServiceWorker();
