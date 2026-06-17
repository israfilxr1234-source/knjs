import React, { useState, useEffect } from 'react';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, onSnapshot, updateDoc, collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { Member, MemberCategory, Notice, Event, BloodGroup, Role } from '../types';
import { Phone, MessageCircle, Mail, Shield, User, Edit3, ArrowLeft, Bell, Calendar as CalendarIcon, Award, Droplets, Copy, Check, ShieldCheck, ShieldAlert } from 'lucide-react';
import { motion } from 'motion/react';

interface MemberProfileProps {
  memberId: string;
  onBack: () => void;
  isOwnProfile: boolean;
}

export const categoryLabels: Record<MemberCategory, string> = {
  [MemberCategory.ACTIVE]: 'সক্রিয় সদস্য',
  [MemberCategory.VOLUNTEER]: 'স্বেচ্ছাসেবক',
  [MemberCategory.LEAD]: 'পরিচালক',
};

export const categoryColors: Record<MemberCategory, string> = {
  [MemberCategory.ACTIVE]: 'bg-green-100 text-green-600',
  [MemberCategory.VOLUNTEER]: 'bg-orange-100 text-orange-600',
  [MemberCategory.LEAD]: 'bg-indigo-100 text-indigo-600',
};

export const roleLabels: Record<Role, string> = {
  [Role.ADMIN]: 'অ্যাডমিন / পরিচালক',
  [Role.EXECUTIVE]: 'কার্যকরী সদস্য',
  [Role.GENERAL]: 'সাধারণ সদস্য',
};

export const roleColors: Record<Role, string> = {
  [Role.ADMIN]: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
  [Role.EXECUTIVE]: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  [Role.GENERAL]: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
};

const bloodGroups: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

