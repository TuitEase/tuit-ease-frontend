import React from 'react';

export const WhoItsFor: React.FC = () => {
  return (
    <section id="who-its-for" className="py-20 lg:py-28 bg-[#FAF8F5] border-t border-stone-200/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header Matching Screenshot 2 */}
        <div className="max-w-3xl mb-14 text-left">
          <span className="text-xs font-bold uppercase tracking-widest text-[#DE6548] mb-3 block">
            WHO IT'S FOR
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#14171A] tracking-tight leading-tight">
            If you host people to teach<br className="hidden sm:inline" />
            them something, this is for you.
          </h2>
          <p className="mt-4 text-stone-600 text-base sm:text-lg">
            Built with hosts who run real classes — not with enterprise teams.
          </p>
        </div>

        {/* 5 Cards Matching Screenshot 2 Exactly */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
          
          {/* Card 1: Trainers & coaches */}
          <div className="bg-white rounded-3xl p-6 border border-stone-200/90 shadow-sm flex flex-col justify-between hover:border-stone-300 transition-all">
            <div>
              <div className="w-11 h-11 rounded-2xl bg-[#FDF0EC] text-[#DE6548] flex items-center justify-center mb-6">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-[#14171A] mb-2 leading-snug">
                Trainers &amp;<br />coaches
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Cohort courses, bootcamps and certification programmes with installments and weekly sessions.
              </p>
            </div>
          </div>

          {/* Card 2: Tutors & study groups */}
          <div className="bg-white rounded-3xl p-6 border border-stone-200/90 shadow-sm flex flex-col justify-between hover:border-stone-300 transition-all">
            <div>
              <div className="w-11 h-11 rounded-2xl bg-[#FDF0EC] text-[#DE6548] flex items-center justify-center mb-6">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path d="M12 14l9-5-9-5-9 5 9 5z" />
                  <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-[#14171A] mb-2 leading-snug">
                Tutors &amp;<br />study groups
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Holiday lessons, exam prep and small classes where every seat and every payment counts.
              </p>
            </div>
          </div>

          {/* Card 3: Fitness & wellness */}
          <div className="bg-white rounded-3xl p-6 border border-stone-200/90 shadow-sm flex flex-col justify-between hover:border-stone-300 transition-all">
            <div>
              <div className="w-11 h-11 rounded-2xl bg-[#FDF0EC] text-[#DE6548] flex items-center justify-center mb-6">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-[#14171A] mb-2 leading-snug">
                Fitness &amp;<br />wellness
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Studio classes, yoga and dance sessions with repeat bookings and no-show tracking.
              </p>
            </div>
          </div>

          {/* Card 4: Creative classes */}
          <div className="bg-white rounded-3xl p-6 border border-stone-200/90 shadow-sm flex flex-col justify-between hover:border-stone-300 transition-all">
            <div>
              <div className="w-11 h-11 rounded-2xl bg-[#FDF0EC] text-[#DE6548] flex items-center justify-center mb-6">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4 5 5 0 015-5c1.1 0 2.1.4 2.8 1.1l2.2-2.2C11.5 9.4 10 7.8 10 6a6 6 0 1112 0c0 2.2-1.5 4.1-3.6 4.7l-4.4 4.4c.1.3.1.6.1.9a4 4 0 01-4 4z" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-[#14171A] mb-2 leading-snug">
                Creative<br />classes
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Pottery, sewing, photography and art workshops where materials are paid for up front.
              </p>
            </div>
          </div>

          {/* Card 5: Community hosts */}
          <div className="bg-white rounded-3xl p-6 border border-stone-200/90 shadow-sm flex flex-col justify-between hover:border-stone-300 transition-all">
            <div>
              <div className="w-11 h-11 rounded-2xl bg-[#FDF0EC] text-[#DE6548] flex items-center justify-center mb-6">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-[#14171A] mb-2 leading-snug">
                Community<br />hosts
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Church groups, book clubs and meetups where the same people come back every month.
              </p>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
