// Bridges window.React (UMD) → ESM named exports for framer-motion
const R = window.React;
export default R;
export const {
  useState, useEffect, useRef, useCallback, useMemo, useContext,
  useReducer, useLayoutEffect, useId, createContext, forwardRef, memo,
  Fragment, Children, cloneElement, createElement, createRef,
  isValidElement, version, Component, PureComponent, StrictMode,
  Suspense, lazy, startTransition, useImperativeHandle, useDebugValue,
  useDeferredValue, useTransition, useInsertionEffect
} = R;
// jsx-runtime aliases
export const jsx = R.createElement;
export const jsxs = R.createElement;
export const jsxDEV = R.createElement;
