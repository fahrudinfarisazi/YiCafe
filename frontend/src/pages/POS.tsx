import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { API_URL } from '../config';
import { useCartStore } from '../store/cartStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Search, Plus, Minus, Trash2, ShoppingCart, QrCode } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Receipt } from '../components/Receipt';

export const POSPage = () => {
  const { token } = useAuthStore();
  const navigate = useNavigate();
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCashModal, setShowCashModal] = useState(false);
  const [cashAmount, setCashAmount] = useState<string>('');
  const [finishedTransaction, setFinishedTransaction] = useState<any>(null);

  const {
    items, subtotal, tax, total,
    addItem, removeItem, updateQuantity, clearCart,
    orderType, setOrderType, paymentMethod, setPaymentMethod, customerName, setCustomerName
  } = useCartStore();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        fetch(API_URL + '/api/products', { headers: { Authorization: `Bearer ${token}` } }),
        fetch(API_URL + '/api/categories', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      const prods = await prodRes.json();
      const cats = await catRes.json();
      
      setProducts(prods);
      setCategories(cats);
    } catch (error) {
      console.error('Failed to fetch POS data', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckout = async () => {
    if (items.length === 0) return;
    
    // For Cash, verify cash input if the modal isn't open yet
    if (paymentMethod === 'CASH' && !showCashModal) {
      setShowCashModal(true);
      return;
    }
    
    // If it's cash and modal is open, validate amount
    const numericCash = parseInt(cashAmount.replace(/\D/g, '') || '0', 10);
    if (paymentMethod === 'CASH' && numericCash < Math.round(total)) {
      alert(`Uang kurang! Minimum Rp ${Math.round(total).toLocaleString('id-ID')}`);
      return;
    }

    setShowCashModal(false);
    setIsProcessing(true);

    try {
      const res = await fetch(API_URL + '/api/transactions/cashier', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          items: items.map(item => ({
            productId: item.product.id,
            quantity: item.quantity,
            price: item.product.price // Optional, backend ignores it now but fine
          })),
          orderType,
          paymentMethod,
          customerName
        }),
      });

      if (!res.ok) throw new Error('Checkout failed');
      const transaction = await res.json();
      
      const completedItems = items.map(i => ({ product: i.product, quantity: i.quantity, priceAtTime: i.product.price }));
      clearCart();
      if (paymentMethod === 'QRIS') {
        navigate(`/payment/${transaction.id}`);
      } else {
        setFinishedTransaction({ 
           ...transaction, 
           items: completedItems
        });
      }
      
    } catch (error) {
      console.error(error);
      alert('Checkout failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesCat = activeCategory === 'all' || p.categoryId === activeCategory;
    return matchesSearch && matchesCat && p.active;
  });

  return (
    <div className="flex h-full w-full bg-gray-50 overflow-hidden">
      
      {/* Products Section (Left) */}
      <div className="flex-1 flex flex-col h-full overflow-hidden border-r border-gray-200">
        
        {/* Header/Filters */}
        <div className="p-4 bg-white border-b border-gray-200 z-10 flex flex-col gap-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <Input 
              placeholder="Search products..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-12 text-lg shadow-sm"
            />
          </div>
          
          <div className="flex overflow-x-auto pb-1 gap-2 scrollbar-hide">
            <Button 
              variant={activeCategory === 'all' ? 'primary' : 'secondary'}
              onClick={() => setActiveCategory('all')}
              className="whitespace-nowrap rounded-full px-5"
            >
              All Items
            </Button>
            {categories.map(cat => (
              <Button 
                key={cat.id}
                variant={activeCategory === cat.id ? 'primary' : 'secondary'}
                onClick={() => setActiveCategory(cat.id)}
                className="whitespace-nowrap rounded-full px-5"
              >
                {cat.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50">
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredProducts.map((product) => (
                <div 
                  key={product.id}
                  onClick={() => addItem(product)}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-primary-300 transition-all duration-200 cursor-pointer overflow-hidden flex flex-col group active:scale-95"
                >
                  <div className="aspect-square bg-gray-100 relative overflow-hidden">
                    {product.image ? (
                      <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="flex items-center justify-center h-full w-full bg-gradient-to-br from-primary-50 to-primary-100 text-primary-300">
                        <ShoppingCart size={40} />
                      </div>
                    )}
                    <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md shadow-sm">
                      <p className="text-sm font-bold text-gray-900">Rp {product.price.toLocaleString('id-ID')}</p>
                    </div>
                  </div>
                  <div className="p-3 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-800 line-clamp-2 leading-tight">{product.name}</h3>
                      <p className="text-xs text-gray-500 mt-1">{product.category?.name}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cart Section (Right) */}
      <div className="w-96 bg-white flex flex-col h-full shadow-lg z-20">
        
        {/* Cart Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-100 font-semibold text-lg text-gray-800">
          <div className="flex items-center">
            <ShoppingCart className="mr-2 h-5 w-5 text-primary-500" />
            Current Order
          </div>
          <span className="bg-primary-50 text-primary-700 py-1 px-3 rounded-full text-sm">
            {items.reduce((acc, item) => acc + item.quantity, 0)} Items
          </span>
        </div>

        {/* Order Details (Cashier Input) */}
        <div className="px-4 pt-4 pb-2 space-y-3 border-b border-gray-100 bg-gray-50/30">
          <Input 
            placeholder="Customer Name / Table Number" 
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="h-10 text-sm"
          />
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button 
              onClick={() => setOrderType('DINE_IN')}
              className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${orderType === 'DINE_IN' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Dine In
            </button>
            <button 
              onClick={() => setOrderType('TAKE_AWAY')}
              className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${orderType === 'TAKE_AWAY' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Take Away
            </button>
          </div>
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button 
              onClick={() => setPaymentMethod('CASH')}
              className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${paymentMethod === 'CASH' ? 'bg-primary-600 shadow-sm text-white' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Cash
            </button>
            <button 
              onClick={() => setPaymentMethod('QRIS')}
              className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${paymentMethod === 'QRIS' ? 'bg-primary-600 shadow-sm text-white' : 'text-gray-500 hover:text-gray-700'}`}
            >
              QRIS
            </button>
          </div>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <ShoppingCart size={48} className="mb-4 text-gray-200" />
              <p>Cart is empty</p>
              <p className="text-sm mt-1">Select products to add</p>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.product.id} className="flex flex-col p-3 rounded-xl border border-gray-100 bg-gray-50/50 group animate-fade-in">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-gray-800 pr-2 leading-tight">{item.product.name}</h4>
                  <p className="font-semibold text-gray-900 whitespace-nowrap">
                    Rp {(item.product.price * item.quantity).toLocaleString('id-ID')}
                  </p>
                </div>
                
                <div className="flex items-center justify-between mt-auto">
                  <p className="text-xs text-gray-500">Rp {item.product.price.toLocaleString('id-ID')} @</p>
                  
                  <div className="flex items-center bg-white rounded-lg border border-gray-200 p-0.5 shadow-sm">
                    <button 
                      onClick={(e) => { e.stopPropagation(); updateQuantity(item.product.id, item.quantity - 1); }}
                      className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                    >
                      <Minus size={16} />
                    </button>
                    <span className="w-8 text-center font-medium text-sm">{item.quantity}</span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); addItem(item.product); }}
                      className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-md transition-colors"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Cart Totals & Checkout */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 mt-auto">
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-gray-600 text-sm">
              <span>Subtotal</span>
              <span>Rp {subtotal.toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between text-gray-600 text-sm">
              <span>Tax (11%)</span>
              <span>Rp {Math.round(tax).toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between text-xl font-bold text-gray-900 pt-2 border-t border-gray-200 mt-2">
              <span>Total</span>
              <span>Rp {Math.round(total).toLocaleString('id-ID')}</span>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="danger" 
              className="px-4" 
              onClick={clearCart}
              disabled={items.length === 0 || isProcessing}
            >
              <Trash2 size={20} />
            </Button>
            <Button 
              className="flex-1 h-14 text-lg shadow-md group border-transparent focus:ring-0"
              style={{ backgroundColor: paymentMethod === 'CASH' ? '#16a34a' : undefined }}
              onClick={handleCheckout}
              disabled={items.length === 0 || isProcessing}
              isLoading={isProcessing}
            >
              {paymentMethod === 'QRIS' ? (
                 <><QrCode size={24} className="mr-2 group-hover:scale-110 transition-transform" /> Pay QRIS</>
              ) : (
                 <>Complete Cash Order</>
              )}
            </Button>
          </div>
        </div>
      </div>
      {showCashModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 animate-scale-up">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Input Cash Amount</h3>
            <p className="text-sm text-gray-500 mb-4">Total: Rp {Math.round(total).toLocaleString('id-ID')}</p>
            <div className="mb-4">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Cash Receive</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">Rp</span>
                <input 
                  type="text" 
                  value={cashAmount}
                  onChange={(e) => {
                     const val = e.target.value.replace(/\D/g, '');
                     setCashAmount(val ? Number(val).toLocaleString('id-ID') : '');
                  }}
                  className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-bold"
                  placeholder="0"
                  autoFocus
                />
              </div>
            </div>
            
            {(parseInt(cashAmount.replace(/\D/g, '') || '0', 10) >= Math.round(total)) && (
              <div className="mb-6 p-3 bg-green-50 rounded-xl border border-green-100 flex justify-between items-center text-green-800">
                <span className="font-medium text-sm">Change:</span>
                <span className="font-bold text-lg">
                  Rp {(parseInt(cashAmount.replace(/\D/g, ''), 10) - Math.round(total)).toLocaleString('id-ID')}
                </span>
              </div>
            )}
            
            <div className="flex gap-3">
              <button 
                onClick={() => setShowCashModal(false)}
                className="flex-1 px-4 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button 
                onClick={handleCheckout}
                disabled={parseInt(cashAmount.replace(/\D/g, '') || '0', 10) < Math.round(total) || isProcessing}
                className="flex-[2] px-4 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 disabled:opacity-50 transition-all flex justify-center items-center"
              >
                {isProcessing ? <div className="animate-spin h-5 w-5 border-2 border-white/40 border-t-white rounded-full"></div> : 'Confirm Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {finishedTransaction && (
         <Receipt 
           transaction={finishedTransaction} 
           cashAmount={parseInt(cashAmount.replace(/\D/g, '') || '0', 10)}
           onClose={() => {
              setFinishedTransaction(null);
              setCashAmount('');
           }} 
         />
      )}
    </div>
  );
};
