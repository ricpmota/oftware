'use client';

import React from 'react';

interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  { 
    id: 'home', 
    label: 'Home', 
    icon: '/icones/home.png', 
    color: '#22c55e'
  },
  { 
    id: 'refraction', 
    label: 'Refração', 
    icon: '/icones/greens.png', 
    color: '#3b82f6'
  },
  { 
    id: 'glaucoma', 
    label: 'Glaucoma', 
    icon: '/icones/Glaucoma.png', 
    color: '#f59e0b'
  },
  { 
    id: 'retina', 
    label: 'Retina', 
    icon: '/icones/Retina.png', 
    color: '#8b5cf6'
  },
  { 
    id: 'patients', 
    label: 'Pacientes', 
    icon: '/icones/config.png', 
    color: '#ef4444'
  }
];

export default function Navigation({ activeTab, onTabChange }: NavigationProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 border-t border-gray-200 backdrop-blur-xl pb-safe">
      <div className="flex justify-around items-center py-2 md:py-4 max-w-md mx-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              flex flex-col items-center justify-center
              px-3 py-2 md:px-6 md:py-3
              rounded-xl md:rounded-2xl
              transition-all duration-300 ease-in-out
              min-w-[60px] md:min-w-[80px]
              cursor-pointer relative
              hover:scale-105 active:scale-95
              ${activeTab === tab.id 
                ? 'text-blue-600' 
                : 'text-gray-500'
              }
            `}
          >
            <div className="flex items-center justify-center mb-1 md:mb-2">
              <img 
                src={tab.icon} 
                alt={tab.label}
                className={`
                  w-5 h-5 md:w-6 md:h-6
                  transition-all duration-300
                  ${activeTab === tab.id 
                    ? 'filter-none opacity-100' 
                    : 'grayscale brightness-50 opacity-70'
                  }
                `}
              />
            </div>
            <div className={`
              text-xs md:text-sm font-medium
              transition-all duration-300
              ${activeTab === tab.id ? 'font-semibold' : 'font-normal'}
            `}>
              {tab.label}
            </div>
            {activeTab === tab.id && (
              <div 
                className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-5 h-0.5 md:w-6 md:h-1 rounded-full transition-all duration-300"
                style={{ background: tab.color }}
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );
} 