import React from 'react';
import { format, parseISO } from 'date-fns';

interface ReceiptProps {
  transaction: any;
  cashAmount?: number;
  changeAmount?: number;
  onClose: () => void;
}

export const Receipt: React.FC<ReceiptProps> = ({ transaction, cashAmount, changeAmount, onClose }) => {
  if (!transaction) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 print:p-0 print:bg-white print:block shadow-none print:w-full print:h-full">
      {/* Container for Web UI */}
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm flex flex-col max-h-[90vh] print:shadow-none print:max-w-full print:h-auto print:rounded-none">
        
        {/* Printable Area */}
        <div id="printable-receipt" className="p-6 bg-white shrink-0 print:p-0 print:w-full text-gray-900 font-mono text-sm">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold uppercase tracking-wider">YiCafe</h2>
            <p className="text-xs text-gray-500 mt-1">Jl. Contoh Alamat No. 123<br/>Telp: 08123456789</p>
          </div>

          <div className="border-b border-dashed border-gray-300 pb-3 mb-3 text-xs">
            <div className="flex justify-between mb-1">
              <span>Order ID</span>
              <span className="font-semibold">#{transaction.orderId?.substring(0, 10)}</span>
            </div>
            <div className="flex justify-between mb-1">
              <span>Date</span>
              <span>{transaction.createdAt ? format(parseISO(transaction.createdAt), 'dd MMM yyyy HH:mm') : format(new Date(), 'dd MMM yyyy HH:mm')}</span>
            </div>
            <div className="flex justify-between mb-1">
              <span>Customer</span>
              <span>{transaction.customerName || 'Walk-in'}</span>
            </div>
            <div className="flex justify-between">
              <span>Type</span>
              <span>{transaction.orderType === 'TAKE_AWAY' ? 'Take Away' : 'Dine In'}</span>
            </div>
          </div>

          <div className="border-b border-dashed border-gray-300 pb-3 mb-3">
            <table className="w-full text-xs">
              <tbody>
                {transaction.items?.map((item: any, idx: number) => (
                  <tr key={idx} className="align-top">
                    <td className="py-1">
                       <div>{item.product?.name || 'Item'}</div>
                       <div className="text-gray-500">{item.quantity} x {item.priceAtTime ? item.priceAtTime.toLocaleString('id-ID') : (item.product?.price || 0).toLocaleString('id-ID')}</div>
                    </td>
                    <td className="py-1 text-right whitespace-nowrap align-bottom">
                       Rp {((item.priceAtTime || item.product?.price || 0) * item.quantity).toLocaleString('id-ID')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-b border-dashed border-gray-300 pb-3 mb-3 text-xs space-y-1">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>Rp {(transaction.subtotal || 0).toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Tax</span>
              <span>Rp {Math.round(transaction.tax || 0).toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between text-sm font-bold mt-2">
              <span>Total</span>
              <span>Rp {Math.round(transaction.total || 0).toLocaleString('id-ID')}</span>
            </div>
          </div>

          <div className="text-xs space-y-1 mb-6">
            <div className="flex justify-between">
              <span>Payment Method</span>
              <span className="font-semibold">{transaction.paymentMethod}</span>
            </div>
            {transaction.paymentMethod === 'CASH' && cashAmount !== undefined && (
               <>
                 <div className="flex justify-between">
                   <span>Cash</span>
                   <span>Rp {cashAmount.toLocaleString('id-ID')}</span>
                 </div>
                 <div className="flex justify-between">
                   <span>Change</span>
                   <span>Rp {((changeAmount !== undefined) ? changeAmount : Math.max(0, cashAmount - Math.round(transaction.total))).toLocaleString('id-ID')}</span>
                 </div>
               </>
            )}
          </div>

          <div className="text-center text-xs text-gray-500">
            <p className="font-semibold mb-1">Thank You!</p>
            <p>Please come again.</p>
          </div>
          
          {/* Divider / Cut Line */}
          <div className="my-8 text-center text-gray-400 print:my-6">
             ---------------- CUT HERE ----------------
          </div>

          {/* Kitchen Receipt */}
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold uppercase tracking-wider">KITCHEN TICKET</h2>
            <p className="text-xs font-bold mt-1">Order #{transaction.orderId?.substring(0, 10)}</p>
          </div>

          <div className="border-b border-dashed border-gray-300 pb-3 mb-3 text-xs">
            <div className="flex justify-between mb-1">
              <span>Date</span>
              <span>{transaction.createdAt ? format(parseISO(transaction.createdAt), 'dd MMM yyyy HH:mm') : format(new Date(), 'dd MMM yyyy HH:mm')}</span>
            </div>
            <div className="flex justify-between mb-1">
              <span>Customer</span>
              <span className="font-bold text-sm">{transaction.customerName || 'Walk-in'}</span>
            </div>
            <div className="flex justify-between">
              <span>Type</span>
              <span className="font-bold">{transaction.orderType === 'TAKE_AWAY' ? 'Take Away' : 'Dine In'}</span>
            </div>
          </div>

          <div className="pb-3 mb-3">
            <table className="w-full text-sm font-bold">
              <tbody>
                {transaction.items?.map((item: any, idx: number) => (
                  <tr key={idx} className="align-top border-b border-gray-100">
                    <td className="py-2 pr-2">
                       {item.quantity}x
                    </td>
                    <td className="py-2">
                       {item.product?.name || 'Item'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Web UI Actions (Hidden in print) */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3 print:hidden shrink-0 mt-auto rounded-b-2xl">
          <button 
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
          <button 
            onClick={handlePrint}
            className="flex-1 px-4 py-2.5 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 shadow-md shadow-primary-500/30 transition-all flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
            Print
          </button>
        </div>
      </div>
    </div>
  );
};
