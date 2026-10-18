import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';

interface iUseScrollSpyControllerOptions {
  defaultValue: string;
  offset: number;
  scrollContainer?: RefObject<HTMLElement | null>;
}

export function useScrollSpyController({ defaultValue, offset, scrollContainer }: iUseScrollSpyControllerOptions) {
  const [activeValue, setActiveValue] = useState(defaultValue);
  const [registrationVersion, setRegistrationVersion] = useState(0);
  const sections = useRef(new Map<string, HTMLElement>());
  const isScrolling = useRef(false);
  const scrollTimer = useRef<number | undefined>(undefined);

  const registerSection = useCallback((value: string, element: HTMLElement) => {
    sections.current.set(value, element);
    setRegistrationVersion((current) => current + 1);
    return () => {
      sections.current.delete(value);
      setRegistrationVersion((current) => current + 1);
    };
  }, []);

  const scrollToSection = useCallback(
    (value: string) => {
      const section = sections.current.get(value);
      setActiveValue(value);
      if (!section) return;
      isScrolling.current = true;
      const container = getScrollContainer(scrollContainer);
      const containerTop = container?.getBoundingClientRect().top ?? 0;
      const currentScroll = container?.scrollTop ?? window.scrollY;
      const top = section.getBoundingClientRect().top - containerTop + currentScroll - offset;
      (container ?? window).scrollTo({ top, behavior: getScrollBehavior() });
      if (scrollTimer.current !== undefined) window.clearTimeout(scrollTimer.current);
      scrollTimer.current = window.setTimeout(() => {
        isScrolling.current = false;
      }, 500);
    },
    [offset, scrollContainer],
  );

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (isScrolling.current) return;
        const visible = entries.filter((entry) => entry.isIntersecting);
        if (visible.length === 0) return;
        const first = visible.reduce((closest, entry) =>
          entry.boundingClientRect.top < closest.boundingClientRect.top ? entry : closest,
        );
        setActiveValue(first.target.id);
      },
      { root: getScrollContainer(scrollContainer), rootMargin: `${-offset}px 0px -70% 0px`, threshold: 0.1 },
    );
    for (const section of sections.current.values()) observer.observe(section);
    return () => {
      observer.disconnect();
      if (scrollTimer.current !== undefined) window.clearTimeout(scrollTimer.current);
    };
  }, [offset, registrationVersion, scrollContainer]);

  return useMemo(
    () => ({ activeValue, registerSection, scrollToSection }),
    [activeValue, registerSection, scrollToSection],
  );
}

function getScrollBehavior(): ScrollBehavior {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
}

function getScrollContainer(scrollContainer?: RefObject<HTMLElement | null>) {
  return scrollContainer?.current ?? null;
}
