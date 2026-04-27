import type { CueRenderer, RenderedCue } from "./types.ts";

/**
 * Stub renderer that maps a `RenderedCue` onto Even G2 HUD primitives.
 * Real implementation calls `bridge.textContainerUpgrade(...)` for
 * low-flicker updates per docs/g2-alignment.md.
 *
 * State machine for cue lifecycle:
 *   1. First cue → `createStartUpPageContainer` with `isEventCapture: 1`
 *      so the cue captures CLICK_EVENT / DOUBLE_CLICK_EVENT.
 *   2. Subsequent cues during the same session → `textContainerUpgrade`
 *      to swap text without rebuilding the page (avoids flicker).
 *   3. `clear()` → either rebuild with empty content, or dismiss the
 *      page container; TBD on hardware.
 */

type EvenAppBridgeMinimal = {
  createStartUpPageContainer(cfg: unknown): Promise<unknown>;
  textContainerUpgrade(
    containerID: number,
    containerName: string,
    newContent: string,
    contentOffset: number,
    contentLength: number,
  ): Promise<unknown>;
};

export class EvenG2CueRenderer implements CueRenderer {
  readonly id = "even_g2_hud";

  private bridge: EvenAppBridgeMinimal;
  private containerInitialized = false;
  private readonly containerId = 1;
  private readonly containerName = "air_cue";

  constructor(bridge: EvenAppBridgeMinimal) {
    this.bridge = bridge;
  }

  async render(cue: RenderedCue): Promise<void> {
    if (!this.containerInitialized) {
      await this.bridge.createStartUpPageContainer({
        containerID: this.containerId,
        containerName: this.containerName,
        text: cue.text,
        isEventCapture: 1,
      });
      this.containerInitialized = true;
      return;
    }
    await this.bridge.textContainerUpgrade(
      this.containerId,
      this.containerName,
      cue.text,
      0,
      cue.text.length,
    );
  }

  async clear(): Promise<void> {
    if (!this.containerInitialized) return;
    await this.bridge.textContainerUpgrade(this.containerId, this.containerName, "", 0, 0);
  }
}
