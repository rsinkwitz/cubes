import * as THREE from 'three';
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";
import {TextGeometry} from "three/examples/jsm/geometries/TextGeometry";
import {Font, FontLoader} from 'three/examples/jsm/loaders/FontLoader';
import { VertexNormalsHelper } from 'three/examples/jsm/helpers/VertexNormalsHelper';
import gsap from "gsap";


import { BoxGeometryEnh } from './BoxGeometryEnh';

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
let showRotationInfos: boolean = false;
let isWireframe: boolean = false;
let isHideNext: boolean = false;
let is2x2: boolean = false;
let isPyraShape: boolean = false;
let isPyraColors: boolean = false;
let testIndex: number = 0;
let isShowOneCube: boolean = false;

let numAnims: number = 0; // number of running rotation animations (one for each cube piece)

let fixedPieces: THREE.Mesh[] = []; // the list of pieces, not changed by rotations
let rotPieces: THREE.Mesh[] = [];   // the list of pieces, changed by rotations
let infoGroups: THREE.Group[] = [];

let opsHistory: string[] = []; // the list of operations performed
let opsTodo: string[] = []; // the list of operations to perform automatically

const basicMaterials: THREE.MeshStandardMaterial[] = [
  new THREE.MeshStandardMaterial({color: 0xff0000}), // right  red     0
  new THREE.MeshStandardMaterial({color: 0xFFC700}), // left   orange  1
  new THREE.MeshStandardMaterial({color: 0xffffff}), // top    white   2
  new THREE.MeshStandardMaterial({color: 0xffff00}), // bottom yellow  3
  new THREE.MeshStandardMaterial({color: 0x00ff00}), // front  green   4
  new THREE.MeshStandardMaterial({color: 0x0080ff})  // back   blue    5
];
const blackMaterial: THREE.MeshStandardMaterial = new THREE.MeshStandardMaterial({color: 0x202020});
const grayMaterial: THREE.MeshStandardMaterial = new THREE.MeshStandardMaterial({color: 0x808080});
const wireframeMaterial: THREE.MeshStandardMaterial = new THREE.MeshStandardMaterial({color: 0x000000, wireframe: true});

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
  renderer.setClearColor(0xb0c4de); // Light blue-gray color in hexadecimal
  controls = new OrbitControls(camera, renderer.domElement);
  document.body.appendChild(renderer.domElement);

  const axesHelper = new THREE.AxesHelper(3);
  axesHelper.visible = showAxes;
  scene.add(axesHelper);

  createMain();

  createDirLight(-5, 0, 2);
  createDirLight(5, 0, 2);
  createDirLight(0, -5, 2);
  createDirLight(0, 5, 2);

  camera.position.set(2, 2, 5);
  controls.update();
  controls.saveState();

  animate();
}

function createDirLight(x: number, y: number, z: number): THREE.DirectionalLight {
  const light = new THREE.DirectionalLight(0xFFFFFF, 2);
  light.position.set(x, y, z);
  scene.add(light);
  return light;
}

function createMain() {
  createAllCubes();
  cube = rotPieces[26];
  //createBeveledCube();

}

function createBeveledCube(): void {
  // Create a square shape with a beveled edge
  const bevel = 0.05;
  let ih = 0.5 - bevel; // inner half of the side
  let oh = 0.5; // outer half of the side
  const shape = new THREE.Shape();
  shape.moveTo(-ih, -oh);
  shape.lineTo(ih, -oh);
  shape.absarc(ih, -ih, bevel, -Math.PI / 2, 0, false);
  shape.lineTo(oh, ih);
  shape.absarc(ih, ih, bevel, 0, Math.PI / 2, false);
  shape.lineTo(-ih, oh);
  shape.absarc(-ih, ih, bevel, Math.PI / 2, Math.PI, false);
  shape.lineTo(-oh, -ih);
  shape.absarc(-ih, -ih, bevel, Math.PI, Math.PI * 3 / 2, false);

  const extrudeSettings = {
    steps: 1,
    depth: 1 - bevel * 2,
    bevelEnabled: true,
    bevelThickness: 0.1,
    bevelSize: bevel,
    bevelOffset: 0,
    bevelSegments: 3
  };

  const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  const material = new THREE.MeshStandardMaterial({ color: 0xffffff, wireframe: true });
  let cube = new THREE.Mesh(geometry, material);
  cube.position.set(3, 0, 0);
  scene.add(cube);
}

