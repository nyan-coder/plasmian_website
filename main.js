/* ──────────────────────────────────────────────
   PLASMIAN — Landing Page JavaScript
   
   Exact BreathDearMedusae port (Three.js + GLSL)
   + Lenis smooth scroll, scroll reveals, etc.
   ────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {

    // ═══════════════════════════════════════════
    //  BREATHDEARMEDUSAE — Exact Three.js port
    //  Original: github.com/ewohlken2/BreathDearMedusae
    // ═══════════════════════════════════════════

    const DEFAULTS = {
        cursor: {
            radius: 0.065,
            strength: 3,
            dragFactor: 0.015,
        },
        halo: {
            outerOscFrequency: 2.6,
            outerOscAmplitude: 0.76,
            outerOscJitterStrength: 0.025,
            outerOscJitterSpeed: 0.3,
            radiusBase: 2.4,
            radiusAmplitude: 0.5,
            shapeAmplitude: 0.75,
            rimWidth: 1.8,
            outerStartOffset: 0.4,
            outerEndOffset: 2.2,
            scaleX: 1.3,
            scaleY: 1,
        },
        particles: {
            baseSize: 0.016,
            activeSize: 0.044,
            blobScaleX: 1,
            blobScaleY: 0.6,
            rotationSpeed: 0.1,
            rotationJitter: 0.2,
            cursorFollowStrength: 1,
            oscillationFactor: 1,
            colorBase: "#000000",
            colorOne: "#121212",
            colorTwo: "#242424",
            colorThree: "#363636",
        },  
        background: {
            color: "#ffffff",
        },
    };

    // ── Vertex Shader (exact copy from Medusae.jsx) ──
    const vertexShader = `
        uniform float uTime;
        uniform vec2 uMouse;
        uniform float uOuterOscFrequency;
        uniform float uOuterOscAmplitude;
        uniform float uHaloRadiusBase;
        uniform float uHaloRadiusAmplitude;
        uniform float uHaloShapeAmplitude;
        uniform float uHaloRimWidth;
        uniform float uHaloOuterStartOffset;
        uniform float uHaloOuterEndOffset;
        uniform float uHaloScaleX;
        uniform float uHaloScaleY;
        uniform float uParticleBaseSize;
        uniform float uParticleActiveSize;
        uniform float uBlobScaleX;
        uniform float uBlobScaleY;
        uniform float uParticleRotationSpeed;
        uniform float uParticleRotationJitter;
        uniform float uParticleOscillationFactor;
        uniform vec3 uParticleColorBase;
        uniform vec3 uParticleColorOne;
        uniform vec3 uParticleColorTwo;
        uniform vec3 uParticleColorThree;
        varying vec2 vUv;
        varying float vSize;
        varying vec2 vPos;

        attribute vec3 aOffset;
        attribute float aRandom;

        #define PI 3.14159265359

        float hash(vec2 p) {
            return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
        }
        float noise(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            f = f * f * (3.0 - 2.0 * f);
            float a = hash(i);
            float b = hash(i + vec2(1.0, 0.0));
            float c = hash(i + vec2(0.0, 1.0));
            float d = hash(i + vec2(1.0, 1.0));
            return mix( mix(a, b, f.x), mix(c, d, f.x), f.y);
        }

        mat2 rotate2d(float _angle){
            return mat2(cos(_angle), sin(_angle),
                        -sin(_angle), cos(_angle));
        }

        void main() {
            vUv = uv;

            // --- 1. ALIVE FLOW (Base layer) ---
            vec3 pos = aOffset;

            float driftSpeed = uTime * 0.15;

            float dx = sin(driftSpeed + pos.y * 0.5) + sin(driftSpeed * 0.5 + pos.y * 2.0);
            float dy = cos(driftSpeed + pos.x * 0.5) + cos(driftSpeed * 0.5 + pos.x * 2.0);

            pos.x += dx * 0.25;
            pos.y += dy * 0.25;

            // --- 2. THE JELLYFISH HALO (Smooth & Subtle) ---

            vec2 relToMouse = pos.xy - uMouse;
            vec2 haloScale = max(vec2(uHaloScaleX, uHaloScaleY), vec2(0.0001));
            float distFromMouse = length(relToMouse / haloScale);
            float angleToMouse = atan(relToMouse.y, relToMouse.x);
            vec2 dirToMouse = normalize(relToMouse + vec2(0.0001, 0.0));

            float shapeFactor = noise(dirToMouse * 2.0 + vec2(0.0, uTime * 0.1));

            float radiusBase = uHaloRadiusBase;
            float radiusAmplitude = uHaloRadiusAmplitude;
            float shapeAmplitude = uHaloShapeAmplitude;
            float rimWidth = uHaloRimWidth;
            float outerStartOffset = uHaloOuterStartOffset;
            float outerEndOffset = uHaloOuterEndOffset;

            float breathCycle = sin(uTime * 0.8);

            float baseRadius = radiusBase + breathCycle * radiusAmplitude;
            float currentRadius = baseRadius + (shapeFactor * shapeAmplitude);

            float dist = distFromMouse;
            float rimInfluence = smoothstep(rimWidth, 0.0, abs(dist - currentRadius));

            vec2 pushDir = normalize(relToMouse + vec2(0.0001, 0.0));

            float pushAmt = (breathCycle * 0.5 + 0.5) * 0.5;

            pos.xy += pushDir * pushAmt * rimInfluence;

            pos.z += rimInfluence * 0.3 * sin(uTime);

            // --- 3.5 OUTER OSCILLATION (Smooth, Faster) ---
            float outerInfluence = smoothstep(baseRadius + outerStartOffset, baseRadius + outerEndOffset, dist);
            float outerOsc = sin(uTime * uOuterOscFrequency + pos.x * 0.6 + pos.y * 0.6);
            pos.xy += normalize(relToMouse + vec2(0.0001, 0.0)) * outerOsc * uOuterOscAmplitude * outerInfluence;

            // --- 4. SIZE & SCALE ---

            float baseSize = uParticleBaseSize + (sin(uTime + pos.x)*0.003);

            float activeSize = uParticleActiveSize;
            float currentScale = baseSize + (rimInfluence * activeSize);

            float stretch = rimInfluence * 0.02;

            vec3 transformed = position;
            transformed.x *= (currentScale + stretch) * uBlobScaleX;
            transformed.y *= currentScale * uBlobScaleY;

            vSize = rimInfluence;
            vPos = pos.xy;

            // --- 5. ROTATION ---

            float dirLen = max(length(relToMouse), 0.0001);
            vec2 dir = relToMouse / dirLen;
            float oscPhase = aRandom * 6.28318530718;
            float osc = 0.5 + 0.5 * sin(
              uTime * (0.25 + uParticleOscillationFactor * 0.35) + oscPhase
            );
            float speedScale = mix(0.55, 1.35, osc) * (0.8 + uParticleOscillationFactor * 0.2);
            float jitterScale = mix(0.7, 1.45, osc) * (0.85 + uParticleOscillationFactor * 0.15);
            float jitter = sin(
              uTime * uParticleRotationSpeed * speedScale + pos.x * 0.35 + pos.y * 0.35
            ) * (uParticleRotationJitter * jitterScale);
            vec2 perp = vec2(-dir.y, dir.x);
            vec2 jitteredDir = normalize(dir + perp * jitter);
            mat2 rot = mat2(jitteredDir.x, jitteredDir.y, -jitteredDir.y, jitteredDir.x);
            transformed.xy = rot * transformed.xy;

            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos + transformed, 1.0);
        }
    `;

    // ── Fragment Shader (exact copy from Medusae.jsx) ──
    const fragmentShader = `
        uniform float uTime;
        uniform vec3 uParticleColorBase;
        uniform vec3 uParticleColorOne;
        uniform vec3 uParticleColorTwo;
        uniform vec3 uParticleColorThree;
        varying vec2 vUv;
        varying float vSize;
        varying vec2 vPos;

        void main() {
            vec2 center = vec2(0.5);
            vec2 pos = abs(vUv - center) * 2.0;

            float d = pow(pow(pos.x, 2.6) + pow(pos.y, 2.6), 1.0/2.6);
            float alpha = 1.0 - smoothstep(0.8, 1.0, d);

            if (alpha < 0.01) discard;

            vec3 black = uParticleColorBase;
            vec3 cBlue = uParticleColorOne;
            vec3 cRed = uParticleColorTwo;
            vec3 cYellow = uParticleColorThree;

            float t = uTime * 1.2;

            float p1 = sin(vPos.x * 0.8 + t);
            float p2 = sin(vPos.y * 0.8 + t * 0.8 + p1);

            vec3 activeColor = mix(cBlue, cRed, p1 * 0.5 + 0.5);
            activeColor = mix(activeColor, cYellow, p2 * 0.5 + 0.5);

            vec3 finalColor = mix(black, activeColor, smoothstep(0.1, 0.8, vSize));
            float finalAlpha = alpha * mix(0.55, 0.95, vSize);

            gl_FragColor = vec4(finalColor, finalAlpha);
        }
    `;

    // ── Three.js Scene Setup ──
    const container = document.getElementById('medusae-container');
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(DEFAULTS.background.color);

    const camera = new THREE.PerspectiveCamera(
        75,
        container.clientWidth / container.clientHeight,
        0.1,
        1000
    );
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // ── Instanced Mesh Setup ──
    const countX = 100;
    const countY = 55;
    const count = countX * countY;

    const planeGeo = new THREE.PlaneGeometry(1, 1);

    const uniforms = {
        uTime: { value: 0 },
        uMouse: { value: new THREE.Vector2(0, 0) },
        uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        uOuterOscFrequency: { value: DEFAULTS.halo.outerOscFrequency },
        uOuterOscAmplitude: { value: DEFAULTS.halo.outerOscAmplitude },
        uHaloRadiusBase: { value: DEFAULTS.halo.radiusBase },
        uHaloRadiusAmplitude: { value: DEFAULTS.halo.radiusAmplitude },
        uHaloShapeAmplitude: { value: DEFAULTS.halo.shapeAmplitude },
        uHaloRimWidth: { value: DEFAULTS.halo.rimWidth },
        uHaloOuterStartOffset: { value: DEFAULTS.halo.outerStartOffset },
        uHaloOuterEndOffset: { value: DEFAULTS.halo.outerEndOffset },
        uHaloScaleX: { value: DEFAULTS.halo.scaleX },
        uHaloScaleY: { value: DEFAULTS.halo.scaleY },
        uParticleBaseSize: { value: DEFAULTS.particles.baseSize },
        uParticleActiveSize: { value: DEFAULTS.particles.activeSize },
        uBlobScaleX: { value: DEFAULTS.particles.blobScaleX },
        uBlobScaleY: { value: DEFAULTS.particles.blobScaleY },
        uParticleRotationSpeed: { value: DEFAULTS.particles.rotationSpeed },
        uParticleRotationJitter: { value: DEFAULTS.particles.rotationJitter },
        uParticleOscillationFactor: { value: DEFAULTS.particles.oscillationFactor },
        uParticleColorBase: { value: new THREE.Color(DEFAULTS.particles.colorBase) },
        uParticleColorOne: { value: new THREE.Color(DEFAULTS.particles.colorOne) },
        uParticleColorTwo: { value: new THREE.Color(DEFAULTS.particles.colorTwo) },
        uParticleColorThree: { value: new THREE.Color(DEFAULTS.particles.colorThree) },
    };

    const shaderMaterial = new THREE.ShaderMaterial({
        uniforms,
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
    });

    const mesh = new THREE.InstancedMesh(planeGeo, shaderMaterial, count);
    scene.add(mesh);

    // ── Instance Attributes (exact grid from original) ──
    const offsets = new Float32Array(count * 3);
    const randoms = new Float32Array(count);

    const gridWidth = 40;
    const gridHeight = 22;
    const jitter = 0.25;

    let idx = 0;
    for (let y = 0; y < countY; y++) {
        for (let x = 0; x < countX; x++) {
            const u = x / (countX - 1);
            const v = y / (countY - 1);

            let px = (u - 0.5) * gridWidth;
            let py = (v - 0.5) * gridHeight;

            px += (Math.random() - 0.5) * jitter;
            py += (Math.random() - 0.5) * jitter;

            offsets[idx * 3] = px;
            offsets[idx * 3 + 1] = py;
            offsets[idx * 3 + 2] = 0;

            randoms[idx] = Math.random();
            idx++;
        }
    }

    mesh.geometry.setAttribute('aOffset', new THREE.InstancedBufferAttribute(offsets, 3));
    mesh.geometry.setAttribute('aRandom', new THREE.InstancedBufferAttribute(randoms, 1));

    // ── Mouse Tracking (exact logic from original) ──
    let hovering = true;
    let globalPointer = { x: 0, y: 0 };

    document.body.addEventListener('mouseleave', () => { hovering = false; });
    document.body.addEventListener('mouseenter', () => { hovering = true; });

    window.addEventListener('pointermove', (e) => {
        globalPointer.x = (e.clientX / window.innerWidth) * 2 - 1;
        globalPointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    // ── Viewport helper (replicates R3F viewport) ──
    function getViewportSize() {
        const fov = camera.fov * (Math.PI / 180);
        const height = 2 * Math.tan(fov / 2) * camera.position.z;
        const width = height * camera.aspect;
        return { width, height };
    }

    // ── Resize ──
    function onResize() {
        const w = container.clientWidth;
        const h = container.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
        uniforms.uResolution.value.set(w, h);
    }
    window.addEventListener('resize', onResize);

    // ── Animation Loop (exact logic from useFrame) ──
    const clock = new THREE.Clock();

    function animate() {
        requestAnimationFrame(animate);

        const t = clock.getElapsedTime();
        uniforms.uTime.value = t;

        const viewport = getViewportSize();

        if (hovering) {
            const baseX = (globalPointer.x * viewport.width) / 2;
            const baseY = (globalPointer.y * viewport.height) / 2;
            const jitterRadius =
                Math.min(viewport.width, viewport.height) * DEFAULTS.cursor.radius;
            const jitterX = (Math.sin(t * 0.35) + Math.sin(t * 0.77 + 1.2)) * 0.5;
            const jitterY = (Math.cos(t * 0.31) + Math.sin(t * 0.63 + 2.4)) * 0.5;
            const followStrength = DEFAULTS.particles.cursorFollowStrength;
            const targetX = (baseX + jitterX * jitterRadius * DEFAULTS.cursor.strength) * followStrength;
            const targetY = (baseY + jitterY * jitterRadius * DEFAULTS.cursor.strength) * followStrength;

            const current = uniforms.uMouse.value;
            const dragFactor = DEFAULTS.cursor.dragFactor;
            current.x += (targetX - current.x) * dragFactor;
            current.y += (targetY - current.y) * dragFactor;
        }

        renderer.render(scene, camera);
    }

    animate();


    // ═══════════════════════════════════════════
    //  LENIS SMOOTH SCROLL
    // ═══════════════════════════════════════════

    class SmoothScroll {
        constructor() {
            this.currentY = window.scrollY;
            this.targetY = window.scrollY;
            this.ease = 0.08;

            window.addEventListener('wheel', (e) => {
                e.preventDefault();
                this.targetY += e.deltaY;
                this.targetY = Math.max(0, Math.min(this.targetY, this.getMaxScroll()));
            }, { passive: false });

            let touchStartY = 0;
            window.addEventListener('touchstart', (e) => {
                touchStartY = e.touches[0].clientY;
            }, { passive: true });

            window.addEventListener('touchmove', (e) => {
                const touchY = e.touches[0].clientY;
                const delta = touchStartY - touchY;
                touchStartY = touchY;
                this.targetY += delta * 1.5;
                this.targetY = Math.max(0, Math.min(this.targetY, this.getMaxScroll()));
            }, { passive: true });

            window.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowDown' || e.key === ' ') this.targetY += 120;
                else if (e.key === 'ArrowUp') this.targetY -= 120;
                else if (e.key === 'PageDown') this.targetY += window.innerHeight * 0.8;
                else if (e.key === 'PageUp') this.targetY -= window.innerHeight * 0.8;
                else if (e.key === 'Home') this.targetY = 0;
                else if (e.key === 'End') this.targetY = this.getMaxScroll();
                else return;
                this.targetY = Math.max(0, Math.min(this.targetY, this.getMaxScroll()));
            });

            this.update();
        }

        getMaxScroll() {
            return document.documentElement.scrollHeight - window.innerHeight;
        }

        scrollTo(y) {
            this.targetY = Math.max(0, Math.min(y, this.getMaxScroll()));
        }

        update() {
            const diff = this.targetY - this.currentY;
            this.currentY += diff * this.ease;
            if (Math.abs(diff) < 0.5) this.currentY = this.targetY;
            window.scrollTo(0, this.currentY);
            requestAnimationFrame(() => this.update());
        }
    }

    const smoothScroll = new SmoothScroll();


    // ═══════════════════════════════════════════
    //  NAVBAR
    // ═══════════════════════════════════════════

    const navbar = document.getElementById('navbar');
    window.addEventListener('scroll', () => {
        navbar.classList.toggle('scrolled', window.scrollY > 40);
    }, { passive: true });

    // Mobile menu
    const mobileBtn = document.getElementById('mobile-menu-btn');
    const mobileNav = document.getElementById('mobile-nav');
    if (mobileBtn && mobileNav) {
        mobileBtn.addEventListener('click', () => {
            mobileBtn.classList.toggle('active');
            mobileNav.classList.toggle('open');
        });
        mobileNav.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                mobileBtn.classList.remove('active');
                mobileNav.classList.remove('open');
            });
        });
    }


    // ═══════════════════════════════════════════
    //  SCROLL REVEAL
    // ═══════════════════════════════════════════

    const revealElements = document.querySelectorAll(
        '.feature-card, .download-card, .about-text, .about-visual'
    );

    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const el = entry.target;
                const siblings = el.parentElement ?
                    Array.from(el.parentElement.querySelectorAll(`.${el.classList[0]}`)) : [];
                const idx = siblings.indexOf(el);
                setTimeout(() => el.classList.add('visible'), Math.max(0, idx) * 100);
                revealObserver.unobserve(el);
            }
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

    revealElements.forEach(el => revealObserver.observe(el));


    // ═══════════════════════════════════════════
    //  TERMINAL EFFECT
    // ═══════════════════════════════════════════

    const terminalOutput = document.getElementById('neofetch-output');
    const terminalSection = document.querySelector('.about-visual');
    if (terminalOutput && terminalSection) {
        const tObs = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    setTimeout(() => terminalOutput.classList.add('visible'), 600);
                    tObs.unobserve(entry.target);
                }
            });
        }, { threshold: 0.3 });
        tObs.observe(terminalSection);
    }


    // ═══════════════════════════════════════════
    //  SMOOTH ANCHORS
    // ═══════════════════════════════════════════

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const id = this.getAttribute('href');
            if (id === '#') return;
            const target = document.querySelector(id);
            if (target) {
                e.preventDefault();
                smoothScroll.scrollTo(target.getBoundingClientRect().top + window.scrollY - 80);
            }
        });
    });


    // ═══════════════════════════════════════════
    //  3D TILT ON CARDS
    // ═══════════════════════════════════════════

    document.querySelectorAll('.feature-card').forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const r = card.getBoundingClientRect();
            const x = (e.clientX - r.left) / r.width - 0.5;
            const y = (e.clientY - r.top) / r.height - 0.5;
            card.style.transform = `perspective(800px) rotateX(${y * -6}deg) rotateY(${x * 6}deg) translateY(-4px)`;
        });
        card.addEventListener('mouseleave', () => {
            card.style.transform = '';
            card.style.transition = 'transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)';
            setTimeout(() => { card.style.transition = ''; }, 500);
        });
    });

});
