import React from 'react';

const PageHeader = ({ title, description, actions }) => (
  <div className="flex flex-wrap items-end justify-between gap-4 mb-6 shrink-0">
    <div>
      <h2 className="text-2xl font-bold text-white tracking-tight">{title}</h2>
      {description && <p className="text-slate-400 mt-1 text-sm">{description}</p>}
    </div>
    {actions && <div className="flex items-center gap-3">{actions}</div>}
  </div>
);

export default PageHeader;