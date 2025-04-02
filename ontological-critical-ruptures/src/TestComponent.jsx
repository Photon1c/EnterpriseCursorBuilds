import React, { useEffect, useRef, useState } from 'react';
import './App.css';

function TestComponent() {
  const controlsRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [controlPosition, setControlPosition] = useState({ x: 20, y: 20 });
  const [showControls, setShowControls] = useState(true);
  const [showPanelTip, setShowPanelTip] = useState(true);
  
  // Setup drag handlers for the controls panel
  useEffect(() => {
    const controlsElement = controlsRef.current;
    if (!controlsElement) {
      console.log("Controls element not found in ref");
      return;
    }

    console.log("Setting up drag handlers for controls panel");

    const handleMouseDown = (e) => {
      console.log("Mouse down on controls panel", e.target);
      // Only start dragging when clicking on the header or the panel itself (not its children)
      if (e.target.closest('.controls-header') || e.target === controlsElement) {
        setIsDragging(true);
        const rect = controlsElement.getBoundingClientRect();
        setDragOffset({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        });
        console.log("Started dragging", { x: e.clientX - rect.left, y: e.clientY - rect.top });
        e.preventDefault();
      }
    };

    const handleMouseMove = (e) => {
      if (isDragging) {
        console.log("Dragging controls panel");
        const newX = e.clientX - dragOffset.x;
        const newY = e.clientY - dragOffset.y;
        
        setControlPosition({
          x: Math.max(0, newX),
          y: Math.max(0, newY)
        });
      }
    };

    const handleMouseUp = () => {
      if (isDragging) {
        console.log("Stopped dragging controls panel");
        setIsDragging(false);
      }
    };

    controlsElement.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      console.log("Cleaning up drag handlers");
      controlsElement.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  useEffect(() => {
    console.log("TestComponent mounted");
  }, []);

  console.log("Rendering TestComponent", { controlPosition, isDragging, showPanelTip });

  return (
    <div className="app" style={{ background: 'black' }}>
      <h1 style={{ color: 'white', position: 'fixed', top: 20, left: 20 }}>
        Test Draggable Panel
      </h1>
      
      <div 
        ref={controlsRef}
        className={`controls ${isDragging ? 'dragging' : ''}`}
        style={{
          position: 'fixed',
          right: 'auto',
          left: `${controlPosition.x}px`,
          top: `${controlPosition.y}px`,
          width: '400px',
          background: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          zIndex: 9999,
          borderRadius: '8px',
          boxShadow: '0 0 10px rgba(255, 255, 255, 0.3)',
          border: '1px solid cyan',
          padding: '20px',
          resize: 'both',
          overflow: 'auto'
        }}
      >
        {showPanelTip && (
          <div 
            style={{
              position: 'absolute',
              top: '-80px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(0, 0, 0, 0.9)',
              padding: '10px 15px',
              borderRadius: '4px',
              border: '1px solid cyan',
              zIndex: 10000
            }}
          >
            <p>✓ Panel can be dragged</p>
            <p>✓ Panel can be resized</p>
            <button onClick={() => setShowPanelTip(false)}>Got it</button>
          </div>
        )}
        
        <div 
          className="controls-header"
          style={{
            padding: '10px 0',
            marginBottom: '15px',
            borderBottom: '1px solid cyan',
            display: 'flex',
            justifyContent: 'space-between',
            cursor: 'move'
          }}
        >
          <h2 style={{ margin: 0, color: 'cyan' }}>Draggable Panel</h2>
          <button onClick={() => setShowControls(!showControls)}>
            {showControls ? 'Hide Content' : 'Show Content'}
          </button>
        </div>
        
        {showControls && (
          <div>
            <p>This is a test panel that can be dragged and resized.</p>
            <p>Try dragging it using the header at the top.</p>
            <p>Try resizing it from the bottom-right corner.</p>
            <button onClick={() => setControlPosition({ x: 20, y: 20 })}>
              Reset Position
            </button>
          </div>
        )}
        
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: '20px',
            height: '20px',
            background: 'linear-gradient(135deg, transparent 50%, cyan 50%)',
            cursor: 'nwse-resize',
            borderBottomRightRadius: '8px'
          }}
        ></div>
      </div>
    </div>
  );
}

export default TestComponent; 