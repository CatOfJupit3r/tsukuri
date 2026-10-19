import { useLayoutEffect, useEffect } from 'react';

import { isOnClient } from '#~/utils/is-on-client';

export const useIsomorphicLayoutEffect = isOnClient ? useLayoutEffect : useEffect;
