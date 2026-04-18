import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { UserPlus, Trash2, Shield, User, AlertCircle } from 'lucide-react';

export const Employees = () => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Form state
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('CASHIER');
  const [jobTitle, setJobTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { token, user } = useAuthStore();

  useEffect(() => {
    fetchEmployees();
  }, [token]);

  const fetchEmployees = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('http://localhost:5000/api/users/employees', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch employees');
      const data = await res.json();
      setEmployees(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      const res = await fetch('http://localhost:5000/api/users/employees', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ username: email, name, role, jobTitle })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add employee');
      
      // Reset form & refresh
      setEmail('');
      setName('');
      setJobTitle('');
      setRole('CASHIER');
      fetchEmployees();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveEmployee = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin mencabut hak akses karyawan ini?')) return;
    
    try {
      const res = await fetch(`http://localhost:5000/api/users/employees/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      fetchEmployees();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (user?.role !== 'ADMIN') {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-[70vh]">
        <Shield size={64} className="text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Akses Ditolak</h2>
        <p className="text-gray-500">Hanya Super Admin yang dapat mengakses halaman ini.</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manajemen Karyawan</h1>
          <p className="text-gray-500 mt-1">Atur hak akses login menggunakan email Google perusahaan.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Form Add Employee */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm sticky top-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <UserPlus size={20} className="text-primary-600" />
              Daftarkan Karyawan
            </h2>
            
            {error && (
              <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm mb-6 flex gap-2">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}

            <form onSubmit={handleAddEmployee} className="space-y-4">
              <Input
                label="Email Pegawai (Google Account)"
                type="email"
                placeholder="nama@perusahaan.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Input
                label="Nama Panggilan / Alias"
                type="text"
                placeholder="Misal: Budi Kasir 1"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nama Jabatan Spesifik
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Contoh: Manajer Dapur"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                  />
                  <p className="text-xs text-gray-400 mt-2">Nama jabatan ini yang akan muncul di layar. Biarkan kosong jika tidak perlu spesifik.</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tingkat Izin Sistem (Otoritas Backend)
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                >
                  <option value="CASHIER">Kasir (CASHIER)</option>
                  <option value="ADMIN">Manajer Utama (ADMIN)</option>
                </select>
              </div>

              <Button type="submit" className="w-full h-12 mt-6 font-bold" isLoading={isSubmitting}>
                Daftarkan Akses
              </Button>
            </form>
          </div>
        </div>

        {/* List of Employees */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100 text-gray-500 font-medium text-sm">
                    <th className="px-6 py-4">Nama Pegawai</th>
                    <th className="px-6 py-4">Akun (Email / Username)</th>
                    <th className="px-6 py-4">Jabatan</th>
                    <th className="px-6 py-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                        Memuat data karyawan...
                      </td>
                    </tr>
                  ) : employees.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                        Belum ada karyawan terdaftar
                      </td>
                    </tr>
                  ) : (
                    employees.map((emp) => (
                      <tr key={emp.id} className="hover:bg-gray-50/50 transition">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary-50 text-primary-700 flex items-center justify-center font-bold">
                              {emp.name ? emp.name.charAt(0).toUpperCase() : <User size={20}/>}
                            </div>
                            <span className="font-bold text-gray-900">{emp.name || '-'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-600">{emp.username}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
                            emp.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {emp.jobTitle || emp.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {emp.id !== user?.id && (
                            <button
                              onClick={() => handleRemoveEmployee(emp.id)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition"
                              title="Cabut akses"
                            >
                              <Trash2 size={20} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
