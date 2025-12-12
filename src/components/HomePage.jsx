import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  ArrowRight, 
  Calendar, 
  MapPin, 
  Clock, 
  Search, 
  Loader, 
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Lock
} from 'lucide-react';
import { collection, query, where, getDocs, collectionGroup } from 'firebase/firestore';
import { db } from '../firebase'; 
import { COLLECTIONS } from '../models';
import { formatDate } from '../utils';

// Helper for Collapsible Section
const EventSection = ({ title, events, isOpen, onToggle, onEventSelect, isLocked, userTier }) => {
  if (events.length === 0 && !isOpen) return null;

  return (
    <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/30 mb-4">
      <button 
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 bg-slate-900 hover:bg-slate-800 transition-colors"
      >
        <div className="flex items-center gap-2">
          {isOpen ? <ChevronDown size={18} className="text-blue-500" /> : <ChevronRight size={18} className="text-slate-500" />}
          <h3 className="font-bold text-white text-lg">{title}</h3>
          <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full ml-2">
            {events.length}
          </span>
        </div>
        {isLocked && (
          <div className="flex items-center gap-1.5 text-xs text-amber-500 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">
            <Lock size={12} />
            <span>Subscription Required</span>
          </div>
        )}
      </button>

      {isOpen && (
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-300">
          {events.length === 0 ? (
            <div className="col-span-full text-center py-8 text-slate-500 text-sm italic">
              No events found in this period.
            </div>
          ) : (
            events.map(event => (
              <div 
                key={event.id} 
                onClick={() => !isLocked && onEventSelect(event.teamId, event.id)}
                className={`bg-slate-900 border border-slate-800 p-5 rounded-xl transition-all group relative ${isLocked ? 'cursor-not-allowed opacity-75' : 'hover:border-blue-500/50 hover:bg-slate-800 cursor-pointer'}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-white text-lg group-hover:text-blue-400 transition-colors">{event.name}</h3>
                  {event.schedulingStatus === 'published' && title === "Today's Events" && (
                    <span className="flex items-center gap-1.5 bg-red-500/10 text-red-400 px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-red-500/20 animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> Live
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-400">
                  <div className="flex items-center gap-1">
                    <Calendar size={12}/> {formatDate(event.date)}
                  </div>
                  <div className="flex items-center gap-1"><MapPin size={12}/> {event.location || 'TBD'}</div>
                </div>
                
                {isLocked && (
                  <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[1px] flex items-center justify-center rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="bg-amber-600 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 transform translate-y-2 group-hover:translate-y-0 transition-transform">
                      <Lock size={12} /> Subscribe to View
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

const HomePage = ({ onLogin, onEventSelect, user }) => { 
  const [allEvents, setAllEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);
  
  // Section States (Default: Today open, others closed)
  const [sections, setSections] = useState({
    today: true,
    upcoming: false,
    previous: false
  });

  const userTier = user?.tier || 'free'; 
  const isPaidUser = userTier === 'paid' || userTier === 'admin';

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const eventsQuery = query(
            collectionGroup(db, COLLECTIONS.EVENTS), 
            where('schedulingStatus', '==', 'published')
        );

        const snapshot = await getDocs(eventsQuery);
        
        const events = snapshot.docs.map(doc => {
            const data = doc.data();
            const teamId = doc.ref.parent.parent?.id;
            return { id: doc.id, teamId, ...data };
        });

        setAllEvents(events);
        setLoading(false); 
      } catch (err) {
        console.error("Error fetching events:", err);
        if (err.code === 'failed-precondition') {
            setError("System Configuration Pending (Missing Index). Check Console.");
        } else {
            setError("Unable to load live events at this time.");
        }
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  // Categorize Events
  const categorizedEvents = useMemo(() => {
    // FIX: Use LOCAL time YYYY-MM-DD instead of UTC
    // This ensures that if the user sees it is Dec 12th on their computer, 
    // we match events stored as "2025-12-12".
    // 'en-CA' locale outputs YYYY-MM-DD format.
    const todayStr = new Date().toLocaleDateString('en-CA');
    const todayDate = new Date(todayStr + 'T00:00:00'); // Force local midnight
    
    // Calculate date boundaries using Date objects to avoid string math issues
    const nextWeekDate = new Date(todayDate);
    nextWeekDate.setDate(todayDate.getDate() + 7);
    const nextWeekStr = nextWeekDate.toLocaleDateString('en-CA');

    const prevTwoWeeksDate = new Date(todayDate);
    prevTwoWeeksDate.setDate(todayDate.getDate() - 14);
    const prevTwoWeeksStr = prevTwoWeeksDate.toLocaleDateString('en-CA');

    let filtered = allEvents;

    // Apply Search
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      filtered = filtered.filter(e => 
        e.name?.toLowerCase().includes(lower) || 
        e.location?.toLowerCase().includes(lower)
      );
    }

    const buckets = {
      today: [],
      upcoming: [],
      previous: []
    };

    filtered.forEach(event => {
      if (!event.date) return;
      
      // Compare strings (YYYY-MM-DD)
      if (event.date === todayStr) {
        buckets.today.push(event);
      } else if (event.date > todayStr && event.date <= nextWeekStr) {
        buckets.upcoming.push(event);
      } else if (event.date < todayStr && event.date >= prevTwoWeeksStr) {
        buckets.previous.push(event);
      }
    });

    // Sort buckets
    buckets.upcoming.sort((a,b) => a.date.localeCompare(b.date));
    buckets.previous.sort((a,b) => b.date.localeCompare(a.date));

    return buckets;
  }, [allEvents, searchTerm]);

  const toggleSection = (key) => {
    setSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans flex flex-col selection:bg-blue-500/30">
      {/* Header */}
      <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            
            {/* Left: Logo & Title */}
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 p-2 rounded-lg">
                <Users className="text-white" size={20} />
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 hidden sm:block">
                Pinpoint Matchups
              </span>
            </div>

            {/* Center: Navigation Links */}
            <div className="hidden md:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
                <a href="#" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">How it Works</a>
                <a href="#" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Pricing</a>
            </div>

            {/* Right: Login (Only show if not passed a user, but App.jsx handles this wrapper) */}
            <button 
                onClick={onLogin}
                className="text-sm font-bold text-slate-300 hover:text-white transition-colors bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg border border-slate-700"
            >
                Log In
            </button>
          </div>
        </div>
      </nav>

      {/* Main Section */}
      <main className="flex-1 flex flex-col p-4 relative overflow-hidden">
        {/* Background Accents */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-96 bg-blue-900/10 rounded-full blur-3xl -z-10" />

        <div className="max-w-4xl mx-auto w-full pt-16 pb-8 text-center space-y-6">
            
            {/* Hero Text */}
            <div className="space-y-2">
                <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight">
                    Pinpoint Matchups
                </h1>
                <p className="text-2xl md:text-3xl text-blue-400 font-light tracking-wide">
                    Scheduling Simplified
                </p>
            </div>

            {/* Divider */}
            <div className="flex justify-center py-6">
                <div className="w-24 h-1 bg-gradient-to-r from-slate-800 via-blue-500/50 to-slate-800 rounded-full"></div>
            </div>

            {/* SEARCH BAR */}
            <div className="max-w-lg mx-auto relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl opacity-30 group-hover:opacity-50 blur transition duration-200"></div>
                <div className="relative flex items-center bg-slate-900 rounded-xl">
                    <Search className="absolute left-4 text-slate-500" size={20} />
                    <input 
                        type="text" 
                        placeholder="Search for an event or team..." 
                        className="w-full bg-transparent border-none py-4 pl-12 pr-4 text-white placeholder-slate-500 focus:ring-0 text-lg outline-none rounded-xl"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                        <button className="absolute right-3 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-lg transition-colors">
                            Go
                        </button>
                    )}
                </div>
            </div>
        </div>

        {/* EVENTS LIST */}
        <div className="max-w-5xl mx-auto w-full mt-8 space-y-2">
            
            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader className="animate-spin text-blue-500" size={32} />
                </div>
            ) : error ? (
                <div className="text-center py-8 bg-slate-900/50 rounded-xl border border-red-900/30">
                    <AlertTriangle className="mx-auto text-red-500 mb-2" size={24} />
                    <p className="text-red-400 text-sm">{error}</p>
                </div>
            ) : (
                <>
                    {/* 1. Today's Events (Always Open by Default, Always Accessible) */}
                    <EventSection 
                        title="Today's Events" 
                        events={categorizedEvents.today} 
                        isOpen={sections.today} 
                        onToggle={() => toggleSection('today')}
                        onEventSelect={onEventSelect}
                        isLocked={false} 
                        userTier={userTier}
                    />

                    {/* 2. Upcoming Events (Locked for Free Users) */}
                    <EventSection 
                        title="Upcoming Events (Next 7 Days)" 
                        events={categorizedEvents.upcoming} 
                        isOpen={sections.upcoming} 
                        onToggle={() => toggleSection('upcoming')}
                        onEventSelect={onEventSelect}
                        isLocked={!isPaidUser}
                        userTier={userTier}
                    />

                    {/* 3. Previous Events (Locked for Free Users) */}
                    <EventSection 
                        title="Previous Events (Last 14 Days)" 
                        events={categorizedEvents.previous} 
                        isOpen={sections.previous} 
                        onToggle={() => toggleSection('previous')}
                        onEventSelect={onEventSelect}
                        isLocked={!isPaidUser}
                        userTier={userTier}
                    />
                </>
            )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-900/50 py-8 mt-auto shrink-0">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center text-slate-500 text-sm gap-4">
            <p>&copy; {new Date().getFullYear()} Pinpoint Matchups. All rights reserved.</p>
            <div className="flex gap-6">
                <a href="#" className="hover:text-slate-300 transition-colors">Privacy Policy</a>
                <a href="#" className="hover:text-slate-300 transition-colors">Terms of Service</a>
                <a href="#" className="hover:text-slate-300 transition-colors">Contact Support</a>
            </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;