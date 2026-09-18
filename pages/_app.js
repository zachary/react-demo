// Global CSS can only be imported here (or in _document) in Next.js.

// AG Grid styles (CSS only, framework-agnostic) first, so that the app's own
// global stylesheet below can override AG Grid's native class selectors
// (e.g. the `ag-paging-*` pagination rules).
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";
import "../src/index.css";

export default function MyApp({ Component, pageProps }) {
  return <Component {...pageProps} />;
}
