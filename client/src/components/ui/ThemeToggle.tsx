import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { Button } from './Button';
import { Tooltip } from './Tooltip';

export function ThemeToggle() {
  const { theme, setTheme } = useUIStore();

  const cycle = () => {
    const order = ['light', 'dark', 'system'] as const;
    const next = order[(order.indexOf(theme) + 1) % 3];
    setTheme(next);
  };

  const icon = theme === 'light' ? <Sun size={15} /> : theme === 'dark' ? <Moon size={15} /> : <Monitor size={15} />;
  const label = `Theme: ${theme}`;

  return (
    <Tooltip content={label}>
      <Button size="sm" onClick={cycle} aria-label={label}>
        {icon}
      </Button>
    </Tooltip>
  );
}
