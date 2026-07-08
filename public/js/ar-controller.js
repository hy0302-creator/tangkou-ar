/**
 * AR Controller — mindAR Image Tracking + Three.js 3D Rendering.
 *
 * Modes:
 * - AR Mode: Uses mindAR to track markers and overlay 3D models (requires .mind file)
 * - Demo Mode: Pure 3D viewer with touch rotation (when no .mind file available)
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// ===== State =====
let arSystem = null;
let threeRenderer = null;
let threeScene = null;
let threeCamera = null;
let modelObject = null;
let currentContent = null;
let isAudioPlaying = false;
let videoElement = null;
let isDemoMode = false;
let isDemoDragging = false;
let demoScale = 1.0;          // current zoom level for demo mode
let animFrameId = null;       // requestAnimationFrame ID for cleanup
let particleAnimId = null;    // particle animation frame ID
let isActive = true;          // false after navigation — stops all loops

// ===== Entry Point =====
(async function init() {
  // Get content slug from URL
  const params = new URLSearchParams(window.location.search);
  const slug = params.get('content');

  if (!slug) {
    showError('缺少内容标识', '请从首页选择 AR 体验内容');
    return;
  }

  // Load content metadata
  currentContent = await ContentLoader.getContentBySlug(slug);

  if (!currentContent) {
    showError('内容不存在', `未找到 "${slug}" 对应的 AR 内容`);
    return;
  }

  // Update UI
  document.getElementById('arTitle').textContent = currentContent.title;
  document.getElementById('arInfoTitle').textContent = currentContent.title;
  document.getElementById('arInfoCategory').textContent = currentContent.category_name || '';
  document.getElementById('arInfoBody').innerHTML = currentContent.info_html
    || '<p style="color:#999;text-align:center;padding:20px;">暂无详细介绍<br><small>请在管理后台编辑此内容，使用"🤖 自动生成"功能快速创建介绍</small></p>';

  // Show marker image preview in scan hint
  if (currentContent.target_image_path) {
    const markerImg = document.getElementById('scanMarkerPreview');
    if (markerImg) {
      markerImg.src = currentContent.target_image_path;
      markerImg.style.display = 'block';
    }
  }

  // Audio button
  if (currentContent.audio_path) {
    const audioBtn = document.getElementById('arAudioBtn');
    audioBtn.style.display = 'block';
    const audioEl = document.getElementById('arAudio');
    audioEl.src = currentContent.audio_path;
    // Reset state when audio finishes naturally
    audioEl.addEventListener('ended', () => {
      isAudioPlaying = false;
      audioBtn.textContent = '🔊 播放语音导览';
      audioBtn.classList.remove('playing');
    });
  }

  // Record view
  ContentLoader.recordView(slug);

  // Start AR
  await startAR();
})();

// ===== AR Initialization =====
async function startAR() {
  // Determine marker file path
  const mindFile = currentContent.target_mind_path;

  if (!mindFile) {
    // No marker file — use 3D-only demo mode
    console.log('No .mind file found, starting demo 3D mode');
    startDemo3D();
    return;
  }

  // Check if mindAR library loaded
  if (typeof MINDAR === 'undefined') {
    console.log('mindAR not loaded, falling back to demo 3D mode');
    startDemo3D();
    return;
  }

  try {
    // Check camera permission
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
    });
    stream.getTracks().forEach(t => t.stop());
  } catch (err) {
    console.error('Camera permission denied:', err);
    // Fall back to demo mode
    startDemo3D();
    return;
  }

  // Show AR container (but keep loading overlay until model is ready)
  document.getElementById('arContainer').style.display = 'block';

  try {
    // Initialize mindAR Image Tracking
    arSystem = new MINDAR.IMAGE.MindARThree({
      container: document.getElementById('arContainer'),
      imageTargetSrc: mindFile,
      uiScanning: 'no',
      uiLoading: 'no',
      filterMinCF: 0.001,
      filterBeta: 0.01,
      warmupTolerance: 5,
      missTolerance: 10,
    });

    const { renderer, scene, camera } = arSystem;

    threeRenderer = renderer;
    threeScene = scene;
    threeCamera = camera;

    // Configure renderer
    threeRenderer.setSize(window.innerWidth, window.innerHeight);
    threeRenderer.setPixelRatio(window.devicePixelRatio);
    threeRenderer.outputColorSpace = THREE.SRGBColorSpace;

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 1.2));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(1, 1, 1);
    scene.add(dirLight);

    // Start AR
    await arSystem.start();
    console.log('mindAR started');

    // Get video element
    videoElement = document.querySelector('.ar-container video');

    // Hide scan hint gradually
    setTimeout(() => {
      const hint = document.getElementById('arScanHint');
      if (hint) hint.style.opacity = '0.5';
    }, 5000);

    // Target events
    arSystem.addEventListener('targetFound', () => onTargetFound());
    arSystem.addEventListener('targetLost', () => onTargetLost());

    // Load 3D model on the anchor
    await loadModel(true);

    // Model loaded — hide loading screen
    document.getElementById('arLoading').style.display = 'none';

    window.addEventListener('resize', onResize);

  } catch (err) {
    console.error('AR initialization error:', err);
    startDemo3D();
  }
}

// ===== Demo 3D Mode (no marker needed) =====
function startDemo3D() {
  isDemoMode = true;
  console.log('Starting demo 3D viewer mode');

  const container = document.getElementById('arContainer');
  container.style.display = 'block';
  // Loading overlay stays until model is ready (see loadModel callback)

  // Hide scan hint, show demo badge
  document.getElementById('arScanHint').style.display = 'none';
  const demoBadge = document.createElement('div');
  demoBadge.id = 'demoBadge';
  demoBadge.style.cssText = 'position:fixed;top:80px;left:50%;transform:translateX(-50%);z-index:150;background:rgba(0,0,0,0.55);color:#D4A373;padding:6px 16px;border-radius:20px;font-size:13px;backdrop-filter:blur(8px);pointer-events:none;';
  demoBadge.textContent = '🎮 3D预览模式 · 手机打开可使用真实AR';
  container.appendChild(demoBadge);

  // Setup Three.js
  threeScene = new THREE.Scene();

  // Background gradient
  const bgColor = new THREE.Color(0x1B4332);
  threeScene.background = bgColor;

  // Camera (perspective)
  threeCamera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
  threeCamera.position.set(0, 0.5, 3);
  threeCamera.lookAt(0, 0, 0);

  // Renderer
  threeRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  threeRenderer.setSize(window.innerWidth, window.innerHeight);
  threeRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  threeRenderer.outputColorSpace = THREE.SRGBColorSpace;
  threeRenderer.shadowMap.enabled = true;
  container.appendChild(threeRenderer.domElement);

  // Lighting
  threeScene.add(new THREE.AmbientLight(0xffffff, 0.8));
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.0);
  keyLight.position.set(2, 3, 2);
  threeScene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0x40916C, 0.4);
  fillLight.position.set(-1, 1, -1);
  threeScene.add(fillLight);

  // Ground reference ring
  const ringGeo = new THREE.RingGeometry(0.5, 0.55, 64);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xD4A373, side: THREE.DoubleSide, transparent: true, opacity: 0.5 });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = -0.8;
  threeScene.add(ring);

  // Load model (hide loading screen when done)
  loadModel(false, () => {
    document.getElementById('arLoading').style.display = 'none';
  });

  // Show info panel immediately in demo mode
  onTargetFound();

  // Add rotation + zoom controls
  setupDemoControls();

  // Start render loop
  function animate() {
    if (!isActive || !threeRenderer) return;
    animFrameId = requestAnimationFrame(animate);

    // Auto-rotate model (pause while user is dragging)
    if (modelObject && isDemoMode && !isDemoDragging) {
      modelObject.rotation.y += 0.005;
    }

    threeRenderer.render(threeScene, threeCamera);
  }
  animate();

  // Use named function so we can remove it on cleanup
  window._demoResizeHandler = () => {
    if (threeRenderer && threeCamera) {
      threeRenderer.setSize(window.innerWidth, window.innerHeight);
      threeCamera.aspect = window.innerWidth / window.innerHeight;
      threeCamera.updateProjectionMatrix();
    }
  };
  window.addEventListener('resize', window._demoResizeHandler);
}

function setupDemoControls() {
  let lastX = 0, lastY = 0;
  let pinchStartDist = 0;       // initial distance between two fingers
  let pinchStartScale = 1.0;    // model scale when pinch started
  const MIN_SCALE = 0.3;
  const MAX_SCALE = 5.0;
  const container = document.getElementById('arContainer');

  // Store the auto-fitted base scales (captured once after model loads)
  let baseScale = { x: 1.0, y: 1.0, z: 1.0 };
  let baseScaleCaptured = false;

  // Apply zoom scale on top, preserving the auto-fitted proportions
  function applyScale() {
    if (!modelObject) return;
    // Capture base scale on first zoom call (model may have loaded by now)
    if (!baseScaleCaptured && modelObject.scale.x !== 1.0) {
      baseScale = { x: modelObject.scale.x, y: modelObject.scale.y, z: modelObject.scale.z };
      baseScaleCaptured = true;
    }
    modelObject.scale.set(
      baseScale.x * demoScale,
      baseScale.y * demoScale,
      baseScale.z * demoScale
    );
  }

  // Watch for model load: capture the real auto-fitted scale before any zoom
  const scaleObserver = setInterval(() => {
    if (modelObject && modelObject.scale.x !== 1.0 && !baseScaleCaptured) {
      baseScale = { x: modelObject.scale.x, y: modelObject.scale.y, z: modelObject.scale.z };
      baseScaleCaptured = true;
      clearInterval(scaleObserver);
    }
  }, 200);
  setTimeout(() => clearInterval(scaleObserver), 10000);

  // ===== Mouse Drag (rotation) =====
  container.addEventListener('mousedown', (e) => {
    if (e.target.closest('.ar-info-panel') || e.target.closest('.ar-topbar')) return;
    lastX = e.clientX;
    lastY = e.clientY;
    isDemoDragging = true;
    container.style.cursor = 'grabbing';
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDemoDragging || !modelObject) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    modelObject.rotation.y += dx * 0.01;
    modelObject.rotation.x += dy * 0.01;
    lastX = e.clientX;
    lastY = e.clientY;
  });

  window.addEventListener('mouseup', () => {
    if (isDemoDragging) {
      isDemoDragging = false;
      container.style.cursor = 'grab';
    }
  });

  // ===== Mouse Wheel (zoom) =====
  container.addEventListener('wheel', (e) => {
    if (e.target.closest('.ar-info-panel')) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    demoScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, demoScale + delta));
    applyScale();
  }, { passive: false });

  // Set grab cursor to hint draggability
  container.style.cursor = 'grab';

  // ===== Touch: Single finger drag (rotation) + Two finger pinch (zoom) =====
  container.addEventListener('touchstart', (e) => {
    if (e.target.closest('.ar-info-panel') || e.target.closest('.ar-topbar')) return;

    if (e.touches.length === 1) {
      // Single finger → start rotation
      lastX = e.touches[0].clientX;
      lastY = e.touches[0].clientY;
      isDemoDragging = true;
    } else if (e.touches.length === 2) {
      // Two fingers → start pinch zoom
      isDemoDragging = false;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchStartDist = Math.sqrt(dx * dx + dy * dy);
      pinchStartScale = demoScale;
    }
  }, { passive: true });

  container.addEventListener('touchmove', (e) => {
    if (!modelObject) return;

    if (e.touches.length === 2) {
      // Pinch zoom
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const currentDist = Math.sqrt(dx * dx + dy * dy);
      if (pinchStartDist > 0) {
        const scaleFactor = currentDist / pinchStartDist;
        demoScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, pinchStartScale * scaleFactor));
        applyScale();
      }
    } else if (e.touches.length === 1 && isDemoDragging) {
      // Single finger rotation
      const dx = e.touches[0].clientX - lastX;
      const dy = e.touches[0].clientY - lastY;
      modelObject.rotation.y += dx * 0.01;
      modelObject.rotation.x += dy * 0.01;
      lastX = e.touches[0].clientX;
      lastY = e.touches[0].clientY;
    }
  }, { passive: true });

  container.addEventListener('touchend', () => {
    isDemoDragging = false;
    pinchStartDist = 0;
  });
}

// ===== 3D Model Loading =====
// isAR=true: attach model to mindAR anchor; false: add directly to scene
// onLoaded: optional callback when model finishes loading (success or fallback)
async function loadModel(isAR, onLoaded) {
  const modelPath = currentContent.model_3d_path;

  if (modelPath) {
    // Show note if model file might not exist (e.g., after cleanup)
    const loadingText = document.getElementById('arLoadingText');
    if (loadingText) loadingText.textContent = '正在加载3D模型... 大文件可能需要等待';

    const loader = new GLTFLoader();
    try {
      // Show loading progress for large models
      const loadingBar = document.getElementById('arLoadingBar');
      const loadingBarFill = document.getElementById('arLoadingBarFill');
      const loadingText = document.getElementById('arLoadingText');
      if (loadingBar) loadingBar.style.display = 'block';

      const gltf = await new Promise((resolve, reject) => {
        loader.load(
          modelPath,
          resolve,
          (progress) => {
            if (progress.total > 0) {
              const pct = Math.round((progress.loaded / progress.total) * 100);
              if (loadingBarFill) loadingBarFill.style.width = pct + '%';
              if (loadingText) loadingText.textContent = `正在加载3D模型... ${pct}%`;
            }
          },
          reject
        );
      });
      modelObject = gltf.scene;

      // 1. Compute bounding box for auto-fit
      const box = new THREE.Box3().setFromObject(modelObject);
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);

      // 2. Auto-fit: scale model so its largest dimension = targetSize
      //    AR mode → smaller target (fits on marker); Demo mode → larger target (screen viewer)
      const targetSize = isAR ? 0.6 : 1.5;
      const autoScale = maxDim > 0 ? targetSize / maxDim : 1;

      // 3. Admin's custom scale acts as a multiplier on top of auto-fit
      let adminScale = { x: 1, y: 1, z: 1 };
      try { adminScale = JSON.parse(currentContent.model_scale || '{"x":1,"y":1,"z":1}'); } catch (e) { /* use default */ }
      const finalScaleX = autoScale * (adminScale.x || 1);
      const finalScaleY = autoScale * (adminScale.y || 1);
      const finalScaleZ = autoScale * (adminScale.z || 1);
      modelObject.scale.set(finalScaleX, finalScaleY, finalScaleZ);

      console.log(`📐 Model auto-fit: original max=${maxDim.toFixed(2)}, autoScale=${autoScale.toFixed(3)}, final=[${finalScaleX.toFixed(3)}, ${finalScaleY.toFixed(3)}, ${finalScaleZ.toFixed(3)}]`);

      // 4. Position from admin config
      let pos = { x: 0, y: 0, z: 0 };
      try { pos = JSON.parse(currentContent.model_position || '{"x":0,"y":0,"z":0}'); } catch (e) { /* use default */ }
      modelObject.position.set(pos.x || 0, pos.y || 0, pos.z || 0);

      // 5. Re-compute box after scaling, then center model at origin
      const scaledBox = new THREE.Box3().setFromObject(modelObject);
      const center = scaledBox.getCenter(new THREE.Vector3());
      modelObject.position.x -= center.x;
      modelObject.position.y -= center.y;
      modelObject.position.z -= center.z;
    } catch (err) {
      console.error('Model loading error:', err);
      createFallbackModel();
    }
  } else {
    createFallbackModel();
  }

  if (modelObject) {
    if (isAR && arSystem) {
      const anchor = arSystem.getAnchor(0);
      if (anchor && anchor.group) {
        anchor.group.add(modelObject);
      } else {
        console.warn('AR anchor not ready, adding model to scene instead');
        threeScene.add(modelObject);
      }
    } else if (!isAR) {
      threeScene.add(modelObject);
    }
  }

  // Model loaded (or fallback created) — notify caller
  if (onLoaded) onLoaded();
}

