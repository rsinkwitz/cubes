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
let animationPaused: boolean = true;
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

  // Create an AxesHelper with a size of 2
  const axesHelper = new THREE.AxesHelper(3);
  // Add the AxesHelper to the scene
  scene.add(axesHelper);

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
  updateCubeTextures();
}

function createCube(x: number, y: number, z: number): THREE.Mesh {
  let cube: THREE.Mesh;
  cube = new THREE.Mesh(geometry, materials);
  cube.matrixAutoUpdate = false;
  cube.position.set(x, y, z);
  cube.updateMatrix();
  scene.add(cube);
  return cube;
}

function updateCubeTextures(): void {
  return;
  pieces.forEach((piece, index) => {
    // Create a canvas and draw the index number on it
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (context) {
      context.fillStyle = 'lightblue'; // Set the background color to light blue
      context.fillRect(0, 0, canvas.width, canvas.height); // Fill the canvas with the background color

      context.font = '32px Arial';
      context.fillStyle = 'black'; // Set the text color to black
      context.fillText(index.toString(), canvas.width / 2, canvas.height / 2);
    }

    // Create a texture from the canvas
    const texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;

    // Create a material using the texture
    const material = new THREE.MeshBasicMaterial({ map: texture });

    // Create an array of materials for each face of the cube
    const materials = [
      material, material, material, material, material, material
    ];

    // Update the cube's material
    piece.material = materials;
  });
}

function animate(): void {requestAnimationFrame(animate);
  if (!animationPaused) {
    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;
    cube.rotation.z += 0.01;
    cube.updateMatrix();
  }
  renderer.render(scene, camera);
}

function selectPieces(xf?: number, yf?: number, zf?: number): THREE.Mesh[] {
  return pieces;
}

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

function rotatePieces(key: string, axis: string, degrees: number, inverseRegister: boolean = false): void {
  var isRightTurn = true;
  if (key === key.toUpperCase()) {
    degrees = -degrees;
    isRightTurn = false;
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

  // reflect the turn in the pieces list
  if (isRightTurn !== inverseRegister) {
    let tempA = pieces[numList[0]];
    let tempB = pieces[numList[1]];
    for (let i = 0; i <= 5; i++) {
      pieces[numList[i]] = pieces[numList[i + 2]];
    }
    pieces[numList[6]] = tempA;
    pieces[numList[7]] = tempB;
  } else {
    let tempA = pieces[numList[7]];
    let tempB = pieces[numList[6]];
    for (let i = 5; i >= 0; i--) {
      pieces[numList[i + 2]] = pieces[numList[i]];
    }
    pieces[numList[1]] = tempA;
    pieces[numList[0]] = tempB;
  }

  // Update the cube textures after rotating the pieces
  updateCubeTextures();
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
      rotatePieces(event.key, "x", 90);
      break;
    case "m":
    case "M":
      rotatePieces(event.key, "x", 90);
      break;
    case "r":
    case "R":
      rotatePieces(event.key, "x", -90);
      break;

    case "u":
    case "U":
      rotatePieces(event.key, "y", -90, true);
      break;
    case "e":
    case "E":
      rotatePieces(event.key, "y", 90, true);
      break;
    case "d":
    case "D":
      rotatePieces(event.key, "y", 90, true);
      break;

    case "b":
    case "B":
      rotatePieces(event.key, "z", 90);
      break;
    case "s":
    case "S":
      rotatePieces(event.key, "z", -90);
      break;
    case "f":
    case "F":
      rotatePieces(event.key, "z", -90);
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
      cube.updateMatrix();
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
