import React, { useState } from 'react';

interface TooltipProps {
  content: string;
  children: React.ReactElement;
  side?: 'top' | 'bottom' | 'left' | 'right';
}

export function Tooltip({ content, children, side = 'top' }: TooltipProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div
          className={`absolute z-50 px-2 py-1 text-xs text-white bg-gray-900 dark:bg-gray-700 rounded whitespace-nowrap pointer-events-none ${
            side === 'top' ? 'bottom-full mb-1.5 left-1/2 -translate-x-1/2' :
            side === 'bottom' ? 'top-full mt-1.5 left-1/2 -translate-x-1/2' :
            side === 'left' ? 'right-full mr-1.5 top-1/2 -translate-y-1/2' :
            'left-full ml-1.5 top-1/2 -translate-y-1/2'
          }`}
        >
          {content}
        </div>
      )}
    </div>
  );
}
