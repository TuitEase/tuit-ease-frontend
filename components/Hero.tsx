import React from 'react';

interface HeroProps {
  onOpenSignup: (source: string) => void;
  onTrack: (eventName: string, payload?: Record<string, unknown>) => void;
}

export const Hero: React.FC<HeroProps> = ({ onOpenSignup, onTrack }) => {
  return (
    <section className="pt-10 pb-20 lg:pt-16 lg:pb-32 overflow-hidden bg-[#FAF8F5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Hero Copy */}
          <div className="lg:col-span-7 text-left">
            
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs sm:text-sm font-medium mb-6">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              For workshop hosts in Nigeria &amp; across Africa
            </div>

            {/* Headline with Editorial Serif Italic */}
            <h1 className="text-4xl sm:text-5xl lg:text-[62px] font-extrabold text-[#14171A] tracking-tight leading-[1.08]">
              Fill your class,<br />
              get paid, and<br />
              keep students<br />
              showing up.<br />
              <span className="font-editorial text-[#DE6548] font-medium tracking-normal text-[48px] sm:text-[60px] lg:text-[72px] block mt-1">
                Without chasing anyone.
              </span>
            </h1>

            {/* Subheadline */}
            <p className="mt-6 text-lg sm:text-xl text-stone-600 max-w-xl font-normal leading-relaxed">
              TuitEase automates your bookings, Paystack payments, and automated WhatsApp reminders so you can focus on teaching.
            </p>

            {/* CTAs */}
            <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <button 
                onClick={() => onOpenSignup('hero_primary')}
                className="inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl font-bold text-base text-white bg-[#DE6548] hover:bg-[#c85337] shadow-lg shadow-[#DE6548]/25 hover:shadow-xl hover:shadow-[#DE6548]/35 hover:-translate-y-0.5 transition-all"
              >
                <span>Create your first class</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>

              <a 
                href="#how-it-works" 
                onClick={() => onTrack('hero_secondary_click')}
                className="inline-flex items-center justify-center px-7 py-4 rounded-xl font-bold text-base text-stone-700 bg-white hover:bg-stone-50 border border-stone-200 shadow-sm transition-all"
              >
                See how it works
              </a>
            </div>

            {/* Trust Badges */}
            <div className="mt-8 flex flex-wrap items-center gap-y-2 gap-x-6 text-xs sm:text-sm text-stone-500 font-medium">
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-[#DE6548]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                No account needed for students
              </div>
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-[#DE6548]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                Works with WhatsApp
              </div>
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-[#DE6548]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                Direct Paystack settlement
              </div>
            </div>

          </div>

          {/* Right: Booking Mockup Matching Reference */}
          <div className="lg:col-span-5 relative">
            
            {/* Floating Toast Notification */}
            <div className="absolute -left-6 top-48 z-20 bg-white rounded-2xl shadow-xl border border-stone-100 p-3.5 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                </svg>
              </div>
              <div>
                <p className="text-xs font-bold text-[#14171A]">₦16,000 received</p>
                <p className="text-[11px] text-stone-500">Amaka O. · matched</p>
              </div>
            </div>

            {/* Booking Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-xl shadow-stone-900/5 border border-stone-200/90 relative z-10">
              
              <div className="flex items-center justify-between pb-4 border-b border-stone-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#FCECE7] text-[#DE6548] font-bold flex items-center justify-center text-sm">
                    T
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#14171A]">Tobi's Pottery Studio</h3>
                    <p className="text-xs text-stone-500">Booking page</p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-stone-100 text-stone-700">
                  4-week course
                </span>
              </div>

              {/* Warm Photography Banner */}
              <div className="mt-4 rounded-2xl overflow-hidden relative h-36 bg-[#E8A593]/30 border border-stone-200/60">
                <img 
                  src="https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=800&q=80" 
                  alt="Hands shaping clay in a pottery studio" 
                  className="w-full h-full object-cover" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent flex items-end p-3">
                  <span className="text-white text-xs font-semibold px-2.5 py-0.5 rounded-full bg-black/40 backdrop-blur-sm">
                    Studio 4 · Yaba, Lagos
                  </span>
                </div>
              </div>

              <div className="mt-4">
                <h4 className="text-xl font-bold text-[#14171A]">Pottery for Beginners</h4>
                
                <div className="mt-3 space-y-2 text-xs text-stone-600">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-[#DE6548]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                    </svg>
                    <span>Starts Saturday, 10:00am</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-[#DE6548]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                    </svg>
                    <span>Yaba, Lagos · Studio 4</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-[#DE6548]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                    </svg>
                    <span>12 seats · 9 taken</span>
                  </div>
                </div>

                <div className="mt-3.5">
                  <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                    <div className="bg-[#DE6548] h-2 rounded-full" style={{ width: '75%' }}></div>
                  </div>
                  <div className="mt-1.5 flex justify-end">
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      3 seats left
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-stone-100">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-2xl font-extrabold text-[#14171A]">₦48,000</span>
                      <p className="text-xs text-stone-500 mt-0.5">or 3 payments of ₦16,000</p>
                    </div>
                  </div>
                </div>

                <div className="mt-5">
                  <div className="w-full py-3.5 rounded-xl font-bold text-sm text-center text-white bg-[#DE6548] shadow-md shadow-[#DE6548]/20">
                    Reserve my seat
                  </div>
                  <p className="text-[11px] text-center text-stone-400 mt-2">No account needed</p>
                </div>

              </div>

            </div>

          </div>

        </div>

      </div>
    </section>
  );
};
