import React, { useState, useEffect } from 'react';
import { signInAnonymously, onAuthStateChanged, signOut } from 'firebase/auth';
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
  Mail
} from 'lucide-react';

// --- IMPORTS ---
import { auth, db, appId } from './firebase';
import { Button, Card } from './utils';
import { createTeam, createSchedule, COLLECTIONS } from './models';
import TeamCard from './components/TeamCard';
import ScheduleList from './components/ScheduleList'; 
import MatchmakingWorkflow from './components/MatchmakingWorkflow'; 
import RosterEditor from './components/RosterEditor'; 

// --- TEAM DASHBOARD COMPONENT ---
const TeamDashboard = ({ team, user, onBack }) => {
  const [activeTab, setActiveTab] = useState('profile'); // profile | roster | schedules
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
      setSchedules(data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
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
                  
                  {/* Status Dropdown */}
                  <div className="flex gap-2">
                     <select 
                        value={currentSchedule.schedulingStatus}
                        onChange={e => handleUpdateSchedule(currentSchedule.id, { schedulingStatus: e.target.value })}
                        className="bg-slate-800 border border-slate-700 text-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                     >
                        <option value="not_started">Not Started</option>
                        <option value="in_progress">In Progress</option>
                        <option value="issue">Issue / Alert</option>
                        <option value="complete">Complete</option>
                        <option value="published">Published</option>
                     </select>
                  </div>
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
                                <Mail size={14}/> Assistant Coaches
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
                    <RosterEditor roster={roster} onChange={handleUpdateRoster} />
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

  // Auth Listener
  useEffect(() => {
    signInAnonymously(auth).catch(console.error);
    return onAuthStateChanged(auth, setUser);
  }, []);

  // Fetch User's Teams
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'artifacts', appId, COLLECTIONS.TEAMS),
      where('roles.owner', '==', user.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const teams = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUserTeams(teams);
      setLoading(false);
    }, (error) => {
        // Handle potential permission errors on logout
        console.log("Team list snapshot error:", error.code);
    });
    return () => unsubscribe();
  }, [user]);

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (!user || !newTeamData.name) return; // Guard clause added here
    
    const coachesList = newTeamData.coaches.split(',').map(c => c.trim()).filter(Boolean);
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
          // Force UI to unmount components that have listeners attached
          setCurrentTeam(null);
          setUserTeams([]); // Clear teams to prevent render error
          setUser(null); 
          // Then perform actual sign out
          await signOut(auth);
          
          // Re-sign in anonymously immediately so the app is usable as a guest/new user
          // This prevents the "null user" state on the home screen
          await signInAnonymously(auth);
      } catch (error) {
          console.error("Error signing out:", error);
      }
  };

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500">Loading GridPoint...</div>;

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
            
            {user && (
              <div className="flex items-center space-x-4">
                 <button className="text-sm text-slate-400 hover:text-white" onClick={handleSignOut}>
                    <LogOut size={16} />
                 </button>
                 <div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center border border-slate-600">
                  <User size={16} />
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full overflow-hidden">
        
        {/* VIEW 1: TEAM DASHBOARD (Inside a Team) */}
        {currentTeam && user ? (
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
                {/* Only show Create Team if user exists, otherwise button is hidden or could trigger auth */}
                {user && <Button onClick={() => setShowCreateModal(true)} icon={Plus}>Create Team</Button>}
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
                    {user && <Button onClick={() => setShowCreateModal(true)} variant="primary">Create Your First Team</Button>}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {userTeams.map(team => (
                        <TeamCard 
                            key={team.id} 
                            team={team} 
                            isOwner={user && team.roles.owner === user.uid}
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