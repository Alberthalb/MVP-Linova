const transitionOffsets = {};

export const setTabInitialOffset = (routeName, offset) => {
  if (!routeName) return;
  transitionOffsets[routeName] = offset;
};

export const consumeTabInitialOffset = (routeName) => {
  if (!routeName || !(routeName in transitionOffsets)) return 0;
  const offset = transitionOffsets[routeName];
  delete transitionOffsets[routeName];
  return offset;
};
