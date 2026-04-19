import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { API_URL } from '../config';
import { Button } from '../components/ui/Button';
import { Plus, Edit2, Trash2, X } from 'lucide-react';

export const ManageProducts = () => {
  const { token, user } = useAuthStore();
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    image: '',
    categoryId: '',
    stock: '',
    active: true
  });

  useEffect(() => {
    fetchData();
  }, [token]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        fetch(API_URL + '/api/products', { headers: { Authorization: `Bearer ${token}` } }),
        fetch(API_URL + '/api/categories', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      if (prodRes.status === 401 || catRes.status === 401) {
        alert('Sesi Anda telah habis (Session Expired). Silakan login kembali.');
        useAuthStore.getState().logout();
        return;
      }

      const [prodData, catData] = await Promise.all([prodRes.json(), catRes.json()]);
      setProducts(prodData);
      setCategories(catData);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (product?: any) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        price: product.price.toString(),
        image: product.image || '',
        categoryId: product.categoryId,
        stock: product.stock.toString(),
        active: product.active
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        price: '',
        image: '',
        categoryId: categories[0]?.id || '',
        stock: '0',
        active: true
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const payload = {
      name: formData.name,
      price: parseFloat(formData.price) || 0,
      image: formData.image || null,
      categoryId: formData.categoryId,
      stock: parseInt(formData.stock, 10) || 0,
      active: formData.active
    };

    try {
      const url = editingProduct 
        ? `${API_URL}/api/products/${editingProduct.id}`
        : `${API_URL}/api/products`;
        
      const method = editingProduct ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(payload)
      });
      
      if (res.status === 401) {
        alert('Sesi Anda telah habis (Session Expired). Silakan login kembali.');
        useAuthStore.getState().logout();
        return;
      }

      if (res.ok) {
        fetchData();
        closeModal();
      } else {
        const error = await res.json();
        alert(`Failed to save product: ${error.error}`);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    
    try {
      const res = await fetch(`${API_URL}/api/products/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.status === 401) {
        alert('Sesi Anda telah habis (Session Expired). Silakan login kembali.');
        useAuthStore.getState().logout();
        return;
      }

      if (res.ok || res.status === 204) {
        // Optimistically remove from list instead of calling fetchData
        setProducts(products.filter(p => p.id !== id));
      } else {
        const error = await res.json().catch(() => ({}));
        alert(`Failed to delete product: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error(error);
    }
  };

  if (user?.role !== 'ADMIN') {
     return <div className="p-8">Access Denied</div>;
  }

  return (
    <div className="p-8 h-full overflow-y-auto bg-gray-50 flex-1 relative">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-start items-center gap-4 mb-8">
          <Button onClick={() => handleOpenModal()}>
            <Plus className="mr-2" size={20} /> Add New Product
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Manage Products</h1>
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
                    <th className="p-4 font-semibold text-left w-24">Actions</th>
                    <th className="p-4 font-semibold w-16">Image</th>
                    <th className="p-4 font-semibold">Name</th>
                    <th className="p-4 font-semibold">Category</th>
                    <th className="p-4 font-semibold text-right">Price</th>
                    <th className="p-4 font-semibold text-right">Stock</th>
                    <th className="p-4 font-semibold text-center w-24">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {products.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4 text-left">
                        <div className="flex justify-start gap-2">
                          <Button 
                            variant="secondary" 
                            size="icon" 
                            className="h-8 w-8 text-blue-600 hover:text-blue-700 focus:ring-blue-500 hover:bg-blue-50"
                            onClick={() => handleOpenModal(p)}
                          >
                            <Edit2 size={16} />
                          </Button>
                          <Button 
                            variant="secondary" 
                            size="icon" 
                            className="h-8 w-8 text-red-600 hover:text-red-700 focus:ring-red-500 hover:bg-red-50 border-red-200"
                            onClick={() => handleDelete(p.id)}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                          {p.image ? (
                            <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                          ) : (
                             <span className="text-gray-400 text-xs text-center leading-tight">No img</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-sm font-medium text-gray-900">{p.name}</td>
                      <td className="p-4 text-sm text-gray-500">{p.category?.name || 'Uncategorized'}</td>
                      <td className="p-4 text-sm font-bold text-gray-900 text-right">
                        Rp {p.price.toLocaleString('id-ID')}
                      </td>
                      <td className="p-4 text-sm text-gray-500 text-right">{p.stock}</td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${p.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                          {p.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {products.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-gray-500">
                        No products found. Click "Add New Product" to create one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-xl font-bold text-gray-900">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                <input 
                  type="text" 
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g. Iced Latte"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price (Rp)</label>
                  <input 
                    type="number" 
                    required
                    min="0"
                    step="500"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    value={formData.price}
                    onChange={e => setFormData({...formData, price: e.target.value})}
                    placeholder="e.g. 25000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock</label>
                  <input 
                    type="number" 
                    required
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    value={formData.stock}
                    onChange={e => setFormData({...formData, stock: e.target.value})}
                    placeholder="e.g. 50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select 
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  value={formData.categoryId}
                  onChange={e => setFormData({...formData, categoryId: e.target.value})}
                >
                  <option value="" disabled>Select a category</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {categories.length === 0 && (
                   <p className="text-xs text-red-500 mt-1">Please create categories first or run setup.</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Image URL (Optional)</label>
                <input 
                  type="url" 
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  value={formData.image}
                  onChange={e => setFormData({...formData, image: e.target.value})}
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              <div className="flex items-center mt-2">
                <input 
                  type="checkbox" 
                  id="active"
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  checked={formData.active}
                  onChange={e => setFormData({...formData, active: e.target.checked})}
                />
                <label htmlFor="active" className="ml-2 block text-sm text-gray-900">
                  Product is active and visible
                </label>
              </div>

              <div className="pt-4 flex justify-start gap-3 border-t border-gray-100 mt-6">
                <Button type="submit">
                  {editingProduct ? 'Update Product' : 'Create Product'}
                </Button>
                <Button type="button" variant="secondary" onClick={closeModal}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
