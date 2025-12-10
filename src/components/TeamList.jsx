import React from 'react';
import { Users, Plus } from 'lucide-react';
import { Button } from '../utils';
import TeamCard from './TeamCard';

const TeamList = ({ teams, user, onCreateClick, onTeamSelect }) => {
  return (
    <div className="space-y-8 animate-in fade-in duration-500 overflow-y-auto h-full p-1">
      <div className="flex items-center justify-between">
          <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">Your Teams</h1>
              <p className="text-slate-400 mt-1">Select a team to manage rosters and schedules.</p>
          </div>
          <Button onClick={onCreateClick} icon={Plus}>Create Team</Button>
      </div>

      {teams.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/50 rounded-2xl border border-dashed border-slate-700">
              <div className="bg-slate-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="text-slate-500" size={32} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">No teams found</h3>
              <p className="text-slate-500 max-w-sm mx-auto mb-6">
                  You haven't created or joined any teams yet. Create a team to start generating matchups.
              </p>
              <Button onClick={onCreateClick} variant="primary">Create Your First Team</Button>
          </div>
      ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-8">
              {teams.map(team => (
                  <TeamCard 
                      key={team.id} 
                      team={team} 
                      isOwner={team.roles.owner === user.uid}
                      onClick={() => onTeamSelect(team)} 
                  />
              ))}
          </div>
      )}
    </div>
  );
};

export default TeamList;