/**
 * Create a fallback 3D model when no GLB is available.
 * Uses a colored ring + floating content icon as visual placeholder.
 */
function createFallbackModel() {
  const group = new THREE.Group();

  // Main ring
  const ringGeo = new THREE.TorusGeometry(0.4, 0.06, 16, 32);
  const ringMat = new THREE.MeshStandardMaterial({ color: 0x2D6A4F, roughness: 0.4, metalness: 0.3 });
  group.add(new THREE.Mesh(ringGeo, ringMat));

  // Inner sphere
  const sphereGeo = new THREE.SphereGeometry(0.2, 32, 32);
  const sphereMat = new THREE.MeshStandardMaterial({ color: 0xD4A373, roughness: 0.3, metalness: 0.1 });
  group.add(new THREE.Mesh(sphereGeo, sphereMat));

  // Floating particles
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const pGeo = new THREE.SphereGeometry(0.04, 8, 8);
    const pMat = new THREE.MeshStandardMaterial({ color: 0x40916C, roughness: 0.5, emissive: 0x40916C, emissiveIntensity: 0.3 });
    const particle = new THREE.Mesh(pGeo, pMat);
    particle.position.set(Math.cos(angle) * 0.5, 0, Math.sin(angle) * 0.5);
    particle.userData = { angle, speed: 0.3 + Math.random() * 0.5 };
    group.add(particle);
  }

  group.userData.particles = group.children.filter(c => c.geometry?.type === 'SphereGeometry');
  modelObject = group;

  // Start particle animation
  animateParticles();
}

