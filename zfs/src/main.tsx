import React from 'react';
import { createRoot } from 'react-dom/client';
import '@patternfly/patternfly/patternfly.css';
import '@patternfly/patternfly/patternfly-addons.css';
import './assets/zfs-theme.css';
import './assets/zfs.css';
import App from './App';

// Sync Cockpit shell's dark mode into this iframe.
// Cockpit sets `pf-v6-theme-dark` on the *parent* shell's <html>.
// We mirror that class onto our own <html> so PF6 components render dark.
const syncDarkMode = () => {
  const html = document.documentElement;
  try {
    const parentHtml = window.parent?.document?.documentElement;
    if (parentHtml) {
      const isDark = parentHtml.classList.contains('pf-v6-theme-dark')
                  || parentHtml.classList.contains('dark');
      html.classList.toggle('pf-v6-theme-dark', isDark);
      return;
    }
  } catch {
    // cross-origin — fall through to local check
  }
  // Fallback: check our own <html> for .dark (standalone / dev mode)
  html.classList.toggle('pf-v6-theme-dark', html.classList.contains('dark'));
};

syncDarkMode();

// Observe parent shell for theme changes
try {
  const parentHtml = window.parent?.document?.documentElement;
  if (parentHtml && parentHtml !== document.documentElement) {
    new MutationObserver(syncDarkMode).observe(parentHtml, {
      attributes: true,
      attributeFilter: ['class'],
    });
  }
} catch {
  // cross-origin — ignore
}

// Also observe our own <html> in case Cockpit injects classes directly
new MutationObserver(syncDarkMode).observe(document.documentElement, {
  attributes: true,
  attributeFilter: ['class'],
});

const container = document.getElementById('root');
if (container) {
  createRoot(container).render(<App />);
}
