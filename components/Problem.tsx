import React from 'react';

export const Problem: React.FC = () => {
  return (
    <section className="py-20 bg-white border-y border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-emerald-600 mb-2">
            The Struggle Every Host Knows
          </h2>
          <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Hosting workshops should be exciting, not an administrative nightmare.
          </h3>
          <p className="mt-4 text-base sm:text-lg text-slate-600">
            When you run your bookings manually through DMs and spreadsheets, your energy is drained before you even teach your first slide.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Pain Point 1 */}
          <div className="bg-slate-50 rounded-2xl p-7 border border-slate-200 hover:border-slate-300 transition-all hover:shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center mb-6">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
            <h4 className="text-lg font-bold text-slate-900 mb-2">
              "Half the people who promised to come never show up."
            </h4>
            <p className="text-sm text-slate-600 leading-relaxed">
              People get busy, forget, or simply ghost. Without automated, polite reminders and seat confirmation nudges, 30% to 50% of your confirmed attendees turn into empty seats.
            </p>
          </div>

          {/* Pain Point 2 */}
          <div className="bg-slate-50 rounded-2xl p-7 border border-slate-200 hover:border-slate-300 transition-all hover:shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mb-6">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h4 className="text-lg font-bold text-slate-900 mb-2">
              "I spend hours checking bank alerts and chasing balances."
            </h4>
            <p className="text-sm text-slate-600 leading-relaxed">
              Searching bank apps for matching payment references, cross-checking screenshots, and sending awkward WhatsApp follow-ups for installment balances is exhausting.
            </p>
          </div>

          {/* Pain Point 3 */}
          <div className="bg-slate-50 rounded-2xl p-7 border border-slate-200 hover:border-slate-300 transition-all hover:shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center mb-6">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h4 className="text-lg font-bold text-slate-900 mb-2">
              "My WhatsApp is completely chaotic with DM queries."
            </h4>
            <p className="text-sm text-slate-600 leading-relaxed">
              "Is there still space?", "What is your account number?", "Where is the venue map?" You answer the same questions 40 times while important messages get buried.
            </p>
          </div>

        </div>

      </div>
    </section>
  );
};
