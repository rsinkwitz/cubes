import * as THREE from 'three';
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";
import gsap from "gsap";

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

let pieces: THREE.Mesh[] = [];

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
  cube = pieces[26];

  //controls.update() must be called after any manual changes to the camera's transform
  camera.position.set( 0, 0, 5 );
  controls.update();

  animate(); // Always start the animation loop
 // renderer.render(scene, camera);
}

function createPieces(): void {
  for (let i = -1; i <= 1; i++) {
    for (let j = -1; j <= 1; j++) {
      for (let k = -1; k <= 1; k++) {
        let cube = createCube(k, j, i);
        pieces.push(cube);
      }
    }
  }
}

// function createPieces(): void {
//   for (let i = -1; i <= 1; i++) {
//     let piecesLayer:THREE.Mesh[][] = [];
//     for (let j = -1; j <= 1; j++) {
//       let piecesRow: THREE.Mesh[] = [];
//       for (let k = -1; k <= 1; k++) {
//         let cube = createCube(k, j, i);
//         piecesRow.push(cube);
//       }
//       piecesLayer.push(piecesRow);
//     }
//     pieces.push(piecesLayer);
//   }
// }
//
function createCube(x: number, y: number, z: number): THREE.Mesh {
  let cube: THREE.Mesh;
  cube = new THREE.Mesh(geometry, materials);
  cube.matrixAutoUpdate = false;
  cube.position.set(x, y, z);
  cube.updateMatrix();
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

function selectPieces(xf?: number, yf?: number, zf?: number): THREE.Mesh[] {
  return pieces;
}
// function selectPieces(xf?: number, yf?: number, zf?: number): THREE.Mesh[] {
//   let result: THREE.Mesh[] = [];
//   for (let i = 0; i < pieces.length; i++) {
//     for (let j = 0; j < pieces[i].length; j++) {
//       for (let k = 0; k < pieces[i][j].length; k++) {
//         if ((k === zf || typeof zf === 'undefined') &&
//           (j === yf || typeof yf === 'undefined') &&
//           (i === xf || typeof xf === 'undefined')) {
//           let piece = pieces[k][j][i];
//           result.push(piece);
//         }
//       }
//     }
//   }
//   return result;
// }

function getRotationMatrix(axis: string, degrees: number): THREE.Matrix4 {
  let angle = degrees * Math.PI / 180;
  switch (axis) {
    case "x":
      return new THREE.Matrix4().makeRotationX(angle);
    case "y":
      return new THREE.Matrix4().makeRotationY(angle);
    case "z":
      return new THREE.Matrix4().makeRotationZ(angle);
    default:
      return new THREE.Matrix4();
  }
}

// function to set colors of pieces
function setColors(pieces: THREE.Mesh[], colors: number[]): void {
  pieces.forEach((piece, index) => {
    piece.material = new THREE.MeshBasicMaterial({color: colors[index]});
  });
}

function rotatePieces(key: string, pieces: THREE.Mesh[], axis: string, degrees: number): void {
  if (key === key.toUpperCase()) {
    degrees = -degrees;
  }
  // Rotate the pieces in the pieces array
  type NumListsType = {
    [key: string]: number[];
  };

  const numLists: NumListsType = {
    "l": [0, 9, 18, 21, 24, 15, 6, 3, 12], 
    "r": [26, 23, 20, 11, 2, 5, 8, 17, 14], 
    "u": [6, 7, 8, 17, 26, 25, 24, 15, 16], 
    "d": [18, 19, 20, 11, 2, 1, 0, 9, 10],
    "f": [24, 21, 18, 19, 20, 23, 26, 25, 22],
    "b": [0, 3, 6, 7, 8, 5, 2, 1, 4],
    "m": [1, 4, 7, 16, 25, 22, 19, 10, 13], 
    "e": [3, 4, 5, 14, 23, 22, 21, 12, 13], 
    "s": [9, 10, 11, 14, 17, 16, 15, 12, 13] 
  };

  let numList: number[] = numLists[key.toLowerCase()];
  if (typeof numList === 'undefined') {
    console.log("Invalid key");
    return;
  }
  let selectedPieces = numList.map((index) => pieces[index]);

  selectedPieces.forEach((piece, index) => {
    const dummy =
      {piece: piece, lerpFactor: 0, startMatrix: piece.matrixWorld.clone(), axis: axis, degrees: degrees};

    let tl = gsap.timeline();
    tl.to(dummy, {
      lerpFactor: 1,
      duration: 0.5,
      ease: "linear",
      onUpdate: () => {
        dummy.piece.matrix.copy(dummy.startMatrix); // Reset the matrix to the start matrix (undo previous rotations)
        piece.applyMatrix4(getRotationMatrix(axis, dummy.lerpFactor * dummy.degrees));
        piece.matrixWorldNeedsUpdate = true;
      }
    });
  });


  for (let i = 0; i < pieces.length; i++) {
  }
}

function onKeyDown(event: KeyboardEvent): void {
  switch (event.key) {
    case "F12":
      window.ipcRenderer.send('open-dev-tools');
      break;
    case "c":
      setColors(selectPieces(undefined,0), [0x808080]);
      break;

    case "l":
    case "L":
      rotatePieces(event.key, selectPieces(0), "x", 90);
      break;
    case "m":
    case "M":
      rotatePieces(event.key, selectPieces(1), "x", 90);
      break;
    case "r":
    case "R":
      rotatePieces(event.key, selectPieces(2), "x", -90);
      break;

    case "u":
    case "U":
      rotatePieces(event.key, selectPieces(undefined, 2), "y", -90);
      break;
    case "e":
    case "E":
      rotatePieces(event.key, selectPieces(undefined, 1), "y", 90);
      break;
    case "d":
    case "D":
      rotatePieces(event.key, selectPieces(undefined, 0), "y", 90);
      break;

    case "b":
    case "B":
      rotatePieces(event.key, selectPieces(undefined, undefined, 0), "z", 90);
      break;
    case "s":
    case "S":
      rotatePieces(event.key, selectPieces(undefined, undefined, 1), "z", -90);
      break;
    case "f":
    case "F":
      rotatePieces(event.key, selectPieces(undefined, undefined, 2), "z", -90);
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
    case "0":
      cube.rotation.x = 0;
      cube.rotation.y = 0;
      cube.rotation.z = 0;
      break;
    case "1":
      cube.matrix.copy(new THREE.Matrix4(
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1));
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
