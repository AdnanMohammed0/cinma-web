import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

window.addEventListener('error', (e) => {
  console.error('GLOBAL ERROR', e.error?.stack || e.error || e.message);
});
window.addEventListener('unhandledrejection', (e) => {
  console.error('UNHANDLED REJECTION', e.reason?.stack || e.reason);
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </BrowserRouter>
);
