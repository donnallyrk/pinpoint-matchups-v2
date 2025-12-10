import React from 'react';

// Date Formatter
export const formatDate = (dateString) => {
  if (!dateString) return 'TBD';
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

// Reusable Button Component
export const Button = ({ children, onClick, variant = 'primary', icon: Icon, className = '', disabled = false, type = 'button', ...props }) => {
  const baseStyle = "flex items-center justify-center px-4 py-2 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500",
    secondary: "bg-slate-700 hover:bg-slate-600 text-slate-200 focus:ring-slate-500",
    danger: "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500",
    ghost: "bg-transparent hover:bg-slate-800 text-slate-400 hover:text-white"
  };

  return (
    <button 
      type={type}
      onClick={onClick} 
      disabled={disabled}
      className={`${baseStyle} ${variants[variant]} ${className}`}
      {...props}
    >
      {Icon && <Icon size={18} className="mr-2" />}
      {children}
    </button>
  );
};

// Card Container
export const Card = ({ children, className = '' }) => (
  <div className={`bg-slate-800 border border-slate-700 rounded-xl shadow-sm overflow-hidden ${className}`}>
    {children}
  </div>
);