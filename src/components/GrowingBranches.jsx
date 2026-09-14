import React, { useEffect, useState } from 'react';

const GrowingBranches = () => {
  const [grown, setGrown] = useState(false);
  const [fallingLeaves, setFallingLeaves] = useState([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setGrown(true);
    }, 200);

    // Periodically spawn falling leaves (maximum 20 on screen for rich foliage look!)
    const interval = setInterval(() => {
      setFallingLeaves((prev) => {
        const id = Date.now() + Math.random();
        const startX = Math.random() * 95;
        const duration = 6 + Math.random() * 5;
        const scale = 0.5 + Math.random() * 0.75;
        
        const colors = [
          'linear-gradient(135deg, #10b981 0%, #047857 100%)',
          'linear-gradient(135deg, #84cc16 0%, #4d7c0f 100%)',
          'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)',
          'linear-gradient(135deg, #eab308 0%, #a16207 100%)'
        ];
        const bg = colors[Math.floor(Math.random() * colors.length)];
        
        const cleanList = prev.filter((leaf) => leaf.expiresAt > Date.now());
        return [
          ...cleanList,
          { id, startX, duration, scale, bg, expiresAt: Date.now() + duration * 1000 }
        ];
      });
    }, 1200); // Shorter interval (1.2s) for dense foliage cascade

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="branches-overlay-container">
      {/* Left Growing Branch SVG (Dense with sprigs & leaves) */}
      <svg className="branch-svg left-branch" viewBox="0 0 200 800" fill="none" preserveAspectRatio="none">
        <path
          d="M10,-10 C70,180 10,320 95,480 C135,580 40,680 85,810"
          stroke="#059669"
          strokeWidth="6.5"
          strokeLinecap="round"
          filter="drop-shadow(0 4px 8px rgba(4, 120, 87, 0.25))"
          className={`branch-path ${grown ? 'grown' : ''}`}
        />
        {grown && (
          <>
            {/* Added more side sprigs for a fuller look */}
            <path d="M35,120 Q65,130 90,140" stroke="#047857" strokeWidth="3" fill="none" />
            <path d="M45,280 Q15,290 -15,300" stroke="#047857" strokeWidth="3" fill="none" />
            <path d="M58,410 Q95,420 115,430" stroke="#047857" strokeWidth="3" fill="none" />
            <path d="M60,530 Q30,550 -10,560" stroke="#047857" strokeWidth="3" fill="none" />
            <path d="M65,660 Q95,680 120,695" stroke="#047857" strokeWidth="3" fill="none" />

            {/* Static Leaf Nodes with realistic shapes, veins, and gradients */}
            {/* sprig 1 leaves */}
            <g className="leaf-node" transform="translate(86, 136)" style={{ filter: 'drop-shadow(0 3px 6px rgba(16, 185, 129, 0.4))' }}>
              <path d="M0,0 C12,-16 28,-16 40,0 C28,16 12,16 0,0 Z" fill="url(#leaf-grad-green)" />
              <path d="M0,0 L32,0" stroke="#065f46" strokeWidth="0.8" opacity="0.6" />
            </g>
            <g className="leaf-node" transform="translate(70, 125) rotate(-30)" style={{ filter: 'drop-shadow(0 3px 6px rgba(16, 185, 129, 0.4))' }}>
              <path d="M0,0 C12,-16 28,-16 40,0 C28,16 12,16 0,0 Z" fill="url(#leaf-grad-green)" />
            </g>

            {/* sprig 2 leaves */}
            <g className="leaf-node" transform="translate(25, 290) rotate(180)" style={{ filter: 'drop-shadow(0 3px 6px rgba(132, 204, 22, 0.4))' }}>
              <path d="M0,0 C12,-16 28,-16 40,0 C28,16 12,16 0,0 Z" fill="url(#leaf-grad-lime)" />
              <path d="M0,0 L32,0" stroke="#3f6212" strokeWidth="0.8" opacity="0.6" />
            </g>
            <g className="leaf-node" transform="translate(38, 298) rotate(150)" style={{ filter: 'drop-shadow(0 3px 6px rgba(132, 204, 22, 0.4))' }}>
              <path d="M0,0 C12,-16 28,-16 40,0 C28,16 12,16 0,0 Z" fill="url(#leaf-grad-lime)" />
            </g>

            {/* sprig 3 leaves */}
            <g className="leaf-node" transform="translate(108, 426) rotate(25)" style={{ filter: 'drop-shadow(0 3px 6px rgba(16, 185, 129, 0.4))' }}>
              <path d="M0,0 C12,-16 28,-16 40,0 C28,16 12,16 0,0 Z" fill="url(#leaf-grad-green)" />
              <path d="M0,0 L32,0" stroke="#065f46" strokeWidth="0.8" opacity="0.6" />
            </g>
            <g className="leaf-node" transform="translate(90, 415) rotate(-15)" style={{ filter: 'drop-shadow(0 3px 6px rgba(16, 185, 129, 0.4))' }}>
              <path d="M0,0 C12,-16 28,-16 40,0 C28,16 12,16 0,0 Z" fill="url(#leaf-grad-green)" />
            </g>

            {/* sprig 4 leaves */}
            <g className="leaf-node" transform="translate(15, 545) rotate(190)" style={{ filter: 'drop-shadow(0 3px 6px rgba(132, 204, 22, 0.4))' }}>
              <path d="M0,0 C12,-16 28,-16 40,0 C28,16 12,16 0,0 Z" fill="url(#leaf-grad-lime)" />
            </g>

            {/* sprig 5 leaves */}
            <g className="leaf-node" transform="translate(110, 685) rotate(35)" style={{ filter: 'drop-shadow(0 3px 6px rgba(16, 185, 129, 0.4))' }}>
              <path d="M0,0 C12,-16 28,-16 40,0 C28,16 12,16 0,0 Z" fill="url(#leaf-grad-green)" />
            </g>
          </>
        )}
        <defs>
          <linearGradient id="leaf-grad-green" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#047857" />
          </linearGradient>
          <linearGradient id="leaf-grad-lime" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a3e635" />
            <stop offset="100%" stopColor="#4d7c0f" />
          </linearGradient>
        </defs>
      </svg>

      {/* Right Growing Branch SVG (Equally dense) */}
      <svg className="branch-svg right-branch" viewBox="0 0 200 800" fill="none" preserveAspectRatio="none">
        <path
          d="M10,-10 C70,180 10,320 95,480 C135,580 40,680 85,810"
          stroke="#059669"
          strokeWidth="6.5"
          strokeLinecap="round"
          filter="drop-shadow(0 4px 8px rgba(4, 120, 87, 0.25))"
          className={`branch-path ${grown ? 'grown' : ''}`}
        />
        {grown && (
          <>
            {/* Added more side sprigs */}
            <path d="M35,120 Q65,130 90,140" stroke="#047857" strokeWidth="3" fill="none" />
            <path d="M45,280 Q15,290 -15,300" stroke="#047857" strokeWidth="3" fill="none" />
            <path d="M58,410 Q95,420 115,430" stroke="#047857" strokeWidth="3" fill="none" />
            <path d="M60,530 Q30,550 -10,560" stroke="#047857" strokeWidth="3" fill="none" />

            {/* Static Leaf Nodes */}
            <g className="leaf-node" transform="translate(86, 136)" style={{ filter: 'drop-shadow(0 3px 6px rgba(16, 185, 129, 0.4))' }}>
              <path d="M0,0 C12,-16 28,-16 40,0 C28,16 12,16 0,0 Z" fill="url(#leaf-grad-green)" />
            </g>
            <g className="leaf-node" transform="translate(70, 125) rotate(-30)" style={{ filter: 'drop-shadow(0 3px 6px rgba(16, 185, 129, 0.4))' }}>
              <path d="M0,0 C12,-16 28,-16 40,0 C28,16 12,16 0,0 Z" fill="url(#leaf-grad-green)" />
            </g>
            <g className="leaf-node" transform="translate(25, 290) rotate(180)" style={{ filter: 'drop-shadow(0 3px 6px rgba(132, 204, 22, 0.4))' }}>
              <path d="M0,0 C12,-16 28,-16 40,0 C28,16 12,16 0,0 Z" fill="url(#leaf-grad-lime)" />
            </g>
            <g className="leaf-node" transform="translate(108, 426) rotate(25)" style={{ filter: 'drop-shadow(0 3px 6px rgba(16, 185, 129, 0.4))' }}>
              <path d="M0,0 C12,-16 28,-16 40,0 C28,16 12,16 0,0 Z" fill="url(#leaf-grad-green)" />
            </g>
            <g className="leaf-node" transform="translate(15, 545) rotate(190)" style={{ filter: 'drop-shadow(0 3px 6px rgba(132, 204, 22, 0.4))' }}>
              <path d="M0,0 C12,-16 28,-16 40,0 C28,16 12,16 0,0 Z" fill="url(#leaf-grad-lime)" />
            </g>
          </>
        )}
      </svg>

      {/* 3D Fluttering Falling Leaves */}
      {fallingLeaves.map((leaf) => (
        <div
          key={leaf.id}
          className="falling-leaf-wrap-3d"
          style={{
            left: `${leaf.startX}%`,
            animationDuration: `${leaf.duration}s`,
            transform: `scale(${leaf.scale})`
          }}
        >
          <div
            className="leaf-body-3d"
            style={{
              background: leaf.bg,
              boxShadow: '0 4px 10px rgba(0,0,0,0.12)'
            }}
          >
            <div style={{ width: '100%', height: '1.5px', background: 'rgba(255,255,255,0.22)', position: 'absolute', top: '50%', transform: 'translateY(-50%)' }} />
          </div>
        </div>
      ))}

      <style>{`
        .branches-overlay-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          overflow: hidden;
          z-index: 2;
        }

        .branch-svg {
          position: absolute;
          top: 0;
          width: 150px;
          height: 100%;
        }

        .left-branch {
          left: 0;
        }

        .right-branch {
          right: 0;
          transform: scaleX(-1);
        }

        .branch-path {
          stroke-dasharray: 1000;
          stroke-dashoffset: 1000;
          transition: stroke-dashoffset 4.5s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .branch-path.grown {
          stroke-dashoffset: 0;
        }

        .leaf-node {
          cursor: pointer;
          pointer-events: auto;
          transform-origin: 0 0;
          transition: transform 0.2s ease-out;
        }

        .leaf-node:hover {
          animation: leafSwayFlutter 0.8s ease-in-out infinite alternate;
        }

        @keyframes leafSwayFlutter {
          0% { transform: rotate(-10deg) scale(1.05); }
          100% { transform: rotate(15deg) scale(1.05); }
        }

        /* 3D Realistic Falling Leaf Wrapper */
        .falling-leaf-wrap-3d {
          position: absolute;
          top: -40px;
          pointer-events: none;
          z-index: 2;
          animation: leafFall3D linear forwards;
        }

        /* Leaf 3D Body shape with curvature and shadows */
        .leaf-body-3d {
          position: relative;
          width: 32px;
          height: 18px;
          border-radius: 20px 2px 20px 2px;
          animation: leafRotate3D 3.5s ease-in-out infinite alternate;
        }

        /* 3D Drift timeline */
        @keyframes leafFall3D {
          0% {
            top: -40px;
            margin-left: 0px;
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            top: 105vh;
            margin-left: 120px;
            opacity: 0;
          }
        }

        /* Realistic rotation along multiple axes */
        @keyframes leafRotate3D {
          0% {
            transform: rotateX(0deg) rotateY(0deg) rotateZ(-20deg);
          }
          50% {
            transform: rotateX(45deg) rotateY(180deg) rotateZ(30deg);
          }
          100% {
            transform: rotateX(-45deg) rotateY(360deg) rotateZ(-15deg);
          }
        }
      `}</style>
    </div>
  );
};

export default GrowingBranches;