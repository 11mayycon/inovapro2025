import { LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface NavCard {
  title: string;
  icon: LucideIcon;
  path: string;
  color: string;
}

interface BottomNavBarProps {
  cards: NavCard[];
}

export function BottomNavBar({ cards }: BottomNavBarProps) {
  const navigate = useNavigate();

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-blue-900/95 backdrop-blur-md border-t-2 border-blue-700 shadow-2xl z-50 animate-in slide-in-from-bottom duration-500">
      <div className="overflow-x-auto">
        <div className="flex gap-2 p-3 min-w-max">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.path}
                onClick={() => navigate(card.path)}
                className={cn(
                  "group flex flex-col items-center justify-center gap-2 px-6 py-3 rounded-lg transition-all duration-300",
                  "hover:scale-105 hover:shadow-xl hover:-translate-y-1",
                  "bg-gradient-to-br min-w-[120px]",
                  card.color
                )}
              >
                <Icon className="w-6 h-6 text-white group-hover:scale-110 transition-transform duration-300" />
                <span className="text-xs font-semibold text-white text-center whitespace-nowrap">
                  {card.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
