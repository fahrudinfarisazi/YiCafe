import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Search, Clock, CheckCircle2, Package, XCircle, ChevronRight, Store } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const getStatusDetails = (status: number) => {
  switch (status) {
    case 0: return { label: 'Unpaid / Menunggu Pembayaran', color: 'bg-yellow-100 text-yellow-800', icon: <Clock size={16} /> };
    case 1: return { label: 'Paid / Menunggu Disiapkan', color: 'bg-blue-100 text-blue-800', icon: <Package size={16} /> };
    case 2: return { label: 'Preparing / Sedang Dimasak', color: 'bg-orange-100 text-orange-800', icon: <Package size={16} /> };
    case 3: return { label: 'Ready / Siap Diambil', color: 'bg-green-100 text-green-800', icon: <CheckCircle2 size={16} /> };
    case 4: return { label: 'Finish / Selesai', color: 'bg-gray-100 text-gray-800', icon: <CheckCircle2 size={16} /> };
    case 5: 
    case 6: 
    case 7: return { label: 'Cancelled / Batal', color: 'bg-red-100 text-red-800', icon: <XCircle size={16} /> };
    default: return { label: 'Unknown', color: 'bg-gray-100 text-gray-800', icon: <Clock size={16} /> };
  }
};

export const OrderTrackingPage = () => {
  const { orderId } = useParams(); // E.g., if navigated from checkout
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const { token, user } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMyOrders = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`http://localhost:5000/api/transactions/customer/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!res.ok) {
          throw new Error('Failed to fetch orders');
        }
        const data = await res.json();
        setOrders(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMyOrders();
  }, [token]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col w-full">
      <div className="flex-1 overflow-y-auto px-4 py-8 lg:px-8 max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate('/menu')} className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
            <ChevronRight size={24} className="rotate-180 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Pesanan Saya</h1>
            <p className="text-gray-500 text-sm">Riwayat pesanan yang pernah dibuat oleh akun ini.</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 font-medium">
            Error: {error}
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center p-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border border-gray-100 flex flex-col items-center justify-center text-center shadow-sm">
            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <Package size={48} className="text-gray-300" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Belum Ada Pesanan</h3>
            <p className="text-gray-500">Kamu belum pernah memesan apapun menggunakan akun ini.</p>
            <button onClick={() => navigate('/menu')} className="mt-6 bg-primary-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-primary-700 transition">
              Pesan Sekarang
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => {
              const status = getStatusDetails(order.Status);
              const isNewlyCreated = order.id === orderId;

              return (
                <div 
                  key={order.id} 
                  onClick={() => navigate(`/payment/${order.id}`)}
                  className={`bg-white rounded-3xl p-5 lg:p-6 shadow-sm border border-b-4 hover:border-primary-500 cursor-pointer transition-all active:scale-[0.98] ${isNewlyCreated ? 'border-primary-500 ring-4 ring-primary-500/10' : 'border-gray-100'}`}
                >
                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h2 className="text-xl font-black text-gray-900 tracking-tight">{order.orderId}</h2>
                        <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-md uppercase">
                          {order.orderType === 'DINE_IN' ? 'Makan Di Tempat' : 'Bawa Pulang'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 font-medium">{new Date(order.createdAt).toLocaleString('id-ID')}</p>
                    </div>
                    <div className={`px-4 py-2 rounded-xl flex items-center gap-2 font-bold text-sm ${status.color}`}>
                      {status.icon}
                      {status.label}
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-2xl p-4 mb-4">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Daftar Item</h3>
                    <div className="space-y-3">
                      {order.items.map((item: any) => (
                        <div key={item.id} className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-100">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                               {item.product.image ? (
                                 <img src={item.product.image} className="w-full h-full object-cover rounded-lg" />
                               ) : (
                                 <Store size={20} className="text-gray-400" />
                               )}
                            </div>
                            <div>
                               <p className="font-bold text-gray-900 text-sm">{item.product.name}</p>
                               <p className="text-xs text-gray-500">{item.quantity}x @ Rp {item.priceAtTime.toLocaleString('id-ID')}</p>
                            </div>
                          </div>
                          <span className="font-bold text-primary-600 text-sm">
                            Rp {(item.quantity * item.priceAtTime).toLocaleString('id-ID')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-between items-center px-4 py-3 bg-primary-50 rounded-xl border border-primary-100 text-primary-900">
                     <span className="font-bold text-sm">Total Pembayaran ({order.paymentMethod})</span>
                     <span className="text-xl font-black">Rp {order.total.toLocaleString('id-ID')}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
