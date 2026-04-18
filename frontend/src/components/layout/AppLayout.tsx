import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { 
  Store, 
  History, 
  LayoutDashboard, 
  Package, 
  LogOut,
  ShoppingBag,
  Users,
  CheckCircle2, 
  Bell 
} from 'lucide-react';
import { Button } from '../ui/Button';

export const AppLayout = () => {
  const { user, isAuthenticated, logout, token } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [newOrdersCount, setNewOrdersCount] = useState(0);

  useEffect(() => {
    if (!isAuthenticated || !token) return;
    
    const checkNewOrders = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/transactions', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const transactions = await res.json();
          // Filter for paid self-service orders (Status = 1 and no cashierId)
          const newSelfService = transactions.filter((t: any) => 
             (String(t.Status) === '1' || t.Status === 'PAID') && !t.cashierId
          );
          setNewOrdersCount(newSelfService.length);
        }
      } catch (e) {
        console.error('Failed to fetch new orders', e);
      }
    };

    checkNewOrders();
    const intervalId = setInterval(checkNewOrders, 10000);
    return () => clearInterval(intervalId);
  }, [isAuthenticated, token]);

  // Auto redirect logic for cashiers trying to access admin pages
  React.useEffect(() => {
    if (user?.role === 'CASHIER') {
      const restrictedPaths = ['/dashboard', '/products', '/employees'];
      if (restrictedPaths.includes(location.pathname)) {
        navigate('/');
      }
    }
  }, [user, location.pathname, navigate]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role === 'CUSTOMER') {
    return <Navigate to="/menu" replace />;
  }

  const menuItems = [
    { path: '/', icon: Store, label: 'Kios POS' },
    { path: '/orders', icon: ShoppingBag, label: 'Active Orders' },
    { path: '/history', icon: History, label: 'Transactions' }
  ];

  if (user?.role === 'ADMIN') {
    menuItems.push({ path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' });
    menuItems.push({ path: '/products', icon: Package, label: 'Products' });
    menuItems.push({ path: '/employees', icon: Users, label: 'Pegawai' });
  }

  return (
    <div className="flex h-screen w-full bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-dark-bg text-white flex flex-col transition-all duration-300">
        <div className="h-16 flex items-center px-6 border-b border-dark-border">
          <Store className="h-6 w-6 text-primary-500 mr-2" />
          <span className="text-xl font-bold tracking-tight">YiCafe</span>
        </div>

        <div className="flex-1 py-6 px-4 space-y-2">
          {menuItems.map((item) => (
            <NavItem 
              key={item.path} 
              href={item.path} 
              icon={<item.icon size={20} />} 
              label={item.label} 
              exact={item.path === '/'} 
            />
          ))}
        </div>

        <div className="p-4 border-t border-dark-border mt-auto">
          <div className="flex items-center mb-4 px-2">
            <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-sm font-medium">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="ml-3 overflow-hidden">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-gray-400 truncate">{user?.role}</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            className="w-full justify-start text-gray-300 hover:text-white hover:bg-dark-surface" 
            onClick={logout}
          >
            <LogOut size={18} className="mr-2" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full relative overflow-hidden">
        {newOrdersCount > 0 && (
          <div className="absolute top-6 right-6 z-50 animate-fade-in group">
            <button 
              onClick={() => navigate('/orders')}
              className="bg-white p-3 rounded-full shadow-xl border border-gray-100 hover:shadow-2xl transition-all relative flex items-center justify-center hover:scale-105 active:scale-95"
            >
              <Bell className="text-primary-600 w-6 h-6 animate-pulse" />
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-sm animate-bounce border-2 border-white">
                {newOrdersCount}
              </span>
            </button>
            <div className="absolute top-14 right-0 w-48 bg-white text-sm text-gray-700 p-3 rounded-xl shadow-lg border border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none mt-2">
               Ada <strong className="text-primary-600">{newOrdersCount}</strong> pesanan mandiri yang belum diproses!
            </div>
          </div>
        )}
        <Outlet />
      </main>
    </div>
  );
};

const NavItem = ({ icon, label, href, exact }: { icon: React.ReactNode, label: string, href: string, exact?: boolean }) => {
  return (
    <NavLink 
      to={href}
      end={exact}
      className={({ isActive }) => `flex items-center px-3 py-2.5 rounded-lg transition-colors duration-200 ${
        isActive 
          ? 'bg-primary-600/20 text-primary-500 font-medium' 
          : 'text-gray-300 hover:bg-dark-surface hover:text-white'
      }`}
    >
      <span className="mr-3">{icon}</span>
      {label}
    </NavLink>
  );
}
