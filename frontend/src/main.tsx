import { createRoot }    from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App               from './App';
import './styles.css';

// Dynamically set the Bootstrap theme based on the user's OS preference
const setBootstrapTheme = () => {
  const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.setAttribute('data-bs-theme', isDarkMode ? 'dark' : 'light');
};

// Set the theme on initial load
setBootstrapTheme();

// Listen for changes in the OS theme preference
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', setBootstrapTheme);

const root = createRoot(document.getElementById('root')!);
root.render(
  // <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <App />
    </BrowserRouter>
  // </React.StrictMode>
);
