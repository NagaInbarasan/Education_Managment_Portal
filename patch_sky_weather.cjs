const fs = require('fs');
const filePath = 'dist/assets/index-LlaHGMXd.js';
let content = fs.readFileSync(filePath, 'utf8');

const startMarker = 'rt=({theme:e=`light`,children:t})=>';
const endMarker = ',it=({setCurrentPage:e';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
  console.error('ERROR: Could not find component markers in the JavaScript bundle.');
  console.log('startIndex:', startIndex, 'endIndex:', endIndex);
  process.exit(1);
}

console.log('Found component rt at index range:', startIndex, 'to', endIndex);

const newComponentCode = `rt=({theme:e="light",children:t})=>{
  const [weather, setWeather] = (0,_.useState)("sunny");
  const [temp, setTemp] = (0,_.useState)("");
  (0,_.useEffect)(()=>{
    fetch("https://wttr.in/?format=j1")
      .then(res => res.json())
      .then(data => {
        const condition = data.current_condition[0];
        const desc = condition.weatherDesc[0].value.toLowerCase();
        const tVal = condition.temp_C;
        setTemp(tVal + "°C");
        if (desc.includes("rain") || desc.includes("shower") || desc.includes("drizzle")) {
          setWeather("rainy");
        } else if (desc.includes("snow") || desc.includes("ice") || desc.includes("freeze")) {
          setWeather("snowy");
        } else if (desc.includes("thunder") || desc.includes("storm")) {
          setWeather("stormy");
        } else if (desc.includes("cloud") || desc.includes("overcast") || desc.includes("mist") || desc.includes("fog")) {
          setWeather("cloudy");
        } else {
          setWeather("sunny");
        }
      })
      .catch(() => {});
  }, []);

  return (0,A.jsxs)("div",{
    className:\`sky-container \${e}-sky weather-\${weather}\`,
    children:[
      (0,A.jsxs)("div",{
        className:"weather-widget no-print",
        style:{
          position:"absolute",
          top:"16px",
          left:"16px",
          zIndex:100,
          display:"flex",
          alignItems:"center",
          gap:"8px",
          padding:"6px 12px",
          borderRadius:"20px",
          background:"rgba(255,255,255,0.08)",
          backdropFilter:"blur(8px)",
          border:"1px solid rgba(255,255,255,0.12)",
          fontSize:"0.78rem",
          color:"var(--text-muted)",
          fontWeight:600,
          letterSpacing:"0.03em"
        },
        children:[
          (0,A.jsx)("span",{style:{marginRight:"4px"},children:weather==="sunny"?"☀️":weather==="cloudy"?"☁️":weather==="rainy"?"🌧️":weather==="snowy"?"❄️":"⛈️"}),
          (0,A.jsxs)("span",{children:["Weather: ", weather.charAt(0).toUpperCase() + weather.slice(1), temp ? \` (\${temp})\` : ""]})
        ]
      }),
      (0,A.jsxs)("div",{
        className:"clouds-layer",
        children:[
          (0,A.jsx)("div",{className:"cloud cloud-1"}),
          (0,A.jsx)("div",{className:"cloud cloud-2"}),
          (0,A.jsx)("div",{className:"cloud cloud-3"}),
          (0,A.jsx)("div",{className:"cloud cloud-4"}),
          (weather!=="sunny") && (0,A.jsxs)(A.Fragment,{children:[
            (0,A.jsx)("div",{className:"cloud cloud-5"}),
            (0,A.jsx)("div",{className:"cloud cloud-6"})
          ]})
        ]
      }),
      (0,A.jsxs)("div",{
        className:"celestial-group",
        children:[
          (0,A.jsx)("div",{
            className:"celestial sun-glow",
            children:(0,A.jsxs)("svg",{
              viewBox:"0 0 100 100",
              className:"sun-svg",
              children:[
                (0,A.jsx)("circle",{cx:"50",cy:"50",r:"22",fill:"#facc15"}),
                [0,45,90,135,180,225,270,315].map((e,t)=>(0,A.jsx)("line",{x1:"50",y1:"5",x2:"50",y2:"18",stroke:"#facc15",strokeWidth:"4",strokeLinecap:"round",transform:\`rotate(\${e} 50 50)\`},t))
              ]
            })
          }),
          (0,A.jsx)("div",{
            className:"celestial moon-glow",
            children:(0,A.jsx)("svg",{
              viewBox:"0 0 100 100",
              className:"moon-svg",
              children:(0,A.jsx)("path",{
                d:"M50,15 A35,35 0 1,0 85,50 A30,30 0 1,1 50,15 Z",
                fill:"#e2e8f0"
              })
            })
          })
        ]
      }),
      e==="dark"&&(0,A.jsxs)("div",{
        className:"stars-layer",
        children:[
          (0,A.jsx)("div",{className:"star star-s1",style:{top:"15%",left:"10%",animationDelay:"0s"}}),
          (0,A.jsx)("div",{className:"star star-s2",style:{top:"25%",left:"40%",animationDelay:"0.5s"}}),
          (0,A.jsx)("div",{className:"star star-s3",style:{top:"12%",left:"80%",animationDelay:"1.2s"}}),
          (0,A.jsx)("div",{className:"star star-s1",style:{top:"40%",left:"88%",animationDelay:"0.8s"}}),
          (0,A.jsx)("div",{className:"star star-s2",style:{top:"65%",left:"15%",animationDelay:"1.5s"}}),
          (0,A.jsx)("div",{className:"star star-s3",style:{top:"75%",left:"75%",animationDelay:"0.3s"}})
        ]
      }),
      weather==="rainy"&&(0,A.jsxs)("div",{
        className:"rain-layer",
        children:[
          (0,A.jsx)("div",{className:"rain-drop d-1"}),
          (0,A.jsx)("div",{className:"rain-drop d-2"}),
          (0,A.jsx)("div",{className:"rain-drop d-3"}),
          (0,A.jsx)("div",{className:"rain-drop d-4"}),
          (0,A.jsx)("div",{className:"rain-drop d-5"}),
          (0,A.jsx)("div",{className:"rain-drop d-6"})
        ]
      }),
      weather==="stormy"&&(0,A.jsxs)("div",{
        className:"storm-layer",
        children:[
          (0,A.jsx)("div",{className:"lightning-flash"}),
          (0,A.jsx)("div",{className:"rain-drop d-1"}),
          (0,A.jsx)("div",{className:"rain-drop d-2"}),
          (0,A.jsx)("div",{className:"rain-drop d-3"}),
          (0,A.jsx)("div",{className:"rain-drop d-4"})
        ]
      }),
      weather==="snowy"&&(0,A.jsxs)("div",{
        className:"snow-layer",
        children:[
          (0,A.jsx)("div",{className:"snowflake s-1"}),
          (0,A.jsx)("div",{className:"snowflake s-2"}),
          (0,A.jsx)("div",{className:"snowflake s-3"}),
          (0,A.jsx)("div",{className:"snowflake s-4"}),
          (0,A.jsx)("div",{className:"snowflake s-5"})
        ]
      }),
      (0,A.jsx)("div",{className:"sky-content",children:t}),
      (0,A.jsx)("style",{
        children:\`
          .sky-container {
            position: relative;
            width: 100%;
            min-height: 100%;
            overflow: hidden;
            transition: background 1.2s ease;
            border-radius: var(--radius-xl);
          }

          .light-sky {
            background: linear-gradient(180deg, #bae6fd 0%, #f0f9ff 100%);
          }
          .light-sky.weather-cloudy {
            background: linear-gradient(180deg, #94a3b8 0%, #cbd5e1 100%);
          }
          .light-sky.weather-rainy, .light-sky.weather-stormy {
            background: linear-gradient(180deg, #64748b 0%, #94a3b8 100%);
          }
          .light-sky.weather-snowy {
            background: linear-gradient(180deg, #cbd5e1 0%, #f1f5f9 100%);
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

          .sky-content {
            position: relative;
            z-index: 5;
            width: 100%;
            height: 100%;
          }

          .celestial-group {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 1;
          }

          .celestial {
            position: absolute;
            top: 30px;
            right: 40px;
            width: 70px;
            height: 70px;
            transition: all 1.5s cubic-bezier(0.4, 0, 0.2, 1);
          }

          .sun-glow {
            animation: rotateCelestial 45s linear infinite;
          }
          .moon-glow {
            animation: floatMoon 8s ease-in-out infinite alternate;
          }

          .light-sky .sun-glow {
            opacity: 1;
            transform: translate(0, 0) scale(1);
            filter: drop-shadow(0 0 20px #eab308);
          }
          .dark-sky .sun-glow {
            opacity: 0;
            transform: translate(140px, 140px) scale(0.4);
          }

          .light-sky .moon-glow {
            opacity: 0;
            transform: translate(140px, 140px) scale(0.4);
          }
          .dark-sky .moon-glow {
            opacity: 1;
            transform: translate(0, 0) scale(1);
            filter: drop-shadow(0 0 25px rgba(226, 232, 240, 0.8));
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
            height: 50%;
            pointer-events: none;
            z-index: 2;
            opacity: 0.7;
            transition: opacity 0.5s ease;
          }
          
          .weather-cloudy .clouds-layer, .weather-rainy .clouds-layer, .weather-stormy .clouds-layer {
            opacity: 0.95;
          }

          .cloud {
            position: absolute;
            background: rgba(255, 255, 255, 0.85);
            border-radius: 9999px;
            filter: blur(6px);
            animation: driftClouds 60s linear infinite;
            transition: background 1s ease;
          }
          
          .weather-cloudy .cloud, .weather-rainy .cloud, .weather-stormy .cloud {
            background: rgba(186, 200, 215, 0.95);
          }
          .dark-sky .cloud {
            background: rgba(30, 41, 59, 0.6);
          }
          .dark-sky.weather-cloudy .cloud, .dark-sky.weather-rainy .cloud {
            background: rgba(15, 23, 42, 0.8);
          }

          .cloud::before, .cloud::after {
            content: '';
            position: absolute;
            background: inherit;
            border-radius: 50%;
            transition: background 1s ease;
          }

          .cloud-1 {
            width: 130px;
            height: 38px;
            top: 40px;
            animation-duration: 65s;
            animation-delay: -10s;
          }
          .cloud-1::before { width: 55px; height: 55px; top: -22px; left: 22px; }
          .cloud-1::after { width: 45px; height: 45px; top: -16px; left: 65px; }

          .cloud-2 {
            width: 190px;
            height: 48px;
            top: 110px;
            animation-duration: 85s;
            animation-delay: -35s;
            opacity: 0.6;
          }
          .cloud-2::before { width: 75px; height: 75px; top: -32px; left: 32px; }
          .cloud-2::after { width: 65px; height: 65px; top: -22px; left: 85px; }

          .cloud-3 {
            width: 100px;
            height: 30px;
            top: 75px;
            animation-duration: 55s;
            animation-delay: -5s;
          }
          .cloud-3::before { width: 42px; height: 42px; top: -16px; left: 16px; }
          .cloud-3::after { width: 32px; height: 32px; top: -11px; left: 48px; }

          .cloud-4 {
            width: 160px;
            height: 42px;
            top: 20px;
            animation-duration: 105s;
            animation-delay: -60s;
            opacity: 0.45;
          }
          .cloud-4::before { width: 62px; height: 62px; top: -26px; left: 26px; }
          .cloud-4::after { width: 52px; height: 52px; top: -19px; left: 72px; }

          .cloud-5 {
            width: 140px;
            height: 38px;
            top: 140px;
            animation-duration: 75s;
            animation-delay: -20s;
            opacity: 0.55;
          }
          .cloud-5::before { width: 55px; height: 55px; top: -20px; left: 25px; }
          .cloud-5::after { width: 45px; height: 45px; top: -15px; left: 68px; }

          .cloud-6 {
            width: 110px;
            height: 32px;
            top: 60px;
            animation-duration: 50s;
            animation-delay: -40s;
            opacity: 0.65;
          }
          .cloud-6::before { width: 45px; height: 45px; top: -18px; left: 18px; }
          .cloud-6::after { width: 35px; height: 35px; top: -12px; left: 50px; }

          @keyframes driftClouds {
            0% { transform: translateX(-220px); }
            100% { transform: translateX(100vw); }
          }

          .stars-layer {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 1;
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
            z-index: 3;
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
        \`
      })
    ]
  });
}`;

const patchedContent = content.substring(0, startIndex) + newComponentCode + content.substring(endIndex);
fs.writeFileSync(filePath, patchedContent, 'utf8');
console.log('SkyBackground component patched with weather state and smooth sunset/moonrise animations successfully!');
