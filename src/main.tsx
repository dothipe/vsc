import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ErrorBoundary } from "./components/global/ErrorBoundary";
import { ToastProvider } from "./providers/ToastProvider";
import { PermissionProvider } from "./providers/PermissionProvider";
import { TournamentStateProvider } from "./providers/TournamentStateProvider";
import { OfflineIndicator } from "./components/global/OfflineIndicator";

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <PermissionProvider>
        <ToastProvider>
          <TournamentStateProvider>
            <App />
            <OfflineIndicator />
          </TournamentStateProvider>
        </ToastProvider>
      </PermissionProvider>
    </ErrorBoundary>
  </StrictMode>,
);

