import React, { useState, useEffect } from 'react';
import { 
  signInWithPopup, 
  onAuthStateChanged, 
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword 
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query,
  where,
  serverTimestamp 
} from 'firebase/firestore';
import { 
  LayoutDashboard, 
  Plus, 
  LogOut, 
  User, 
  Users, 
  ChevronLeft, 
  X, 
  Settings, 
  MapPin, 
  Mail,
  Lock
} from 'lucide-react';

// --- IMPORTS ---
import { auth, db, appId, googleProvider } from './firebase';
import { Button, Card } from './utils';
import { createTeam, createSchedule, COLLECTIONS } from './models';
import TeamCard from './components/TeamCard';
import ScheduleList from './components/ScheduleList'; 
import MatchmakingWorkflow from './components/MatchmakingWorkflow'; 
import RosterEditor from './components/RosterEditor'; 

// --- COMPONENT: LOGIN PAGE ---
const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true); // Toggle between Login and Sign Up
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed:", error);
      setError(`Google Login failed: ${error.message}`);
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        // Sign In
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        // Sign Up (Create User)
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      console.error("Auth error:", err);
      // Simplify Firebase error messages for the user
      const msg = err.code ? err.code.replace('auth/', '').replace(/-/g, ' ') : err.message;
      setError(msg.charAt(0).toUpperCase() + msg.slice(1));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 animate-in fade-in duration-700">
      <div className="max-w-md w-full space-y-8 text-center">
        <div className="bg-slate-900/50 p-8 rounded-2xl border border-slate-800 shadow-2xl backdrop-blur-xl">
          
          {/* Logo & Header */}
          <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 w-16 h-16 rounded-xl mx-auto flex items-center justify-center mb-6 shadow-lg shadow-blue-900/20">
            <Users className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Pinpoint Matchups</h1>
          <p className="text-slate-400 mb-6 leading-relaxed text-sm">
            {isLogin ? 'Sign in to manage your team.' : 'Create an account to get started.'}
          </p>

          {/* Email/Password Form */}
          <form onSubmit={handleEmailAuth} className="space-y-4 text-left">
            {error && (
              <div className="bg-red-900/30 border border-red-800 text-red-200 text-xs p-3 rounded-lg">
                {error}
              </div>
            )}
            
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input 
                  type="email" 
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg py-3 pl-10 pr-4 text-white placeholder-slate-600 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="coach@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input 
                  type="password" 
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg py-3 pl-10 pr-4 text-white placeholder-slate-600 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-slate-900 px-2 text-slate-500">Or continue with</span>
            </div>
          </div>
          
          {/* Google Button */}
          <button 
            onClick={handleGoogleLogin} 
            className="w-full flex items-center justify-center py-3 px-4 bg-white text-slate-900 hover:bg-slate-100 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl hover:scale-[1.02]"
          >
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5 mr-3" alt="Google" />
            Google
          </button>
        </div>

        {/* Toggle Login/Signup */}
        <p className="text-slate-500 text-sm">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button 
            onClick={() => { setIsLogin(!isLogin); setError(''); }} 
            className="text-blue-400 hover:text-blue-300 font-bold hover:underline"
          >
            {isLogin ? 'Sign up' : 'Log in'}
          </button>
        </p>
      </div>
    </div>
  );
};

