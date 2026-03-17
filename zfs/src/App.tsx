import React from 'react';
import { NotificationProvider } from './contexts/NotificationContext';
import { ZfsDataProvider } from './contexts/ZfsDataContext';
import { ZfsPage } from './components/ZfsPage';

export default function App() {
  return (
    <NotificationProvider>
      <ZfsDataProvider>
        <ZfsPage />
      </ZfsDataProvider>
    </NotificationProvider>
  );
}
