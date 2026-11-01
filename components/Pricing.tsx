import React from 'react';

interface PricingProps {
  onOpenSignup: (source: string) => void;
}

export const Pricing: React.FC<PricingProps> = ({ onOpenSignup }) => {
  return (
    <section id="pricing" className="py-20 lg:py-28 bg-white border-y border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-emerald-600 mb-2">
            Transparent Pricing
          </h2>
          <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Pay only when you get paid. No monthly surprises.
          </h3>
          <p className="mt-4 text-slate-600 text-base sm:text-lg">
            Start for free. No credit card required to set up your account or publish classes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto items-stretch">
          
          {/* Starter Plan */}
          <div className="rounded-3xl p-8 bg-slate-50 border border-slate-200 flex flex-col justify-between">
            <div>
              <div className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-800 mb-4">
                Pay As You Go
              </div>
              <h4 className="text-2xl font-bold text-slate-900">Starter Host</h4>
              <p className="text-sm text-slate-600 mt-1">Perfect for new hosts, weekend workshops, and one-off classes.</p>
              
              <div className="my-6">
                <span className="text-4xl font-extrabold text-slate-900">₦0</span>
                <span className="text-slate-500 text-sm">/ month</span>
                <p className="text-xs text-emerald-700 font-semibold mt-1.5">Platform fee + Paystack standard fee per paid student</p>
                <p className="text-[11px] text-slate-500">100% Free forever for free classes & community meetups</p>
              </div>

              <ul className="space-y-3 text-sm text-slate-700 mb-8">
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                  </svg>
                  Unlimited classes & students
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                  </svg>
                  Automated WhatsApp & SMS reminders
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                  </svg>
                  2-part installment payments
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                  </svg>
                  Direct settlement to your bank via Paystack
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                  </svg>
                  Daily WhatsApp host summary
                </li>
              </ul>
            </div>

            <button 
              onClick={() => onOpenSignup('pricing_starter')}
              className="w-full py-3.5 rounded-xl font-bold text-sm text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 transition-all"
            >
              Start free now
            </button>
          </div>

          {/* Pro Host Plan */}
          <div className="rounded-3xl p-8 bg-white border-2 border-emerald-500 shadow-xl relative flex flex-col justify-between">
            <div className="absolute -top-3.5 right-6 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-600 text-white shadow-sm">
              RECOMMENDED FOR ACTIVE HOSTS
            </div>

            <div>
              <div className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 mb-4">
                Pro Academy
              </div>
              <h4 className="text-2xl font-bold text-slate-900">Pro Host</h4>
              <p className="text-sm text-slate-600 mt-1">For frequent trainers, academies, and multi-cohort instructors.</p>
              
              <div className="my-6">
                <span className="text-4xl font-extrabold text-slate-900">Custom</span>
                <span className="text-slate-500 text-sm">/ month</span>
                <p className="text-xs text-emerald-700 font-semibold mt-1.5">Volume pricing for high-volume hosts</p>
                <p className="text-[11px] text-slate-500">Pro Host is not available yet — ask to join the waitlist</p>
              </div>

              <ul className="space-y-3 text-sm text-slate-700 mb-8">
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                  </svg>
                  Everything in Starter
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                  </svg>
                  Up to 4 installment schedules per class
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                  </svg>
                  Custom reminder message wording
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                  </svg>
                  CSV Export of attendees & phone numbers
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                  </svg>
                  Priority WhatsApp host support line
                </li>
              </ul>
            </div>

            <button 
              onClick={() => onOpenSignup('pricing_pro')}
              className="w-full py-3.5 rounded-xl font-bold text-sm text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/30 transition-all"
            >
              Get started with Pro
            </button>
          </div>

        </div>

        <div className="mt-8 text-center text-xs text-slate-500 max-w-xl mx-auto">
          🔒 How payouts work: You link your local Nigerian bank account via Paystack subaccounts. When a student pays, Paystack deposits your funds directly to your bank. TuitEase never holds your money.
        </div>

      </div>
    </section>
  );
};
