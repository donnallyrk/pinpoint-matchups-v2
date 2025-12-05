import React from 'react';
import { Swords, Shuffle } from 'lucide-react';
import { Button } from '../utils';

const MatchupView = ({ roster, matchups, onGenerate, onClear }) => {
  
  // NOTE: This is where we will eventually integrate your Python logic.
  // For now, it uses a simple Javascript shuffle.
  const generateMatchups = () => {
    if (roster.length < 2) return;
    
    // Shuffle roster
    const shuffled = [...roster].sort(() => Math.random() - 0.5);
    const newMatchups = [];
    
    // Create pairs
    for (let i = 0; i < shuffled.length; i += 2) {
      if (i + 1 < shuffled.length) {
        newMatchups.push({
          id: crypto.randomUUID(),
          teamA: [shuffled[i]],
          teamB: [shuffled[i+1]]
        });
      } else {
        newMatchups.push({
          id: crypto.randomUUID(),
          teamA: [shuffled[i]],
          teamB: [{ name: '(Bye)', id: 'bye' }]
        });
      }
    }
    onGenerate(newMatchups);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-white flex items-center">
          <Swords className="mr-2 text-green-400" size={20} />
          Matchups
        </h3>
        <div className="flex gap-2">
          {matchups && (
            <Button variant="ghost" onClick={onClear} className="text-xs">Clear</Button>
          )}
          <Button onClick={generateMatchups} icon={Shuffle} disabled={roster.length < 2}>
            Generate
          </Button>
        </div>
      </div>

      {!matchups ? (
        <div className="border-2 border-dashed border-slate-700 rounded-xl p-8 text-center">
          <p className="text-slate-500 mb-2">No matchups generated yet.</p>
          <p className="text-xs text-slate-600">Add players to the roster and click Generate.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {matchups.map((match, idx) => (
            <div key={match.id} className="bg-slate-700/30 border border-slate-600 rounded-lg p-3 flex items-center justify-between">
              <div className="font-semibold text-blue-300 w-5/12 text-right truncate">
                {match.teamA.map(p => p.name).join(', ')}
              </div>
              <div className="text-slate-500 font-bold px-2">VS</div>
              <div className="font-semibold text-red-300 w-5/12 text-left truncate">
                {match.teamB.map(p => p.name).join(', ')}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MatchupView;