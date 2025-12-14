import React, { useState, useEffect, useRef, useMemo, useCallback, Suspense, Component } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Physics, usePlane, useBox, useSphere, useCylinder, useTrimesh } from '@react-three/cannon';
import {
  OrbitControls,
  Text,
  Float,
  RoundedBox,
  Environment,
  PerspectiveCamera,
  ContactShadows,
  Torus,
  useTexture,
  Stars,
  Sparkles,
  Grid
} from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
import * as THREE from 'three';
import { v4 as uuidv4 } from 'uuid';

// --- Configuration ---
const THEME = {
  neonBlue: '#00f3ff',
  neonPink: '#ff00aa',
  neonGold: '#ffd700',
  neonGreen: '#00ffaa',
  neonPurple: '#aa00ff',
  neonOrange: '#ffaa00',
  darkMetal: '#1a1a1a',
  glass: '#ffffff'
};

const DEFAULT_FATES = [
  "SSR Pull Incoming",
  "Isekai Protagonist",
  "Critical Hit!",
  "New Game Plus",
  "Plot Armor Active",
  "Flow State Achieved",
  "Zero Bug Deploy",
  "Inbox Zero",
  "Stay Hydrated",
  "Touch Grass",
  "Good Night's Sleep",
  "Level Up!",
  "Gacha Luck Boost",
  "Clean Code Karma"
];

const DEFAULT_SQUAD = [
  "Player One",
  "Player Two",
  "Player Three",
  "Player Four",
  "Player Five"
];

// --- Types ---
interface GameConfig {
  globe: {
    centerY: number;
    radius: number;
  };
  spawn: {
    yMin: number;
    yMax: number;
    spawnRadius: number;
  };
  mascot: {
    x: number;
    y: number;
    z: number;
  };
  tray: {
    barrierZ: number;
    barrierWidth: number;
    barrierHeight: number;
  };
  graphics: {
    bloomEnabled: boolean;
    bloomThreshold: number;
    bloomIntensity: number;
    neonIntensity: number;
    gridHeight: number;
  };
}

const INITIAL_CONFIG: GameConfig = {
  globe: { centerY: 5.8, radius: 3 },
  spawn: { yMin: 4.5, yMax: 7.0, spawnRadius: 2.5 },
  mascot: { x: -1.8, y: 2, z: 3.5 },
  tray: { barrierZ: 5, barrierWidth: 6, barrierHeight: 3 },
  graphics: {
    bloomEnabled: true,
    bloomThreshold: 0.9,
    bloomIntensity: 0.8,
    neonIntensity: 1.5,
    gridHeight: 0.1
  }
};

// --- Sound Manager ---
class SoundManager {
  ctx: any | null = null;
  masterGain: any | null = null;
  volume: number = 0.5;
  isMuted: boolean = false;

  constructor() {
    // Lazy initialization handled in init()
  }

  init() {
    if (!this.ctx) {
      const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioContextClass();
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);
      this.updateVolume();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  updateVolume() {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
    }
  }

  setVolume(val: number) {
    this.volume = val;
    this.updateVolume();
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    this.updateVolume();
    return this.isMuted;
  }

  // Effect: Short UI Click
  playClick() {
    this.init();
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(1200, t + 0.05);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);

    osc.start();
    osc.stop(t + 0.1);
  }

  // Effect: Spin Up
  playSpin() {
    this.init();
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(50, t);
    osc.frequency.linearRampToValueAtTime(600, t + 1.5);

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.2, t + 0.5);
    gain.gain.linearRampToValueAtTime(0, t + 1.5);

    osc.start();
    osc.stop(t + 1.5);
  }

  // Effect: Prize Spawn (Thump)
  playSpawn() {
    this.init();
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.type = 'square';
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.3);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);

    osc.start();
    osc.stop(t + 0.3);
  }

  // Effect: Fanfare (Major Chord)
  playFanfare() {
    this.init();
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;

    const notes = [440, 554.37, 659.25]; // A Major
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + i * 0.1);

      gain.gain.setValueAtTime(0, t + i * 0.1);
      gain.gain.linearRampToValueAtTime(0.2, t + i * 0.1 + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, t + i * 0.1 + 1.5);

      osc.start(t + i * 0.1);
      osc.stop(t + i * 0.1 + 1.5);
    });
  }
}

const soundManager = new SoundManager();

// --- Helpers ---
const convertDriveLink = (url: string) => {
  if (!url) return '';

  // Specific Google Drive Handling
  if (url.includes('drive.google.com')) {
    // Try to find /d/ID or id=ID
    const idMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
    if (idMatch && idMatch[1]) {
      return `https://drive.google.com/uc?export=view&id=${idMatch[1]}`;
    }
  }

  return url;
};

// Shuffle helper for Gift Mode (Fisher-Yates)
function shuffleArray(array: string[]) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// --- Error Boundary for Textures ---
interface TextureErrorBoundaryProps {
  children?: React.ReactNode;
  fallback: React.ReactNode;
}

interface TextureErrorBoundaryState {
  hasError: boolean;
}

class TextureErrorBoundary extends React.Component<TextureErrorBoundaryProps, TextureErrorBoundaryState> {
  state: TextureErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: any) {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.warn("Mascot failed to load:", error);
  }

  componentDidUpdate(prevProps: TextureErrorBoundaryProps) {
    if (this.props.children !== prevProps.children) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

// --- 3D Components ---

const Floor = ({ gridHeight }: { gridHeight: number }) => {
  const [ref] = usePlane(() => ({
    rotation: [-Math.PI / 2, 0, 0],
    position: [0, 0, 0], // Floor at y=0
    material: { friction: 0.1, restitution: 0.5 }
  }));
  return (
    <group>
      <mesh ref={ref}>
        <planeGeometry args={[100, 100]} />
        {/* Dark reflective floor - Increased roughness to prevent shimmer */}
        <meshStandardMaterial color="#050505" roughness={0.5} metalness={0.5} />
      </mesh>
      {/* Visual Neon Grid Overlay */}
      <Grid
        renderOrder={1}
        position={[0, gridHeight, 0]}
        infiniteGrid
        cellSize={1}
        cellThickness={0.5}
        sectionSize={3}
        sectionThickness={1}
        sectionColor={THEME.neonPink}
        cellColor={THEME.neonBlue}
        fadeDistance={30}
      />
    </group>
  );
};

// The transparent container for the balls
const GlassGlobe: React.FC<{ config: GameConfig['globe'], debug: boolean }> = ({ config, debug }) => {
  const { centerY, radius } = config;

  // Generate a Sphere geometry for the physics trimesh
  const { vertices, indices } = useMemo(() => {
    const geo = new THREE.SphereGeometry(radius, 16, 12);
    const posAttribute = geo.attributes.position;
    const indexAttribute = geo.index;

    if (!posAttribute || !indexAttribute) {
      return { vertices: [], indices: [] };
    }

    const pos = Array.from(posAttribute.array);
    const idx = Array.from(indexAttribute.array);

    // Invert indices to flip normals inward for the "container" effect
    const invertedIdx = [];
    for (let i = 0; i < idx.length; i += 3) {
      invertedIdx.push(idx[i + 2], idx[i + 1], idx[i]);
    }

    return { vertices: pos, indices: invertedIdx };
  }, [radius]);

  // Physics Body: Hollow Sphere (Trimesh)
  useTrimesh(() => ({
    args: [vertices as any, indices as any],
    position: [0, centerY, 0],
    type: 'Static',
    material: { friction: 0.0, restitution: 0.9 }
  }));

  // Base structure physics (keeps the neck solid)
  useCylinder(() => ({
    position: [0, 1.5, 0], // Sits on top of the base
    rotation: [0, 0, 0],
    args: [3, 0.5, 2, 16], // Tapers down to chute
    type: 'Static'
  }));

  return (
    <group position={[0, centerY, 0]}>
      {/* Visual Glass Sphere */}
      <mesh>
        <sphereGeometry args={[radius + 0.1, 32, 32]} />
        <meshPhysicalMaterial
          color={THEME.glass}
          transmission={0.9}
          opacity={0.3}
          transparent
          roughness={0.1}
          metalness={0.1}
          thickness={1}
          ior={1.5}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Decorative Rings */}
      <Torus args={[radius + 0.2, 0.08, 16, 100]} rotation={[Math.PI / 2, 0, 0]}>
        <meshStandardMaterial color={THEME.neonBlue} emissive={THEME.neonBlue} emissiveIntensity={1.5} toneMapped={false} />
      </Torus>

      {/* Debug Visuals for Invisible Wall */}
      {debug && (
        <mesh>
          <sphereGeometry args={[radius, 16, 12]} />
          <meshBasicMaterial wireframe color="red" side={THREE.BackSide} />
        </mesh>
      )}
    </group>
  );
};

