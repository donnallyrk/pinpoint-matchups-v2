import React, { useState } from 'react';
import { X, Users, Info, AlertCircle, Mail, Loader } from 'lucide-react';
import { Button } from '../utils';
import { addDoc, collection } from 'firebase/firestore';
import { db, appId } from '../firebase';
import { createTeam, COLLECTIONS } from '../models';

const CreateTeamModal = ({ user, onClose }) => {
  const [name, setName] = useState('');
  const [abbr, setAbbr] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Coach Email State
  const [coachEmails, setCoachEmails] = useState([]);
  const [emailInput, setEmailInput] = useState('');
  const [emailError, setEmailError] = useState(null);

  const validateEmail = (email) => {
    return String(email)
      .toLowerCase()
      .match(
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      );
  };

  const handleAddEmail = (e) => {
    if (e) e.preventDefault();
    const email = emailInput.trim();
    if (!email) return;

    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address.');
      return;
    }

    if (coachEmails.includes(email)) {
        setEmailError('This email has already been added.');
        return;
    }

    setCoachEmails([...coachEmails, email]);
    setEmailInput('');
    setEmailError(null);
  };

  const handleKeyDown = (e) => {
    if (['Enter', ',', ' '].includes(e.key)) {
      e.preventDefault();
      handleAddEmail();
    }
  };

  const removeEmail = (emailToRemove) => {
    setCoachEmails(coachEmails.filter(e => e !== emailToRemove));
  };

  const handleSubmit = async () => {
    if (!name || !abbr || !user) return;
    setIsSubmitting(true);

    try {
        // 1. Use the Factory to ensure data structure matches App.jsx expectations
        const newTeamData = createTeam(user.uid, name, abbr, coachEmails);

        // 2. Write to Firestore directly from here
        await addDoc(collection(db, 'artifacts', appId, COLLECTIONS.TEAMS), newTeamData);
        
        // 3. Close (The App.jsx snapshot listener will auto-update the list)
        onClose();
    } catch (error) {
        console.error("Error creating team:", error);
        alert("Failed to create team. Please try again.");
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg shadow-2xl flex flex-col">
            {/* Header */}
            <div className="p-5 border-b border-slate-800 flex justify-between items-center">
                <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Users className="text-blue-500" size={20}/> Create New Team
                    </h3>
                    <p className="text-sm text-slate-400">Set up a roster container for your organization.</p>
                </div>
                <button onClick={onClose} disabled={isSubmitting} className="text-slate-500 hover:text-white transition-colors">
                    <X size={20} />
                </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
                
                {/* Team Info */}
                <div className="grid grid-cols-4 gap-4">
                    <div className="col-span-3">
                        <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Team Name</label>
                        <input 
                            autoFocus
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white outline-none focus:border-blue-500 transition-colors"
                            placeholder="e.g. Ridge High School"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            disabled={isSubmitting}
                        />
                    </div>
                    <div className="col-span-1">
                        <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Abbr.</label>
                        <input 
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white outline-none focus:border-blue-500 transition-colors uppercase font-mono"
                            placeholder="RHS"
                            maxLength={4}
                            value={abbr}
                            onChange={e => setAbbr(e.target.value.toUpperCase())}
                            disabled={isSubmitting}
                        />
                    </div>
                </div>

                {/* Coach Management */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
                            Coach Access <Info size={12} className="text-slate-600"/>
                        </label>
                        <span className="text-[10px] text-slate-500">{coachEmails.length} added</span>
                    </div>
                    
                    {/* Info Box */}
                    <div className="bg-blue-900/10 border border-blue-900/30 rounded-lg p-3 mb-3">
                        <div className="flex gap-2">
                            <Info size={16} className="text-blue-400 shrink-0 mt-0.5" />
                            <div className="text-xs text-blue-200/80 leading-relaxed">
                                Adding a coach grants them <strong>full edit access</strong>. 
                                They will receive an email invitation to collaborate.
                            </div>
                        </div>
                    </div>

                    {/* Chip Input Area */}
                    <div className="bg-slate-950 border border-slate-800 rounded-lg p-2 min-h-[50px] focus-within:border-blue-500/50 transition-colors">
                        <div className="flex flex-wrap gap-2">
                            {coachEmails.map(email => (
                                <div key={email} className="flex items-center gap-1 bg-slate-800 text-slate-200 px-2 py-1 rounded text-xs border border-slate-700 animate-in fade-in zoom-in duration-200">
                                    <Mail size={10} className="text-slate-500"/>
                                    {email}
                                    <button onClick={() => removeEmail(email)} type="button" className="hover:text-white hover:bg-red-500/20 rounded p-0.5 transition-colors">
                                        <X size={12} />
                                    </button>
                                </div>
                            ))}
                            <input 
                                className="bg-transparent border-none outline-none text-sm text-white flex-1 min-w-[150px] px-1 py-0.5 disabled:opacity-50"
                                placeholder={coachEmails.length === 0 ? "Type email and press Enter..." : "Add another..."}
                                value={emailInput}
                                onChange={e => {
                                    setEmailInput(e.target.value);
                                    if(emailError) setEmailError(null);
                                }}
                                onKeyDown={handleKeyDown}
                                onBlur={handleAddEmail} 
                                disabled={isSubmitting}
                            />
                        </div>
                    </div>
                    {emailError && (
                        <div className="flex items-center gap-2 mt-2 text-red-400 text-xs animate-in slide-in-from-top-1">
                            <AlertCircle size={12} /> {emailError}
                        </div>
                    )}
                </div>

            </div>

            {/* Footer */}
            <div className="p-5 border-t border-slate-800 bg-slate-900/50 rounded-b-xl flex justify-end gap-3">
                <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
                <Button 
                    onClick={handleSubmit} 
                    disabled={!name || !abbr || isSubmitting}
                    className="shadow-lg shadow-blue-900/20 w-32 justify-center"
                >
                    {isSubmitting ? <Loader className="animate-spin" size={18} /> : 'Create Team'}
                </Button>
            </div>
        </div>
    </div>
  );
};

export default CreateTeamModal;
