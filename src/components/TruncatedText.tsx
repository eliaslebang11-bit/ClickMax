import React, { useState } from 'react';
import { cn } from '../lib/utils';

interface TruncatedTextProps {
  text: string;
  maxLength?: number;
  className?: string;
  expandable?: boolean;
}

export default function TruncatedText({ 
  text, 
  maxLength = 100, 
  className,
  expandable = true 
}: TruncatedTextProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const shouldTruncate = text.length > maxLength;

  if (!shouldTruncate) {
    return <p className={className}>{text}</p>;
  }

  return (
    <div className={className}>
      <p className={cn("inline", !isExpanded && "line-clamp-none")}>
        {isExpanded ? text : `${text.slice(0, maxLength)}`}
        {!isExpanded && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (expandable) setIsExpanded(true);
            }}
            className="ml-1 font-bold text-white/80 hover:text-white cursor-pointer inline-block"
          >
            ...more
          </button>
        )}
      </p>
      {isExpanded && expandable && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(false);
          }}
          className="block mt-1 text-xs font-bold text-brand-muted hover:text-brand-text"
        >
          Show less
        </button>
      )}
    </div>
  );
}
