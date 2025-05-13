import * as THREE from "three";

// Shader code as strings
const vertexShader = `
varying vec2 vUv;
uniform float uTime;

void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const fragmentShader = `
precision highp float;

varying vec2 vUv;
uniform float uTime;
uniform vec2 uMouse;

// Balatro parameters (made into uniforms for easy tweaking)
uniform float spin_rotation_speed;
uniform float move_speed;
uniform float contrast;
uniform float lighting;
uniform float spin_amount;
uniform float pixel_filter;
uniform bool is_rotating;

// Constants
const float SPIN_EASE = 1.0;
const vec3 colour_1 = vec3(0.871, 0.267, 0.231); // Red
const vec3 colour_2 = vec3(0.0, 0.42, 0.706);    // Blue
const vec3 colour_3 = vec3(0.086, 0.137, 0.145);  // Dark

void main() {
    // Pixel size calculation (exactly like Balatro)
    vec2 screenSize = vec2(1920.0, 1080.0);
    float pixel_size = length(screenSize.xy) / pixel_filter;
    vec2 uv = (floor(vUv.xy * screenSize.xy * (1.0/pixel_size)) * pixel_size - 0.5 * screenSize.xy) / length(screenSize.xy);
    float uv_len = length(uv);

    // Rotation calculation (matching Balatro)
    float speed = (spin_rotation_speed * SPIN_EASE * 0.2);
    if(is_rotating) {
        speed = uTime * speed;
    }
    speed += 302.2;

    // Pixel angle calculation (exact Balatro formula)
    float new_pixel_angle = atan(uv.y, uv.x) + speed - SPIN_EASE * 20.0 * (1.0 * spin_amount * uv_len + (1.0 - 1.0 * spin_amount));
    vec2 mid = (screenSize.xy / length(screenSize.xy)) / 2.0;
    uv = (vec2(uv_len * cos(new_pixel_angle) + mid.x, uv_len * sin(new_pixel_angle) + mid.y) - mid);

    // Scale and create paint effect (matching Balatro)
    uv *= 30.0;
    speed = uTime * move_speed;
    vec2 uv2 = vec2(uv.x + uv.y);

    // Paint effect iterations (exact Balatro loop)
    for(int i = 0; i < 5; i++) {
        uv2 += sin(max(uv.x, uv.y)) + uv;
        uv += 0.5 * vec2(
            cos(5.1123314 + 0.353 * uv2.y + speed * 0.131121),
            sin(uv2.x - 0.113 * speed)
        );
        uv -= 1.0 * cos(uv.x + uv.y) - 1.0 * sin(uv.x * 0.711 - uv.y);
    }

    // Color calculations (exact Balatro formulas)
    float contrast_mod = (0.25 * contrast + 0.5 * spin_amount + 1.2);
    float paint_res = min(2.0, max(0.0, length(uv) * 0.035 * contrast_mod));
    float c1p = max(0.0, 1.0 - contrast_mod * abs(1.0 - paint_res));
    float c2p = max(0.0, 1.0 - contrast_mod * abs(paint_res));
    float c3p = 1.0 - min(1.0, c1p + c2p);

    // Lighting (exact Balatro calculation)
    float light = (lighting - 0.2) * max(c1p * 5.0 - 4.0, 0.0) + 
                  lighting * max(c2p * 5.0 - 4.0, 0.0);

    // Final color mixing (exact Balatro formula)
    vec3 finalColor = (0.3/contrast) * colour_1 + 
                     (1.0 - 0.3/contrast) * (
                         colour_1 * c1p + 
                         colour_2 * c2p + 
                         colour_3 * c3p
                     ) + light;

    gl_FragColor = vec4(finalColor, 1.0);
}`;

// Audio setup
const audio = new Audio("/threejs-balatro/balatro-music.mp3");
audio.loop = true;
audio.volume = 0.7; // Set to 70% volume

// Create audio context and analyzer
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const audioSource = audioContext.createMediaElementSource(audio);
const analyser = audioContext.createAnalyser();
analyser.fftSize = 256;
const bufferLength = analyser.frequencyBinCount;
const dataArray = new Uint8Array(bufferLength);

// Connect audio nodes
audioSource.connect(analyser);
analyser.connect(audioContext.destination);

// Create scene
const scene = new THREE.Scene();

// Calculate camera FOV to ensure background fills screen at z = -1
const fov = 2 * Math.atan(1 / 2) * (180 / Math.PI);
const camera = new THREE.PerspectiveCamera(
  fov,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

// Add lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const frontLight = new THREE.DirectionalLight(0xffffff, 0.8);
frontLight.position.set(0, 0, 2);
scene.add(frontLight);

const backLight = new THREE.DirectionalLight(0xffffff, 0.8);
backLight.position.set(0, 0, -2);
scene.add(backLight);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Enable alpha blending in the renderer
renderer.setClearColor(0x000000, 0);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.sortObjects = true;
renderer.shadowMap.enabled = true;

// Create background effect geometry that fills the screen
const calculateBackgroundScale = () => {
  const distance = Math.abs(backgroundMesh.position.z - camera.position.z);
  const vFov = (camera.fov * Math.PI) / 180;
  const height = 2 * Math.tan(vFov / 2) * distance;
  const width = height * camera.aspect;
  return { width, height };
};

const geometry = new THREE.PlaneGeometry(2, 2);
const material = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader,
  uniforms: {
    uTime: { value: 0 },
    uMouse: { value: new THREE.Vector2(0.5, 0.5) },
    uAudioData: { value: 0.0 },
    // Balatro parameters
    spin_rotation_speed: { value: 0.4 },
    move_speed: { value: 1.4 },
    contrast: { value: 3.5 },
    lighting: { value: 0.4 },
    spin_amount: { value: 0.25 },
    pixel_filter: { value: 740.0 },
    is_rotating: { value: true },
  },
});

const backgroundMesh = new THREE.Mesh(geometry, material);
backgroundMesh.position.z = -1;
scene.add(backgroundMesh);

// Update background size
const updateBackgroundSize = () => {
  const scale = calculateBackgroundScale();
  backgroundMesh.scale.set(scale.width, scale.height, 1);
};

// Load card textures
const textureLoader = new THREE.TextureLoader();

// Helper function to configure texture
const configureTexture = (texture) => {
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
};

// Error handler for texture loading
const onTextureError = (err) => {
  console.error("Error loading texture:", err);
};

const frontTexture = configureTexture(
  textureLoader.load(
    "/threejs-balatro/src/textures/ace_of_spades.jpg",
    undefined,
    undefined,
    onTextureError
  )
);
const backTexture = configureTexture(
  textureLoader.load(
    "/threejs-balatro/src/textures/card_back.svg",
    undefined,
    undefined,
    onTextureError
  )
);
const normalMap = configureTexture(
  textureLoader.load(
    "/threejs-balatro/src/textures/card_normal.svg",
    undefined,
    undefined,
    onTextureError
  )
);
const alphaMap = configureTexture(
  textureLoader.load(
    "/threejs-balatro/src/textures/card_mask.svg",
    undefined,
    undefined,
    onTextureError
  )
);

// Create floating card with correct aspect ratio (736:1036 ≈ 0.71)
const CARD_HEIGHT = 0.4;
const CARD_WIDTH = CARD_HEIGHT * (736 / 1036);
const cardGeometry = new THREE.PlaneGeometry(CARD_WIDTH, CARD_HEIGHT, 50, 50);

// Create materials for front and back of card with improved settings
const cardFrontMaterial = new THREE.MeshPhongMaterial({
  map: frontTexture,
  normalMap: normalMap,
  normalScale: new THREE.Vector2(0.1, 0.1),
  shininess: 30,
  side: THREE.FrontSide,
  specular: 0x333333,
  transparent: true,
  alphaMap: alphaMap,
  alphaTest: 0.01,
  depthWrite: true,
});

const cardBackMaterial = new THREE.MeshPhongMaterial({
  map: backTexture,
  normalMap: normalMap,
  normalScale: new THREE.Vector2(0.1, 0.1),
  shininess: 30,
  side: THREE.BackSide,
  transparent: true,
  alphaMap: alphaMap,
  alphaTest: 0.01,
  depthWrite: true,
  specular: 0x333333,
});

// Create a group to hold both sides of the card
const cardGroup = new THREE.Group();

// Create front and back meshes
const cardFront = new THREE.Mesh(cardGeometry, cardFrontMaterial);
const cardBack = new THREE.Mesh(cardGeometry, cardBackMaterial);

// Add both meshes to the group
cardGroup.add(cardFront);
cardGroup.add(cardBack);

// Position the card group
cardGroup.position.z = 0.5; // Move card forward
scene.add(cardGroup);

// Position camera further back to see everything
camera.position.z = 2;

// Camera parameters for parallax
const CAMERA_DISTANCE = 2;
const PARALLAX_STRENGTH = 0.5;
let targetCameraPosition = new THREE.Vector3(0, 0, CAMERA_DISTANCE);
let currentMouseX = 0;
let currentMouseY = 0;

// HUD Elements
const volumeSlider = document.querySelector(".volume-slider");
const hideHudButton = document.querySelector("#hideHud");
const showHudButton = document.querySelector(".toggle-hud");
const hud = document.querySelector(".hud");
const musicStatus = document.querySelector(".hud-section:last-child span");

// Volume control
volumeSlider.addEventListener("input", (e) => {
  const volume = e.target.value / 100;
  audio.volume = volume;
});

// HUD visibility
hideHudButton.addEventListener("click", () => {
  hud.classList.add("hidden");
});

showHudButton.addEventListener("click", () => {
  hud.classList.remove("hidden");
});

// Update music status
window.addEventListener("click", () => {
  if (!isPlaying) {
    musicStatus.textContent = "MUSIC: PLAYING";
  }
});

// Handle window resize
window.addEventListener("resize", () => {
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);

  // Update background size on resize
  updateBackgroundSize();
});

// Handle mouse movement
window.addEventListener("mousemove", (event) => {
  // Convert mouse position to normalized device coordinates (-1 to +1)
  currentMouseX = (event.clientX / window.innerWidth) * 2 - 1;
  currentMouseY = -(event.clientY / window.innerHeight) * 2 + 1;

  // Update material uniforms for background effect
  material.uniforms.uMouse.value.x = event.clientX / window.innerWidth;
  material.uniforms.uMouse.value.y = 1.0 - event.clientY / window.innerHeight;
});

// Handle click to play audio
let isPlaying = false;
window.addEventListener("click", async () => {
  if (!isPlaying) {
    try {
      // Resume audio context if suspended
      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }
      // Try to play the audio
      await audio.play();
      isPlaying = true;
      musicStatus.textContent = "MUSIC: PLAYING";
    } catch (error) {
      console.error("Audio playback failed:", error);
      musicStatus.textContent = "MUSIC: FAILED TO PLAY";
    }
  }
});

// Particle system class
class ParticleSystem {
  constructor(count) {
    this.particleCount = count;
    this.particles = [];

    // Create particle geometry
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    // Initialize particles
    for (let i = 0; i < count; i++) {
      this.particles.push({
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        alpha: 0,
        size: 0,
        life: 0,
      });

      sizes[i] = 0;
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

    // Create particle material
    const material = new THREE.PointsMaterial({
      size: 0.02,
      sizeAttenuation: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
    });

    this.points = new THREE.Points(geometry, material);
    this.positions = positions;
    this.colors = colors;
    this.sizes = sizes;
  }

  emit(position, color) {
    // Find an available particle
    for (let i = 0; i < this.particleCount; i++) {
      if (this.particles[i].life <= 0) {
        const particle = this.particles[i];
        particle.position.copy(position);

        // Random velocity
        particle.velocity.set(
          (Math.random() - 0.5) * 0.02,
          (Math.random() - 0.5) * 0.02,
          (Math.random() - 0.5) * 0.02
        );

        particle.life = 1.0;
        particle.alpha = 1.0;
        particle.size = Math.random() * 0.02 + 0.01;

        // Update buffers
        const idx = i * 3;
        this.positions[idx] = position.x;
        this.positions[idx + 1] = position.y;
        this.positions[idx + 2] = position.z;

        this.colors[idx] = color.r;
        this.colors[idx + 1] = color.g;
        this.colors[idx + 2] = color.b;

        this.sizes[i] = particle.size;
        break;
      }
    }

    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;
    this.points.geometry.attributes.size.needsUpdate = true;
  }

  update(deltaTime) {
    for (let i = 0; i < this.particleCount; i++) {
      const particle = this.particles[i];

      if (particle.life > 0) {
        particle.life -= deltaTime;
        particle.position.add(particle.velocity);
        particle.alpha = particle.life;

        const idx = i * 3;
        this.positions[idx] = particle.position.x;
        this.positions[idx + 1] = particle.position.y;
        this.positions[idx + 2] = particle.position.z;

        this.sizes[i] = particle.size * particle.alpha;
      }
    }

    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.size.needsUpdate = true;
  }
}

// Create particle system
const particles = new ParticleSystem(200);
scene.add(particles.points);

// Corner positions relative to card
const cornerOffsets = [
  new THREE.Vector3(-CARD_WIDTH / 2, CARD_HEIGHT / 2, 0), // Top left
  new THREE.Vector3(CARD_WIDTH / 2, CARD_HEIGHT / 2, 0), // Top right
  new THREE.Vector3(-CARD_WIDTH / 2, -CARD_HEIGHT / 2, 0), // Bottom left
  new THREE.Vector3(CARD_WIDTH / 2, -CARD_HEIGHT / 2, 0), // Bottom right
];

let lastTime = 0;

// Card flip state
let isHovering = false;
let targetRotation = 0;
const FLIP_DURATION = 0.5;
let flipProgress = 0;

// Hover animation parameters
let hoverScale = 1.0;
let targetHoverScale = 1.0;
const HOVER_SCALE_UP = 1.15;
const HOVER_ANIMATION_SPEED = 8.0;
const HOVER_BOUNCE_SPEED = 3.0;
const HOVER_BOUNCE_AMPLITUDE = 0.02;

// Handle card hover
window.addEventListener("mousemove", (event) => {
  // Convert mouse position to normalized device coordinates
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  // Update the picking ray with the camera and mouse position
  raycaster.setFromCamera(mouse, camera);

  // Calculate objects intersecting the picking ray
  const intersects = raycaster.intersectObjects([cardFront, cardBack]);

  // Update hover state
  const wasHovering = isHovering;
  isHovering = intersects.length > 0;

  // Toggle cursor style
  renderer.domElement.classList.toggle("cursor-pointer", isHovering);

  // Start flip animation when hover state changes
  if (wasHovering !== isHovering) {
    targetRotation = isHovering ? Math.PI : 0;
    flipProgress = 0;
  }
});

// Animation loop
function animate(time) {
  const deltaTime = (time - lastTime) * 0.001;
  lastTime = time;

  requestAnimationFrame(animate);

  // Get audio data
  analyser.getByteFrequencyData(dataArray);

  // Calculate average frequency
  let sum = 0;
  for (let i = 0; i < bufferLength; i++) {
    sum += dataArray[i];
  }
  const average = sum / bufferLength / 255.0;

  // Update uniforms
  material.uniforms.uTime.value = time * 0.001 * 0.2;
  material.uniforms.uAudioData.value = average;

  // Update hover scale with smooth transition
  targetHoverScale = isHovering ? HOVER_SCALE_UP : 1.0;
  hoverScale +=
    (targetHoverScale - hoverScale) * deltaTime * HOVER_ANIMATION_SPEED;

  // Add bouncy effect when hovering
  const bounceOffset = isHovering
    ? Math.sin(time * 0.003 * HOVER_BOUNCE_SPEED) * HOVER_BOUNCE_AMPLITUDE
    : 0;

  // Animate the card
  const t = time * 0.001;
  cardGroup.position.y = Math.sin(t) * 0.1 + bounceOffset;
  cardGroup.rotation.z = Math.sin(t * 0.5) * 0.1;
  cardGroup.position.x = Math.sin(t * 0.7) * 0.05;

  // Apply hover scale and audio reactivity
  const finalScale = (1 + average * 0.1) * hoverScale;
  cardGroup.scale.set(finalScale, finalScale, 1);

  // Handle card flip animation
  if (flipProgress < FLIP_DURATION) {
    flipProgress += deltaTime;
    const progress = Math.min(flipProgress / FLIP_DURATION, 1);
    const easeProgress = 1 - Math.pow(1 - progress, 3); // Cubic ease-out
    cardGroup.rotation.y = THREE.MathUtils.lerp(
      cardGroup.rotation.y,
      targetRotation,
      easeProgress
    );
  }

  // Update camera position based on mouse
  const targetX = currentMouseX * PARALLAX_STRENGTH;
  const targetY = currentMouseY * PARALLAX_STRENGTH;

  // Smoothly interpolate camera position
  targetCameraPosition.x += (targetX - targetCameraPosition.x) * 0.05;
  targetCameraPosition.y += (targetY - targetCameraPosition.y) * 0.05;
  targetCameraPosition.z = CAMERA_DISTANCE;

  // Update camera position and look at the card
  camera.position.copy(targetCameraPosition);
  camera.lookAt(cardGroup.position);

  // Rotate lights to follow camera
  frontLight.position.copy(camera.position).multiplyScalar(1.5);
  backLight.position.copy(camera.position).multiplyScalar(-1.5);

  // Update particles
  particles.update(deltaTime);

  // Emit new particles from corners
  if (Math.random() < 0.3) {
    const cornerIndex = Math.floor(Math.random() * 4);
    const offset = cornerOffsets[cornerIndex].clone();
    const worldPosition = offset.applyMatrix4(cardGroup.matrix);

    const intensity = Math.min(1, average * 2);
    const color = new THREE.Color(0.5 + intensity * 0.5, 0.7, 1.0);

    particles.emit(worldPosition, color);
  }

  // Update background size
  updateBackgroundSize();

  renderer.render(scene, camera);
}

// Initial background size update
updateBackgroundSize();

// Start animation
animate(0);

// Modal Elements
const modalOverlay = document.querySelector(".modal-overlay");
const modalClose = document.querySelector(".modal-close");

// Raycaster for card click detection
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Close modal
modalClose.addEventListener("click", () => {
  modalOverlay.classList.remove("visible");
});

// Close modal when clicking outside
modalOverlay.addEventListener("click", (e) => {
  if (e.target === modalOverlay) {
    modalOverlay.classList.remove("visible");
  }
});

// Handle card click
window.addEventListener("click", (event) => {
  // Convert mouse position to normalized device coordinates
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  // Update the picking ray with the camera and mouse position
  raycaster.setFromCamera(mouse, camera);

  // Calculate objects intersecting the picking ray
  const intersects = raycaster.intersectObjects([cardFront, cardBack]);

  if (intersects.length > 0) {
    modalOverlay.classList.add("visible");
  }
});