function resetMain() {
  rotPieces.forEach((piece) => {
    scene.remove(piece);
    disposeMesh(piece);
  });
  opsHistory = [];
  opsTodo = [];
  is2x2 = false;
  isPyraShape = false;
  isPyraColors = false;
  createMain();
}

function toggleAxes(): void {
  showAxes = !showAxes;
  scene.children.forEach((child) => {
    if (child instanceof THREE.AxesHelper) {
      child.visible = showAxes;
    }
  });
}

function toggleShowOneCube(): void {
  isShowOneCube = !isShowOneCube;
  rotPieces.forEach((piece,index) => {
    if (index !== 26) {
      piece.visible = isShowOneCube;
    }
  });
}

function toggleRotationInfos(): void {
  showRotationInfos = !showRotationInfos;
  createRotationInfos(showRotationInfos, false);
}

function toggleWireframe(): void {
  isWireframe = !isWireframe;
  setAllCubeFaces();
}

const meshCornerLinePositions = [
  [6,14,23], // 0
  [3,15,22], // 1
  [4,8,21], // 2
  [1,9,20], // 3
  [7,12,18], // 4
  [2,13,19], // 5
  [5,10,16], // 6
  [0,11,17], // 7
];

interface MorphMod {
  idx: number; // index of point in position array
  x: number; // new value to apply to the point (99 = no change)
  y: number;
  z: number;
}

interface MorphModMap {
  [key: number]: MorphMod[];
}

// morph modifications for the cube indices which form the 2x2x2 cube to morph to a pyramorphix. 
// The idx values are the corner points of the cube with idx = x+y*2+z*4. The vectors are the new values to apply to the points.
const oneSixth = 1/6;
const morphMods: MorphModMap = {};
morphMods[0] = [{idx: 1, x: 99, y: 0, z: 0}, {idx: 2, x: 0, y: 99, z: 0}, {idx: 4, x: 0, y: 0, z: 99}, {idx: 0, x: oneSixth, y: oneSixth, z: oneSixth}];
morphMods[1] = [{idx: 0, x: 99, y: 0, z: 0}, {idx: 1, x: 99, y: 0, z: 0}];
morphMods[2] = [{idx: 0, x: 99, y: 0, z: 0}, {idx: 3, x: 0, y: 99, z: 0}, {idx: 5, x: 0, y: 0, z: 99}];
morphMods[3] = [{idx: 2, x: 0, y: 99, z: 0}, {idx: 0, x: 0, y: 99, z: 0}];
morphMods[5] = [{idx: 3, x: 0, y: 99, z: 0}, {idx: 1, x: 0, y: 99, z: 0}];
morphMods[6] = [{idx: 3, x: 99, y: 0, z: 0}, {idx: 0, x: 0, y: 99, z: 0}, {idx: 6, x: 0, y: 0, z: 99}];
morphMods[7] = [{idx: 2, x: 99, y: 0, z: 0}, {idx: 3, x: 99, y: 0, z: 0}];
morphMods[8] = [{idx: 2, x: 99, y: 0, z: 0}, {idx: 1, x: 0, y: 99, z: 0}, {idx: 7, x: 0, y: 0, z: 99}, {idx: 3, x: -oneSixth, y: -oneSixth, z: oneSixth}];

morphMods[9] = [{idx: 4, x: 0, y: 0, z: 99}, {idx: 0, x: 0, y: 0, z: 99}];
morphMods[11] = [{idx: 5, x: 0, y: 0, z: 99}, {idx: 1, x: 0, y: 0, z: 99}];
morphMods[15] = [{idx: 6, x: 0, y: 0, z: 99}, {idx: 2, x: 0, y: 0, z: 99}];
morphMods[17] = [{idx: 7, x: 0, y: 0, z: 99}, {idx: 3, x: 0, y: 0, z: 99}];

