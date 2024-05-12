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
  let cube: THREE.Mesh;
  cube = new THREE.Mesh(geometry, materials);

  // Create a translation matrix for the initial position
  const translationMatrix = new THREE.Matrix4().makeTranslation(x, y, z);

  // Apply the translation matrix to the cube's matrix
  cube.matrix.multiply(translationMatrix);

  // cube.matrixAutoUpdate = false;
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
  let result: THREE.Mesh[] = [];
  for (let i = 0; i < pieces.length; i++) {
    for (let j = 0; j < pieces[i].length; j++) {
      for (let k = 0; k < pieces[i][j].length; k++) {
        if ((k === zf || typeof zf === 'undefined') &&
          (j === yf || typeof yf === 'undefined') &&
          (i === xf || typeof xf === 'undefined')) {
          let piece = pieces[k][j][i];
          result.push(piece);
        }
      }
    }
  }
  return result;
}

function getRotationMatrix(axis: string, forward: boolean): THREE.Matrix4 {
  // set up rotation matrix
  let angle = Math.PI / 4;
  if (!forward) {
    angle = -angle;
  }
  let rotationMatrix: THREE.Matrix4;
  switch (axis) {
    case "x":
      return new THREE.Matrix4().makeRotationX(angle);
      break;
    case "y":
      return new THREE.Matrix4().makeRotationY(angle);
      break;
    case "z":
      return new THREE.Matrix4().makeRotationZ(angle);
      break;
    default:
      return new THREE.Matrix4();
  }
}

function rotatePieces(pieces: THREE.Mesh[], axis: string, forward: boolean): void {
  // apply rotation to each piece
  pieces.forEach((piece) => {
    piece.applyMatrix4(getRotationMatrix(axis, forward));
  });

  function rotatePieces0(pieces: THREE.Mesh[], axis: string, forward: boolean): void {
  let quaternion = getQuaternion(axis, forward);

  // Create a group and add all pieces to it
  const group = new THREE.Group();
  pieces.forEach(piece => group.add(piece));

  // Add the group to the scene
  scene.add(group);

  // Apply rotation to the group
  group.quaternion.multiply(quaternion);
  group.updateMatrixWorld(true); // Update the group's matrix

  // Remove the group from the scene and add back the individual pieces
  scene.remove(group);
  pieces.forEach(piece => scene.add(piece));
}

// function to set colors of pieces
function setColors(pieces: THREE.Mesh[], colors: number[]): void {
  pieces.forEach((piece, index) => {
    piece.material = new THREE.MeshBasicMaterial({color: colors[index]});
  });
}

function getQuaternion(axis: string, forward: boolean): THREE.Quaternion {
  // set up rotation angle
  let angle = Math.PI / 4;
  if (!forward) {
    angle = -angle;
  }
  let quaternion: THREE.Quaternion;
  switch (axis) {
    case "x":
      quaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), angle);
      break;
    case "y":
      quaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);
      break;
    case "z":
      quaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), angle);
      break;
    default:
      quaternion = new THREE.Quaternion();
  }
  return quaternion;
}

function tlTest(pieces: THREE.Mesh[]): void {
  // Create a group and add all pieces to it
  const group = new THREE.Group();
  pieces.forEach(piece => group.add(piece));

  // Add the group to the scene
  scene.add(group);

  // Initialize the startQuaternion with the current orientation of the first piece
  let startQuaternion = pieces[0].quaternion.clone();
  let targetQuaternion = getQuaternion("x", true);

  let tl = gsap.timeline();

  // Create a dummy object for this group
  const dummy = { lerpFactor: 0 };

  // Add an animation to the timeline
  tl.to(dummy, {
    lerpFactor: 1,
    duration: 1,
    ease: "linear",
    onUpdate: () => {
      // On each update, interpolate between the start quaternion and the target quaternion
      group.quaternion.copy(startQuaternion).slerp(targetQuaternion, dummy.lerpFactor);
      group.updateMatrixWorld(true);
    },
    onComplete: () => {
      // At the end of the animation, update the startQuaternion to be the final orientation of the group
      startQuaternion.copy(group.quaternion);

      // Update the pieces' matrices to reflect the final transformation of the group
      pieces.forEach(piece => {
        piece.matrixWorld.decompose(piece.position, piece.quaternion, piece.scale);
        scene.add(piece); // Add the piece back to the scene
      });

      // Remove the group from the scene
      scene.remove(group);
    }
  });
}

function rotatePieces1(pieces: THREE.Mesh[], axis: string, forward: boolean): void {
  // Convert the target rotation from degrees to radians
  const targetRotation = 45 * (Math.PI / 180);

  // Create a pivot point at the origin
  const pivot = new THREE.Object3D();
  scene.add(pivot);

  // Add the pieces to the pivot point
  pieces.forEach(piece => {
    // Calculate the position of the piece relative to the pivot point
    const relativePosition = piece.position.clone();
    // Create a new piece at the relative position
    const newPiece = createCube(relativePosition.x, relativePosition.y, relativePosition.z);
    // Add the new piece to the pivot point
    pivot.add(newPiece);
  });

  // Animate the rotation of the pivot point
  const startRotation = pivot.rotation[axis];
  const dummy = { rotation: startRotation };
  gsap.to(dummy, {
    rotation: targetRotation,
    duration: 1,
    ease: "linear",
    onUpdate: () => {
      pivot.rotation[axis] = dummy.rotation;
    },
    onComplete: () => {
      // At the end of the animation, update the pieces' matrices to reflect the final transformation of the pivot
      pieces.forEach(piece => {
        piece.matrixWorld.decompose(piece.position, piece.quaternion, piece.scale);
        scene.add(piece); // Add the piece back to the scene
      });

      // Remove the pivot from the scene
      scene.remove(pivot);
    }
  });
}

function onKeyDown(event: KeyboardEvent): void {
  switch (event.key) {
    case "d":
      window.ipcRenderer.send('open-dev-tools');
      break;
    case "s":
      setColors(selectPieces(undefined,0), [0x808080]);
      break;
    case "r":
      rotatePieces(selectPieces(2), "x", true);
      break;
    case "t":
      tlTest(selectPieces(2));
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
