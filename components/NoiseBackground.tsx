/** Fixed grain + grid backdrop. Lives on its own layer so it never moves while scrolling. */
export default function NoiseBackground() {
  return <div aria-hidden className="noise-layer" />;
}
