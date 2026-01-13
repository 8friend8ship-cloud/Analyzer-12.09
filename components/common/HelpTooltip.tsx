import React from 'react';

interface HelpTooltipProps {
  text: string;
}

const HelpTooltip: React.FC<HelpTooltipProps> = ({ text }) => (
    <div className="relative group inline-block ml-1 cursor-help" tabIndex={0}>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-3 text-xs text-left text-white bg-gray-900 border border-gray-700 rounded-md opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto group-focus:pointer-events-auto z-10 shadow-lg whitespace-pre-line">
            {text}
        </div>
    </div>
);

export default HelpTooltip;