function animateParticles() {
  if (!isActive || !modelObject || !modelObject.userData.particles) return;

  const time = Date.now() * 0.001;
  for (const p of modelObject.userData.particles) {
    const { angle, speed, baseY } = p.userData;
    p.position.x = Math.cos(angle + time * speed) * 0.5;
    p.position.z = Math.sin(angle + time * speed) * 0.5;
    p.position.y = Math.sin(time * 2 + angle) * 0.1;
  }

  particleAnimId = requestAnimationFrame(animateParticles);
}

// ===== Target Events =====
let lostHintTimer = null;

function onTargetFound() {
  // Clear any pending lost-hint auto-hide timer
  if (lostHintTimer) { clearTimeout(lostHintTimer); lostHintTimer = null; }
  document.getElementById('arScanHint').style.display = 'none';
  document.getElementById('arLostHint').style.display = 'none';
  document.getElementById('arInfoPanel').style.display = 'block';
}

function onTargetLost() {
  if (isDemoMode) return; // Info panel always shows in demo mode
  document.getElementById('arInfoPanel').style.display = 'none';
  document.getElementById('arLostHint').style.display = 'block';

  // Clear any previous timer before setting a new one
  if (lostHintTimer) clearTimeout(lostHintTimer);
  lostHintTimer = setTimeout(() => {
    document.getElementById('arLostHint').style.display = 'none';
    lostHintTimer = null;
  }, 2000);
}