const MachineBase: React.FC<{ config: GameConfig['tray'], graphics: GameConfig['graphics'], debug: boolean, gameState: string }> = ({ config, graphics, debug, gameState }) => {
  const { barrierZ, barrierWidth, barrierHeight } = config;

  // Propeller / Fan Animation Logic
  const propellerRef = useRef<THREE.Group>(null);
  const currentSpeed = useRef(0);

  useFrame((state, delta) => {
    if (propellerRef.current) {
      // Target speed: 25 when spinning, 0 when idle (Complete stop)
      const targetSpeed = gameState === 'SPINNING' ? 25 : 0;
      // Smoothly interpolate current speed towards target
      currentSpeed.current = THREE.MathUtils.lerp(currentSpeed.current, targetSpeed, delta * 2);

      // Apply rotation
      propellerRef.current.rotation.z -= currentSpeed.current * delta;
    }
  });

  // Main Cylindrical Body Physics
  useCylinder(() => ({
    position: [0, 1.5, 0],
    args: [2.4, 2.7, 3, 16], // Matches the overall shape roughly
    type: 'Static',
    material: { friction: 0.1, restitution: 0.5 }
  }));

  // Tray Physics (small box sticking out to catch balls - the floor of the tray)
  useBox(() => ({
    position: [0, 0.6, 2.6],
    args: [1.6, 0.1, 0.8],
    type: 'Static'
  }));

  // --- TRAY BARRIERS (Invisible) ---
  // Front Barrier to stop ball falling off
  useBox(() => ({
    position: [0, 1.0, barrierZ],
    args: [barrierWidth, barrierHeight, 0.1],
    type: 'Static',
    material: { friction: 0.1, restitution: 0.1 }
  }));

  // Left Barrier (adjusted by width)
  useBox(() => ({
    position: [-(barrierWidth / 2 + 0.05), 1.0, 2.6],
    args: [0.1, barrierHeight, 0.8],
    type: 'Static'
  }));

  // Right Barrier (adjusted by width)
  useBox(() => ({
    position: [(barrierWidth / 2 + 0.05), 1.0, 2.6],
    args: [0.1, barrierHeight, 0.8],
    type: 'Static'
  }));
  // ---------------------

  // Futuristic Materials
  const cyberMetal = <meshStandardMaterial color="#1a1a2e" metalness={0.8} roughness={0.2} />;
  const cyberDark = <meshStandardMaterial color="#050510" metalness={0.5} roughness={0.5} />;
  const neonBlueMat = <meshStandardMaterial color={THEME.neonBlue} emissive={THEME.neonBlue} emissiveIntensity={graphics.neonIntensity} toneMapped={false} />;
  const neonPinkMat = <meshStandardMaterial color={THEME.neonPink} emissive={THEME.neonPink} emissiveIntensity={graphics.neonIntensity} toneMapped={false} />;
  const debugMat = <meshBasicMaterial color="red" wireframe transparent opacity={0.5} />;

  return (
    <group position={[0, 0, 0]}>
      {/* 1. Base Platform (Octagonal Tech Base) */}
      <group position={[0, 0.3, 0]}>
        {/* Main Foot */}
        <mesh receiveShadow>
          <cylinderGeometry args={[2.8, 3.2, 0.6, 8]} /> {/* Octagon base */}
          {cyberMetal}
        </mesh>
        {/* Neon Ground Ring */}
        <mesh position={[0, -0.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[3.3, 0.05, 16, 100]} />
          {neonBlueMat}
        </mesh>
      </group>

      {/* 2. Main Body (Tech Pillar) */}
      <group position={[0, 1.8, 0]}>
        {/* Core Cylinder */}
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[2.4, 2.4, 2.4, 32]} />
          {cyberMetal}
        </mesh>

        {/* Vertical Neon Accents */}
        {[0, 90, 180, 270].map((deg, i) => (
          <group key={i} rotation={[0, deg * Math.PI / 180, 0]}>
            <mesh position={[2.35, 0, 0]}>
              <boxGeometry args={[0.2, 2.4, 0.1]} />
              {cyberDark}
            </mesh>
            <mesh position={[2.38, 0, 0]}>
              <boxGeometry args={[0.05, 2.2, 0.05]} />
              {neonBlueMat}
            </mesh>
          </group>
        ))}
      </group>

      {/* 3. Neck Ring (Glowing Connector) */}
      <group position={[0, 3.05, 0]}>
        <mesh>
          <cylinderGeometry args={[2.6, 2.6, 0.2, 32]} />
          {cyberDark}
        </mesh>
        <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[2.65, 0.05, 16, 100]} />
          {neonPinkMat}
        </mesh>
      </group>

      {/* 4. Faceplate Assembly (Holographic/Tech Interface) */}
      <group position={[0, 1.4, 2.35]}>

        {/* Back Panel */}
        <mesh position={[0, 0, -0.1]}>
          <boxGeometry args={[1.8, 1.6, 0.2]} />
          {cyberDark}
        </mesh>

        {/* Chute Opening Frame */}
        <group position={[0, -0.2, 0.06]}>
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[0.9, 0.8, 0.05]} />
            {neonBlueMat}
          </mesh>
          <mesh position={[0, 0, 0.01]}>
            <boxGeometry args={[0.8, 0.7, 0.05]} />
            <meshStandardMaterial color="#000" roughness={0.1} />
          </mesh>
        </group>

        {/* High-Tech Handle/Knob */}
        <group position={[0, 0.7, 0.1]} ref={propellerRef}>
          {/* Axle */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.2, 0.2, 0.3, 16]} />
            {cyberMetal}
          </mesh>
          {/* Handle (Single Bar) - NOW NEON BLUE */}
          <mesh position={[0, 0, 0.15]}>
            <RoundedBox args={[1.5, 0.3, 0.1]} radius={0.05} smoothness={4}>
              {neonBlueMat}
            </RoundedBox>
          </mesh>
          {/* Center Cap */}
          <mesh position={[0, 0, 0.15]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.15, 0.15, 0.2, 16]} />
            {cyberDark}
          </mesh>
        </group>

        {/* Tray Lip - Futuristic Catch */}
        <group position={[0, -0.8, 0.25]}>
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[1.6, 0.15, 0.5]} />
            {cyberMetal}
          </mesh>
          {/* Glowing Edge on Tray */}
          <mesh position={[0, 0.08, 0.25]}>
            <boxGeometry args={[1.6, 0.02, 0.02]} />
            {neonBlueMat}
          </mesh>
        </group>
      </group>

      {/* Debug view for Invisible Walls */}
      {debug && (
        <group>
          {/* Front Wall Debug */}
          <mesh position={[0, 1.0, barrierZ]}>
            <boxGeometry args={[barrierWidth, barrierHeight, 0.1]} />
            {debugMat}
          </mesh>
        </group>
      )}
    </group>
  );
};

