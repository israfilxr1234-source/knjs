import { useState } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Member, NotificationPreferences, Role } from '../types';
import { Bell, Shield, ArrowLeft, CheckCircle2, ShieldCheck, History, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';

interface SettingsProps {
  member: Member;
  onBack: () => void;
  onTabChange: (tab: 'members' | 'notices' | 'events' | 'funds' | 'reports' | 'settings' | 'logs') => void;
}

export default function Settings({ member, onBack, onTabChange }: SettingsProps) {
  const [preferences, setPreferences] = useState<NotificationPreferences>(
    member.notificationPreferences || { urgentNotices: true, eventReminders: true }
  );
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleToggle = (key: keyof NotificationPreferences) => {
    setPreferences(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'members', member.userId), {
        notificationPreferences: preferences
      });
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `members/${member.userId}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-8 font-sans">
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 font-bold text-xs uppercase tracking-widest transition-colors mb-4"
      >
        <ArrowLeft size={16} /> ফিরে যান
      </button>

      <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-8">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-3">
            <Bell className="text-blue-600 dark:text-blue-400" /> সেটিংস
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mt-1">আপনার নোটিফিকেশন পছন্দসমূহ সেট করুন</p>
        </div>

        <div className="space-y-4">
          <div className="p-6 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between group transition-all hover:bg-slate-100 dark:hover:bg-slate-800/50">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl text-red-500 shadow-sm group-hover:scale-110 transition-transform">
                <Shield size={24} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-200">জরুরি নোটিশ</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">সব জরুরি সংবাদের জন্য নোটিফিকেশন পান</p>
              </div>
            </div>
            <button 
              onClick={() => handleToggle('urgentNotices')}
              className={`w-14 h-8 rounded-full relative transition-all duration-300 ${preferences.urgentNotices ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-800'}`}
            >
              <div className={`absolute top-1 left-1 w-6 h-6 bg-white dark:bg-slate-300 rounded-full shadow-sm transition-all duration-300 ${preferences.urgentNotices ? 'translate-x-6' : ''}`} />
            </button>
          </div>

          <div className="p-6 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between group transition-all hover:bg-slate-100 dark:hover:bg-slate-800/50">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl text-blue-500 shadow-sm group-hover:scale-110 transition-transform">
                <Bell size={24} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-200">ইভেন্ট রিমাইন্ডার</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">নতুন ইভেন্ট যোগ হলে নোটিফিকেশন পান</p>
              </div>
            </div>
            <button 
              onClick={() => handleToggle('eventReminders')}
              className={`w-14 h-8 rounded-full relative transition-all duration-300 ${preferences.eventReminders ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-800'}`}
            >
              <div className={`absolute top-1 left-1 w-6 h-6 bg-white dark:bg-slate-300 rounded-full shadow-sm transition-all duration-300 ${preferences.eventReminders ? 'translate-x-6' : ''}`} />
            </button>
          </div>
        </div>

        {member.role !== Role.GENERAL && (
          <div className="space-y-6 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">অ্যাডমিনিস্ট্রেটিভ টুলস</h3>
              <div className="space-y-3">
                <button 
                  onClick={() => onTabChange('reports')}
                  className="w-full p-5 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between group hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white dark:bg-slate-900 rounded-xl text-blue-600 shadow-sm group-hover:scale-110 transition-transform">
                      <ShieldCheck size={20} />
                    </div>
                    <div className="text-left">
                      <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">রিপোর্ট বুক</h4>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">কার্যকরী সদস্যদের কাজের বিবরণ দেখুন</p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-slate-300 dark:text-slate-600 group-hover:translate-x-1 transition-transform" />
                </button>

                {member.role === Role.ADMIN && (
                  <button 
                    onClick={() => onTabChange('logs')}
                    className="w-full p-5 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between group hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-white dark:bg-slate-900 rounded-xl text-amber-500 shadow-sm group-hover:scale-110 transition-transform">
                        <History size={20} />
                      </div>
                      <div className="text-left">
                        <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">অ্যাক্টিভিটি লগ</h4>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">সব সদস্যদের সাম্প্রতিক অ্যাক্টিভিটি দেখুন</p>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-slate-300 dark:text-slate-600 group-hover:translate-x-1 transition-transform" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="pt-4 flex items-center gap-4">
          <button 
            disabled={isSaving}
            onClick={handleSave}
            className={`flex-1 bg-blue-600 text-white px-8 py-4 rounded-2xl font-bold shadow-lg shadow-blue-600/20 active:scale-95 transition-all flex items-center justify-center gap-2 ${isSaving ? 'opacity-70 cursor-not-allowed' : 'hover:bg-blue-700'}`}
          >
            {isSaving ? 'সংরক্ষণ করা হচ্ছে...' : 'সেটিংস সেভ করুন'}
          </button>
          
          {showSuccess && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="px-4 py-2 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-xl border border-green-100 dark:border-green-900/30 flex items-center gap-2 text-xs font-bold"
            >
              <CheckCircle2 size={16} /> সফলভাবে সেভ হয়েছে
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
