import { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType, auth } from '../lib/firebase';
import { collection, query, onSnapshot, doc } from 'firebase/firestore';
import { Member, Role } from '../types';
import { Shield, ChevronRight, ShieldCheck, User, Search } from 'lucide-react';
import { motion } from 'motion/react';
import { categoryLabels, categoryColors, roleLabels, roleColors } from './MemberProfile';

interface MemberDirectoryProps {
  onSelectMember: (id: string) => void;
}

export default function MemberDirectory({ onSelectMember }: MemberDirectoryProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (auth.currentUser) {
      onSnapshot(doc(db, 'members', auth.currentUser.uid), (docSnap) => {
        if (docSnap.exists()) setIsAdmin(docSnap.data().role === Role.ADMIN);
      });
    }

    const q = query(collection(db, 'members'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => doc.data() as Member);
      setMembers(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'members');
    });
    return () => unsubscribe();
  }, []);

  const filteredMembers = members.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.rank.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingMembers = filteredMembers.filter(m => !m.isVerified);
  const verifiedMembers = filteredMembers.filter(m => m.isVerified);

  return (
    <div className="space-y-8 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">সদস্য তালিকা</h2>
          <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase mt-1">সব ভেরিফাইড মেম্বার</p>
        </div>

        <div className="relative group max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={16} />
          <input 
            type="text"
            placeholder="নাম বা পদবী দিয়ে খুঁজুন..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-50 dark:focus:ring-blue-900/20 transition-all shadow-sm text-slate-800 dark:text-slate-100"
          />
        </div>
      </div>

      {isAdmin && pendingMembers.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-red-500 bg-red-50 dark:bg-red-950/30 px-4 py-2 rounded-lg inline-block">
            অনুমোদন পেন্ডিং ({pendingMembers.length})
          </h3>
          <div className="grid gap-3">
            {pendingMembers.map(member => (
              <motion.div 
                key={member.userId}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => onSelectMember(member.userId)}
                className="bg-red-50/30 dark:bg-red-950/10 p-4 rounded-xl border border-red-100 dark:border-red-900/20 flex items-center justify-between cursor-pointer hover:bg-red-50 dark:hover:bg-red-950/20 transition-all border-dashed"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 overflow-hidden flex items-center justify-center font-bold text-xs uppercase">
                    {member.photoURL ? <img src={member.photoURL} className="w-full h-full object-cover" /> : member.name.substring(0, 2)}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{member.name}</p>
                    <p className="text-[10px] text-red-400 font-bold uppercase">নতুন রিকোয়েস্ট</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-red-300 dark:text-red-800" />
              </motion.div>
            ))}
          </div>
          <div className="border-b border-slate-100 dark:border-slate-800 my-8"></div>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        {verifiedMembers.map((member) => (
          <motion.div 
            key={member.userId}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => onSelectMember(member.userId)}
            className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between hover:border-blue-200 dark:hover:border-blue-900/50 cursor-pointer transition-all group"
          >
            <div className="flex items-center gap-3 min-w-0">
               <div className="relative shrink-0">
                 <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 border border-slate-200 dark:border-slate-700 overflow-hidden flex items-center justify-center font-bold text-xs uppercase italic">
                    {member.photoURL ? (
                      <img alt={member.name} src={member.photoURL} className="w-full h-full object-cover" />
                    ) : (
                      member.name.substring(0, 2)
                    )}
                 </div>
                 {member.isVerified && (
                   <div className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-900 p-0.5 rounded-full shadow-sm">
                     <ShieldCheck size={12} className="text-green-500 fill-green-50 dark:fill-green-900/20" />
                   </div>
                 )}
               </div>
               <div className="min-w-0">
                 <div className="flex items-center gap-2 flex-wrap mb-0.5">
                   <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{member.name}</p>
                   <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-widest ${roleColors[member.role]}`}>
                     {roleLabels[member.role].split(' ')[0]}
                   </span>
                 </div>
                 <div className="flex items-center gap-2">
                   <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium truncate">{member.rank}</p>
                   {member.category && (
                     <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider ${categoryColors[member.category]}`}>
                       {categoryLabels[member.category]}
                     </span>
                   )}
                 </div>
               </div>
            </div>

            <div className="text-slate-300 dark:text-slate-700 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all">
              <ChevronRight size={18} />
            </div>
          </motion.div>
        ))}

        {verifiedMembers.length === 0 && (
          <div className="col-span-full text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
            <Search size={48} className="mx-auto text-slate-200 dark:text-slate-800 mb-4" />
            <p className="text-slate-400 dark:text-slate-500 font-bold text-sm">কোন সদস্য পাওয়া যায়নি।</p>
          </div>
        )}
      </div>
    </div>
  );
}

