import { tickBubbles } from './state.js';

export { createBubblesState } from './state.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

function createBubbleElement(bubble) {
  const g = document.createElementNS(SVG_NS, 'g');

  g.dataset.bubbleId = bubble.id;

  const circle = document.createElementNS(SVG_NS, 'circle');

  circle.setAttribute('r', bubble.radius);
  circle.setAttribute('fill', '#86cfee');
  circle.setAttribute('stroke', '#d4f0ff');
  circle.setAttribute('stroke-width', Math.max(1.5, bubble.radius * 0.18).toFixed(1));

  const shine = document.createElementNS(SVG_NS, 'circle');
  const shineR = Math.max(1, bubble.radius * 0.28);

  shine.setAttribute('r', shineR.toFixed(1));
  shine.setAttribute('cx', (-bubble.radius * 0.3).toFixed(1));
  shine.setAttribute('cy', (-bubble.radius * 0.3).toFixed(1));
  shine.setAttribute('fill', 'white');

  g.appendChild(circle);
  g.appendChild(shine);
  applyBubbleTransform(g, bubble);

  return g;
}

function applyBubbleTransform(g, bubble) {
  g.setAttribute('transform', `translate(${bubble.x.toFixed(1)},${bubble.y.toFixed(1)})`);
  g.setAttribute('opacity', bubble.opacity.toFixed(3));
}

export function startBubbles(svgElement, state) {
  if (!svgElement) {
    return { stop: () => {} };
  }

  const elements = new Map();

  for (const bubble of state.bubbles) {
    const el = createBubbleElement(bubble);

    svgElement.appendChild(el);
    elements.set(bubble.id, el);
  }

  let rafId = null;
  let stopped = false;

  function frame(nowMs) {
    if (stopped) {
      return;
    }

    const { removed } = tickBubbles(state, nowMs);

    for (const id of removed) {
      const el = elements.get(id);

      if (el) {
        svgElement.removeChild(el);
        elements.delete(id);
      }
    }

    for (const bubble of state.bubbles) {
      let el = elements.get(bubble.id);

      if (!el) {
        el = createBubbleElement(bubble);
        svgElement.appendChild(el);
        elements.set(bubble.id, el);
      } else {
        applyBubbleTransform(el, bubble);
      }
    }

    rafId = requestAnimationFrame(frame);
  }

  rafId = requestAnimationFrame(frame);

  return {
    stop() {
      stopped = true;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    },
  };
}
