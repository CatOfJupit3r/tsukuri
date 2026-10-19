import { useRef } from 'react';

import { useIsomorphicLayoutEffect } from '#~/hooks/react-utilities/use-isomorphic-layout-effect';

function useAsRef<T>(props: T) {
  const ref = useRef(props);

  useIsomorphicLayoutEffect(() => {
    ref.current = props;
  });

  return ref;
}

export { useAsRef };
