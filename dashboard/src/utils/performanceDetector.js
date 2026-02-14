/**
 * Performance Detector
 * Detects device capabilities and adjusts animations accordingly
 */

export const PerformanceLevel = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high'
};

/**
 * Detect device performance level based on RAM and hardware
 */
export function detectPerformanceLevel() {
  try {
    // Check if performance API is available
    if (!navigator || !navigator.deviceMemory) {
      // Fallback: use connection speed and hardware concurrency
      return detectPerformanceFallback();
    }

    const deviceMemory = navigator.deviceMemory; // RAM in GB
    const hardwareConcurrency = navigator.hardwareConcurrency || 2;

    // Performance scoring
    let score = 0;

    // RAM scoring (0-40 points)
    if (deviceMemory >= 8) score += 40;
    else if (deviceMemory >= 4) score += 25;
    else if (deviceMemory >= 2) score += 15;
    else score += 5;

    // CPU cores scoring (0-30 points)
    if (hardwareConcurrency >= 8) score += 30;
    else if (hardwareConcurrency >= 4) score += 20;
    else if (hardwareConcurrency >= 2) score += 10;
    else score += 5;

    // Connection speed scoring (0-30 points)
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (connection) {
      const effectiveType = connection.effectiveType;
      if (effectiveType === '4g') score += 30;
      else if (effectiveType === '3g') score += 15;
      else score += 5;
    } else {
      score += 15; // Assume medium if unknown
    }

    // Determine performance level
    if (score >= 70) return PerformanceLevel.HIGH;
    if (score >= 40) return PerformanceLevel.MEDIUM;
    return PerformanceLevel.LOW;

  } catch (error) {
    console.warn('[Performance Detector] Error detecting performance:', error);
    return PerformanceLevel.MEDIUM; // Safe default
  }
}

/**
 * Fallback detection when deviceMemory API is not available
 */
function detectPerformanceFallback() {
  const hardwareConcurrency = navigator.hardwareConcurrency || 2;
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  if (isMobile) {
    // Mobile devices: be conservative
    return hardwareConcurrency >= 4 ? PerformanceLevel.MEDIUM : PerformanceLevel.LOW;
  } else {
    // Desktop: assume better performance
    return hardwareConcurrency >= 4 ? PerformanceLevel.HIGH : PerformanceLevel.MEDIUM;
  }
}

/**
 * Get animation settings based on performance level
 */
export function getAnimationSettings(performanceLevel) {
  switch (performanceLevel) {
    case PerformanceLevel.HIGH:
      return {
        enableTransitions: true,
        enableAnimations: true,
        enableParticles: true,
        enableBlur: true,
        transitionDuration: 300,
        animationComplexity: 'high'
      };
    
    case PerformanceLevel.MEDIUM:
      return {
        enableTransitions: true,
        enableAnimations: true,
        enableParticles: false,
        enableBlur: false,
        transitionDuration: 200,
        animationComplexity: 'medium'
      };
    
    case PerformanceLevel.LOW:
      return {
        enableTransitions: true,
        enableAnimations: false,
        enableParticles: false,
        enableBlur: false,
        transitionDuration: 100,
        animationComplexity: 'low'
      };
    
    default:
      return getAnimationSettings(PerformanceLevel.MEDIUM);
  }
}

/**
 * Apply performance-based CSS classes to document
 */
export function applyPerformanceClasses() {
  const level = detectPerformanceLevel();
  const settings = getAnimationSettings(level);
  
  document.documentElement.setAttribute('data-performance', level);
  
  if (!settings.enableAnimations) {
    document.documentElement.classList.add('reduce-motion');
  }
  
  return { level, settings };
}

/**
 * Get device info for debugging
 */
export function getDeviceInfo() {
  return {
    memory: navigator.deviceMemory || 'unknown',
    cores: navigator.hardwareConcurrency || 'unknown',
    connection: navigator.connection?.effectiveType || 'unknown',
    isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
    userAgent: navigator.userAgent
  };
}
