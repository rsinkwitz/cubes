import * as THREE from 'three';

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let cube: THREE.Mesh;
let animationPaused: boolean = false;

function init(): void {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  const geometry: THREE.BoxGeometry = new THREE.BoxGeometry();
  const materials: THREE.MeshBasicMaterial[] = [
    new THREE.MeshBasicMaterial({ color: 0xff0000 }),
    new THREE.MeshBasicMaterial({ color: 0x00ff00 }),
    new THREE.MeshBasicMaterial({ color: 0x0000ff }),
    new THREE.MeshBasicMaterial({ color: 0xffff00 }),
    new THREE.MeshBasicMaterial({ color: 0xff00ff }),
    new THREE.MeshBasicMaterial({ color: 0x00ffff })
  ];
  cube = new THREE.Mesh(geometry, materials);
  scene.add(cube);

  camera.position.z = 5;

  animate(); // Always start the animation loop
}

function animate(): void {
  if (!animationPaused) {
    requestAnimationFrame(animate);
    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;
    cube.rotation.z += 0.01;
    renderer.render(scene, camera);
  }
}

function onKeyDown(event: KeyboardEvent): void {
  switch (event.key) {
    case 'ArrowUp':
      cube.rotation.x += 0.1;
      renderer.render(scene, camera);
      break;
    case 'ArrowDown':
      cube.rotation.x -= 0.1;
      renderer.render(scene, camera);
      break;
    case 'ArrowLeft':
      cube.rotation.y += 0.1;
      renderer.render(scene, camera);
      break;
    case 'ArrowRight':
      cube.rotation.y -= 0.1;
      renderer.render(scene, camera);
      break;
    case 'z':
      cube.rotation.z += 0.1;
      renderer.render(scene, camera);
      break;
    case 'Z':
      cube.rotation.z -= 0.1;
      renderer.render(scene, camera);
      break;
    case 'p': // Pause animation
    case 'P':
      animationPaused = !animationPaused;
      if (!animationPaused) {
        animate(); // Resume animation
      }
      break;
    default:
      break;
  }
}

document.addEventListener('keydown', onKeyDown);

window.addEventListener('DOMContentLoaded', init);
