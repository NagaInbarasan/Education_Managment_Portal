import React from 'react';

const SkyBackground = ({ theme = 'light', weather = 'sunny', children }) => {
  return (
    <div className={`sky-container ${theme}-sky weather-${weather}`}>
      
      {/* 12 Drifting Background Clouds (Z-Index 1: Floating BEHIND all content cards) */}
      <div className="clouds-layer">
        <div className="cloud cloud-1" />
        <div className="cloud cloud-2" />
        <div className="cloud cloud-3" />
        <div className="cloud cloud-4" />
        <div className="cloud cloud-5" />
        <div className="cloud cloud-6" />
        <div className="cloud cloud-7" />
        <div className="cloud cloud-8" />
        <div className="cloud cloud-9" />
        <div className="cloud cloud-10" />
        <div className="cloud cloud-11" />
        <div className="cloud cloud-12" />
      </div>
      
      {/* Celestial Sun/Moon Group (Z-Index 2: Behind content) */}
      <div className="celestial-group" style={{ zIndex: 2 }}>
        <div className="celestial sun-glow">
          <svg viewBox="0 0 100 100" className="sun-svg">
            <circle cx="50" cy="50" r="23" fill="#facc15" />
            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, idx) => (
              <line key={idx} x1="50" y1="4" x2="50" y2="18" stroke="#facc15" strokeWidth="5" strokeLinecap="round" transform={`rotate(${angle} 50 50)`} />
            ))}
          </svg>
        </div>
        <div className="celestial moon-glow">
          <svg viewBox="0 0 100 100" className="moon-svg">
            <path d="M50,15 A35,35 0 1,0 85,50 A30,30 0 1,1 50,15 Z" fill="#e2e8f0" />
          </svg>
        </div>
      </div>
      
      {/* Stars */}
      {theme === 'dark' && (
        <div className="stars-layer" style={{ zIndex: 2 }}>
          <div className="star star-s1" style={{ top: '15%', left: '10%', animationDelay: '0s' }} />
          <div className="star star-s2" style={{ top: '25%', left: '40%', animationDelay: '0.5s' }} />
          <div className="star star-s3" style={{ top: '12%', left: '80%', animationDelay: '1.2s' }} />
          <div className="star star-s1" style={{ top: '40%', left: '88%', animationDelay: '0.8s' }} />
          <div className="star star-s2" style={{ top: '65%', left: '15%', animationDelay: '1.5s' }} />
          <div className="star star-s3" style={{ top: '75%', left: '75%', animationDelay: '0.3s' }} />
        </div>
      )}
      
      {/* Rain Layer */}
      {weather === 'rainy' && (
        <div className="rain-layer" style={{ zIndex: 2 }}>
          <div className="rain-drop d-1" />
          <div className="rain-drop d-2" />
          <div className="rain-drop d-3" />
          <div className="rain-drop d-4" />
          <div className="rain-drop d-5" />
          <div className="rain-drop d-6" />
        </div>
      )}

      {/* Storm Layer */}
      {weather === 'stormy' && (
        <div className="storm-layer" style={{ zIndex: 2 }}>
          <div className="lightning-flash" />
          <div className="rain-drop d-1" />
          <div className="rain-drop d-2" />
          <div className="rain-drop d-3" />
          <div className="rain-drop d-4" />
        </div>
      )}

      {/* Snow Layer */}
      {weather === 'snowy' && (
        <div className="snow-layer" style={{ zIndex: 2 }}>
          <div className="snowflake s-1" />
          <div className="snowflake s-2" />
          <div className="snowflake s-3" />
          <div className="snowflake s-4" />
          <div className="snowflake s-5" />
        </div>
      )}

      {/* Main Page Content (Z-Index 5: Above background clouds & sun) */}
      <div className="sky-content" style={{ zIndex: 5, position: 'relative' }}>{children}</div>
      
      <style>{`
        .sky-container {
          position: relative;
          width: 100%;
          min-height: 100vh;
          overflow: hidden;
          transition: background 1.2s ease;
        }

        .light-sky {
          background: linear-gradient(180deg, #bae6fd 0%, #e0f2fe 100%) !important;
        }

        .dark-sky {
          background: linear-gradient(180deg, #090d16 0%, #1e1b4b 100%);
        }
        .dark-sky.weather-cloudy {
          background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%);
        }
        .dark-sky.weather-rainy, .dark-sky.weather-stormy {
          background: linear-gradient(180deg, #020617 0%, #0f172a 100%);
        }

        .celestial-group {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }

        .celestial {
          position: absolute;
          top: 75px;
          right: 60px;
          width: 140px;
          height: 140px;
          transition: all 1.5s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .sun-glow {
          animation: rotateCelestial 45s linear infinite;
        }
        .moon-glow {
          animation: floatMoon 8s ease-in-out infinite alternate;
        }

        .light-sky .sun-glow {
          opacity: 0.9;
          transform: translate(0, 0) scale(1);
          filter: drop-shadow(0 0 35px #f59e0b);
        }
        .dark-sky .sun-glow {
          opacity: 0;
          transform: translate(140px, -140px) scale(0.3);
        }

        .light-sky .moon-glow {
          opacity: 0;
          transform: translate(140px, -140px) scale(0.3);
        }
        .dark-sky .moon-glow {
          opacity: 0.9;
          transform: translate(0, 0) scale(1);
          filter: drop-shadow(0 0 32px rgba(226, 232, 240, 0.85));
        }

        .sun-svg, .moon-svg {
          width: 100%;
          height: 100%;
        }

        @keyframes rotateCelestial {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes floatMoon {
          0% { transform: translateY(0) rotate(-5deg); }
          100% { transform: translateY(-10px) rotate(5deg); }
        }

        .clouds-layer {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 65%;
          pointer-events: none;
          z-index: 1; /* Strictly behind all content cards & text */
          opacity: 0.55; /* Soft background cloud opacity so text is crystal clear */
          transition: opacity 0.5s ease;
        }

        .cloud {
          position: absolute;
          background: rgba(255, 255, 255, 0.98) !important;
          border-radius: 9999px;
          filter: blur(4px);
          box-shadow: 0 10px 25px rgba(255, 255, 255, 0.4);
          animation: driftClouds 60s linear infinite;
          transition: background 1s ease;
        }
        
        .weather-cloudy .cloud, .weather-rainy .cloud, .weather-stormy .cloud {
          background: rgba(240, 245, 255, 0.98) !important;
        }
        .dark-sky .cloud {
          background: rgba(148, 163, 184, 0.2) !important;
          box-shadow: none;
        }

        .cloud::before, .cloud::after {
          content: '';
          position: absolute;
          background: inherit;
          border-radius: 50%;
        }

        .cloud-1 {
          width: 240px;
          height: 70px;
          top: 30px;
          animation-duration: 65s;
          animation-delay: -10s;
        }
        .cloud-1::before { width: 110px; height: 110px; top: -55px; left: 40px; }
        .cloud-1::after { width: 90px; height: 90px; top: -45px; left: 120px; }

        .cloud-2 {
          width: 320px;
          height: 95px;
          top: 120px;
          animation-duration: 85s;
          animation-delay: -35s;
          opacity: 0.9;
        }
        .cloud-2::before { width: 140px; height: 140px; top: -70px; left: 50px; }
        .cloud-2::after { width: 120px; height: 120px; top: -55px; left: 150px; }

        .cloud-3 {
          width: 200px;
          height: 60px;
          top: 75px;
          animation-duration: 55s;
          animation-delay: -5s;
        }
        .cloud-3::before { width: 90px; height: 90px; top: -45px; left: 30px; }
        .cloud-3::after { width: 70px; height: 70px; top: -35px; left: 90px; }

        .cloud-4 {
          width: 280px;
          height: 80px;
          top: 20px;
          animation-duration: 105s;
          animation-delay: -60s;
          opacity: 0.8;
        }
        .cloud-4::before { width: 120px; height: 120px; top: -60px; left: 45px; }
        .cloud-4::after { width: 100px; height: 100px; top: -50px; left: 130px; }

        .cloud-5 {
          width: 220px;
          height: 65px;
          top: 160px;
          animation-duration: 75s;
          animation-delay: -20s;
          opacity: 0.85;
        }
        .cloud-5::before { width: 95px; height: 95px; top: -48px; left: 35px; }
        .cloud-5::after { width: 80px; height: 80px; top: -40px; left: 105px; }

        .cloud-6 {
          width: 180px;
          height: 55px;
          top: 60px;
          animation-duration: 50s;
          animation-delay: -40s;
          opacity: 0.85;
        }
        .cloud-6::before { width: 80px; height: 80px; top: -40px; left: 30px; }
        .cloud-6::after { width: 65px; height: 65px; top: -30px; left: 85px; }

        .cloud-7 {
          width: 210px;
          height: 62px;
          top: 210px;
          animation-duration: 70s;
          animation-delay: -15s;
          opacity: 0.88;
        }
        .cloud-7::before { width: 90px; height: 90px; top: -45px; left: 30px; }
        .cloud-7::after { width: 75px; height: 75px; top: -35px; left: 95px; }

        .cloud-8 {
          width: 290px;
          height: 85px;
          top: 260px;
          animation-duration: 90s;
          animation-delay: -45s;
          opacity: 0.82;
        }
        .cloud-8::before { width: 130px; height: 130px; top: -65px; left: 45px; }
        .cloud-8::after { width: 110px; height: 110px; top: -50px; left: 140px; }

        .cloud-9 {
          width: 190px;
          height: 58px;
          top: 310px;
          animation-duration: 60s;
          animation-delay: -30s;
          opacity: 0.9;
        }
        .cloud-9::before { width: 85px; height: 85px; top: -42px; left: 25px; }
        .cloud-9::after { width: 70px; height: 70px; top: -32px; left: 85px; }

        .cloud-10 {
          width: 250px;
          height: 75px;
          top: 180px;
          animation-duration: 80s;
          animation-delay: -50s;
          opacity: 0.85;
        }
        .cloud-10::before { width: 105px; height: 105px; top: -52px; left: 35px; }
        .cloud-10::after { width: 90px; height: 90px; top: -42px; left: 115px; }

        .cloud-11 {
          width: 160px;
          height: 50px;
          top: 350px;
          animation-duration: 48s;
          animation-delay: -12s;
          opacity: 0.78;
        }
        .cloud-11::before { width: 70px; height: 70px; top: -35px; left: 20px; }
        .cloud-11::after { width: 60px; height: 60px; top: -28px; left: 75px; }

        .cloud-12 {
          width: 270px;
          height: 78px;
          top: 100px;
          animation-duration: 100s;
          animation-delay: -25s;
          opacity: 0.86;
        }
        .cloud-12::before { width: 115px; height: 115px; top: -58px; left: 40px; }
        .cloud-12::after { width: 95px; height: 95px; top: -46px; left: 125px; }

        @keyframes driftClouds {
          0% { transform: translateX(-350px); }
          100% { transform: translateX(100vw); }
        }

        .stars-layer {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }

        .star {
          position: absolute;
          width: 3px;
          height: 3px;
          background: #ffffff;
          border-radius: 50%;
          box-shadow: 0 0 6px #ffffff;
        }

        .star-s1 { animation: starTwinkle 1.8s ease-in-out infinite alternate; }
        .star-s2 { animation: starTwinkle 2.5s ease-in-out infinite alternate; }
        .star-s3 { animation: starTwinkle 3.2s ease-in-out infinite alternate; }

        @keyframes starTwinkle {
          0% { opacity: 0.2; transform: scale(0.8); }
          100% { opacity: 1; transform: scale(1.2); }
        }

        .rain-layer, .storm-layer, .snow-layer {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          overflow: hidden;
        }

        .rain-drop {
          position: absolute;
          background: linear-gradient(transparent, rgba(156, 163, 175, 0.5));
          width: 2px;
          height: 45px;
          opacity: 0.8;
          animation: rainFall 1.1s linear infinite;
        }
        .d-1 { left: 15%; top: -50px; animation-delay: 0s; animation-duration: 0.85s; }
        .d-2 { left: 35%; top: -50px; animation-delay: 0.15s; animation-duration: 1.05s; }
        .d-3 { left: 55%; top: -50px; animation-delay: 0.35s; animation-duration: 0.95s; }
        .d-4 { left: 75%; top: -50px; animation-delay: 0.05s; animation-duration: 1.15s; }
        .d-5 { left: 90%; top: -50px; animation-delay: 0.25s; animation-duration: 0.75s; }
        .d-6 { left: 45%; top: -50px; animation-delay: 0.45s; animation-duration: 1.05s; }

        @keyframes rainFall {
          0% { transform: translateY(0) rotate(12deg); }
          100% { transform: translateY(105vh) rotate(12deg); }
        }

        .lightning-flash {
          position: absolute;
          width: 100%;
          height: 100%;
          background: rgba(240, 249, 255, 0.85);
          opacity: 0;
          animation: flashLightning 5s ease-out infinite;
        }
        @keyframes flashLightning {
          0%, 93%, 96%, 100% { opacity: 0; }
          94% { opacity: 0.9; }
          95% { opacity: 0.2; }
          97% { opacity: 0.7; }
          98% { opacity: 0.1; }
        }

        .snowflake {
          position: absolute;
          background: #ffffff;
          border-radius: 50%;
          opacity: 0.85;
          animation: snowDrift 4.5s linear infinite;
        }
        .s-1 { width: 6px; height: 6px; left: 10%; top: -10px; animation-duration: 3.5s; }
        .s-2 { width: 8px; height: 8px; left: 30%; top: -10px; animation-duration: 4.8s; }
        .s-3 { width: 5px; height: 5px; left: 50%; top: -10px; animation-duration: 4.0s; }
        .s-4 { width: 7px; height: 7px; left: 70%; top: -10px; animation-duration: 5.2s; }
        .s-5 { width: 6px; height: 6px; left: 90%; top: -10px; animation-duration: 3.9s; }

        @keyframes snowDrift {
          0% { transform: translate(0, 0) rotate(0deg); }
          50% { transform: translate(15px, 50vh) rotate(180deg); }
          100% { transform: translate(-10px, 105vh) rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default SkyBackground;