import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Send, Minimize2 } from 'lucide-react';
import { useAppStore } from '../lib/store';

export function Chatbot() {
  const { t, i18n } = useTranslation();
  const { system } = useAppStore();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{role: 'user'|'aria', text: string}[]>([
    { role: 'aria', text: i18n.language === 'en' ? "Hello! I am ARIA. Ask me about system stats, pending reports, or highest priority issues." : "مرحباً! أنا أريا. اسألني عن إحصائيات النظام أو البلاغات قيد الانتظار." }
  ]);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = input.trim();
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    
    // Simple Rule-based parser
    setTimeout(() => {
      let reply = i18n.language === 'en' ? "I didn't quite catch that. Try asking 'How many pending reports in First District?'" : "لم أفهم ذلك. جرب أن تسأل 'كم عدد البلاغات قيد الانتظار؟'";
      const q = userMsg.toLowerCase();

      const isEn = i18n.language === 'en';

      if (q.includes('pending') || q.includes('انتظار')) {
        const stats = system.getSystemStats();
        if (q.includes('first') || q.includes('أولى')) {
          reply = isEn ? `There are ${stats['First District']?.pending || 0} pending reports in the First District.` : `يوجد ${stats['First District']?.pending || 0} بلاغات قيد الانتظار في المنطقة الأولى.`;
        } else if (q.includes('second') || q.includes('ثانية')) {
          reply = isEn ? `There are ${stats['Second District']?.pending || 0} pending reports in the Second District.` : `يوجد ${stats['Second District']?.pending || 0} بلاغات قيد الانتظار في المنطقة الثانية.`;
        } else {
          reply = isEn ? `Total pending reports globally: ${(stats['First District']?.pending || 0) + (stats['Second District']?.pending || 0)}` : `إجمالي البلاغات قيد الانتظار: ${(stats['First District']?.pending || 0) + (stats['Second District']?.pending || 0)}`;
        }
      } else if (q.includes('highest') || q.includes('أعلى')) {
        let maxPri = 0;
        let rId = -1;
        let rDept = '';
        
        let district = system.root?.children.head;
        while(district) {
          let dept = district.data.children.head;
          while(dept) {
            const headPending = dept.data.pendingReports.head;
            if (headPending && headPending.data.priority > maxPri) {
              maxPri = headPending.data.priority;
              rId = headPending.data.id;
              rDept = dept.data.name;
            }
            dept = dept.next;
          }
          district = district.next;
        }

        if (rId !== -1) {
             reply = isEn ? `The highest priority report is #${rId} in ${rDept} with Priority ${maxPri}.` : `أعلى بلاغ من حيث الأولوية هو رقم #${rId} في ${rDept} بأولوية ${maxPri}.`;
        } else {
             reply = isEn ? "There are no pending reports." : "لا توجد بلاغات قيد الانتظار.";
        }
      } else if (q.includes('status') || q.includes('حالة')) {
         reply = isEn ? `Current simulation step: ${system.simStep}.` : `خطوة المحاكاة الحالية: ${system.simStep}.`;
      }

      setMessages(prev => [...prev, { role: 'aria', text: reply }]);
    }, 500);
  };

  return (
    <>
      {/* Trigger Button */}
      <motion.button 
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 ${i18n.language === 'en' ? 'right-6' : 'left-6'} w-14 h-14 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-xl shadow-indigo-600/30 z-50 ${isOpen ? 'hidden' : ''}`}
      >
        <Bot className="w-7 h-7" />
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={`fixed bottom-6 ${i18n.language === 'en' ? 'right-6' : 'left-6'} w-80 md:w-96 glass-panel flex flex-col shadow-2xl overflow-hidden z-50 h-[500px] border border-indigo-500/20`}
          >
            {/* Header */}
            <div className="bg-indigo-600 p-4 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5" />
                <span className="font-bold">{t('chatbot.title')}</span>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/20 rounded-md transition"><Minimize2 className="w-4 h-4"/></button>
            </div>

            {/* Messages */}
            <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3 bg-white/50 dark:bg-black/20">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                    m.role === 'user' 
                      ? 'bg-indigo-600 text-white rounded-tr-none' 
                      : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-tl-none shadow-sm text-slate-800 dark:text-slate-200'
                  }`}>
                    {m.text}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700">
              <form onSubmit={handleSend} className="flex gap-2">
                <input 
                  type="text" 
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder={t('chatbot.placeholder')}
                  className="flex-1 p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent outline-none focus:border-indigo-500 transition text-sm"
                />
                <button type="submit" className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition">
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
