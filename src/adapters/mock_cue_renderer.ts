import type { CueRenderer, RenderedCue } from "./types.ts";

/**
 * In-memory renderer for tests. Captures every cue rendered so a test
 * can assert on the sequence and contents without a real HUD.
 */
export class MockCueRenderer implements CueRenderer {
  readonly id = "mock_renderer";
  readonly rendered: RenderedCue[] = [];

  render(cue: RenderedCue): void {
    this.rendered.push(cue);
  }

  clear(): void {
    this.rendered.length = 0;
  }

  texts(): string[] {
    return this.rendered.map((c) => c.text);
  }
}
