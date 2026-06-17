/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { auth, db, handleFirestoreError, OperationType } from './lib/firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, onSnapshot, collection, query, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { Member, Role, MemberCategory, Notice, Event, FundRecord, ActivityLog } from './types';
import { 
  Users, 
  Bell, 
  Calendar, 
  Wallet, 
  LogOut, 
  Menu, 
  X,
  User as UserIcon,
  ShieldCheck,
  Plus,
  Settings as SettingsIcon,
  History,
  Sun,
  Moon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Components
import MemberDirectory from './components/MemberDirectory';
import NoticeBoard from './components/NoticeBoard';
import EventCalendar from './components/EventCalendar';
import FundTracker from './components/FundTracker';
import MemberProfile from './components/MemberProfile';
import ReportSystem from './components/ReportSystem';
import Settings from './components/Settings';
import ActivityLogView from './components/ActivityLogView';

import { requestNotificationPermission } from './services/notificationService';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [memberProfile, setMemberProfile] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'members' | 'notices' | 'events' | 'funds' | 'reports' | 'settings' | 'logs'>('notices');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
    }
    return 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        // Request notifications
        requestNotificationPermission();

        // Fetch or create member profile
        const docRef = doc(db, 'members', user.uid);
        try {
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const data = docSnap.data() as Member;
            // Force sync admin for developer
            let updatedProfile: any;
            if (user.email === 'israfilxr1234@gmail.com' && (data.role !== Role.ADMIN || !data.isVerified)) {
              updatedProfile = { 
                ...data, 
                role: Role.ADMIN, 
                isVerified: true,
                rank: 'Organization Head',
                category: MemberCategory.LEAD,
                lastLogin: serverTimestamp()
              };
              await updateDoc(docRef, updatedProfile);
            } else {
              updatedProfile = data;
              await updateDoc(docRef, { lastLogin: serverTimestamp() });
            }
            setMemberProfile(updatedProfile);

            // Log Login
            await addDoc(collection(db, 'activityLogs'), {
              userId: user.uid,
              userName: updatedProfile.name,
              type: 'login',
              timestamp: serverTimestamp()
            });
          } else {
            // New member
            const isAdmin = user.email === 'israfilxr1234@gmail.com';
            const newProfile: Member = {
              userId: user.uid,
              name: user.displayName || 'Unnamed Member',
              rank: isAdmin ? 'Organization Head' : 'সদস্য',
              phone: '',
              email: user.email || '',
              photoURL: user.photoURL || '',
              role: isAdmin ? Role.ADMIN : Role.GENERAL,
              category: isAdmin ? MemberCategory.LEAD : MemberCategory.ACTIVE,
              isVerified: isAdmin,
              notificationPreferences: {
                urgentNotices: true,
                eventReminders: true
              },
              lastLogin: serverTimestamp()
            };
            await setDoc(docRef, newProfile);
            setMemberProfile(newProfile);

            // Log Login for new member
            await addDoc(collection(db, 'activityLogs'), {
              userId: user.uid,
              userName: newProfile.name,
              type: 'login',
              timestamp: serverTimestamp()
            });
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `members/${user.uid}`);
        }
      } else {
        setMemberProfile(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const login = () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider);
  };

  const logout = async () => {
    try {
      if (user && memberProfile) {
        await addDoc(collection(db, 'activityLogs'), {
          userId: user.uid,
          userName: memberProfile.name,
          type: 'logout',
          timestamp: serverTimestamp()
        });
      }
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 text-center transition-colors duration-300">
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           className="max-w-md w-full p-12 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none"
        >
          <div className="space-y-4 mb-10">
            <h1 className="text-4xl font-extrabold tracking-tight text-blue-600">
              অর্গSync
            </h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium">
              সংগঠনের অভ্যন্তরীণ কাজ পরিচালনা এবং সদস্যদের মধ্যে যোগাযোগ রক্ষা করার আধুনিক প্ল্যাটফর্ম।
            </p>
          </div>
          
          <button
            onClick={login}
            className="w-full flex items-center justify-center gap-3 bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-600/20"
          >
            Google দিয়ে লগইন করুন
          </button>
        </motion.div>
      </div>
    );
  }

  const navItems = [
    { id: 'notices', label: 'নোটিশ বোর্ড', icon: Bell },
    { id: 'members', label: 'সদস্য তালিকা', icon: Users },
    { id: 'events', label: 'ইভেন্ট ক্যালেন্ডার', icon: Calendar },
    { id: 'funds', label: 'ফান্ড ট্র্যাকার', icon: Wallet },
    { id: 'settings' as const, label: 'সেটিংস', icon: SettingsIcon },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans flex overflow-hidden transition-colors duration-300">
      {/* Sidebar - Desktop Only */}
      <aside className="hidden lg:flex w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-col shrink-0">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 mb-4">
          <h1 className="text-xl font-bold text-blue-600 tracking-tight">অর্গSync</h1>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">অর্গানাইজেশন ম্যানেজমেন্ট</p>
        </div>
        
        <nav className="flex-1 px-4 space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setSelectedMemberId(null);
                  }}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg font-semibold transition-all ${
                    activeTab === item.id 
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' 
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <item.icon size={20} />
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>

        <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
          <div 
            onClick={() => setSelectedMemberId(user.uid)}
            className="flex items-center gap-3 mb-6 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0 group-hover:border-blue-600 transition-all">
              <img 
                src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} 
                className="w-full h-full object-cover" 
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold truncate group-hover:text-blue-600 dark:text-slate-200">{memberProfile?.name}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-tighter truncate">{memberProfile?.rank}</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="w-full flex items-center gap-2 text-xs font-bold text-red-500 hover:text-red-600"
          >
            <LogOut size={14} /> লগআউট করুন
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Header - Mobile & Desktop State Header */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 shrink-0 lg:h-20">
          <div className="flex items-center gap-4">
             <h2 className="text-lg font-bold lg:text-xl">
               {selectedMemberId ? 'সদস্য প্রোফাইল' : navItems.find(i => i.id === activeTab)?.label}
             </h2>
             <div className="hidden sm:flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-full">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">লাইভ</span>
             </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              title={theme === 'light' ? 'ডার্ক মোড' : 'লাইট মোড'}
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700"
            >
              {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </header>

        {/* Scrollable Main Area */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8 pb-32 lg:pb-8 scroll-smooth">
          <div className="max-w-5xl mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedMemberId || activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {selectedMemberId ? (
                  <MemberProfile 
                    memberId={selectedMemberId} 
                    isOwnProfile={selectedMemberId === user.uid} 
                    onBack={() => setSelectedMemberId(null)}
                  />
                ) : (
                  <>
                    {activeTab === 'notices' && (
                      <NoticeBoard 
                        canPost={memberProfile?.role !== Role.GENERAL} 
                        preferences={memberProfile?.notificationPreferences}
                      />
                    )}
                    {activeTab === 'members' && <MemberDirectory onSelectMember={setSelectedMemberId} />}
                    {activeTab === 'events' && (
                      <EventCalendar 
                        isAdmin={memberProfile?.role !== Role.GENERAL} 
                        preferences={memberProfile?.notificationPreferences}
                      />
                    )}
                    {activeTab === 'funds' && <FundTracker isAdmin={memberProfile?.role === Role.ADMIN} />}
                    {activeTab === 'reports' && (
                      <ReportSystem 
                        role={memberProfile?.role || Role.GENERAL} 
                        authorName={memberProfile?.name || ''} 
                        onBack={() => setActiveTab('settings')}
                      />
                    )}
                    {activeTab === 'settings' && memberProfile && (
                      <Settings 
                        member={memberProfile} 
                        onBack={() => setActiveTab('notices')} 
                        onTabChange={setActiveTab}
                      />
                    )}
                    {activeTab === 'logs' && memberProfile?.role === Role.ADMIN && (
                      <ActivityLogView onBack={() => setActiveTab('settings')} />
                    )}
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* Mobile Drawer Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 lg:hidden"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="fixed right-0 top-0 bottom-0 w-72 bg-white dark:bg-slate-900 z-[60] p-6 shadow-2xl flex flex-col lg:hidden transition-colors border-l border-slate-100 dark:border-slate-800"
            >
               <div className="flex justify-between items-center mb-8">
                 <h1 className="text-xl font-black text-blue-600 dark:text-blue-400 tracking-tight">অর্গSync</h1>
                 <button onClick={() => setIsMenuOpen(false)} className="text-slate-500 dark:text-slate-400"><X size={24} /></button>
               </div>
               
               <div className="space-y-4 mb-auto">
                <div 
                  onClick={() => {
                    setSelectedMemberId(user.uid);
                    setIsMenuOpen(false);
                  }}
                  className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden shrink-0">
                    <img src={user.photoURL || ''} className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{memberProfile?.name}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono italic truncate">{memberProfile?.role}</p>
                  </div>
                </div>

                <nav className="space-y-1">
                  {navItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        setIsMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl font-bold transition-all ${
                        activeTab === item.id 
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' 
                        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <item.icon size={20} />
                      {item.label}
                    </button>
                  ))}
                </nav>
               </div>

               <button 
                onClick={logout}
                className="flex items-center justify-center gap-3 p-4 text-red-500 border border-red-100 dark:border-red-900/30 rounded-xl font-bold mt-4"
              >
                <LogOut size={20} /> লগআউট করুন
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bottom Nav (Mobile Only) */}
      <nav className="fixed bottom-0 left-0 right-0 h-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 flex items-center justify-around px-4 pb-4 lg:hidden z-40 transition-colors">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              setActiveTab(item.id);
              setSelectedMemberId(null);
            }}
            className={`flex flex-col items-center gap-1 transition-all ${
              activeTab === item.id ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'
            }`}
          >
            <item.icon size={22} strokeWidth={activeTab === item.id ? 2.5 : 2} />
            <span className="text-[9px] font-bold uppercase tracking-widest">{item.label.split(' ')[0]}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
