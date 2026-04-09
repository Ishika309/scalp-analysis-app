import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login       from './components/auth/Login';
import Signup      from './components/auth/Signup';
import Dashboard   from './components/dashboard/Dashboard';
import Scanner     from './components/scanner/Scanner';
import Chatbot     from './components/chatbot/Chatbot';
import HistoryPage from './components/history/History';
import Products    from './components/products/Products';
import Navbar      from './components/layout/Navbar';

function PrivateRoute({ children }) {
  const { currentUser } = useAuth();
  return currentUser ? children : <Navigate to="/login" replace />;
}

function AppLayout({ children }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 20px 100px' }}>
        {children}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login"  element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/*" element={
            <PrivateRoute>
              <AppLayout>
                <Routes>
                  <Route path="/"         element={<Dashboard />} />
                  <Route path="/scanner"  element={<Scanner />} />
                  <Route path="/chat"     element={<Chatbot />} />
                  <Route path="/history"  element={<HistoryPage />} />
                  <Route path="/products" element={<Products />} />
                </Routes>
              </AppLayout>
            </PrivateRoute>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
