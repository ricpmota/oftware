import './match-waves.css';

function WaveSvg({
  className,
  fill,
  d,
}: {
  className: string;
  fill: string;
  d: string;
}) {
  return (
    <div className={`match-wave absolute -left-[10%] top-0 h-full w-[120%] ${className}`}>
      <svg
        viewBox="0 0 1200 220"
        preserveAspectRatio="none"
        className="block h-full w-full"
        focusable="false"
      >
        <path fill={fill} d={d} />
      </svg>
    </div>
  );
}

export function MatchAnimatedWaves() {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-24 overflow-hidden"
      aria-hidden="true"
    >
      <WaveSvg
        className="match-wave-1"
        fill="rgba(76, 203, 122, 0.16)"
        d="M0 96C140 48 220 18 360 62C500 106 560 150 720 108C880 66 960 22 1100 70C1160 90 1180 120 1200 96L1200 220L0 220Z"
      />
      <WaveSvg
        className="match-wave-2"
        fill="rgba(10, 31, 68, 0.22)"
        d="M0 124C160 86 250 156 420 122C590 88 700 48 860 96C1020 144 1100 168 1200 128L1200 220L0 220Z"
      />
      <WaveSvg
        className="match-wave-3"
        fill="rgba(10, 31, 68, 0.55)"
        d="M0 154C170 118 280 176 460 146C640 116 760 86 940 128C1080 160 1140 140 1200 150L1200 220L0 220Z"
      />
    </div>
  );
}
