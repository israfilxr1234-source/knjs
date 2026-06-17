import React, { useState, useEffect } from 'react';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc } from 'firebase/firestore';
import { Event, NotificationPreferences } from '../types';
import { Calendar as CalendarIcon, MapPin, Clock, Plus, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { showNotification } from '../services/notificationService';

export default function EventCalendar({ isAdmin, preferences }: { isAdmin: boolean; preferences?: NotificationPreferences }) {
  const [events, setEvents] = useState<Event[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', description: '', dateTime: '', location: '' });

  useEffect(() => {
    const q = query(collection(db, 'events'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added" && preferences?.eventReminders !== false) {
          const data = change.doc.data() as Event;
          // Only show notification if not current user's creation (optional, but good)
          // For simplicity, just show it.
          showNotification(`নতুন ইভেন্ট: ${data.title}`, `${new Date(data.dateTime).toLocaleDateString('bn-BD')} তারিখে ${data.location} এ`);
        }
      });

      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event));
      // Simple sort by date string (usually ISO)
      docs.sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
      setEvents(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'events');
    });
    return () => unsubscribe();
  }, []);

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.title || !newEvent.dateTime || !newEvent.location) return;

    try {
      await addDoc(collection(db, 'events'), {
        ...newEvent,
        organizerId: auth.currentUser?.uid
      });
      setShowAddModal(false);
      setNewEvent({ title: '', description: '', dateTime: '', location: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'events');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">ইভেন্ট ক্যালেন্ডার</h2>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition-all flex items-center gap-2"
          >
            <Plus size={18} /> নতুন ইভেন্ট
          </button>
        )}
      </div>

      <div className="space-y-4">
        {events.map((event) => {
          const date = new Date(event.dateTime);
          return (
            <motion.div 
              key={event.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white dark:bg-slate-900 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row shadow-sm hover:shadow-md transition-all h-full"
            >
              <div className="bg-slate-50 dark:bg-slate-950/50 border-b sm:border-b-0 sm:border-r border-slate-200 dark:border-slate-800 p-6 sm:w-32 flex flex-col items-center justify-center text-center shrink-0">
                 <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">
                   {date.toLocaleString('bn-BD', { month: 'short' })}
                 </span>
                 <span className="text-3xl font-black text-slate-800 dark:text-slate-100 my-1">
                   {date.getDate()}
                 </span>
                 <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                   {date.toLocaleString('en-US', { weekday: 'short' })}
                 </span>
              </div>
              
              <div className="p-6 flex-grow space-y-3">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 leading-tight">{event.title}</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium leading-relaxed line-clamp-2">{event.description}</p>
                
                <div className="flex flex-wrap gap-4 pt-1">
                  <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    <Clock size={14} className="text-blue-600 dark:text-blue-400" />
                    {date.toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    <MapPin size={14} className="text-blue-600 dark:text-blue-400" />
                    {event.location}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
        {events.length === 0 && (
          <div className="text-center py-20 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
             <CalendarIcon size={48} className="mx-auto mb-4 text-slate-300 dark:text-slate-700" />
             <p className="text-slate-500 dark:text-slate-400 font-medium">কোন ইভেন্ট পাওয়া যায়নি।</p>
          </div>
        )}
      </div>

      {/* Add Event Modal */}
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
              <h3 className="text-2xl font-black tracking-tighter uppercase mb-6 text-slate-800 dark:text-slate-100">নতুন ইভেন্ট যোগ করুন</h3>
              <form onSubmit={handleAddEvent} className="space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-400 dark:text-slate-500 mb-1 ml-1 block">ইভেন্ট নাম</label>
                  <input 
                    value={newEvent.title}
                    onChange={e => setNewEvent({...newEvent, title: e.target.value})}
                    placeholder="মিটিং / বার্ষিক বনভোজন..."
                    className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border-2 border-transparent focus:border-blue-600 outline-none text-slate-800 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-700"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-400 dark:text-slate-500 mb-1 ml-1 block">তারিখ ও সময়</label>
                  <input 
                    type="datetime-local"
                    value={newEvent.dateTime}
                    onChange={e => setNewEvent({...newEvent, dateTime: e.target.value})}
                    className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border-2 border-transparent focus:border-blue-600 outline-none text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-400 dark:text-slate-500 mb-1 ml-1 block">স্থান</label>
                  <input 
                    value={newEvent.location}
                    onChange={e => setNewEvent({...newEvent, location: e.target.value})}
                    placeholder="সংগঠন কার্যালয় / পার্ক..."
                    className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border-2 border-transparent focus:border-blue-600 outline-none text-slate-800 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-700"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-400 dark:text-slate-500 mb-1 ml-1 block">বর্ণনা</label>
                  <textarea 
                    value={newEvent.description}
                    onChange={e => setNewEvent({...newEvent, description: e.target.value})}
                    placeholder="বিস্তারিত লিখুন..."
                    className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border-2 border-transparent focus:border-blue-600 outline-none resize-none text-slate-800 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-700"
                    rows={3}
                  />
                </div>
                <button type="submit" className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all">সেভ করুন</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
