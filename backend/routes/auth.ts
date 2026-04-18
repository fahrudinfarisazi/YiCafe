import { Router, Response, Request } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authenticate, AuthRequest } from '../middleware/auth';
import * as admin from 'firebase-admin';
import nodemailer from 'nodemailer';

// Initialize Firebase Admin (Does not need full credentials if just verifying tokens natively using Google's public keys, but standard is passing projectId)
admin.initializeApp({
  projectId: "pos-app-b8346", // Using the project ID provided
});

const router = Router();
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretposkey';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit OTP
}

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Cari user berdasarkan email. Jika tidak ada = error 404
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: 'User tidak ditemukan' });
    }

    // Jika password bernilai null
    if (!user.password) {
      return res.status(400).json({ error: 'Akun ini terdaftar via Google. Silakan login menggunakan Google atau buat password baru.' });
    }

    // Bandingkan dengan bcrypt. Jika salah = error 401
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Kredensial tidak valid (Password salah)' });
    }

    // Generate 6-digit angka OTP acak. Set otpExpiresAt 5 menit dari sekarang.
    const otpCode = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // Simpan OTP ke database Prisma.
    await prisma.user.update({
      where: { email },
      data: { otpCode, otpExpiresAt }
    });

    // Kirim kode OTP
    await transporter.sendMail({
      from: `"QRIS POS System" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Kode OTP Login Anda - POS Application',
      text: `Kode OTP Anda adalah: ${otpCode}. Kode ini akan kadaluarsa dalam 5 menit. Tolong jangan berikan kode ini kepada siapapun.`
    });

    // Return response 200
    res.status(200).json({ message: 'OTP telah dikirim ke email' });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Gagal melakukan login' });
  }
});

router.post('/google', async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ error: 'Token Google hilang' });

    // Verify token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { email, name } = decodedToken;
    
    if (!email) return res.status(400).json({ error: 'Email tidak ditemukan dari akun Google' });

    // Cari user di database berdasarkan email.
    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Jika belum ada, otomatis buatkan dengan role CUSTOMER
      user = await prisma.user.create({
        data: {
          email,
          name: name || 'Google User',
          password: null, // biarkan null
          role: 'CUSTOMER'
        }
      });
    }

    // Setelah user ditemukan/dibuat, generate 6-digit OTP dan set 5 menit.
    const otpCode = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // Simpan OTP ke database.
    await prisma.user.update({
      where: { id: user.id },
      data: { otpCode, otpExpiresAt }
    });

    // Kirim OTP ke email user via nodemailer.
    await transporter.sendMail({
      from: `"QRIS POS System" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Kode OTP Login Anda - POS Application',
      text: `Kode OTP Anda adalah: ${otpCode}. Kode ini akan kadaluarsa dalam 5 menit. Tolong jangan berikan kode ini kepada siapapun.`
    });

    // Return response 200: "OTP telah dikirim ke email".
    res.status(200).json({ message: 'OTP telah dikirim ke email' });
  } catch (error) {
    console.error('Google Auth error:', error);
    res.status(401).json({ error: 'Token Google tidak valid atau masalah server' });
  }
});

router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otpCode } = req.body;

    if (!email || !otpCode) {
      return res.status(400).json({ error: 'Email dan Kode OTP diperlukan' });
    }

    // Cari user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: 'User tidak ditemukan' });
    }

    // Jika otpCode cocok dan otpExpiresAt belum lewat
    if (user.otpCode !== otpCode) {
      return res.status(401).json({ error: 'Kode OTP tidak valid' });
    }

    if (!user.otpExpiresAt || user.otpExpiresAt < new Date()) {
      return res.status(401).json({ error: 'Kode OTP sudah kadaluarsa (melewati 5 menit)' });
    }

    // Kosongkan otpCode dan otpExpiresAt di database
    await prisma.user.update({
      where: { email },
      data: { otpCode: null, otpExpiresAt: null }
    });

    // Generate dan berikan JWT Token
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1d' });

    res.status(200).json({
      message: 'Login berhasil',
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role }
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: 'Proses verifikasi OTP gagal' });
  }
});

router.post('/forgot-password-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email diperlukan' });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: 'Email tidak terdaftar' });
    if (user.role === 'CUSTOMER') return res.status(403).json({ error: 'Akses Ditolak: Fitur ini hanya untuk Karyawan.' });

    const otpCode = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await prisma.user.update({
      where: { email },
      data: { otpCode, otpExpiresAt }
    });

    await transporter.sendMail({
      from: `"QRIS POS System" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Reset Password - POS Application',
      text: `Permintaan reset password telah diajukan. Kode OTP Anda: ${otpCode}. Kode ini kadaluarsa dalam 5 menit.`
    });

    res.status(200).json({ message: 'Kode reset password telah dikirim ke email' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Gagal mengirim kode reset' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { email, otpCode, newPassword } = req.body;
    if (!email || !otpCode || !newPassword) return res.status(400).json({ error: 'Parameter tidak lengkap' });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: 'User tidak ditemukan' });

    if (user.otpCode !== otpCode) return res.status(401).json({ error: 'Kode OTP tidak valid' });
    if (!user.otpExpiresAt || user.otpExpiresAt < new Date()) return res.status(401).json({ error: 'Kode OTP sudah kadaluarsa' });

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { email },
      data: { password: hashedPassword, otpCode: null, otpExpiresAt: null }
    });

    res.status(200).json({ message: 'Password berhasil diubah. Silakan login kembali.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Gagal mereset password' });
  }
});

router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email dan Password wajib diisi' });

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(400).json({ error: 'Email sudah terdaftar. Silakan masuk atau Lupa sandi.' });

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.create({
      data: {
        email,
        name: name || email.split('@')[0],
        password: hashedPassword,
        role: 'CUSTOMER'
      }
    });

    res.status(201).json({ message: 'Pendaftaran berhasil. Silakan login.' });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Gagal melakukan pendaftaran akun' });
  }
});

router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, email: true, role: true }
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

export default router;
