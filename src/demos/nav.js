const items = [
  ['A', '/demo-claymorphism.html'],
  ['B', '/demo-serene.html'],
  ['C', '/demo-retro.html'],
  ['D', '/demo-editorial.html'],
  ['E', '/demo-toon.html'],
  ['F', '/demo-storybook.html'],
  ['G', '/demo-kawaii.html'],
  ['H', '/demo-anime.html'],
  ['I', '/demo-collage.html'],
  ['J', '/demo-doodle.html'],
  ['K', '/demo-sticker.html'],
  ['L', '/demo-pikmin.html'],
  ['M', '/demo-mario.html'],
  ['N', '/demo-telemetry.html'],
];
const nav = document.querySelector('nav.demo-nav[data-current]');
if (nav) {
  const current = nav.dataset.current;
  nav.innerHTML = items
    .map(([k, href]) =>
      `<a href="${href}"${k === current ? ' aria-current="page"' : ''}>${k}</a>`,
    )
    .join('');
}
