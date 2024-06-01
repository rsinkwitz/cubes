import * as THREE from 'three';

import { BufferGeometry } from 'three/src/core/BufferGeometry.js';
import { Float32BufferAttribute } from 'three/src/core/BufferAttribute.js';
import { Vector3 } from 'three/src/math/Vector3.js';

export class BoxGeometryEnh extends BufferGeometry {
	type: string;
	parameters: { width: number; height: number; depth: number; widthSegments: number; heightSegments: number; depthSegments: number; diagFocus: number; faceTwoMat: boolean};

	constructor( width = 1, height = 1, depth = 1, widthSegments = 1, heightSegments = 1, depthSegments = 1, diagFocus = 0, faceTwoMat = false) {

		super();

		this.type = 'BoxGeometryEnh';

		this.parameters = {
			width: width,
			height: height,
			depth: depth,
			widthSegments: widthSegments,
			heightSegments: heightSegments,
			depthSegments: depthSegments,
			diagFocus: diagFocus,
			faceTwoMat: faceTwoMat
		};

		const scope = this;

		// segments

		widthSegments = Math.floor( widthSegments );
		heightSegments = Math.floor( heightSegments );
		depthSegments = Math.floor( depthSegments );

		// buffers

		const indices: number[]  = [];
		const vertices: number[] = [];
		const normals: number[] = [];
		const uvs: number[] = [];

		// helper variables

		let numberOfVertices = 0;
		let groupStart = 0;

		// cubes with special diagonal focus towards two corners
		const diagFocusLists = [
			//  red, orange, white, yellow, green, blue
			[false,false,false,false,false,false],  // all other cubes
			[true, false,true, false,false,true ],	// cube 0, 26
			[false,true, true, false,true, false],  // cube 6, 20
			[false,true, false,true, false,true ],  // cube 8, 18
			[true, false,false,true, true, false]   // cube 2, 24
		];
		const diagSwaps = diagFocusLists[diagFocus];

		// build each side of the box geometry

		buildPlane( 'z', 'y', 'x', -1, -1, depth, height,  width, depthSegments, heightSegments, diagSwaps[0], 0 ); // px, red
		buildPlane( 'z', 'y', 'x',  1, -1, depth, height, -width, depthSegments, heightSegments, diagSwaps[1], 1 ); // nx, orange
		buildPlane( 'x', 'z', 'y',  1,  1, width, depth,  height, widthSegments,  depthSegments, diagSwaps[2], 2 ); // py, white
		buildPlane( 'x', 'z', 'y',  1, -1, width, depth, -height, widthSegments,  depthSegments, diagSwaps[3], 3 ); // ny, yellow
		buildPlane( 'x', 'y', 'z',  1, -1, width, height,  depth, widthSegments, heightSegments, diagSwaps[4], 4 ); // pz, green
		buildPlane( 'x', 'y', 'z', -1, -1, width, height, -depth, widthSegments, heightSegments, diagSwaps[5], 5 ); // nz, blue

		// build geometry

		this.setIndex( indices );
		this.setAttribute( 'position', new Float32BufferAttribute( vertices, 3 ) );
		this.setAttribute( 'normal', new Float32BufferAttribute( normals, 3 ) );
		this.setAttribute( 'uv', new Float32BufferAttribute( uvs, 2 ) );

		function setVectorField(v: Vector3, prop: string, value: number) {
			if (prop === 'x') {
				v.setX(value);
			} else if (prop === 'y') {
				v.setY(value);
			} else {
				v.setZ(value);
			}
		}

		function buildPlane( u: string, v: string, w: string, udir: number, vdir: number, 
			width: number, height: number, depth: number, gridX: number, gridY: number, otherDiagonal: boolean, materialIndex: number) {

			const segmentWidth = width / gridX;
			const segmentHeight = height / gridY;

			const widthHalf = width / 2;
			const heightHalf = height / 2;
			const depthHalf = depth / 2;

			const gridX1 = gridX + 1;
			const gridY1 = gridY + 1;

			let vertexCounter = 0;
			let groupCount = 0;

			const vector = new Vector3();

			// generate vertices, normals and uvs

			for ( let iy = 0; iy < gridY1; iy ++ ) {

				const y = iy * segmentHeight - heightHalf;

				for ( let ix = 0; ix < gridX1; ix ++ ) {

					const x = ix * segmentWidth - widthHalf;

					// set values to correct vector component

					setVectorField(vector, u, x * udir);
					setVectorField(vector, v, y * vdir);
					setVectorField(vector, w, depthHalf);

					// now apply vector to vertex buffer

					vertices.push( vector.x, vector.y, vector.z );
					vertices.push( vector.x, vector.y, vector.z );

					// set values to correct vector component

					setVectorField(vector, u, 0);
					setVectorField(vector, v, 0);
					setVectorField(vector, w, depth > 0 ? 1 : - 1);

					// now apply vector to normal buffer

					normals.push( vector.x, vector.y, vector.z );
					normals.push( vector.x, vector.y, vector.z );

					// uvs

					uvs.push( ix / gridX );
					uvs.push( 1 - ( iy / gridY ) );
					uvs.push( ix / gridX );
					uvs.push( 1 - ( iy / gridY ) );

					// counters

					vertexCounter += 2;

				}

			}
			
			var matFactor = faceTwoMat ? 2 : 1; // if faceTwoMat is true, we will have two materials for each face
			var firstMatUsed = false; // flag to indicate if the first material has been used
			function firstGroup() {
				if (faceTwoMat && !firstMatUsed) {
					firstMatUsed = true;
					scope.addGroup( groupStart, 3, materialIndex * matFactor + 1 );
					groupStart += 3;
					groupCount -= 3;
				}
			}

			// indices

			// 1. you need three indices to draw a single face
			// 2. a single segment consists of two faces
			// 3. so we need to generate six (2*3) indices per segment

			for ( let iy = 0; iy < gridY; iy ++ ) {

				for ( let ix = 0; ix < gridX; ix ++ ) {

					const a = numberOfVertices + (ix + gridX1 * iy)*2;
					const b = numberOfVertices + (ix + gridX1 * ( iy + 1 ))*2;
					const c = numberOfVertices + (( ix + 1 ) + gridX1 * ( iy + 1 ))*2;
					const d = numberOfVertices + (( ix + 1 ) + gridX1 * iy)*2;

					// faces

					if (otherDiagonal) {
						indices.push( a, b, c );
						firstGroup();
						indices.push( a+1, c+1, d+1);
					} else {
						indices.push( a, b, d );
						firstGroup();
						indices.push( b+1, c+1, d+1 );
					}

					// increase counter

					groupCount += 6;

				}

			}

			// add a group to the geometry. this will ensure multi material support

			scope.addGroup( groupStart, groupCount, materialIndex * matFactor );

			// calculate new start value for groups

			groupStart += groupCount;

			// update total number of vertices

			numberOfVertices += vertexCounter;

		}

	}

	copy( source: BoxGeometryEnh ) {

		super.copy( source );

		this.parameters = Object.assign( {}, source.parameters );

		return this;

	}

	static fromJSON( data: { width: number; height: number; depth: number; widthSegments: number; heightSegments: number; depthSegments: number; }) {

		return new BoxGeometryEnh( data.width, data.height, data.depth, data.widthSegments, data.heightSegments, data.depthSegments );

	}

}
