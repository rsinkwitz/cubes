import * as THREE from 'three';

let scene, camera, renderer, cube;

function init() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  const geometry = new THREE.BoxGeometry();
  const materials = [
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

  animate();
}

function animate() {
  requestAnimationFrame(animate);
  cube.rotation.x += 0.01;
  cube.rotation.y += 0.01;
  renderer.render(scene, camera);
}

document.addEventListener('keydown', event => {
  window.ipcRenderer.send('keydown', event.key);
});

window.ipcRenderer.on('keydown', (_, key) => {
  switch (key) {
    case 'ArrowUp':
      cube.rotation.x += 0.1;
      break;
    case 'ArrowDown':
      cube.rotation.x -= 0.1;
      break;
    case 'ArrowLeft':
      cube.rotation.y += 0.1;
      break;
    case 'ArrowRight':
      cube.rotation.y -= 0.1;
      break;
    case 'z':
      cube.rotation.z += 0.1;
      break;
    case 'Z':
      cube.rotation.z -= 0.1;
      break;
    default:
      break;
  }
});

window.addEventListener('DOMContentLoaded', init);
