import React, { useState } from 'react';

interface NavbarProps {
  onOpenSignup: (source: string) => void;
  onTrack: (eventName: string, payload?: Record<string, unknown>) => void;
  isAuthenticated: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenSignup, onTrack, isAuthenticated }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMobile = () => {
    const nextState = !mobileMenuOpen;
    setMobileMenuOpen(nextState);
    onTrack(nextState ? 'mobile_menu_open' : 'mobile_menu_close');
  };

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        
        <a 
          href={isAuthenticated ? '/dashboard/' : '/'}
          aria-label="TuitEase home"
          className="flex items-center group focus:outline-none" 
          onClick={() => onTrack('nav_logo_click')}
        >
          <img
            src="/assets/tuitease-logo.png"
            alt=""
            className="h-16 w-16 object-contain transition-transform group-hover:scale-105"
          />
        </a>

        {/* Desktop Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
          <a href="#how-it-works" className="hover:text-emerald-600 transition-colors" onClick={() => onTrack('nav_link_click', { target: 'how-it-works' })}>How it works</a>
          <a href="#features" className="hover:text-emerald-600 transition-colors" onClick={() => onTrack('nav_link_click', { target: 'features' })}>Features</a>
          <a href="#who-its-for" className="hover:text-emerald-600 transition-colors" onClick={() => onTrack('nav_link_click', { target: 'who-its-for' })}>Who it's for</a>
          <a href="#pricing" className="hover:text-emerald-600 transition-colors" onClick={() => onTrack('nav_link_click', { target: 'pricing' })}>Pricing</a>
          <a href="#faq" className="hover:text-emerald-600 transition-colors" onClick={() => onTrack('nav_link_click', { target: 'faq' })}>FAQ</a>
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-4">
          <a
            href={isAuthenticated ? '/dashboard/' : '/signin/'}
            className="text-sm font-semibold text-slate-600 hover:text-slate-900 px-3 py-2"
          >
            {isAuthenticated ? 'Dashboard' : 'Sign in'}
          </a>
          <button 
            onClick={() => onOpenSignup('navbar')} 
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl font-bold text-sm text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm shadow-emerald-600/30 hover:shadow-md hover:shadow-emerald-600/40 hover:-translate-y-0.5 transition-all"
          >
            {isAuthenticated ? 'Open dashboard' : 'Start free'}
          </button>
        </div>

        {/* Mobile Hamburger Toggle */}
        <div className="md:hidden flex items-center">
          <button 
            onClick={toggleMobile} 
            aria-label="Toggle navigation menu" 
            className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none"
          >
            {mobileMenuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 bg-white px-4 pt-3 pb-6 space-y-3">
          <a href="#how-it-works" className="block py-2 text-base font-semibold text-slate-700 hover:text-emerald-600" onClick={() => setMobileMenuOpen(false)}>How it works</a>
          <a href="#features" className="block py-2 text-base font-semibold text-slate-700 hover:text-emerald-600" onClick={() => setMobileMenuOpen(false)}>Features</a>
          <a href="#who-its-for" className="block py-2 text-base font-semibold text-slate-700 hover:text-emerald-600" onClick={() => setMobileMenuOpen(false)}>Who it's for</a>
          <a href="#pricing" className="block py-2 text-base font-semibold text-slate-700 hover:text-emerald-600" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
          <a href="#faq" className="block py-2 text-base font-semibold text-slate-700 hover:text-emerald-600" onClick={() => setMobileMenuOpen(false)}>FAQ</a>
          <div className="pt-2 flex flex-col gap-2">
            <a
              href={isAuthenticated ? '/dashboard/' : '/signin/'}
              onClick={() => setMobileMenuOpen(false)}
              className="w-full py-3 rounded-xl border border-slate-200 text-center font-bold text-slate-700 hover:bg-slate-50"
            >
              {isAuthenticated ? 'Dashboard' : 'Sign in'}
            </a>
            <button 
              onClick={() => { setMobileMenuOpen(false); onOpenSignup('mobile_nav'); }} 
              className="w-full py-3 rounded-xl font-bold text-center text-white bg-emerald-600 hover:bg-emerald-700 shadow-md"
            >
              {isAuthenticated ? 'Open dashboard' : 'Start free'}
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
