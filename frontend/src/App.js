import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { Toaster } from "sonner";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import ProductForm from "@/pages/ProductForm";
import StoreConfig from "@/pages/StoreConfig";
import AuthCallback from "@/pages/AuthCallback";
import { Loader2 } from "lucide-react";
import "@/App.css";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function PublicOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

function AppRouter() {
  const location = useLocation();
  // Detect Emergent OAuth callback (hash-based)
  if (location.hash?.includes("session_id=")) {
    return <AuthCallback />;
  }
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
      <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/products/new" element={<ProtectedRoute><ProductForm /></ProtectedRoute>} />
      <Route path="/products/:id/edit" element={<ProtectedRoute><ProductForm /></ProtectedRoute>} />
      <Route path="/config" element={<ProtectedRoute><StoreConfig /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <div className="dark">
      <BrowserRouter>
        <AuthProvider>
          <AppRouter />
          <Toaster theme="dark" position="top-center" richColors />
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}