export default function MemberProfile({ memberId, onBack, isOwnProfile }: MemberProfileProps) {
  const [member, setMember] = useState<Member | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<Member | null>(null);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ 
    name: '', 
    rank: '', 
    phone: '',
    category: MemberCategory.ACTIVE,
    bloodGroup: '' as BloodGroup | ''
  });
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const handleCopyPhone = () => {
    if (!member?.phone) return;
    navigator.clipboard.writeText(member.phone);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    // Current user profile to check if Admin
    if (auth.currentUser) {
      onSnapshot(doc(db, 'members', auth.currentUser.uid), (docSnap) => {
        if (docSnap.exists()) setCurrentUserProfile(docSnap.data() as Member);
      });
    }

    const unsubMember = onSnapshot(doc(db, 'members', memberId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as Member;
        setMember(data);
        setFormData({ 
          name: data.name, 
          rank: data.rank, 
          phone: data.phone,
          category: data.category || MemberCategory.ACTIVE,
          bloodGroup: data.bloodGroup || ''
        });
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `members/${memberId}`);
    });

    // Fetch activity history
    const fetchActivity = async () => {
      try {
        const noticeQ = query(
          collection(db, 'notices'), 
          where('authorId', '==', memberId),
          orderBy('createdAt', 'desc')
        );
        const noticeSnap = await getDocs(noticeQ);
        setNotices(noticeSnap.docs.map(d => ({ id: d.id, ...d.data() } as Notice)));

        const eventQ = query(
          collection(db, 'events'),
          where('organizerId', '==', memberId)
        );
        const eventSnap = await getDocs(eventQ);
        setEvents(eventSnap.docs.map(d => ({ id: d.id, ...d.data() } as Event)));
      } catch (error) {
        console.error(error);
      }
    };

    fetchActivity();

    return () => unsubMember();
  }, [memberId]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateDoc(doc(db, 'members', memberId), formData);
      setIsEditing(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `members/${memberId}`);
    }
  };

  const handleAdminAction = async (updates: Partial<Member>) => {
    try {
      const adminQuery = query(collection(db, 'members'), where('role', '==', Role.ADMIN));
      const adminSnap = await getDocs(adminQuery);
      const currentAdminsCount = adminSnap.size;

      // Rule 1: Maximum 3 Admins limit
      if (updates.role === Role.ADMIN && member.role !== Role.ADMIN) {
        if (currentAdminsCount >= 3) {
          alert('সংগঠনে একসাথে সর্বোচ্চ ৩ জন অ্যাডমিন থাকতে পারে। নতুন কাউকে অ্যাডমিন করতে হলে বর্তমান অ্যাডমিনদের একজনকে পদত্যাগ বা পদ পরিবর্তন করতে হবে।');
          return;
        }
      }

      // Rule 2: Minimum 1 Admin limit (Prevent last admin from demoting themselves)
      if (member.role === Role.ADMIN && updates.role && updates.role !== Role.ADMIN) {
        if (currentAdminsCount <= 1) {
          alert('অ্যাপে সবসময় অন্তত ১ জন অ্যাডমিন থাকতে হবে। আপনি একমাত্র অ্যাডমিন হওয়ায় নিজের পদ পরিবর্তন করতে পারবেন না। দয়া করে আগে অন্য কাউকে অ্যাডমিন হিসেবে নিয়োগ দিন।');
          return;
        }
      }

      await updateDoc(doc(db, 'members', memberId), updates);
      
      // If self-demoting
      if (isOwnProfile && updates.role && updates.role !== Role.ADMIN) {
        setIsEditing(false);
        alert('আপনার পদ সফলভাবে পরিবর্তন করা হয়েছে। আপনি এখন আর অ্যাডমিন নন।');
      } else {
        alert('সদস্যের পদ সফলভাবে আপডেট করা হয়েছে।');
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `members/${memberId}`);
    }
  };

  const isAdmin = currentUserProfile?.role === Role.ADMIN;

  if (loading) return <div className="p-8 text-center text-slate-400 dark:text-slate-500">লোড হচ্ছে...</div>;
  if (!member) return <div className="p-8 text-center text-red-500">সদস্য পাওয়া যায়নি।</div>;

  return (
    <div className="space-y-8 pb-12 font-sans">
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-bold text-sm uppercase tracking-widest"
      >
        <ArrowLeft size={16} /> ফিরে যান
      </button>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="h-32 bg-blue-600 relative">
          <div className="absolute -bottom-12 left-8 p-1 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl">
             <div className="w-24 h-24 rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-950">
               <img 
                 src={member.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.userId}`} 
                 className="w-full h-full object-cover"
                 referrerPolicy="no-referrer"
               />
             </div>
          </div>
          {member.isVerified && (
            <div className="absolute -bottom-8 left-24 bg-white dark:bg-slate-900 p-1 rounded-full shadow-lg">
              <ShieldCheck size={20} className="text-green-500 fill-green-50 dark:fill-green-900/20" />
            </div>
          )}
        </div>

        <div className="pt-16 p-8">
          <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-8">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <h2 className="text-3xl font-black tracking-tight text-slate-800 dark:text-slate-100">{member.name}</h2>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest ${roleColors[member.role]}`}>
                  {roleLabels[member.role]}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-xs italic">{member.rank}</p>
                {member.category && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest ${categoryColors[member.category]}`}>
                    {categoryLabels[member.category]}
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {isOwnProfile && !isEditing && (
                <button 
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-4 py-2 rounded-lg text-xs font-bold border border-slate-100 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all font-sans"
                >
                  <Edit3 size={14} /> প্রোফাইল এডিট
                </button>
              )}
              
              {isAdmin && (
                <div className="flex gap-2">
                  <select 
                    value={member.role}
                    onChange={(e) => handleAdminAction({ role: e.target.value as Role })}
                    className="bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 text-[10px] font-bold px-3 py-2 rounded-lg border border-purple-100 dark:border-purple-800 outline-none"
                  >
                    {Object.entries(roleLabels).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                  {!isOwnProfile && (
                    <button 
                      onClick={() => handleAdminAction({ isVerified: !member.isVerified })}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-bold border transition-all ${
                        member.isVerified 
                        ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-100 dark:border-green-900/30' 
                        : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-900/30'
                      }`}
                    >
                      {member.isVerified ? <ShieldCheck size={12} /> : <ShieldAlert size={12} />}
                      {member.isVerified ? 'ভেরিফাইড' : 'আনভেরিফাইড'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {!isEditing ? (
            <div className="grid sm:grid-cols-2 gap-4 max-w-2xl">
              <div 
                onClick={handleCopyPhone}
                className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950/50 rounded-xl border border-slate-100 dark:border-slate-800 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-white dark:bg-slate-900 rounded-lg text-blue-600 dark:text-blue-400 shadow-sm"><Phone size={18} /></div>
                  <div>
                    <p className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500">ফোন নম্বর</p>
                    <p className="font-bold text-slate-700 dark:text-slate-300">{member.phone || 'দেওয়া হয়নি'}</p>
                  </div>
                </div>
                {member.phone && (
                  <div className="text-slate-300 dark:text-slate-700 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-950/50 rounded-xl border border-slate-100 dark:border-slate-800">
                <div className="p-2 bg-white dark:bg-slate-900 rounded-lg text-red-500 dark:text-red-400 shadow-sm"><Droplets size={18} /></div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500">রক্তের গ্রুপ</p>
                  <p className="font-bold text-slate-700 dark:text-slate-300">{member.bloodGroup || 'দেওয়া হয়নি'}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-950/50 rounded-xl border border-slate-100 dark:border-slate-800">
                <div className="p-2 bg-white dark:bg-slate-900 rounded-lg text-indigo-600 dark:text-indigo-400 shadow-sm"><Mail size={18} /></div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500">ইমেইল</p>
                  <p className="font-bold text-slate-700 dark:text-slate-300 truncate max-w-[150px]">{member.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-950/50 rounded-xl border border-slate-100 dark:border-slate-800">
                <div className="p-2 bg-white dark:bg-slate-900 rounded-lg text-amber-600 dark:text-amber-400 shadow-sm"><Shield size={18} /></div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500">আইডি স্ট্যাটাস</p>
                  <p className={`font-bold ${member.isVerified ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                    {member.isVerified ? 'অনুমোদিত' : 'অনুমোদন পেন্ডিং'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <motion.form 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onSubmit={handleUpdate} 
              className="space-y-6 max-w-xl"
            >
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 ml-1">নাম</label>
                  <input 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 focus:border-blue-600 outline-none text-sm text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 ml-1">পদবী</label>
                  <input 
                    value={formData.rank}
                    onChange={e => setFormData({...formData, rank: e.target.value})}
                    className="w-full p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 focus:border-blue-600 outline-none text-sm text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 ml-1">ফোন নম্বর</label>
                  <input 
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    className="w-full p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 focus:border-blue-600 outline-none text-sm text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 ml-1">ক্যাটাগরি</label>
                  <select 
                    value={formData.category}
                    onChange={e => setFormData({...formData, category: e.target.value as MemberCategory})}
                    className="w-full p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 focus:border-blue-600 outline-none text-sm appearance-none text-slate-800 dark:text-slate-100"
                  >
                    {Object.entries(categoryLabels).map(([value, label]) => (
                      <option key={value} value={value} className="bg-white dark:bg-slate-900">{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 ml-1">রক্তের গ্রুপ</label>
                  <select 
                    value={formData.bloodGroup}
                    onChange={e => setFormData({...formData, bloodGroup: e.target.value as BloodGroup})}
                    className="w-full p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 focus:border-blue-600 outline-none text-sm appearance-none text-slate-800 dark:text-slate-100"
                  >
                    <option value="" className="bg-white dark:bg-slate-900">নির্বাচন করুন</option>
                    {bloodGroups.map(group => (
                      <option key={group} value={group} className="bg-white dark:bg-slate-900">{group}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <button className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all">আপডেট করুন</button>
            </motion.form>
          )}
        </div>
      </div>

      {/* Activity History */}
      {(notices.length > 0 || events.length > 0) && (
        <div className="grid md:grid-cols-2 gap-8">
          {notices.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-2">
                <Bell size={16} /> সাম্প্রতিক নোটিশ ({notices.length})
              </h3>
              <div className="space-y-3">
                {notices.map(notice => (
                  <div key={notice.id} className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">{notice.title}</h4>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase mt-1">
                      {notice.createdAt?.toDate ? notice.createdAt.toDate().toLocaleDateString('bn-BD') : 'সম্প্রতি'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {events.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-2">
                <CalendarIcon size={16} /> ইভেন্ট আয়োজন ({events.length})
              </h3>
              <div className="space-y-3">
                {events.map(event => (
                  <div key={event.id} className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">{event.title}</h4>
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">{new Date(event.dateTime).toLocaleDateString('bn-BD')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

