import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import OpenSeadragon from 'openseadragon';
import flapImage from './front_flapper.jpg';

function OpenSeadragonDemo() {
  // Flip animation state
  const [flipAngle, setFlipAngle] = useState(0);
  const viewerRef = useRef(null);
  const viewerElementRef = useRef(null);
  const flapOverlayRef = useRef(null);
  const flapElementRef = useRef(null);
  const viewerWrapperRef = useRef(null);
  const fadeInElementRef = useRef(null);

  // Canvas dimensions (Yale image dimensions)
  const CANVAS_W = 4696;
  const CANVAS_H = 4752;

  // Fade-in image position offset (adjust this to move the fade-in image)
  // Negative = left, Positive = right, in multiples of flap width
  const FADE_IN_OFFSET_X = -.8; // -1.5 = 1.5x flap width to the left
  const FADE_IN_OFFSET_Y = .0275;    // 0 = same vertical position as flap

  // Initial flap configuration from manifest
  const initialConfig = {
    circle: {
      cx: 2891.9867679067324,
      cy: 2351.4801195622176,
      r: 861.1776812027447
    },
    hinge: {
      p1: { x: 2198.918066611849, y: 1927.2436391397318 },
      p2: { x: 2203.1184188900656, y: 2855.523386489034 }
    }
  };

  // Flap configuration state (can be adjusted)
  const [flapConfig, setFlapConfig] = useState(initialConfig);

  // Reset to initial configuration
  const resetConfig = () => {
    setFlapConfig(initialConfig);
  };

  // Calculate bounding box from circle
  const flapRegion = useMemo(() => ({
    x: flapConfig.circle.cx - flapConfig.circle.r,
    y: flapConfig.circle.cy - flapConfig.circle.r,
    width: flapConfig.circle.r * 2,
    height: flapConfig.circle.r * 2
  }), [flapConfig.circle.cx, flapConfig.circle.cy, flapConfig.circle.r]);

  // Calculate fade-in region (offset to the left where opened flap would be)
  const fadeInRegion = useMemo(() => ({
    x: flapRegion.x + flapRegion.width * FADE_IN_OFFSET_X,
    y: flapRegion.y + flapRegion.height * FADE_IN_OFFSET_Y,
    width: flapRegion.width,
    height: flapRegion.height
  }), [flapRegion]);

  // IIIF Image URLs
  const backgroundImageUrl = 'https://collections.library.yale.edu/iiif/2/16595951/2031,1490,1722,1722/full/0/default.jpg'; // Revealed when flap opens
  const flapImageUrl = flapImage; // The flap itself
  const fadeInImageUrl = 'https://collections.library.yale.edu/iiif/2/16595951/642,1551,1722,1722/full/0/default.jpg'; // Fades in after 90 degrees

  // Calculate opacity for fade-in image (0 at 90°, 1 at 180°)
  const fadeInOpacity = useMemo(() => {
    if (flipAngle <= 90) return 0;
    return (flipAngle - 90) / 90;
  }, [flipAngle]);

  // Calculate transform origin from hinge points
  const hingeX = (flapConfig.hinge.p1.x + flapConfig.hinge.p2.x) / 2;
  const hingeY = (flapConfig.hinge.p1.y + flapConfig.hinge.p2.y) / 2;
  const originX = ((hingeX - flapRegion.x) / flapRegion.width) * 100;
  const originY = ((hingeY - flapRegion.y) / flapRegion.height) * 100;

  // Keyboard nudging for flap position
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!viewerWrapperRef.current?.contains(document.activeElement)) return;
      
      const step = e.shiftKey ? 10 : 1;
      let updated = false;

      switch (e.key) {
        case 'ArrowLeft':
          setFlapConfig(prev => ({
            ...prev,
            circle: { ...prev.circle, cx: prev.circle.cx - step }
          }));
          updated = true;
          break;
        case 'ArrowRight':
          setFlapConfig(prev => ({
            ...prev,
            circle: { ...prev.circle, cx: prev.circle.cx + step }
          }));
          updated = true;
          break;
        case 'ArrowUp':
          setFlapConfig(prev => ({
            ...prev,
            circle: { ...prev.circle, cy: prev.circle.cy - step }
          }));
          updated = true;
          break;
        case 'ArrowDown':
          setFlapConfig(prev => ({
            ...prev,
            circle: { ...prev.circle, cy: prev.circle.cy + step }
          }));
          updated = true;
          break;
        case '+':
        case '=':
          setFlapConfig(prev => ({
            ...prev,
            circle: { ...prev.circle, r: prev.circle.r + step }
          }));
          updated = true;
          break;
        case '-':
        case '_':
          setFlapConfig(prev => ({
            ...prev,
            circle: { ...prev.circle, r: Math.max(1, prev.circle.r - step) }
          }));
          updated = true;
          break;
        default:
          break;
      }

      if (updated) {
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Update overlays when flap configuration changes
  useEffect(() => {
    if (!viewerRef.current) {
      return;
    }

    const viewer = viewerRef.current;
    const overlayX = flapRegion.x / CANVAS_W;
    const overlayY = flapRegion.y / CANVAS_H;
    const overlayWidth = flapRegion.width / CANVAS_W;
    const overlayHeight = flapRegion.height / CANVAS_H;

    const fadeInX = fadeInRegion.x / CANVAS_W;
    const fadeInY = fadeInRegion.y / CANVAS_H;
    const fadeInWidth = fadeInRegion.width / CANVAS_W;
    const fadeInHeight = fadeInRegion.height / CANVAS_H;

    // Update background overlay
    const bgOverlay = viewer.getOverlayById('background-overlay');
    if (bgOverlay) {
      viewer.updateOverlay('background-overlay', 
        new window.OpenSeadragon.Rect(overlayX, overlayY, overlayWidth, overlayHeight)
      );
    }

    // Update fade-in overlay (positioned to the left)
    const fadeInOverlay = viewer.getOverlayById('fade-in-overlay');
    if (fadeInOverlay) {
      viewer.updateOverlay('fade-in-overlay', 
        new window.OpenSeadragon.Rect(fadeInX, fadeInY, fadeInWidth, fadeInHeight)
      );
    }

    // Update flap overlay
    const flapOverlay = viewer.getOverlayById('flap-overlay');
    if (flapOverlay) {
      viewer.updateOverlay('flap-overlay', 
        new window.OpenSeadragon.Rect(overlayX, overlayY, overlayWidth, overlayHeight)
      );
    }
  }, [flapRegion, fadeInRegion, CANVAS_W, CANVAS_H]);

  // Initialize OpenSeadragon viewer
  useEffect(() => {
    if (!viewerElementRef.current || viewerRef.current) return;
    
    const viewer = OpenSeadragon({
      element: viewerElementRef.current,
      tileSources: 'https://collections.library.yale.edu/iiif/2/16595950/info.json',
      showNavigator: false,
      showRotationControl: true,
      gestureSettingsMouse: {
        clickToZoom: false
      },
      defaultZoomLevel: 0,
      minZoomLevel: 0.5,
      maxZoomLevel: 10,
      visibilityRatio: 0.8,
      constrainDuringPan: false,
      homeFillsViewer: false,
      prefixUrl: 'https://cdn.jsdelivr.net/npm/openseadragon@4.1/build/openseadragon/images/',
      overlays: [
        {
          id: 'background-overlay',
          element: document.getElementById('background-overlay'),
          location: new OpenSeadragon.Rect(
            (initialConfig.circle.cx - initialConfig.circle.r) / CANVAS_W,
            (initialConfig.circle.cy - initialConfig.circle.r) / CANVAS_H,
            (initialConfig.circle.r * 2) / CANVAS_W,
            (initialConfig.circle.r * 2) / CANVAS_H
          ),
          rotationMode: OpenSeadragon.OverlayRotationMode.EXACT
        },
        {
          id: 'fade-in-overlay',
          element: document.getElementById('fade-in-overlay'),
          location: new OpenSeadragon.Rect(
            (initialConfig.circle.cx - initialConfig.circle.r + initialConfig.circle.r * 2 * FADE_IN_OFFSET_X) / CANVAS_W,
            (initialConfig.circle.cy - initialConfig.circle.r + initialConfig.circle.r * 2 * FADE_IN_OFFSET_Y) / CANVAS_H,
            (initialConfig.circle.r * 2) / CANVAS_W,
            (initialConfig.circle.r * 2) / CANVAS_H
          ),
          rotationMode: OpenSeadragon.OverlayRotationMode.EXACT
        },
        {
          id: 'flap-overlay',
          element: document.getElementById('flap-overlay'),
          location: new OpenSeadragon.Rect(
            (initialConfig.circle.cx - initialConfig.circle.r) / CANVAS_W,
            (initialConfig.circle.cy - initialConfig.circle.r) / CANVAS_H,
            (initialConfig.circle.r * 2) / CANVAS_W,
            (initialConfig.circle.r * 2) / CANVAS_H
          ),
          rotationMode: OpenSeadragon.OverlayRotationMode.EXACT
        }
      ]
    });
    
    viewerRef.current = viewer;
    
    viewer.addHandler('open', () => {
      viewer.viewport.goHome(true);
    });
    
    return () => {
      if (viewerRef.current) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, [originX, originY, CANVAS_W, CANVAS_H, FADE_IN_OFFSET_X, FADE_IN_OFFSET_Y]);

  return (
    <div className="openseadragon-demo">
      {/* Hidden background overlay element - revealed as flap opens */}
      <div 
        id="background-overlay" 
        style={{ 
          display: 'none',
          width: '100%',
          height: '100%',
          position: 'relative',
          pointerEvents: 'none'
        }}
      >
        <img 
          src={backgroundImageUrl}
          alt="Background (revealed when open)"
          crossOrigin="anonymous"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            clipPath: 'circle(50% at 50% 50%)'
          }}
        />
      </div>

      {/* Fade-in overlay element - appears when angle exceeds 90° */}
      <div 
        id="fade-in-overlay"
        ref={fadeInElementRef}
        style={{ 
          display: 'none',
          width: '100%',
          height: '100%',
          position: 'relative',
          pointerEvents: 'none',
          opacity: fadeInOpacity,
          transition: 'opacity 150ms linear'
        }}
      >
        <img 
          src={fadeInImageUrl}
          alt="Fade-in image"
          crossOrigin="anonymous"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            clipPath: 'circle(50% at 50% 50%)'
          }}
        />
      </div>

      {/* Hidden flap overlay element - rotates to reveal background */}
      <div 
        id="flap-overlay" 
        ref={(el) => {
          if (el && !flapElementRef.current) {
            flapElementRef.current = el;
          }
        }}
        style={{ 
          display: 'none',
          width: '100%',
          height: '100%',
          position: 'relative',
          transformStyle: 'preserve-3d',
          pointerEvents: 'none'
        }}
      >
        <div 
          ref={(el) => {
            if (el && !flapOverlayRef.current) {
              flapOverlayRef.current = el;
            }
          }}
          className="flap-inner"
          style={{
            width: '100%',
            height: '100%',
            position: 'absolute',
            transformStyle: 'preserve-3d',
            transition: 'transform 150ms linear',
            transformOrigin: `${originX}% ${originY}%`,
            transform: `rotateY(${flipAngle}deg)`
          }}
        >
          <img 
            className="flap-front"
            src={flapImageUrl}
            alt="Flap"
            crossOrigin="anonymous"
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              clipPath: 'circle(50% at 50% 50%)',
              backfaceVisibility: 'hidden'
            }}
          />
        </div>
      </div>

      <header className="App-header">
        {/* <h1>OpenSeadragon + IIIF Fold-Flip Demo</h1> */}
        <p>Interactive circular flap with 3D flip animation</p>
      </header>

      <div className="demo-layout">
        <div className="viewer-and-controls">
          <div 
            ref={viewerWrapperRef}
            className="viewer-wrapper" 
            tabIndex={0}
            aria-label="OpenSeadragon viewer - focus to enable keyboard nudging"
          >
            <div 
              ref={viewerElementRef}
              className="openseadragon-viewer"
              style={{
                width: '100%',
                height: '100%'
              }}
            />
          </div>

          <div className="flip-controls">
            <h3>Flip Controls</h3>
            <label htmlFor="flip-angle">
              Angle: {flipAngle}° ({flipAngle === 0 ? 'Closed' : flipAngle === 180 ? 'Open' : 'Partial'})
            </label>
            <input 
              id="flip-angle"
              type="range" 
              min="0" 
              max="180" 
              value={flipAngle}
              onChange={(e) => setFlipAngle(Number(e.target.value))}
              step="1"
              aria-label="Rotation angle"
            />
            <div className="flip-ticks">
              <span>Closed (0°)</span>
              <span>Open (180°)</span>
            </div>

  
          </div>
        </div>

        {/* <div className="instructions">
          <strong>IIIF Images:</strong> This demo uses high-resolution images from Yale University Library. The flap rotates to reveal a background image underneath, with both overlays automatically zooming and panning with the main image.
        </div> */}
      </div>
    </div>
  );
}

export default OpenSeadragonDemo;
