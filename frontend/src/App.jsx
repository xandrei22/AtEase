import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { BookingProvider } from './context/BookingContext';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import CustomerLayout from './components/layout/CustomerLayout';
import AdminLayout from './components/admin/AdminLayout';
import HomePage from './pages/HomePage';
import RoomListingPage from './pages/RoomListingPage';
import RoomDetailsPage from './pages/RoomDetailsPage';
import CheckoutPage from './pages/CheckoutPage';
import ConfirmationPage from './pages/ConfirmationPage';
import MyBookingsPage from './pages/MyBookingsPage';
import FavoritesPage from './pages/FavoritesPage';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import AdminLoginPage from './pages/admin/AdminLoginPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminRoomsPage from './pages/admin/AdminRoomsPage';
import AdminBookingsPage from './pages/admin/AdminBookingsPage';
import AdminReportsPage from './pages/admin/AdminReportsPage';
import AdminSettingsPage from './pages/admin/AdminSettingsPage';
import AdminRequestsPage from './pages/admin/AdminRequestsPage';

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

function AppContent() {
  return (
    <AuthProvider>
      <BookingProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<CustomerLayout />}>
              <Route index element={<HomePage />} />
              <Route path="rooms" element={<RoomListingPage />} />
              <Route path="rooms/:id" element={<RoomDetailsPage />} />
              <Route path="favorites" element={<ProtectedRoute requiredRole="customer"><FavoritesPage /></ProtectedRoute>} />
              <Route path="login" element={<LoginPage />} />
              <Route path="forgot-password" element={<ForgotPasswordPage />} />
              <Route path="reset-password" element={<ResetPasswordPage />} />
              <Route path="signup" element={<SignUpPage />} />
              <Route path="checkout" element={<ProtectedRoute requiredRole="customer"><CheckoutPage /></ProtectedRoute>} />
              <Route path="confirmation" element={<ProtectedRoute requiredRole="customer"><ConfirmationPage /></ProtectedRoute>} />
              <Route path="bookings" element={<ProtectedRoute requiredRole="customer"><MyBookingsPage /></ProtectedRoute>} />
            </Route>
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route path="/admin/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/admin/reset-password" element={<ResetPasswordPage />} />
            <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminLayout /></ProtectedRoute>}>
              <Route index element={<AdminDashboardPage />} />
              <Route path="rooms" element={<AdminRoomsPage />} />
              <Route path="bookings" element={<AdminBookingsPage />} />
              <Route path="requests" element={<AdminRequestsPage />} />
              <Route path="reports" element={<AdminReportsPage />} />
              <Route path="settings" element={<AdminSettingsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </BookingProvider>
    </AuthProvider>
  );
}

export default function App() {
  if (googleClientId) {
    return (
      <GoogleOAuthProvider clientId={googleClientId}>
        <AppContent />
      </GoogleOAuthProvider>
    );
  }
  return <AppContent />;
}
