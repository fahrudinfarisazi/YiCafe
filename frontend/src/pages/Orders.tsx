import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { Utensils, CheckCircle2, Clock, Printer } from 'lucide-react';
import { Receipt } from '../components/Receipt';

interface Transaction {
  id: string;
  orderId: string;
  customerName: string;
  orderType: string;
  Status: number;
  paymentMethod: string;
  total: number;
  items: { quantity: number; product: { name: string } }[];
  createdAt: string;
}

export const OrdersPage = () => {
  const { token } = useAuthStore();
  const [orders, setOrders] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [receiptTx, setReceiptTx] = useState<any>(null);

  const fetchOrders = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/transactions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        // Only show active or recently completed orders that need cashier attention
        // PENDING (Cash hasn't paid, or QRIS hasn't scanned yet)
        // PAID (QRIS paid or Cash paid, needs preparation)
        // PREPARING (cooking)
        // READY (ready for pickup/serving)
        // PAID(1), PREPARING(2), READY(3) mapped temporarily to Ints, if we stick to the older string, status would be 'PAID'.
        // Since the backend returned 0/1, we'll map or just use the literal values. Let's assume Status is number or string.
        setOrders(data.filter((o: Transaction) => {
          const s = String(o.Status);
          return ['1', '2', '3', 'PAID', 'PREPARING', 'READY'].includes(s);
        }));
      }
    } catch (e) {
      console.error('Failed to fetch orders', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    // Poll every 10 seconds for new orders
    const intervalId = setInterval(fetchOrders, 10000);
    return () => clearInterval(intervalId);
  }, [token]);

  const updateStatus = async (id: string, newStatus: string | number) => {
    setOrders(orders.map(o => o.id === id ? { ...o, Status: newStatus as any } : o));
    try {
      const res = await fetch(`http://localhost:5000/api/transactions/${id}/status`, {
        method: 'PATCH',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus }) // API still expects lowercase parameter
      });
      if (!res.ok) {
        // Revert on failure
        fetchOrders();
      }
    } catch (e) {
      console.error('Failed to update status', e);
      fetchOrders();
    }
  };

  const getStatusColor = (status: any) => {
    const s = String(status);
    switch (s) {
      case 'PAID':
      case '1': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'PREPARING':
      case '2': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'READY':
      case '3': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const activeOrders = orders.filter(o => {
    const s = String(o.Status);
    return ['1', '2', 'PAID', 'PREPARING'].includes(s);
  });
  
  const readyOrders = orders.filter(o => {
    const s = String(o.Status);
    return ['3', 'READY'].includes(s);
  });
  
  const handlePrint = (order: Transaction) => {
    // order items need to be formatted slightly to match Receipt expectations if needed.
    // The Receipt component requires `priceAtTime` or `product.price`. And `product.name`.
    setReceiptTx(order);
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 flex-1 overflow-hidden">
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0 shadow-sm z-10">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center">
          <Utensils className="mr-3 text-primary-600" /> Kitchen & Orders
        </h1>
        <div className="flex gap-4 text-sm font-medium">
          <div className="bg-yellow-50 text-yellow-700 px-3 py-1.5 rounded-lg border border-yellow-200">
             New/Preparing: {activeOrders.length}
          </div>
          <div className="bg-green-50 text-green-700 px-3 py-1.5 rounded-lg border border-green-200">
             Ready: {readyOrders.length}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
             <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
             <CheckCircle2 size={64} className="mb-4 text-gray-300" />
             <p className="text-xl font-medium text-gray-500">All caught up!</p>
             <p>No active orders at the moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-start">
            
            {/* Active / Preparing Column */}
            <div className="flex flex-col gap-4">
               <h2 className="text-lg font-bold text-gray-700 mb-2 flex items-center">
                 <Clock className="w-5 h-5 mr-2" /> Active Orders
               </h2>
               {activeOrders.map(order => (
                 <OrderCard key={order.id} order={order} getStatusColor={getStatusColor} updateStatus={updateStatus} onPrint={() => handlePrint(order)} />
               ))}
               {activeOrders.length === 0 && (
                 <div className="p-8 border-2 border-dashed border-gray-200 rounded-xl text-center text-gray-400">
                    No active orders
                 </div>
               )}
            </div>

            {/* Ready Column */}
            <div className="flex flex-col gap-4">
               <h2 className="text-lg font-bold text-gray-700 mb-2 flex items-center">
                 <CheckCircle2 className="w-5 h-5 mr-2" /> Ready to Serve
               </h2>
               {readyOrders.map(order => (
                 <OrderCard key={order.id} order={order} getStatusColor={getStatusColor} updateStatus={updateStatus} onPrint={() => handlePrint(order)} />
               ))}
               {readyOrders.length === 0 && (
                  <div className="p-8 border-2 border-dashed border-gray-200 rounded-xl text-center text-gray-400">
                    No orders ready
                 </div>
               )}
            </div>

          </div>
        )}
      </div>
      {receiptTx && <Receipt transaction={receiptTx} onClose={() => setReceiptTx(null)} />}
    </div>
  );
};

