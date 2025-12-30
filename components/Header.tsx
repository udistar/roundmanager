
import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="bg-slate-950/80 backdrop-blur-xl border-b border-white/5 py-8 px-6 sticky top-0 z-[60]">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-4 group cursor-pointer">
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 p-3 rounded-2xl shadow-lg shadow-emerald-900/20 group-hover:scale-110 transition-transform">
            <i className="fa-solid fa-crown text-2xl text-white"></i>
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tighter uppercase">Rounding Manager</h1>
            <p className="text-[10px] font-bold text-emerald-500 tracking-[0.3em] uppercase opacity-80">라운딩매니저 | 엘리트 골프 컨시어지</p>
          </div>
        </div>
        <nav className="hidden md:flex items-center space-x-8 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
          <a href="#" className="hover:text-white transition-colors">Service</a>
          <a href="#" className="hover:text-white transition-colors">Analytics</a>
          <a href="#" className="hover:text-white transition-colors">Vault</a>
        </nav>
      </div>
    </header>
  );
};

export default Header;