morphMods[18] = [{idx: 5, x: 99, y: 0, z: 0}, {idx: 6, x: 0, y: 99, z: 0}, {idx: 0, x: 0, y: 0, z: 99}];
morphMods[19] = [{idx: 4, x: 99, y: 0, z: 0}, {idx: 5, x: 99, y: 0, z: 0}];
morphMods[20] = [{idx: 4, x: 99, y: 0, z: 0}, {idx: 7, x: 0, y: 99, z: 0}, {idx: 1, x: 0, y: 0, z: 99}, {idx: 5, x: -oneSixth, y: oneSixth, z: -oneSixth}];
morphMods[21] = [{idx: 6, x: 0, y: 99, z: 0}, {idx: 4, x: 0, y: 99, z: 0}];
morphMods[23] = [{idx: 5, x: 0, y: 99, z: 0}, {idx: 7, x: 0, y: 99, z: 0}];
morphMods[24] = [{idx: 7, x: 99, y: 0, z: 0}, {idx: 4, x: 0, y: 99, z: 0}, {idx: 2, x: 0, y: 0, z: 99}, {idx: 6, x: oneSixth, y: -oneSixth, z: -oneSixth}];
morphMods[25] = [{idx: 6, x: 99, y: 0, z: 0}, {idx: 7, x: 99, y: 0, z: 0}];
morphMods[26] = [{idx: 6, x: 99, y: 0, z: 0}, {idx: 5, x: 0, y: 99, z: 0}, {idx: 3, x: 0, y: 0, z: 99}];

function createGeometry(cubeIndex: number): BoxGeometryEnh {
  // special setups so that the square face triangulation diagonals meet at the focus corners, needed for the 4 pyramorphix corners
  const specialDiagFocus = new Map();
  specialDiagFocus.set(26, 1);
  specialDiagFocus.set(18, 3);
  specialDiagFocus.set(6, 2);
  specialDiagFocus.set(2, 4);
  specialDiagFocus.set(12, 2);
  specialDiagFocus.set(22, 1);
  specialDiagFocus.set(16, 1);
  specialDiagFocus.set(14, 4);
  specialDiagFocus.set(10, 3);
  const diagFocus = specialDiagFocus.get(cubeIndex) || 0;

  const geometry: BoxGeometryEnh = new BoxGeometryEnh(0.95, 0.95, 0.95, 1, 1, 1, diagFocus, true);
  const orgPositions = geometry.attributes.position;
  let newPositions = orgPositions.clone();

  // apply morph modifications for the cube indices which form the 2x2x2 cube to morph to a pyramorphix
  if (typeof morphMods[cubeIndex] !== 'undefined') {
    morphMods[cubeIndex].forEach((mod) => {
      console.log("modifying idx=" + cubeIndex + "with pos: "+ mod.idx);
      meshCornerLinePositions[mod.idx].forEach((clPosition) => {
        if (mod.x !== 99) {
          newPositions.setX(clPosition, mod.x);
        }
        if (mod.y !== 99) {
          newPositions.setY(clPosition, mod.y);
        }
        if (mod.z !== 99) {
          newPositions.setZ(clPosition, mod.z);
        }  
      });
    });
    geometry.morphAttributes.position = [];
    geometry.morphAttributes.position[ 0 ] = newPositions;
  } 
  // add geometry to show normals using VertexNormalsHelper
  // const helper = new VertexNormalsHelper(geometry, 0.2, 0x00ff00);
  // scene.add(helper);
  return geometry;
}

function createSingleCube(x: number, y: number, z: number): THREE.Mesh {
  let geometry: BoxGeometryEnh| null = createGeometry((x+1) + (y+1) * 3 + (z+1) * 9);
  let cube = new THREE.Mesh(geometry, blackMaterial);
  cube.matrixAutoUpdate = false;
  cube.position.set(x, y, z);
  cube.updateMatrix();
  scene.add(cube);
  return cube;
}

