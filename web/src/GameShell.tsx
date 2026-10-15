import type { ReactNode } from "react";
import {
  GameAuth,
  GameShell as PlatformShell,
  GameThemeToggle,
  GameTopbar,
} from "@freegamestore/games";

interface GameShellProps {
  children: ReactNode;
}

/**
 * The game's frame: the platform shell, the topbar with the theme toggle, and the
 * screen. Theme follows the platform toggle and the system setting, through the CSS
 * variables in index.css.
 */
export function GameShell({ children }: GameShellProps) {
  const topbar = <GameTopbar title="Cascade Keys" actions={<GameThemeToggle />} />;

  return (
    <PlatformShell topbar={topbar}>
      <GameAuth />
      <div className="play-area">
        {children}
        <a className="store-link" href="https://freegamestore.online" target="_blank" rel="noopener">
          Built for freegamestore.online
        </a>
      </div>
    </PlatformShell>
  );
}
