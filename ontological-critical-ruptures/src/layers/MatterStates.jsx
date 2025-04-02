import { useMemo, useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

// Matter grid to represent different matter states
const MatterGrid = ({ pressure }) => {
  const gridRef = useRef();
  const particlesRef = useRef();
  
  // Determine matter state based on pressure
  const getMatterState = (pressure) => {
    if (pressure < 30) return 'solid';
    if (pressure < 70) return 'liquid';
    return 'gas';
  };
  
  const matterState = getMatterState(pressure);
  
  // Different visual characteristics based on matter state
  const getGridConfig = (state) => {
    switch (state) {
      case 'solid':
        return { 
          size: 2, 
          count: 10, 
          spacing: 0.2,
          jitter: 0.02,
          color: new THREE.Color(0, 0.7, 0.3)
        };
      case 'liquid':
        return { 
          size: 2, 
          count: 8, 
          spacing: 0.25,
          jitter: 0.1,
          color: new THREE.Color(0, 0.8, 0.6)
        };
      case 'gas':
        return { 
          size: 2, 
          count: 5, 
          spacing: 0.4,
          jitter: 0.3,
          color: new THREE.Color(0.2, 1, 0.6)
        };
      default:
        return { 
          size: 2, 
          count: 10, 
          spacing: 0.2,
          jitter: 0.02,
          color: new THREE.Color(0, 0.7, 0.3)
        };
    }
  };
  
  const config = getGridConfig(matterState);
  
  // Create 3D grid points
  const gridGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = [];
    const originalPositions = [];
    
    const halfSize = config.size / 2;
    const step = config.size / config.count;
    
    for (let x = -halfSize; x <= halfSize; x += step) {
      for (let y = -halfSize; y <= halfSize; y += step) {
        for (let z = -halfSize; z <= halfSize; z += step) {
          const distance = Math.sqrt(x*x + y*y + z*z);
          if (distance <= 1.2) { // Keep within sphere bounds
            positions.push(x, y, z);
            originalPositions.push(x, y, z);
          }
        }
      }
    }
    
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.userData = { originalPositions: new Float32Array(originalPositions) };
    
    return geo;
  }, [config.size, config.count]);
  
  // Animate the grid points based on pressure and matter state
  useFrame(({ clock }) => {
    if (gridRef.current) {
      const time = clock.getElapsedTime();
      const positions = gridRef.current.geometry.attributes.position.array;
      const original = gridRef.current.geometry.userData.originalPositions;
      
      for (let i = 0; i < positions.length; i += 3) {
        const x = original[i];
        const y = original[i + 1];
        const z = original[i + 2];
        
        const jitterIntensity = config.jitter * (pressure / 50);
        
        switch (matterState) {
          case 'solid':
            // Slight vibration
            positions[i] = x + Math.sin(time * 5 + i) * jitterIntensity;
            positions[i+1] = y + Math.cos(time * 5 + i) * jitterIntensity;
            positions[i+2] = z + Math.sin(time * 5 + i * 2) * jitterIntensity;
            break;
          case 'liquid':
            // Wave-like motion
            positions[i] = x + Math.sin(time * 2 + y * 5) * jitterIntensity;
            positions[i+1] = y + Math.cos(time * 1.5 + x * 5) * jitterIntensity;
            positions[i+2] = z + Math.sin(time * 2 + z * 5) * jitterIntensity * 0.5;
            break;
          case 'gas':
            // Chaotic motion
            positions[i] = x + Math.sin(time * 3 + i * 0.5) * jitterIntensity;
            positions[i+1] = y + Math.cos(time * 4 + i * 0.3) * jitterIntensity;
            positions[i+2] = z + Math.sin(time * 5 + i * 0.2) * jitterIntensity;
            break;
        }
      }
      
      gridRef.current.geometry.attributes.position.needsUpdate = true;
    }
    
    // Animate particles
    if (particlesRef.current && matterState === 'gas') {
      const time = clock.getElapsedTime();
      const positions = particlesRef.current.geometry.attributes.position.array;
      
      for (let i = 0; i < positions.length; i += 3) {
        // Get current position
        const x = positions[i];
        const y = positions[i+1];
        const z = positions[i+2];
        
        // Distance from center
        const distance = Math.sqrt(x*x + y*y + z*z);
        
        if (distance > 1.6) {
          // Reset to random position inside sphere
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos(2 * Math.random() - 1);
          const r = Math.random() * 0.8;
          
          positions[i] = r * Math.sin(phi) * Math.cos(theta);
          positions[i+1] = r * Math.sin(phi) * Math.sin(theta);
          positions[i+2] = r * Math.cos(phi);
        } else {
          // Move outward with randomness
          const speed = 0.01 * (pressure / 50);
          const direction = distance > 0 ? { 
            x: x / distance, 
            y: y / distance, 
            z: z / distance 
          } : { x: 0, y: 0, z: 0 };
          
          positions[i] += direction.x * speed + (Math.random() - 0.5) * 0.01;
          positions[i+1] += direction.y * speed + (Math.random() - 0.5) * 0.01;
          positions[i+2] += direction.z * speed + (Math.random() - 0.5) * 0.01;
        }
      }
      
      particlesRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });
  
  // Gas state particles
  const particlesGeometry = useMemo(() => {
    if (matterState !== 'gas') return null;
    
    const geo = new THREE.BufferGeometry();
    const positions = [];
    
    const particleCount = Math.floor(50 * (pressure / 100));
    
    for (let i = 0; i < particleCount; i++) {
      // Random positions inside sphere
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = Math.random() * 0.8;
      
      positions.push(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      );
    }
    
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    return geo;
  }, [matterState, pressure]);
  
  return (
    <group>
      <points ref={gridRef} geometry={gridGeometry}>
        <pointsMaterial 
          size={config.spacing * 6} 
          color={config.color} 
          transparent 
          opacity={0.8}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
        />
      </points>
      {matterState === 'gas' && (
        <points ref={particlesRef} geometry={particlesGeometry}>
          <pointsMaterial
            size={0.1}
            color={new THREE.Color(0.4, 1, 0.7)}
            transparent
            opacity={0.8}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            sizeAttenuation
          />
        </points>
      )}
    </group>
  );
};

