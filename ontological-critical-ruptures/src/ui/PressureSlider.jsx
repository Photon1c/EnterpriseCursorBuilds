import React from 'react';
import { useMemo } from 'react';

const PressureSlider = ({ pressure, setPressure }) => {
  // Define critical points that map to different phenomena
  const criticalPoints = useMemo(() => [
    { value: 30, label: 'Phase Transition: Solid → Liquid', color: '#4ade80' },
    { value: 70, label: 'Phase Transition: Liquid → Gas', color: '#60a5fa' },
    { value: 80, label: 'Stock Market Volatility Threshold', color: '#f87171' },
    { value: 95, label: 'Critical System Rupture', color: '#fbbf24' }
  ], []);
  
  // Find closest critical point to current pressure
  const nearestPoint = useMemo(() => {
    let closest = null;
    let minDistance = Infinity;
    
    criticalPoints.forEach(point => {
      const distance = Math.abs(point.value - pressure);
      if (distance < minDistance) {
        minDistance = distance;
        closest = point;
      }
    });
    
    // Only return if we're within 5 units of a critical point
    return minDistance <= 5 ? { ...closest, distance: minDistance } : null;
  }, [pressure, criticalPoints]);
  
  const getColor = (value) => {
    if (value < 30) return '#4caf50'; // Green
    if (value < 60) return '#ffeb3b'; // Yellow
    if (value < 80) return '#ff9800'; // Orange
    if (value < 95) return '#e91e63'; // Pink
    return '#f44336'; // Red
  };

  const getLabel = (value) => {
    if (value < 30) return 'Stable';
    if (value < 60) return 'Moderate';
    if (value < 80) return 'Heightened';
    if (value < 95) return 'Critical';
    return 'Rupture';
  };
  
  const getLabelTextColor = (value) => {
    // Dark text for light backgrounds, light text for dark backgrounds
    return value < 60 ? '#000000' : '#ffffff';
  };

  return (
    <div className="w-full">
      <div className="mb-2 flex justify-between items-center">
        <span className="text-white font-medium">Pressure: {pressure}</span>
        <span className="font-medium px-2 py-0.5 rounded-md" 
          style={{ 
            backgroundColor: getColor(pressure),
            color: getLabelTextColor(pressure),
            textShadow: pressure < 60 ? '0 0 2px rgba(255,255,255,0.5)' : '0 0 2px rgba(0,0,0,0.5)'
          }}
        >
          {getLabel(pressure)}
        </span>
      </div>
      <input
        type="range"
        min="0"
        max="100"
        value={pressure}
        onChange={(e) => setPressure(parseInt(e.target.value))}
        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, #4caf50, #ffeb3b, #ff9800, #e91e63, #f44336)`,
        }}
      />
      <div className="flex justify-between text-xs text-gray-300 mt-1">
        <span>Stable</span>
        <span>Moderate</span>
        <span>Heightened</span>
        <span>Critical</span>
        <span>Rupture</span>
      </div>
    </div>
  );
};

export default PressureSlider;
