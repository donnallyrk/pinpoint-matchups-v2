import React from 'react';
import { Users, Crown, ChevronRight } from 'lucide-react';

const TeamCard = ({ team, onClick, isOwner }) => (
  <div 
    onClick={onClick}
    className="group relative flex flex-col p-6 bg-slate-800 border border-slate-700 rounded-xl hover:border-blue-500/50 hover:shadow-lg transition-all cursor-pointer"
  >
    <div className="flex justify-between items-start mb-4">
      <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-lg">
        <Users size={24} />
      </div>
      {isOwner && (
        <span className="flex items-center gap-1 px-2 py-1 text-xs font-semibold bg-yellow-500/10 text-yellow-500 rounded-full border border-yellow-500/20">
          <Crown size={12} />
          Owner
        </span>
      )}
    </div>
    
    <h3 className="text-xl font-bold text-white mb-1 group-hover:text-blue-400 transition-colors">
      {team.metadata.name}
    </h3>
    <p className="text-slate-400 text-sm">
      {team.roster?.length || 0} Wrestlers
    </p>

    <div className="mt-6 flex items-center justify-between pt-4 border-t border-slate-700/50">
      <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">
        {team.subscription.status === 'active' ? 'Pro Plan' : 'Free Tier'}
      </span>
      <ChevronRight size={18} className="text-slate-500 group-hover:text-white transform group-hover:translate-x-1 transition-all" />
    </div>
  </div>
);

export default TeamCard;