import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { Store, LogOut } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export const PublicLayout = () => {
  const { isAuthenticated, logout, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return (
    <div className="flex flex-col min-h-screen w-full bg-gray-50">
      {/* Header */}
      <header className="h-16 bg-white border-b border-gray-200 flex justify-between items-center px-4 md:px-6 sticky top-0 z-50 shadow-sm">
        <div className="flex items-center">
          <Store className="h-6 w-6 text-primary-600 mr-2" />
          <span className="text-xl font-bold tracking-tight text-gray-900">YiCafe</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700 hidden sm:inline">Hi, {user?.name}</span>
          <button onClick={logout} className="text-gray-500 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-gray-100">
            <LogOut size={20} />
          </button>
        </div>
      </header>
      
      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
};
