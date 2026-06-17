import React, { useState, useEffect } from 'react';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { Report, Role } from '../types';
import { FileText, Plus, CheckCircle, Clock, ShieldCheck, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function ReportSystem({ role, authorName, onBack }: { role: Role; authorName: string; onBack?: () => void }) {
  const [reports, setReports] = useState<Report[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newReport, setNewReport] = useState({ title: '', content: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setReports(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Report)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'reports');
    });

    return () => unsubscribe();
  }, []);

  const handleAddReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReport.title || !newReport.content) return;

    try {
      await addDoc(collection(db, 'reports'), {
        ...newReport,
        authorId: auth.currentUser?.uid,
        authorName: authorName || auth.currentUser?.displayName || 'Executive Member',
        createdAt: serverTimestamp(),
        status: 'pending'
      });
      setShowAddModal(false);
      setNewReport({ title: '', content: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'reports');
    }
  };

  const handleReview = async (reportId: string) => {
    if (role !== Role.ADMIN) return;
    try {
      await updateDoc(doc(db, 'reports', reportId), { status: 'reviewed' });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `reports/${reportId}`);
    }
  };

  return (
    <div className="space-y-6 pb-20 font-sans">
      {onBack && (
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 font-bold text-xs uppercase tracking-widest transition-colors mb-4"
        >
          <ArrowLeft size={16} /> ফিরে যান
        </button>
      )}
      <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
        <div>
           <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
             <FileText className="text-blue-600 dark:text-blue-400" /> রিপোর্ট বুক
           </h2>
           <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold tracking-widest uppercase mt-1">কার্যকরী সদস্যের কাজের বিবরণী</p>
        </div>
        
        {role === Role.EXECUTIVE && (
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg shadow-blue-600/20 active:scale-95 transition-all hover:bg-blue-700"
          >
            <Plus size={16} /> রিপোর্ট লিখুন
          </button>
        )}
      </div>

      <div className="grid gap-4">
        {reports.map((report, index) => (
          <motion.div 
            key={report.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-2xl ${report.status === 'reviewed' ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'}`}>
                  {report.status === 'reviewed' ? <ShieldCheck size={20} /> : <Clock size={20} />}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100">{report.title}</h3>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase mt-1">
                    সংযোজক: <span className="text-slate-600 dark:text-slate-300">{report.authorName}</span> • 
                    {report.createdAt?.toDate ? report.createdAt.toDate().toLocaleDateString('bn-BD') : 'সম্প্রতি'}
                  </p>
                </div>
              </div>
              <div className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-tighter ${
                report.status === 'reviewed' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
              }`}>
                {report.status === 'reviewed' ? 'রিভিউ সম্পন্ন' : 'রিভিউ পেন্ডিং'}
              </div>
            </div>
            
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed whitespace-pre-wrap pl-14">
              {report.content}
            </p>

            {role === Role.ADMIN && report.status === 'pending' && (
              <div className="mt-6 pl-14 flex items-center gap-4">
                <button 
                  onClick={() => handleReview(report.id)}
                  className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-[10px] font-bold shadow-lg shadow-green-600/20 active:scale-95 transition-all"
                >
                  <CheckCircle size={14} /> মার্ক অ্যাজ রিভিউড
                </button>
              </div>
            )}
          </motion.div>
        ))}

        {!loading && reports.length === 0 && (
          <div className="text-center p-20 bg-white dark:bg-slate-900/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
            <FileText size={48} className="mx-auto text-slate-200 dark:text-slate-800 mb-4" />
            <p className="text-slate-400 dark:text-slate-500 font-bold text-sm">কোন রিপোর্ট জমা পড়েনি।</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative border border-slate-100 dark:border-slate-800"
            >
              <div className="p-8 border-b border-slate-50 dark:border-slate-800">
                <h3 className="text-xl font-black text-slate-800 dark:text-slate-100">কাজের রিপোর্ট জমা দিন</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">সংগঠনের জন্য আপনার কাজের বিবরণ দিন।</p>
              </div>
              
              <form onSubmit={handleAddReport} className="p-8 space-y-6">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 dark:text-slate-500 mb-2 ml-1">রিপোর্টের শিরোনাম</label>
                  <input 
                    required
                    value={newReport.title}
                    onChange={e => setNewReport({...newReport, title: e.target.value})}
                    className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 focus:border-blue-600 outline-none text-sm font-medium text-slate-800 dark:text-slate-100 placeholder-slate-300 dark:placeholder-slate-700"
                    placeholder="যেমন: ইভেন্ট ম্যানেজমেন্ট রিপোর্ট - মে ২০২৪"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 dark:text-slate-500 mb-2 ml-1">বিস্তারিত বর্ণনা</label>
                  <textarea 
                    required
                    value={newReport.content}
                    onChange={e => setNewReport({...newReport, content: e.target.value})}
                    className="w-full h-40 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 focus:border-blue-600 outline-none text-sm font-medium resize-none text-slate-800 dark:text-slate-100 placeholder-slate-300 dark:placeholder-slate-700"
                    placeholder="আপনি কি কি কাজ করেছেন তার বিস্তারিত লিখুন..."
                  />
                </div>
                <div className="flex gap-4">
                  <button 
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 px-8 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-2xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    বাতিল করুন
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all"
                  >
                    জমা দিন
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
