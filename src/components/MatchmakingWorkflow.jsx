import React, { useState, useEffect } from 'react';
// Removed unused deleteField import
import { 
  Calendar, 
  Users, 
  Settings, 
  Swords, 
  ListOrdered, 
  Share2,
  ChevronRight,
  ChevronLeft,
  AlertTriangle,
  UserX,
  X,
  CheckCircle2,
  Clock,
  Globe,
  AlertOctagon
} from 'lucide-react';
import { Button } from '../utils';
import { getPlayerValidationIssues } from '../models';

// --- SUB-STEPS ---
import Step1_EventDetails from './Step1_EventDetails';
import Step2_RosterManager from './Step2_RosterManager';
import Step3_Parameters from './Step3_Parameters';
import Step4_Matchmaking from './Step4_Matchmaking';
import Step5_Sequencing from './Step5_Sequencing';

// --- DATA VALIDATION MODAL (Existing) ---
const ValidationGatekeeperModal = ({ invalidWrestlers, onCancel, onDropAndProceed }) => {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-red-500/50 rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[80vh]">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center shrink-0 bg-red-950/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/20 rounded-full">
              <AlertTriangle className="text-red-500" size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Roster Issues Detected</h3>
              <p className="text-sm text-red-200/70">
                {invalidWrestlers.length} wrestlers have incomplete data.
              </p>
            </div>
          </div>
          <button onClick={onCancel}><X className="text-slate-500 hover:text-white" /></button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          <p className="text-slate-300 mb-4 text-sm">
            These wrestlers cannot be scheduled because they are missing required information (Weight, Rating, etc.).
          </p>
          
          <div className="bg-slate-950 rounded-lg border border-slate-800 overflow-hidden">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900 text-slate-400 font-bold text-xs uppercase">
                <tr>
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Team</th>
                  <th className="px-4 py-2">Issues</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {invalidWrestlers.map((w, idx) => (
                  <tr key={`${w.id}-${idx}`}>
                    <td className="px-4 py-2 font-medium text-white">{w.name}</td>
                    <td className="px-4 py-2 text-slate-500">{w.teamName}</td>
                    <td className="px-4 py-2 text-red-400 text-xs">{w.issues.join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="p-6 border-t border-slate-800 bg-slate-900/50 flex justify-end gap-3 rounded-b-xl">
          <Button variant="ghost" onClick={onCancel}>
            Cancel & Correct Data
          </Button>
          <Button onClick={onDropAndProceed} className="bg-red-600 hover:bg-red-700 text-white border-red-500">
            <UserX size={16} className="mr-2" />
            Drop Wrestlers & Proceed
          </Button>
        </div>
      </div>
    </div>
  );
};

// --- SAFEGUARD RESET MODAL (New) ---
const SafeguardModal = ({ stepName, consequences, onCancel, onConfirm }) => {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-yellow-500/50 rounded-xl w-full max-w-lg shadow-2xl">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-yellow-950/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/20 rounded-full">
              <AlertOctagon className="text-yellow-500" size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Confirm Changes</h3>
              <p className="text-sm text-yellow-200/70">
                Modifying {stepName} has downstream effects.
              </p>
            </div>
          </div>
          <button onClick={onCancel}><X className="text-slate-500 hover:text-white" /></button>
        </div>

        <div className="p-6">
          <p className="text-slate-300 mb-4">
            You are making changes to a previously completed step. To ensure data integrity, the following will be <strong>reset</strong>:
          </p>
          <ul className="space-y-2 mb-6">
            {consequences.map((c, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-red-300 bg-red-950/30 p-2 rounded border border-red-900/50">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                {c}
              </li>
            ))}
          </ul>
          <p className="text-xs text-slate-500">
            You will need to re-run the matchmaking process after applying these changes.
          </p>
        </div>

        <div className="p-6 border-t border-slate-800 bg-slate-900/50 flex justify-end gap-3 rounded-b-xl">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onConfirm} className="bg-yellow-600 hover:bg-yellow-700 text-white border-yellow-500">
            Confirm & Reset
          </Button>
        </div>
      </div>
    </div>
  );
};

// --- MAIN CONTROLLER ---
const MatchmakingWorkflow = ({ event, roster, hostName, onUpdateEvent }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);
  
  // Safeguard State
  const [safeguard, setSafeguard] = useState({
    active: false,
    pendingUpdate: null, // { id, data }
    stepId: null,
    consequences: []
  });

  // Revert Key: Used to force re-render of child components to undo optimistic updates
  const [revertKey, setRevertKey] = useState(0);

  // Workflow Definition
  const steps = [
    { id: 1, label: 'Event Setup', icon: Calendar },
    { id: 2, label: 'Participants', icon: Users },
    { id: 3, label: 'Parameters', icon: Settings },
    { id: 4, label: 'Matchmaking', icon: Swords },
    { id: 5, label: 'Sequencing', icon: ListOrdered },
    { id: 6, label: 'Publish', icon: Share2 },
  ];

  // --- AUTOMATIC STATUS UPDATER ---
  useEffect(() => {
    // Only auto-update status if we are NOT in the middle of a reset operation
    // and if the event actually exists
    if (!event) return;

    let newStatus = event.schedulingStatus || 'not_started';

    // Simple logic: If we are past step 1, we are in progress.
    // Real logic is handled by specific actions (e.g. publishing)
    if (currentStep > 1 && newStatus === 'not_started') {
        newStatus = 'in_progress';
    }

    // Only update if different
    if (event.schedulingStatus !== newStatus) {
        onUpdateEvent(event.id, { schedulingStatus: newStatus });
    }
  }, [currentStep, event?.schedulingStatus]);


  // --- SAFEGUARDED UPDATE LOGIC ---
  const handleSafeguardedUpdate = (stepId, eventId, data) => {
    // Determine if we need to warn the user based on "Future" data existing
    const hasMatchups = event.matchups && event.matchups.length > 0;
    const hasSequencing = event.sequencing && event.sequencing.length > 0; 
    
    let consequences = [];
    let resetData = {};

    // LOGIC: Define what gets reset based on the step being edited
    if (stepId === 2) { // Step 2: Participants
       // Changes here invalidate Matchups (Step 4), Sequencing (Step 5), Publish (Step 6)
       if (hasMatchups || hasSequencing) {
           consequences.push("Step 4: Generated Matchups (Deleted)");
           consequences.push("Step 5: Schedule Sequence (Deleted)");
           consequences.push("Step 6: Published Status (Revoked)");
           
           // Use null instead of deleteField() to ensure local React state clears correctly
           resetData = {
               matchups: null,
               sequencing: null,
               schedulingStatus: 'in_progress'
           };
       }
    } else if (stepId === 3) { // Step 3: Parameters
       // Changes here invalidate Matchups (Step 4), Sequencing (Step 5), Publish (Step 6)
       if (hasMatchups || hasSequencing) {
           consequences.push("Step 4: Generated Matchups (Deleted)");
           consequences.push("Step 5: Schedule Sequence (Deleted)");
           consequences.push("Step 6: Published Status (Revoked)");

           resetData = {
               matchups: null,
               sequencing: null,
               schedulingStatus: 'in_progress'
           };
       }
    } else if (stepId === 4) { // Step 4: Matchmaking
       // Changes here invalidate Sequencing (Step 5), Publish (Step 6)
       if (hasSequencing) {
           consequences.push("Step 5: Schedule Sequence (Deleted)");
           consequences.push("Step 6: Published Status (Revoked)");

           resetData = {
               sequencing: null,
               schedulingStatus: 'in_progress'
           };
       }
    } else if (stepId === 5) { // Step 5: Sequencing
       // Changes here invalidate Publish (Step 6)
       if (event.schedulingStatus === 'published') {
           consequences.push("Step 6: Published Status (Revoked)");
           resetData = {
               schedulingStatus: 'complete'
           };
       }
    }

    // DECISION: Warning or Direct Update?
    if (consequences.length > 0) {
        setSafeguard({
            active: true,
            pendingUpdate: { id: eventId, data: { ...data, ...resetData } },
            stepId,
            consequences
        });
    } else {
        // No conflict, proceed normally
        onUpdateEvent(eventId, data);
    }
  };

  const confirmSafeguard = () => {
      if (safeguard.pendingUpdate) {
          onUpdateEvent(safeguard.pendingUpdate.id, safeguard.pendingUpdate.data);
      }
      setSafeguard({ active: false, pendingUpdate: null, stepId: null, consequences: [] });
  };

  const cancelSafeguard = () => {
      // 1. Clear Safeguard State
      setSafeguard({ active: false, pendingUpdate: null, stepId: null, consequences: [] });
      // 2. Force Re-render of current step to undo optimistic changes
      setRevertKey(prev => prev + 1);
  };


  // --- NAVIGATION LOGIC ---

  const canProceed = () => {
    if (currentStep === 1) return event.name && event.date; 
    if (currentStep === 2) return event.participatingTeams?.length > 0;
    if (currentStep === 4) return event.matchups?.length > 0;
    return true; 
  };

  const handleNextStep = () => {
    if (!canProceed()) return;

    // GATEKEEPER: Step 2 -> Step 3
    if (currentStep === 2) {
      const invalid = [];
      
      // Scan all teams for invalid wrestlers
      event.participatingTeams?.forEach(team => {
        team.roster?.forEach(p => {
          const issues = getPlayerValidationIssues(p);
          if (issues.length > 0) {
            invalid.push({
              id: p.id,
              name: `${p.firstName} ${p.lastName}`,
              teamName: team.name,
              teamId: team.id,
              issues: issues,
              originalObj: p 
            });
          }
        });
      });

      if (invalid.length > 0) {
        setValidationErrors(invalid);
        setShowValidationModal(true);
        return; // HALT navigation
      }
    }

    if (currentStep < steps.length) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleDropAndProceed = () => {
    const newTeams = event.participatingTeams.map(team => {
      const teamInvalidIds = new Set(
        validationErrors
          .filter(err => err.teamId === team.id)
          .map(err => err.id)
      );

      if (teamInvalidIds.size === 0) return team;

      return {
        ...team,
        roster: team.roster.filter(p => !teamInvalidIds.has(p.id))
      };
    });

    onUpdateEvent(event.id, { participatingTeams: newTeams });
    setShowValidationModal(false);
    setCurrentStep(prev => prev + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  // --- STATUS BADGE HELPER ---
  const renderStatusBadge = () => {
      const status = event.schedulingStatus || 'not_started';
      
      const styles = {
          'not_started': 'bg-slate-800 text-slate-400 border-slate-700',
          'in_progress': 'bg-blue-900/30 text-blue-300 border-blue-800',
          'issue': 'bg-red-900/30 text-red-300 border-red-800',
          'complete': 'bg-green-900/30 text-green-300 border-green-800',
          'published': 'bg-purple-900/30 text-purple-300 border-purple-800',
      };

      const labels = {
          'not_started': 'Not Started',
          'in_progress': 'In Progress',
          'issue': 'Issue',
          'complete': 'Complete',
          'published': 'Published'
      };

      const icons = {
          'not_started': Clock,
          'in_progress': Clock, 
          'issue': AlertTriangle,
          'complete': CheckCircle2,
          'published': Globe
      };

      const Icon = icons[status] || Clock;

      return (
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold uppercase tracking-wider ${styles[status] || styles['not_started']}`}>
              <Icon size={14} />
              {labels[status] || status.replace('_', ' ')}
          </div>
      );
  };

  return (
    <div className="flex flex-col h-full space-y-6 relative">
      
      {/* --- MODALS --- */}
      {showValidationModal && (
        <ValidationGatekeeperModal 
          invalidWrestlers={validationErrors}
          onCancel={() => setShowValidationModal(false)}
          onDropAndProceed={handleDropAndProceed}
        />
      )}

      {safeguard.active && (
        <SafeguardModal 
          stepName={steps[safeguard.stepId - 1].label}
          consequences={safeguard.consequences}
          onCancel={cancelSafeguard}
          onConfirm={confirmSafeguard}
        />
      )}

      {/* --- HEADER BAR (STATUS & PROGRESS) --- */}
      <div className="bg-slate-900/50 p-2 rounded-xl border border-slate-700/50 shrink-0 flex items-center justify-between gap-4">
        
        {/* Progress Steps */}
        <div className="flex-1 overflow-x-auto">
            <div className="flex justify-between items-center min-w-[600px] px-4 py-2">
            {steps.map((s, idx) => {
                const Icon = s.icon;
                const isActive = s.id === currentStep;
                const isCompleted = s.id < currentStep;
                
                return (
                <div key={s.id} className="flex-1 flex flex-col items-center relative group cursor-default">
                    {/* Connector Line */}
                    {idx !== 0 && (
                    <div className={`absolute top-5 -left-[50%] right-[50%] h-[2px] transition-all duration-500 ${isCompleted ? 'bg-blue-600' : 'bg-slate-700'}`} />
                    )}
                    
                    <div 
                    onClick={() => isCompleted ? setCurrentStep(s.id) : null}
                    className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 border-2 
                        ${isActive ? 'bg-blue-600 border-blue-400 shadow-lg shadow-blue-900/50 scale-110' : 
                        isCompleted ? 'bg-slate-800 border-blue-600 text-blue-400 cursor-pointer hover:bg-slate-700' : 
                        'bg-slate-900 border-slate-700 text-slate-600'
                        }`}
                    >
                    <Icon size={18} className={isActive ? 'text-white' : ''} />
                    </div>
                    <span className={`mt-2 text-[10px] font-bold uppercase tracking-wider transition-colors duration-300 ${isActive ? 'text-blue-400' : isCompleted ? 'text-slate-400' : 'text-slate-600'}`}>
                    {idx + 1}. {s.label}
                    </span>
                </div>
                );
            })}
            </div>
        </div>

        {/* Status Badge (Right Aligned) */}
        <div className="px-4 border-l border-slate-700/50 hidden md:block">
            {renderStatusBadge()}
        </div>
      </div>

      {/* --- STEP CONTENT --- */}
      <div className="flex-1 min-h-0 relative overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto pr-2">
            
            {/* SAFEGUARD WRAPPER:
                We wrap the onUpdate prop for every step to intercept changes.
                We use key={revertKey} to force a re-mount when cancelling a safeguard.
            */}

            {currentStep === 1 && (
                <Step1_EventDetails 
                    key={`step1-${revertKey}`}
                    event={event} 
                    onUpdate={(id, data) => handleSafeguardedUpdate(1, id, data)} 
                />
            )}

            {currentStep === 2 && (
                <Step2_RosterManager 
                    key={`step2-${revertKey}`}
                    event={event} 
                    masterRoster={roster} 
                    hostName={hostName}
                    onUpdateEvent={(id, data) => handleSafeguardedUpdate(2, id, data)} 
                />
            )}

            {currentStep === 3 && (
                <Step3_Parameters 
                    key={`step3-${revertKey}`}
                    event={event} 
                    onUpdate={(id, data) => handleSafeguardedUpdate(3, id, data)}
                />
            )}

            {currentStep === 4 && (
                <Step4_Matchmaking
                    key={`step4-${revertKey}`}
                    event={event} 
                    onUpdate={(id, data) => handleSafeguardedUpdate(4, id, data)}
                />
            )}

            {currentStep === 5 && (
                <Step5_Sequencing
                    key={`step5-${revertKey}`}
                    event={event} 
                    onUpdate={(id, data) => handleSafeguardedUpdate(5, id, data)}
                />
            )}

            {currentStep > 5 && (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4">
                    <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center animate-pulse">
                        <ListOrdered size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-white">Work in Progress</h3>
                    <p>The "{steps[currentStep-1].label}" module is being built.</p>
                </div>
            )}
        </div>
      </div>

      {/* --- FOOTER ACTIONS --- */}
      <div className="shrink-0 pt-4 border-t border-slate-800 flex justify-between">
        <Button 
            onClick={prevStep} 
            disabled={currentStep === 1}
            variant="ghost" 
            className="text-slate-400 hover:text-white disabled:opacity-0"
        >
            <ChevronLeft className="mr-2" size={18}/> Back
        </Button>
        
        <Button 
            onClick={handleNextStep} 
            disabled={!canProceed()}
            className={`${!canProceed() ? 'opacity-50 cursor-not-allowed' : 'shadow-lg shadow-blue-900/20'}`}
        >
            {currentStep === steps.length ? 'Finish' : 'Next Step'} <ChevronRight className="ml-2" size={18}/>
        </Button>
      </div>
    </div>
  );
};

export default MatchmakingWorkflow;