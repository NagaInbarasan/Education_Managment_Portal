import React, { useRef, useEffect } from 'react';

const ClickSpark = ({
  children,
  sparkColor = 'var(--primary)', // uses palette color or defaults to primary accent
  sparkSize = 10,
  sparkRadius = 24,
  sparkCount = 8,
  duration = 400
}) => {
  const canvasRef = useRef(null);
  const sparksRef = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const now = Date.now();
      sparksRef.current = sparksRef.current.filter((s) => now - s.startTime < duration);

      sparksRef.current.forEach((s) => {
        const elapsed = now - s.startTime;
        const progress = elapsed / duration;
        
        // Easing out function
        const easeOutQuad = t => t * (2 - t);
        const easedProgress = easeOutQuad(progress);
        const currentRadius = sparkRadius * easedProgress;
        const alpha = 1 - progress;

        ctx.save();
        ctx.globalAlpha = alpha;

        for (let i = 0; i < sparkCount; i++) {
          const angle = s.startAngle + (i * (Math.PI * 2)) / sparkCount;
          
          // Draw standard spark dashes
          const xStart = s.x + Math.cos(angle) * (currentRadius * 0.6);
          const yStart = s.y + Math.sin(angle) * (currentRadius * 0.6);
          const xEnd = s.x + Math.cos(angle) * currentRadius;
          const yEnd = s.y + Math.sin(angle) * currentRadius;

          ctx.beginPath();
          ctx.moveTo(xStart, yStart);
          ctx.lineTo(xEnd, yEnd);
          ctx.strokeStyle = sparkColor;
          ctx.lineWidth = sparkSize * (1 - progress) * 0.35;
          ctx.lineCap = 'round';
          ctx.stroke();
        }
        ctx.restore();
      });

      animationFrameId = requestAnimationFrame(draw);
    };
    draw();

    const handleGlobalClick = (e) => {
      const x = e.clientX;
      const y = e.clientY;
      sparksRef.current.push({
        x,
        y,
        startTime: Date.now(),
        startAngle: Math.random() * Math.PI
      });
    };
    window.addEventListener('mousedown', handleGlobalClick);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousedown', handleGlobalClick);
      cancelAnimationFrame(animationFrameId);
    };
  }, [sparkColor, sparkSize, sparkRadius, sparkCount, duration]);

  return (
    <>
      <canvas ref={canvasRef} className="click-spark-canvas" />
      {children}
    </>
  );
};

export default ClickSpark;