// the cube model (pieces) is simply the list of cube objects sorted by z,y,x ascending
function createAllCubes(): void {
  rotPieces = [];
  fixedPieces = [];
  for (let z = -1; z <= 1; z++) {
    for (let y = -1; y <= 1; y++) {
      for (let x = -1; x <= 1; x++) {
        let cube = createSingleCube(x, y, z);
        rotPieces.push(cube);
        fixedPieces.push(cube);
      }
    }
  }
  setAllCubeFaces();
}

function setAllCubeFaces(): void {
  if (showNumbers) {
    setAllCubeNumbers();
  } else if (isWireframe) {
    setAllCubeWireframes();
  } else if (isPyraColors) {
    setAllPyraColors();
  } else {
    setAllCubeColors();
  }
}

function setAllCubeWireframes(): void {
  fixedPieces.forEach((piece) => {
    piece.material = wireframeMaterial;      
  });
}

function setAllCubeColors(): void {
  for (let z = -1; z <= 1; z++) {
    for (let y = -1; y <= 1; y++) {
      for (let x = -1; x <= 1; x++) {
        let index = (x+1) + (y+1)*3 + (z+1)*9;
        let cube = fixedPieces[index];

        let materials: THREE.MeshStandardMaterial[] = [];
        for (let i = 0; i < 12; i++) {
          materials.push(blackMaterial);
        }
        setCubeFaceColor(materials, x, 1, 0);
        setCubeFaceColor(materials, y, 3, 2);
        setCubeFaceColor(materials, z, 5, 4);
        cube.material = materials;      
      }
    }
  }
}

function setCubeFaceColor(materials: THREE.MeshStandardMaterial[], index: number, i1: number, i2: number): void {
  if (index === -1) {
    materials[i1*2] = basicMaterials[i1];
    materials[i1*2+1] = basicMaterials[i1];
  } else if (index === 1) {
    materials[i2*2] = basicMaterials[i2];
    materials[i2*2+1] = basicMaterials[i2];
  }
}


interface PieceFaces {
  piece: number;
  faces: number[];
}

interface PyraFace {
  material: THREE.MeshStandardMaterial;
  nums: PieceFaces[]
}
/*
red     0
orange  2
white   4
yellow  6
green   8
blue    10
*/
let pyraFaces: PyraFace[] = [
  {material: basicMaterials[0], nums: [ // red
    {piece: 6, faces: [2, 5]},
    {piece: 18, faces: [2, 9]},
    {piece: 24, faces: [2, 3, 8, 9, 4, 5]},
    {piece: 26, faces: [5, 9]},
    {piece: 25, faces: [8, 9, 4, 5]},
    {piece: 15, faces: [2, 3, 4, 5]},
    {piece: 21, faces: [2, 3, 8, 9]},
    {piece: 12, faces: [2]},
    {piece: 22, faces: [9]},
    {piece: 16, faces: [5]},
  ]},
  {material: basicMaterials[5], nums: [ // blue
    {piece: 18, faces: [8, 6]},
    {piece: 2, faces: [6, 1]},
    {piece: 20, faces: [8, 9, 0, 1, 6, 7]},
    {piece: 26, faces: [8, 1]},
    {piece: 23, faces: [8, 9, 0, 1]},
    {piece: 19, faces: [8, 9, 6, 7]},
    {piece: 11, faces: [0, 1, 6, 7]},
    {piece: 22, faces: [8]},
    {piece: 14, faces: [1]},
    {piece: 10, faces: [6]},
  ]},
  {material: basicMaterials[3], nums: [ // yellow
    {piece: 26, faces: [0, 4]},
    {piece: 6, faces: [4, 11]},
    {piece: 8, faces: [0, 1, 4, 5, 10, 11]},
    {piece: 2, faces: [0, 11]},
    {piece: 17, faces: [4, 5, 0, 1]},
    {piece: 7, faces: [4, 5, 10, 11]},
    {piece: 5, faces: [0, 1, 10, 11]},
    {piece: 16, faces: [4]},
    {piece: 14, faces: [0]},
    {piece: 4, faces: [11]},
  ]},
  {material: basicMaterials[4], nums: [ // green
    {piece: 2, faces: [10, 7]},
    {piece: 18, faces: [3, 7]},
    {piece: 0, faces: [10, 11, 2, 3, 6, 7]},
    {piece: 6, faces: [10, 3]},
    {piece: 3, faces: [10, 11, 2, 3]},
    {piece: 1, faces: [10, 11, 6, 7]},
    {piece: 9, faces: [2, 3, 6, 7]},
    {piece: 4, faces: [10]},
    {piece: 12, faces: [3]},
    {piece: 10, faces: [7]},
  ]},
];

