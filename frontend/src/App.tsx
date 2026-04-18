import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { PublicLayout } from './components/layout/PublicLayout';
import { LoginPage } from './pages/Login';
import { StaffLogin } from './pages/StaffLogin';
import { POSPage } from './pages/POS';
import { PaymentPage } from './pages/Payment';
import { TransactionHistory } from './pages/History';
import { Dashboard } from './pages/Dashboard';
import { ManageProducts } from './pages/Products';
import { PublicMenu } from './pages/PublicMenu';
import { OrderTrackingPage } from './pages/OrderTracking';
import { OrdersPage } from './pages/Orders';
import { Employees } from './pages/Employees';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/staff" element={<StaffLogin />} />
        
        {/* Public Routes for Customers */}
        <Route element={<PublicLayout />}>
          <Route path="/menu" element={<PublicMenu />} />
          <Route path="/payment/:transactionId" element={<PaymentPage />} />
          <Route path="/tracking" element={<OrderTrackingPage />} />
          <Route path="/tracking/:orderId" element={<OrderTrackingPage />} />
        </Route>

        {/* Protected Routes for Cashiers/Admins */}
        <Route element={<AppLayout />}>
          <Route path="/" element={<POSPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/history" element={<TransactionHistory />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/products" element={<ManageProducts />} />
          <Route path="/employees" element={<Employees />} />
        </Route>
        
        <Route path="*" element={<Navigate to="/menu" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
