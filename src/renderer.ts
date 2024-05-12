import * as THREE from 'three';
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";

declare global {
  interface Window {
    ipcRenderer: {
      send: (channel: string, data?: any) => void;
      on: (channel: string, func: any) => void;
    };
  }
}

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let controls : OrbitControls;
let renderer: THREE.WebGLRenderer;
let cube: THREE.Mesh;
let animationPaused: boolean = false;
const geometry: THREE.BoxGeometry = new THREE.BoxGeometry(0.95,0.95,0.95);
const materials: THREE.MeshBasicMaterial[] = [
  new THREE.MeshBasicMaterial({ color: 0xff0000 }), // right  red
  new THREE.MeshBasicMaterial({ color: 0xff8000 }), // left   orange
  new THREE.MeshBasicMaterial({ color: 0xffffff }), // top    white
  new THREE.MeshBasicMaterial({ color: 0xffff00 }), // bottom yellow
  new THREE.MeshBasicMaterial({ color: 0x00ff00 }), // front  green
  new THREE.MeshBasicMaterial({ color: 0x0000ff })  // back   blue
];

let pieces: THREE.Mesh[][][] = [];

function init(): void {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  controls = new OrbitControls( camera, renderer.domElement );
  document.body.appendChild(renderer.domElement);

  createPieces();
  cube = pieces[2][2][2];

  //controls.update() must be called after any manual changes to the camera's transform
  camera.position.set( 0, 0, 5 );
  controls.update();

  animate(); // Always start the animation loop
 // renderer.render(scene, camera);
}

function createPieces(): void {
  for (let i = -1; i <= 1; i++) {
    let piecesLayer:THREE.Mesh[][] = [];
    for (let j = -1; j <= 1; j++) {
      let piecesRow: THREE.Mesh[] = [];
      for (let k = -1; k <= 1; k++) {
        let cube = createCube(k, j, i);
        piecesRow.push(cube);
      }
      piecesLayer.push(piecesRow);
    }
    pieces.push(piecesLayer);
  }
}

function createCube(x: number, y: number, z: number): THREE.Mesh {
  var cube: THREE.Mesh;
  cube = new THREE.Mesh(geometry, materials);
  cube.position.set(x, y, z);
  scene.add(cube);
  return cube;
}

function animate(): void {requestAnimationFrame(animate);
  if (!animationPaused) {
    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;
    cube.rotation.z += 0.01;
  }
  renderer.render(scene, camera);
}

function selectPieces(xf?: number, yf?: number, zf?: number): void {
  for (let i = 0; i < pieces.length; i++) {
    for (let j = 0; j < pieces[i].length; j++) {
      for (let k = 0; k < pieces[i][j].length; k++) {
        let piece = pieces[k][j][i];
        if ((k === xf || typeof k === 'undefined') &&
          (j === yf || typeof j === 'undefined') &&
          (i === zf || typeof i === 'undefined')) {
          piece.material = new THREE.MeshBasicMaterial({color: 0x000000});
        }
      }
    }
  }
}

function onKeyDown(event: KeyboardEvent): void {
  switch (event.key) {
    case "d":
      window.ipcRenderer.send('open-dev-tools');
      break;
    case "s":
      selectPieces(-1, undefined, undefined);
      break;
    case "ArrowUp":
      cube.rotation.x += 0.1;
      break;
    case "ArrowDown":
      cube.rotation.x -= 0.1;
      break;
    case "ArrowLeft":
      cube.rotation.y += 0.1;
      break;
    case "ArrowRight":
      cube.rotation.y -= 0.1;
      break;
    case "z":
      cube.rotation.z += 0.1;
      break;
    case "Z":
      cube.rotation.z -= 0.1;
      break;
    case "r":
      cube.rotation.x = 0;
      cube.rotation.y = 0;
      cube.rotation.z = 0;
      break;
    case "p": // Pause animation
    case "P":
      animationPaused = !animationPaused;
      break;
    default:
      break;
  }
}

document.addEventListener("keydown", onKeyDown);

window.addEventListener("DOMContentLoaded", init);
