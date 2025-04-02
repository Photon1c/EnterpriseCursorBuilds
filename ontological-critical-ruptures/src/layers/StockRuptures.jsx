import { useMemo, useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere, Text } from '@react-three/drei';
import * as THREE from 'three';

// Explosion particles when sphere pops
const ExplosionParticles = ({ count = 500, position, color }) => {
  const pointsRef = useRef();
  
  const particlesGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const scales = new Float32Array(count);
    const lifetimes = new Float32Array(count);
    
    for (let i = 0; i < count; i++) {
      // Start at center
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;
      
      // Random velocities outward with much higher power
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const power = 0.05 + Math.random() * 0.12; // Higher power for more dramatic effect
      
      velocities[i * 3] = power * Math.sin(phi) * Math.cos(theta);
      velocities[i * 3 + 1] = power * Math.sin(phi) * Math.sin(theta);
      velocities[i * 3 + 2] = power * Math.cos(phi);
      
      // Random scales and lifetimes
      scales[i] = Math.random() * 0.6 + 0.15;
      lifetimes[i] = Math.random() * 120 + 80; // frames
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
    geometry.setAttribute('scale', new THREE.BufferAttribute(scales, 1));
    geometry.setAttribute('lifetime', new THREE.BufferAttribute(lifetimes, 1));
    geometry.userData = { age: 0 };
    
    return geometry;
  }, [count]);
  
  useFrame(() => {
    if (pointsRef.current) {
      const positions = pointsRef.current.geometry.attributes.position.array;
      const velocities = pointsRef.current.geometry.attributes.velocity.array;
      const lifetimes = pointsRef.current.geometry.attributes.lifetime.array;
      
      pointsRef.current.geometry.userData.age += 1;
      const age = pointsRef.current.geometry.userData.age;
      
      // Material opacity fades over time
      pointsRef.current.material.opacity = Math.max(0, 1 - age / 100);
      
      for (let i = 0; i < positions.length; i += 3) {
        // Apply velocity with less dampening for more dramatic effect
        positions[i] += velocities[i] * Math.max(0, 1 - age / 150);
        positions[i + 1] += velocities[i + 1] * Math.max(0, 1 - age / 150);
        positions[i + 2] += velocities[i + 2] * Math.max(0, 1 - age / 150);
        
        // Slower deceleration
        velocities[i] *= 0.995;
        velocities[i + 1] *= 0.995;
        velocities[i + 2] *= 0.995;
        
        // Apply "gravity" effect
        velocities[i + 1] -= 0.0008;
      }
      
      pointsRef.current.geometry.attributes.position.needsUpdate = true;
      pointsRef.current.geometry.attributes.velocity.needsUpdate = true;
    }
  });
  
  return (
    <points ref={pointsRef} geometry={particlesGeometry} position={position}>
      <pointsMaterial
        size={0.25}
        color={color}
        transparent
        opacity={1}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  );
};

