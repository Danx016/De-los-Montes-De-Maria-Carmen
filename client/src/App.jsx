import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { AuthProvider } from './context/AuthContext'
import { CartProvider } from './context/CartContext'
import { ToastProvider } from './context/ToastContext'
import { ConfirmProvider } from './context/ConfirmContext'
import ToastPortal from './components/ToastPortal'
import GlobalSupportNotifier from './components/GlobalSupportNotifier'
import AIAssistantWidget from './components/AIAssistantWidget'
import ScrollToTop from './components/ScrollToTop'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'
import SupportRoute from './components/SupportRoute'

// Pages
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import RecoverPage from './pages/RecoverPage'
import ProfilePage from './pages/ProfilePage'
import SearchPage from './pages/SearchPage'
import CategoryPage from './pages/CategoryPage'
import CategoriasPage from './pages/CategoriasPage'
import CartPage from './pages/CartPage'
import CheckoutPage from './pages/CheckoutPage'
import PaymentPage from './pages/PaymentPage'
import VendedorPage from './pages/VendedorPage'
import VendedorPerfilPage from './pages/VendedorPerfilPage'
import VendedoresPage from './pages/VendedoresPage'
import SoportePage from './pages/SoportePage'
import AdminPage from './pages/AdminPage'
import AdminSoportePage from './pages/AdminSoportePage'
import AdminLoginPage from './pages/AdminLoginPage'
import NotFoundPage from './pages/NotFoundPage'
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '95151482078-k07kflr5nbjnjs89ntoff2dgikgsor1u.apps.googleusercontent.com'
export default function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <ToastProvider>
        <ConfirmProvider>
        <AuthProvider>
          <CartProvider>
            <BrowserRouter>
            <ScrollToTop />
            <GlobalSupportNotifier />
            <AIAssistantWidget />
            <Routes>
              {/* Rutas públicas */}
              <Route path="/" element={<HomePage />} />
              <Route path="/categorias" element={<CategoriasPage />} />
              <Route path="/catalogo" element={<CategoriasPage />} />
              <Route path="/explorar" element={<CategoriasPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/registro" element={<RegisterPage />} />
              <Route path="/recuperar" element={<RecoverPage />} />
              <Route path="/buscar" element={<SearchPage />} />
              <Route path="/categoria/:slug" element={<CategoryPage />} />
              <Route path="/vendedores" element={<VendedoresPage />} />
              <Route path="/vendedor/:id" element={<VendedorPerfilPage />} />
              <Route path="/soporte" element={<SoportePage />} />
              <Route path="/admin-login" element={<AdminLoginPage />} />

              {/* Rutas protegidas (usuario autenticado) */}
              <Route
                path="/perfil"
                element={<ProtectedRoute><ProfilePage /></ProtectedRoute>}
              />
              <Route
                path="/carrito"
                element={<ProtectedRoute><CartPage /></ProtectedRoute>}
              />
              <Route
                path="/checkout"
                element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>}
              />
              <Route
                path="/pago"
                element={<ProtectedRoute><PaymentPage /></ProtectedRoute>}
              />
              <Route
                path="/vendedor"
                element={<ProtectedRoute><VendedorPage /></ProtectedRoute>}
              />

              {/* Rutas solo Admin */}
              <Route
                path="/admin"
                element={<AdminRoute><AdminPage /></AdminRoute>}
              />

              {/* Rutas para Admin y Soporte */}
              <Route
                path="/admin/soporte"
                element={<SupportRoute><AdminSoportePage /></SupportRoute>}
              />

              {/* 404 */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </BrowserRouter>
          <ToastPortal />
        </CartProvider>
      </AuthProvider>
      </ConfirmProvider>
      </ToastProvider>
    </GoogleOAuthProvider>
  )
}
