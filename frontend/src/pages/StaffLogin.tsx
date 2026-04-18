import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Store, ShieldCheck, KeyRound, Mail, ArrowLeft, ShieldAlert, LockKeyhole } from 'lucide-react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';

export const StaffLogin = () => {
  // step 1: Login Form
  // step 2: Login OTP Verification
  // step 3: Forgot Password Request (Input Email)
  // step 4: Forgot Password OTP + New Password Form
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [tempEmail, setTempEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();
  const login = useAuthStore(state => state.login);

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  const handleStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setIsLoading(true);

    try {
      const res = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');

      setTempEmail(email);
      setStep(2);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    clearMessages();
    setIsLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();

      const res = await fetch('http://localhost:5000/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Google login failed');
      
      setTempEmail(result.user.email || '');
      setStep(2);
    } catch (err: any) {
      setError(err.message || 'Gagal masuk dengan Google');
      auth.signOut().catch(console.error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setIsLoading(true);

    try {
      const res = await fetch('http://localhost:5000/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: tempEmail, otpCode })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verifikasi OTP gagal.');

      if (data.user.role === 'CUSTOMER') {
         setError('Akses Ditolak: Anda bukan Staf terdaftar.');
         setStep(1);
         return;
      }

      login(data.user, data.token);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Flow Reset Password
  const handleForgotPasswordRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setIsLoading(true);

    try {
      const res = await fetch('http://localhost:5000/api/auth/forgot-password-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: tempEmail })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mengirim kode.');

      setSuccess('Kode OTP Reset telah dikirim ke email Anda.');
      setStep(4);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPasswordCommit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setIsLoading(true);

    try {
      const res = await fetch('http://localhost:5000/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: tempEmail, otpCode, newPassword })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mengubah password.');

      // Berhasil rubah
      setSuccess('Password berhasil diubah. Silakan login kembali.');
      setStep(1);
      setOtpCode('');
      setPassword('');
      setNewPassword('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const goBackToLogin = () => {
    setStep(1);
    setOtpCode('');
    clearMessages();
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100">
          <div className="px-8 py-10">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-gray-900 rounded-2xl flex items-center justify-center transform rotate-3">
                {step === 3 || step === 4 ? (
                  <LockKeyhole className="w-8 h-8 text-white transform -rotate-3" />
                ) : (
                  <Store className="w-8 h-8 text-white transform -rotate-3" />
                )}
              </div>
            </div>
            
            <h2 className="text-2xl font-extrabold text-center text-gray-900 mb-2">
              {step === 1 ? 'Sistem Internal' : step === 2 ? 'Verifikasi Keamanan' : step === 3 ? 'Lupa Sandi' : 'Reset Sandi'}
            </h2>
            <p className="text-center text-gray-500 mb-8 text-sm px-4">
              {step === 1 && 'Pintu masuk khusus untuk Karyawan dan Administrator.'}
              {step === 2 && 'Cek Email Anda untuk Kode OTP Log masuk'}
              {step === 3 && 'Masukkan email pekerja untuk mengonfirmasi ulang sandi.'}
              {step === 4 && 'Kode OTP telah dikirimkan. Buat sandi baru Anda.'}
            </p>

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm flex items-center justify-center text-center font-medium mb-5 animate-fade-in">
                <ShieldAlert size={18} className="mr-2 shrink-0"/> {error}
              </div>
            )}
            
            {success && (
              <div className="bg-green-50 text-green-700 p-3 rounded-xl text-sm flex items-center justify-center text-center font-medium mb-5 animate-fade-in">
                {success}
              </div>
            )}

            {/* STEP 1: LOGIN MANUAL */}
            {step === 1 && (
              <div className="animate-fade-in">
                <form onSubmit={handleStaffSubmit} className="space-y-4">
                  <Input
                    label="Alamat Email Karyawan"
                    type="email"
                    placeholder="nama@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="h-12 bg-gray-50"
                  />
                  
                  <Input
                    label="Kunci Akses (Password)"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="h-12 bg-gray-50 mb-1"
                  />
                  
                  <div className="flex justify-end">
                    <button 
                      type="button" 
                      onClick={() => { setStep(3); clearMessages(); setTempEmail(email); }} 
                      className="text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors"
                    >
                      Lupa atau buat password?
                    </button>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-12 text-base mt-2 font-bold rounded-2xl bg-gray-900 hover:bg-gray-800"
                    isLoading={isLoading}
                  >
                    Otorisasi Akses
                  </Button>
                </form>

                <div className="mt-8">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-3 bg-white text-gray-400 font-medium tracking-wide">ATAU LALUAN RESMI</span>
                    </div>
                  </div>

                  <div className="mt-6">
                    <button
                      type="button"
                      onClick={handleGoogleLogin}
                      disabled={isLoading}
                      className="w-full flex justify-center items-center gap-3 px-4 py-3 border border-gray-200 shadow-sm text-sm font-bold rounded-2xl text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-4 focus:ring-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed group active:scale-95 duration-200"
                    >
                      <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5 group-hover:scale-110 transition-transform" alt="Google" />
                      Masuk dengan Email Perusahaan
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: FORM INPUT OTP LOGIN */}
            {step === 2 && (
              <div className="animate-fade-in text-center">
                <div className="flex justify-center mb-6">
                  <div className="bg-gray-900 p-4 rounded-full text-white">
                    <Mail size={28} />
                  </div>
                </div>
                <form onSubmit={handleVerifyOtp} className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Kode OTP (6 Angka)
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="• • • • • •"
                      required
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      className="w-full h-14 text-center text-2xl tracking-[0.5em] font-bold border-2 border-gray-200 rounded-xl focus:border-gray-900 focus:ring-4 focus:ring-gray-200 transition-all bg-gray-50 outline-none"
                    />
                  </div>
                  
                  <Button
                    type="submit"
                    className="w-full h-12 text-base mt-2 font-bold rounded-xl bg-gray-900 hover:bg-gray-800 flex items-center justify-center gap-2"
                    isLoading={isLoading}
                    disabled={otpCode.length !== 6}
                  >
                    <KeyRound size={18} />
                    Verifikasi OTP Staf
                  </Button>
                </form>

                <button 
                  onClick={goBackToLogin}
                  className="mt-6 text-sm text-gray-500 hover:text-gray-800 font-medium flex items-center justify-center w-full gap-2 transition-colors"
                >
                  <ArrowLeft size={16} /> Batal & Kembali
                </button>
              </div>
            )}

            {/* STEP 3: LUPA PASSWORD (MASUKKAN EMAIL) */}
            {step === 3 && (
              <div className="animate-fade-in">
                <form onSubmit={handleForgotPasswordRequest} className="space-y-5">
                  <Input
                    label="Konfirmasi Email Anda"
                    type="email"
                    placeholder="nama@email.com"
                    value={tempEmail}
                    onChange={(e) => setTempEmail(e.target.value)}
                    required
                    className="h-12 bg-gray-50"
                  />
                  <Button 
                    type="submit" 
                    className="w-full h-12 text-base font-bold rounded-xl bg-gray-900 hover:bg-gray-800"
                    isLoading={isLoading}
                  >
                    Minta Kode Reset (OTP)
                  </Button>
                </form>
                <button 
                  onClick={goBackToLogin}
                  className="mt-6 text-sm text-gray-500 hover:text-gray-800 font-medium flex items-center justify-center w-full gap-2 transition-colors"
                >
                  <ArrowLeft size={16} /> Kembali ke halaman Login
                </button>
              </div>
            )}

            {/* STEP 4: FORM RESET PASSWORD + OTP */}
            {step === 4 && (
              <div className="animate-fade-in text-left">
                <form onSubmit={handleResetPasswordCommit} className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      KODE OTP Reset (6 Angka)
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="• • • • • •"
                      required
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      className="w-full h-14 text-center text-2xl tracking-[0.5em] font-bold border-2 border-gray-200 rounded-xl focus:border-gray-900 focus:ring-4 focus:ring-gray-200 transition-all bg-gray-50 outline-none"
                    />
                  </div>
                  
                  <Input
                    label="Password Karyawan Baru"
                    type="password"
                    placeholder="Minimal 6 karakter"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="h-12 bg-gray-50"
                  />
                  
                  <Button
                    type="submit"
                    className="w-full h-12 text-base mt-2 font-bold rounded-xl bg-gray-900 hover:bg-gray-800 flex items-center justify-center gap-2"
                    isLoading={isLoading}
                    disabled={otpCode.length !== 6 || newPassword.length < 3}
                  >
                    <LockKeyhole size={18} />
                    Simpan Password
                  </Button>
                </form>

                <button 
                  onClick={goBackToLogin}
                  className="mt-6 text-sm text-gray-500 hover:text-gray-800 font-medium flex items-center justify-center w-full gap-2 transition-colors"
                >
                  <ArrowLeft size={16} /> Batal & Kembali
                </button>
              </div>
            )}

          </div>
          
          <div className="px-8 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-center">
            <p className="text-xs text-gray-400 font-medium flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-gray-300"/> Restricted Area - For Authorized Personnel Only
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
