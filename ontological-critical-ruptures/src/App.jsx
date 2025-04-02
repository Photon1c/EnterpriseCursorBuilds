import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Suspense, useEffect, useState, useRef } from 'react';
import StockRuptures from './layers/StockRuptures';
import ImmuneZones from './layers/ImmuneZones';
import MatterStates from './layers/MatterStates';
import PressureSlider from './ui/PressureSlider';

export default function App() {
  const [pressure, setPressure] = useState(50);
  const [auto, setAuto] = useState(false);
  const [speed, setSpeed] = useState(100);
  const [spacing, setSpacing] = useState(20);
  const [visibleLayers, setVisibleLayers] = useState({
    stock: true,
    immune: true,
    matter: true,
  });
  const [uiVisible, setUiVisible] = useState(true);
  const [uiPosition, setUiPosition] = useState({ x: 20, y: 20 });
  const [uiSize, setUiSize] = useState({ width: 300, height: 'auto' });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const uiPanelRef = useRef(null);

  // Auto simulation loop
  useEffect(() => {
    let interval;
    if (auto) {
      interval = setInterval(() => {
        setPressure(prev => {
          const next = prev + 1;
          return next >= 101 ? 0 : next;
        });
      }, speed);
    }
    return () => clearInterval(interval);
  }, [auto, speed]);

  // Handle dragging
  const startDragging = (e) => {
    if (e.target.classList.contains('drag-handle')) {
      setIsDragging(true);
      const rect = uiPanelRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
      e.preventDefault();
    }
  };

  const startResizing = (e) => {
    setIsResizing(true);
    e.preventDefault();
  };

  const stopDraggingAndResizing = () => {
    setIsDragging(false);
    setIsResizing(false);
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setUiPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    } else if (isResizing) {
      const rect = uiPanelRef.current.getBoundingClientRect();
      setUiSize({
        width: Math.max(200, e.clientX - rect.left),
        height: 'auto'
      });
    }
  };

  useEffect(() => {
    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', stopDraggingAndResizing);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', stopDraggingAndResizing);
      };
    }
  }, [isDragging, isResizing]);

  const toggleUI = () => {
    setUiVisible(!uiVisible);
  };

  return (
    <div 
      className="w-screen h-screen flex flex-col items-center justify-center"
      onMouseMove={handleMouseMove}
    >
      <h1 className="text-xl font-bold mb-4 text-white">Ontological Critical Ruptures</h1>
      <div className="relative w-full h-full">
        <Canvas camera={{ position: [0, 15, 55], fov: 38 }}>
          <color attach="background" args={['#050510']} />
          <fog attach="fog" args={['#070720', 30, 100]} />
          <ambientLight intensity={0.8} />
          <directionalLight position={[10, 10, 5]} intensity={1.8} />
          <Suspense fallback={null}>
            {visibleLayers.stock && <StockRuptures pressure={pressure} position={[-spacing, 0, 0]} label="Stock Markets" />}
            {visibleLayers.immune && <ImmuneZones pressure={pressure} position={[0, 0, 0]} label="Immunity Systems" />}
            {visibleLayers.matter && <MatterStates pressure={pressure} position={[spacing, 0, 0]} label="Matter States" />}
          </Suspense>
          <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
          <gridHelper args={[120, 120, '#444', '#222']} position={[0, -10, 0]} />
        </Canvas>
        
        {/* Show button to reopen UI panel if it's closed */}
        {!uiVisible && (
          <button 
            className="absolute top-4 right-4 bg-white px-3 py-1 rounded-lg shadow-lg hover:bg-gray-100" 
            onClick={toggleUI}
          >
            Show Controls
          </button>
        )}
        
        {uiVisible && (
          <div 
            ref={uiPanelRef}
            className="absolute bg-black/80 p-4 rounded-xl shadow-xl backdrop-blur-sm text-white"
            style={{
              left: uiPosition.x,
              top: uiPosition.y,
              width: uiSize.width,
              height: uiSize.height,
              cursor: isDragging ? 'grabbing' : 'auto'
            }}
          >
            <div 
              className="drag-handle flex justify-between items-center mb-2 cursor-grab py-1 px-2 bg-gray-800 rounded"
              onMouseDown={startDragging}
            >
              <span className="font-semibold text-white">Parameters</span>
              <button 
                className="text-gray-300 hover:text-white font-bold"
                onClick={toggleUI}
              >
                ✕
              </button>
            </div>
            
            <PressureSlider pressure={pressure} setPressure={setPressure} />
            
            <div className="mt-2">
              <label htmlFor="spacing" className="text-white">Spacing: {spacing}</label>
              <input
                id="spacing"
                type="range"
                min="10"
                max="40"
                step="1"
                value={spacing}
                onChange={(e) => setSpacing(parseInt(e.target.value))}
                className="w-full"
              />
            </div>
            
            <div className="mt-2">
              <label htmlFor="speed" className="text-white">Speed: {speed}ms</label>
              <input
                id="speed"
                type="range"
                min="10"
                max="500"
                step="10"
                value={speed}
                onChange={(e) => setSpeed(parseInt(e.target.value))}
                className="w-full"
              />
            </div>
            
            <div className="flex flex-col gap-2 mt-2 text-white">
              {Object.keys(visibleLayers).map(layer => (
                <label key={layer}>
                  <input
                    type="checkbox"
                    checked={visibleLayers[layer]}
                    onChange={() =>
                      setVisibleLayers(prev => ({
                        ...prev,
                        [layer]: !prev[layer],
                      }))
                    }
                  />{' '}
                  {layer.charAt(0).toUpperCase() + layer.slice(1)}
                </label>
              ))}
            </div>
            <div className="mt-2 text-center">
              <button
                className="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-600"
                onClick={() => setAuto(prev => !prev)}
              >
                {auto ? 'Stop Auto' : 'Run Auto'}
              </button>
            </div>
            
            {/* Resize handle */}
            <div 
              className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize" 
              style={{
                backgroundColor: 'transparent',
                backgroundImage: 'linear-gradient(135deg, transparent 50%, rgba(255,255,255,0.3) 50%)',
                borderBottomRightRadius: '0.75rem'
              }}
              onMouseDown={startResizing}
            />
          </div>
        )}
      </div>
    </div>
  );
} 