interface BallProps {
  position: [number, number, number];
  color: string;
  isPrize?: boolean;
  onClick?: () => void;
  forceImpulse?: number;
}

const Ball: React.FC<BallProps> = ({ position, color, isPrize, onClick, forceImpulse }) => {
  const [ref, api] = useSphere(() => ({
    mass: 1,
    position,
    args: [0.4],
    material: { restitution: 0.8, friction: 0.1 }
  }));

  // Apply random force when "spinning"
  useEffect(() => {
    if (forceImpulse) {
      api.wakeUp();
      api.applyImpulse(
        [(Math.random() - 0.5) * 15, (Math.random()) * 25, (Math.random() - 0.5) * 15],
        [0, 0, 0]
      );
    }
  }, [forceImpulse, api]);

  return (
    <mesh
      ref={ref as any}
      onClick={onClick}
      onPointerOver={() => (window as any).document.body.style.cursor = isPrize ? 'pointer' : 'default'}
      onPointerOut={() => (window as any).document.body.style.cursor = 'default'}
    >
      <sphereGeometry args={[0.4, 32, 32]} />
      <meshStandardMaterial
        color={color}
        emissive={isPrize ? color : 'black'}
        emissiveIntensity={isPrize ? 2 : 0}
        metalness={0.3}
        roughness={0.2}
      />
      {isPrize && (
        <pointLight distance={3} intensity={5} color={color} />
      )}
    </mesh>
  );
};

// --- Mascot Loading & Error Components ---

const MascotLoadingPlaceholder = ({ pos }: { pos: { x: number, y: number, z: number } }) => {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y += 0.05;
      ref.current.rotation.x += 0.02;
    }
  });
  return (
    <mesh ref={ref} position={[pos.x, pos.y, pos.z]}>
      <boxGeometry args={[2, 2, 2]} />
      <meshStandardMaterial wireframe color={THEME.neonBlue} />
      <Text position={[0, 1.5, 0]} color={THEME.neonBlue} fontSize={0.5} anchorX="center" anchorY="middle">
        LOADING...
      </Text>
    </mesh>
  );
};

const MascotErrorPlaceholder = ({ pos }: { pos: { x: number, y: number, z: number } }) => (
  <group position={[pos.x, pos.y, pos.z]}>
    <mesh>
      <boxGeometry args={[3, 3, 0.2]} />
      <meshStandardMaterial color="#330000" transparent opacity={0.8} />
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(3, 3, 0.2)]} />
        <lineBasicMaterial color="red" />
      </lineSegments>
    </mesh>
    <Text position={[0, 0, 0.2]} color="red" fontSize={0.5} anchorX="center" anchorY="middle">
      IMAGE ERROR
    </Text>
    <Text position={[0, -0.5, 0.2]} color="white" fontSize={0.2} anchorX="center" anchorY="middle">
      Check URL permissions
    </Text>
  </group>
);

// --- Mascot Component ---
const Mascot = ({ url, gameState, pos }: { url: string, gameState: string, pos: { x: number, y: number, z: number } }) => {
  const directUrl = useMemo(() => convertDriveLink(url), [url]);
  const texture = useTexture(directUrl);
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);

  // Calculate perfect aspect ratio scale
  const scale = useMemo(() => {
    if (!texture?.image) return [1, 1, 1] as [number, number, number];

    const { width, height } = texture.image as any;
    const aspect = width / height;

    // Bounds for the mascot
    const MAX_HEIGHT = 4;
    const MAX_WIDTH = 5;

    let w = MAX_HEIGHT * aspect;
    let h = MAX_HEIGHT;

    // If it's too wide, constrain width and adjust height
    if (w > MAX_WIDTH) {
      w = MAX_WIDTH;
      h = MAX_WIDTH / aspect;
    }

    return [w, h, 1] as [number, number, number];
  }, [texture]);

  useFrame((state) => {
    if (!groupRef.current || !meshRef.current) return;
    const t = state.clock.elapsedTime;

    // Base floating motion on the GROUP using dynamic Y
    groupRef.current.position.set(pos.x, pos.y + Math.sin(t * 1.5) * 0.2, pos.z);

    // Make the GROUP face the camera always
    groupRef.current.lookAt(state.camera.position);

    if (gameState === 'SPINNING') {
      // Excited shake animation on the MESH
      meshRef.current.rotation.z = Math.sin(t * 20) * 0.15;

      // Pulse effect on top of base scale
      const pulse = 1 + Math.sin(t * 15) * 0.1;
      meshRef.current.scale.set(scale[0] * pulse, scale[1] * pulse, 1);
    } else {
      // Gentle idle sway on the MESH
      meshRef.current.rotation.z = Math.sin(t * 0.5) * 0.05;

      // Smooth return to base scale
      meshRef.current.scale.x = THREE.MathUtils.lerp(meshRef.current.scale.x, scale[0], 0.1);
      meshRef.current.scale.y = THREE.MathUtils.lerp(meshRef.current.scale.y, scale[1], 0.1);
      meshRef.current.scale.z = 1;
    }
  });

  if (!directUrl) return null;

  return (
    <group ref={groupRef} position={[pos.x, pos.y, pos.z]}>
      <mesh ref={meshRef}>
        {/* Geometry is 1x1, scaled by the mesh scale calculated above */}
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          map={texture}
          transparent
          alphaTest={0.5}
          depthWrite={false}
          side={THREE.DoubleSide}
          toneMapped={false}
          color="#fff" // Ensure full brightness
        />
      </mesh>
    </group>
  );
};

// --- Main Game Scene ---

