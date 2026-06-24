export const DEMO_SVGS = {
  rocket: {
    name: 'rocket_illustration.svg',
    content: `<svg viewBox="0 0 400 400" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="skyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#1e1b4b" />
    </linearGradient>
    <linearGradient id="rocketGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#f8fafc" />
      <stop offset="100%" stop-color="#cbd5e1" />
    </linearGradient>
    <linearGradient id="fireGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#f59e0b" />
      <stop offset="100%" stop-color="#ef4444" />
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#skyGrad)" r="12" />
  <circle cx="80" cy="120" r="3" fill="#ffffff" opacity="0.8" />
  <circle cx="280" cy="80" r="2" fill="#ffffff" opacity="0.6" />
  <circle cx="340" cy="240" r="4" fill="#ffffff" opacity="0.9" />
  <g id="stars-sparkle" fill="#fff" opacity="0.2">
    <circle cx="150" cy="60" r="1.5" />
    <circle cx="210" cy="280" r="2.5" />
  </g>
  <g id="rocket-body" transform="translate(150, 100)">
    <path id="wing-left" d="M 10,90 Q -30,130 5,160 Z" fill="#475569" />
    <path id="wing-right" d="M 90,90 Q 130,130 95,160 Z" fill="#475569" />
    <path id="thruster-exhaust" d="M 40,165 Q 50,210 60,165 Z" fill="url(#fireGrad)" />
    <rect id="cabin-cylinder" x="20" y="30" width="60" height="130" rx="30" fill="url(#rocketGrad)" />
    <path id="nose-cone" d="M 20,40 Q 50,-10 80,40 Z" fill="#dc2626" />
    <circle id="window-outer" cx="50" cy="80" r="16" fill="#334155" />
    <circle id="window-glass" cx="50" cy="80" r="11" fill="#38bdf8" />
  </g>
</svg>`
  },
  sunset: {
    name: 'vibrant_gradient_sunset.svg',
    content: `<svg viewBox="0 0 500 300" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="sunsetGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ec4899" />
      <stop offset="40%" stop-color="#f43f5e" />
      <stop offset="80%" stop-color="#eab308" />
    </linearGradient>
    <linearGradient id="seaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#fb7185" />
      <stop offset="100%" stop-color="#1e1b4b" />
    </linearGradient>
  </defs>
  <rect width="100%" height="200" fill="url(#sunsetGrad)" />
  <circle id="sun" cx="250" cy="170" r="50" fill="#fffbeb" opacity="0.9" />
  <rect id="sea" y="200" width="100%" height="100" fill="url(#seaGrad)" />
  <g id="mountains" opacity="0.3">
    <polygon points="0,200 120,80 220,200" fill="#1e1b4b" />
    <polygon points="180,200 320,60 450,200" fill="#1e1b4b" />
  </g>
  <path id="birds" d="M 320,80 Q 325,75 330,80 Q 335,75 340,80" fill="none" stroke="#fff" stroke-width="2" />
</svg>`
  },
  gear: {
    name: 'mechanical_gear.svg',
    content: `<svg viewBox="0 0 100 100" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <g id="gear-assembly" transform="translate(50, 50)" fill="#64748b" stroke="#334155" stroke-width="2">
    <circle id="center-hole" cx="0" cy="0" r="10" fill="#0f172a" />
    <path id="outer-teeth" d="M -8,-35 L -12,-45 L 12,-45 L 8,-35 C 15,-30 25,-20 30,-10 L 42,-14 L 42,14 L 30,10 C 25,20 15,30 2,34 L 10,45 L -10,45 L -2,34 C -12,30 -22,20 -30,10 L -42,14 L -42,-14 L -30,-10" />
    <circle id="bearing-rim" cx="0" cy="0" r="22" fill="none" stroke-width="3" />
  </g>
</svg>`
  },
  tree: {
    name: 'bio_zen_leaf.svg',
    content: `<svg viewBox="0 0 200 200" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <g id="leaf-graphics" transform="translate(100,20)">
    <path id="main-stalk" d="M 0,0 C 20,40 10,130 0,160" fill="none" stroke="#059669" stroke-width="4" stroke-linecap="round" />
    <path id="primary-leaf" d="M 0,0 C 50,30 40,110 0,140 C -40,110 -50,30 0,0 Z" fill="#10b981" opacity="0.85" />
    <path id="left-ribs" d="M 0,30 Q -15,40 -25,35 M 0,60 Q -20,70 -35,62 M 0,90 Q -25,95 -32,85" stroke="#34d399" stroke-width="2" fill="none" />
    <path id="right-ribs" d="M 0,30 Q 15,40 25,35 M 0,60 Q 20,70 35,62 M 0,90 Q 25,95 32,85" stroke="#34d399" stroke-width="2" fill="none" />
  </g>
</svg>`
  }
};
