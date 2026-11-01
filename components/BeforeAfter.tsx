import React from 'react';

export const BeforeAfter: React.FC = () => {
  return (
    <section className="py-20 lg:py-28 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-emerald-600 mb-2">
            The Transformation
          </h2>
          <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Life before TuitEase vs. Life with TuitEase
          </h3>
          <p className="mt-4 text-slate-600 text-base sm:text-lg">
            See the difference when you automate the tedious operational work.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          
          {/* Before Column */}
          <div className="bg-white rounded-3xl p-8 border border-rose-200/80 shadow-sm relative overflow-hidden">
            <div className="flex items-center gap-2.5 text-rose-600 font-extrabold text-lg mb-6">
              <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-sm font-black">
                ✕
              </div>
              Without TuitEase
            </div>
            <ul className="space-y-4 text-sm text-slate-600">
              <li className="flex items-start gap-3">
                <span className="text-rose-500 font-bold">✕</span>
                <span>Posting your personal bank details in DMs and manually verifying alert screenshots.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-rose-500 font-bold">✕</span>
                <span>40% of people who "booked" don't show up on workshop day.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-rose-500 font-bold">✕</span>
                <span>Manually DMing each student to remind them about Session 2.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-rose-500 font-bold">✕</span>
                <span>Awkwardly chasing students for their second installment payment.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-rose-500 font-bold">✕</span>
                <span>Overselling seats by mistake when 3 people transfer at once.</span>
              </li>
            </ul>
          </div>

          {/* After Column */}
          <div className="bg-white rounded-3xl p-8 border-2 border-emerald-500/80 shadow-lg shadow-emerald-500/5 relative overflow-hidden">
            <div className="flex items-center gap-2.5 text-emerald-700 font-extrabold text-lg mb-6">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-sm font-black">
                ✓
              </div>
              With TuitEase
            </div>
            <ul className="space-y-4 text-sm text-slate-700">
              <li className="flex items-start gap-3">
                <span className="text-emerald-600 font-bold">✓</span>
                <span>Clean public booking link where students pay securely via Paystack in seconds.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-emerald-600 font-bold">✓</span>
                <span>90%+ turnout with automated WhatsApp seat confirmations.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-emerald-600 font-bold">✓</span>
                <span>TuitEase sends all reminders, Zoom links, and catch-up notes automatically.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-emerald-600 font-bold">✓</span>
                <span>Installment reminders chased politely on schedule with 1-click pay links.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-emerald-600 font-bold">✓</span>
                <span>Automatic capacity locking & waitlist promotion when seats open up.</span>
              </li>
            </ul>
          </div>

        </div>

      </div>
    </section>
  );
};
