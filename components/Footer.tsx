import React from 'react';

interface FooterProps {
  onOpenSignup: (source: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenSignup }) => {
  return (
    <footer className="bg-slate-950 text-slate-400 py-16 border-t border-slate-900 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-slate-800/80">
          
          {/* Brand Col */}
          <div className="md:col-span-1">
            <a href="/" aria-label="TuitEase home" className="inline-flex mb-4">
              <img src="/assets/tuitease-logo.png" alt="" className="h-16 w-16 object-contain" />
            </a>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              The all-in-one class automation platform for workshop hosts, trainers, and tutors across Nigeria and Africa.
            </p>
            <p className="text-[11px] text-slate-500">
              Proudly built for African educators & creators.
            </p>
          </div>

          {/* Product Col */}
          <div>
            <h5 className="text-xs font-bold uppercase tracking-wider text-white mb-4">Product</h5>
            <ul className="space-y-2.5 text-xs">
              <li><a href="#how-it-works" className="hover:text-emerald-400 transition-colors">How it works</a></li>
              <li><a href="#features" className="hover:text-emerald-400 transition-colors">Features</a></li>
              <li><a href="#pricing" className="hover:text-emerald-400 transition-colors">Pricing & Payouts</a></li>
              <li><a href="#faq" className="hover:text-emerald-400 transition-colors">FAQ</a></li>
              <li><button onClick={() => onOpenSignup('footer_demo')} className="hover:text-emerald-400 transition-colors">Public Class Demo</button></li>
            </ul>
          </div>

          {/* Hosts Col */}
          <div>
            <h5 className="text-xs font-bold uppercase tracking-wider text-white mb-4">Who it's for</h5>
            <ul className="space-y-2.5 text-xs">
              <li><a href="#who-its-for" className="hover:text-emerald-400 transition-colors">Tech Bootcamps</a></li>
              <li><a href="#who-its-for" className="hover:text-emerald-400 transition-colors">Tutors & Exam Prep</a></li>
              <li><a href="#who-its-for" className="hover:text-emerald-400 transition-colors">Fitness & Dance</a></li>
              <li><a href="#who-its-for" className="hover:text-emerald-400 transition-colors">Baking & Crafts</a></li>
              <li><a href="#who-its-for" className="hover:text-emerald-400 transition-colors">Community Leaders</a></li>
            </ul>
          </div>

          {/* Support & Trust */}
          <div>
            <h5 className="text-xs font-bold uppercase tracking-wider text-white mb-4">Support & Trust</h5>
            <ul className="space-y-2.5 text-xs">
              <li>Support email coming soon</li>
              <li>WhatsApp contact coming soon</li>
              <li><a href="#" className="hover:text-emerald-400 transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition-colors">NDPR & Data Protection</a></li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <div>
            &copy; {new Date().getFullYear()} TuitEase Inc. All rights reserved.
          </div>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-slate-300">Twitter / X</a>
            <a href="#" className="hover:text-slate-300">LinkedIn</a>
            <a href="#" className="hover:text-slate-300">Instagram</a>
            <a href="#" className="hover:text-slate-300">YouTube</a>
          </div>
        </div>

      </div>
    </footer>
  );
};