const OrderCard = ({ order, getStatusColor, updateStatus, onPrint }: { order: Transaction, getStatusColor: (status: any) => string, updateStatus: (id: string, status: any) => void, onPrint: () => void }) => {
  return (
    <div className={`bg-white rounded-2xl shadow-sm border-2 overflow-hidden transition-all ${
       (String(order.Status) === 'READY' || String(order.Status) === '3') ? 'border-green-200 shadow-green-100' : 'border-gray-100 hover:border-primary-300 hover:shadow-md'
    }`}>
      <div className={`px-4 py-3 flex justify-between items-start border-b border-gray-100 ${
         order.orderType === 'TAKE_AWAY' ? 'bg-orange-50' : 'bg-blue-50'
      }`}>
         <div>
           <div className="flex items-center gap-2 mb-1">
             <span className="font-bold text-lg text-gray-900">{order.customerName || 'Guest'}</span>
             <span className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                order.orderType === 'TAKE_AWAY' ? 'bg-orange-200 text-orange-800' : 'bg-blue-200 text-blue-800'
             }`}>
                {order.orderType.replace('_', ' ')}
             </span>
           </div>
           <p className="text-xs text-gray-500 font-medium">#{order.orderId.substring(0, 15)}...</p>
         </div>
         <span className={`text-xs px-2.5 py-1 rounded-lg font-bold border ${getStatusColor(order.Status)}`}>
           {String(order.Status) === '1' ? 'PAID' : String(order.Status) === '2' ? 'PREPARING' : String(order.Status) === '3' ? 'READY' : order.Status}
         </span>
      </div>
      
      <div className="p-4 bg-white">
        <ul className="space-y-3 mb-6">
          {order.items.map((item, idx) => (
            <li key={idx} className="flex items-start text-sm">
               <span className="font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded mr-3 min-w-[32px] text-center">
                 {item.quantity}x
               </span>
               <span className="font-medium text-gray-800 pt-0.5">{item.product?.name || 'Deleted Product'}</span>
            </li>
          ))}
        </ul>

        <div className="flex gap-2 mt-auto">
          {(String(order.Status) === 'PAID' || String(order.Status) === '1') && (
            <button 
              onClick={() => updateStatus(order.id, 2)}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm shadow-blue-500/30 flex items-center justify-center"
            >
              Start Preparing
            </button>
          )}
          {(String(order.Status) === 'PREPARING' || String(order.Status) === '2') && (
            <button 
              onClick={() => updateStatus(order.id, 3)}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm shadow-green-500/30 flex items-center justify-center"
            >
              Mark as Ready
            </button>
          )}
          {(String(order.Status) === 'READY' || String(order.Status) === '3') && (
            <button 
              onClick={() => updateStatus(order.id, 4)}
              className="flex-1 bg-gray-800 hover:bg-gray-900 text-white py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm flex items-center justify-center"
            >
              Finish & Clear
            </button>
          )}
          <button 
            onClick={onPrint}
            className="w-12 bg-gray-100 hover:bg-gray-200 text-gray-600 py-2.5 rounded-xl transition-all shadow-sm flex items-center justify-center shrink-0"
            title="Print Receipt"
          >
            <Printer size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
