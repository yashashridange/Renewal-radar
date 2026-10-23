import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Auth from './pages/Auth';
import Reminders from './pages/Reminders';
import Settings from './pages/Settings';
import MockCheckout from './pages/MockCheckout';

function App() {
  const isAuthenticated = !!localStorage.getItem('token');

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <Routes>
        <Route path="/auth" element={!isAuthenticated ? <Auth /> : <Navigate to="/" />} />
        <Route path="/" element={isAuthenticated ? <Dashboard /> : <Navigate to="/auth" />} />
        <Route path="/reminders" element={isAuthenticated ? <Reminders /> : <Navigate to="/auth" />} />
        <Route path="/settings" element={isAuthenticated ? <Settings /> : <Navigate to="/auth" />} />
        <Route path="/mock-checkout" element={isAuthenticated ? <MockCheckout /> : <Navigate to="/auth" />} />
      </Routes>
    </div>
  );
}

export default App;
