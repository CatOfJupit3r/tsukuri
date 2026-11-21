import { ScriptOnce } from '@tanstack/react-router';

interface iFunctionOnceProps<T> {
  children: (param: T) => unknown;
  param?: T;
}

export function FunctionOnce<T = unknown>({ children, param }: iFunctionOnceProps<T>) {
  return <ScriptOnce>{`(${children.toString()})(${JSON.stringify(param)})`}</ScriptOnce>;
}
