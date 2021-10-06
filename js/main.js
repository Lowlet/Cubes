import * as THREE from 'https://cdn.skypack.dev/three@0.132.2/build/three.module.js';
import { GLTFLoader } from 'https://cdn.skypack.dev/three@0.132.2/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'https://cdn.skypack.dev/three@0.132.2/examples/jsm/loaders/DRACOLoader.js';
import { RGBELoader } from 'https://cdn.skypack.dev/three@0.132.2/examples/jsm/loaders/RGBELoader.js';
import { EXRLoader } from 'https://cdn.skypack.dev/three@0.132.2/examples/jsm/loaders/EXRLoader.js';
import { EffectComposer } from 'https://cdn.skypack.dev/three@0.132.2/examples/jsm/postprocessing/EffectComposer.js';
import { SSRPass } from 'https://cdn.skypack.dev/three@0.132.2/examples/jsm/postprocessing/SSRPass.js';
import { FXAAShader } from 'https://cdn.skypack.dev/three@0.132.2/examples/jsm/shaders/FXAAShader.js';
import { ShaderPass } from 'https://cdn.skypack.dev/three@0.132.2/examples/jsm/postprocessing/ShaderPass.js';
import { FlyControls } from 'https://cdn.skypack.dev/three@0.132.2/examples/jsm/controls/FlyControls.js';
import Stats from 'https://cdn.skypack.dev/three@0.132.2/examples/jsm/libs/stats.module.js';
import * as TWEEN from 'https://cdn.skypack.dev/tween.js@16.6.0/src/Tween.js';

let clock, scene, camera, renderer, controls, mixer, composer, ssr, fxaa, stats;
const selects = [];
const positions = [
    [3.2, 11.5, 10.6],
    [-29, 10.2, 9.3],
    [-10.9, 5.6, -10.4]
];
const rotations = [
    [-1.5, 0, 1],
    [-1, -0.7, -0.8],
    [-2.6, -0.4, -2.9]
];
let currPosition = 0;
let isTweaning;

init();
update();

function init()
{
    clock = new THREE.Clock()

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(3.2, 11.5, 10.6);
    camera.rotation.set(-1.5, 0, 1);

    renderer = new THREE.WebGLRenderer(/* { antialias: true } */);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.5;
    renderer.physicallyCorrectLights = true;
    document.body.appendChild(renderer.domElement);

    //stats = new Stats();
    //document.body.appendChild(stats.dom);

    controls = new FlyControls(camera, renderer.domElement);
    controls.movementSpeed = 20;
    controls.domElement = renderer.domElement;
    controls.rollSpeed = 1;
    controls.autoForward = false;
    controls.dragToLook = true;

    //Screen Space Reflections
    ssr = new SSRPass({ renderer, scene, camera, width: innerWidth, height: innerHeight, encoding: THREE.sRGBEncoding, groundReflector: false, selects: selects });
    ssr.thickness = 0.02;
    ssr.infiniteThick = false;
    ssr.maxDistance = 1;
    ssr.opacity = 0.5;

    //FXAA
    fxaa = new ShaderPass(FXAAShader);
    fxaa.uniforms['resolution'].value.set(1 / window.innerWidth, 1 / window.innerHeight);
    fxaa.renderToScreen = false;

    //Composer
    composer = new EffectComposer(renderer);
    composer.setSize(window.innerWidth, window.innerHeight);
    composer.addPass(ssr);
    composer.addPass(fxaa);

    const loadingManager = new THREE.LoadingManager();

    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderConfig({ type: 'js' });
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.4.1/');

    new EXRLoader().load('./tex/studio2.exr', (texture) =>
    {
        texture.mapping = THREE.EquirectangularReflectionMapping;

        scene.background = new THREE.Color(0x3d9b97);
        scene.environment = texture;
        scene.fog = new THREE.FogExp2(0x3d9b97, 0.05);

        const gltfLoader = new GLTFLoader(loadingManager);
        gltfLoader.setDRACOLoader(dracoLoader);
        gltfLoader.load('./mdl/bg_cubes2.glb', (gltf) =>
        {
            scene.add(gltf.scene);

            mixer = new THREE.AnimationMixer(gltf.scene);

            gltf.animations.forEach((clip) =>
            {
                const action = mixer.clipAction(clip);
                action.setDuration(30);
                action.setLoop(THREE.LoopRepeat);
                action.play();
            });

            gltf.scene.traverse(function (child)
            {
                if (child.isMesh)
                {
                    selects.push(child);
                }
            });
        });
    });

    loadingManager.onLoad = () =>
    {
    }

/*     document.body.onmousedown = () =>
    {
        currPosition = (currPosition + 1) % 3;
        tweenCamera(camera, positions[currPosition], rotations[currPosition], 1500);
    } */

    window.addEventListener('wheel', event =>
    {
        if(isTweaning) return;

        if (event.deltaY > 0)
        {
            currPosition = (currPosition + 1) % 3;
        }
        else if (event.deltaY < 0)
        {
            currPosition = (((currPosition - 1) % 3) + 3) % 3;
        }
        isTweaning = true;
        tweenCamera(camera, positions[currPosition], rotations[currPosition], 1500);
    });

    window.addEventListener('resize', onWindowResize);
}

function update()
{
    requestAnimationFrame(update);

    const delta = clock.getDelta();

    if (mixer) mixer.update(delta);
    //controls.update(delta);
    //stats.update();
    TWEEN.update();

    //console.log(camera.position);
    //console.log(camera.rotation);
    //console.log(renderer.info.render);

    composer.render();
    //renderer.render(scene, camera);
}

function onWindowResize()
{
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
}

function tweenCamera(camera, position, rotation, duration)
{
    new TWEEN.Tween(camera.position).to({
        x: position[0],
        y: position[1],
        z: position[2]
    }, duration).easing(TWEEN.Easing.Quadratic.InOut).onComplete(()=>
    {
        isTweaning = false;
    }).start();

    new TWEEN.Tween(camera.rotation).to({
        x: rotation[0],
        y: rotation[1],
        z: rotation[2]
    }, duration).easing(TWEEN.Easing.Quadratic.InOut).start();
}

