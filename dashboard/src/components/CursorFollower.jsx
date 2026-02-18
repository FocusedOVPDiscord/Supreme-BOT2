import { useEffect, useRef, useState } from 'react';

export default function CursorFollower() {
  const cursorRef = useRef(null);
  const trailRef = useRef(null);
  const glowRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isClicking, setIsClicking] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const mousePos = useRef({ x: 0, y: 0 });
  const cursorPos = useRef({ x: 0, y: 0 });
  const trailPos = useRef({ x: 0, y: 0 });
  const glowPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    let animationFrameId;

    const handleMouseMove = (e) => {
      mousePos.current = { x: e.clientX, y: e.clientY };
      if (!isVisible) setIsVisible(true);
    };

    const handleMouseDown = () => setIsClicking(true);
    const handleMouseUp = () => setIsClicking(false);

    const handleMouseOver = (e) => {
      const target = e.target;
      const isInteractive = target.closest('a, button, input, select, textarea, [role="button"], [onclick], .clickable');
      setIsHovering(!!isInteractive);
    };

    const handleMouseLeave = () => {
      setIsVisible(false);
    };

    const handleMouseEnter = () => {
      setIsVisible(true);
    };

    const animate = () => {
      // Smooth follow with different speeds for each element
      const cursorSpeed = 0.15;
      const trailSpeed = 0.08;
      const glowSpeed = 0.04;

      cursorPos.current.x += (mousePos.current.x - cursorPos.current.x) * cursorSpeed;
      cursorPos.current.y += (mousePos.current.y - cursorPos.current.y) * cursorSpeed;

      trailPos.current.x += (mousePos.current.x - trailPos.current.x) * trailSpeed;
      trailPos.current.y += (mousePos.current.y - trailPos.current.y) * trailSpeed;

      glowPos.current.x += (mousePos.current.x - glowPos.current.x) * glowSpeed;
      glowPos.current.y += (mousePos.current.y - glowPos.current.y) * glowSpeed;

      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate(${cursorPos.current.x}px, ${cursorPos.current.y}px) translate(-50%, -50%)`;
      }
      if (trailRef.current) {
        trailRef.current.style.transform = `translate(${trailPos.current.x}px, ${trailPos.current.y}px) translate(-50%, -50%)`;
      }
      if (glowRef.current) {
        glowRef.current.style.transform = `translate(${glowPos.current.x}px, ${glowPos.current.y}px) translate(-50%, -50%)`;
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isVisible]);

  // Don't render on touch devices
  if (typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches) {
    return null;
  }

  return (
    <>
      {/* Outer glow - slowest follow */}
      <div
        ref={glowRef}
        className="pointer-events-none fixed top-0 left-0 z-[9999] mix-blend-screen"
        style={{
          width: isHovering ? '80px' : '60px',
          height: isHovering ? '80px' : '60px',
          opacity: isVisible ? 0.15 : 0,
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.8) 0%, rgba(139, 92, 246, 0.4) 40%, transparent 70%)',
          borderRadius: '50%',
          transition: 'width 0.4s ease, height 0.4s ease, opacity 0.3s ease',
          willChange: 'transform',
        }}
      />

      {/* Trail ring - medium follow */}
      <div
        ref={trailRef}
        className="pointer-events-none fixed top-0 left-0 z-[9999]"
        style={{
          width: isHovering ? '44px' : isClicking ? '28px' : '36px',
          height: isHovering ? '44px' : isClicking ? '28px' : '36px',
          opacity: isVisible ? 1 : 0,
          border: `2px solid ${isHovering ? 'rgba(139, 92, 246, 0.6)' : 'rgba(99, 102, 241, 0.4)'}`,
          borderRadius: '50%',
          transition: 'width 0.3s ease, height 0.3s ease, opacity 0.3s ease, border-color 0.3s ease',
          willChange: 'transform',
        }}
      />

      {/* Inner dot - fastest follow */}
      <div
        ref={cursorRef}
        className="pointer-events-none fixed top-0 left-0 z-[9999]"
        style={{
          width: isClicking ? '10px' : isHovering ? '6px' : '8px',
          height: isClicking ? '10px' : isHovering ? '6px' : '8px',
          opacity: isVisible ? 1 : 0,
          background: isHovering
            ? 'radial-gradient(circle, #a78bfa 0%, #8b5cf6 100%)'
            : 'radial-gradient(circle, #818cf8 0%, #6366f1 100%)',
          borderRadius: '50%',
          boxShadow: isHovering
            ? '0 0 15px rgba(139, 92, 246, 0.8), 0 0 30px rgba(139, 92, 246, 0.4)'
            : '0 0 10px rgba(99, 102, 241, 0.6), 0 0 20px rgba(99, 102, 241, 0.3)',
          transition: 'width 0.2s ease, height 0.2s ease, opacity 0.3s ease, background 0.3s ease, box-shadow 0.3s ease',
          willChange: 'transform',
        }}
      />
    </>
  );
}
