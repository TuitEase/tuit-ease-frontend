import React from 'react';

export const SocialProof: React.FC = () => {
  return (
    <section className="py-20 lg:py-28 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Results Strip */}
        <div className="p-8 sm:p-10 rounded-3xl bg-emerald-900 text-white shadow-xl mb-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-emerald-800/80">
            <div className="pt-4 md:pt-0">
              <div className="text-3xl sm:text-4xl font-extrabold text-emerald-400">[ADD REAL STAT: 92%]</div>
              <p className="mt-1 text-xs sm:text-sm text-emerald-100 font-medium">Average class turnout rate</p>
            </div>
            <div className="pt-4 md:pt-0 md:pl-6">
              <div className="text-3xl sm:text-4xl font-extrabold text-emerald-400">[ADD REAL STAT: ₦45M+]</div>
              <p className="mt-1 text-xs sm:text-sm text-emerald-100 font-medium">Class fees collected via Paystack</p>
            </div>
            <div className="pt-4 md:pt-0 md:pl-6">
              <div className="text-3xl sm:text-4xl font-extrabold text-emerald-400">0 Hours</div>
              <p className="mt-1 text-xs sm:text-sm text-emerald-100 font-medium">Spent chasing bank transfer alerts</p>
            </div>
            <div className="pt-4 md:pt-0 md:pl-6">
              <div className="text-3xl sm:text-4xl font-extrabold text-emerald-400">[ADD REAL STAT: 180+]</div>
              <p className="mt-1 text-xs sm:text-sm text-emerald-100 font-medium">Workshops hosted this month</p>
            </div>
          </div>
        </div>

        {/* Testimonials */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Loved by workshop hosts across Africa
          </h3>
          <p className="text-slate-600 text-sm mt-2">Here is what organizers say about switching to TuitEase.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Testimonial 1 */}
          <div className="bg-white p-7 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between">
            <p className="text-sm text-slate-700 leading-relaxed italic">
              "[ADD REAL TESTIMONIAL: For my 3-week design sprint, 24 people signed up and every single one showed up. The WhatsApp confirmation where they reply YES completely fixed my no-show problem.]"
            </p>
            <div className="mt-6 flex items-center gap-3 pt-4 border-t border-slate-100">
              <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-sm">
                TA
              </div>
              <div>
                <h5 className="text-sm font-bold text-slate-900">Tunde Adebayo</h5>
                <p className="text-xs text-slate-500">Product Design Trainer · Lagos</p>
              </div>
            </div>
          </div>

          {/* Testimonial 2 */}
          <div className="bg-white p-7 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between">
            <p className="text-sm text-slate-700 leading-relaxed italic">
              "[ADD REAL TESTIMONIAL: Being able to offer 2 installments without having to set a calendar alarm to chase people was a gamechanger. TuitEase handled the reminders and the money went straight to my account.]"
            </p>
            <div className="mt-6 flex items-center gap-3 pt-4 border-t border-slate-100">
              <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-sm">
                NO
              </div>
              <div>
                <h5 className="text-sm font-bold text-slate-900">Ngozi Okonjo</h5>
                <p className="text-xs text-slate-500">Pastry Chef & Academy Host · Abuja</p>
              </div>
            </div>
          </div>

          {/* Testimonial 3 */}
          <div className="bg-white p-7 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between">
            <p className="text-sm text-slate-700 leading-relaxed italic">
              "[ADD REAL TESTIMONIAL: The 7 AM WhatsApp summary is my favorite thing. I wake up, see who paid overnight, and know exactly how many seats are left without logging into any computer.]"
            </p>
            <div className="mt-6 flex items-center gap-3 pt-4 border-t border-slate-100">
              <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-sm">
                EK
              </div>
              <div>
                <h5 className="text-sm font-bold text-slate-900">Emmanuel Koffi</h5>
                <p className="text-xs text-slate-500">IELTS Prep Coach · Accra / Remote</p>
              </div>
            </div>
          </div>

        </div>

        {/* Partner / Logo Strip Placeholder */}
        <div className="mt-16 text-center">
          <p className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-6">
            [PLACEHOLDER: Trusted by hosts from leading communities]
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 opacity-60 grayscale hover:grayscale-0 transition-all text-xs font-bold text-slate-500">
            <span className="px-4 py-2 rounded-lg bg-white border border-slate-200">[COMMUNITY LOGO 1]</span>
            <span className="px-4 py-2 rounded-lg bg-white border border-slate-200">[CREATOR STUDIO 2]</span>
            <span className="px-4 py-2 rounded-lg bg-white border border-slate-200">[TECH HUBS AFRICA]</span>
            <span className="px-4 py-2 rounded-lg bg-white border border-slate-200">[FITNESS LAB]</span>
          </div>
        </div>

      </div>
    </section>
  );
};
