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

  const [webGLAvailable, setWebGLAvailable] = useState(null);
  const [showSpline, setShowSpline] = useState(false);
  const [failed, setFailed] = useState(false);

  /* -------------------------------------------------------
     Check WebGL once when component mounts
     ------------------------------------------------------- */
  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      const available = checkWebGL();

      if (!mounted) return;

      setWebGLAvailable(available);

      if (!available) {
        setFailed(true);
        return;
      }

      /*
       * Small delay prevents Spline from fighting with
       * other page resources during the initial render.
       */
      const timer = setTimeout(() => {
        if (mounted) {
          setShowSpline(true);
        }
      }, 300);

      return () => clearTimeout(timer);
    };

    initialize();

    return () => {
      mounted = false;
    };
  }, []);

  /* -------------------------------------------------------
     Block wheel / pinch interaction
     ------------------------------------------------------- */
  useEffect(() => {
    const node = sceneRef.current;

    if (!node) return;

    const blockWheel = (event) => {
      event.preventDefault();
      event.stopPropagation();
    };

    const blockPinch = (event) => {
      if (event.touches && event.touches.length > 1) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    node.addEventListener("wheel", blockWheel, {
      passive: false,
      capture: true,
    });

    node.addEventListener("touchmove", blockPinch, {
      passive: false,
      capture: true,
    });

    return () => {
      node.removeEventListener("wheel", blockWheel, true);
      node.removeEventListener("touchmove", blockPinch, true);
    };
  }, []);

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

        {/* Spline attribution cover */}
        <div className="mockup-frame__badge-cover" />
      </div>
    </section>
  );
}