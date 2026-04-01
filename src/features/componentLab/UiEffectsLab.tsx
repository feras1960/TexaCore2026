import React from 'react';
import { useLanguage } from '@/app/providers/LanguageProvider';
import { AuroraBackground } from '@/components/ui/aurora-background';
import { DevLabNav } from './DevLabNav';
import { Button } from '@/components/ui/button';

export default function UiEffectsLab() {
  const { direction, t } = useLanguage();
  const isRTL = direction === 'rtl';

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-950 font-cairo">
      {/* Navigation Layer */}
      <div className="z-[100] relative bg-white/5 backdrop-blur-md border-b border-white/10 p-2">
         <DevLabNav currentLabId="ui-effects" />
      </div>

      {/* Main Effect Layer */}
      <div className="relative flex-1">
        <AuroraBackground className="w-full h-full">
            {/* Content Layer over the Aurora */}
            <div className="relative z-[50] flex flex-col items-center justify-center p-8 text-center" dir={direction}>
              <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight mb-6">
                 Design at the<br />
                 speed of AI
              </h1>
              <p className="text-lg md:text-xl text-slate-300 font-normal mb-12 max-w-2xl">
                 Transform ideas into UI designs for mobile and web applications (TexaCore Lab)
              </p>

              {/* Glassmorphism prompt box (Matched carefully with Stitch specs) */}
               <div className="w-full max-w-[800px] relative mt-8 z-50 transform hover:scale-[1.01] transition-transform duration-300">
                  <div 
                    className="absolute inset-0 bg-white/[0.04] rounded-2xl shadow-2xl pointer-events-none" 
                    style={{ backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)', border: '1px solid rgba(255, 255, 255, 0.08)' }} 
                  />
                  <div className="relative p-5 px-6 flex flex-col">
                     <textarea 
                       placeholder="ما هو التطبيق الأصلي لنظام الجهاز الجوّال الذي يجب تصميمه؟"
                       className="w-full bg-transparent text-white placeholder-slate-400 text-[20px] leading-relaxed border-none outline-none resize-none overflow-hidden min-h-[90px] font-tajawal focus:ring-0"
                       dir={direction}
                     />
                     <div className="flex justify-between items-center mt-2 border-t border-white/5 pt-4">
                        <div className="flex items-center gap-4 text-white/50">
                           <Button variant="ghost" className="hover:text-white hover:bg-white/10 rounded-full w-10 h-10 p-2 transition-colors">
                               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
                                 <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                               </svg>
                           </Button>
                           <Button variant="ghost" className="hover:text-white hover:bg-white/10 rounded-full h-10 px-4 text-sm font-medium transition-colors border border-white/10">
                              <span className="mr-2">✨</span> Flash 3.0
                           </Button>
                        </div>
                        <Button className="bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/10 rounded-full px-6 py-5 font-bold transition-all text-sm gap-2">
                           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
                             <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />
                           </svg>
                           تطبيق
                        </Button>
                     </div>
                  </div>
               </div>
            </div>
        </AuroraBackground>
      </div>
    </div>
  );
}