// Particles that swirl around sphere
const Particles = ({ pressure, count = 150, position, color }) => {
  const pointsRef = useRef();
  const particlesGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const scales = new Float32Array(count);
    const velocities = new Float32Array(count * 3);
    
    for (let i = 0; i < count; i++) {
      // Random positions in a sphere
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 2 + Math.random() * 0.8;
      
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
      
      // Random velocities
      velocities[i * 3] = (Math.random() - 0.5) * 0.015;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.015;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.015;
      
      // Random scales
      scales[i] = Math.random() * 0.6 + 0.2;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
    geometry.setAttribute('scale', new THREE.BufferAttribute(scales, 1));
    
    return geometry;
  }, [count]);
  
  useFrame(({ clock }) => {
    if (pointsRef.current) {
      const time = clock.getElapsedTime();
      const positions = pointsRef.current.geometry.attributes.position.array;
      const velocities = pointsRef.current.geometry.attributes.velocity.array;
      const intensity = pressure / 40; // Increased intensity
      
      for (let i = 0; i < positions.length; i += 3) {
        // Current position
        const x = positions[i];
        const y = positions[i + 1];
        const z = positions[i + 2];
        
        // Distance from center
        const dist = Math.sqrt(x*x + y*y + z*z);
        
        // Apply more intense swirling motion
        const swirl = 0.02 * intensity;
        const dx = -z * swirl + Math.sin(time * 0.5 + i * 0.01) * 0.01 * intensity;
        const dz = x * swirl + Math.cos(time * 0.5 + i * 0.01) * 0.01 * intensity;
        
        // Apply velocity to position
        positions[i] += dx + velocities[i] * intensity;
        positions[i + 1] += velocities[i + 1] * intensity;
        positions[i + 2] += dz + velocities[i + 2] * intensity;
        
        // Reset particles that go too far
        const newDist = Math.sqrt(
          positions[i] ** 2 + positions[i + 1] ** 2 + positions[i + 2] ** 2
        );
        
        if (newDist > 6 || newDist < 1.8) {
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos(2 * Math.random() - 1);
          const r = 2 + Math.random() * 0.8;
          
          positions[i] = r * Math.sin(phi) * Math.cos(theta);
          positions[i + 1] = r * Math.sin(phi) * Math.sin(theta);
          positions[i + 2] = r * Math.cos(phi);
        }
      }
      
      pointsRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });
  
  return (
    <points ref={pointsRef} position={position} geometry={particlesGeometry}>
      <pointsMaterial
        size={0.18}
        color={color}
        transparent
        opacity={0.85}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  );
};

