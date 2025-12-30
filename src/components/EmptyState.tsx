import React from 'react';

interface EmptyStateProps {
  message: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ message, icon, action }) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {icon && <div className="text-6xl text-gray-400 mb-4">{icon}</div>}
      <p className="text-gray-500 text-lg mb-4">{message}</p>
      {action && <div>{action}</div>}
    </div>
  );
};
