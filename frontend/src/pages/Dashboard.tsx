import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { API_URL } from '../config';
import { TrendingUp, Users, ShoppingBag, DollarSign, Calendar, Clock, CreditCard, Wallet } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { format, subDays, isSameDay, parseISO } from 'date-fns';

export const Dashboard = () => {
  const { token, user } = useAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [paymentData, setPaymentData] = useState<any[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [transRes, prodRes] = await Promise.all([
          fetch(API_URL + '/api/transactions', {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch(API_URL + '/api/products', {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);
        
        const transactions = await transRes.json();
        const products = await prodRes.json();
        
        // Ensure transactions is an array
        const validTransactions = Array.isArray(transactions) ? transactions : [];
        const paidTransactions = validTransactions.filter((t: any) => 
          t.Status === 'PAID' || t.Status === 'COMPLETED' || 
          t.Status === 1 || t.Status === 2 || t.Status === 3 || t.Status === 4
        );
        
        // Calculate basic stats
        const totalRevenue = paidTransactions.reduce((acc: number, curr: any) => acc + curr.total, 0);
        const totalSales = paidTransactions.length;
        const activeProducts = Array.isArray(products) ? products.filter((p: any) => p.active).length : 0;
        
        // Generate chart data for the last 7 days
        const last7Days = Array.from({ length: 7 }).map((_, i) => subDays(new Date(), 6 - i));
        
        const generatedChartData = last7Days.map(date => {
          const dayTransactions = paidTransactions.filter((t: any) => 
            isSameDay(parseISO(t.createdAt), date)
          );
          
          return {
            name: format(date, 'MMM dd'),
            revenue: dayTransactions.reduce((sum: number, t: any) => sum + t.total, 0),
            orders: dayTransactions.length
          };
        });
        
        // Payment methods data
        const qrisCount = paidTransactions.filter((t: any) => t.paymentMethod === 'QRIS').length;
        const cashCount = paidTransactions.filter((t: any) => t.paymentMethod === 'CASH').length;
        
        const generatedPaymentData = [
          { name: 'QRIS', value: qrisCount, fill: '#8b5cf6' },
          { name: 'CASH', value: cashCount, fill: '#10b981' }
        ];

        setStats({
          revenue: totalRevenue,
          sales: totalSales,
          activeProducts: activeProducts,
          averageOrder: totalSales > 0 ? Math.round(totalRevenue / totalSales) : 0
        });
        
        setChartData(generatedChartData);
        setPaymentData(generatedPaymentData);
        setRecentTransactions(validTransactions.slice(0, 5)); // Last 5 transactions
      } catch (e) {
        console.error("Failed to fetch dashboard stats", e);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDashboardData();
  }, [token]);

  if (user?.role !== 'ADMIN') {
    return (
      <div className="p-8 h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-500">You need administrator privileges to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 h-full overflow-y-auto bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex flex-col md:flex-row md:justify-between md:items-end gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard Overview</h1>
            <p className="text-gray-500 mt-1">Welcome back, {user?.name}. Here's what's happening today.</p>
          </div>
          <div className="flex bg-white rounded-lg p-1 border border-gray-200 shadow-sm">
             <button className="px-4 py-2 text-sm font-medium bg-primary-50 text-primary-700 rounded-md">Last 7 Days</button>
             <button className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700">This Month</button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
             <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard 
                title="Total Revenue" 
                value={`Rp ${stats?.revenue?.toLocaleString('id-ID') || 0}`} 
                icon={<DollarSign className="text-green-600" size={24} />} 
                trend="+12.5%" 
                trendUp={true} 
              />
              <StatCard 
                title="Total Sales" 
                value={stats?.sales?.toString() || '0'} 
                icon={<TrendingUp className="text-primary-600" size={24} />} 
                trend="+5.2%" 
                trendUp={true} 
              />
              <StatCard 
                title="Average Order Value" 
                value={`Rp ${stats?.averageOrder?.toLocaleString('id-ID') || 0}`} 
                icon={<CreditCard className="text-blue-600" size={24} />} 
              />
              <StatCard 
                title="Active Products" 
                value={stats?.activeProducts?.toString() || '0'} 
                icon={<ShoppingBag className="text-purple-600" size={24} />} 
              />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Main Revenue Chart */}
              <div className="col-span-1 lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                 <h3 className="font-bold text-lg text-gray-800 mb-6">Revenue Overview (Last 7 Days)</h3>
                 <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} dy={10} />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#6b7280', fontSize: 12 }}
                          tickFormatter={(value) => `Rp${value >= 1000 ? (value / 1000) + 'k' : value}`}
                          width={60}
                        />
                        <Tooltip 
                          formatter={(value: any) => [`Rp ${Number(value).toLocaleString('id-ID')}`, 'Revenue']}
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                        />
                        <Area type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                      </AreaChart>
                    </ResponsiveContainer>
                 </div>
              </div>

              {/* Payment Methods Chart */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col">
                 <h3 className="font-bold text-lg text-gray-800 mb-6">Payment Methods</h3>
                 <div className="flex-1 min-h-[200px] w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={paymentData} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f3f4f6" />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#4b5563', fontWeight: 500 }} width={50} />
                        <Tooltip 
                          cursor={{fill: 'transparent'}}
                          formatter={(value: any) => [value, 'Transactions']} 
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                        />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={32} />
                      </BarChart>
                    </ResponsiveContainer>
                 </div>
                 <div className="grid grid-cols-2 gap-4 mt-6">
                    <div className="bg-purple-50 p-4 rounded-lg flex items-center justify-between border border-purple-100">
                      <div>
                        <p className="text-xs text-purple-600 font-medium mb-1">QRIS</p>
                        <p className="text-xl font-bold text-purple-900">{paymentData.find(d => d.name === 'QRIS')?.value || 0}</p>
                      </div>
                      <Wallet className="text-purple-400 opacity-50 h-8 w-8" />
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg flex items-center justify-between border border-green-100">
                      <div>
                        <p className="text-xs text-green-600 font-medium mb-1">CASH</p>
                        <p className="text-xl font-bold text-green-900">{paymentData.find(d => d.name === 'CASH')?.value || 0}</p>
                      </div>
                      <Banknote className="text-green-400 opacity-50 h-8 w-8" />
                    </div>
                 </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
               <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center">
                  <h3 className="font-bold text-lg text-gray-800">Recent Transactions</h3>
                  <a href="/history" className="text-sm font-medium text-primary-600 hover:text-primary-700">View All</a>
               </div>
               <div className="overflow-x-auto">
                 <table className="w-full text-left border-collapse">
                   <thead>
                     <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                       <th className="px-6 py-4 font-medium">Order ID</th>
                       <th className="px-6 py-4 font-medium">Date & Time</th>
                       <th className="px-6 py-4 font-medium">Customer/Type</th>
                       <th className="px-6 py-4 font-medium">Amount</th>
                       <th className="px-6 py-4 font-medium">Status</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100 text-sm">
                     {recentTransactions.length > 0 ? (
                       recentTransactions.map((tx: any) => (
                         <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors">
                           <td className="px-6 py-4 font-medium text-gray-900">
                              #{tx.orderId.substring(0, 8)}...
                           </td>
                           <td className="px-6 py-4 text-gray-500">
                              <div className="flex items-center">
                                <Calendar className="w-3.5 h-3.5 mr-1.5 opacity-70" />
                                {format(parseISO(tx.createdAt), 'MMM dd, yyyy')}
                                <span className="mx-2 text-gray-300">|</span>
                                <Clock className="w-3.5 h-3.5 mr-1.5 opacity-70" />
                                {format(parseISO(tx.createdAt), 'HH:mm')}
                              </div>
                           </td>
                           <td className="px-6 py-4">
                              <div className="flex flex-col">
                                <span className="font-medium text-gray-900">{tx.customerName || 'Walk-in Customer'}</span>
                                <span className="text-xs text-gray-500">{tx.orderType === 'DINE_IN' ? 'Dine In' : 'Take Away'}</span>
                              </div>
                           </td>
                           <td className="px-6 py-4 font-medium text-gray-900">
                              Rp {tx.total.toLocaleString('id-ID')}
                           </td>
                           <td className="px-6 py-4">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                ${tx.Status === 'PAID' || tx.Status === 1 || tx.Status === 'COMPLETED' || tx.Status === 4 ? 'bg-green-100 text-green-800' : 
                                  tx.Status === 'PENDING' || tx.Status === 0 ? 'bg-yellow-100 text-yellow-800' : 
                                  'bg-red-100 text-red-800'}`}
                              >
                                {tx.Status === 1 ? 'PAID' : tx.Status === 0 ? 'UNPAID' : tx.Status === 2 ? 'PREPARING' : tx.Status === 3 ? 'READY' : tx.Status === 4 ? 'FINISH' : tx.Status === 'PENDING' ? 'UNPAID' : tx.Status === 'COMPLETED' ? 'FINISH' : tx.Status}
                              </span>
                           </td>
                         </tr>
                       ))
                     ) : (
                       <tr>
                         <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                           No recent transactions found.
                         </td>
                       </tr>
                     )}
                   </tbody>
                 </table>
               </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// Simple Banknote icon since it wasn't imported from lucide-react in the top list
const Banknote = (props: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect width="20" height="12" x="2" y="6" rx="2" />
    <circle cx="12" cy="12" r="2" />
    <path d="M6 12h.01M18 12h.01" />
  </svg>
);

const StatCard = ({ title, value, icon, trend, trendUp }: any) => (
  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex flex-col hover:shadow-md transition-shadow">
    <div className="flex justify-between items-start mb-4">
      <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center">
        {icon}
      </div>
      {trend && (
        <span className={`text-sm font-medium px-2.5 py-1 rounded-full ${trendUp ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {trend}
        </span>
      )}
    </div>
    <h3 className="text-gray-500 font-medium text-sm mb-1">{title}</h3>
    <p className="text-2xl font-bold text-gray-900">{value}</p>
  </div>
);
