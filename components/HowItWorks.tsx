import React from 'react';

interface HowItWorksProps {
  onOpenSignup: (source: string) => void;
}

export const HowItWorks: React.FC<HowItWorksProps> = ({ onOpenSignup }) => {
  return (
    <section id="how-it-works" className="py-20 lg:py-28 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-emerald-600 mb-2">
            Simple 3-Step Flow
          </h2>
          <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            From idea to a sold-out class in three easy steps.
          </h3>
          <p className="mt-4 text-slate-600 text-base sm:text-lg">
            No coding, no website to build, and no complicated dashboards. Everything takes under 2 minutes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          
          {/* Step 1 */}
          <div className="bg-white rounded-2xl p-8 border border-slate-200/90 shadow-sm relative z-10 flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white font-black text-xl flex items-center justify-center mb-6 shadow-md shadow-emerald-600/20">
                1
              </div>
              <h4 className="text-xl font-bold text-slate-900 mb-3">Create your class</h4>
              <p className="text-slate-600 text-sm leading-relaxed">
                Enter your class title, description, ticket price, seat capacity, and schedule. Choose online (Zoom/Google Meet), offline (with venue address), or hybrid.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Optional: Enable 2 or 3 installment payments
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-white rounded-2xl p-8 border border-slate-200/90 shadow-sm relative z-10 flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white font-black text-xl flex items-center justify-center mb-6 shadow-md shadow-emerald-600/20">
                2
              </div>
              <h4 className="text-xl font-bold text-slate-900 mb-3">Share your booking link</h4>
              <p className="text-slate-600 text-sm leading-relaxed">
                Drop your clean, mobile-optimized link into your WhatsApp status, Instagram bio, Twitter, or group chats. Students click and book without creating an account.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Automatic seat locking prevents overselling
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-white rounded-2xl p-8 border border-slate-200/90 shadow-sm relative z-10 flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white font-black text-xl flex items-center justify-center mb-6 shadow-md shadow-emerald-600/20">
                3
              </div>
              <h4 className="text-xl font-bold text-slate-900 mb-3">We handle the rest</h4>
              <p className="text-slate-600 text-sm leading-relaxed">
                TuitEase collects money directly to your Paystack subaccount, sends booking confirmations, chases unpaid installments, and nudges students on WhatsApp before class.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              You get a 7:00 AM WhatsApp summary every morning
            </div>
          </div>

        </div>

        <div className="mt-12 text-center">
          <button 
            onClick={() => onOpenSignup('how_it_works')}
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm text-white bg-emerald-600 hover:bg-emerald-700 shadow-md"
          >
            <span>Try creating your first class now</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>

      </div>
    </section>
  );
};
