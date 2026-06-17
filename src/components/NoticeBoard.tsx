import React, { useState, useEffect, useRef } from 'react';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { Notice, NotificationPreferences } from '../types';
import { Bell, Plus, MessageSquare, Image as ImageIcon, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { showNotification } from '../services/notificationService';

export default function NoticeBoard({ canPost, preferences }: { canPost: boolean; preferences?: NotificationPreferences }) {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newNotice, setNewNotice] = useState({ title: '', content: '', type: 'info' as const });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const isInitialLoad = useRef(true);

  useEffect(() => {
    const q = query(collection(db, 'notices'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notice));
      
      // Trigger notifications for new urgent notices
      if (!isInitialLoad.current) {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            const data = change.doc.data() as Notice;
            if (data.type === 'urgent' && preferences?.urgentNotices !== false) {
              showNotification(`জরুরি নোটিশ: ${data.title}`, data.content.substring(0, 50) + '...');
            }
          }
        });
      }
      
      setNotices(docs);
      isInitialLoad.current = false;
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'notices');
    });
    return () => unsubscribe();
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("৫ মেগাবাইটের চেয়ে ছোট ছবি নির্বাচন করুন।");
        return;
      }

      setIsUploading(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          const MAX_SIZE = 800;
          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          const compressed = canvas.toDataURL('image/jpeg', 0.6);
          setImagePreview(compressed);
          setIsUploading(false);
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNotice.title || !newNotice.content) return;
    
    try {
      await addDoc(collection(db, 'notices'), {
        ...newNotice,
        imageUrl: imagePreview,
        authorId: auth.currentUser?.uid,
        authorName: auth.currentUser?.displayName || 'সদস্য',
        createdAt: serverTimestamp()
      });
      setShowAddModal(false);
      setNewNotice({ title: '', content: '', type: 'info' });
      setImagePreview(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'notices');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">নোটিশ বোর্ড</h2>
        </div>
        {canPost && (
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-600/20 flex items-center gap-2"
          >
            <Plus size={18} /> নতুন নোটিশ
          </button>
        )}
      </div>

      <div className="grid gap-6">
        {notices.map((notice) => (
          <motion.div 
            key={notice.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-6 rounded-xl border ${
              notice.type === 'urgent' 
                ? 'border-red-100 dark:border-red-900/30 bg-red-50/20 dark:bg-red-900/10' 
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
            } shadow-sm group hover:shadow-md transition-all relative overflow-hidden`}
          >
            {notice.type === 'urgent' && <div className="absolute top-0 left-0 bottom-0 w-1 bg-red-500" />}
            {notice.type !== 'urgent' && <div className="absolute top-0 left-0 bottom-0 w-1 bg-blue-500" />}
            
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className={`text-[10px] font-bold uppercase tracking-widest ${notice.type === 'urgent' ? 'text-red-500' : 'text-blue-600 dark:text-blue-400'}`}>
                    {notice.type === 'urgent' ? 'জরুরি' : (notice.type === 'meeting' ? 'মিটিং' : 'সাধারণ তথ্য')}
                  </p>
                  <span className="text-[10px] text-slate-300 dark:text-slate-700">•</span>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">
                    {notice.createdAt?.toDate ? notice.createdAt.toDate().toLocaleDateString('bn-BD', { day: '2-digit', month: 'short' }) : 'এখনই'}
                  </p>
                </div>
                <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">{notice.title}</h3>
              </div>
            </div>
            {notice.imageUrl && (
              <div className="mt-4 rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 aspect-video">
                <img src={notice.imageUrl} className="w-full h-full object-cover" alt={notice.title} />
              </div>
            )}
            <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mt-3 whitespace-pre-wrap">{notice.content}</p>
            <div className="mt-4 pt-4 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between">
               <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">প্রকাশক: <span className="text-slate-600 dark:text-slate-400">{notice.authorName}</span></p>
            </div>
          </motion.div>
        ))}
        {notices.length === 0 && (
          <div className="text-center py-20 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
             <MessageSquare size={48} className="mx-auto mb-4 text-slate-300 dark:text-slate-700" />
             <p className="text-slate-500 dark:text-slate-400 font-medium">কোন নোটিশ পাওয়া যায়নি।</p>
          </div>
        )}
      </div>

      {/* Add Notice Modal */}
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
              <h3 className="text-2xl font-black tracking-tighter uppercase mb-6 text-slate-800 dark:text-slate-100">নতুন নোটিশ যোগ করুন</h3>
              <form onSubmit={handleAddNotice} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1 ml-1">শিরোনাম</label>
                  <input 
                    type="text" 
                    value={newNotice.title}
                    onChange={e => setNewNotice({...newNotice, title: e.target.value})}
                    className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border-2 border-transparent focus:border-blue-600 outline-none transition-all text-slate-800 dark:text-slate-100"
                    placeholder="নোটিশের শিরোনাম"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1 ml-1">বিস্তারিত</label>
                  <textarea 
                    rows={4}
                    value={newNotice.content}
                    onChange={e => setNewNotice({...newNotice, content: e.target.value})}
                    className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border-2 border-transparent focus:border-blue-600 outline-none transition-all resize-none text-slate-800 dark:text-slate-100"
                    placeholder="নোটিশের বিস্তারিত বর্ণনা..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1 ml-1">ছবি আপলোড করুন (ঐচ্ছিক)</label>
                  {!imagePreview ? (
                    <label className="flex flex-col items-center justify-center w-full h-32 bg-slate-50 dark:bg-slate-950 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <ImageIcon className="text-slate-400 mb-2" size={24} />
                        <p className="text-xs text-slate-400">গ্যালারি থেকে ছবি সিলেক্ট করুন</p>
                      </div>
                      <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                    </label>
                  ) : (
                    <div className="relative w-full h-32 rounded-xl overflow-hidden group">
                      <img src={imagePreview} className="w-full h-full object-cover" />
                      <button 
                        type="button"
                        onClick={() => setImagePreview(null)}
                        className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}
                  {isUploading && <p className="text-[10px] text-blue-600 font-bold animate-pulse">ছবি প্রোসেস করা হচ্ছে...</p>}
                </div>

                <div className="flex gap-4">
                  <button 
                    type="button"
                    onClick={() => setNewNotice({...newNotice, type: 'info'})}
                    className={`flex-1 py-3 rounded-xl font-bold border-2 transition-all ${newNotice.type === 'info' ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-100 dark:border-slate-800 text-slate-500'}`}
                  >
                    সাধারণ
                  </button>
                  <button 
                    type="button"
                    onClick={() => setNewNotice({...newNotice, type: 'urgent'})}
                    className={`flex-1 py-3 rounded-xl font-bold border-2 transition-all ${newNotice.type === 'urgent' ? 'border-red-500 bg-red-500 text-white shadow-lg shadow-red-500/20' : 'border-slate-100 dark:border-slate-800 text-slate-500'}`}
                  >
                    জরুরি
                  </button>
                </div>
                <button 
                  type="submit"
                  className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold text-lg mt-4 shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all"
                >
                  পাবলিশ করুন
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
