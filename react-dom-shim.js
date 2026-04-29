// Bridges window.ReactDOM (UMD) → ESM named exports for framer-motion
const RD = window.ReactDOM;
export default RD;
export const { render, unmountComponentAtNode, findDOMNode, createPortal, flushSync, createRoot, hydrateRoot } = RD;
