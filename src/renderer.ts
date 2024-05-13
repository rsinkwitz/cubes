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
let showNumbers: boolean = false;
let showAxes: boolean = false;
let isHideNext: boolean = false;
let numRotAnims: number = 0;

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

  const axesHelper = new THREE.AxesHelper(3);
  axesHelper.visible = showAxes;
  scene.add(axesHelper);

  createPieces();
  cube = pieces[26];

  camera.position.set( 0, 0, 5 );
  controls.update();

  animate(); // Always start the animation loop
}

function toggleAxes(): void {
  showAxes = !showAxes;
  scene.children.forEach((child) => {
    if (child instanceof THREE.AxesHelper) {
      child.visible = showAxes;
    }
  });
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

function updateCubeTextures(): void {
  pieces.forEach((piece, index) => {
    if (!showNumbers) {
      piece.material = materials;
      return;
    }

    // Create a canvas and draw the index number on it
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (context) {
      context.fillStyle = 'lightblue'; // Set the background color to light blue
      context.fillRect(0, 0, canvas.width, canvas.height); // Fill the canvas with the background color

      context.font = '64px Arial';
      context.fillStyle = 'black'; // Set the text color to black
      context.fillText(index.toString(), canvas.width / 2, canvas.height / 2);
    }

    // Create a texture from the canvas
    const texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;

    // Create a material using the texture
    const numberedMaterial = new THREE.MeshBasicMaterial({map: texture});

    // Create an array of materials for each face of the cube
    const NumberedMaterials = [
      numberedMaterial, numberedMaterial, numberedMaterial, numberedMaterial, numberedMaterial, numberedMaterial
    ];

    // Update the cube's material
    piece.material = NumberedMaterials;
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
function setColors(colors: number[]): void {
  pieces.forEach((piece, index) => {
    piece.material = new THREE.MeshBasicMaterial({color: colors[index]});
  });
}

function toggleHideObjects(objects: THREE.Mesh[]): void {
  objects.forEach((object) => {
    object.visible = !object.visible;
  });
}

interface rotOpsParamType {axis: string; degrees: number; forward: boolean; nums: number[]}
interface rotOpsParamMapType {
  [key: string]: rotOpsParamType;
}

function getRotOpsData(key: string): rotOpsParamType {
  let data: rotOpsParamMapType = {
    "l": {axis: "x", degrees: 90, forward: true, nums: [0, 9, 18, 21, 24, 15, 6, 3, 12]},
    "m": {axis: "x", degrees: 90, forward: false, nums: [1, 4, 7, 16, 25, 22, 19, 10, 13]},
    "r": {axis: "x", degrees: -90, forward: true, nums: [26, 23, 20, 11, 2, 5, 8, 17, 14]},
    "u": {axis: "y", degrees: -90, forward: false, nums: [6, 7, 8, 17, 26, 25, 24, 15, 16]},
    "e": {axis: "y", degrees: 90, forward: false, nums: [3, 12, 21, 22, 23, 14, 5, 4, 13]},
    "d": {axis: "y", degrees: 90, forward: false, nums: [18, 19, 20, 11, 2, 1, 0, 9, 10]},
    "b": {axis: "z", degrees: 90, forward: true, nums: [0, 3, 6, 7, 8, 5, 2, 1, 4]},
    "s": {axis: "z", degrees: -90, forward: true, nums: [9, 10, 11, 14, 17, 16, 15, 12, 13]},
    "f": {axis: "z", degrees: -90, forward: true, nums: [24, 21, 18, 19, 20, 23, 26, 25, 22]},
    "x": {axis: "x", degrees: -90, forward: true, nums: []},
    "y": {axis: "y", degrees: -90, forward: true, nums: []},
    "z": {axis: "z", degrees: -90, forward: true, nums: []}
  };
  return data[key];
}

function rotatePieces(key: string): void {
  if (numRotAnims > 0) {
    return;
  }
  let {axis, degrees, forward, nums} = getRotOpsData(key.toLowerCase());
  let isRightTurn: boolean = true;
  if (key === key.toUpperCase()) {
    degrees = -degrees;
    isRightTurn = false;
  }

  let numList: number[]; // List of piece indices to rotate
  let selectedPieces: THREE.Mesh[] = []; // List of pieces to rotate
  switch (key.toLowerCase()) {
    case "x":
      selectedPieces = pieces;
      rotateModelLayerByKey("l", !isRightTurn);
      rotateModelLayerByKey("m", !isRightTurn);
      rotateModelLayerByKey("r", isRightTurn);
      break;
    case "y":
      selectedPieces = pieces;
      rotateModelLayerByKey("u", isRightTurn);
      rotateModelLayerByKey("e", !isRightTurn);
      rotateModelLayerByKey("d", !isRightTurn);
      break;
    case "z":
      selectedPieces = pieces;
      rotateModelLayerByKey("f", isRightTurn);
      rotateModelLayerByKey("s", isRightTurn);
      rotateModelLayerByKey("b", !isRightTurn);
      break;
    default:
      rotateModelLayer(nums, isRightTurn === forward);
      selectedPieces = nums.map((index) => pieces[index]);
  }

  if (isHideNext) {
    isHideNext = false;
    toggleHideObjects(selectedPieces);
    return;
  }

  // Rotate the selected pieces
  selectedPieces.forEach((piece) => {
    const dummy =
      {piece: piece, lerpFactor: 0, startMatrix: piece.matrixWorld.clone(), axis: axis, degrees: degrees};

    let tl = gsap.timeline();
    numRotAnims++;
    tl.to(dummy, {
      lerpFactor: 1, duration: 0.5, ease: "linear",
      onUpdate: () => {
        dummy.piece.matrix.copy(dummy.startMatrix); // Reset the matrix to the start matrix (undo previous rotations)
        piece.applyMatrix4(getRotationMatrix(axis, dummy.lerpFactor * dummy.degrees));
        piece.matrixWorldNeedsUpdate = true;
      },
      onComplete: () => {
        numRotAnims--;
        // if (numRotAnims === 0) {
        //   updateCubeTextures();
        // }
      }
    });
  });

  updateCubeTextures();
}

function rotateModelLayerByKey(key: string, rightTurn: boolean): void {
  let {axis, degrees, forward, nums} = getRotOpsData(key.toLowerCase());
  rotateModelLayer(nums, rightTurn === forward);
}

function rotateModelLayer(numList: number[], rightTurn: boolean): void {
  // reflect the turn in the pieces list
  if (rightTurn) {
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
}

function onKeyDown(event: KeyboardEvent): void {
  switch (event.key) {
    case "F12":
      window.ipcRenderer.send('open-dev-tools');
      break;
    case "a":
      toggleAxes();
      break;
    case "c":
      setColors( [0x808080]);
      break;

    case "l":
    case "L":
    case "m":
    case "M":
    case "r":
    case "R":
    case "u":
    case "U":
    case "e":
    case "E":
    case "d":
    case "D":
    case "b":
    case "B":
    case "s":
    case "S":
    case "f":
    case "F":
    case "x":
    case "X":
    case "y":
    case "Y":
    case "z":
    case "Z":
      rotatePieces(event.key);
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
    case "n": // Pause animation
    case "N":
      showNumbers = !showNumbers;
      updateCubeTextures();
      break;
    case "h":
    case "H":
      isHideNext = true;
      break;
    default:
      break;
  }
}

document.addEventListener("keydown", onKeyDown);

window.addEventListener("DOMContentLoaded", init);
