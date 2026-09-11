import { headers } from "next/headers";
import { THEME_STORAGE_KEY } from "./constants";

/**
 * Applies the saved theme *before* the browser paints. Without this, a user
 * on the dark theme gets a white flash on every full page load: React only
 * runs after hydration, which is far too late to pick a background color.
 *
 * The script is inline (it must be — an external file would arrive too late
 * to beat first paint) and therefore needs the per-request CSP nonce that
 * proxy.ts generates, or `script-src 'self' 'nonce-…'` blocks it outright.
 */
const SCRIPT = `(function(){try{
var s=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
var d=document.documentElement;
d.classList.remove('light','dark');
if(s==='dark'||s==='light'){d.classList.add(s);}
}catch(e){}})();`;

export async function ThemeScript() {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return <script nonce={nonce} dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}
