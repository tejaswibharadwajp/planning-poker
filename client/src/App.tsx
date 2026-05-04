import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { SignIn, SignedIn, SignedOut } from '@clerk/clerk-react';
import { SocketProvider } from './contexts/SocketContext';
import Home from './pages/Home';
import Room from './pages/Room';

function AuthGate({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut>
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 flex items-center justify-center">
          <SignIn routing="hash" />
        </div>
      </SignedOut>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <SocketProvider>
        <Routes>
          <Route
            path="/"
            element={
              <AuthGate>
                <Home />
              </AuthGate>
            }
          />
          <Route
            path="/room/:code"
            element={
              <AuthGate>
                <Room />
              </AuthGate>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </SocketProvider>
      <Analytics />
    </BrowserRouter>
  );
}
