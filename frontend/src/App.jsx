import { Route, Routes } from 'react-router-dom';
import Layout, { ProtectedRoute } from './components/layout/Layout.jsx';
import Home from './pages/Home.jsx';
import Catalog from './pages/Catalog.jsx';
import ProductDetail from './pages/ProductDetail.jsx';
import BookingPage from './pages/BookingPage.jsx';
import { Login, Register, ChooseLanguage } from './pages/Auth.jsx';
import ListingForm from './pages/ListingForm.jsx';
import Verification from './pages/Verification.jsx';
import UserProfile from './pages/UserProfile.jsx';
import Dashboard from './pages/dashboard/Dashboard.jsx';
import { Contact, Help, NotFound, Privacy, Terms } from './pages/InfoPages.jsx';

const protect = (el) => <ProtectedRoute>{el}</ProtectedRoute>;

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="catalog" element={<Catalog />} />
        <Route path="products/:id" element={<ProductDetail />} />
        <Route path="products/:id/book" element={protect(<BookingPage />)} />
        <Route path="users/:id" element={<UserProfile />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="welcome/language" element={protect(<ChooseLanguage />)} />
        <Route path="listings/new" element={protect(<ListingForm />)} />
        <Route path="listings/:id/edit" element={protect(<ListingForm />)} />
        <Route path="verification" element={protect(<Verification />)} />
        <Route path="dashboard/*" element={protect(<Dashboard />)} />
        <Route path="help" element={<Help />} />
        <Route path="contact" element={<Contact />} />
        <Route path="privacy" element={<Privacy />} />
        <Route path="terms" element={<Terms />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