// --- TEAM DASHBOARD COMPONENT ---
const TeamDashboard = ({ team, user, onBack }) => {
  const [activeTab, setActiveTab] = useState('schedules'); 
  const [schedules, setSchedules] = useState([]);
  const [roster, setRoster] = useState([]);
  const [currentSchedule, setCurrentSchedule] = useState(null); 

  // Local State for Profile Editing
  const [profileData, setProfileData] = useState({
      name: team.metadata.name,
      abbreviation: team.metadata.abbreviation,
      defaultLocation: team.metadata.defaultLocation || '',
      coaches: team.roles.coaches?.join(', ') || ''
  });

  // Fetch Team Data
  useEffect(() => {
    if (!team?.id || !user) return;

    // 1. Fetch Schedules
    const scheduleQuery = collection(db, 'artifacts', appId, COLLECTIONS.TEAMS, team.id, COLLECTIONS.EVENTS);
    const unsubSchedules = onSnapshot(scheduleQuery, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // SORT: Oldest -> Newest based on Date (or creation time if date missing)
      const sortedData = data.sort((a, b) => {
        const dateA = a.date || a.created_at;
        const dateB = b.date || b.created_at;
        if (dateA < dateB) return -1;
        if (dateA > dateB) return 1;
        return 0;
      });
      
      setSchedules(sortedData);
    }, (error) => {
       console.log("Schedule listener stopped:", error.code);
    });

    // 2. Fetch Roster
    if (team.roster) {
      setRoster(team.roster);
    }

    return () => {
      unsubSchedules();
    };
  }, [team.id, user]);

  // --- HANDLERS ---
  
  const handleSaveProfile = async () => {
      try {
          const coachesArray = profileData.coaches.split(',').map(c => c.trim()).filter(Boolean);
          
          // --- VALIDATION: MAX 2 COACHES ---
          if (coachesArray.length > 2) {
            alert("You can only add up to 2 Assistant Coaches.");
            return;
          }
          
          await updateDoc(doc(db, 'artifacts', appId, COLLECTIONS.TEAMS, team.id), {
              'metadata.name': profileData.name,
              'metadata.abbreviation': profileData.abbreviation,
              'metadata.defaultLocation': profileData.defaultLocation,
              'roles.coaches': coachesArray
          });
          alert("Team Profile Updated");
      } catch(e) {
          console.error(e);
          alert("Error saving profile");
      }
  };

  const handleCreateSchedule = async () => {
    const newSchedule = createSchedule('New Matchup Event', new Date().toISOString().split('T')[0], user.uid);
    // Use default location from profile
    if (team.metadata.defaultLocation) {
        newSchedule.location = team.metadata.defaultLocation;
    }
    newSchedule.rosterSnapshot = roster; 
    
    try {
      const ref = await addDoc(collection(db, 'artifacts', appId, COLLECTIONS.TEAMS, team.id, COLLECTIONS.EVENTS), newSchedule);
      setCurrentSchedule({ ...newSchedule, id: ref.id });
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateRoster = async (newRoster) => {
    setRoster(newRoster);
    try {
      await updateDoc(doc(db, 'artifacts', appId, COLLECTIONS.TEAMS, team.id), {
        roster: newRoster
      });
    } catch (e) {
      console.error("Error saving roster", e);
    }
  };

  const handleUpdateSchedule = async (scheduleId, data) => {
    try {
        await updateDoc(doc(db, 'artifacts', appId, COLLECTIONS.TEAMS, team.id, COLLECTIONS.EVENTS, scheduleId), {
            ...data,
            modified_at: serverTimestamp()
        });
        if (currentSchedule?.id === scheduleId) {
            setCurrentSchedule(prev => ({ ...prev, ...data }));
        }
    } catch (e) {
        console.error(e);
    }
  };

  const deleteSchedule = async (id) => {
      if(!confirm("Delete this schedule?")) return;
      await deleteDoc(doc(db, 'artifacts', appId, COLLECTIONS.TEAMS, team.id, COLLECTIONS.EVENTS, id));
      setCurrentSchedule(null);
  };

  // --- RENDER: EVENT EDITOR ---
  if (currentSchedule) {
      return (
          <div className="animate-in fade-in slide-in-from-right-4 h-[calc(100vh-100px)] flex flex-col">
              <div className="flex items-center justify-between mb-6 shrink-0">
                  <div className="flex items-center">
                    <button onClick={() => setCurrentSchedule(null)} className="mr-4 p-2 hover:bg-slate-800 rounded-full text-slate-400">
                        <ChevronLeft />
                    </button>
                    <div>
                        <h2 className="text-2xl font-bold text-white">{currentSchedule.name || 'Event Details'}</h2>
                        <span className="text-sm text-slate-500">Managed Event</span>
                    </div>
                  </div>
                  
                  {/* Status Dropdown REMOVED */}
              </div>

              {/* UNIFIED WORKFLOW RENDER */}
              <div className="flex-1 min-h-0">
                  <MatchmakingWorkflow 
                      hostName={team.metadata.name}
                      event={currentSchedule}
                      roster={roster}
                      onUpdateEvent={handleUpdateSchedule}
                  />
              </div>
          </div>
      );
  }

  // --- RENDER: DASHBOARD ---
  return (
    <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col">
      {/* Team Header */}
      <div className="flex items-center justify-between bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50 shrink-0">
        <div className="flex items-center">
            <button onClick={onBack} className="mr-6 p-2 hover:bg-slate-700 rounded-lg text-slate-400 transition-colors">
                <LayoutDashboard size={24} />
            </button>
            <div>
                <h1 className="text-3xl font-bold text-white mb-1">{team.metadata.name}</h1>
                <div className="flex items-center gap-4 text-sm text-slate-400">
                    <span className="flex items-center gap-1"><User size={14}/> Owner</span>
                    <span className="flex items-center gap-1"><Users size={14}/> {roster.length} Wrestlers</span>
                </div>
            </div>
        </div>
        
        {/* Tabs */}
        <div className="flex bg-slate-900 p-1.5 rounded-xl">
            <button 
                onClick={() => setActiveTab('profile')}
                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'profile' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
                Profile
            </button>
            <button 
                onClick={() => setActiveTab('roster')}
                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'roster' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
                Roster
            </button>
            <button 
                onClick={() => setActiveTab('schedules')}
                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'schedules' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
                Schedule
            </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 min-h-0">
        {activeTab === 'profile' && (
            <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                <Card className="p-6 space-y-6">
                    <h3 className="text-xl font-bold text-white border-b border-slate-700 pb-4">Team Settings</h3>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Team Name</label>
                                <input 
                                    className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={profileData.name}
                                    onChange={e => setProfileData({...profileData, name: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Abbreviation</label>
                                <input 
                                    className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none uppercase"
                                    maxLength={4}
                                    value={profileData.abbreviation}
                                    onChange={e => setProfileData({...profileData, abbreviation: e.target.value})}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                <MapPin size={14}/> Default Home Location
                            </label>
                            <input 
                                className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="e.g. Lincoln High School Gym"
                                value={profileData.defaultLocation}
                                onChange={e => setProfileData({...profileData, defaultLocation: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                <Mail size={14}/> Assistant Coaches (Max 2)
                            </label>
                            <textarea 
                                className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none"
                                placeholder="Enter email addresses, separated by commas..."
                                value={profileData.coaches}
                                onChange={e => setProfileData({...profileData, coaches: e.target.value})}
                            />
                            <p className="text-xs text-slate-500 mt-2">Invites will be sent in a future update.</p>
                        </div>
                    </div>
                    <div className="pt-4 flex justify-end">
                        <Button onClick={handleSaveProfile}>Save Profile</Button>
                    </div>
                </Card>
            </div>
        )}

        {activeTab === 'schedules' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold text-white">Event Schedule</h3>
                    <Button onClick={handleCreateSchedule} icon={Plus}>New Event</Button>
                </div>
                
                <ScheduleList 
                    schedules={schedules} 
                    onEdit={setCurrentSchedule}
                    onDelete={deleteSchedule}
                />
            </div>
        )}

        {activeTab === 'roster' && (
            <div className="h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
                <Card className="flex-1 flex flex-col p-6 min-h-0">
                    <div className="mb-6 pb-4 border-b border-slate-700 shrink-0">
                        <h2 className="text-xl font-bold text-white">Master Team Roster</h2>
                        <p className="text-slate-400 text-sm mt-1">Manage all wrestlers in your program.</p>
                    </div>
                    <RosterEditor 
                        roster={roster} 
                        teamName={team.metadata.name} 
                        onChange={handleUpdateRoster} 
                    />
                </Card>
            </div>
        )}
      </div>
    </div>
  );
};


// --- MAIN APP CONTROLLER ---
export default function App() {
  const [user, setUser] = useState(null);
  const [userTeams, setUserTeams] = useState([]);
  const [currentTeam, setCurrentTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Create Team Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTeamData, setNewTeamData] = useState({ name: '', abbr: '', coaches: '' });

  // Auth Listener (Updated for Google Auth)
  useEffect(() => {
    // We do NOT use signInAnonymously anymore.
    // Instead we wait for the user to login via the LoginPage
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Fetch User's Teams
  useEffect(() => {
    if (!user) {
        setUserTeams([]);
        return;
    }
    
    // Safety check: ensure we have a valid UID before querying
    if (!user.uid) return;

    const q = query(
      collection(db, 'artifacts', appId, COLLECTIONS.TEAMS),
      where('roles.owner', '==', user.uid)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const teams = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUserTeams(teams);
    }, (error) => {
        console.log("Team list snapshot error:", error.code);
    });
    return () => unsubscribe();
  }, [user]);

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (!user || !newTeamData.name) return; 
    
    const coachesList = newTeamData.coaches.split(',').map(c => c.trim()).filter(Boolean);
    
    // --- VALIDATION: MAX 2 COACHES ---
    if (coachesList.length > 2) {
      alert("You can only add up to 2 Assistant Coaches.");
      return;
    }

    const newTeam = createTeam(user.uid, newTeamData.name, newTeamData.abbr, coachesList);
    
    try {
      await addDoc(collection(db, 'artifacts', appId, COLLECTIONS.TEAMS), newTeam);
      setShowCreateModal(false);
      setNewTeamData({ name: '', abbr: '', coaches: '' });
    } catch (e) {
      console.error(e);
    }
  };

  // Safe Sign Out
  const handleSignOut = async () => {
      try {
          setCurrentTeam(null);
          setUserTeams([]);
          await signOut(auth);
          // App will naturally re-render the LoginPage due to !user check
      } catch (error) {
          console.error("Error signing out:", error);
      }
  };

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500">Loading Pinpoint...</div>;

  // --- UNAUTHENTICATED STATE ---
  if (!user) {
      return <LoginPage />;
  }

  // --- AUTHENTICATED STATE ---
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-blue-500/30 overflow-hidden flex flex-col">
      {/* Top Nav */}
      <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md shrink-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center cursor-pointer" onClick={() => setCurrentTeam(null)}>
              <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 p-2 rounded-lg mr-3">
                <Users className="text-white" size={20} />
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                Pinpoint Matchups
              </span>
            </div>
            
            <div className="flex items-center space-x-4">
                <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                        <div className="text-sm font-bold text-white">{user.displayName || user.email}</div>
                        <div className="text-xs text-slate-500">Coach</div>
                    </div>
                    {user.photoURL ? (
                        <img src={user.photoURL} alt="User" className="h-8 w-8 rounded-full border border-slate-600" />
                    ) : (
                        <div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center border border-slate-600">
                            <User size={16} />
                        </div>
                    )}
                </div>
                <button className="text-sm text-slate-400 hover:text-red-400 p-2 hover:bg-slate-800 rounded-lg transition-colors" onClick={handleSignOut} title="Sign Out">
                    <LogOut size={18} />
                </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full overflow-hidden">
        
        {/* VIEW 1: TEAM DASHBOARD (Inside a Team) */}
        {currentTeam ? (
          <TeamDashboard 
            team={currentTeam} 
            user={user} 
            onBack={() => setCurrentTeam(null)} 
          />
        ) : (
          
        /* VIEW 2: USER HOME (Team Selector) */
          <div className="space-y-8 animate-in fade-in duration-500 overflow-y-auto h-full">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Your Teams</h1>
                    <p className="text-slate-400 mt-1">Select a team to manage rosters and schedules.</p>
                </div>
                <Button onClick={() => setShowCreateModal(true)} icon={Plus}>Create Team</Button>
            </div>

            {userTeams.length === 0 ? (
                <div className="text-center py-20 bg-slate-900/50 rounded-2xl border border-dashed border-slate-700">
                    <div className="bg-slate-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Users className="text-slate-500" size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">No teams found</h3>
                    <p className="text-slate-500 max-w-sm mx-auto mb-6">
                        You haven't created or joined any teams yet. Create a team to start generating matchups.
                    </p>
                    <Button onClick={() => setShowCreateModal(true)} variant="primary">Create Your First Team</Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {userTeams.map(team => (
                        <TeamCard 
                            key={team.id} 
                            team={team} 
                            isOwner={team.roles.owner === user.uid}
                            onClick={() => setCurrentTeam(team)} 
                        />
                    ))}
                </div>
            )}
          </div>
        )}
      </main>

      {/* CREATE TEAM MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-white">Create New Team</h3>
                    <button onClick={() => setShowCreateModal(false)} className="text-slate-500 hover:text-white"><X size={24}/></button>
                </div>
                <form onSubmit={handleCreateTeam} className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Team Name</label>
                        <input 
                            required 
                            autoFocus
                            className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none" 
                            placeholder="e.g. Westside Warriors"
                            value={newTeamData.name} 
                            onChange={e => setNewTeamData({...newTeamData, name: e.target.value})} 
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Abbreviation (Opt)</label>
                        <input 
                            className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none uppercase" 
                            placeholder="e.g. WSW"
                            maxLength={4}
                            value={newTeamData.abbr} 
                            onChange={e => setNewTeamData({...newTeamData, abbr: e.target.value})} 
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Coach Emails</label>
                        <textarea 
                            className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none h-20 resize-none" 
                            placeholder="coach1@example.com, coach2@example.com"
                            value={newTeamData.coaches} 
                            onChange={e => setNewTeamData({...newTeamData, coaches: e.target.value})} 
                        />
                    </div>
                    <div className="pt-2 flex justify-end gap-3">
                        <Button variant="ghost" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                        <Button type="submit">Create Team</Button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
}