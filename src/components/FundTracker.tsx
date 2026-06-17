import React, { useState, useEffect } from 'react';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { FundRecord } from '../types';
import { Wallet, TrendingUp, TrendingDown, Plus, CreditCard, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function FundTracker({ isAdmin }: { isAdmin: boolean }) {
  const [records, setRecords] = useState<FundRecord[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRecord, setNewRecord] = useState({ amount: 0, type: 'donation' as const, description: '', memberName: '' });

  useEffect(() => {
    const q = query(collection(db, 'funds'), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FundRecord));
      setRecords(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'funds');
    });
    return () => unsubscribe();
  }, []);

  const totalFunds = records.reduce((acc, rec) => rec.type === 'donation' ? acc + rec.amount : acc - rec.amount, 0);
  const totalDonations = records.reduce((acc, rec) => rec.type === 'donation' ? acc + rec.amount : acc, 0);
  const totalExpenses = records.reduce((acc, rec) => rec.type === 'expense' ? acc + rec.amount : acc, 0);

  const handleAddRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newRecord.amount <= 0 || !newRecord.description) return;

    try {
      await addDoc(collection(db, 'funds'), {
        ...newRecord,
        date: serverTimestamp(),
        memberId: auth.currentUser?.uid
      });
      setShowAddModal(false);
      setNewRecord({ amount: 0, type: 'donation', description: '', memberName: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'funds');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">ফান্ড ট্র্যাকার</h2>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition-all flex items-center gap-2"
          >
            <Plus size={18} /> নতুন এন্ট্রি
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm"
        >
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">বর্তমান ব্যালেন্স</p>
          <p className="text-3xl font-bold text-slate-800 dark:text-slate-100 italic">৳{totalFunds.toLocaleString()}</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between"
        >
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">মোট আয়</p>
            <p className="text-lg font-bold text-blue-600 dark:text-blue-400">৳{totalDonations.toLocaleString()}</p>
          </div>
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-md">
            <TrendingUp size={16} />
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between"
        >
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">মোট ব্যয়</p>
            <p className="text-lg font-bold text-slate-700 dark:text-slate-300">৳{totalExpenses.toLocaleString()}</p>
          </div>
          <div className="p-2 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-md">
            <TrendingDown size={16} />
          </div>
        </motion.div>
      </div>

      {/* Transaction History */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">সাম্প্রতিক লেনদেন</h3>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          {records.map((record, idx) => (
            <motion.div 
              key={record.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all ${idx !== 0 ? 'border-t border-slate-100 dark:border-slate-800' : ''}`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${record.type === 'donation' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                  {record.type === 'donation' ? <Plus size={14} /> : <TrendingDown size={14} />}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">{record.description}</h4>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                    {record.memberName || 'Org'} • {record.date?.toDate ? record.date.toDate().toLocaleDateString('bn-BD') : 'এখন'}
                  </p>
                </div>
              </div>
              <div className={`font-bold text-sm italic ${record.type === 'donation' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-800 dark:text-slate-300'}`}>
                {record.type === 'donation' ? '+' : '-'}৳{record.amount.toLocaleString()}
              </div>
            </motion.div>
          ))}
          {records.length === 0 && (
             <div className="text-center py-20 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                <CreditCard size={48} className="mx-auto mb-4 text-slate-300 dark:text-slate-700" />
                <p className="text-slate-500 dark:text-slate-400 font-medium">কোন লেনদেন রেকর্ড করা হয়নি।</p>
             </div>
          )}
        </div>
      </div>

      {/* Add Record Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl p-8 shadow-2xl"
            >
              <h3 className="text-2xl font-black tracking-tighter uppercase mb-6 text-slate-800 dark:text-slate-100">নতুন লেনদেন যোগ করুন</h3>
              <form onSubmit={handleAddRecord} className="space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-400 dark:text-slate-500 mb-1 ml-1 block">টাকার পরিমাণ</label>
                  <input 
                    type="number"
                    value={newRecord.amount}
                    onChange={e => setNewRecord({...newRecord, amount: Number(e.target.value)})}
                    className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border-2 border-transparent focus:border-blue-600 outline-none font-mono text-xl text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div className="flex gap-4">
                  <button 
                    type="button"
                    onClick={() => setNewRecord({...newRecord, type: 'donation'})}
                    className={`flex-1 py-3 rounded-xl font-bold border-2 transition-all ${newRecord.type === 'donation' ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400'}`}
                  >
                    ডোনেশন
                  </button>
                  <button 
                    type="button"
                    onClick={() => setNewRecord({...newRecord, type: 'expense'})}
                    className={`flex-1 py-3 rounded-xl font-bold border-2 transition-all ${newRecord.type === 'expense' ? 'border-red-500 bg-red-500 text-white shadow-lg shadow-red-500/20' : 'border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400'}`}
                  >
                    খরচ
                  </button>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-400 dark:text-slate-500 mb-1 ml-1 block">বিবরণ</label>
                  <input 
                    value={newRecord.description}
                    onChange={e => setNewRecord({...newRecord, description: e.target.value})}
                    placeholder="ইফতার মাহফিল ডোনেশন / অফিস ভাড়া..."
                    className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border-2 border-transparent focus:border-blue-600 outline-none text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-400 dark:text-slate-500 mb-1 ml-1 block">সদস্যের নাম (ঐচ্ছিক)</label>
                  <input 
                    value={newRecord.memberName}
                    onChange={e => setNewRecord({...newRecord, memberName: e.target.value})}
                    placeholder="নাম লিখুন..."
                    className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border-2 border-transparent focus:border-blue-600 outline-none text-slate-800 dark:text-slate-100"
                  />
                </div>
                <button type="submit" className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all">এন্ট্রি করুন</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
