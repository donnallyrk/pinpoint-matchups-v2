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
  Copy,
  Mail,
  X,
  AlertCircle,
  Loader,
  FileSpreadsheet, // Added for Excel icon
  Users // Added for Share Event icon
} from 'lucide-react';
import { Button, Card } from '../utils';
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

// --- SHARE MODAL COMPONENT ---
const SharePacketModal = ({ onClose, onShare }) => {
    const [emails, setEmails] = useState([]);
    const [input, setInput] = useState('');
    const [error, setError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const validateEmail = (email) => {
        return String(email)
            .toLowerCase()
            .match(/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/);
    };

    const handleAdd = (e) => {
        if (e) e.preventDefault();
        const val = input.trim();
        if (!val) return;

        if (!validateEmail(val)) {
            setError("Invalid email address.");
            return;
        }
        if (emails.includes(val)) {
            setError("Email already added.");
            return;
        }

        setEmails([...emails, val]);
        setInput('');
        setError(null);
    };

    const handleKeyDown = (e) => {
        if (['Enter', ',', ' '].includes(e.key)) {
            e.preventDefault();
            handleAdd();
        }
    };

    const removeEmail = (email) => {
        setEmails(emails.filter(e => e !== email));
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        onShare(emails);
        setIsSubmitting(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[150] p-4 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md shadow-2xl">
                <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Share2 size={20} className="text-blue-400"/> Share Event Access
                    </h3>
                    <button onClick={onClose}><X size={20} className="text-slate-500 hover:text-white"/></button>
                </div>
                
                <div className="p-6 space-y-4">
                    <div className="bg-blue-900/10 border border-blue-900/30 rounded-lg p-3">
                        <div className="flex gap-2">
                            <Share2 size={16} className="text-blue-400 shrink-0 mt-0.5" />
                            <div className="text-xs text-blue-200/80 leading-relaxed">
                                Share read-only access to rosters, match details, and stats. Recipients will receive an email invitation.
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Recipients</label>
                        <div className="bg-slate-950 border border-slate-800 rounded-lg p-2 min-h-[80px] focus-within:border-blue-500/50 transition-colors">
                            <div className="flex flex-wrap gap-2">
                                {emails.map(email => (
                                    <div key={email} className="flex items-center gap-1 bg-slate-800 text-slate-200 px-2 py-1 rounded text-xs border border-slate-700 animate-in fade-in zoom-in duration-200">
                                        <Mail size={10} className="text-slate-500"/>
                                        {email}
                                        <button onClick={() => removeEmail(email)} type="button" className="hover:text-white hover:bg-red-500/20 rounded p-0.5 transition-colors">
                                            <X size={12} />
                                        </button>
                                    </div>
                                ))}
                                <input 
                                    className="bg-transparent border-none outline-none text-sm text-white flex-1 min-w-[150px] px-1 py-0.5 placeholder-slate-600"
                                    placeholder={emails.length === 0 ? "Enter email addresses..." : "Add another..."}
                                    value={input}
                                    onChange={e => {
                                        setInput(e.target.value);
                                        if(error) setError(null);
                                    }}
                                    onKeyDown={handleKeyDown}
                                    onBlur={handleAdd} 
                                    autoFocus
                                />
                            </div>
                        </div>
                        {error && (
                            <div className="flex items-center gap-2 mt-2 text-red-400 text-xs animate-in slide-in-from-top-1">
                                <AlertCircle size={12} /> {error}
                            </div>
                        )}
                        <p className="text-[10px] text-slate-500 mt-2">Press Enter or Comma to add multiple emails.</p>
                    </div>
                </div>

                <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex justify-end gap-3 rounded-b-xl">
                    <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={emails.length === 0 || isSubmitting} className="w-32 justify-center">
                        {isSubmitting ? <Loader className="animate-spin" size={16}/> : 'Send Invites'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

const Step6_Publish = ({ event, onUpdate }) => {
  const [isCopied, setIsCopied] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  // Derived State
  const isPublished = event.schedulingStatus === 'published';
  const matchCount = event.sequencing?.length || event.matchups?.length || 0;
  
  // FIX: Participant Calculation
  const totalWrestlers = event.participatingTeams?.reduce((acc, t) => acc + (t.roster?.length || 0), 0) || 0;
  
  // Configuration for Stats
  const mats = event.eventParameters?.mats || 4;
  
  // --- DYNAMIC PUBLIC URL ---
  // Calculates the correct URL to share based on the current environment (localhost or prod)
  // and injects the Host Team ID and Event ID as query parameters.
  const hostTeam = event.participatingTeams?.find(t => t.isHost);
  const hostTeamId = hostTeam?.id || event.participatingTeams?.[0]?.id; // Fallback to first team if no host marked
  const publicUrl = `${window.location.origin}/?team=${hostTeamId}&event=${event.id}`;

  const handleTogglePublish = () => {
    const newStatus = isPublished ? 'complete' : 'published';
    onUpdate(event.id, { schedulingStatus: newStatus });
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // --- BOUT SHEET GENERATION ---
  const handleBoutSheets = () => {
        const matches = event.sequencing || event.matchups || [];
        if (matches.length === 0) { alert("No matches to print."); return; }

        const printWindow = window.open('', '_blank');
        if (!printWindow) { alert("Please allow popups to print bout sheets."); return; }
        
        const html = `
            <html>
            <head>
                <title>Bout Sheets - ${event.name}</title>
                <style>
                    body { font-family: sans-serif; padding: 20px; color: #000; }
                    .bout-sheet { 
                        border: 2px solid #000; 
                        padding: 20px; 
                        margin-bottom: 40px; 
                        page-break-after: always; 
                        background: #fff;
                    }
                    .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
                    .header h2 { margin: 0; font-size: 24px; text-transform: uppercase; }
                    .header p { margin: 5px 0 0; font-size: 14px; font-weight: bold; color: #555; }
                    
                    .match-info { display: flex; justify-content: space-between; font-weight: bold; font-size: 18px; margin-bottom: 20px; background: #eee; padding: 10px; border: 1px solid #000; }
                    
                    .competitors { display: flex; justify-content: space-between; align-items: flex-start; margin: 30px 0; }
                    .wrestler { width: 45%; text-align: center; display: flex; flex-direction: column; align-items: center; }
                    .vs { font-weight: bold; font-size: 24px; color: #ccc; margin-top: 20px; }
                    
                    .name { font-size: 20px; font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 5px; margin-bottom: 5px; width: 100%; }
                    .team { font-size: 16px; color: #444; font-weight: bold; }
                    .stats { font-size: 12px; margin-top: 5px; color: #666; }
                    
                    /* Winner Checkbox */
                    .winner-check { margin-top: 15px; display: flex; align-items: center; gap: 10px; font-weight: bold; font-size: 14px; text-transform: uppercase; border: 1px solid #ccc; padding: 5px 10px; border-radius: 4px; }
                    .box { width: 24px; height: 24px; border: 2px solid #000; background: #fff; display: inline-block; }

                    /* Results Section */
                    .results-section { display: flex; justify-content: space-between; align-items: center; margin-top: 40px; border-top: 1px dashed #ccc; padding-top: 20px; }
                    
                    .score-box-container { text-align: center; }
                    .score-box-label { font-size: 12px; font-weight: bold; text-transform: uppercase; margin-bottom: 5px; display: block; }
                    .score-box { width: 80px; height: 50px; border: 2px solid #000; font-size: 24px; display: flex; align-items: center; justify-content: center; background: #f9f9f9; }

                    .result-types { display: flex; gap: 10px; justify-content: center; }
                    .result-circle { width: 40px; height: 40px; border: 1px solid #000; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; text-align: center; line-height: 1; }
                    
                    @media print {
                        .no-print { display: none !important; }
                        body { padding: 0; margin: 0; }
                        .bout-sheet { border: 2px solid #000; break-inside: avoid; margin: 0; height: 100vh; box-sizing: border-box; page-break-after: always; } 
                    }
                </style>
            </head>
            <body>
                <div class="no-print" style="padding: 20px; background: #333; color: white; text-align: center; margin-bottom: 20px;">
                    <h1 style="margin: 0 0 10px 0;">Print Preview</h1>
                    <button onclick="window.print()" style="background: #3b82f6; color: white; border: none; padding: 10px 20px; font-size: 16px; font-weight: bold; border-radius: 5px; cursor: pointer;">Print Now</button>
                    <p style="margin-top: 10px; font-size: 12px; opacity: 0.8;">Click 'Print Now' or press Ctrl+P to save as PDF or print.</p>
                </div>
                ${matches.map(m => `
                    <div class="bout-sheet">
                        <div class="header">
                            <h2>${event.name || 'Wrestling Event'}</h2>
                            <p>OFFICIAL SCORECARD</p>
                        </div>
                        <div class="match-info">
                            <span>MAT ${m.matId || '_'}</span>
                            <span>BOUT ${m.boutNumber || '_'}</span>
                        </div>
                        <div class="competitors">
                            <div class="wrestler" style="color: #ef4444;">
                                <div style="font-size: 12px; font-weight: bold; margin-bottom: 5px;">RED</div>
                                <div class="name" style="color: #000;">${m.w1.firstName} ${m.w1.lastName}</div>
                                <div class="team">${m.w1.teamName}</div>
                                <div class="stats">Wt: ${m.w1.weight} | Age: ${m.w1.age}</div>
                                <div class="winner-check" style="color: #000;">
                                    <div class="box"></div> Winner
                                </div>
                            </div>
                            <div class="vs">VS</div>
                            <div class="wrestler" style="color: #22c55e;">
                                <div style="font-size: 12px; font-weight: bold; margin-bottom: 5px;">GREEN</div>
                                <div class="name" style="color: #000;">${m.w2.firstName} ${m.w2.lastName}</div>
                                <div class="team">${m.w2.teamName}</div>
                                <div class="stats">Wt: ${m.w2.weight} | Age: ${m.w2.age}</div>
                                <div class="winner-check" style="color: #000;">
                                    <div class="box"></div> Winner
                                </div>
                            </div>
                        </div>
                        
                        <div class="results-section">
                            <div class="score-box-container">
                                <span class="score-box-label" style="color: #ef4444;">Red Score</span>
                                <div class="score-box"></div>
                            </div>
                            
                            <div class="result-types">
                                <div class="result-circle">DEC</div>
                                <div class="result-circle">MAJ</div>
                                <div class="result-circle">TECH</div>
                                <div class="result-circle">FALL</div>
                                <div class="result-circle">FOR</div>
                            </div>

                            <div class="score-box-container">
                                <span class="score-box-label" style="color: #22c55e;">Green Score</span>
                                <div class="score-box"></div>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </body>
            </html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();
  };

  // --- PACKET PRINT (HTML VIEW) ---
  const handlePrintPacket = () => {
        const matches = event.sequencing || event.matchups || [];
        if (matches.length === 0) { alert("No matches to print."); return; }

        const printWindow = window.open('', '_blank');
        if (!printWindow) { alert("Please allow popups."); return; }

        // Logic to group data
        const sortedByMat = [...matches].sort((a,b) => (a.matId - b.matId) || (a.boutNumber - b.boutNumber));
        const matData = {};
        matches.forEach(m => { if (!matData[m.matId]) matData[m.matId] = []; matData[m.matId].push(m); });

        // Helper for consistent team colors
        const getTeamColorHex = (teamName) => {
            // Using bold, distinct colors for better visibility
            const colors = [
                '#dc2626', // Red
                '#16a34a', // Green
                '#2563eb', // Blue
                '#d97706', // Amber
                '#9333ea', // Purple
                '#db2777', // Pink
                '#0891b2', // Cyan
                '#4f46e5', // Indigo
                '#ea580c', // Orange
                '#059669', // Emerald
                '#7c3aed', // Violet
                '#be123c'  // Rose
            ];
            let hash = 0;
            for (let i = 0; i < teamName.length; i++) hash = teamName.charCodeAt(i) + ((hash << 5) - hash);
            return colors[Math.abs(hash) % colors.length];
        };

        const html = `
            <html>
            <head>
                <title>Coach Packet - ${event.name}</title>
                <style>
                    body { font-family: sans-serif; padding: 20px; color: #000; font-size: 12px; }
                    h1 { text-align: center; text-transform: uppercase; border-bottom: 2px solid #000; padding-bottom: 10px; }
                    h2 { margin-top: 30px; border-bottom: 1px solid #999; page-break-after: avoid; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                    th, td { border: 1px solid #ccc; padding: 5px; text-align: left; }
                    th { background: #eee; font-weight: bold; }
                    .mat-section { page-break-after: always; }
                    @media print {
                        .no-print { display: none !important; }
                        h2 { break-after: avoid; }
                        table { break-inside: auto; }
                        tr { break-inside: avoid; break-after: auto; }
                        /* Ensure background colors print */
                        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    }
                </style>
            </head>
            <body>
                <div class="no-print" style="text-align: center; margin-bottom: 20px;">
                    <button onclick="window.print()" style="background: #3b82f6; color: white; border: none; padding: 10px 20px; font-weight: bold; border-radius: 5px; cursor: pointer;">Print Packet</button>
                </div>
                
                <h1>${event.name} - Event Schedule</h1>

                ${Object.keys(matData).sort((a,b) => a-b).map(matId => `
                    <div class="mat-section">
                        <h2>Mat ${matId} Schedule</h2>
                        <table>
                            <thead>
                                <tr>
                                    <th style="width: 15%;">Team (1)</th>
                                    <th style="width: 25%;">Wrestler (1)</th>
                                    <th style="width: 10%; text-align: center;">Mat</th>
                                    <th style="width: 10%; text-align: center;">Match</th>
                                    <th style="width: 25%;">Wrestler (2)</th>
                                    <th style="width: 15%;">Team (2)</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${matData[matId].sort((a,b) => a.boutNumber - b.boutNumber).map(m => `
                                    <tr>
                                        <td style="font-weight: bold; color: ${getTeamColorHex(m.w1.teamName)};">
                                            ${m.w1.teamAbbr || m.w1.teamName}
                                        </td>
                                        <td>${m.w1.firstName} ${m.w1.lastName}</td>
                                        <td style="text-align: center; font-weight: bold;">${m.matId}</td>
                                        <td style="text-align: center; font-weight: bold;">${m.boutNumber}</td>
                                        <td>${m.w2.firstName} ${m.w2.lastName}</td>
                                        <td style="font-weight: bold; color: ${getTeamColorHex(m.w2.teamName)};">
                                            ${m.w2.teamAbbr || m.w2.teamName}
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `).join('')}
            </body>
            </html>
        `;
        printWindow.document.write(html);
        printWindow.document.close();
  };

  // --- EXCEL PACKET GENERATION ---
  const handleDownloadPacket = () => {
        const matches = event.sequencing || event.matchups || [];
        if (matches.length === 0) { alert("No matches to export."); return; }

        const createRow = (cells) => {
            return `<Row>${cells.map(c => `<Cell><Data ss:Type="String">${c || ''}</Data></Cell>`).join('')}</Row>`;
        };

        const createWorksheet = (name, headers, rows) => {
            return `
            <Worksheet ss:Name="${name}">
                <Table>
                    ${createRow(headers)}
                    ${rows.join('')}
                </Table>
            </Worksheet>`;
        };

        // 1. Full Schedule (By Mat view logic)
        const sortedByMat = [...matches].sort((a,b) => (a.matId - b.matId) || (a.boutNumber - b.boutNumber));
        // Columns matching Step 5 By Mat: Team(1), Wrestler(1), Mat, Match, Wrestler(2), Team(2)
        const fullScheduleRows = sortedByMat.map(m => createRow([
            m.w1.teamAbbr || m.w1.teamName, 
            `${m.w1.firstName} ${m.w1.lastName}`, 
            m.matId, 
            m.boutNumber, 
            `${m.w2.firstName} ${m.w2.lastName}`, 
            m.w2.teamAbbr || m.w2.teamName
        ]));

        let worksheets = [createWorksheet("Full Schedule", ['Team (1)', 'Wrestler (1)', 'Mat', 'Match', 'Wrestler (2)', 'Team (2)'], fullScheduleRows)];

        // 2. Individual Team Sheets (By Team view logic)
        // Group data by team first
        const teamData = {};
        matches.forEach(m => {
            // Add for W1
            if (!teamData[m.w1.teamName]) teamData[m.w1.teamName] = [];
            teamData[m.w1.teamName].push({
                myTeam: m.w1.teamName,
                myWrestler: `${m.w1.firstName} ${m.w1.lastName}`,
                matId: m.matId,
                boutNumber: m.boutNumber,
                oppWrestler: `${m.w2.firstName} ${m.w2.lastName}`, // Context for Coach
                oppTeam: m.w2.teamName
            });

            // Add for W2
            if (!teamData[m.w2.teamName]) teamData[m.w2.teamName] = [];
            teamData[m.w2.teamName].push({
                myTeam: m.w2.teamName,
                myWrestler: `${m.w2.firstName} ${m.w2.lastName}`,
                matId: m.matId,
                boutNumber: m.boutNumber,
                oppWrestler: `${m.w1.firstName} ${m.w1.lastName}`,
                oppTeam: m.w1.teamName
            });
        });

        // Generate a sheet for each team
        Object.keys(teamData).sort().forEach(teamName => {
            const rows = teamData[teamName]
                .sort((a,b) => a.myWrestler.localeCompare(b.myWrestler) || (a.boutNumber - b.boutNumber))
                .map(r => createRow([r.myTeam, r.myWrestler, r.matId, r.boutNumber, r.oppWrestler, r.oppTeam]));
            
            // Excel sheet names max 31 chars, no special chars strictly
            const safeName = teamName.replace(/[:\\/?*[\]]/g, '').substring(0, 30);
            worksheets.push(createWorksheet(safeName, ['Team', 'Wrestler', 'Mat', 'Match', 'Opponent', 'Opponent Team'], rows));
        });

        // 3. Individual Mat Sheets
        const matData = {};
        matches.forEach(m => {
            if (!matData[m.matId]) matData[m.matId] = [];
            matData[m.matId].push(m);
        });

        Object.keys(matData).sort((a,b) => a - b).forEach(matId => {
            const rows = matData[matId]
                .sort((a,b) => a.boutNumber - b.boutNumber)
                .map(m => createRow([
                    m.w1.teamAbbr || m.w1.teamName,
                    `${m.w1.firstName} ${m.w1.lastName}`,
                    m.matId,
                    m.boutNumber,
                    `${m.w2.firstName} ${m.w2.lastName}`,
                    m.w2.teamAbbr || m.w2.teamName
                ]));
            
            worksheets.push(createWorksheet(`Mat ${matId}`, ['Team (1)', 'Wrestler (1)', 'Mat', 'Match', 'Wrestler (2)', 'Team (2)'], rows));
        });

        const xml = `<?xml version="1.0"?>
        <?mso-application progid="Excel.Sheet"?>
        <Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
            xmlns:o="urn:schemas-microsoft-com:office:office"
            xmlns:x="urn:schemas-microsoft-com:office:excel"
            xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
            xmlns:html="http://www.w3.org/TR/REC-html40">
            ${worksheets.join('')}
        </Workbook>`;

        const blob = new Blob([xml], { type: 'application/vnd.ms-excel' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${(event.name || 'Event').replace(/\s+/g, '_')}_CoachPacket.xls`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
  };

  const handleSharePacket = (emails) => {
      // In a real app, this would call a cloud function to send emails or update permissions
      alert(`Invites sent to: ${emails.join(', ')}`);
      // Update event metadata to track shares if needed
      // onUpdate(event.id, { sharedWith: [...(event.sharedWith || []), ...emails] });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-right-8 duration-500 h-full flex flex-col">
      
      {showShareModal && (
          <SharePacketModal onClose={() => setShowShareModal(false)} onShare={handleSharePacket} />
      )}

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
                            onClick={handleBoutSheets}
                            className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-xl hover:border-purple-500/50 hover:bg-slate-900 transition-all group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-slate-800 rounded-lg text-slate-400 group-hover:text-white transition-colors">
                                    <FileText size={20} />
                                </div>
                                <div className="text-left">
                                    <div className="text-sm font-bold text-white">Bout Sheets</div>
                                    <div className="text-xs text-slate-500">Official scorecards (Printable)</div>
                                </div>
                            </div>
                            <Printer size={16} className="text-slate-600 group-hover:text-purple-400" />
                        </button>

                        <button 
                            onClick={() => setShowShareModal(true)}
                            className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-xl hover:border-blue-500/50 hover:bg-slate-900 transition-all group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-slate-800 rounded-lg text-slate-400 group-hover:text-white transition-colors">
                                    <Users size={20} />
                                </div>
                                <div className="text-left">
                                    <div className="text-sm font-bold text-white">Share Event</div>
                                    <div className="text-xs text-slate-500">Share read-only access w/ coaches</div>
                                </div>
                            </div>
                            <Share2 size={16} className="text-slate-600 group-hover:text-blue-400" />
                        </button>

                        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 transition-all group hover:border-green-500/50 hover:bg-slate-900">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2 bg-slate-800 rounded-lg text-slate-400 group-hover:text-white transition-colors">
                                    <FileSpreadsheet size={20} />
                                </div>
                                <div className="text-left">
                                    <div className="text-sm font-bold text-white">Coach Packet</div>
                                    <div className="text-xs text-slate-500">Event schedule and details</div>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button 
                                    onClick={handleDownloadPacket}
                                    variant="secondary"
                                    className="flex-1 text-xs"
                                >
                                    <Download size={14} className="mr-2"/> Excel
                                </Button>
                                <Button 
                                    onClick={handlePrintPacket}
                                    variant="secondary"
                                    className="flex-1 text-xs"
                                >
                                    <Printer size={14} className="mr-2"/> Print
                                </Button>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Step6_Publish;