// ===== Window Resize =====
function onResize() {
  if (threeRenderer) {
    threeRenderer.setSize(window.innerWidth, window.innerHeight);
  }
  if (threeCamera) {
    threeCamera.aspect = window.innerWidth / window.innerHeight;
    threeCamera.updateProjectionMatrix();
  }
}

// ===== Audio Controls =====
function toggleAudio() {
  const audio = document.getElementById('arAudio');
  const btn = document.getElementById('arAudioBtn');

  if (isAudioPlaying) {
    audio.pause();
    btn.textContent = '🔊 播放语音导览';
    btn.classList.remove('playing');
  } else {
    audio.play().catch(err => {
      console.error('Audio play error:', err);
    });
    btn.textContent = '⏸️ 暂停语音';
    btn.classList.add('playing');
  }
  isAudioPlaying = !isAudioPlaying;
}

// ===== Flashlight Toggle =====
let isFlashOn = false;

function toggleFlash() {
  // Demo mode has no camera — flash not available
  if (isDemoMode || !videoElement || !videoElement.srcObject) {
    alert('💡 当前为3D预览模式，无需闪光灯。请使用手机摄像头对准AR标记图片体验完整AR功能。');
    return;
  }

  const track = videoElement.srcObject.getVideoTracks()[0];
  if (!track) {
    alert('无法获取摄像头轨道');
    return;
  }

  // Try ImageCapture API first (broader support)
  if (typeof ImageCapture !== 'undefined') {
    const imageCapture = new ImageCapture(track);
    imageCapture.getPhotoCapabilities().then(() => {
      isFlashOn = !isFlashOn;
      imageCapture.setOptions({ flash: isFlashOn ? 'flash' : 'off' })
        .then(() => updateFlashButton())
        .catch(() => fallbackTorch(track));
    }).catch(() => fallbackTorch(track));
    return;
  }

  fallbackTorch(track);
}

