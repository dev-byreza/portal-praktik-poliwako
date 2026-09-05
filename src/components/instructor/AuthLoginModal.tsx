// Google OAuth Login Simulation with Institutional Domain Check (PRD Section 8.1 & 93)

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  GraduationCap,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Lock,
  ArrowRight,
  Sparkles,
  Eye,
  EyeOff,
  KeyRound
} from 'lucide-react';
import { ModalPortal } from '../common/ModalPortal';

interface AuthLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthLoginModal: React.FC<AuthLoginModalProps> = ({ isOpen, onClose }) => {
  const { loginInstructor } = useApp();
  const [email, setEmail] = useState('rezaf@politekniksorowako.ac.id');
  const [password, setPassword] = useState('732401#Jhe');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const result = loginInstructor(email, password);
    if (result.success) {
      onClose();
    } else {
      setErrorMsg(result.message);
    }
  };

  const setPresetEmail = (sampleEmail: string, samplePass: string = '') => {
    setEmail(sampleEmail);
    setPassword(samplePass);
    setErrorMsg(null);
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 p-8 text-white text-center relative overflow-hidden">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-blue-500/30">
            <GraduationCap className="w-9 h-9 text-white" />
          </div>
          <h2 className="text-xl font-black tracking-tight text-white">Portal Praktik Poliwako</h2>
          <p className="text-xs text-blue-200 mt-1 font-medium">Politeknik Sorowako • Akses Khusus Instruktur</p>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Email Resmi Institusi
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="nama@politekniksorowako.ac.id"
                required
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 focus:border-blue-600 focus:bg-white rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/20 transition-all placeholder:text-slate-400"
              />
              <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                <span>Hanya domain @politekniksorowako.ac.id yang diizinkan</span>
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                  required
                  className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-300 focus:border-blue-600 focus:bg-white rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/20 transition-all placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error banner if invalid credentials */}
            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2 animate-shake">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Quick Testing Preset Buttons */}
            <div className="pt-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">
                Akun Instruktur Real:
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setPresetEmail('rezaf@politekniksorowako.ac.id', '732401#Jhe')}
                  className="p-2 text-left bg-blue-50/80 hover:bg-blue-100/80 border border-blue-200 rounded-lg text-blue-900 transition-colors"
                >
                  <p className="font-bold text-[11px] text-blue-900">Akun Real Instruktur</p>
                  <p className="text-[10px] text-blue-700 truncate">rezaf@politekniksorowako.ac.id</p>
                </button>
                <button
                  type="button"
                  onClick={() => setPresetEmail('user.external@gmail.com', 'wrongpassword')}
                  className="p-2 text-left bg-rose-50/80 hover:bg-rose-100/80 border border-rose-200 rounded-lg text-rose-900 transition-colors"
                >
                  <p className="font-bold text-[11px]">Akun Luar (Ditolak)</p>
                  <p className="text-[10px] text-rose-700 truncate">user@gmail.com</p>
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 mt-4"
            >
              <span>Masuk sebagai Instruktur</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

      </div>
    </div>
    </ModalPortal>
  );
};
