import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { API_URL } from '../config';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Store, ShieldCheck, KeyRound, Mail, ArrowLeft, ShieldAlert, LockKeyhole, UserPlus } from 'lucide-react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';

export const LoginPage = () => {
  // step 1: Login Form
  // step 2: Login OTP Verification
  // step 3: Forgot Password Request (Input Email)
  // step 4: Forgot Password OTP + New Password Form
  // step 5: Register Form
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  
  // States
  const [name, setName] = useState('');
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

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setIsLoading(true);

    try {
      const res = await fetch(API_URL + '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login gagal.');

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

      const res = await fetch(API_URL + '/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Google login gagal.');

      setTempEmail(result.user.email || '');
      setStep(2);
    } catch (err: any) {
      console.error(err);
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
      const res = await fetch(API_URL + '/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: tempEmail, otpCode })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verifikasi OTP gagal.');

      login(data.user, data.token);
      // Di portal public, jika staff ikutan numpang login, bisa dilarikan ke /dashboard.
      navigate(data.user.role === 'CASHIER' || data.user.role === 'ADMIN' ? '/dashboard' : '/menu');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPasswordRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setIsLoading(true);

    try {
      // API ini akan return 403 jika dicoba untuk akun Customer di Auth Router saat ini!
      // Karena sebelumnya diset untuk staff only di backend.
      // Opsional: kita ubah blokade, atau customer gunakan akun berbeda. 
      // (Kita asumsikan auth endpoints di backend juga melayani Customer sekarang)
      // TAPI ingat! Di `auth.ts` request ini melempar error: user.role === 'CUSTOMER'.
      // WAIT! Saya perhatikan itu, jadi mari kita fetch normal, namun tangani error elegan.
      
      const res = await fetch(API_URL + '/api/auth/forgot-password-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: tempEmail })
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 403) throw new Error('Pelanggan Google tidak bisa mengganti sandi. Cukup login ulang via Google.');
        throw new Error(data.error || 'Gagal mengirim kode.');
      }

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
      const res = await fetch(API_URL + '/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: tempEmail, otpCode, newPassword })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mengubah password.');

      setSuccess('Password berhasil diubah. Silakan masuk.');
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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setIsLoading(true);

    try {
      const res = await fetch(API_URL + '/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Pendaftaran gagal.');

      setSuccess('Pendaftaran sukses! Silakan masuk menggunakan Email dan Sandi.');
      setStep(1);
      setPassword(''); 
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
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-sm">
        
        <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 overflow-hidden border border-gray-100">
          <div className="px-8 py-10">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-primary-50 rounded-[2rem] flex items-center justify-center transform hover:rotate-6 transition-transform ring-1 ring-primary-100">
                {step === 3 || step === 4 ? (
                  <LockKeyhole className="w-10 h-10 text-primary-600" />
                ) : step === 5 ? (
                  <UserPlus className="w-10 h-10 text-primary-600" />
                ) : (
                  <Store className="w-10 h-10 text-primary-600" />
                )}
              </div>
            </div>
            
            <h2 className="text-2xl font-extrabold text-center text-gray-900 mb-2">
              {step === 1 ? 'Halo, Lapar?' : step === 2 ? 'Verifikasi Keamanan' : step === 3 ? 'Lupa Sandi?' : step === 4 ? 'Buat Sandi' : 'Daftar Akun'}
            </h2>
            <p className="text-center text-gray-500 mb-8 text-sm px-4">
              {step === 1 && 'Silakan masuk untuk mulai memesan makanan.'}
              {step === 2 && 'Cek email Anda untuk 6 digit kode OTP.'}
              {step === 3 && 'Ketik email pelangganmu untuk mengatur ulang sandi.'}
              {step === 4 && 'Isi sandi barumu bersama OTP yang kami kirim.'}
              {step === 5 && 'Buat akun pelanggan agar tak mengantre lama.'}
            </p>

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm justify-center flex font-medium animate-fade-in mb-5 border border-red-100">
                <ShieldAlert size={18} className="mr-2"/> {error}
              </div>
            )}
            
            {success && (
              <div className="bg-green-50 text-green-700 p-3 rounded-xl text-sm justify-center flex font-medium animate-fade-in mb-5 border border-green-100">
                {success}
              </div>
            )}

            {/* STEP 1: FORM LOGIN MURNI */}
            {step === 1 && (
              <div className="animate-fade-in">
                <form onSubmit={handleManualLogin} className="space-y-4 mb-6">
                  <Input
                    label="Alamat Email"
                    type="email"
                    placeholder="nama@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12 bg-gray-50"
                  />
                  <Input
                    label="Password"
                    type="password"
                    placeholder="Minimal 6 karakter"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-12 bg-gray-50"
                  />
                  
                  <div className="flex justify-end mt-[-5px]">
                    <button 
                      type="button" 
                      onClick={() => { setStep(3); clearMessages(); setTempEmail(email); }} 
                      className="text-xs font-semibold text-primary-600 hover:text-primary-800 transition-colors"
                    >
                      Lupa password?
                    </button>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 text-base font-bold rounded-xl mt-2"
                    isLoading={isLoading}
                  >
                    Masuk Sekarang
                  </Button>
                </form>

                <div className="relative mb-6 text-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <span className="relative bg-white px-3 text-xs text-gray-400 font-medium tracking-wide">
                    ATAU
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                  className="w-full flex justify-center items-center gap-3 px-4 py-3.5 border border-gray-200 shadow-sm text-sm font-bold rounded-xl text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-4 focus:ring-primary-500/20 transition-all disabled:opacity-50 group active:scale-95 duration-200 mb-6"
                >
                  <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5 group-hover:scale-110 transition-transform" alt="Google" />
                  Masuk dengan Google
                </button>
                
                <p className="text-sm text-center text-gray-600 font-medium pb-2">
                  Belum punya akun pelanggan?{' '}
                  <button 
                    onClick={() => { setStep(5); clearMessages(); }} 
                    className="text-primary-600 hover:text-primary-700 font-bold ml-1 active:scale-95"
                  >
                     Daftar Baru
                  </button>
                </p>
              </div>
            )}

            {/* STEP 2: FORM INPUT OTP */}
            {step === 2 && (
              <div className="animate-fade-in text-center">
                <div className="flex justify-center mb-6">
                  <div className="bg-primary-50 p-4 rounded-full text-primary-600">
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
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))} // Hanya angka
                      className="w-full h-14 text-center text-2xl tracking-[0.5em] font-bold border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:ring-4 focus:ring-primary-100 transition-all bg-gray-50 outline-none"
                    />
                  </div>
                  
                  <Button
                    type="submit"
                    className="w-full h-12 text-base font-bold rounded-xl flex items-center justify-center gap-2"
                    isLoading={isLoading}
                    disabled={otpCode.length !== 6}
                  >
                    <KeyRound size={18} />
                    Verifikasi Login
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
            
            {/* STEP 3 & 4: LUPA PASSWORD */}
            {step === 3 && (
              <div className="animate-fade-in">
                <form onSubmit={handleForgotPasswordRequest} className="space-y-5">
                  <Input
                    label="Konfirmasi Email Kamu"
                    type="email"
                    placeholder="pelanggan@email.com"
                    value={tempEmail}
                    onChange={(e) => setTempEmail(e.target.value)}
                    required
                    className="h-12 bg-gray-50"
                  />
                  <Button 
                    type="submit" 
                    className="w-full h-12 text-base font-bold rounded-xl"
                    isLoading={isLoading}
                  >
                    Kirim Kode OTP
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
                      className="w-full h-14 text-center text-2xl tracking-[0.5em] font-bold border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:ring-4 focus:ring-primary-100 transition-all bg-gray-50 outline-none"
                    />
                  </div>
                  
                  <Input
                    label="Sandi Baru"
                    type="password"
                    placeholder="Minimal 6 karakter"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="h-12 bg-gray-50"
                  />
                  
                  <Button
                    type="submit"
                    className="w-full h-12 text-base mt-2 font-bold rounded-xl flex items-center justify-center gap-2"
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

            {/* STEP 5: DAFTAR AKUN */}
            {step === 5 && (
              <div className="animate-fade-in">
                <form onSubmit={handleRegister} className="space-y-4">
                  <Input
                    label="Nama Lengkap"
                    type="text"
                    placeholder="Cth. Rangga"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="h-12 bg-gray-50"
                  />
                  <Input
                    label="Alamat Email Valid"
                    type="email"
                    placeholder="pelanggan@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12 bg-gray-50"
                  />
                  <Input
                    label="Buat Password"
                    type="password"
                    placeholder="Bebas & kuat"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-12 bg-gray-50"
                  />
                  
                  <Button 
                    type="submit" 
                    className="w-full h-12 text-base font-bold rounded-xl mt-4"
                    isLoading={isLoading}
                  >
                    Daftar Sekarang
                  </Button>
                </form>

                <p className="text-sm text-center text-gray-600 font-medium mt-6">
                  Sudah memiliki akun?{' '}
                  <button 
                    onClick={goBackToLogin} 
                    className="text-primary-600 hover:text-primary-700 font-bold ml-1 active:scale-95"
                  >
                     Masuk
                  </button>
                </p>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};