function fallbackTorch(track) {
  // Try torch constraint (Chrome Android / some mobile browsers)
  try {
    const capabilities = track.getCapabilities ? track.getCapabilities() : {};
    if (capabilities.torch) {
      isFlashOn = !isFlashOn;
      track.applyConstraints({
        advanced: [{ torch: isFlashOn }]
      }).then(() => updateFlashButton()).catch(() => {
        alert('⚠️ 闪光灯控制失败，请确认您的设备支持此功能');
      });
    } else {
      alert('📱 您的设备或浏览器不支持闪光灯控制。\n\n提示：请使用手机Chrome浏览器打开，并对准AR标记图片使用。');
    }
  } catch (e) {
    alert('📱 您的设备或浏览器不支持闪光灯控制。\n\n提示：请使用手机Chrome浏览器打开。');
  }
}

function updateFlashButton() {
  const btn = document.getElementById('flashBtn');
  if (btn) {
    btn.textContent = isFlashOn ? '🔦✓' : '🔦';
  }
}

// ===== Info Panel Toggle =====
function toggleInfoPanel() {
  const panel = document.getElementById('arInfoPanel');
  const toggle = document.getElementById('arInfoToggle');
  if (!panel || !toggle) return;

  const isCollapsed = panel.classList.toggle('collapsed');
  toggle.textContent = isCollapsed ? '▲' : '▼';
  toggle.title = isCollapsed ? '点击展开详细介绍' : '点击收起';
}

