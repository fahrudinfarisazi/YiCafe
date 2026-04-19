import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import { API_URL } from '../config';
import { ArrowLeft, Clock, Package, CheckCircle2, QrCode, Utensils, AlertCircle } from 'lucide-react';

export const PaymentPage = () => {
  const { transactionId } = useParams();
  const { token } = useAuthStore();
  const clearCart = useCartStore(state => state.clearCart);
  const navigate = useNavigate();
  
  const [qrisUrl, setQrisUrl] = useState<string | null>(null);
  const [statusCode, setStatusCode] = useState<number | string>('LOADING');
  const [orderId, setOrderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [txDetails, setTxDetails] = useState<any>(null);

  useEffect(() => {
    const fetchTx = async () => {
      try {
        const res = await fetch(`${API_URL}/api/transactions/track/${transactionId}`);
        if (res.ok) {
          const data = await res.json();
          setTxDetails(data);
          if (data.Status !== undefined) setStatusCode(data.Status);
        }
      } catch (err) {
        console.error('Failed to fetch details', err);
      }
    };
    if (transactionId) fetchTx();
  }, [transactionId]);
  
  useEffect(() => {
    const generateQris = async () => {
      try {
        const res = await fetch(`${API_URL}/api/payments/qris/${transactionId}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to generate QRIS');
        
        setQrisUrl(data.qrisUrl);
        setOrderId(data.orderId);
        if (statusCode === 'LOADING') setStatusCode(0); 
        
      } catch (err: any) {
        console.error('QRIS error', err.message);
      }
    };
    
    if (transactionId && (statusCode === 'LOADING' || statusCode === 0)) {
      generateQris();
    }
  }, [transactionId, token, statusCode]);

  useEffect(() => {
    if (!orderId || statusCode === 1 || statusCode === 4 || statusCode === 5 || statusCode === 6 || statusCode === 7) return;

    const intervalId = setInterval(async () => {
      try {
        const res = await fetch(`${API_URL}/api/payments/status/${orderId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (res.ok) {
          const data = await res.json();
          if (typeof data.Status === 'number') {
            setStatusCode(data.Status);
            if (data.Status === 1) clearCart();
            if (data.Status !== 0) clearInterval(intervalId);
          } else if (data.Status === 'PAID') {
            setStatusCode(1);
            clearCart();
            clearInterval(intervalId);
          } else if (data.Status === 'EXPIRED') {
            setStatusCode(6);
            clearInterval(intervalId);
          }
        }
      } catch (e) {
        console.error('Polling failed', e);
      }
    }, 3000);

    return () => clearInterval(intervalId);
  }, [orderId, statusCode, token, clearCart]);

  const getStepIndex = () => {
    if (statusCode === 0) return 0;
    if (statusCode === 1 || statusCode === 2) return 1;
    if (statusCode === 3) return 2;
    if (statusCode === 4) return 3;
    return 0;
  };
  
  const stepIndex = getStepIndex();
  const actualSubtotal = txDetails?.items?.reduce((acc: number, cur: any) => acc + (cur.quantity * cur.priceAtTime), 0) || 0;
  const tax = txDetails ? txDetails.total - actualSubtotal : 0;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col w-full text-gray-900 font-sans sm:items-center">
      <div className="w-full max-w-md bg-gray-50 flex-1 flex flex-col relative pb-24 shadow-2xl border-x border-gray-100">
        
        {/* Header */}
        <header className="flex items-center p-5 sticky top-0 bg-white/80 backdrop-blur-xl z-50 border-b border-gray-200 shadow-sm">
          <button onClick={() => navigate('/tracking')} className="p-2 -ml-2 bg-white rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition mr-4">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold tracking-tight text-gray-900">Status Pesanan</h1>
        </header>

        <div className="px-5 flex flex-col gap-6 mt-6 overflow-y-auto">
          
          {/* Main Card (Order ID) */}
          <div className="bg-gradient-to-br from-primary-500 to-orange-500 rounded-3xl p-6 relative overflow-hidden shadow-lg shadow-primary-500/20 text-white">
            <div className="relative z-10">
              <p className="text-white/80 text-sm font-semibold tracking-wide uppercase mb-1">Nomor Pesanan</p>
              <h2 className="text-3xl font-black tracking-widest drop-shadow-sm">
                {txDetails?.orderId || orderId || 'MEMUAT...'}
              </h2>
            </div>
            {/* Soft decorative elements */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl z-0" />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/20 backdrop-blur-md rounded-2xl border border-white/20 shadow-inner z-10">
              <Package size={32} className="text-white drop-shadow-md" />
            </div>
          </div>

          {/* Info Tags */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col gap-5">
            <div className="flex flex-wrap gap-2.5">
              <span className="bg-gray-100 text-gray-600 px-4 py-1.5 rounded-full text-sm font-bold shadow-sm">
                {statusCode === 0 ? 'Menunggu' : statusCode === 4 ? 'Selesai' : 'Diproses'}
              </span>
              <span className={`px-4 py-1.5 rounded-full text-sm font-bold shadow-sm ${statusCode === 0 ? 'bg-red-50 text-red-600 ring-1 ring-red-200' : 'bg-green-50 text-green-600 ring-1 ring-green-200'}`}>
                {statusCode === 0 ? 'Belum Dibayar' : 'Sudah Dibayar'}
              </span>
            </div>
            
            <div className="flex items-center gap-6 text-sm text-gray-500 font-semibold border-t border-gray-50 pt-4">
              <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg">
                <Utensils size={16} className="text-primary-600" />
                {txDetails?.orderType === 'TAKE_AWAY' ? 'Take-away' : 'Dine-in'}
              </div>
              <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg">
                <QrCode size={16} className="text-primary-600" />
                {txDetails?.paymentMethod || 'QRIS'}
              </div>
            </div>
          </div>

          {/* Stepper Card */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <div className="flex justify-between relative px-2">
              {/* Line Track */}
              <div className="absolute top-6 left-6 right-6 h-1.5 bg-gray-100 rounded-full -z-1" />
              {/* Active Line Track */}
              <div 
                className="absolute top-6 left-6 h-1.5 bg-primary-500 rounded-full transition-all duration-700 ease-out" 
                style={{ width: `${(stepIndex / 3) * 100 - 15}%`, minWidth: stepIndex > 0 ? '10%' : '0%' }} 
              />

              {[
                { label: 'Menunggu', icon: <Clock size={20} /> },
                { label: 'Diproses', icon: <Utensils size={20} /> },
                { label: 'Siap', icon: <Package size={20} /> },
                { label: 'Selesai', icon: <CheckCircle2 size={20} /> }
              ].map((step, idx) => {
                const isActive = idx === stepIndex;
                const isPassed = idx < stepIndex;
                
                return (
                  <div key={idx} className="flex flex-col items-center gap-3 z-10 w-16">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${
                      isActive ? 'bg-primary-500 shadow-[0_4px_16px_rgba(255,122,0,0.3)] text-white ring-4 ring-primary-500/20 scale-110' : 
                      isPassed ? 'bg-white text-primary-500 border-2 border-primary-500 text-opacity-80 scale-100' : 
                      'bg-white text-gray-300 border-2 border-gray-100 scale-95'
                    }`}>
                      {step.icon}
                    </div>
                    <span className={`text-[11px] font-bold tracking-tight whitespace-nowrap ${isActive ? 'text-primary-600' : isPassed ? 'text-gray-700' : 'text-gray-400'}`}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* QR Code Section */}
          {statusCode === 0 && (
            <div className="bg-white rounded-3xl p-6 border-2 border-primary-100 flex flex-col items-center animate-fade-in shadow-xl shadow-primary-500/5 relative overflow-hidden">
              <div className="absolute top-0 w-full h-1 bg-primary-500 animate-pulse"></div>
              <h3 className="text-gray-900 font-bold text-lg mb-1 mt-2">Scan & Bayar</h3>
              <p className="text-gray-500 text-sm mb-6">Gunakan aplikasi e-wallet apa pun.</p>
              
              {qrisUrl ? (
                <div className="bg-white p-4 rounded-2xl ring-1 ring-gray-100 shadow-sm relative group cursor-pointer hover:shadow-md transition">
                  <img src={qrisUrl} alt="QR Code" className="w-56 h-56 object-contain" />
                  <div className="absolute inset-0 bg-black/5 rounded-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition duration-300" />
                </div>
              ) : (
                <div className="w-56 h-56 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col gap-4 items-center justify-center bg-gray-50">
                  <div className="animate-spin h-8 w-8 border-4 border-gray-200 border-t-primary-500 rounded-full"></div>
                  <span className="text-gray-400 text-sm font-medium">Memuat QRIS...</span>
                </div>
              )}
              {error && (
                <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm font-medium mt-6 flex items-start gap-2 w-full">
                  <AlertCircle size={16} className="mt-0.5 shrink-0"/> 
                  <p>{error}</p>
                </div>
              )}
            </div>
          )}

          {/* Detail Pesanan Card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-6 overflow-hidden">
            <div className="bg-gray-50 px-5 py-4 border-b border-gray-100">
              <h3 className="text-gray-900 font-bold">Detail Pesanan</h3>
            </div>
            
            <div className="p-5 flex flex-col gap-5">
              <div className="flex flex-col gap-4">
                {txDetails?.items?.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-start gap-4">
                    <div>
                      <p className="text-gray-900 font-bold text-sm leading-tight">{item.quantity}x {item.product?.name}</p>
                      <p className="text-gray-500 text-xs font-medium mt-1">@ Rp {item.priceAtTime.toLocaleString('id-ID')}</p>
                    </div>
                    <p className="text-gray-900 font-bold text-sm shrink-0">
                      Rp {(item.quantity * item.priceAtTime).toLocaleString('id-ID')}
                    </p>
                  </div>
                ))}
              </div>

              <div className="border-t border-dashed border-gray-200 my-1" />

              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center text-sm font-medium">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="text-gray-900">Rp {actualSubtotal.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between items-center text-sm font-medium">
                  <span className="text-gray-500">Pajak (11.00%)</span>
                  <span className="text-gray-900">Rp {tax.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-gray-900 font-black">Total</span>
                  <span className="text-xl font-black text-primary-600">Rp {txDetails?.total?.toLocaleString('id-ID') || 0}</span>
                </div>
              </div>
            </div>
          </div>
          
        </div>

        {/* Bottom Fixed Action */}
        <div className="fixed sm:absolute bottom-0 left-0 right-0 p-5 bg-white/90 backdrop-blur-md border-t border-gray-100">
          <button 
            onClick={() => navigate('/menu')} 
            className="w-full bg-primary-600 text-white font-bold py-4 rounded-2xl hover:bg-primary-700 active:scale-[0.98] transition-all shadow-xl shadow-primary-600/20 flex items-center justify-center gap-2"
          >
            <Utensils size={18} />
            Pesan Lagi
          </button>
        </div>

      </div>
    </div>
  );
};
