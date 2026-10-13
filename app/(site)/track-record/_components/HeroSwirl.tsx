// The concentric, rotating ellipses behind the page title, echoing the cover
// of the printed track record.
const CX = 300;
const CY = 300;
const RINGS = Array.from({ length: 40 }, (_, i) => ({
  rx: 80 + i * 5.2,
  ry: 160 + i * 3.4,
  rotate: i * 4.5,
}));

export default function HeroSwirl() {
  return (
    <svg className="tr-hero-swirl" viewBox="0 0 600 600" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
      <g fill="none" stroke="currentColor" strokeWidth="0.6" opacity="0.55">
        {RINGS.map(({ rx, ry, rotate }) => (
          <ellipse key={rotate} cx={CX} cy={CY} rx={rx} ry={ry} transform={`rotate(${rotate} ${CX} ${CY})`} />
        ))}
      </g>
    </svg>
  );
}