const GameScene = ({
  spinSignal,
  gameState,
  onPrizeClaim,
  prizeColor,
  fateList,
  mascotUrl,
  config,
  resetTrigger,
  debug,
  ballCount,
  onPieceSelected,
  fixedResult
}: {
  spinSignal: number,
  gameState: string,
  onPrizeClaim: (f: string) => void,
  prizeColor: string,
  fateList: string[],
  mascotUrl: string,
  config: GameConfig,
  resetTrigger: number,
  debug: boolean,
  ballCount: number,
  onPieceSelected?: (color: string) => void,
  fixedResult?: string | null
}) => {
  const [balls, setBalls] = useState<{ id: string, pos: [number, number, number], color: string }[]>([]);
  const [prizeVisible, setPrizeVisible] = useState(false);

  // Initialize balls on Reset/Load
  useEffect(() => {
    const arr = [];
    const colors = [THEME.neonBlue, THEME.neonPink, THEME.neonGold, THEME.neonGreen, THEME.neonPurple];
    const { yMin, yMax, spawnRadius } = config.spawn;
    const radius = spawnRadius || config.globe.radius * 0.8;

    for (let i = 0; i < ballCount; i++) {
      arr.push({
        id: uuidv4(),
        pos: [
          (Math.random() - 0.5) * radius,
          yMin + Math.random() * (yMax - yMin),
          (Math.random() - 0.5) * radius
        ] as [number, number, number],
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }
    setBalls(arr);
  }, [resetTrigger]); // Only re-run when explicit reset or load is triggered

  // Sync Balls dynamically without regenerating everything (prevents flicker)
  useEffect(() => {
    setBalls(prev => {
      const currentLen = prev.length;
      if (currentLen === ballCount) return prev;

      if (ballCount < currentLen) {
        // Remove the difference from end to keep others stable
        return prev.slice(0, ballCount);
      } else {
        // Add new balls
        const countToAdd = ballCount - currentLen;
        const newBalls = [];
        const colors = [THEME.neonBlue, THEME.neonPink, THEME.neonGold, THEME.neonGreen, THEME.neonPurple];
        const { yMin, yMax, spawnRadius } = config.spawn;
        const radius = spawnRadius || config.globe.radius * 0.8;

        for (let i = 0; i < countToAdd; i++) {
          newBalls.push({
            id: uuidv4(),
            pos: [
              (Math.random() - 0.5) * radius,
              yMin + Math.random() * (yMax - yMin),
              (Math.random() - 0.5) * radius
            ] as [number, number, number],
            color: colors[Math.floor(Math.random() * colors.length)]
          });
        }
        return [...prev, ...newBalls];
      }
    });
  }, [ballCount, config.spawn, config.globe.radius]);

  // Notify parent of the next ball color when spinning starts
  useEffect(() => {
    if (gameState === 'SPINNING' && balls.length > 0) {
      // The ball that will be removed is the last one in the array (due to slice(0, ballCount))
      const nextBall = balls[balls.length - 1];
      if (onPieceSelected) {
        onPieceSelected(nextBall.color);
      }
    }
  }, [gameState]); // balls is in closure but triggered on gameState change

  // Handle Spin Signal
  useEffect(() => {
    if (spinSignal > 0) {
      setPrizeVisible(false);
      setTimeout(() => {
        setPrizeVisible(true);
        soundManager.playSpawn();
      }, 1500);
    }
  }, [spinSignal]);

  return (
    <>
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      <Sparkles color={THEME.neonBlue} count={50} scale={10} size={4} speed={0.4} opacity={0.5} />

      {/* 
         Key GlassGlobe with JSON.stringify(config.globe) so it remounts when physics geometry changes.
         This is necessary for 'useBox' args to update in the physics world.
      */}
      <GlassGlobe key={JSON.stringify(config.globe)} config={config.globe} debug={debug} />

      {/* 
        Key MachineBase with JSON.stringify(config.tray) to remount on config change, 
        ensuring physics bodies update.
        Passed gameState to animate the propeller.
      */}
      <MachineBase key={JSON.stringify(config.tray)} config={config.tray} graphics={config.graphics} debug={debug} gameState={gameState} />
      <Floor gridHeight={config.graphics.gridHeight} />

      {balls.map(b => (
        <Ball
          key={b.id}
          position={b.pos}
          color={b.color}
          forceImpulse={spinSignal}
        />
      ))}

      {/* The Prize Ball - Spawns in front of the chute */}
      {prizeVisible && gameState === 'RESULT' && (
        <Ball
          position={[0, 1.5, 2.6]}
          color={prizeColor} // Uses color synced with removed ball
          isPrize={true}
          onClick={() => {
            soundManager.playFanfare();
            // Pick result: If fixedResult provided (GIFT mode), use it. Else random from list.
            const f = fixedResult || (fateList.length > 0 ? fateList[Math.floor(Math.random() * fateList.length)] : "NO TARGETS");
            onPrizeClaim(f);
            setPrizeVisible(false);
          }}
        />
      )}

      {/* 
        Mascot Loading Isolation:
        Wrapped in its own Suspense so the rest of the game loads immediately.
      */}
      {mascotUrl && (
        <TextureErrorBoundary fallback={<MascotErrorPlaceholder pos={config.mascot} />}>
          <Suspense fallback={<MascotLoadingPlaceholder pos={config.mascot} />}>
            <Mascot url={mascotUrl} gameState={gameState} pos={config.mascot} />
          </Suspense>
        </TextureErrorBoundary>
      )}

      <spotLight position={[0, 15, 0]} angle={0.3} penumbra={0.5} intensity={10} castShadow />
      <pointLight position={[5, 10, 5]} intensity={5} color={THEME.neonBlue} />
      <pointLight position={[-5, 10, 5]} intensity={5} color={THEME.neonPink} />
    </>
  );
};

// --- Dev Tools Component ---
const DevTools = ({
  config,
  setConfig,
  onRespawn,
  visible
}: {
  config: GameConfig,
  setConfig: React.Dispatch<React.SetStateAction<GameConfig>>,
  onRespawn: () => void,
  visible: boolean
}) => {
  if (!visible) return null;

  const handleChange = (section: keyof GameConfig, key: string, val: any) => {
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: val
      }
    }));
  };

  const styleRow = {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
    fontSize: '12px',
    color: '#ccc',
    alignItems: 'center'
  };

  const styleInput = {
    background: '#333',
    border: '1px solid #555',
    color: '#fff',
    width: '60px',
    padding: '2px 5px'
  };

  return (
    <div style={{
      position: 'absolute',
      top: '80px',
      left: '30px',
      width: '280px',
      background: 'rgba(0,0,0,0.85)',
      border: `1px solid ${THEME.neonGold}`,
      borderRadius: '8px',
      padding: '15px',
      pointerEvents: 'auto',
      zIndex: 200,
      backdropFilter: 'blur(5px)'
    }}>
      <h3 style={{ margin: '0 0 10px 0', color: THEME.neonGold, fontSize: '14px', borderBottom: '1px solid #444', paddingBottom: '5px' }}>
        DEV TOOLS
      </h3>

      <div style={{ marginBottom: '15px' }}>
        <strong style={{ display: 'block', color: THEME.neonBlue, fontSize: '12px', marginBottom: '5px' }}>GLOBE</strong>
        <div style={styleRow}>
          <span>Center Y</span>
          <input type="number" step="0.1" value={config.globe.centerY} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('globe', 'centerY', parseFloat((e.target as any).value))} style={styleInput} />
        </div>
        <div style={styleRow}>
          <span>Radius</span>
          <input type="number" step="0.1" value={config.globe.radius} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('globe', 'radius', parseFloat((e.target as any).value))} style={styleInput} />
        </div>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <strong style={{ display: 'block', color: THEME.neonGreen, fontSize: '12px', marginBottom: '5px' }}>BALL SPAWN</strong>
        <div style={styleRow}>
          <span>Min Y</span>
          <input type="number" step="0.1" value={config.spawn.yMin} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('spawn', 'yMin', parseFloat((e.target as any).value))} style={styleInput} />
        </div>
        <div style={styleRow}>
          <span>Max Y</span>
          <input type="number" step="0.1" value={config.spawn.yMax} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('spawn', 'yMax', parseFloat((e.target as any).value))} style={styleInput} />
        </div>
        <button onClick={onRespawn} style={{ width: '100%', background: '#333', color: 'white', border: '1px solid #555', cursor: 'pointer', padding: '5px' }}>
          RESPAWN BALLS
        </button>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <strong style={{ display: 'block', color: THEME.neonGold, fontSize: '12px', marginBottom: '5px' }}>TRAY BARRIER (Invisible)</strong>
        <div style={styleRow}>
          <span>Front Z</span>
          <input type="number" step="0.05" value={config.tray.barrierZ} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('tray', 'barrierZ', parseFloat((e.target as any).value))} style={styleInput} />
        </div>
        <div style={styleRow}>
          <span>Height</span>
          <input type="number" step="0.1" value={config.tray.barrierHeight} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('tray', 'barrierHeight', parseFloat((e.target as any).value))} style={styleInput} />
        </div>
        <div style={styleRow}>
          <span>Width</span>
          <input type="number" step="0.1" value={config.tray.barrierWidth} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('tray', 'barrierWidth', parseFloat((e.target as any).value))} style={styleInput} />
        </div>
      </div>

      <div>
        <strong style={{ display: 'block', color: THEME.neonPink, fontSize: '12px', marginBottom: '5px' }}>MASCOT POS</strong>
        <div style={styleRow}>
          <span>X</span>
          <input type="number" step="0.5" value={config.mascot.x} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('mascot', 'x', parseFloat((e.target as any).value))} style={styleInput} />
        </div>
        <div style={styleRow}>
          <span>Y</span>
          <input type="number" step="0.5" value={config.mascot.y} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('mascot', 'y', parseFloat((e.target as any).value))} style={styleInput} />
        </div>
        <div style={styleRow}>
          <span>Z</span>
          <input type="number" step="0.5" value={config.mascot.z} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('mascot', 'z', parseFloat((e.target as any).value))} style={styleInput} />
        </div>
      </div>

      <div>
        <strong style={{ display: 'block', color: '#fff', fontSize: '12px', marginBottom: '5px' }}>GRAPHICS</strong>
        <div style={styleRow}>
          <span>Bloom Open</span>
          <input type="checkbox" checked={config.graphics.bloomEnabled} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('graphics', 'bloomEnabled', (e.target as any).checked ? 1 : 0)} style={{ cursor: 'pointer' }} />
        </div>
        <div style={styleRow}>
          <span>Threshold</span>
          <input type="number" step="0.05" value={config.graphics.bloomThreshold} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('graphics', 'bloomThreshold', parseFloat((e.target as any).value))} style={styleInput} />
        </div>
        <div style={styleRow}>
          <span>Intensity</span>
          <input type="number" step="0.1" value={config.graphics.bloomIntensity} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('graphics', 'bloomIntensity', parseFloat((e.target as any).value))} style={styleInput} />
        </div>
        <div style={styleRow}>
          <span>Neon Power</span>
          <input type="number" step="0.1" value={config.graphics.neonIntensity} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('graphics', 'neonIntensity', parseFloat((e.target as any).value))} style={styleInput} />
        </div>
        <div style={styleRow}>
          <span>Grid Height</span>
          <input type="number" step="0.01" value={config.graphics.gridHeight} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('graphics', 'gridHeight', parseFloat((e.target as any).value))} style={styleInput} />
        </div>
      </div>
    </div>
  );
};

