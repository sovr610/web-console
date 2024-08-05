class WebXRAR {
    constructor(scene) {
        this.scene = scene;
        this.session = null;
        this.hitTestSource = null;
        this.planeHitTestSource = null;
        this.lightProbe = null;
        this.features = {
            hitTest: false,
            lightEstimation: false,
            planeDetection: false,
            depthSensing: false,
            meshDetection: false,
            domOverlay: false,
            arToVr: false,
            occlusion: false
        };
        this.callbacks = {
            onDepthData: null,
            onMeshData: null
        };
        this.currentMode = 'ar';
        this.depthTexture = null;
    }

    async startARSession() {
        if (!navigator.xr) {
            throw new Error('WebXR not supported');
        }

        const supported = await navigator.xr.isSessionSupported('immersive-ar');
        if (!supported) {
            throw new Error('Immersive AR not supported');
        }

        const optionalFeatures = await this.checkFeatureSupport();

        try {
            const session = await navigator.xr.requestSession('immersive-ar', {
                optionalFeatures: optionalFeatures,
            });

            this.session = session;
            this.setupAFrameForAR();
            await this.scene.renderer.xr.setSession(session);
            await this.initARFeatures();
            this.setupEventListeners();
            
            console.log('AR session started with features:', this.features);
        } catch (error) {
            console.error('Error starting AR session:', error);
            throw error;
        }
    }

    async checkFeatureSupport() {
        const optionalFeatures = ['local-floor', 'ar-to-vr', 'occlusion'];
        
        if (await this.isFeatureSupported('hit-test')) {
            optionalFeatures.push('hit-test');
            this.features.hitTest = true;
        }

        if (await this.isFeatureSupported('light-estimation')) {
            optionalFeatures.push('light-estimation');
            this.features.lightEstimation = true;
        }

        if (await this.isFeatureSupported('depth-sensing')) {
            optionalFeatures.push('depth-sensing');
            this.features.depthSensing = true;
        }

        if (await this.isFeatureSupported('dom-overlay')) {
            optionalFeatures.push('dom-overlay');
            this.features.domOverlay = true;
        }

        if (await this.isFeatureSupported('mesh-detection')) {
            optionalFeatures.push('mesh-detection');
            this.features.meshDetection = true;
        }

        if (await this.isFeatureSupported('ar-to-vr')) {
            this.features.arToVr = true;
        }

        if (await this.isFeatureSupported('occlusion')) {
            this.features.occlusion = true;
        }

        console.log('Supported optional features:', optionalFeatures);
        return optionalFeatures;
    }

    async isFeatureSupported(feature) {
        if (navigator.xr && navigator.xr.isSessionSupported) {
            try {
                const supported = await navigator.xr.isSessionSupported('immersive-ar', { optionalFeatures: [feature] });
                return supported;
            } catch (error) {
                console.warn(`Error checking support for ${feature}:`, error);
                return false;
            }
        }
        return false;
    }

    setupAFrameForAR() {
        const sceneEl = this.scene;
        sceneEl.removeAttribute('background');
        sceneEl.setAttribute('xrweb', '');

        const cameraEl = sceneEl.camera.el;
        cameraEl.setAttribute('camera', 'active', true);
        cameraEl.setAttribute('ar-camera', '');

        const renderer = sceneEl.renderer;
        renderer.xr.enabled = true;
        renderer.xr.setReferenceSpaceType('local');
        renderer.setClearColor(0x000000, 0);

        if (this.features.occlusion) {
            this.setupOcclusion();
        }
    }

    setupOcclusion() {
        const renderer = this.scene.renderer;
        const depthTexture = new THREE.DepthTexture();
        const renderTarget = new THREE.WebGLRenderTarget(
            window.innerWidth,
            window.innerHeight,
            {
                depthTexture: depthTexture,
                depthBuffer: true
            }
        );
        renderer.xr.setFoveation(0);
        this.depthTexture = depthTexture;

        const occlusionMaterial = new THREE.ShaderMaterial({
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D depthTexture;
                varying vec2 vUv;
                void main() {
                    float depth = texture2D(depthTexture, vUv).r;
                    gl_FragColor = vec4(vec3(depth), 1.0);
                }
            `,
            uniforms: {
                depthTexture: { value: depthTexture }
            }
        });

        this.scene.traverse((node) => {
            if (node.isMesh) {
                node.material = occlusionMaterial;
            }
        });
    }

    async initARFeatures() {
        if (this.features.hitTest) {
            try {
                this.hitTestSource = await this.session.requestHitTestSource({space: 'viewer'});
                this.planeHitTestSource = await this.session.requestHitTestSource({
                    space: 'viewer',
                    entityTypes: ['plane']
                });
            } catch (error) {
                console.warn('Hit test source request failed:', error);
                this.features.hitTest = false;
            }
        }

        if (this.features.lightEstimation) {
            try {
                this.lightProbe = await this.session.requestLightProbe();
            } catch (error) {
                console.warn('Light probe request failed:', error);
                this.features.lightEstimation = false;
            }
        }

        if ('updateWorldTrackingState' in this.session) {
            try {
                await this.session.updateWorldTrackingState({planeDetectionState: {enabled: true}});
                this.features.planeDetection = true;
            } catch (error) {
                console.warn('Plane detection activation failed:', error);
                this.features.planeDetection = false;
            }
        }

        if (this.features.arToVr) {
            this.setupARtoVRTransition();
        }
    }

    setupARtoVRTransition() {
        const transitionButton = document.createElement('button');
        transitionButton.textContent = 'Switch to VR';
        transitionButton.style.position = 'absolute';
        transitionButton.style.bottom = '20px';
        transitionButton.style.left = '20px';
        document.body.appendChild(transitionButton);

        transitionButton.addEventListener('click', () => {
            if (this.currentMode === 'ar') {
                this.switchToVR();
            } else {
                this.switchToAR();
            }
        });
    }

    async switchToVR() {
        if (this.session) {
            await this.session.end();
        }

        const session = await navigator.xr.requestSession('immersive-vr', {
            optionalFeatures: ['local-floor']
        });

        this.session = session;
        this.currentMode = 'vr';
        await this.scene.renderer.xr.setSession(session);
        this.setupEventListeners();
    }

    async switchToAR() {
        if (this.session) {
            await this.session.end();
        }

        await this.startARSession();
        this.currentMode = 'ar';
    }

    setupEventListeners() {
        this.session.addEventListener('select', this.onSelect.bind(this));
        
        if (this.features.lightEstimation && this.lightProbe) {
            this.lightProbe.addEventListener('reflectionchange', this.onReflectionChange.bind(this));
        }
        
        if (this.features.planeDetection) {
            this.session.addEventListener('planedetected', this.onPlaneDetected.bind(this));
        }

        this.session.requestAnimationFrame(this.onXRFrame.bind(this));
    }

    onSelect(event) {
        if (this.features.hitTest && this.planeHitTestSource) {
            const frame = event.frame;
            const hitTestResults = frame.getHitTestResults(this.planeHitTestSource);
            if (hitTestResults.length > 0) {
                const hit = hitTestResults[0];
                const pose = hit.getPose(this.session.referenceSpace);
                this.placeObject(pose);
            }
        }
    }

    onReflectionChange(event) {
        const lightEstimate = event.target;
        console.log('Light estimation update:', lightEstimate);
        // Update scene lighting based on the estimate
    }

    onPlaneDetected(event) {
        const plane = event.plane;
        console.log('Plane detected:', plane);
        // Visualize or use the detected plane
    }

    onXRFrame(time, frame) {
        this.session.requestAnimationFrame(this.onXRFrame.bind(this));

        const referenceSpace = this.session.renderState.baseLayer.getViewport(frame.getViewerPose(this.session.referenceSpace).views[0]);

        if (this.features.occlusion && this.currentMode === 'ar') {
            this.updateOcclusion(frame);
        }

        // Ensure the scene is rendered
        this.scene.renderer.render(this.scene.object3D, this.scene.camera);

        if (this.features.depthSensing) {
            this.processDepthData(frame, referenceSpace);
        }

        if (this.features.meshDetection) {
            this.processMeshData(frame);
        }
    }

    updateOcclusion(frame) {
        if (frame.getDepthInformation) {
            const depthInfo = frame.getDepthInformation(this.session.renderState.baseLayer.getViewport(frame.getViewerPose(this.session.referenceSpace).views[0]));
            if (depthInfo) {
                this.depthTexture.image.data = depthInfo.data;
                this.depthTexture.needsUpdate = true;
            }
        }
    }

    processDepthData(frame, referenceSpace) {
        if ('getDepthInformation' in frame) {
            try {
                const depthInfo = frame.getDepthInformation(referenceSpace);
                if (depthInfo && this.callbacks.onDepthData) {
                    this.callbacks.onDepthData(depthInfo);
                }
            } catch (error) {
                console.warn('Error processing depth data:', error);
            }
        }
    }

    processMeshData(frame) {
        if ('meshes' in frame && this.callbacks.onMeshData) {
            try {
                const meshes = frame.meshes;
                this.callbacks.onMeshData(meshes);
            } catch (error) {
                console.warn('Error processing mesh data:', error);
            }
        }
    }

    placeObject(pose) {
        // Create an a-box entity
        const box = document.createElement('a-box');
        
        // Set the position of the box to the hit test result pose
        const position = pose.transform.position;
        box.setAttribute('position', `${position.x} ${position.y} ${position.z}`);
        
        // Set other attributes for the box
        box.setAttribute('color', 'red');
        box.setAttribute('width', '0.1');
        box.setAttribute('height', '0.1');
        box.setAttribute('depth', '0.1');

        // Add the box to the scene
        this.scene.appendChild(box);
    }

    setDepthDataCallback(callback) {
        this.callbacks.onDepthData = callback;
    }

    setMeshDataCallback(callback) {
        this.callbacks.onMeshData = callback;
    }

    endARSession() {
        if (this.session) {
            this.session.end();
            this.session = null;
        }
    }
}

// Usage example:
/*
document.addEventListener('DOMContentLoaded', () => {
    const scene = document.querySelector('a-scene');
    const arSession = new WebXRAR(scene);
    
    document.getElementById('startAR').addEventListener('click', async () => {
        try {
            await arSession.startARSession();
            console.log('AR session started. Tap on a detected plane to place a box.');
        } catch (error) {
            console.error('Failed to start AR session:', error);
        }
    });
});
*/