import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, Utensils, Search, ShoppingBag, Plus, Minus, X, ArrowLeft } from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui/Button';

export const PublicMenu = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modal & Checkout sequence state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<1 | 2>(1);

  // Cart store
  const { 
    items, subtotal, tax, total, ppnRate,
    addItem, updateQuantity, 
    orderType, setOrderType, 
    customerName, setCustomerName, 
    tableNumber, setTableNumber,
    setPpnRate, clearCart
  } = useCartStore();

  const { token } = useAuthStore();
  const navigate = useNavigate();

  // On mount, load config (PPN) and products
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [ppnRes, prodRes, catRes] = await Promise.all([
          fetch('http://localhost:5000/api/settings/PPN'),
          fetch('http://localhost:5000/api/products'), 
          fetch('http://localhost:5000/api/categories') 
        ]);

        if (ppnRes.ok) {
          const ppnData = await ppnRes.json();
          setPpnRate(Number(ppnData.value) / 100);
        }

        if (prodRes.ok) {
          const data = await prodRes.json();
          setProducts(data.filter((p: any) => p.active && p.stock > 0)); 
        }

        if (catRes.ok) {
          const cat = await catRes.json();
          setCategories([{ id: 'All', name: 'All' }, ...cat]);
        }
      } catch (e) {
        console.error("Failed to load catalog", e);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [setPpnRate]);

  // Open modal / close modal handlers
  const handleOpenCart = () => {
    setCheckoutStep(1); // default
    setIsModalOpen(true);
  };

  const handleCloseCart = () => {
    setIsModalOpen(false);
  };

  const filteredProducts = products.filter(p => {
    const matchesCategory = activeCategory === 'All' || p.categoryId === activeCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleCheckout = async () => {
    if (!customerName.trim()) {
      alert("Masukkan nama pemesan terlebih dahulu");
      return;
    }
    if (orderType === 'DINE_IN' && !tableNumber.trim()) {
      alert("Masukkan nomor meja untuk layanan Dine In");
      return;
    }

    const finalCustomerName = orderType === 'DINE_IN' 
      ? `${customerName} (Meja: ${tableNumber})`
      : customerName;

    try {
      const res = await fetch('http://localhost:5000/api/transactions/customer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          items: items.map(item => ({
            productId: item.product.id,
            quantity: item.quantity,
          })),
          customerName: finalCustomerName,
          orderType
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Checkout failed');
      }

      const transaction = await res.json();
      setIsModalOpen(false);
      clearCart();
      // Redirect to status/payment detail page
      navigate(`/payment/${transaction.id}`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="flex h-screen w-full flex-col text-gray-900 bg-gray-50 overflow-hidden relative">
      
      {/* Catalog Main View */}
      <div className="flex-1 flex flex-col h-full overflow-hidden w-full max-w-7xl mx-auto pb-24">
        {/* Header / Intro */}
        <div className="bg-primary-600 text-white p-4 pb-8 lg:p-8 lg:pb-12 shadow-sm shrink-0 flex justify-between items-start rounded-b-[2rem] mx-2 mt-2 lg:mx-4 lg:mt-4 lg:rounded-3xl">
           <div>
             <h1 className="text-2xl lg:text-4xl font-bold mb-1 lg:mb-2">Halo! Mau pesan apa hari ini?</h1>
             <p className="text-primary-100 opacity-90 text-sm lg:text-lg font-medium">Pilih menu favoritmu dan pesan langsung.</p>
           </div>
           <button onClick={() => navigate('/tracking')} className="bg-white/20 hover:bg-white/30 text-white px-3 py-2 lg:px-4 lg:py-2.5 rounded-xl text-xs lg:text-sm font-semibold flex items-center transition-all shadow-sm">
             <Search size={16} className="mr-1.5 lg:mr-2" /> Lacak Pesanan
           </button>
        </div>

        {/* Filters */}
        <div className="px-4 lg:px-8 -mt-6 relative z-10 shrink-0">
          <div className="bg-white p-3 lg:p-4 rounded-2xl shadow-md border border-gray-100 flex flex-col lg:flex-row gap-3 lg:gap-4 items-center justify-between">
            <div className="flex gap-2 overflow-x-auto w-full lg:w-auto pb-1 lg:pb-0 scrollbar-hide snap-x">
              {categories.map(c => (
                <button
                  key={c.id}
                  onClick={() => setActiveCategory(c.id === 'All' ? 'All' : c.id)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all snap-start ${
                    activeCategory === (c.id === 'All' ? 'All' : c.id)
                      ? 'bg-primary-600 text-white shadow-md shadow-primary-500/20'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {c.name === 'All' ? 'Semua Kategori' : c.name}
                </button>
              ))}
            </div>
            <div className="relative w-full lg:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Cari menu..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              />
            </div>
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="h-full flex flex-col justify-center items-center text-gray-400">
               <Utensils size={48} className="mb-4 opacity-20" />
               <p>Menu tidak tersedia saat ini.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-6">
              {filteredProducts.map(product => (
                <div 
                  key={product.id} 
                  className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-xl transition-all duration-300 group flex flex-col h-full"
                >
                  <div className="h-32 lg:h-48 bg-gray-100 relative overflow-hidden group">
                    {product.image ? (
                      <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300 bg-gray-50">
                        <Store size={32} />
                      </div>
                    )}
                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl text-sm font-bold text-gray-900 shadow-sm border border-white/20">
                      Rp {product.price.toLocaleString('id-ID')}
                    </div>
                  </div>
                  <div className="p-4 lg:p-5 flex flex-col flex-1 justify-between">
                    <div className="mb-4">
                      <h3 className="font-bold text-gray-900 leading-tight mb-1 text-sm lg:text-lg line-clamp-2">{product.name}</h3>
                      <p className="text-xs text-gray-500 lg:text-sm">{product.category?.name || 'Item'}</p>
                    </div>
                    <button 
                      onClick={() => addItem(product)}
                      className="w-full bg-primary-50 text-primary-700 hover:bg-primary-600 hover:text-white py-2.5 lg:py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center active:scale-95"
                    >
                      <Plus size={18} className="mr-2" /> Tambah
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Floating Cart Button (Visible on all screens) */}
      <div className={`fixed bottom-0 left-0 right-0 z-40 transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${items.length > 0 ? 'translate-y-0' : 'translate-y-full'}`}>
         {/* Gradient fade */}
         <div className="absolute bottom-full left-0 right-0 h-16 bg-gradient-to-t from-white/90 to-transparent pointer-events-none"></div>
         <div className="bg-white pt-2 pb-6 px-4 lg:px-0 lg:pb-8 border-t border-gray-100 shadow-[0_-10px_40px_rgba(0,0,0,0.08)]">
           <div className="max-w-2xl mx-auto">
             <button 
               onClick={handleOpenCart}
               className="w-full bg-primary-600 hover:bg-primary-700 text-white p-4 rounded-2xl font-bold shadow-xl shadow-primary-500/30 flex items-center justify-between active:scale-95 transition-all"
             >
               <div className="flex items-center gap-3">
                 <div className="bg-white/20 px-3 py-1.5 rounded-xl flex items-center gap-2">
                   <ShoppingBag size={18} />
                   <span>{items.length} item</span>
                 </div>
                 <span className="hidden sm:inline opacity-80 font-medium">Lihat Keranjang</span>
               </div>
               <div className="flex items-center gap-2">
                 <span className="text-lg">Rp {Math.round(total).toLocaleString('id-ID')}</span>
                 <ArrowLeft className="rotate-180" size={20} />
               </div>
             </button>
           </div>
         </div>
      </div>

      {/* Full Modal Container */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-end lg:justify-center bg-gray-900/40 backdrop-blur-sm p-0 lg:p-6 animate-in fade-in duration-300">
           
           {/* Dismiss overlay area on desktop */}
           <div className="absolute inset-0 hidden lg:block" onClick={handleCloseCart}></div>

           <div className="relative w-full lg:w-[500px] bg-white h-[90vh] lg:h-auto lg:max-h-[85vh] rounded-t-3xl lg:rounded-3xl flex flex-col shadow-2xl animate-in slide-in-from-bottom-full lg:slide-in-from-bottom-10 duration-300">
             
             {/* Modal Header */}
             <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-white rounded-t-3xl shrink-0">
                <div className="flex items-center gap-3">
                  {checkoutStep === 2 && (
                    <button onClick={() => setCheckoutStep(1)} className="p-2 -ml-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors">
                      <ArrowLeft size={20} />
                    </button>
                  )}
                  <h2 className="text-xl font-bold text-gray-900">
                    {checkoutStep === 1 ? 'Keranjang Anda' : 'Detail Pesanan'}
                  </h2>
                </div>
                <button onClick={handleCloseCart} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors bg-gray-50">
                  <X size={20} />
                </button>
             </div>

             {/* Modal Body */}
             <div className="flex-1 overflow-y-auto bg-gray-50/50">
               
               {/* --- STEP 1: REVIEW CART --- */}
               {checkoutStep === 1 && (
                 <div className="p-6">
                    {items.length === 0 ? (
                      <div className="py-12 flex flex-col items-center justify-center text-gray-400 space-y-4">
                        <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center">
                          <ShoppingBag size={32} className="opacity-40" />
                        </div>
                        <p className="font-medium text-lg text-gray-500">Keranjang masih kosong</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {items.map((item) => (
                          <div key={item.product.id} className="flex gap-4 items-center bg-white p-3.5 rounded-2xl border border-gray-100 shadow-sm">
                            <div className="w-16 h-16 rounded-xl bg-gray-100 overflow-hidden shrink-0">
                              {item.product.image ? (
                                <img src={item.product.image} className="w-full h-full object-cover" />
                              ) : (
                                <Utensils className="w-full h-full p-4 text-gray-300" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0 pr-2">
                              <h4 className="text-base font-bold text-gray-900 truncate mb-1">{item.product.name}</h4>
                              <p className="text-sm text-primary-600 font-bold">Rp {item.product.price.toLocaleString('id-ID')}</p>
                            </div>
                            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl p-1">
                              <button 
                                onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-white hover:shadow-sm hover:text-primary-600 transition-all active:scale-95"
                              >
                                <Minus size={16} strokeWidth={2.5} />
                              </button>
                              <span className="w-6 text-center text-base font-bold text-gray-900">{item.quantity}</span>
                              <button 
                                onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-white hover:shadow-sm hover:text-primary-600 transition-all active:scale-95"
                              >
                                <Plus size={16} strokeWidth={2.5} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {items.length > 0 && (
                      <div className="mt-8 bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-3">
                        <div className="flex justify-between text-gray-500">
                          <span className="font-medium">Subtotal</span>
                          <span className="font-bold text-gray-700">Rp {subtotal.toLocaleString('id-ID')}</span>
                        </div>
                        <div className="flex justify-between text-gray-500">
                          <span className="font-medium">Pajak ({(ppnRate * 100).toFixed(0)}%)</span>
                          <span className="font-bold text-gray-700">Rp {Math.round(tax).toLocaleString('id-ID')}</span>
                        </div>
                        <div className="h-px bg-gray-100 my-2"></div>
                        <div className="flex justify-between items-end">
                          <span className="text-sm font-bold text-gray-800 uppercase tracking-wide">Total Pembayaran</span>
                          <span className="text-2xl font-black text-primary-600">Rp {Math.round(total).toLocaleString('id-ID')}</span>
                        </div>
                      </div>
                    )}
                 </div>
               )}

               {/* --- STEP 2: CUSTOMER DETAILS --- */}
               {checkoutStep === 2 && (
                 <div className="p-6 space-y-8">
                    {/* Order Type Tabs */}
                    <div className="space-y-3">
                      <label className="text-sm font-bold text-gray-900">Pesanan Untuk</label>
                      <div className="flex bg-gray-100 p-1.5 rounded-2xl">
                        <button 
                          onClick={() => setOrderType('DINE_IN')}
                          className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${orderType === 'DINE_IN' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                          Makan di Tempat
                        </button>
                        <button 
                          onClick={() => setOrderType('TAKE_AWAY')}
                          className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${orderType === 'TAKE_AWAY' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                          Bawa Pulang
                        </button>
                      </div>
                    </div>

                    {/* Inputs */}
                    <div className="space-y-5">
                       <div className="space-y-2">
                          <label className="text-sm font-bold text-gray-900">Nama Pemesan</label>
                          <input 
                            type="text" 
                            placeholder="Contoh: Budi" 
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl text-base focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all shadow-sm"
                          />
                       </div>

                       {orderType === 'DINE_IN' && (
                         <div className="space-y-2 animate-in fade-in slide-in-from-top-4 duration-300">
                            <label className="text-sm font-bold text-gray-900">Nomor Meja</label>
                            <input 
                              type="text" 
                              placeholder="Ketik nomor meja Anda..." 
                              value={tableNumber}
                              onChange={(e) => setTableNumber(e.target.value)}
                              className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl text-base focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all shadow-sm"
                            />
                         </div>
                       )}
                    </div>
                 </div>
               )}

             </div>

             {/* Modal Footer / Actions */}
             <div className="p-6 bg-white border-t border-gray-100 rounded-b-3xl shrink-0">
                {checkoutStep === 1 ? (
                  <Button 
                    className="w-full h-14 text-base lg:text-lg font-bold shadow-lg shadow-primary-500/40 rounded-2xl transition-all"
                    disabled={items.length === 0}
                    onClick={() => setCheckoutStep(2)}
                  >
                    Lanjut ke Detail Pesanan
                  </Button>
                ) : (
                  <Button 
                    className="w-full h-14 text-base lg:text-lg font-bold shadow-lg shadow-primary-500/40 rounded-2xl transition-all"
                    onClick={handleCheckout}
                  >
                    Bayar dengan QRIS
                  </Button>
                )}
             </div>

           </div>
        </div>
      )}
    </div>
  );
};