// Phase transition rings that appear during state changes
const PhaseTransition = ({ pressure }) => {
  const ringsRef = useRef();
  
  // Determine transitions
  const getTransitionPoints = () => {
    return [
      { pressure: 30, from: 'solid', to: 'liquid' },
      { pressure: 70, from: 'liquid', to: 'gas' }
    ];
  };
  
  const transitions = getTransitionPoints();
  
  // Check if we're near a transition
  const findActiveTransition = () => {
    for (const transition of transitions) {
      if (Math.abs(pressure - transition.pressure) < 5) {
        return {
          ...transition,
          progress: 1 - Math.abs(pressure - transition.pressure) / 5
        };
      }
    }
    return null;
  };
  
  const transition = findActiveTransition();
  
  // Rings geometry
  const ringsGeometry = useMemo(() => {
    if (!transition) return null;
    
    const geometry = new THREE.TorusGeometry(1.2, 0.03, 16, 100);
    return geometry;
  }, [transition]);
  
  // Animate rings during transition
  useFrame(({ clock }) => {
    if (ringsRef.current && transition) {
      const time = clock.getElapsedTime();
      ringsRef.current.rotation.x = time * 0.3;
      ringsRef.current.rotation.y = time * 0.5;
      
      // Scale pulsates during transition
      const pulseScale = 1 + Math.sin(time * 5) * 0.1 * transition.progress;
      ringsRef.current.scale.set(pulseScale, pulseScale, pulseScale);
      
      // Opacity based on transition progress
      ringsRef.current.material.opacity = transition.progress * 0.7;
    }
  });
  
  if (!transition) return null;
  
  return (
    <mesh ref={ringsRef} geometry={ringsGeometry}>
      <meshBasicMaterial 
        color={transition.to === 'gas' ? 'cyan' : 'lime'} 
        transparent
        opacity={0.5}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};

// Explosion effect for critical matter state rupture
const MatterExplosion = ({ position }) => {
  const particlesRef = useRef();
  const gridRef = useRef();
  
  // Create explosion particle system
  const particlesGeometry = useMemo(() => {
    const count = 250;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    
    // Generate random starting positions at center
    for (let i = 0; i < count; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;
      
      // Randomize velocity outward
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const power = 0.01 + Math.random() * 0.05;
      
      velocities[i * 3] = Math.sin(phi) * Math.cos(theta) * power;
      velocities[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * power;
      velocities[i * 3 + 2] = Math.cos(phi) * power;
      
      // Randomize colors between green and cyan
      const lerpFactor = Math.random();
      const color1 = new THREE.Color(0, 1, 0.4);
      const color2 = new THREE.Color(0, 0.8, 0.8);
      const finalColor = color1.lerp(color2, lerpFactor);
      
      colors[i * 3] = finalColor.r;
      colors[i * 3 + 1] = finalColor.g;
      colors[i * 3 + 2] = finalColor.b;
    }
    
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.userData = { age: 0 };
    
    return geo;
  }, []);
  
  // Create disintegration grid
  const gridGeometry = useMemo(() => {
    const count = 80;
    const geo = new THREE.BufferGeometry();
    const positions = [];
    const velocities = [];
    const colors = [];
    
    // Create grid pattern
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 0.8 + Math.random() * 0.5;
      
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);
      
      positions.push(x, y, z);
      
      // Outward velocity
      const speed = 0.01 + Math.random() * 0.02;
      velocities.push(x * speed, y * speed, z * speed);
      
      // Green to cyan gradient
      const green = 0.7 + Math.random() * 0.3;
      colors.push(0, green, 0.3 + Math.random() * 0.3);
    }
    
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('velocity', new THREE.Float32BufferAttribute(velocities, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    
    return geo;
  }, []);
  
  // Animate particles and grid
  useFrame(() => {
    // Update explosion particles
    if (particlesRef.current) {
      const positions = particlesRef.current.geometry.attributes.position.array;
      const velocities = particlesRef.current.geometry.attributes.velocity.array;
      
      particlesRef.current.geometry.userData.age += 1;
      const age = particlesRef.current.geometry.userData.age;
      
      // Fade out over time
      particlesRef.current.material.opacity = Math.max(0, 1 - age / 120);
      
      for (let i = 0; i < positions.length; i += 3) {
        // Apply velocity with deceleration
        positions[i] += velocities[i] * Math.max(0, 1 - age / 120);
        positions[i + 1] += velocities[i + 1] * Math.max(0, 1 - age / 120) - 0.0002; // Slight gravity
        positions[i + 2] += velocities[i + 2] * Math.max(0, 1 - age / 120);
      }
      
      particlesRef.current.geometry.attributes.position.needsUpdate = true;
    }
    
    // Update disintegration grid
    if (gridRef.current) {
      const positions = gridRef.current.geometry.attributes.position.array;
      const velocities = gridRef.current.geometry.attributes.velocity.array;
      
      for (let i = 0; i < positions.length; i += 3) {
        // Move outward
        positions[i] += velocities[i];
        positions[i + 1] += velocities[i + 1];
        positions[i + 2] += velocities[i + 2];
        
        // Increase speed over time (acceleration)
        velocities[i] *= 1.01;
        velocities[i + 1] *= 1.01;
        velocities[i + 2] *= 1.01;
      }
      
      gridRef.current.geometry.attributes.position.needsUpdate = true;
      gridRef.current.geometry.attributes.velocity.needsUpdate = true;
      
      // Fade out
      gridRef.current.material.opacity = Math.max(0, gridRef.current.material.opacity - 0.005);
    }
  });
  
  return (
    <group position={position}>
      <points ref={particlesRef} geometry={particlesGeometry}>
        <pointsMaterial
          size={0.15}
          vertexColors
          transparent
          opacity={1}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
        />
      </points>
      
      <points ref={gridRef} geometry={gridGeometry}>
        <pointsMaterial
          size={0.2}
          vertexColors
          transparent
          opacity={0.9}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
        />
      </points>
    </group>
  );
};

// Neon wireframe for matter state visualization
const MatterWireframe = ({ scale, color }) => {
  const wireframeRef = useRef();
  
  useFrame(({ clock }) => {
    if (wireframeRef.current) {
      const time = clock.getElapsedTime();
      wireframeRef.current.rotation.y = time * 0.15;
      wireframeRef.current.rotation.x = time * 0.05;
    }
  });
  
  return (
    <mesh ref={wireframeRef} scale={[scale * 1.05, scale * 1.05, scale * 1.05]}>
      <dodecahedronGeometry args={[1, 1]} />
      <meshBasicMaterial 
        color={color} 
        wireframe={true} 
        transparent={true} 
        opacity={0.7}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
};

export default function MatterStates({ pressure, position, label }) {
  const scale = useMemo(() => 0.7 + pressure / 60, [pressure]);
  const burstThreshold = 95;
  const isBursting = pressure > burstThreshold;
  
  const [hasExploded, setHasExploded] = useState(false);
  const [showLabel, setShowLabel] = useState(false);
  
  // Neon color based on current state
  const neonColor = useMemo(() => {
    if (pressure < 30) return new THREE.Color(0, 1, 0.4); // Solid - bright green
    if (pressure < 70) return new THREE.Color(0, 1, 0.6); // Liquid - teal
    return new THREE.Color(0, 0.8, 1);                    // Gas - cyan
  }, [pressure]);
  
  // Handle critical point explosion
  useEffect(() => {
    if (isBursting && !hasExploded) {
      setHasExploded(true);
    } else if (!isBursting && hasExploded) {
      setHasExploded(false);
    }
  }, [isBursting, hasExploded]);
  
  // Container group
  const groupRef = useRef();
  
  // Animate the overall scale
  useFrame(({ clock }) => {
    if (groupRef.current) {
      if (isBursting) {
        // Rapid pulsing when at critical point
        const time = clock.getElapsedTime();
        const pulse = 1 + Math.sin(time * 20) * 0.1;
        
        if (hasExploded) {
          // Collapse during explosion
          const collapseScale = Math.max(0.1, scale * 2 * (1 - (pressure - burstThreshold) / 10));
          groupRef.current.scale.set(collapseScale, collapseScale, collapseScale);
        } else {
          groupRef.current.scale.set(scale * pulse * 2, scale * pulse * 2, scale * pulse * 2);
        }
      } else {
        groupRef.current.scale.set(scale * 2, scale * 2, scale * 2);
      }
    }
  });
  
  return (
    <group 
      ref={groupRef} 
      position={position}
      onPointerOver={() => setShowLabel(true)}
      onPointerOut={() => setShowLabel(false)}
    >
      {/* Hover label */}
      {showLabel && (
        <Text
          position={[0, 3.5, 0]}
          color="white"
          fontSize={0.7}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.05}
          outlineColor="#000000"
        >
          {label}
        </Text>
      )}
      
      {/* Core mesh and grid visualization */}
      {!hasExploded && (
        <>
          <mesh>
            <sphereGeometry args={[1, 32, 32]} />
            <meshStandardMaterial 
              color={new THREE.Color(0, 0.5, 0.2)} 
              wireframe={true}
              emissive={neonColor}
              emissiveIntensity={pressure / 100 + 0.2}
            />
          </mesh>
          <MatterGrid pressure={pressure} />
          <MatterWireframe scale={scale} color={neonColor} />
        </>
      )}
      
      {/* Phase transition rings */}
      <PhaseTransition pressure={pressure} />
      
      {/* Explosion effect when at critical point */}
      {hasExploded && <MatterExplosion position={[0, 0, 0]} />}
    </group>
  );
}
