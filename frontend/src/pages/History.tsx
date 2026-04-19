import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { API_URL } from '../config';
import { Printer } from 'lucide-react';
import { Receipt } from '../components/Receipt';

export const TransactionHistory = () => {
  const { token, user } = useAuthStore();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [receiptTx, setReceiptTx] = useState<any>(null);
  const [dateFilter, setDateFilter] = useState('today');

  useEffect(() => {
    fetchTransactions();
  }, [token]);

  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(API_URL + '/api/transactions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setTransactions(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this order? Stock will be returned for CASH payments.')) return;
    try {
      const res = await fetch(`${API_URL}/api/transactions/${id}/cancel`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.status === 401) {
        alert('Sesi Anda telah habis (Session Expired). Silakan login kembali.');
        useAuthStore.getState().logout();
        return;
      }
      
      if (res.ok) {
        fetchTransactions();
      } else {
        const error = await res.json().catch(() => ({}));
        alert(`Failed to cancel order: ${error.error || 'Unknown error'}`);
      }
    } catch (e) {
      console.error(e);
      alert('Error cancelling order');
    }
  };

  const handlePrint = async (tx: any) => {
    if (tx.isPrinted) {
      alert("Struk ini sudah pernah dicetak dan tidak dapat dicetak ulang.");
      return;
    }
    
    try {
      const res = await fetch(`${API_URL}/api/transactions/track/${tx.id}`);
      if (res.ok) {
         const fullTx = await res.json();
         setReceiptTx(fullTx);
         
         // Mark as printed
         await fetch(`${API_URL}/api/transactions/${tx.id}/print`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${token}` }
         });
         
         // Optimistically update local state
         setTransactions(prev => prev.map(t => t.id === tx.id ? { ...t, isPrinted: true } : t));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const getStatusString = (status: any) => {
    if (typeof status === 'number') {
      switch(status) {
        case 0: return 'UNPAID';
        case 1: return 'PAID';
        case 2: return 'PREPARING';
        case 3: return 'READY';
        case 4: return 'FINISH';
        case 5: return 'FAILED';
        case 6: return 'EXPIRED';
        case 7: return 'CANCELLED';
        default: return 'UNKNOWN';
      }
    }
    if (status === 'PENDING') return 'UNPAID';
    if (status === 'COMPLETED') return 'FINISH';
    return status || 'UNKNOWN';
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'PAID':
      case 'COMPLETED':
      case 'FINISH': return 'bg-green-100 text-green-800';
      case 'PENDING':
      case 'UNPAID':
      case 'PREPARING':
      case 'READY': return 'bg-blue-100 text-blue-800';
      case 'EXPIRED': return 'bg-orange-100 text-orange-800';
      case 'FAILED': 
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Date filtering
  const now = new Date();
  const filteredTransactions = transactions.filter(t => {
    if (dateFilter === 'all') return true;
    const tDate = new Date(t.createdAt);
    const diffTime = Math.abs(now.getTime() - tDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (dateFilter === 'today') return diffDays <= 1;
    if (dateFilter === '7days') return diffDays <= 7;
    if (dateFilter === '1month') return diffDays <= 30;
    if (dateFilter === '1year') return diffDays <= 365;
    return true;
  });

  const handleExportCSV = () => {
    const headers = ['Order ID', 'Date', 'Cashier', 'Customer', 'Type', 'Payment Method', 'Status', 'Total'];
    const rows = filteredTransactions.map(t => [
      t.orderId,
      new Date(t.createdAt).toLocaleString('id-ID'),
      t.cashier?.name || 'Walk-in',
      t.customerName || '',
      t.orderType,
      t.paymentMethod || '-',
      getStatusString(t.Status || t.status),
      t.total
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `transactions_${dateFilter}.csv`;
    link.click();
  };

  return (
    <div className="p-8 h-full overflow-y-auto bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Transaction History</h1>
        
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <select 
              value={dateFilter} 
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-sm font-medium focus:ring-primary-500 focus:border-primary-500 shadow-sm"
            >
              <option value="today">Hari Ini</option>
              <option value="7days">7 Hari Terakhir</option>
              <option value="1month">1 Bulan Terakhir</option>
              <option value="1year">1 Tahun Terakhir</option>
              <option value="all">Semua Waktu</option>
            </select>
          </div>
          <button 
            onClick={handleExportCSV}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold shadow-sm flex items-center transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4 4m4-4v12"></path></svg>
            Export Excel (CSV)
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {isLoading ? (
            <div className="p-12 flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 text-sm uppercase tracking-wider">
                    <th className="p-4 font-semibold text-center">Actions</th>
                    <th className="p-4 font-semibold">Order ID</th>
                    <th className="p-4 font-semibold">Date</th>
                    <th className="p-4 font-semibold">Cashier</th>
                    <th className="p-4 font-semibold">Status</th>
                    <th className="p-4 font-semibold text-right">Total Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredTransactions.map(t => (
                    <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4 text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handlePrint(t)}
                            disabled={t.isPrinted}
                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors border flex items-center ${t.isPrinted ? 'bg-gray-50 text-gray-400 border-gray-100 cursor-not-allowed' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200'}`}
                            title={t.isPrinted ? "Sudah Dicetak" : "Print Receipt"}
                          >
                            <Printer size={14} className="mr-1" /> {t.isPrinted ? 'Printed' : 'Print'}
                          </button>
                          {![4, 5, 6, 7, 'COMPLETED', 'FAILED', 'EXPIRED', 'CANCELLED'].includes(t.Status ?? t.status) && (
                            <button 
                              onClick={() => handleCancel(t.id)}
                              className="bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1.5 rounded-md text-xs font-medium transition-colors border border-red-200"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-sm font-medium text-gray-900">{t.orderId}</td>
                      <td className="p-4 text-sm text-gray-500">
                        {new Date(t.createdAt).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="p-4 text-sm text-gray-700">{t.cashier?.name || 'Unknown'}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusColor(getStatusString(t.Status || t.status))}`}>
                          {getStatusString(t.Status || t.status)}
                        </span>
                      </td>
                      <td className="p-4 text-sm font-bold text-gray-900 text-right">
                        Rp {t.total.toLocaleString('id-ID')}
                      </td>
                    </tr>
                  ))}
                  {filteredTransactions.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-gray-500">
                        No transactions found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      {receiptTx && <Receipt transaction={receiptTx} onClose={() => setReceiptTx(null)} />}
    </div>
  );
};
