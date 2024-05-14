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
let controls: OrbitControls;
let renderer: THREE.WebGLRenderer;
let cube: THREE.Mesh;
let animationPaused: boolean = true;
let showNumbers: boolean = false;
let showAxes: boolean = false;
let isHideNext: boolean = false;
let numRotAnims: number = 0;

const geometry: THREE.BoxGeometry = new THREE.BoxGeometry(0.95, 0.95, 0.95);
const materials: THREE.MeshBasicMaterial[] = [
  new THREE.MeshBasicMaterial({color: 0xff0000}), // right  red
  new THREE.MeshBasicMaterial({color: 0xff8000}), // left   orange
  new THREE.MeshBasicMaterial({color: 0xffffff}), // top    white
  new THREE.MeshBasicMaterial({color: 0xffff00}), // bottom yellow
  new THREE.MeshBasicMaterial({color: 0x00ff00}), // front  green
  new THREE.MeshBasicMaterial({color: 0x0000ff})  // back   blue
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
  controls = new OrbitControls(camera, renderer.domElement);
  document.body.appendChild(renderer.domElement);

  const axesHelper = new THREE.AxesHelper(3);
  axesHelper.visible = showAxes;
  scene.add(axesHelper);

  createPieces();
  cube = pieces[26];

  camera.position.set(2, 2, 5);
  controls.update();
  controls.saveState();

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

// the cube model (pieces) is simply the list of cube objects sorted by z,y,x ascending
function createPieces(): void {
  for (let i = -1; i <= 1; i++) {
    for (let j = -1; j <= 1; j++) {
      for (let k = -1; k <= 1; k++) {
        let cube = createCube(k, j, i);
        pieces.push(cube);
      }
    }
  }
  updateCubeNumberTextures();
}

function updateCubeNumberTextures(): void {
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

function animate(): void {
  requestAnimationFrame(animate);
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

interface rotationDataEntry {
  axis: string;
  degrees: number;
  forward: boolean;
  nums: number[]
}

interface rotationDataMap {
  [key: string]: rotationDataEntry;
}

function getRotationData(key: string): rotationDataEntry {
  // Define the rotation operations
  // l: left, m: middle, r: right, u: up, e: equator, d: down, b: back, s: standing, f: front
  // x: x-axis, y: y-axis, z: z-axis
  // The rotation operations are defined by the axis of rotation, the degrees of rotation, the direction of rotation,
  // and the list of piece indices of the slice to rotate. The piece indices are defined in clockwise order when
  // looking at the face of the cube from outside.
  let data: rotationDataMap = {
    "l": {axis: "x", degrees:  90, forward: true,  nums: [0, 9, 18, 21, 24, 15, 6, 3, 12]},
    "m": {axis: "x", degrees:  90, forward: false, nums: [1, 4, 7, 16, 25, 22, 19, 10, 13]},
    "r": {axis: "x", degrees: -90, forward: true,  nums: [26, 23, 20, 11, 2, 5, 8, 17, 14]},
    "u": {axis: "y", degrees: -90, forward: false, nums: [6, 7, 8, 17, 26, 25, 24, 15, 16]},
    "e": {axis: "y", degrees:  90, forward: false, nums: [3, 12, 21, 22, 23, 14, 5, 4, 13]},
    "d": {axis: "y", degrees:  90, forward: false, nums: [18, 19, 20, 11, 2, 1, 0, 9, 10]},
    "b": {axis: "z", degrees:  90, forward: true,  nums: [0, 3, 6, 7, 8, 5, 2, 1, 4]},
    "s": {axis: "z", degrees: -90, forward: true,  nums: [9, 10, 11, 14, 17, 16, 15, 12, 13]},
    "f": {axis: "z", degrees: -90, forward: true,  nums: [24, 21, 18, 19, 20, 23, 26, 25, 22]},
    "x": {axis: "x", degrees: -90, forward: true,  nums: []},
    "y": {axis: "y", degrees: -90, forward: true,  nums: []},
    "z": {axis: "z", degrees: -90, forward: true,  nums: []}
  };
  return data[key];
}

function rotate(key: string): void {
  if (numRotAnims > 0) {
    return; // no rotation while an animation is running
  }
  let {axis, degrees, forward, nums} = getRotationData(key.toLowerCase());

  if (isHideNext) {
    toggleHideObjects(nums.map((index) => pieces[index])); // toggle hide state instead
    isHideNext = false;
    return;
  }

  let piecesToRotate = rotateModel(key, forward, nums);
  rotateGraphics(piecesToRotate, axis, (key === key.toLowerCase()) ? degrees : -degrees)
  updateCubeNumberTextures();
}

function rotateGraphics(pieces: THREE.Mesh[], axis: string, degrees: number): void {
  // rotate the selected pieces as animation
  pieces.forEach((piece) => {
    const animObj =
      {piece: piece, lerpFactor: 0, startMatrix: piece.matrixWorld.clone(), axis: axis, degrees: degrees};

    let tl = gsap.timeline();
    numRotAnims++;
    tl.to(animObj, {
      lerpFactor: 1, duration: 0.5, ease: "linear",
      onUpdate: () => {
        animObj.piece.matrix.copy(animObj.startMatrix); // Reset the matrix to the start matrix (undo previous rotations)
        piece.applyMatrix4(getRotationMatrix(axis, animObj.lerpFactor * animObj.degrees));
        piece.matrixWorldNeedsUpdate = true;
      },
      onComplete: () => {
        numRotAnims--;
      }
    });
  });
}

function rotateModel(key: string, forward: boolean, nums: number[]): THREE.Mesh[] {
  // rotate the cube model. It must follow the rotation so that slices can properly be selected after each rotation
  let keyLc = key === key.toLowerCase();
  let piecesToRotate: THREE.Mesh[] = []; // the pieces to rotate
  switch (key.toLowerCase()) {
    case "x":
      piecesToRotate = pieces;
      rotateModelSliceByKey("l", !keyLc);
      rotateModelSliceByKey("m", !keyLc);
      rotateModelSliceByKey("r", keyLc);
      break;
    case "y":
      piecesToRotate = pieces;
      rotateModelSliceByKey("u", keyLc);
      rotateModelSliceByKey("e", !keyLc);
      rotateModelSliceByKey("d", !keyLc);
      break;
    case "z":
      piecesToRotate = pieces;
      rotateModelSliceByKey("f", keyLc);
      rotateModelSliceByKey("s", keyLc);
      rotateModelSliceByKey("b", !keyLc);
      break;
    default:
      piecesToRotate = nums.map((index) => pieces[index]);
      rotateModelSlice(nums, keyLc === forward);
  }
  return piecesToRotate;
}

function rotateModelSliceByKey(key: string, keyLc: boolean): void {
  let {axis, degrees, forward, nums} = getRotationData(key.toLowerCase());
  rotateModelSlice(nums, keyLc === forward);
}

function rotateModelSlice(nums: number[], rightRotate: boolean): void {
  // reflect the turn in the pieces list
  if (rightRotate) {
    let tempA = pieces[nums[0]];
    let tempB = pieces[nums[1]];
    for (let i = 0; i <= 5; i++) {
      pieces[nums[i]] = pieces[nums[i + 2]];
    }
    pieces[nums[6]] = tempA;
    pieces[nums[7]] = tempB;
  } else {
    let tempA = pieces[nums[7]];
    let tempB = pieces[nums[6]];
    for (let i = 5; i >= 0; i--) {
      pieces[nums[i + 2]] = pieces[nums[i]];
    }
    pieces[nums[1]] = tempA;
    pieces[nums[0]] = tempB;
  }
}

function onKeyDown(event: KeyboardEvent): void {
  switch (event.key) {
    case "F12":
      window.ipcRenderer.send('open-dev-tools');
      break;
    case "q":
      window.ipcRenderer.send('app-quit');
      break;
    case "a":
      toggleAxes();
      break;
    case "c":
      setColors([0x808080]);
      break;

    case "l": // left
    case "L":
    case "m": // middle
    case "M":
    case "r": // right
    case "R":
    case "u": // up
    case "U":
    case "e": // equator
    case "E":
    case "d": // down
    case "D":
    case "b": // back
    case "B":
    case "s": // standing
    case "S":
    case "f": // front
    case "F":
    case "x": // x-axis
    case "X":
    case "y": // y-axis
    case "Y":
    case "z": // z-axis
    case "Z":
      rotate(event.key);
      break;

    case "ArrowUp":
      cube.rotation.x += 0.1;
      cube.updateMatrix();
      break;
    case "ArrowDown":
      cube.rotation.x -= 0.1;
      cube.updateMatrix();
      break;
    case "ArrowLeft":
      cube.rotation.y += 0.1;
      cube.updateMatrix();
      break;
    case "ArrowRight":
      cube.rotation.y -= 0.1;
      cube.updateMatrix();
      break;
    case "k":
      cube.rotation.z += 0.1;
      cube.updateMatrix();
      break;
    case "K":
      cube.rotation.z -= 0.1;
      cube.updateMatrix();
      break;
    case "0":
      controls.reset();
      break;
    case "1":
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
      updateCubeNumberTextures();
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