function setAllPyraColors(): void {
  let initialMaterials: THREE.MeshStandardMaterial[] = [];
  for (let i = 0; i < 12; i++) {
    initialMaterials.push(blackMaterial);
  }
  fixedPieces.forEach((piece) => {
    piece.material = initialMaterials;      
  });
  pyraFaces.forEach((pyraFace) => {
    pyraFace.nums.forEach((pieceFaces) => {
      let cube = fixedPieces[pieceFaces.piece];
      if (cube.material instanceof Array) {
        let materials = cube.material.slice();
        for (let i = 0; i < 12; i++) {
          materials.push(blackMaterial);
        }
        pieceFaces.faces.forEach((face) => {
          materials[face] = pyraFace.material;
        });
        cube.material = materials;      
      }
    });
  });  
}

function setAllCubeNumbers(): void {
  rotPieces.forEach((piece, index) => {
    // Create a canvas and draw the index number on it
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (context) {
      context.fillStyle = 'lightblue';
      context.fillRect(0, 0, canvas.width, canvas.height); 

      context.font = '64px Arial';
      context.fillStyle = 'black';
      context.fillText(index.toString(), canvas.width / 2, canvas.height / 2);
    }

    const texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;
    const mat = new THREE.MeshStandardMaterial({map: texture});
    piece.material = mat;
  });
}

function createRotationInfoGroup(font: Font, key: string, inverse: boolean, x: number, y: number, z: number, rotDegrees: number, rotAxis: THREE.Vector3): void {
  let group: THREE.Group = new THREE.Group();
  group.add(createOneRotationLetter(font, key, inverse, x, y, z, rotDegrees, rotAxis));
  group.add(createRotationArrow(inverse));
  group.position.set(x * 1.6, y * 1.6, z * 1.6);
  group.rotateOnAxis(rotAxis, rotDegrees * Math.PI / 180);
  scene.add(group);
  infoGroups.push(group);
}

function createOneRotationLetter(font: Font, key: string, inverse: boolean, x: number, y: number, z: number, rotDegrees: number, rotAxis: THREE.Vector3): THREE.Mesh {
    let geometry = new TextGeometry(key + (inverse ? "'" : ""), {
      font: font, size: 1, depth: 0.1,
    //     curveSegments: 12, bevelEnabled: true, bevelThickness: 10, bevelSize: 8, bevelOffset: 0, bevelSegments: 5
    });
    geometry.center();
    let material = new THREE.MeshStandardMaterial({color: 0x1f1fff, transparent: true, opacity: 0.8 });
    const mesh = new THREE.Mesh(geometry, material);
    return mesh;
}

function createRotationArrow(inverse: boolean): THREE.Mesh {
  let endAngle = 90 * Math.PI / 180;
  let outerRadius = 1;
  let thickness = 0.1;
  let arrowHeadSize = 0.2;
  let shape = new THREE.Shape();
  shape.absarc(0, 0, outerRadius, 0, endAngle, false);
  shape.absarc(0, 0, outerRadius - thickness, endAngle, 0, true);
  shape.lineTo(outerRadius - arrowHeadSize - thickness / 2, 0);
  shape.lineTo(outerRadius - thickness / 2, -arrowHeadSize);
  shape.lineTo(outerRadius + arrowHeadSize - thickness /2, 0);

  let extrudeSettings = {
    steps: 1, depth: thickness, bevelEnabled: false, bevelThickness: 0.2, bevelSize: 0.2, bevelOffset: 0, bevelSegments: 1
  };
  let geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  let material = new THREE.MeshStandardMaterial({color: 0x1f1fff, transparent: true, opacity: 0.8, wireframe: false});
  let mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.z = 45 * Math.PI / 180;
  if (inverse) {
    mesh.rotation.y = 180 * Math.PI / 180;
  }
  return mesh;
}

