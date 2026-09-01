// Global CSS can only be imported here (or in _document) in Next.js.
import "../src/index.css";

// AG Grid styles (CSS only, framework-agnostic).
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";

export default function MyApp({ Component, pageProps }) {
  return <Component {...pageProps} />;
}