// --- Editor UI ---
const FateEditor = ({
  isOpen,
  onClose,
  fates,
  setFates,
  squadList,
  setSquadList,
  mascotUrl,
  setMascotUrl,
  devMode,
  setDevMode,
  mode
}: {
  isOpen: boolean,
  onClose: () => void,
  fates: string[],
  setFates: (f: string[]) => void,
  squadList: string[],
  setSquadList: (f: string[]) => void,
  mascotUrl: string,
  setMascotUrl: (url: string) => void,
  devMode: boolean,
  setDevMode: (b: boolean) => void,
  mode: 'FATE' | 'SQUAD' | 'GIFT'
}) => {
  const [newFate, setNewFate] = useState('');
  const [localMascotUrl, setLocalMascotUrl] = useState(mascotUrl);
  // Default to squad edit if in Gift mode
  const [activeTab, setActiveTab] = useState<'FATE' | 'SQUAD'>(mode === 'GIFT' ? 'SQUAD' : mode);
  const [squadText, setSquadText] = useState(squadList.join('\n'));

  // Sync local state if parent state changes (reset)
  useEffect(() => {
    setLocalMascotUrl(mascotUrl);
  }, [mascotUrl]);

  // Keep squad text synced when opening/switching
  useEffect(() => {
    if (isOpen) {
      setSquadText(squadList.join('\n'));
      setActiveTab(mode === 'GIFT' ? 'SQUAD' : mode);
    }
  }, [isOpen, squadList, mode]);

  const handleSquadTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = (e.target as any).value;
    setSquadText(val);
    const lines = val.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    setSquadList(lines);
  };

  if (!isOpen) return null;

  const handleAddFate = () => {
    if (newFate.trim()) {
      setFates([...fates, newFate.trim()]);
      setNewFate('');
      soundManager.playClick();
    }
  };

  const handleDeleteFate = (index: number) => {
    const next = [...fates];
    next.splice(index, 1);
    setFates(next);
    soundManager.playClick();
  };

  const applyMascot = () => {
    setMascotUrl(localMascotUrl);
    soundManager.playClick();
  };

  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
      background: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(10px)',
      zIndex: 100,
      pointerEvents: 'auto'
    }}>
      <div style={{
        background: '#111',
        border: `2px solid ${activeTab === 'FATE' ? THEME.neonBlue : THEME.neonGreen}`,
        padding: '30px',
        borderRadius: '10px',
        width: '600px',
        maxWidth: '90%',
        maxHeight: '90%',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: `0 0 40px ${activeTab === 'FATE' ? 'rgba(0,243,255,0.2)' : 'rgba(0,255,170,0.2)'}`
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, color: '#fff', fontFamily: "'Rajdhani', sans-serif" }}>SYSTEM CONFIG</h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent', border: 'none', color: '#fff', fontSize: '24px', cursor: 'pointer'
            }}
          >✕</button>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', borderBottom: '1px solid #333', marginBottom: '20px' }}>
          <button
            onClick={() => setActiveTab('FATE')}
            style={{
              flex: 1,
              background: activeTab === 'FATE' ? '#222' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'FATE' ? `2px solid ${THEME.neonBlue}` : 'none',
              color: activeTab === 'FATE' ? THEME.neonBlue : '#666',
              padding: '10px',
              cursor: 'pointer',
              fontFamily: "'Rajdhani', sans-serif",
              fontWeight: 'bold',
              fontSize: '1.1rem'
            }}
          >
            FATE LIST
          </button>
          <button
            onClick={() => setActiveTab('SQUAD')}
            style={{
              flex: 1,
              background: activeTab === 'SQUAD' ? '#222' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'SQUAD' ? `2px solid ${THEME.neonGreen}` : 'none',
              color: activeTab === 'SQUAD' ? THEME.neonGreen : '#666',
              padding: '10px',
              cursor: 'pointer',
              fontFamily: "'Rajdhani', sans-serif",
              fontWeight: 'bold',
              fontSize: '1.1rem'
            }}
          >
            SQUAD / GIFT LIST
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {activeTab === 'FATE' ? (
            <>
              <h3 style={{ color: '#aaa', margin: '0 0 10px 0', fontSize: '1rem' }}>RANDOM FATES</h3>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                <input
                  type="text"
                  value={newFate}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewFate((e.target as any).value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddFate()}
                  placeholder="Enter new fate..."
                  style={{
                    flex: 1,
                    background: '#222',
                    border: '1px solid #444',
                    color: 'white',
                    padding: '10px',
                    fontFamily: "'Rajdhani', sans-serif",
                    fontSize: '16px'
                  }}
                />
                <button
                  onClick={handleAddFate}
                  style={{
                    background: THEME.neonBlue,
                    color: '#000',
                    border: 'none',
                    padding: '10px 20px',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >ADD</button>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', borderTop: '1px solid #333', marginBottom: '20px' }}>
                {fates.map((item, idx) => (
                  <div key={idx} style={{
                    display: 'flex', justifyContent: 'space-between', padding: '10px', borderBottom: '1px solid #222', alignItems: 'center'
                  }}>
                    <span>{item}</span>
                    <button
                      onClick={() => handleDeleteFate(idx)}
                      style={{
                        background: 'transparent',
                        color: THEME.neonPink,
                        border: `1px solid ${THEME.neonPink}`,
                        padding: '5px 10px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >DELETE</button>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <h3 style={{ color: '#aaa', margin: '0 0 10px 0', fontSize: '1rem' }}>BULK ENTRY (ONE NAME PER LINE)</h3>
              <textarea
                value={squadText}
                onChange={handleSquadTextChange}
                placeholder="Paste names here..."
                style={{
                  flex: 1,
                  background: '#222',
                  border: `1px solid ${THEME.neonGreen}`,
                  color: 'white',
                  padding: '15px',
                  fontFamily: 'monospace',
                  fontSize: '14px',
                  resize: 'none',
                  minHeight: '200px'
                }}
              />
              <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '10px', fontStyle: 'italic' }}>
                * This is the master list for Squad and Gift modes.
              </div>
            </>
          )}
        </div>

        {/* Common Configs */}
        <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #333' }}>
          <h3 style={{ color: '#aaa', margin: '0 0 10px 0', fontSize: '1rem' }}>MASCOT IMAGE</h3>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              value={localMascotUrl}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocalMascotUrl((e.target as any).value)}
              onBlur={applyMascot} // Auto apply on blur
              onKeyDown={(e) => e.key === 'Enter' && applyMascot()}
              placeholder="Paste Image Address (ex. https://xxx.jpg )"
              style={{
                flex: 1,
                background: '#222',
                border: '1px solid #444',
                color: 'white',
                padding: '10px',
                fontFamily: "'Rajdhani', sans-serif",
                fontSize: '14px'
              }}
            />
            <button
              onClick={applyMascot}
              style={{
                background: THEME.neonPurple,
                color: '#fff',
                border: 'none',
                padding: '0 15px',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >APPLY</button>
          </div>
        </div>

        {/* Dev Mode Toggle */}
        <div style={{ borderTop: '1px solid #333', marginTop: '15px', paddingTop: '15px', display: 'flex', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: devMode ? THEME.neonGold : '#666' }}>
            <input
              type="checkbox"
              checked={devMode}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDevMode((e.target as any).checked)}
              style={{ marginRight: '10px', cursor: 'pointer' }}
            />
            ENABLE DEV MODE
          </label>
        </div>
      </div>
    </div>
  );
};

const App = () => {
  const [gameState, setGameState] = useState<'IDLE' | 'SPINNING' | 'RESULT'>('IDLE');
  const [mode, setMode] = useState<'FATE' | 'SQUAD' | 'GIFT'>('FATE');

  const [fate, setFate] = useState<string | null>(null);
  const [spinCount, setSpinCount] = useState(0);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  // Data Lists
  const [fates, setFates] = useState<string[]>(DEFAULT_FATES);
  const [squadList, setSquadList] = useState<string[]>(DEFAULT_SQUAD);
  const [activeSquad, setActiveSquad] = useState<string[]>(DEFAULT_SQUAD);

  // Gift Mode State
  const [exchangeOrder, setExchangeOrder] = useState<string[]>([]);
  const [exchangeIndex, setExchangeIndex] = useState(0);

  const [prizeColor, setPrizeColor] = useState(THEME.neonGold);
  // Default mascot uses the shared asset served by bbits-web public folder
  const [mascotUrl, setMascotUrl] = useState('/vivi_heart.png');

  // Dev & Config State
  const [devMode, setDevMode] = useState(false);
  const [gameConfig, setGameConfig] = useState<GameConfig>(INITIAL_CONFIG);
  const [resetTrigger, setResetTrigger] = useState(0);

  // Audio State
  const [volume, setVolume] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);

  // Responsive State
  const [isMobile, setIsMobile] = useState(false);
  const [volumeExpanded, setVolumeExpanded] = useState(false);

  // Ref for click outside detection
  const volumeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile((window as any).innerWidth < 768);
    checkMobile();
    (window as any).addEventListener('resize', checkMobile);
    return () => (window as any).removeEventListener('resize', checkMobile);
  }, []);

  // Sync active squad with master list if not playing
  useEffect(() => {
    if (gameState === 'IDLE') {
      // Only if starting fresh or reset, but we want to persist active state during game.
      // We only reset active squad manually or on mode switch.
    }
  }, [squadList]);

  // Handle Mode Switch
  const toggleMode = () => {
    let newMode: 'FATE' | 'SQUAD' | 'GIFT' = 'FATE';
    if (mode === 'FATE') newMode = 'SQUAD';
    else if (mode === 'SQUAD') newMode = 'GIFT';
    else newMode = 'FATE';

    setMode(newMode);

    // Reset logic for specific modes
    if (newMode === 'SQUAD') {
      if (activeSquad.length === 0) {
        setActiveSquad([...squadList]);
      }
    } else if (newMode === 'GIFT') {
      setExchangeOrder([]);
      setExchangeIndex(0);
    }

    soundManager.playClick();
  };

  const handleReloadSquad = () => {
    setActiveSquad([...squadList]);
    soundManager.playClick();
    setResetTrigger(prev => prev + 1); // Respawn balls
  };

  const handleStartGift = () => {
    if (squadList.length < 2) {
      (window as any).alert("Add at least 2 people to the Squad List for an exchange!");
      return;
    }
    const shuffled = shuffleArray(squadList);
    setExchangeOrder(shuffled);
    setExchangeIndex(0);
    setGameState('IDLE');
    soundManager.playClick();
    setResetTrigger(prev => prev + 1);
  };

  const handleResetGift = () => {
    setExchangeOrder([]);
    setExchangeIndex(0);
    setGameState('IDLE');
    soundManager.playClick();
  };

  // Update volume expanded state based on mobile
  useEffect(() => {
    if (!isMobile) {
      setVolumeExpanded(true);
    } else {
      setVolumeExpanded(false);
    }
  }, [isMobile]);

  // Handle click outside to collapse volume on mobile
  useEffect(() => {
    const handleClickOutside = (event: any) => {
      // Accessing contains on HTMLDivElement safely and avoiding Node type error
      if (volumeRef.current && !(volumeRef.current as any).contains(event.target)) {
        if (isMobile && volumeExpanded) {
          setVolumeExpanded(false);
        }
      }
    };

    // Safely access document for environments missing DOM types
    const doc = (window as any).document;
    if (doc) {
      doc.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      if (doc) {
        doc.removeEventListener('mousedown', handleClickOutside);
      }
    };
  }, [isMobile, volumeExpanded]);

  const handleSpin = () => {
    if (gameState === 'SPINNING') return;

    // Resume audio context on first user interaction
    soundManager.init();
    soundManager.playSpin();

    setGameState('SPINNING');
    setFate(null);
    setSpinCount(s => s + 1);

    setTimeout(() => {
      setGameState('RESULT');
    }, 2000);
  };

  // Callback from GameScene when spinning starts to report which ball (color) is being selected
  const handlePieceSelected = (color: string) => {
    setPrizeColor(color);
  };

  const handleResult = (text: string) => {
    setFate(text);
    setGameState('IDLE');
    if (mode === 'SQUAD') {
      // Remove the picked person from the active squad
      setActiveSquad(prev => prev.filter(p => p !== text));
    } else if (mode === 'GIFT') {
      // Advance to next person in chain
      setExchangeIndex(prev => prev + 1);
    }
  };

  const toggleMute = () => {
    const muted = soundManager.toggleMute();
    setIsMuted(muted);
    soundManager.playClick();
  };

  const changeVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat((e.target as any).value);
    setVolume(v);
    soundManager.setVolume(v);
  };

  // Determine current ball count for GameScene
  const currentBallCount = useMemo(() => {
    if (mode === 'FATE') return 35;
    if (mode === 'SQUAD') {
      const base = activeSquad.length;
      if (gameState === 'RESULT' && base > 0) return base - 1;
      return base;
    }
    if (mode === 'GIFT') {
      if (exchangeOrder.length === 0) return squadList.length; // Balls represent potential players
      const remaining = exchangeOrder.length - exchangeIndex;
      // Decrease balls as gifts are claimed to show progress
      if (gameState === 'RESULT' && remaining > 0) return remaining - 1;
      return remaining;
    }
    return 20;
  }, [mode, activeSquad.length, gameState, exchangeOrder.length, exchangeIndex, squadList.length]);

  // Determine fixed result for GIFT mode
  const fixedResult = useMemo(() => {
    if (mode === 'GIFT' && exchangeOrder.length > 0) {
      // The current giver is index i.
      // They give to i+1.
      const nextIdx = (exchangeIndex + 1) % exchangeOrder.length;
      return exchangeOrder[nextIdx];
    }
    return null;
  }, [mode, exchangeOrder, exchangeIndex]);

  // Determine Current Giver Name
  const currentGiver = useMemo(() => {
    if (mode === 'GIFT' && exchangeOrder.length > 0 && exchangeIndex < exchangeOrder.length) {
      return exchangeOrder[exchangeIndex];
    }
    return null;
  }, [mode, exchangeOrder, exchangeIndex]);

  const modeColor = mode === 'FATE' ? THEME.neonBlue : (mode === 'SQUAD' ? THEME.neonGreen : THEME.neonOrange);

  return (
    <>
      <div style={{ position: 'absolute', zIndex: 1, width: '100%', height: '100%', pointerEvents: 'none' }}>

        {/* Header */}
        <div style={{ position: 'absolute', top: 30, left: 30 }}>
          <h1 style={{
            margin: 0,
            fontSize: '4rem',
            fontFamily: "'Zen Tokyo Zoo', cursive",
            color: modeColor,
            textShadow: `0 0 20px ${modeColor}`,
            transition: 'color 0.5s ease, text-shadow 0.5s ease'
          }}>
            BBITS GACHA
          </h1>
          <p style={{ margin: 0, fontSize: '1.2rem', letterSpacing: '4px', opacity: 0.8 }}>
            {mode === 'FATE' ? 'CYBER FATE SYSTEM' : (mode === 'SQUAD' ? 'TARGET SELECTOR' : 'GIFT EXCHANGE PROTOCOL')}
          </p>
        </div>

        {/* Current Turner for Gift Mode */}
        {mode === 'GIFT' && exchangeOrder.length > 0 && exchangeIndex < exchangeOrder.length && (
          <div style={{
            position: 'absolute', top: 140, left: 30,
            background: 'rgba(0,0,0,0.6)', padding: '10px 20px',
            borderLeft: `4px solid ${THEME.neonOrange}`,
            backdropFilter: 'blur(4px)'
          }}>
            <div style={{ fontSize: '0.8rem', color: '#aaa' }}>CURRENT ROLLER</div>
            <div style={{ fontSize: '2rem', color: '#fff', fontWeight: 'bold' }}>{currentGiver}</div>
          </div>
        )}

        {/* Controls: Mode, Audio & Settings */}
        <div style={{
          position: 'absolute',
          top: 30,
          right: 30,
          pointerEvents: 'auto',
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row-reverse',
          alignItems: isMobile ? 'flex-end' : 'center',
          gap: isMobile ? '15px' : '20px',
          transition: 'all 0.3s ease'
        }}>

          {/* Mode Switcher */}
          <button
            onClick={toggleMode}
            style={{
              background: 'rgba(0,0,0,0.5)',
              border: `1px solid ${modeColor}`,
              color: modeColor,
              padding: '10px 15px',
              fontSize: '1rem',
              fontFamily: "'Rajdhani', sans-serif",
              fontWeight: 'bold',
              cursor: 'pointer',
              borderRadius: '4px',
              display: 'flex', alignItems: 'center', gap: '8px',
              minWidth: '160px',
              justifyContent: 'center'
            }}
          >
            <span style={{ fontSize: '1.2rem' }}>
              {mode === 'FATE' ? '🔮' : (mode === 'SQUAD' ? '👥' : '🎁')}
            </span>
            <span>
              {mode === 'FATE' ? 'FATE MODE' : (mode === 'SQUAD' ? 'SQUAD MODE' : 'GIFT MODE')}
            </span>
          </button>

          <button
            onClick={() => { setIsEditorOpen(true); soundManager.playClick(); }}
            style={{
              background: 'rgba(0,0,0,0.5)',
              border: `1px solid ${THEME.neonBlue}`,
              color: THEME.neonBlue,
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              fontSize: '1.2rem',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s'
            }}
            title="Settings"
          >
            ⚙️
          </button>

          <div
            ref={volumeRef}
            style={{
              display: 'flex',
              alignItems: 'center',
              background: 'rgba(0,0,0,0.5)',
              padding: volumeExpanded ? '10px' : '0',
              borderRadius: '30px',
              border: volumeExpanded ? '1px solid #333' : 'none',
              width: volumeExpanded ? 'auto' : '40px',
              height: volumeExpanded ? 'auto' : '40px',
              justifyContent: 'center',
              transition: 'all 0.3s ease',
              overflow: 'hidden'
            }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (isMobile && !volumeExpanded) {
                  setVolumeExpanded(true);
                  soundManager.playClick();
                } else {
                  toggleMute();
                }
              }}
              style={{
                background: isMobile && !volumeExpanded ? 'rgba(0,0,0,0.5)' : 'transparent',
                border: isMobile && !volumeExpanded ? `1px solid ${THEME.neonBlue}` : 'none',
                borderRadius: isMobile && !volumeExpanded ? '50%' : '0',
                width: isMobile && !volumeExpanded ? '40px' : 'auto',
                height: isMobile && !volumeExpanded ? '40px' : 'auto',
                color: isMuted ? '#555' : THEME.neonBlue,
                cursor: 'pointer',
                fontSize: '1.2rem',
                marginRight: volumeExpanded ? '10px' : '0',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.3s ease'
              }}
            >
              {isMuted ? '🔇' : '🔊'}
            </button>
            {volumeExpanded && (
              <input
                type="range"
                min="0" max="1" step="0.1"
                value={volume}
                onChange={changeVolume}
                style={{ width: '80px', accentColor: THEME.neonBlue, cursor: 'pointer' }}
              />
            )}
          </div>
        </div>

        {/* Action Button */}
        <div style={{ position: 'absolute', bottom: isMobile ? 30 : 50, left: '50%', transform: 'translateX(-50%)', pointerEvents: 'auto' }}>

          {/* Logic for Button Display based on Mode and State */}
          {(() => {
            if (mode === 'SQUAD' && activeSquad.length === 0) {
              return (
                <button
                  onClick={handleReloadSquad}
                  onMouseEnter={() => soundManager.init()}
                  style={getActionButtonStyle(THEME.neonGreen, isMobile)}
                >
                  RELOAD SQUAD
                </button>
              );
            }

            if (mode === 'GIFT') {
              if (exchangeOrder.length === 0) {
                return (
                  <button
                    onClick={handleStartGift}
                    onMouseEnter={() => soundManager.init()}
                    style={getActionButtonStyle(THEME.neonOrange, isMobile)}
                  >
                    START EXCHANGE
                  </button>
                );
              }
              if (exchangeIndex >= exchangeOrder.length) {
                return (
                  <button
                    onClick={handleResetGift}
                    onMouseEnter={() => soundManager.init()}
                    style={getActionButtonStyle(THEME.neonOrange, isMobile)}
                  >
                    RESET EXCHANGE
                  </button>
                );
              }
            }

            return (
              <button
                onClick={handleSpin}
                disabled={gameState !== 'IDLE'}
                onMouseEnter={() => soundManager.init()}
                style={{
                  background: gameState === 'IDLE' ? 'transparent' : '#333',
                  border: `2px solid ${gameState === 'IDLE' ? modeColor : '#555'}`,
                  color: gameState === 'IDLE' ? modeColor : '#555',
                  padding: isMobile ? '10px 30px' : '20px 60px',
                  fontSize: isMobile ? '1.2rem' : '2rem',
                  fontFamily: "'Rajdhani', sans-serif",
                  fontWeight: 'bold',
                  cursor: gameState === 'IDLE' ? 'pointer' : 'default',
                  borderRadius: '4px',
                  boxShadow: gameState === 'IDLE' ? `0 0 30px ${modeColor}, inset 0 0 10px ${modeColor}` : 'none',
                  transition: 'all 0.3s ease',
                  textTransform: 'uppercase',
                  letterSpacing: '2px'
                }}
              >
                {gameState === 'SPINNING' ? 'PROCESSING...' : gameState === 'RESULT' ? 'CLAIM PRIZE' : (mode === 'GIFT' ? `SPIN (${currentGiver})` : 'INITIATE')}
              </button>
            );
          })()}
        </div>

        {/* Modal Overlay for Result */}
        {fate && (
          <div style={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
            background: 'rgba(0,0,0,0.8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(5px)',
            pointerEvents: 'auto'
          }} onClick={() => { setFate(null); soundManager.playClick(); }}>
            <div style={{ textAlign: 'center', transform: 'scale(1)', animation: 'popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
              <div style={{ fontSize: '1.5rem', color: modeColor, marginBottom: '20px' }}>
                {mode === 'GIFT' ? 'GIFT SENDER' : 'SYSTEM MESSAGE RECEIVED'}
              </div>
              <h2 style={{
                fontSize: '5rem', margin: 0, color: 'white',
                textShadow: `0 0 40px ${modeColor}`,
                fontFamily: "'Zen Tokyo Zoo', cursive"
              }}>
                {fate}
              </h2>
              {mode === 'SQUAD' && (
                <div style={{ color: THEME.neonGreen, fontSize: '1.2rem', marginTop: '10px' }}>
                  REMOVED FROM ROSTER
                </div>
              )}
              {mode === 'GIFT' && (
                <div style={{ color: THEME.neonOrange, fontSize: '1.5rem', marginTop: '10px', background: 'rgba(0,0,0,0.5)', padding: '5px 15px', borderRadius: '4px' }}>
                  SENDING GIFT TO: <span style={{ color: '#fff', fontWeight: 'bold' }}>{exchangeOrder[exchangeIndex - 1]}</span>
                </div>
              )}
              <p style={{ marginTop: '30px', color: '#aaa', cursor: 'pointer' }}>[ CLICK TO DISMISS ]</p>
            </div>
          </div>
        )}

        {/* Dev Tools Panel */}
        <DevTools
          visible={devMode}
          config={gameConfig}
          setConfig={setGameConfig}
          onRespawn={() => setResetTrigger(r => r + 1)}
        />

        {/* Settings Modal */}
        <FateEditor
          isOpen={isEditorOpen}
          onClose={() => { setIsEditorOpen(false); soundManager.playClick(); }}
          fates={fates}
          setFates={setFates}
          squadList={squadList}
          setSquadList={setSquadList}
          mascotUrl={mascotUrl}
          setMascotUrl={setMascotUrl}
          devMode={devMode}
          setDevMode={setDevMode}
          mode={mode}
        />
      </div>

      <Canvas camera={{ position: [0, 6, 14], fov: 45 }} dpr={1}>
        <color attach="background" args={['#050505']} />
        <fog attach="fog" args={['#050505', 10, 50]} />

        {/* Updated Gravity to be standard */}
        <Physics gravity={[0, -9.8, 0]}>
          <GameScene
            spinSignal={spinCount}
            gameState={gameState}
            onPrizeClaim={handleResult}
            prizeColor={prizeColor}
            fateList={mode === 'FATE' ? fates : activeSquad}
            mascotUrl={mascotUrl}
            config={gameConfig}
            resetTrigger={resetTrigger}
            debug={devMode}
            ballCount={currentBallCount}
            onPieceSelected={handlePieceSelected}
            fixedResult={fixedResult}
          />
        </Physics>

        <EffectComposer enableNormalPass={false}>
          {gameConfig.graphics.bloomEnabled && (
            <Bloom luminanceThreshold={gameConfig.graphics.bloomThreshold} intensity={gameConfig.graphics.bloomIntensity} levels={9} mipmapBlur />
          )}
          <Vignette eskil={false} offset={0.1} darkness={1.1} />
        </EffectComposer>

        <OrbitControls
          enablePan={false}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI / 1.8}
          minDistance={8}
          maxDistance={20}
          target={[0, 3, 0]}
        />
        <Environment preset="city" />
        {/* ContactShadows removed for mobile stability */}
      </Canvas>
    </>
  );
};

// Helper for button styles
const getActionButtonStyle = (color: string, isMobile: boolean) => ({
  background: '#333',
  border: `2px solid ${color}`,
  color: color,
  padding: isMobile ? '10px 30px' : '20px 60px',
  fontSize: isMobile ? '1.2rem' : '2rem',
  fontFamily: "'Rajdhani', sans-serif",
  fontWeight: 'bold',
  cursor: 'pointer',
  borderRadius: '4px',
  boxShadow: `0 0 30px ${color}`,
  transition: 'all 0.3s ease',
  textTransform: 'uppercase' as const,
  letterSpacing: '2px',
  transform: 'translateZ(0)'
});

const root = createRoot((window as any).document.getElementById('root')!);
root.render(<App />);