// ===== Navigation =====
function goBack() {
  // Stop all animation loops
  isActive = false;
  if (animFrameId) cancelAnimationFrame(animFrameId);
  if (particleAnimId) cancelAnimationFrame(particleAnimId);

  // Remove event listeners
  if (window._demoResizeHandler) {
    window.removeEventListener('resize', window._demoResizeHandler);
    delete window._demoResizeHandler;
  }
  window.removeEventListener('resize', onResize);

  // Stop AR system (mindAR)
  if (arSystem) {
    try { arSystem.stop(); } catch (e) { /* ignore */ }
  }

  // Dispose Three.js resources
  if (threeRenderer) {
    threeRenderer.dispose();
    // Remove canvas from DOM
    if (threeRenderer.domElement && threeRenderer.domElement.parentNode) {
      threeRenderer.domElement.parentNode.removeChild(threeRenderer.domElement);
    }
  }

  // Stop camera tracks if any
  if (videoElement && videoElement.srcObject) {
    videoElement.srcObject.getTracks().forEach(track => track.stop());
  }

  // Free scene resources
  if (threeScene && modelObject) {
    threeScene.remove(modelObject);
    disposeObject(modelObject);
  }

  window.location.href = '/';
}

// Recursively dispose a Three.js object and its children
function disposeObject(obj) {
  if (!obj) return;
  obj.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      if (Array.isArray(child.material)) {
        child.material.forEach(m => disposeMaterial(m));
      } else {
        disposeMaterial(child.material);
      }
    }
  });
}

function disposeMaterial(material) {
  for (const key of Object.keys(material)) {
    if (material[key] && material[key].isTexture) {
      material[key].dispose();
    }
  }
  material.dispose();
}

// ===== Error Display =====
function showError(title, message) {
  document.getElementById('arLoading').style.display = 'none';
  document.getElementById('arContainer').style.display = 'none';
  document.getElementById('arError').style.display = 'flex';
  document.getElementById('arErrorTitle').textContent = title;
  document.getElementById('arErrorMessage').textContent = message;
}

// Expose onclick handlers to global scope (required for ES modules)
window.goBack = goBack;
window.toggleFlash = toggleFlash;
window.toggleAudio = toggleAudio;
window.toggleInfoPanel = toggleInfoPanel;
