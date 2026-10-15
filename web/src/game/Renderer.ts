import type { Lane } from "../types";
import type { Tile } from "./GameEngine";

/** Lane colours, from the lowest band to the highest. */
export const LANE_COLOURS: readonly string[] = ["#10b981", "#60a5fa", "#f59e0b", "#f472b6"];
/** Colour of a missed tile's flash. */
export const MISS_COLOUR = "#ef4444";

/** Where the hit line sits, as a fraction of the canvas height from the top. */
const HIT_LINE = 0.85;
/** Height of a tap tile, in CSS px. Holds grow past this with their length. */
const TAP_HEIGHT_PX = 22;
/** How long a lane flashes after a press or miss, in ms. */
const FLASH_MS = 180;

/** The parts of the game a frame needs to draw. */
export interface RenderView {
  tiles: readonly Tile[];
  /** Time into the run, in ms. */
  clock: number;
  /** Falling speed, in px per second. */
  speed: number;
}

/** Theme colours read from the platform CSS variables. */
export interface Palette {
  panel: string;
  line: string;
  muted: string;
}

/**
 * Draws the four falling lanes on a 2D canvas. The engine owns the timing; this only
 * places tiles for the current clock and speed, and keeps the lane flashes.
 */
export class Renderer {
  private flashLeft: number[] = [0, 0, 0, 0];
  private flashColour: string[] = [...LANE_COLOURS];

  /** Flash a lane at the hit line. Pass a colour for a miss, or leave it for the lane's own. */
  flash(lane: Lane, colour?: string): void {
    this.flashLeft[lane] = FLASH_MS;
    this.flashColour[lane] = colour ?? LANE_COLOURS[lane] ?? MISS_COLOUR;
  }

  /** Count the flashes down by `dtMs`. */
  update(dtMs: number): void {
    this.flashLeft = this.flashLeft.map((left) => Math.max(0, left - dtMs));
  }

  /** Clear the canvas and draw the lanes, the hit line, the flashes and every live tile. */
  draw(ctx: CanvasRenderingContext2D, view: RenderView, width: number, height: number, palette: Palette): void {
    const laneWidth = width / LANE_COLOURS.length;
    const hitY = height * HIT_LINE;
    const pxPerMs = view.speed / 1000;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = palette.panel;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = palette.line;
    ctx.lineWidth = 1;
    for (let lane = 0; lane <= LANE_COLOURS.length; lane++) {
      const x = Math.round(lane * laneWidth) + 0.5;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    ctx.strokeStyle = palette.muted;
    ctx.beginPath();
    ctx.moveTo(0, hitY);
    ctx.lineTo(width, hitY);
    ctx.stroke();

    this.flashLeft.forEach((left, lane) => {
      if (left <= 0) return;
      ctx.globalAlpha = (left / FLASH_MS) * 0.5;
      ctx.fillStyle = this.flashColour[lane] ?? MISS_COLOUR;
      ctx.fillRect(lane * laneWidth, hitY - 24, laneWidth, 48);
    });
    ctx.globalAlpha = 1;

    for (const tile of view.tiles) {
      if (tile.state !== "pending" && tile.state !== "holding") continue;
      const { note } = tile;
      const holding = tile.state === "holding";
      // The leading edge reaches the hit line at the note's time. A held tile stays anchored there.
      const bottom = holding ? hitY : hitY - (note.time - view.clock) * pxPerMs;
      // A held tile shrinks from its top as the hold runs down. Otherwise it keeps its written length.
      const remaining = holding ? note.time + note.duration - view.clock : note.duration;
      const tileHeight = Math.max(TAP_HEIGHT_PX, remaining * pxPerMs);
      const top = bottom - tileHeight;
      if (top > height || bottom < 0) continue;

      for (const lane of tile.lanes) {
        ctx.globalAlpha = holding ? 0.85 : 1;
        ctx.fillStyle = LANE_COLOURS[lane] ?? MISS_COLOUR;
        ctx.fillRect(lane * laneWidth + 6, top, laneWidth - 12, tileHeight);
      }
      ctx.globalAlpha = 1;
    }
  }
}