function disposeMesh(mesh: THREE.Object3D): void {
  if (mesh instanceof THREE.Mesh) {
    if (mesh.geometry) {
      mesh.geometry.dispose();
    }
    if (Array.isArray(mesh.material)) {
      mesh.material.forEach((material) => {
        material.dispose();
      });
    } else if (mesh.material) {
      mesh.material.dispose();
    }
  }
}

function createRotationInfos(visible: boolean, inverse: boolean): void {
  infoGroups.forEach((group) => {
    scene.remove(group);
    group.children.forEach((child) => {
      disposeMesh(child);
    });
  });
  infoGroups = [];
  if (visible) {
    const loader = new FontLoader();
    loader.load(require('three/examples/fonts/helvetiker_regular.typeface.json').default, function (font) {
      createRotationInfoGroup(font, 'F', inverse, 0, 0, 1, 0, new THREE.Vector3(0, 0, 0));
      createRotationInfoGroup(font, 'B', inverse, 0, 0, -1, 180, new THREE.Vector3(0, 1, 0));
      createRotationInfoGroup(font, 'R', inverse, 1, 0, 0, 90, new THREE.Vector3(0, 1, 0));
      createRotationInfoGroup(font, 'L', inverse, -1, 0, 0, -90, new THREE.Vector3(0, 1, 0));
      createRotationInfoGroup(font, 'U', inverse, 0, 1, 0, -90, new THREE.Vector3(1, 0, 0));
      createRotationInfoGroup(font, 'D', inverse, 0, -1, 0, 90, new THREE.Vector3(1, 0, 0));
    });
  }
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

function undoOperation(): void {
  if (numAnims > 0 || opsHistory.length === 0 || isHideNext) {
    return; // no undo while an animation is running
  }
  let key = opsHistory.pop();
  if (key) {
    let undoKey = (key === key.toLowerCase()) ? key.toUpperCase() : key.toLowerCase();
    rotate(undoKey);
    key = opsHistory.pop(); // do not log the undo uperation
  }
}

function rotate(key: string): void {
  if (numAnims > 0) {
    return; // no rotation while an animation is running
  }
  let {axis, degrees, forward, nums} = getRotationData(key.toLowerCase());

  if (isHideNext) {
    toggleHideObjects(nums.map((index) => rotPieces[index])); // toggle hide state instead
    isHideNext = false;
    return;
  }

  opsHistory.push(key);

  let piecesToRotate = rotateModel(key, forward, nums);
  rotateGraphics(piecesToRotate, axis, (key === key.toLowerCase()) ? degrees : -degrees)
  setAllCubeFaces();
}

function rotateGraphics(pieces: THREE.Mesh[], axis: string, degrees: number): void {
  // rotate the selected pieces as animation
  pieces.forEach((piece) => {
    const startMatrix = piece.matrixWorld.clone();
    const animObj = {lerpFactor: 0};

    let tl = gsap.timeline();
    numAnims++;
    tl.to(animObj, {
      lerpFactor: 1, duration: 0.5, ease: "linear",
      onUpdate: () => {
        piece.matrix.copy(startMatrix); // Reset the matrix to the start matrix (undo previous rotations)
        piece.applyMatrix4(getRotationMatrix(axis, animObj.lerpFactor * degrees));
        piece.matrixWorldNeedsUpdate = true;
      },
      onComplete: () => {
        numAnims--;
        if(numAnims === 0 && opsTodo.length > 0) {
          let op = opsTodo.pop();
          if (op !== undefined) {
            sleep(50).then(() => rotate(op));

          }
        }
      }
    });
  });
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function rotateModel(key: string, forward: boolean, nums: number[]): THREE.Mesh[] {
  // rotate the cube model. It must follow the rotation so that slices can properly be selected after each rotation
  let keyLc = key === key.toLowerCase();
  let piecesToRotate: THREE.Mesh[] = []; // the pieces to rotate
  switch (key.toLowerCase()) {
    case "x":
      piecesToRotate = rotPieces;
      rotateModelSliceByKey("l", !keyLc);
      rotateModelSliceByKey("m", !keyLc);
      rotateModelSliceByKey("r", keyLc);
      break;
    case "y":
      piecesToRotate = rotPieces;
      rotateModelSliceByKey("u", keyLc);
      rotateModelSliceByKey("e", !keyLc);
      rotateModelSliceByKey("d", !keyLc);
      break;
    case "z":
      piecesToRotate = rotPieces;
      rotateModelSliceByKey("f", keyLc);
      rotateModelSliceByKey("s", keyLc);
      rotateModelSliceByKey("b", !keyLc);
      break;
    default:
      piecesToRotate = nums.map((index) => rotPieces[index]);
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
    let tempA = rotPieces[nums[0]];
    let tempB = rotPieces[nums[1]];
    for (let i = 0; i <= 5; i++) {
      rotPieces[nums[i]] = rotPieces[nums[i + 2]];
    }
    rotPieces[nums[6]] = tempA;
    rotPieces[nums[7]] = tempB;
  } else {
    let tempA = rotPieces[nums[7]];
    let tempB = rotPieces[nums[6]];
    for (let i = 5; i >= 0; i--) {
      rotPieces[nums[i + 2]] = rotPieces[nums[i]];
    }
    rotPieces[nums[1]] = tempA;
    rotPieces[nums[0]] = tempB;
  }
}

function shuffle(): void {
  let moves = is2x2 ? ["l", "r", "u", "d", "b", "f"]
    : ["l", "m", "r", "u", "e", "d", "b", "s", "f"];
  for (let i = 0; i < 20; i++) {
    let index = Math.floor(Math.random() * moves.length * 2);
    if (index >= moves.length) {
      index -= moves.length;
      moves[index] = moves[index].toUpperCase();
    }
    opsTodo.push(moves[index]);
  }
  let op = opsTodo.pop();
  if (op !== undefined) {
    rotate(op);
  }
}

function scaleTo2x2(inverse: boolean): Promise<void> {
  if (is2x2 !== inverse) {
    return new Promise((resolve, reject) => {reject()});
  }
  return new Promise((resolve) => {
    let centerIndexes = [1,3,4,5,7,9,10,11,12,13,14,15,16,17,19,21,22,23,25]; // the center pieces, all except the corners
    let centerPieces = centerIndexes.map((index) => fixedPieces[index]);
    let centerStartMatrices = centerPieces.map((piece) => piece.matrixWorld.clone());

    let cornerIndexes = [0,2,6,8,18,20,24,26]; // the corner pieces
    let cornerPieces = cornerIndexes.map((index) => fixedPieces[index]);
    let cornerStartMatrices = cornerPieces.map((piece) => piece.matrixWorld.clone());

    if (inverse) {
       centerPieces.forEach((piece) => { piece.visible = true; });
    }

    let lerpCenterScale = inverse ? 1/0.8 : 0.8;
    let lerpCornerScale = inverse ? 1/1.5 : 1.5;
    let lerpCornerTranslation = inverse ? 0.75 : -0.5;

    const animObj = {lerpCenterScale: 1, lerpCornerScale: 1, lerpCornerTranslation: 0};

    let tl = gsap.timeline();
    numAnims++;
    tl.to(animObj, {
      lerpCenterScale: lerpCenterScale, lerpCornerScale: lerpCornerScale, lerpCornerTranslation: lerpCornerTranslation,  duration:0.5, ease: "linear",
      onUpdate: () => {
          // Scale the center pieces
         centerPieces.forEach((piece, index) => {
           piece.matrix.copy(centerStartMatrices[index]); // Reset the matrix to the start matrix (undo previous scale)
           piece.applyMatrix4(new THREE.Matrix4().makeScale(animObj.lerpCenterScale, animObj.lerpCenterScale, animObj.lerpCenterScale));
           piece.matrixWorldNeedsUpdate = true;
         });

        // Scale and move the corner pieces
        cornerPieces.forEach((piece, index) => {
          piece.matrix.copy(cornerStartMatrices[index]); // Reset the matrix to the start matrix (undo previous transforms)
          let translationVector = piece.position.clone().normalize().multiplyScalar(animObj.lerpCornerTranslation * Math.sqrt(3));
          piece.applyMatrix4(new THREE.Matrix4().makeScale(animObj.lerpCornerScale, animObj.lerpCornerScale, animObj.lerpCornerScale)
            .multiply(new THREE.Matrix4().makeTranslation(translationVector.x, translationVector.y, translationVector.z)));
          piece.matrixWorldNeedsUpdate = true;
        });
      },
      onComplete: () => {
        numAnims--;
        if (!inverse) {
           centerPieces.forEach((piece) => { piece.visible = false; });
        }
        is2x2 = !inverse;
        resolve();
      }
    });
  });
}

function morphToPyra(from: number, to: number): void {
  const animObj = {lerpFactor: from};
  let tl = gsap.timeline();
  tl.to(animObj, {
    lerpFactor: to, duration: 1, ease: "linear",
    onUpdate: () => {
      fixedPieces.forEach((piece) => {
        if ( typeof piece.morphTargetInfluences !== 'undefined') {
          piece.morphTargetInfluences[ 0 ] = animObj.lerpFactor;
        }  
      });
    }
  });
}

function onKeyDown(event: KeyboardEvent): void {
  switch (event.key) {
    case "F1":
      toggleRotationInfos();
      break;
    case "F2":
      scaleTo2x2(false);
      break;
    case "F3":
      scaleTo2x2(true);
      break;
    case "F4":
      if (!isPyraShape) {
        morphToPyra(0, 1);
        isPyraShape= true;
      }
      break;
    case "F5":
      if (isPyraShape) {
        morphToPyra(1, 0);
        isPyraShape = false;
      }
      break;
    case "F6":
      isPyraColors = true;
      setAllCubeFaces();
      break;
      case "F7":
        isPyraColors = false;
        setAllCubeFaces();
        break;
      case "w":
    case "W":
        toggleWireframe();
      break;
    case "F9":
      shuffle();
      break;
    case "F10":
      resetMain();
      break;
    case "F12":
      window.ipcRenderer.send('open-dev-tools');
      break;
    case "q":
      window.ipcRenderer.send('app-quit');
      break;
    case "a":
      toggleAxes();
      break;
    case "n":
    case "N":
      showNumbers = !showNumbers;
      setAllCubeFaces();
      break;
    case "h":
    case "H":
      isHideNext = true;
      break;
    case "1":
      toggleShowOneCube();
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
      rotate(event.key);
      break;
    case "z": // z-axis
    case "Z":
      // if z is pressed with ctrl key, undo the last operation instead
      if (event.ctrlKey) {
        undoOperation();
      } else {
        rotate(event.key);
      }
      break;

      case "ArrowUp":
      // cube.rotation.x += 0.1;
      // cube.updateMatrix();
      testIndex++;
      break;
    case "ArrowDown":
      // cube.rotation.x -= 0.1;
      // cube.updateMatrix();
      testIndex--;
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
    case "v":
      controls.reset();
      break;
    case "0":
      cube.rotation.x = 0;
      cube.rotation.y = 0;
      cube.rotation.z = 0;
      cube.updateMatrix();
      break;
    case "9":
      undoOperation();
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

document.addEventListener('keydown', function(event) {
  if (event.shiftKey) {
    if (showRotationInfos) {
      createRotationInfos(true, true);
    }
  }
});

document.addEventListener('keyup', function(event) {
  if (event.key === 'Shift') {
    if (showRotationInfos) {
      createRotationInfos(true, false);
    }
  }
});

window.addEventListener("DOMContentLoaded", init);

window.addEventListener('resize', function() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});