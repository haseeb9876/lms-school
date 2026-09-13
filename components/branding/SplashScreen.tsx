import { headers } from "next/headers";
import { getBrandingSettings } from "@/lib/branding";
import { readableTextColor } from "@/lib/color";

/**
 * The school's own launch screen, covering the app while it starts.
 *
 * Rendered on the server, in the first HTML, on purpose. The obvious
 * implementation — a client component that shows itself and then hides — is
 * always too late to be a launch screen: React only runs after hydration,
 * which happens *after* the page has loaded, so by the time such a component
 * could appear there is nothing left to cover. It would be a delay wearing a
 * logo rather than a splash.
 *
 * So the markup is in the document, it paints with the first frame, and a
 * small inline script takes it away again. The script has to be inline for
 * the same reason the theme script does: an external file arrives after
 * first paint, which defeats the point.
 *
 * Shown once per browsing session. A splash between every click would be
 * slower to read and heavier to use, not more premium — in-app navigation
 * keeps its skeletons, which show the shape of what is arriving.
 *
 * Deliberately *not* shown on the public welcome screen: that page is its
 * own designed first impression and does not want a cover over it.
 */
/*
 * Dismisses the splash early. The CSS already guarantees it leaves on its
 * own, so every lookup here is allowed to fail harmlessly — which matters,
 * because this script can run before React has inserted the element.
 *
 * `find()` is called at the moment it is needed rather than once at the top,
 * which was the bug: the element did not exist yet, the script returned, and
 * the splash sat over the app until the page was reloaded.
 */
const SCRIPT = `(function(){
function find(){return document.getElementById('app-splash');}
var launched=false;
try{launched=sessionStorage.getItem('lms-launched')==='1';sessionStorage.setItem('lms-launched','1');}catch(e){}

function drop(){var el=find();if(el)el.remove();}
function leave(){var el=find();if(el)el.setAttribute('data-leaving','true');}

if(launched){
  // Same session: this is a navigation, not a launch. Take it away at once
  // rather than covering a page the person already has open.
  drop();
  document.addEventListener('DOMContentLoaded',drop,{once:true});
  return;
}

function ready(){setTimeout(leave,200);setTimeout(drop,900);}
if(document.readyState==='complete')ready();
else window.addEventListener('load',ready,{once:true});
})();`;

export async function SplashScreen() {
  const [branding, headerList] = await Promise.all([getBrandingSettings(), headers()]);
  const nonce = headerList.get("x-nonce") ?? undefined;

  const initial = branding.schoolName.trim().charAt(0).toUpperCase() || "S";

  return (
    <>
      <div id="app-splash" className="splash" aria-hidden="true" data-print-hide>
        <div className="splash-mark">
          <span className="splash-ring" style={{ borderTopColor: branding.primaryColor }} />
          {branding.logoUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={branding.logoUrl} alt="" className="splash-logo" />
          ) : (
            <span
              className="splash-logo splash-monogram"
              style={{
                background: branding.primaryColor,
                color: readableTextColor(branding.primaryColor),
              }}
            >
              {initial}
            </span>
          )}
        </div>
        <p className="splash-name">{branding.schoolName}</p>
      </div>
      <script nonce={nonce} dangerouslySetInnerHTML={{ __html: SCRIPT }} />
    </>
  );
}
