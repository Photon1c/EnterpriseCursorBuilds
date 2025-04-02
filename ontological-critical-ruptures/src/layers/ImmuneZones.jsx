import { useMemo, useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

const ProtectiveField = ({ pressure, radius }) => {
  const fieldRef = useRef();
  const noiseScale = 0.1;
  const noiseSpeed = 0.001;
  
  useFrame(({ clock }) => {
    if (fieldRef.current) {
      const time = clock.getElapsedTime();
      const positions = fieldRef.current.geometry.attributes.position.array;
      const original = fieldRef.current.geometry.userData.originalPositions;
      
      for (let i = 0; i < positions.length; i += 3) {
        const x = original[i];
        const y = original[i + 1];
        const z = original[i + 2];
        
        // Perlin-like noise effect
        const noise = Math.sin(x * noiseScale + time * noiseSpeed) * 
                     Math.cos(y * noiseScale + time * noiseSpeed) * 
                     Math.sin(z * noiseScale + time * noiseSpeed);
        
        const intensity = (pressure / 100) * 0.5;
        positions[i] = x + noise * intensity;
        positions[i + 1] = y + noise * intensity;
        positions[i + 2] = z + noise * intensity;
      }
      
      fieldRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });
  
  const geometry = useMemo(() => {
    const geo = new THREE.IcosahedronGeometry(radius, 4);
    // Store original positions for animation
    const originalPositions = new Float32Array(geo.attributes.position.array.length);
    originalPositions.set(geo.attributes.position.array);
    geo.userData = { originalPositions };
    return geo;
  }, [radius]);
  
  return (
    <mesh ref={fieldRef} geometry={geometry}>
      <meshPhysicalMaterial
        color="#40a0ff"
        emissive="#0066ff"
        emissiveIntensity={pressure / 100}
        transmission={0.9 - pressure / 200}
        transparent
        opacity={0.3 + pressure / 150}
        roughness={0.1}
        clearcoat={1}
        clearcoatRoughness={0}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};

const ImmuneParticles = ({ pressure, count = 50, color }) => {
  const pointsRef = useRef();
  const intensity = pressure / 50;
  
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    
    for (let i = 0; i < count; i++) {
      // Start particles within the sphere
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = Math.random() * 0.9;
      
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
      
      // Random velocities (circulating pattern)
      velocities[i * 3] = (Math.random() - 0.5) * 0.01;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.01;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.01;
      
      // Random sizes
      sizes[i] = Math.random() * 0.2 + 0.05;
    }
    
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    return geo;
  }, [count]);
  
  useFrame(({ clock }) => {
    if (pointsRef.current) {
      const time = clock.getElapsedTime();
      const positions = pointsRef.current.geometry.attributes.position.array;
      const velocities = pointsRef.current.geometry.attributes.velocity.array;
      
      for (let i = 0; i < positions.length; i += 3) {
        // Calculate a circular path around the center
        const x = positions[i];
        const y = positions[i + 1];
        const z = positions[i + 2];
        
        // Distance from origin
        const dist = Math.sqrt(x*x + y*y + z*z);
        
        if (dist > 0) {
          // Normalize
          const nx = x / dist;
          const ny = y / dist;
          const nz = z / dist;
          
          // Calculate cross product to get tangent direction
          const tx = ny * nz - nz * ny;
          const ty = nz * nx - nx * nz;
          const tz = nx * ny - ny * nx;
          
          // Move along tangent plus some original velocity
          positions[i] += (tx * 0.01 + velocities[i] * 0.2) * intensity;
          positions[i + 1] += (ty * 0.01 + velocities[i + 1] * 0.2) * intensity;
          positions[i + 2] += (tz * 0.01 + velocities[i + 2] * 0.2) * intensity;
          
          // Keep particles at consistent distance from center
          const newDist = Math.sqrt(
            positions[i]**2 + positions[i+1]**2 + positions[i+2]**2
          );
          
          // Target distance varies with sine wave for pulsating effect
          const targetDist = (0.8 + Math.sin(time * 2 + i) * 0.1) * (1 + pressure / 100);
          
          if (newDist > 0) {
            const factor = targetDist / newDist;
            positions[i] *= factor;
            positions[i + 1] *= factor;
            positions[i + 2] *= factor;
          }
        }
      }
      
      pointsRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });
  
  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        size={0.15}
        color={color}
        transparent
        opacity={0.8}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  );
};

// Explosion effect when the immune system ruptures
const ImmuneRupture = ({ position, color }) => {
  const particlesRef = useRef();
  const lineRef = useRef();
  
  // Create explosion particles
  const particlesGeometry = useMemo(() => {
    const count = 200;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    
    for (let i = 0; i < count; i++) {
      // Start at center
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;
      
      // Randomize velocity outward
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const power = 0.01 + Math.random() * 0.04;
      
      velocities[i * 3] = Math.sin(phi) * Math.cos(theta) * power;
      velocities[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * power;
      velocities[i * 3 + 2] = Math.cos(phi) * power;
    }
    
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
    geo.userData = { age: 0 };
    
    return geo;
  }, []);
  
  // Create electric arc lines
  const linesGeometry = useMemo(() => {
    const count = 20;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 6); // Two points per line
    const colors = new Float32Array(count * 6);
    
    for (let i = 0; i < count; i++) {
      // Random start and end points
      const theta1 = Math.random() * Math.PI * 2;
      const phi1 = Math.acos(2 * Math.random() - 1);
      const r1 = 1 + Math.random() * 1;
      
      const theta2 = Math.random() * Math.PI * 2;
      const phi2 = Math.acos(2 * Math.random() - 1);
      const r2 = 1 + Math.random() * 1;
      
      // Line start
      positions[i * 6] = r1 * Math.sin(phi1) * Math.cos(theta1);
      positions[i * 6 + 1] = r1 * Math.sin(phi1) * Math.sin(theta1);
      positions[i * 6 + 2] = r1 * Math.cos(phi1);
      
      // Line end
      positions[i * 6 + 3] = r2 * Math.sin(phi2) * Math.cos(theta2);
      positions[i * 6 + 4] = r2 * Math.sin(phi2) * Math.sin(theta2);
      positions[i * 6 + 5] = r2 * Math.cos(phi2);
      
      // Colors
      const c = new THREE.Color(color);
      colors[i * 6] = c.r;
      colors[i * 6 + 1] = c.g;
      colors[i * 6 + 2] = c.b;
      colors[i * 6 + 3] = c.r;
      colors[i * 6 + 4] = c.g;
      colors[i * 6 + 5] = c.b;
    }
    
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    return geo;
  }, [color]);
  
  useFrame(() => {
    // Update particles
    if (particlesRef.current) {
      const positions = particlesRef.current.geometry.attributes.position.array;
      const velocities = particlesRef.current.geometry.attributes.velocity.array;
      
      particlesRef.current.geometry.userData.age += 1;
      const age = particlesRef.current.geometry.userData.age;
      
      // Fade out over time
      particlesRef.current.material.opacity = Math.max(0, 1 - age / 120);
      
      for (let i = 0; i < positions.length; i += 3) {
        // Apply velocity
        positions[i] += velocities[i];
        positions[i + 1] += velocities[i + 1];
        positions[i + 2] += velocities[i + 2];
        
        // Slow down
        velocities[i] *= 0.99;
        velocities[i + 1] *= 0.99;
        velocities[i + 2] *= 0.99;
      }
      
      particlesRef.current.geometry.attributes.position.needsUpdate = true;
    }
    
    // Update electric arcs
    if (lineRef.current) {
      const positions = lineRef.current.geometry.attributes.position.array;
      
      for (let i = 0; i < positions.length; i += 6) {
        // Randomly update some line endpoints for sparking effect
        if (Math.random() < 0.1) {
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos(2 * Math.random() - 1);
          const r = 1 + Math.random() * 2;
          
          positions[i + 3] = r * Math.sin(phi) * Math.cos(theta);
          positions[i + 4] = r * Math.sin(phi) * Math.sin(theta);
          positions[i + 5] = r * Math.cos(phi);
        }
      }
      
      lineRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });
  
  return (
    <group position={position}>
      <points ref={particlesRef} geometry={particlesGeometry}>
        <pointsMaterial
          size={0.15}
          color={color}
          transparent
          opacity={1}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
        />
      </points>
      
      <lineSegments ref={lineRef} geometry={linesGeometry}>
        <lineBasicMaterial 
          vertexColors 
          transparent
          opacity={0.8}
          blending={THREE.AdditiveBlending}
        />
      </lineSegments>
    </group>
  );
};

// Neon wireframe that surrounds the immune sphere
const ImmuneWireframe = ({ scale, color }) => {
  const wireframeRef = useRef();
  
  useFrame(({ clock }) => {
    if (wireframeRef.current) {
      const time = clock.getElapsedTime();
      wireframeRef.current.rotation.x = time * -0.05;
      wireframeRef.current.rotation.y = time * 0.07;
    }
  });
  
  return (
    <mesh ref={wireframeRef} scale={[scale * 1.15, scale * 1.15, scale * 1.15]}>
      <octahedronGeometry args={[1, 1]} />
      <meshBasicMaterial 
        color={color} 
        wireframe={true} 
        transparent={true} 
        opacity={0.6}
      />
    </mesh>
  );
};

export default function ImmuneZones({ pressure, position, label }) {
  const scale = useMemo(() => 0.8 + pressure / 50, [pressure]);
  const burstThreshold = 80;
  const criticalThreshold = 95;
  const isBursting = pressure > burstThreshold;
  const isCritical = pressure > criticalThreshold;
  
  const [hasRuptured, setHasRuptured] = useState(false);
  const [showLabel, setShowLabel] = useState(false);
  
  // Intensity increases with pressure
  const intensity = pressure / 100;
  
  // Base color for the immune system
  const baseColor = useMemo(() => new THREE.Color(0.1, 0.4, 0.8), []);
  
  // Generate bright neon particle color for the effects
  const particleColor = useMemo(() => {
    return new THREE.Color(0.2, 0.7, 1);
  }, []);
  
  // Handle critical rupture
  useEffect(() => {
    if (isCritical && !hasRuptured) {
      setHasRuptured(true);
    } else if (!isCritical && hasRuptured) {
      setHasRuptured(false);
    }
  }, [isCritical, hasRuptured]);
  
  // Scale animation
  const groupRef = useRef();
  useFrame(({ clock }) => {
    if (groupRef.current) {
      if (isCritical) {
        // Collapse during rupture
        const collapseScale = Math.max(0.5, 2 * scale * (1 - (pressure - criticalThreshold) / 10));
        groupRef.current.scale.set(collapseScale, collapseScale, collapseScale);
      } else {
        // Base scale with slight pulsating
        const time = clock.getElapsedTime();
        const pulse = 1 + Math.sin(time * 3) * 0.05 * intensity;
        groupRef.current.scale.set(scale * pulse * 2, scale * pulse * 2, scale * pulse * 2);
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
    
      {!hasRuptured && (
        <>
          <ProtectiveField pressure={pressure} radius={1.2} />
          <mesh>
            <sphereGeometry args={[1, 32, 32]} />
            <meshPhysicalMaterial
              color={baseColor}
              emissive={new THREE.Color(0.2, 0.5, 1)}
              emissiveIntensity={pressure / 50}
              clearcoat={1}
              clearcoatRoughness={0}
              roughness={0.3}
            />
          </mesh>
          <ImmuneWireframe scale={scale} color={particleColor} />
        </>
      )}
      
      {/* Particles are always visible */}
      <ImmuneParticles 
        pressure={pressure} 
        count={isBursting ? 150 : 50} 
        color={particleColor} 
      />
      
      {/* Show rupture effect when critical */}
      {hasRuptured && <ImmuneRupture position={[0, 0, 0]} color={particleColor} />}
    </group>
  );
}
