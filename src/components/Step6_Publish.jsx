import React, { useState } from 'react';
import { 
  Globe, 
  Lock, 
  Printer, 
  FileText, 
  Share2, 
  CheckCircle, 
  AlertTriangle,
  Download,
  Copy
} from 'lucide-react';
import { Button, Card, formatDate } from '../utils';
import PageHeader from './PageHeader';

const StatCard = ({ label, value, subtext, icon: Icon, color }) => (
  <div className="bg-slate-900 border border-slate-700 p-4 rounded-xl flex items-center justify-between">
    <div>
      <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">{label}</p>
      <div className="text-2xl font-bold text-white">{value}</div>
      {subtext && <div className="text-xs text-slate-500 mt-1">{subtext}</div>}
    </div>
    {Icon && (
      <div className={`p-3 rounded-full bg-opacity-10 ${color.bg} ${color.text}`}>
        <Icon size={24} />
      </div>
    )}
  </div>
);

const Step6_Publish = ({ event, onUpdate }) => {
  const [isCopied, setIsCopied] = useState(false);

  // Derived State
  const isPublished = event.schedulingStatus === 'published';
  const matchCount = event.sequencing?.length || event.matchups?.length || 0;
  const wrestlerCount = event.rosterSnapshot?.length || 0; // Host
  const guestCount = event.participatingTeams?.reduce((acc, t) => acc + (t.roster?.length || 0), 0) || 0;
  const totalWrestlers = wrestlerCount + guestCount;
  
  // Configuration for Stats
  const mats = event.eventParameters?.mats || 4;
  
  // Mock Public URL
  const publicUrl = `https://pinpoint.app/events/${event.id}`;

  const handleTogglePublish = () => {
    const newStatus = isPublished ? 'complete' : 'published';
    onUpdate(event.id, { schedulingStatus: newStatus });
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-right-8 duration-500 h-full flex flex-col">
      
      <PageHeader 
        title="Event Dashboard" 
        description="Finalize the event, review summary statistics, and share with the public." 
        actions={
          <div className="flex items-center gap-3">
             <div className={`px-3 py-1.5 rounded-full border text-xs font-bold uppercase flex items-center gap-2 ${isPublished ? 'bg-green-500/10 border-green-500/50 text-green-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                {isPublished ? <Globe size={14} /> : <Lock size={14} />}
                {isPublished ? 'Live Publicly' : 'Private Draft'}
             </div>
          </div>
        }
      />

      <div className="flex-1 bg-slate-800/50 border border-slate-700 rounded-xl p-6 min-h-0 overflow-y-auto">
        
        {/* TOP ROW: STATS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <StatCard 
              label="Total Matches" 
              value={matchCount} 
              subtext={`Across ${mats} Mats`}
              icon={FileText}
              color={{ bg: 'bg-blue-500', text: 'text-blue-400' }}
            />
            <StatCard 
              label="Participants" 
              value={totalWrestlers} 
              subtext={`${event.participatingTeams?.length || 0} Teams`}
              icon={CheckCircle}
              color={{ bg: 'bg-green-500', text: 'text-green-400' }}
            />
            <StatCard 
              label="Est. Duration" 
              value={`${(matchCount / (mats * 12)).toFixed(1)} hrs`}
              subtext="Based on 5m cycles"
              icon={Printer} // Placeholder icon for time
              color={{ bg: 'bg-purple-500', text: 'text-purple-400' }}
            />
            <StatCard 
              label="Completion" 
              value={isPublished ? "100%" : "85%"}
              subtext="Ready to Publish"
              icon={isPublished ? Globe : Lock}
              color={{ bg: isPublished ? 'bg-emerald-500' : 'bg-slate-500', text: isPublished ? 'text-emerald-400' : 'text-slate-400' }}
            />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* LEFT COLUMN: PUBLISHING CONTROLS */}
            <div className="space-y-6">
                <Card className="p-6 space-y-4">
                    <h3 className="text-lg font-bold text-white border-b border-slate-700 pb-3 flex items-center gap-2">
                        <Globe size={18} className="text-blue-400"/> Publish Settings
                    </h3>
                    
                    <div className="bg-slate-950 rounded-lg p-4 border border-slate-800">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h4 className="text-sm font-bold text-white">Public Access</h4>
                                <p className="text-xs text-slate-500 mt-1">
                                    When enabled, match schedules and live results will be visible to anyone with the link.
                                </p>
                            </div>
                            <button 
                                onClick={handleTogglePublish}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isPublished ? 'bg-green-500' : 'bg-slate-700'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isPublished ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>

                        {isPublished && (
                            <div className="animate-in fade-in slide-in-from-top-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Shareable Link</label>
                                <div className="flex gap-2">
                                    <input 
                                        readOnly 
                                        value={publicUrl} 
                                        className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs text-blue-400 font-mono select-all focus:outline-none"
                                    />
                                    <Button onClick={handleCopyLink} variant="secondary" className="px-3">
                                        {isCopied ? <CheckCircle size={14} className="text-green-400"/> : <Copy size={14}/>}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-3 bg-yellow-900/10 border border-yellow-900/30 rounded-lg flex gap-3">
                        <AlertTriangle className="text-yellow-500 shrink-0" size={18} />
                        <div className="text-xs text-yellow-200/80">
                            <strong>Note:</strong> While published, any changes made to the schedule in previous steps will update in real-time for viewers.
                        </div>
                    </div>
                </Card>
            </div>

            {/* RIGHT COLUMN: ACTIONS & EXPORTS */}
            <div className="space-y-6">
                <Card className="p-6 space-y-4">
                    <h3 className="text-lg font-bold text-white border-b border-slate-700 pb-3 flex items-center gap-2">
                        <Printer size={18} className="text-purple-400"/> Exports & Materials
                    </h3>

                    <div className="grid grid-cols-1 gap-3">
                        <button 
                            onClick={handlePrint}
                            className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-xl hover:border-purple-500/50 hover:bg-slate-900 transition-all group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-slate-800 rounded-lg text-slate-400 group-hover:text-white transition-colors">
                                    <FileText size={20} />
                                </div>
                                <div className="text-left">
                                    <div className="text-sm font-bold text-white">Bout Sheets</div>
                                    <div className="text-xs text-slate-500">Official scorecards for each match</div>
                                </div>
                            </div>
                            <Download size={16} className="text-slate-600 group-hover:text-purple-400" />
                        </button>

                        <button className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-xl hover:border-blue-500/50 hover:bg-slate-900 transition-all group">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-slate-800 rounded-lg text-slate-400 group-hover:text-white transition-colors">
                                    <Printer size={20} />
                                </div>
                                <div className="text-left">
                                    <div className="text-sm font-bold text-white">Wall Charts</div>
                                    <div className="text-xs text-slate-500">Large format schedule by mat</div>
                                </div>
                            </div>
                            <Download size={16} className="text-slate-600 group-hover:text-blue-400" />
                        </button>

                        <button className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-xl hover:border-green-500/50 hover:bg-slate-900 transition-all group">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-slate-800 rounded-lg text-slate-400 group-hover:text-white transition-colors">
                                    <Share2 size={20} />
                                </div>
                                <div className="text-left">
                                    <div className="text-sm font-bold text-white">Coach Packet</div>
                                    <div className="text-xs text-slate-500">Summary stats per team</div>
                                </div>
                            </div>
                            <Download size={16} className="text-slate-600 group-hover:text-green-400" />
                        </button>
                    </div>
                </Card>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Step6_Publish;