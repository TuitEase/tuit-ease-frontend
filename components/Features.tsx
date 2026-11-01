import React from 'react';

export const Features: React.FC = () => {
  return (
    <section id="features" className="py-20 lg:py-28 bg-white border-y border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-emerald-600 mb-2">
            Designed For Maximum Attendance
          </h2>
          <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Everything you need to run high-turnout, high-revenue classes.
          </h3>
          <p className="mt-4 text-slate-600 text-base sm:text-lg">
            Built from the ground up to solve the real problems hosts face every single week.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          
          {/* Feature 1 */}
          <div className="p-7 rounded-2xl bg-slate-50 border border-slate-200 hover:border-emerald-300 transition-all hover:shadow-sm">
            <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-5 font-bold">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h4 className="text-base font-bold text-slate-900 mb-2">
              WhatsApp & SMS reminders students actually act on
            </h4>
            <p className="text-sm text-slate-600 leading-relaxed">
              Email reminders get lost in spam folders. TuitEase sends personal, prompt messages via WhatsApp with automatic SMS fallback, achieving 98%+ delivery.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="p-7 rounded-2xl bg-slate-50 border border-slate-200 hover:border-emerald-300 transition-all hover:shadow-sm">
            <div className="w-11 h-11 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center mb-5 font-bold">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h4 className="text-base font-bold text-slate-900 mb-2">
              Confirm-your-seat nudges & automatic waitlist
            </h4>
            <p className="text-sm text-slate-600 leading-relaxed">
              3 days before class, students get a prompt: "Reply YES to confirm your seat." If an unpaid student fails to confirm, their seat is automatically offered to the waitlist.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="p-7 rounded-2xl bg-slate-50 border border-slate-200 hover:border-emerald-300 transition-all hover:shadow-sm">
            <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-5 font-bold">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h4 className="text-base font-bold text-slate-900 mb-2">
              Installments with automatic polite follow-ups
            </h4>
            <p className="text-sm text-slate-600 leading-relaxed">
              Higher-ticket masterclasses sell out faster when students can split payments. TuitEase tracks due dates and sends friendly reminders with 1-click Paystack links.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="p-7 rounded-2xl bg-slate-50 border border-slate-200 hover:border-emerald-300 transition-all hover:shadow-sm">
            <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-5 font-bold">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <h4 className="text-base font-bold text-slate-900 mb-2">
              Bank transfer proof matching & manual logs
            </h4>
            <p className="text-sm text-slate-600 leading-relaxed">
              Prefer to accept direct bank transfer or cash? Record it with one tap. TuitEase credits the student's booking, settles installments, and delivers an instant receipt.
            </p>
          </div>

          {/* Feature 5 */}
          <div className="p-7 rounded-2xl bg-slate-50 border border-slate-200 hover:border-emerald-300 transition-all hover:shadow-sm">
            <div className="w-11 h-11 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center mb-5 font-bold">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h4 className="text-base font-bold text-slate-900 mb-2">
              Multi-week sessions & attendance tracking
            </h4>
            <p className="text-sm text-slate-600 leading-relaxed">
              Running a 4-week cohort? Track attendance per session in seconds. Automatically send "Sorry you missed Session 2" catch-up messages with replay links to absentees.
            </p>
          </div>

          {/* Feature 6 */}
          <div className="p-7 rounded-2xl bg-slate-50 border border-slate-200 hover:border-emerald-300 transition-all hover:shadow-sm">
            <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-5 font-bold">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h4 className="text-base font-bold text-slate-900 mb-2">
              Online and offline venue support
            </h4>
            <p className="text-sm text-slate-600 leading-relaxed">
              Works equally well for Zoom/Meet webinars or in-person workshops. Include Google Map links, parking notes, or digital check-in codes directly in the confirmation.
            </p>
          </div>

        </div>

        {/* Highlight Card: Host 7 AM Daily Summary */}
        <div className="mt-8 p-8 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-xl relative overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7">
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Host Superpower
              </span>
              <h4 className="text-2xl sm:text-3xl font-extrabold mt-3 text-white">
                Your 7:00 AM Daily WhatsApp Host Briefing
              </h4>
              <p className="mt-3 text-slate-300 text-sm sm:text-base leading-relaxed">
                Wake up to an intelligent digest delivered straight to your WhatsApp. See exactly how much was collected overnight, who completed their installment, and which students might need a gentle nudge before class.
              </p>
              <ul className="mt-4 space-y-2 text-xs sm:text-sm text-slate-200">
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                  </svg>
                  <span>Total payments received in the last 24 hours</span>
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                  </svg>
                  <span>At-risk students who haven't confirmed attendance</span>
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                  </svg>
                  <span>Total outstanding balances across active cohorts</span>
                </li>
              </ul>
            </div>
            
            <div className="lg:col-span-5 bg-slate-950 p-5 rounded-2xl border border-slate-700/80 font-mono text-xs text-slate-300 shadow-inner">
              <div className="text-emerald-400 font-bold mb-2 flex items-center justify-between border-b border-slate-800 pb-2">
                <span>TuitEase Daily Copilot</span>
                <span className="text-[10px] text-slate-400">07:00 WAT</span>
              </div>
              <div className="space-y-1.5 text-[11px] leading-relaxed">
                <p>Good morning Ada! Here's your summary:</p>
                <p className="text-white font-semibold">💰 ₦95,000 received in last 24h</p>
                <p className="text-slate-400">⏳ Still outstanding: ₦35,000</p>
                <p className="text-slate-400">📅 Next class: Tomorrow, 10:00 AM</p>
                <div className="mt-2 pt-2 border-t border-slate-800">
                  <p className="text-amber-300 font-semibold">⚠️ 2 students at-risk of no-show:</p>
                  <p>· Chidi O. (has not confirmed seat)</p>
                  <p>· Bola M. (owes ₦15,000 installment)</p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};
