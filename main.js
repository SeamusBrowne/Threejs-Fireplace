	<script type="x-shader/x-vertex" id="vertexshader">

		attribute float size;

		varying vec3 vColor;

		void main() {

			vColor = color;

			vec4 mvPosition = modelViewMatrix * vec4( position, 1 );

			gl_PointSize = size * ( 200.0 / -mvPosition.z);

			gl_Position = projectionMatrix * mvPosition;

		}

	</script>

	<script type="x-shader/x-fragment" id="fragmentshader">

		uniform sampler2D pointTexture;

		varying vec3 vColor;

		void main() {

			gl_FragColor = vec4( vColor, 1.0 );

			gl_FragColor = gl_FragColor * texture2D( pointTexture, gl_PointCoord );

		}

	</script>

	<script type="module">

		import * as THREE from 'three';
		import Stats from './jsm/libs/stats.module.js';
		import { GUI } from './jsm/libs/dat.gui.module.js';

		import { OrbitControls } from './jsm/controls/OrbitControls.js';
		import { GLTFLoader } from './jsm/loaders/GLTFLoader.js';
		import { RGBELoader } from './jsm/loaders/RGBELoader.js';
		import { RoughnessMipmapper } from './jsm/utils/RoughnessMipmapper.js';

		let camera, scene, renderer, stats, gui;

		let particleSystem, uniforms, geometry;

		const particles = 75;

		init();
		render();

		function init() {

			const container = document.createElement('div');
			document.body.appendChild(container);

			camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.25, 20);
			camera.position.set(- 3, 1, 5);

			// stats = new Stats();
			// document.body.appendChild( stats.dom )

			//gui = new GUI();

			scene = new THREE.Scene();

			uniforms = {

				pointTexture: { value: new THREE.TextureLoader().load( 'textures/fire.jpg' )},
				pointMultiplier: { value: window.innerHeight / (2.0 * Math.tan(0.5, 60.0 * Math.PI / 100.0))}

			};

			const shaderMaterial = new THREE.ShaderMaterial({

				uniforms: uniforms,
				vertexShader: document.getElementById( 'vertexshader' ).textContent,
				fragmentShader: document.getElementById( 'fragmentshader' ).textContent,
				blending: THREE.AdditiveBlending,
				depthTest: true,
				depthWrite: false,
				transparent: true,
				vertexColors: true

			});

			geometry = new THREE.BufferGeometry();

			const positions = [];
			const colours = [];
			const sizes = [];
			const angles = [];

			const colour = new THREE.Color();

			for(let i = 0; i < particles; i++){
				positions.push((Math.random() * 2 - 0.75) * 0.2);
				positions.push((Math.random() * 1 - 0.25) * 0.2);
				positions.push((Math.random() * 1 - 0.75) * 0.2);

				colour.setHSL(i / particles, 1.0, 0.5);
				colours.push(colour.r, colour.g, colour.b);
				sizes.push(20);
			}

			geometry.setAttribute( 'position', new THREE.Float32BufferAttribute(positions, 3) );
			geometry.setAttribute( 'colour', new THREE.Float32BufferAttribute(colours, 3) );
			geometry.setAttribute( 'size', new THREE.Float32BufferAttribute(sizes, 1).setUsage(THREE.DynamicDrawUsage) );
			geometry.setAttribute( 'angle', new THREE.Float32BufferAttribute(angles, 1) );

			geometry.attributes.position.needsUpdate = true;
			geometry.attributes.colour.needsUpdate = true;
			geometry.attributes.size.needsUpdate = true;
			geometry.attributes.angle.needsUpdate = true;

			particleSystem = new THREE.Points(geometry, shaderMaterial);
			particleSystem.position.set(0, -0.7, 0.1);
			scene.add(particleSystem);


			new RGBELoader()
				.setDataType(THREE.UnsignedByteType)
				.setPath('textures/equirectangular/')
				.load('royal_esplanade_1k.hdr', function (texture) {

					const envMap = pmremGenerator.fromEquirectangular(texture).texture;

					scene.background = new THREE.Color( 0x705f73 );
					scene.environment = envMap;

					texture.dispose();
					pmremGenerator.dispose();

					render();

					// const light = new THREE.AmbientLight( 0xffffff, 0.75);
					// scene.add(light);

					// const pointlight = new THREE.PointLight(0xff5a00, 0.75);	// Orange flame colour
					const pointlight = new THREE.PointLight(0xff0000, 0.75);
					pointlight.position.set(1, 2, 1)
					pointlight.intensity = 1
					scene.add(pointlight);

					//const pointLightHelper = new THREE.PointLightHelper(pointlight, 0.1)
					//scene.add(pointLightHelper);

					//gui.add(pointlight.position, 'x').min(-3).max(3).step(0.05)
					//gui.add(pointlight.position, 'y').min(-3).max(3).step(0.05)
					//gui.add(pointlight.position, 'z').min(-3).max(3).step(0.05)
					//gui.add(pointlight, 'intensity').min(0).max(10).step(0.5)

					// Ceiling Light
					const ceilinglight = new THREE.PointLight(0xffffff, 0.75);
					ceilinglight.position.set(0, 3, 3) 
					ceilinglight.intensity = 0.5
					scene.add(ceilinglight);

					//const ceilinglightHelper = new THREE.PointLightHelper(ceilinglight, 0.1)
					//scene.add(ceilinglightHelper);
					

					// model

					const roughnessMipmapper = new RoughnessMipmapper(renderer);

					const loader = new GLTFLoader();
					loader.load('models/gltf/fireplace1.glb', function (gltf) {

						gltf.scene.traverse(function (child) {

							if (child.isMesh) {
								// roughnessMipmapper.generateMipmaps( child.material );

							}

						});

						scene.add(gltf.scene);

						roughnessMipmapper.dispose();

						render();

					});

				});

			renderer = new THREE.WebGLRenderer({ antialias: true });
			renderer.setPixelRatio(window.devicePixelRatio);
			renderer.setSize(window.innerWidth, window.innerHeight);
			renderer.toneMapping = THREE.ACESFilmicToneMapping;
			renderer.toneMappingExposure = 1;
			renderer.outputEncoding = THREE.sRGBEncoding;
			container.appendChild(renderer.domElement);

			const pmremGenerator = new THREE.PMREMGenerator(renderer);
			pmremGenerator.compileEquirectangularShader();

			const controls = new OrbitControls(camera, renderer.domElement);
			controls.addEventListener('change', render); // use if there is no animation loop
			controls.minDistance = 2;
			controls.maxDistance = 10;
			controls.target.set(0, 0, - 0.2);
			controls.update();


			window.addEventListener('resize', onWindowResize);

		}

		function onWindowResize() {

			camera.aspect = window.innerWidth / window.innerHeight;
			camera.updateProjectionMatrix();

			renderer.setSize(window.innerWidth, window.innerHeight);

		}

		function animate() {

			requestAnimationFrame(animate);
			render();

		}

		function render() {

			const time = Date.now() * 0.006;

			particleSystem.rotation.z = 0.01 * time;

			const sizes = geometry.attributes.size.array;

			for ( let i = 0; i < particles; i++ ) {

				sizes[ i ] = 1 * ( 1 + Math.sin( 0.1 * i + time ) );

			}

			geometry.attributes.size.needsUpdate = true;

			renderer.render(scene, camera);

		}
    
	</script>
