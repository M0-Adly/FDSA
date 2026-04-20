import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Send, Minimize2, RefreshCw } from 'lucide-react';
import { useAppStore } from '../lib/store';

// ─────────────────────────────────────────────────────────────────────────────
// Message types
// ─────────────────────────────────────────────────────────────────────────────
type Role    = 'user' | 'aria';
type MsgKind = 'text' | 'menu' | 'action-result';

interface ChatMessage {
  id:   number;
  role: Role;
  kind: MsgKind;
  text: string;
}

let msgId = 0;
const mkMsg = (role: Role, text: string, kind: MsgKind = 'text'): ChatMessage =>
  ({ id: ++msgId, role, kind, text });

// ─────────────────────────────────────────────────────────────────────────────
// Quick-actions definition (indices 1–5)
// ─────────────────────────────────────────────────────────────────────────────
const QUICK_ACTIONS = [
  { num: 1, labelKey: 'chatbot.qa1_label' },
  { num: 2, labelKey: 'chatbot.qa2_label' },
  { num: 3, labelKey: 'chatbot.qa3_label' },
  { num: 4, labelKey: 'chatbot.qa4_label' },
  { num: 5, labelKey: 'chatbot.qa5_label' },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// CHATBOT COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export function Chatbot() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const isRTL = lang === 'ar';

  // Pull everything we might need from the store
  const { system, escalatePending, setLang, version } = useAppStore();

  const [isOpen,    setIsOpen]    = useState(false);
  const [input,     setInput]     = useState('');
  const [messages,  setMessages]  = useState<ChatMessage[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const push = useCallback((...msgs: ChatMessage[]) =>
    setMessages((prev) => [...prev, ...msgs]),
  []);

  const pushMenu = useCallback(() => {
    push(mkMsg('aria', t('chatbot.quick_intro'), 'menu'));
  }, [push, t]);

  // ── Init / language change ─────────────────────────────────────────────────
  useEffect(() => {
    setMessages([
      mkMsg('aria', t('chatbot.greeting'), 'text'),
    ]);
    // We deliberately do NOT auto-show the menu on every lang change;
    // the user sees the greeting and can open the menu via send or typing.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i18n.language]);

  // Show menu once on first open
  useEffect(() => {
    if (isOpen && messages.length <= 1) {
      pushMenu();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Quick-action executor ──────────────────────────────────────────────────
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const executeAction = useCallback((num: number) => {
    const stats = system.getSystemStats();

    switch (num) {
      // 1 ── System Summary ──────────────────────────────────────────────────
      case 1: {
        let totalO = 0, totalP = 0, totalR = 0;
        Object.values(stats).forEach(({ ongoing, pending, resolved }) => {
          totalO += ongoing; totalP += pending; totalR += resolved;
        });
        const lines = Object.entries(stats).map(([dist, d]) =>
          `${dist}: ${t('ongoing')} ${d.ongoing} · ${t('pending')} ${d.pending} · ${t('resolved')} ${d.resolved}`,
        );
        push(
          mkMsg('aria',
            `📊 ${t('chatbot.qa1_result')}\n\n` +
            lines.join('\n') +
            `\n\n✅ ${t('chatbot.total')}: ${t('ongoing')} ${totalO}, ${t('pending')} ${totalP}, ${t('resolved')} ${totalR}`,
            'action-result',
          ),
        );
        break;
      }

      // 2 ── Highest Priority Pending ────────────────────────────────────────
      case 2: {
        let maxPri = -1, rId = -1, rDesc = '', rDept = '';
        const walkNode = (node: typeof system.root) => {
          if (!node) return;
          if (!node.isDistrict && node.name !== 'Central Crisis System') {
            let cur = node.pendingReports.head;
            while (cur) {
              if (cur.data.priority > maxPri) {
                maxPri = cur.data.priority;
                rId    = cur.data.id;
                rDesc  = cur.data.description;
                rDept  = node.name;
              }
              cur = cur.next;
            }
          }
          let c = node.children.head;
          while (c) { walkNode(c.data); c = c.next; }
        };
        walkNode(system.root);

        if (rId !== -1) {
          push(mkMsg('aria',
            `🔥 ${t('chatbot.qa2_result')}\n\n` +
            `#${rId} · P${maxPri}\n` +
            `📌 ${rDept}\n` +
            `📝 ${rDesc}`,
            'action-result',
          ));
        } else {
          push(mkMsg('aria', `✅ ${t('chatbot.no_pending')}`, 'action-result'));
        }
        break;
      }

      // 3 ── Department with Most Load ───────────────────────────────────────
      case 3: {
        let maxLoad = -1, maxDept = '';
        const walkNode3 = (node: typeof system.root) => {
          if (!node) return;
          if (!node.isDistrict && node.name !== 'Central Crisis System') {
            const load = node.ongoingReports.size() + node.pendingReports.size();
            if (load > maxLoad) { maxLoad = load; maxDept = node.name; }
          }
          let c = node.children.head;
          while (c) { walkNode3(c.data); c = c.next; }
        };
        walkNode3(system.root);
        push(mkMsg('aria',
          maxDept
            ? `⚠️ ${t('chatbot.qa3_result', { dept: maxDept, count: maxLoad })}`
            : `✅ ${t('chatbot.no_pending')}`,
          'action-result',
        ));
        break;
      }

      // 4 ── Escalate All Now ────────────────────────────────────────────────
      case 4: {
        const beforePending = Object.values(stats).reduce((s, d) => s + d.pending, 0);
        escalatePending();
        // Count after — re-read from system (already mutated)
        const afterStats = system.getSystemStats();
        const afterPending = Object.values(afterStats).reduce((s, d) => s + d.pending, 0);
        const moved = Math.max(0, beforePending - afterPending);
        push(mkMsg('aria',
          `🚨 ${t('chatbot.qa4_result', { count: moved })}`,
          'action-result',
        ));
        break;
      }

      // 5 ── Language Switch ─────────────────────────────────────────────────
      case 5: {
        const next = lang === 'en' ? 'ar' : 'en';
        setLang(next);
        push(mkMsg('aria',
          next === 'ar' ? '🌐 تم التبديل إلى العربية.' : '🌐 Switched to English.',
          'action-result',
        ));
        break;
      }

      default:
        push(mkMsg('aria', t('chatbot.fallback')));
    }

    // Re-display menu after a short delay so the user can pick another action
    setTimeout(() => pushMenu(), 600);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [system, version, lang, escalatePending, setLang, push, pushMenu, t]);

  // ── Free-text NLP fallback ────────────────────────────────────────────────
  const parseQuery = useCallback((q: string): string => {
    const stats = system.getSystemStats();
    if (q.includes('pending') || q.includes('انتظار') || q.includes('معلق')) {
      if (q.includes('first') || q.includes('d1') || q.includes('أولى'))
        return t('chatbot.pending_d1', { count: stats['First District']?.pending ?? 0 });
      if (q.includes('second') || q.includes('d2') || q.includes('ثانية'))
        return t('chatbot.pending_d2', { count: stats['Second District']?.pending ?? 0 });
      const total = (stats['First District']?.pending ?? 0) + (stats['Second District']?.pending ?? 0);
      return t('chatbot.pending_total', { count: total });
    }
    if (q.includes('highest') || q.includes('أعلى') || q.includes('priority')) {
      let maxPri = 0, rId = -1, rDept = '';
      let d = system.root?.children.head;
      while (d) {
        let dept = d.data.children.head;
        while (dept) {
          const h = dept.data.pendingReports.head;
          if (h && h.data.priority > maxPri) { maxPri = h.data.priority; rId = h.data.id; rDept = dept.data.name; }
          dept = dept.next;
        }
        d = d.next;
      }
      if (rId !== -1) return t('chatbot.highest_report', { id: rId, dept: rDept, priority: maxPri });
      return t('chatbot.no_pending');
    }
    if (q.includes('status') || q.includes('step') || q.includes('خطوة') || q.includes('حالة'))
      return t('chatbot.sim_status', { step: system.simStep });
    return t('chatbot.fallback');
  }, [system, t]);

  // ── Send handler ──────────────────────────────────────────────────────────
  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = input.trim();
    if (!raw) return;
    push(mkMsg('user', raw));
    setInput('');

    // Check for quick-action number (1–5)
    const num = parseInt(raw, 10);
    if (num >= 1 && num <= 5) {
      setTimeout(() => executeAction(num), 350);
    } else {
      setTimeout(() => {
        push(mkMsg('aria', parseQuery(raw.toLowerCase())));
        setTimeout(pushMenu, 500);
      }, 350);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Trigger button */}
      <motion.button
        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 ${isRTL ? 'left-6' : 'right-6'} w-14 h-14 bg-indigo-600 rounded-full
          flex items-center justify-center text-white shadow-xl shadow-indigo-600/30 z-50 ${isOpen ? 'hidden' : ''}`}
      >
        <Bot className="w-7 h-7" />
        {/* Notification dot if pending > 0 */}
        <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white" />
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={`fixed bottom-6 ${isRTL ? 'left-6' : 'right-6'} w-80 md:w-[26rem] glass-panel
              flex flex-col shadow-2xl overflow-hidden z-50 h-[520px] border border-indigo-500/20`}
          >
            {/* Header bar */}
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 p-4 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-sm leading-none">{t('chatbot.title')}</p>
                  <p className="text-[10px] text-indigo-200 mt-0.5">{t('chatbot.subtitle')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Re-show menu */}
                <button onClick={pushMenu} title={t('chatbot.show_menu')}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition">
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-white/20 rounded-lg transition">
                  <Minimize2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3 bg-white/50 dark:bg-black/20">
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {m.role === 'aria' && m.kind === 'menu' ? (
                    /* ── Quick-actions menu bubble ── */
                    <div className="max-w-[90%] bg-white dark:bg-slate-800 border border-slate-200
                      dark:border-slate-700 rounded-2xl rounded-tl-none shadow-sm overflow-hidden">
                      <div className="px-4 py-3 bg-indigo-50 dark:bg-indigo-900/30 border-b border-indigo-100 dark:border-indigo-800">
                        <p className="text-xs font-black text-indigo-700 dark:text-indigo-300">
                          {t('chatbot.quick_intro')}
                        </p>
                      </div>
                      <div className="p-2 space-y-1">
                        {QUICK_ACTIONS.map(({ num, labelKey }) => (
                          <button
                            key={num}
                            onClick={() => {
                              push(mkMsg('user', String(num)));
                              setTimeout(() => executeAction(num), 200);
                            }}
                            className="w-full text-left rtl:text-right flex items-center gap-2 px-3 py-2
                              rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20
                              text-sm text-slate-700 dark:text-slate-200 transition group"
                          >
                            <span className="shrink-0 w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50
                              text-indigo-600 dark:text-indigo-300 text-xs font-black flex items-center justify-center
                              group-hover:bg-indigo-600 group-hover:text-white transition">
                              {num}
                            </span>
                            <span className="font-medium">{t(labelKey)}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    /* ── Regular / result bubble ── */
                    <div className={`max-w-[85%] p-3 rounded-2xl text-sm whitespace-pre-line leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-indigo-600 text-white rounded-tr-none'
                        : m.kind === 'action-result'
                          ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 rounded-tl-none'
                          : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-tl-none shadow-sm text-slate-800 dark:text-slate-200'
                    }`}>
                      {m.text}
                    </div>
                  )}
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 shrink-0">
              <form onSubmit={handleSend} className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={t('chatbot.placeholder')}
                  dir={isRTL ? 'rtl' : 'ltr'}
                  className="flex-1 p-2 rounded-xl border border-slate-200 dark:border-slate-700
                    bg-transparent outline-none focus:border-indigo-500 transition text-sm"
                />
                <button type="submit"
                  className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition shrink-0">
                  <Send className="w-4 h-4" />
                </button>
              </form>
              <p className="text-[10px] text-slate-400 mt-1.5 text-center">{t('chatbot.type_hint')}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