// Neon wireframe that surrounds the sphere
const NeonWireframe = ({ scale, color }) => {
  const wireframeRef = useRef();
  
  useFrame(({ clock }) => {
    if (wireframeRef.current) {
      const time = clock.getElapsedTime();
      wireframeRef.current.rotation.y = time * 0.15;
      wireframeRef.current.rotation.z = time * 0.08;
    }
  });
  
  return (
    <mesh ref={wireframeRef} scale={[scale * 1.08, scale * 1.08, scale * 1.08]}>
      <icosahedronGeometry args={[1, 1]} />
      <meshBasicMaterial 
        color={color} 
        wireframe={true} 
        transparent={true} 
        opacity={0.8}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
};

// Neon flow lines
const NeonFlowLines = ({ scale, color, pressure }) => {
  const linesRef = useRef();
  
  const linesGeometry = useMemo(() => {
    const lineCount = 15;
    const pointsPerLine = 12;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(lineCount * pointsPerLine * 3);
    
    for (let l = 0; l < lineCount; l++) {
      const theta = (l / lineCount) * Math.PI * 2;
      const radius = 1.2;
      
      for (let p = 0; p < pointsPerLine; p++) {
        const phi = (p / (pointsPerLine - 1)) * Math.PI * 2;
        const x = radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.sin(phi) * Math.sin(theta);
        const z = radius * Math.cos(phi);
        
        const i = (l * pointsPerLine + p) * 3;
        positions[i] = x;
        positions[i + 1] = y;
        positions[i + 2] = z;
      }
    }
    
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.userData = { originalPositions: positions.slice() };
    
    return geometry;
  }, []);
  
  useFrame(({ clock }) => {
    if (linesRef.current) {
      const time = clock.getElapsedTime();
      const positions = linesRef.current.geometry.attributes.position.array;
      const original = linesRef.current.geometry.userData.originalPositions;
      const intensity = pressure / 40;
      
      for (let i = 0; i < positions.length; i += 3) {
        const x = original[i];
        const y = original[i + 1];
        const z = original[i + 2];
        
        // Animate positions with wave effect
        positions[i] = x + Math.sin(time * 2 + i * 0.05) * 0.1 * intensity;
        positions[i + 1] = y + Math.cos(time * 1.5 + i * 0.05) * 0.1 * intensity;
        positions[i + 2] = z + Math.sin(time * 2.5 + i * 0.05) * 0.1 * intensity;
      }
      
      linesRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });
  
  return (
    <group scale={[scale, scale, scale]}>
      <line ref={linesRef} geometry={linesGeometry}>
        <lineBasicMaterial 
          color={color} 
          transparent 
          opacity={0.7} 
          blending={THREE.AdditiveBlending}
          linewidth={1}
        />
      </line>
    </group>
  );
};

export default function StockRuptures({ pressure, position, label }) {
  const scale = useMemo(() => 1 + pressure / 25, [pressure]);
  const burstThreshold = 80;
  const criticalThreshold = 95;
  const isBursting = pressure > burstThreshold;
  const isCritical = pressure > criticalThreshold;
  
  const [hasPopped, setHasPopped] = useState(false);
  const [showLabel, setShowLabel] = useState(false);
  
  // Color changes based on pressure
  const color = useMemo(() => {
    if (pressure < 30) return new THREE.Color(0.8, 0.2, 0.2); // Normal red
    if (pressure < 60) return new THREE.Color(1, 0.4, 0.1);   // Orange-red
    if (pressure < 80) return new THREE.Color(1, 0.6, 0.1);   // Orange-yellow
    return new THREE.Color(1, 0.8, 0.2);                      // Yellow
  }, [pressure]);
  
  // Generate bright neon particle color
  const particleColor = useMemo(() => {
    const hsl = color.getHSL({});
    return new THREE.Color().setHSL(hsl.h, 1, 0.7);
  }, [color]);
  
  // Handle critical pressure point explosion effect
  useEffect(() => {
    if (isCritical && !hasPopped) {
      setHasPopped(true);
    } else if (!isCritical && hasPopped) {
      setHasPopped(false);
    }
  }, [isCritical, hasPopped]);
  
  // Pulsating animation
  const sphereRef = useRef();
  useFrame(({ clock }) => {
    if (sphereRef.current && isBursting && !isCritical) {
      const time = clock.getElapsedTime();
      const pulse = 1 + Math.sin(time * 15) * 0.15; // More intense pulsing
      sphereRef.current.scale.set(scale * pulse, scale * pulse, scale * pulse);
    } else if (sphereRef.current && !isCritical) {
      sphereRef.current.scale.set(scale, scale, scale);
    } else if (sphereRef.current && isCritical) {
      // Collapse sphere during critical rupture
      const collapseScale = Math.max(0.05, scale * (1 - (pressure - criticalThreshold) / 5)); // Faster collapse
      sphereRef.current.scale.set(collapseScale, collapseScale, collapseScale);
    }
  });
  
  const groupRef = useRef();
  
  return (
    <group 
      position={position} 
      ref={groupRef}
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
      
      {/* Main sphere */}
      {(!isCritical || !hasPopped) && (
        <mesh ref={sphereRef}>
          <sphereGeometry args={[2, 32, 32]} />
          <meshStandardMaterial 
            color={color} 
            emissive={color} 
            emissiveIntensity={pressure / 40} // Increased intensity
            roughness={0.2}
            metalness={0.8} 
          />
        </mesh>
      )}
      
      {/* External wireframe */}
      {(!isCritical || !hasPopped) && (
        <NeonWireframe scale={scale} color={particleColor} />
      )}
      
      {/* Neon flow lines */}
      {(!isCritical || !hasPopped) && (
        <NeonFlowLines scale={scale} color={particleColor} pressure={pressure} />
      )}
      
      {/* Regular particles */}
      {!hasPopped && <Particles pressure={pressure} count={isBursting ? 250 : 150} color={particleColor} />}
      
      {/* Critical rupture explosion particles */}
      {hasPopped && <ExplosionParticles count={600} position={[0, 0, 0]} color={particleColor} />}
    </group>
  );
}
