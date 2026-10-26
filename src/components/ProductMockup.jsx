import React, {
  Suspense,
  lazy,
  useEffect,
  useRef,
  useState,
} from "react";
import "./ProductMockup.css";

const Spline = lazy(() => import("@splinetool/react-spline"));

const SPLINE_SCENE =
  "https://prod.spline.design/AlNWYApDDWDMpwi7/scene.splinecode";

/* =========================================================
   Check whether the browser can create a WebGL context
   ========================================================= */
function checkWebGL() {
  try {
    const canvas = document.createElement("canvas");

    const gl =
      canvas.getContext("webgl2", {
        antialias: false,
        alpha: true,
        powerPreference: "low-power",
      }) ||
      canvas.getContext("webgl", {
        antialias: false,
        alpha: true,
        powerPreference: "low-power",
      });

    if (!gl) {
      return false;
    }

    const renderer = gl.getParameter(gl.RENDERER);

    console.log("WebGL available:", renderer);

    const loseContext = gl.getExtension("WEBGL_lose_context");

    if (loseContext) {
      loseContext.loseContext();
    }

    return true;
  } catch (error) {
    console.error("WebGL availability check failed:", error);
    return false;
  }
}

/* =========================================================
   Fallback
   ========================================================= */
function SplineFallback({ retry }) {
  return (
    <div className="mockup-frame__fallback">
      <div className="mockup-fallback-content">
        <div className="mockup-fallback-icon">✦</div>

        <h3>Interactive 3D Preview</h3>

        <p>
          The 3D preview could not be initialized right now.
          You can try loading it again.
        </p>

        <button
          type="button"
          onClick={retry}
          className="mockup-fallback-button"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}

/* =========================================================
   Loading
   ========================================================= */
function SplineLoading() {
  return (
    <div className="mockup-frame__loading">
      <div className="mockup-loading-spinner" />
      <span>Loading 3D scene...</span>
    </div>
  );
}

/* =========================================================
   Error Boundary
   ========================================================= */
class SplineErrorBoundary extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      hasError: false,
    };
  }

  static getDerivedStateFromError() {
    return {
      hasError: true,
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Spline/WebGL Error:", error);
    console.error("Spline component info:", errorInfo);

    if (this.props.onError) {
      this.props.onError(error);
    }
  }

  render() {
    if (this.state.hasError) {
      return null;
    }

    return this.props.children;
  }
}

/* =========================================================
   Main Component
   ========================================================= */
export default function ProductMockup() {
  const sceneRef = useRef(null);

  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(max-width: 720px)").matches,
  );
  const [webGLAvailable, setWebGLAvailable] = useState(null);
  const [showSpline, setShowSpline] = useState(false);
  const [failed, setFailed] = useState(false);

  /* Keep the mobile landing preview independent of WebGL. */
  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 720px)");
    const updateIsMobile = (event) => setIsMobile(event.matches);
    mediaQuery.addEventListener("change", updateIsMobile);
    return () => mediaQuery.removeEventListener("change", updateIsMobile);
  }, []);

  useEffect(() => {
    if (isMobile) {
      setFailed(false);
      setWebGLAvailable(null);
      setShowSpline(false);
      return undefined;
    }

    let mounted = true;
    const available = checkWebGL();
    setWebGLAvailable(available);
    setFailed(false);

    if (!available) {
      setFailed(true);
      return () => { mounted = false; };
    }

    /* Let the page settle before initializing the 3D scene. */
    const timer = setTimeout(() => {
      if (mounted) setShowSpline(true);
    }, 300);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [isMobile]);

  /* -------------------------------------------------------
     Retry
     ------------------------------------------------------- */
  const retrySpline = () => {
    setFailed(false);
    setShowSpline(false);

    /*
     * Give Chrome time to release the previous WebGL
     * resources before creating another Spline instance.
     */
    setTimeout(() => {
      const available = checkWebGL();

      if (available) {
        setWebGLAvailable(true);
        setShowSpline(true);
      } else {
        setWebGLAvailable(false);
        setFailed(true);
      }
    }, 1000);
  };

  /* -------------------------------------------------------
     Spline error
     ------------------------------------------------------- */
  const handleSplineError = (error) => {
    console.error("Spline failed:", error);

    setShowSpline(false);
    setFailed(true);
  };

  return (
    <section className="mockup-section container" id="demo">
      <div
        className="mockup-frame__scene"
        ref={sceneRef}
      >
        {isMobile ? (
          <div className="mockup-frame__mobile-preview" role="img" aria-label="Preview of a portfolio website on a phone">
            <div className="mockup-mobile-browser">
              <div className="mockup-mobile-browser__top"><span /><span /><span /></div>
              <div className="mockup-mobile-page">
                <div className="mockup-mobile-page__nav"><b>PORTFOLIO</b><span>MENU</span></div>
                <div className="mockup-mobile-page__hero">
                  <span>DESIGNER · DEVELOPER</span>
                  <strong>Make your<br />work matter.</strong>
                  <i />
                </div>
                <div className="mockup-mobile-page__work"><b>Selected work</b><div><i /><i /><i /></div></div>
              </div>
            </div>
            <span className="mockup-mobile-caption">A portfolio that fits every screen</span>
          </div>
        ) : (
          <>
        {/* WebGL check */}
        {webGLAvailable === null && <SplineLoading />}

        {/* Browser cannot create WebGL */}
        {failed && (
          <SplineFallback retry={retrySpline} />
        )}

        {/* Spline */}
        {!failed &&
          webGLAvailable &&
          showSpline && (
            <SplineErrorBoundary onError={handleSplineError}>
              <Suspense fallback={<SplineLoading />}>
                <Spline
                  scene={SPLINE_SCENE}
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "block",
                  }}
                />
              </Suspense>
            </SplineErrorBoundary>
          )}
          </>
        )}

        {/* Spline attribution cover */}
        {!isMobile && <div className="mockup-frame__badge-cover" />}
      </div>
    </section>
  );
}
