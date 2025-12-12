import React, { useState, useEffect, useRef } from 'react';
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
  serverTimestamp,
  getDoc,
  setDoc 
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
  Lock, 
  AlertTriangle,
  ChevronDown,
  CreditCard,
  Shield,
  UserCircle,
  Loader,
  CheckCircle2
} from 'lucide-react';

// --- IMPORTS ---
import { auth, db, appId, googleProvider } from './firebase';
import { Button, Card } from './utils';
import { createSchedule, createUser, COLLECTIONS } from './models'; 
import TeamCard from './components/TeamCard'; 
import ScheduleList from './components/ScheduleList'; 
import MatchmakingWorkflow from './components/MatchmakingWorkflow'; 
import RosterEditor from './components/RosterEditor'; 
import CreateTeamModal from './components/CreateTeamModal'; 
import TeamList from './components/TeamList';
import PageHeader from './components/PageHeader'; 
import EventPublicView from './components/EventPublicView'; 
import HomePage from './components/HomePage'; 

// --- COMPONENT: LOGIN PAGE ---
const LoginPage = ({ onBack }) => { 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true); 
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
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      console.error("Auth error:", err);
      const msg = err.code ? err.code.replace('auth/', '').replace(/-/g, ' ') : err.message;
      setError(msg.charAt(0).toUpperCase() + msg.slice(1));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 animate-in fade-in duration-700 relative">
      <button 
        onClick={onBack}
        className="absolute top-4 left-4 p-2 text-slate-400 hover:text-white flex items-center gap-2 transition-colors rounded-lg hover:bg-slate-800"
      >
        <ChevronLeft size={20} /> Back to Home
      </button>

      <div className="max-w-md w-full space-y-8 text-center">
        <div className="bg-slate-900/50 p-8 rounded-2xl border border-slate-800 shadow-2xl backdrop-blur-xl">
          <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 w-16 h-16 rounded-xl mx-auto flex items-center justify-center mb-6 shadow-lg shadow-blue-900/20">
            <Users className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Pinpoint Matchups</h1>
          <p className="text-slate-400 mb-6 leading-relaxed text-sm">
            {isLogin ? 'Sign in to manage your team.' : 'Create an account to get started.'}
          </p>

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

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-slate-900 px-2 text-slate-500">Or continue with</span>
            </div>
          </div>
          
          <button 
            onClick={handleGoogleLogin} 
            className="w-full flex items-center justify-center py-3 px-4 bg-white text-slate-900 hover:bg-slate-100 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl hover:scale-[1.02]"
          >
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5 mr-3" alt="Google" />
            Google
          </button>
        </div>

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

  const [profileData, setProfileData] = useState({
      name: team.metadata.name,
      abbreviation: team.metadata.abbreviation,
      defaultLocation: team.metadata.defaultLocation || '',
      coaches: team.roles.coaches?.join(', ') || ''
  });

  useEffect(() => {
    if (!team?.id || !user) return;

    const scheduleQuery = collection(db, 'artifacts', appId, COLLECTIONS.TEAMS, team.id, COLLECTIONS.EVENTS);
    const unsubSchedules = onSnapshot(scheduleQuery, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      
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

    if (team.roster) {
      setRoster(team.roster);
    }

    return () => {
      unsubSchedules();
    };
  }, [team.id, user]);

  const handleSaveProfile = async () => {
      try {
          const coachesArray = profileData.coaches.split(',').map(c => c.trim()).filter(Boolean);
          
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

  const handleDeleteTeam = async () => {
      const step1 = confirm("Are you sure you want to delete this team? This action cannot be undone.");
      if (!step1) return;

      const step2 = confirm(`Please confirm again. All roster data and schedules for "${team.metadata.name}" will be permanently deleted.`);
      if (!step2) return;

      try {
          await deleteDoc(doc(db, 'artifacts', appId, COLLECTIONS.TEAMS, team.id));
          onBack(); 
      } catch (e) {
          console.error("Error deleting team:", e);
          alert("Failed to delete team. Please try again.");
      }
  };

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
              </div>

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

  return (
    <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col">
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

      <div className="flex-1 min-h-0 overflow-y-auto px-1">
        {activeTab === 'profile' && (
            <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 py-4">
                <PageHeader 
                    title="Team Settings" 
                    description="Manage team identity, home location, and coaching staff."
                />
                
                <Card className="p-6 space-y-6">
                    <h3 className="text-xl font-bold text-white border-b border-slate-700 pb-4">General Info</h3>
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
                                <Mail size={14}/> Assistant Coaches (Max 2)</label>
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

                {team.roles.owner === user.uid && (
                    <div className="mt-8 pt-8 border-t border-slate-800">
                        <div className="bg-red-950/20 border border-red-900/50 rounded-xl p-6 flex items-start gap-4">
                            <div className="p-3 bg-red-900/20 rounded-full shrink-0">
                                <AlertTriangle className="text-red-500" size={24} />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-bold text-white mb-1">Danger Zone</h3>
                                <p className="text-sm text-slate-400 mb-4">
                                    Deleting a team is permanent. All rosters, schedules, and matchmaking history will be lost immediately.
                                </p>
                                <Button 
                                    variant="danger" 
                                    onClick={handleDeleteTeam}
                                    className="w-full sm:w-auto"
                                >
                                    Delete Team
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
                <div className="h-8"></div>
            </div>
        )}

        {activeTab === 'schedules' && (
            <div className="h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500 py-4">
                <PageHeader 
                    title="Event Schedule" 
                    description="Create and manage your team's match events."
                />
                
                <ScheduleList 
                    schedules={schedules} 
                    onEdit={setCurrentSchedule}
                    onDelete={deleteSchedule}
                    onCreate={handleCreateSchedule} 
                />
            </div>
        )}

        {activeTab === 'roster' && (
            <div className="h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500 py-4">
                <PageHeader 
                    title="Master Roster" 
                    description="Manage all athletes in your program."
                />
                
                <Card className="flex-1 flex flex-col p-6 min-h-0 bg-slate-800/50">
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

// --- NEW COMPONENT: USER PROFILE ---
const UserProfile = ({ user, onUpdate }) => {
    // Local state for form
    const [formData, setFormData] = useState({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phone: user.phone || '',
        address: user.address || ''
    });
    const [isSaving, setIsSaving] = useState(false);
    const [status, setStatus] = useState(null); // 'success' | 'error' | null

    const handleSave = async () => {
        setIsSaving(true);
        setStatus(null);
        try {
            // Persist to Firestore
            const userRef = doc(db, 'artifacts', appId, COLLECTIONS.USERS, user.uid);
            await updateDoc(userRef, {
                firstName: formData.firstName,
                lastName: formData.lastName,
                phone: formData.phone,
                address: formData.address,
                // Update displayName for Auth consistency (optional, handled by parent usually but good to persist)
                displayName: `${formData.firstName} ${formData.lastName}`.trim()
            });

            // Update Local State in Parent
            onUpdate({ ...user, ...formData, displayName: `${formData.firstName} ${formData.lastName}`.trim() });
            setStatus('success');
            setTimeout(() => setStatus(null), 3000); // Clear success message
        } catch (error) {
            console.error("Error saving profile:", error);
            setStatus('error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto py-10 animate-in fade-in slide-in-from-bottom-4">
            <PageHeader title="My Profile" description="Manage your personal information." />
            
            <Card className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">First Name</label>
                        <input className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-white focus:ring-blue-500 outline-none" 
                            value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Last Name</label>
                        <input className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-white focus:ring-blue-500 outline-none" 
                            value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
                    <input disabled className="w-full bg-slate-900 border border-slate-800 rounded p-3 text-slate-500 cursor-not-allowed" 
                        value={user.email}
                    />
                    <p className="text-xs text-slate-600 mt-1">Email cannot be changed.</p>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Phone Number</label>
                    <input className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-white focus:ring-blue-500 outline-none" 
                        value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})}
                        placeholder="(555) 555-5555"
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Address</label>
                    <textarea className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-white focus:ring-blue-500 outline-none resize-none h-24" 
                        value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})}
                        placeholder="Street, City, State, Zip"
                    />
                </div>

                <div className="pt-4 flex items-center justify-between">
                    <div className="text-sm">
                        {status === 'success' && <span className="text-green-400 flex items-center gap-2"><CheckCircle2 size={16}/> Saved Successfully</span>}
                        {status === 'error' && <span className="text-red-400 flex items-center gap-2"><AlertTriangle size={16}/> Failed to Save</span>}
                    </div>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <Loader className="animate-spin" size={18}/> : 'Save Changes'}
                    </Button>
                </div>
            </Card>
        </div>
    );
};

// --- NEW COMPONENT: USER ACCOUNT ---
const UserAccount = ({ user }) => {
    // Mock Subscription Data based on Tier
    const subStatus = user.tier === 'fan' || user.tier === 'coach' ? 'Active' : 'Inactive';
    const renewalDate = 'Dec 31, 2025'; 

    return (
        <div className="max-w-2xl mx-auto py-10 animate-in fade-in slide-in-from-bottom-4">
            <PageHeader title="My Account" description="Manage your subscription and account settings." />
            
            <Card className="p-6 space-y-6 mb-6">
                <h3 className="text-xl font-bold text-white border-b border-slate-700 pb-4 flex items-center gap-2">
                    <Shield size={20} className="text-blue-400"/> Subscription Plan
                </h3>
                
                <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 flex items-center justify-between">
                    <div>
                        <div className="text-xs text-slate-500 uppercase font-bold mb-1">Current Tier</div>
                        <div className="text-2xl font-bold text-white capitalize">{user.tier || 'Free'} Tier</div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${subStatus === 'Active' ? 'bg-green-500/20 text-green-400' : 'bg-slate-800 text-slate-500'}`}>
                        {subStatus}
                    </div>
                </div>

                {subStatus === 'Active' && (
                    <div className="text-sm text-slate-400">
                        Your subscription renews on <span className="text-white font-bold">{renewalDate}</span>.
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                    <button className="p-3 rounded-lg border border-slate-700 hover:bg-slate-800 text-center transition-all">
                        <div className="font-bold text-white">Upgrade to Fan</div>
                        <div className="text-xs text-slate-500">$1 / year</div>
                    </button>
                    <button className="p-3 rounded-lg border border-slate-700 hover:bg-slate-800 text-center transition-all">
                        <div className="font-bold text-white">Upgrade to Coach</div>
                        <div className="text-xs text-slate-500">Full Access</div>
                    </button>
                    <button className="p-3 rounded-lg border border-red-900/30 hover:bg-red-900/20 text-center transition-all">
                        <div className="font-bold text-red-400">Cancel Plan</div>
                        <div className="text-xs text-red-400/70">Downgrade to Free</div>
                    </button>
                </div>
            </Card>

            <div className="border-t border-slate-800 pt-8">
                <div className="bg-red-950/10 border border-red-900/30 rounded-xl p-6">
                    <h3 className="text-lg font-bold text-white mb-2 text-red-500 flex items-center gap-2">
                        <AlertTriangle size={20}/> Delete Account
                    </h3>
                    <p className="text-sm text-slate-400 mb-4">
                        Permanently remove your account and all associated data. This action cannot be undone.
                    </p>
                    <Button variant="danger" className="w-full sm:w-auto">Delete Account</Button>
                </div>
            </div>
        </div>
    );
};

// --- NAVIGATION MENU COMPONENT ---
const UserMenu = ({ user, onNavigate, onSignOut }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleAction = (action) => {
        setIsOpen(false);
        if (action === 'signout') onSignOut();
        else onNavigate(action);
    };

    return (
        <div className="relative" ref={menuRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-3 hover:bg-slate-800 p-2 rounded-lg transition-colors group"
            >
                <div className="text-right hidden sm:block">
                    <div className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">{user.displayName || user.email.split('@')[0]}</div>
                    <div className="text-xs text-slate-500 capitalize">{user.tier || 'Free'}</div>
                </div>
                {user.photoURL ? (
                    <img src={user.photoURL} alt="Profile" className="h-9 w-9 rounded-full border border-slate-600 group-hover:border-blue-500 transition-colors" />
                ) : (
                    <div className="h-9 w-9 rounded-full bg-slate-700 flex items-center justify-center border border-slate-600 group-hover:border-blue-500 transition-colors">
                        <User size={18} className="text-slate-300" />
                    </div>
                )}
                <ChevronDown size={16} className={`text-slate-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-4 py-2 border-b border-slate-800 mb-1 sm:hidden">
                        <div className="text-sm font-bold text-white truncate">{user.email}</div>
                        <div className="text-xs text-slate-500 capitalize">{user.tier || 'Free'}</div>
                    </div>
                    
                    <button onClick={() => handleAction('profile')} className="w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-3 transition-colors">
                        <UserCircle size={16}/> My Profile
                    </button>
                    
                    {(user.tier === 'coach' || user.tier === 'admin') && (
                        <button onClick={() => handleAction('teams')} className="w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-3 transition-colors">
                            <LayoutDashboard size={16}/> My Teams
                        </button>
                    )}
                    
                    <button onClick={() => handleAction('account')} className="w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-3 transition-colors">
                        <CreditCard size={16}/> My Account
                    </button>
                    
                    <div className="border-t border-slate-800 mt-1 pt-1">
                        <button onClick={() => handleAction('signout')} className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-900/20 flex items-center gap-3 transition-colors">
                            <LogOut size={16}/> Sign Out
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- MAIN APP CONTROLLER ---
export default function App() {
  const [user, setUser] = useState(null);
  const [userTeams, setUserTeams] = useState([]);
  const [currentTeam, setCurrentTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Navigation State
  // 'home' | 'login' | 'profile' | 'account' | 'teams'
  const [currentView, setCurrentView] = useState('home');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Public Event State
  const [publicEvent, setPublicEvent] = useState(null);
  const [hostName, setHostName] = useState('');
  const [isPublicLoading, setIsPublicLoading] = useState(false);

  // 1. URL ROUTING CHECK
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const teamId = params.get('team');
    const eventId = params.get('event');

    if (teamId && eventId) {
        setIsPublicLoading(true);
        // Fetch Public Event Logic...
        // (Keeping existing logic abbreviated for brevity, logic remains same)
        const fetchPublicEvent = async () => {
            try {
                const eventRef = doc(db, 'artifacts', appId, COLLECTIONS.TEAMS, teamId, COLLECTIONS.EVENTS, eventId);
                const unsubEvent = onSnapshot(eventRef, async (docSnap) => {
                    if (docSnap.exists()) {
                        const eventData = { id: docSnap.id, ...docSnap.data() };
                        if (eventData.schedulingStatus === 'published') {
                            setPublicEvent(eventData);
                            const host = eventData.participatingTeams?.find(t => t.isHost) || eventData.participatingTeams?.[0];
                            setHostName(host ? host.name : "Event Host");
                        } else {
                            setPublicEvent(null); 
                        }
                    } else {
                        console.error("Event not found");
                    }
                    setIsPublicLoading(false);
                });
                return () => unsubEvent();
            } catch (error) {
                console.error("Error fetching public event:", error);
                setIsPublicLoading(false);
            }
        };
        fetchPublicEvent();
    }
  }, []);

  // 2. AUTH LISTENER
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        console.log(`Checking profile for user: ${currentUser.uid}`);
        const userRef = doc(db, 'artifacts', appId, COLLECTIONS.USERS, currentUser.uid);
        
        try {
          const userSnap = await getDoc(userRef);
          
          if (userSnap.exists()) {
            console.log("User profile found.");
            const profileData = userSnap.data();
            setUser({ ...currentUser, ...profileData });
            updateDoc(userRef, { lastLogin: serverTimestamp() }).catch(console.error);
          } else {
            console.log("User profile NOT found. Creating new profile...");
            const newProfile = createUser(currentUser);
            try {
                await setDoc(userRef, newProfile);
                console.log("User profile created successfully.");
                setUser({ ...currentUser, ...newProfile });
            } catch (writeError) {
                console.error("FAILED to create user profile:", writeError);
                setUser(currentUser);
            }
          }
          // Redirect to Home after successful login logic
          setCurrentView('home');
        } catch (error) {
          console.error("Error fetching user profile:", error);
          setUser(currentUser);
          setCurrentView('home');
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // 3. FETCH TEAMS (Authenticated & Coach/Admin Tier)
  useEffect(() => {
    if (!user || !user.uid || (user.tier !== 'coach' && user.tier !== 'admin')) {
        setUserTeams([]);
        return;
    }
    
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

  // Safe Sign Out
  const handleSignOut = async () => {
      try {
          setCurrentTeam(null);
          setUserTeams([]);
          await signOut(auth);
          setCurrentView('home'); 
      } catch (error) {
          console.error("Error signing out:", error);
      }
  };

  const handleEventSelect = (teamId, eventId) => {
      const url = new URL(window.location);
      url.searchParams.set('team', teamId);
      url.searchParams.set('event', eventId);
      window.history.pushState({}, '', url);
      window.location.reload(); 
  };

  // --- RENDER LOGIC ---

  // 1. Public Event View (Priority)
  if (publicEvent) {
      return <EventPublicView event={publicEvent} hostName={hostName} user={user} />;
  }

  // 2. Loading State
  if (loading || isPublicLoading) {
      return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500">Loading Pinpoint...</div>;
  }

  // 3. Unauthenticated Views (Or Authenticated Home)
  // If not logged in, show Home or Login.
  // If logged in but on 'home' view, show Home with User Menu.
  if (!user || currentView === 'login') {
      if (currentView === 'login') {
          return <LoginPage onBack={() => setCurrentView('home')} />;
      }
      // Home Page (Handles both Auth and Unauth states via props if needed, mostly Unauth content currently)
      // For Authenticated user on Home, we wrap it with the App Shell (Nav)
      if (!user) {
          return <HomePage onLogin={() => setCurrentView('login')} onEventSelect={handleEventSelect} />;
      }
  }

  // 4. Authenticated Application Shell
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-blue-500/30 overflow-hidden flex flex-col">
      {/* Top Nav */}
      <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md shrink-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            
            {/* Logo - Clicks to Home */}
            <div className="flex items-center cursor-pointer" onClick={() => { setCurrentTeam(null); setCurrentView('home'); }}>
              <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 p-2 rounded-lg mr-3">
                <Users className="text-white" size={20} />
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                Pinpoint Matchups
              </span>
            </div>
            
            {/* User Menu */}
            <UserMenu 
                user={user} 
                onNavigate={(view) => { setCurrentTeam(null); setCurrentView(view); }} 
                onSignOut={handleSignOut}
            />
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full overflow-hidden">
        
        {/* VIEW ROUTER */}
        {currentView === 'home' && (
            <HomePage user={user} onEventSelect={handleEventSelect} />
        )}

        {currentView === 'profile' && (
            <UserProfile user={user} onUpdate={(u) => setUser(u)} />
        )}

        {currentView === 'account' && (
            <UserAccount user={user} />
        )}

        {currentView === 'teams' && (
            currentTeam ? (
                <TeamDashboard 
                    team={currentTeam} 
                    user={user} 
                    onBack={() => setCurrentTeam(null)} 
                />
            ) : (
                <TeamList 
                    teams={userTeams} 
                    user={user} 
                    onCreateClick={() => setShowCreateModal(true)} 
                    onTeamSelect={setCurrentTeam} 
                />
            )
        )}

      </main>

      {/* CREATE TEAM MODAL */}
      {showCreateModal && (
        <CreateTeamModal 
            user={user} 
            onClose={() => setShowCreateModal(false)} 
        />
      )}
    </div>
  );
}