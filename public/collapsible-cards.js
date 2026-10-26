const cardAnimations = new WeakMap();
export function animateCardBody(body, expand, startHeight) {
  const reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (!body.animate || reducedMotion) {
    body.hidden = !expand;
    body.inert = !expand;
    return;
  }
  const initialHeight = startHeight ?? (body.hidden ? 0 : body.getBoundingClientRect().height);
  cardAnimations.get(body)?.cancel();
  body.hidden = false;
  body.inert = !expand;
  const fullHeight = body.scrollHeight;
  const animation = body.animate(
    [
      {
        height: initialHeight + 'px',
        paddingTop: initialHeight ? '16px' : '0px',
        opacity: Math.min(1, initialHeight / (fullHeight || 1)),
        overflow: 'hidden'
      },
      {
        height: (expand ? fullHeight : 0) + 'px',
        paddingTop: expand ? '16px' : '0px',
        opacity: expand ? 1 : 0,
        overflow: 'hidden'
      }
    ],
    { duration: 240, easing: 'cubic-bezier(.2,.7,.2,1)' }
  );
  cardAnimations.set(body, animation);
  animation.onfinish = () => {
    if (cardAnimations.get(body) === animation) {
      body.hidden = !expand;
      cardAnimations.delete(body);
    }
  };
}
