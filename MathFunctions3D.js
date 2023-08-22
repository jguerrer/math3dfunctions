/**
 * Function to operate on 3D vectors, expressed as arrays  v=[x,y,z],i.e. 0,1,2 index
 */


//https://mathjs.org/download.html
//const { re } = require('mathjs');
const mathjs = require('mathjs')

let math3d = module.exports = {


    to3DArray: function (vector) {
        return [vector.x, vector.y, vector.z];
    },

    to3DObject: function (vector) {
        return { x: vector[0], y: vector[1], z: vector[2] };
    },

    /**
     * 
     *  STATUS: FINISHED. 
     * Projects a 3D vector into a 3D plane, i.e. into a subspace  of 3D
     * Coordinates are in real world, instead of normalized vectors
     * 
     * https://www.maplesoft.com/support/help/maple/view.aspx?path=MathApps%2FProjectionOfVectorOntoPlane#:~:text=The%20projection%20of%20onto%20a,of%20%2C%20leaving%20the%20horizontal%20component.
     * @param {*} vector  []
     * @param {*} plane  Plane as three points in space, so it must be normalized always
     * @returns 
     */

    projectVectorIntoPlane: function (vector, p1, p2, p3) {

        //vector is anchored on p1, so vector is vector - p1
        //se considera que los vectores son p1p2 y p1p3
        let v1 = [p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]];
        let v2 = [p3[0] - p1[0], p3[1] - p1[1], p3[2] - p1[2]];

        let n = this.getOrthogonalVector(v1, v2);
        //console.log(`drawLine(${p1[0]},${p1[1]},${p1[2]},${p1[0]},${p1[1]},${p1[2]})`)

        /*
                console.log(`drawPlane([${p1}],[0,0,0],[${v1}],[${v2}],20);`)
        
                console.log('Normal al plano')
                console.log(`drawLine(${p1},${n},5);`)
                console.log(`drawLine(${vector},${n},5);`)
        
                console.log(`drawPoint(${vector},0.25,0x0000ff);`)
                console.log(`drawPoint(${p1},0.25,0xFF00ff);`)
                console.log(`drawLine2p([${p1}],[${vector}] ,0xFF00ff);`)
        */

        let p1vector = [vector[0] - p1[0], vector[1] - p1[1], vector[2] - p1[2]];//vector anchored to p1
        let proj_v_n_mag = ((p1vector[0] * n[0]) + (p1vector[1] * n[1]) + (p1vector[2] * n[2])) / (mathjs.sqrt((n[0] * n[0]) + (n[1] * n[1]) + (n[2] * n[2])))
        //  let proj_v_n_mag = ((p1vector[0] * n[0]) + (p1vector[1] * n[1]) + (p1vector[2] * n[2])) / (mathjs.sqrt((p1vector[0] * p1vector[0]) + (p1vector[1] * p1vector[1]) + (p1vector[2] * p1vector[2])))
        //puede ser aqui el problema, el vector debia ser 
        let proj_v_n = [
            vector[0] - (proj_v_n_mag * n[0]),
            vector[1] - (proj_v_n_mag * n[1]),
            vector[2] - (proj_v_n_mag * n[2])
        ];
        //      console.log(`drawPoint(${proj_v_n},0.25,0xffffff);`)

        /*
 
         let proj_v_n = [
             p1vector[0] - (proj_v_n_mag * n[0]),
             p1vector[1] - (proj_v_n_mag * n[1]),
             p1vector[2] - (proj_v_n_mag * n[2])
         ];
 
         //regresando a la posicion final, es decir,
         proj_v_n = [
             vector[0] - (proj_v_n_mag * n[0]),
             vector[1] - (proj_v_n_mag * n[1]),
             vector[2] - (proj_v_n_mag * n[2])
         ];
 */

        //console.log('line from ')
        //console.log(`drawLine2p(${p1[0]},${p1[1]},${p1[2]},      ${p1[0] + proj_v_n[0] },${p1[1]+ proj_v_n[0]},${p1[1]+ proj_v_n[2]}   ,0x00ff00)`)



        let normv = [n[0] * proj_v_n_mag, n[1] * proj_v_n_mag, n[2] * proj_v_n_mag]
        let normvd = mathjs.sqrt((normv[0] * normv[0]) + (normv[1] * normv[1]) + (normv[2] * normv[2]));

        return { projectedVector: proj_v_n, normalVector: normv, normalDistance: normvd };//the desired output, ant the output
    },

    /**
     *  Takes an arbitrary point[x,y,z] and three points within a plane p1,p2,p3.
     *  Points can be on world coordinates so no neet to center around zero, but seems not working all the time
     * 
     *  Uses the projection of a point into a plane and preserves the distance obtained.
     * 
     * @param {*} point 
     * @param {*} p1 
     * @param {*} p2 
     * @param {*} p3 
     * @returns 
     */

    computePoint2PlaneDistance: function (point, p1, p2, p3) {


        //requires to obtain the normal to the plane, project point onto the normal and apply the difference beteeen point and normal

        //Formula to project:
        let p1point = [point[0] - p1[0], point[1] - p1[1], point[2] - p1[2]];//point is anchored to p1


        let res = this.projectVectorIntoPlane(point, p1, p2, p3);////<<<<<<<<<<<<<< tiene errores




        //el vector que va del punto deseado a la proyeccion en el plano, del cual sacamos su distancia
        let normv = [point[0] - res.projectedVector[0], point[1] - res.projectedVector[1], point[2] - res.projectedVector[2]]
        let normvd = mathjs.sqrt(normv[0] * normv[0] + normv[1] * normv[1] + normv[2] * normv[2]);

        //        return { projectedVector: [p1[0] + p1point[0],p1[1] + p1point[1],p1[2] + p1point[2]], normalVector: normv, normalDistance: normvd };//the desired output, ant the output
        return { projectedVector: res.projectedVector, normalVector: normv, normalDistance: normvd };//the desired output, ant the output
    },




    /**
     * 
     *  Normalizes a     vector, attached to the origin
    */
    normalize3D: function (v1) {
        let vnorm = this.norm3D(v1);
        return [v1[0] / vnorm, v1[1] / vnorm, v1[2] / vnorm];

    },
    /**
     * Computes the norm of a vector in r3
     * @param {*} v1 
     * @returns 
     */
    norm3D: function (v1) {
        return mathjs.sqrt(v1[0] * v1[0] + v1[1] * v1[1] + v1[2] * v1[2]);


    }
    /**
     * Adds two 3D vectors component based
     * @param {*} v1 
     * @param {*} v2 
     * @returns 
     */

    ,
    addVector3D: function (v1, v2) {
        /*
          console.log('addVector');
  
          console.log(v1);
          console.log(v2);
          */
        return [v1[0] + v2[0], v1[1] + v2[1], v1[2] + v2[2]];
    }
    ,

    diffVector3D: function (v1, v2) {
        /*
          console.log('addVector');
  
          console.log(v1);
          console.log(v2);
          */
        return [v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2]];
    }
    ,

    /**
     * Multiply a 3d vector and scalar 
     * @param {*} v1 
     * @param {*} scalar 
     * @returns 
     */
    multiplyScalar3D: function (v1, scalar) {
        /*
                console.log('multiply');
                console.log(v1);
                console.log(scalar);
                console.log(v1[0]*scalar);
                console.log(v1[1]*scalar);
                console.log(v1[2]*scalar);
                */
        return [
            v1[0] * scalar,
            v1[1] * scalar,
            v1[2] * scalar
        ];
    },

    /**
         * Transpose a 3x3 matrix 
         * @param {*} v1 
         * @param {*} scalar 
         * @returns 
         */
    transpose3D: function (m3d) {

        return [
            [
                m3d[0][0],
                m3d[1][0],
                m3d[2][0]
            ],

            [
                m3d[0][1],
                m3d[1][1],
                m3d[2][1]
            ],

            [
                m3d[0][2],
                m3d[1][2],
                m3d[2][2]
            ]



        ];
    },


    /**
     * Multiply a 3D matrix with scalar
     * m3d as rows, r1,r2,r3
    * @param {*} m3d 
    * @param {*} scalar 
    * @returns 
    */
    multiply3DMatrixWScalar: function (m3d, scalar) {
        /*
                console.log('multiply');
                console.log(v1);
                console.log(scalar);
                console.log(v1[0]*scalar);
                console.log(v1[1]*scalar);
                console.log(v1[2]*scalar);
                */
        return [
            [
                m3d[0][0] * scalar,
                m3d[0][1] * scalar,
                m3d[0][2] * scalar
            ],

            [
                m3d[1][0] * scalar,
                m3d[1][1] * scalar,
                m3d[1][2] * scalar
            ],
            [
                m3d[2][0] * scalar,
                m3d[2][1] * scalar,
                m3d[2][2] * scalar
            ]


        ];
    },


    /* Returns a normal vector to a line. Initially the line is considered to be horizontal
    ????? REVISAR 
    But THis is 
    */

    normalVector2Horizon: function (startPoint, endPoint) {

        //x1 and x2 belong to the vector
        //v3 corresponds to the horizon and is just any other line horozontal
        let x = this.x;
        let y = this.y;
        let z = this.z;

        let x1 = startPoint[x];
        let y1 = startPoint[y];
        let z1 = startPoint[z];


        let x2 = endPoint[x];
        let y2 = endPoint[y];
        let z2 = endPoint[z];

        let un = [x2 - x1, y2 - y1, z2 - z1];


        //apuntamos el vector en otra direccion, y creo que no es necesario mas
        let xn = -un[y];
        let yn = un[x];
        //   let zn=0;
        let zn = startPoint[z] - endPoint[z];


        //debera normalizarse? no siempre
        let norm = mathjs.sqrt(xn * xn + yn * yn + zn * zn)

        let normalunit = [xn / norm, yn / norm, zn / norm]
        return normalunit;

    },



    //angle between vector around zero, first the normal , then the projection, 
    computeAngleBetweenVectors: function (v1, v2) {
        let x = 0;
        let y = 1;
        let z = 2;


        let dot = v1[x] * v2[x] + v1[y] * v2[y] + v1[z] * v2[z];
        let magA = mathjs.sqrt((v1[x] * v1[x]) + (v1[y] * v1[y]) + (v1[z] * v1[z]));
        let magB = mathjs.sqrt((v2[x] * v2[x]) + (v2[y] * v2[y]) + (v2[z] * v2[z]));

        let angle =
            mathjs.acos(
                [dot /

                    (
                        magA
                        *
                        magB
                    )

                ]
            )
        return angle[0];
    },

    toWKT: function (v) {
        return `POINT(${v[0]} ${v[1]} ${v[2]})`;

    },

    /**
     * Turns a set of 3 3dPoints into a WKT representation, where the last point is the first
     * @param {*} v1 
     * @param {*} v2 
     * @param {*} v3 
     * @returns 
     */
    toWKTTriangle: function (v1, v2, v3) {
        return `POLYGON(( ${v1[0]} ${v1[1]} ${v1[2]} , ${v2[0]} ${v2[1]} ${v2[2]},${v3[0]} ${v3[1]} ${v3[2]},${v1[0]} ${v1[1]} ${v1[2]}))`;

    }

    ,
    /**
     * Computes the normal vector to a plane defined by 3 points, computing vectors v1-v2 and v2-v3, which lie in a plane.
     * This determines the direction of the vector, either positive or negative wrt plane
     * 
     * @param {*} v1 
     * @param {*} v2 
     * @param {*} v3 
     * @returns 
     */
    getOrthogonalVector2Plane: function (v1, v2, v3) {
        return this.normalVector2Plane(v1[0], v1[1], v1[2], v2[0], v2[1], v2[2], v3[0], v3[1], v3[2]);
    }
    ,
    /**
     * Same function as above
     * Given three points, computes a normal to that planee
     * @param {*} x1 
     * @param {*} y1 
     * @param {*} z1 
     * @param {*} x2 
     * @param {*} y2 
     * @param {*} z2 
     * @param {*} x3 
     * @param {*} y3 
     * @param {*} z3 
     * @returns  [x,y,z] array
     */
    normalVector2Plane: function (x1, y1, z1, x2, y2, z2, x3, y3, z3) {
        //compute normal for a face
        //https://mathjs.stackexchange.com/questions/501949/determining-a-perpendicular-vector-to-two-given-vectors
        let un = [x2 - x1, y2 - y1, z2 - z1];
        let vn = [x3 - x2, y3 - y2, z3 - z2];


        let xn = (un[1] * vn[2]) - (vn[1] * un[2]);
        let yn = (un[2] * vn[0]) - (vn[2] * un[0]);//este estaba mal,
        let zn = (un[0] * vn[1]) - (vn[0] * un[1]);

        //debera normalizarse?
        let norm = mathjs.sqrt(xn * xn + yn * yn + zn * zn)

        let normal = [xn / norm, yn / norm, zn / norm]

        return normal;
    }



    ,

    /**
     * Takes a set of points and rotate them to lay down on theXY plane or horizon
     * 
     * Method is used to compute an area as a metric.
     */
    rotatePointsToXYPlane: function () {

    }
    ,
    /**
     *  Takes a set of points and computes the area as an approximation of the projection on the XY plane.
     *  This is mostly a trick to ignore the Z coordinate, but if points are rotated, may work best
     */

    computeBBOX: function (pointsArray) {
        //it  uses a hash to count the number of 

        //can have several passes
        // 1. compute bbox, with minmax

        let minx = Number.MAX_SAFE_INTEGER;
        let miny = minx;
        let minz = minx;

        let maxx = Number.MIN_SAFE_INTEGER;
        let maxy = maxx
        let maxz = maxx;



        for (let i = 0; i < pointsArray.length; i = i + 3) {

            if (pointsArray[i] < minx) minx = pointsArray[i];
            if (pointsArray[i + 1] < miny) miny = pointsArray[i + 1];
            if (pointsArray[i + 2] < minz) minz = pointsArray[i + 2];

            if (pointsArray[i] > minx) maxx = pointsArray[i];
            if (pointsArray[i + 1] > maxy) maxy = pointsArray[i + 1];
            if (pointsArray[i + 2] > maxz) maxz = pointsArray[i + 2];


        }

        //        console.log('MINX: ' + minx + '\n' + 'MINY: ' + miny + '\n' + 'MINZ: ' + minz + '\n'            + 'MAXX: ' + maxx + '\n' + 'MAXY: ' + maxy + '\n' + 'MAXZ: ' + maxz + '\n');

        return [minx, miny, minz, maxx, maxy, maxz];
    }
    ,

    /**
     * https://computergraphics.stackexchange.com/questions/2399/3d-rotation-matrix-around-vector
     * https://en.wikipedia.org/wiki/Rodrigues'_rotation_formula#Matrix_notation
     * 
     * 1) build component matrix C
     * 2) build C^2,  I3
     * 
     * 2) Ra(θ)=I+Csinθ+C^2(1−cosθ)
     * 
     * pointsArray is passed as xyz,xyz, xyz, 
     * axisvector is stored as xyz
     * angle passed in radias using a right hand 
     * 
     * 
     * @param {*} pointsArray 
     * @param {*} axisVector 
     * @param {*} angle 
     */
    rotateAroundVectorRodriguez: function (pointsArray, axisVector, angle) {

        //axis indices
        let x = 0;
        let y = 1;
        let z = 2;


        let I = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];


        // C stored as rows . i.e. r1, r2, r3,  stored as columns
        //check how to store by default, ussualy by row
        let C = [
            [0, -1.0 * axisVector[z], axisVector[y]],
            [axisVector[z], 0, -1.0 * axisVector[x]],
            [-1 * axisVector[y], axisVector[x], 0]
        ];

        C = this.transpose3D(C);
        //C squared
        /*
                let C2 = [
                    [-1.0 * axisVector[z] * axisVector[z] - axisVector[y] * axisVector[y],
                    axisVector[x] * axisVector[y],
                    axisVector[z] * axisVector[x]],
        
                    [axisVector[x] * axisVector[y],
                    -1.0 * axisVector[z] * axisVector[z] + axisVector[x] * axisVector[x],
                    axisVector[z] * axisVector[y]
                    ],
                    [axisVector[x] * axisVector[z],
                    axisVector[y] * axisVector[z],
                    -1.0 * axisVector[y] * axisVector[y] - axisVector[x] * axisVector[x]
                    ]
        
                ];
                */


        let C2 = this.prodMatrices3(C, C)
        //a rotation unit vector
        //thetha, angle in radians
        //R_a (thetha) = I + C*Sin(Theta) + C^2*(1-Cos(Theta))

        let sinTheta = mathjs.sin(angle);
        let cosTheta = mathjs.cos(angle);


        //C*Sin(Th)
        let T2 = this.multiply3DMatrixWScalar(C, sinTheta);
        let T3 = this.multiply3DMatrixWScalar(C2, (1.0 - cosTheta))

        let R = this.sumMatrices3(I, this.sumMatrices3(T2, T3));
        //debo buscar la forma de revisar esto, por el orden de C y la multiplicacion, pporque yo meto todo como rengones

        //ahora necesitamos multiplicar el vector por la rotacion

        //rotate each vector by R

        let size = pointsArray.length / 3;
        //        console.log('PointArray points: ' + size)
        let res = [];

        //        console.log('--> I')
        //        console.log(I)
        //        console.log('--> T2')
        //        console.log(T2);
        //        console.log('--> T3')
        //        console.log(T3);
        //        console.log('--> R')
        //        console.log(R);


        for (let i = 0; i < size; i++) {
            //console.log('VECTOR: ' + [pointsArray[i * 3 + 0], pointsArray[i * 3 + 1], pointsArray[i * 3 + 2]]);
            res.push(this.prodMatrix3WVector(R, [pointsArray[i * 3 + 0], pointsArray[i * 3 + 1], pointsArray[i * 3 + 2]]))
        }


        //        console.log('--> res')
        //        console.log(res);

        return res;



    },

    sumMatrices3: function (A, B) {


        let C = [
            [
                A[0][0] + B[0][0],
                A[0][1] + B[0][1],
                A[0][2] + B[0][2]
            ],
            [
                A[1][0] + B[1][0],
                A[1][1] + B[1][1],
                A[1][2] + B[1][2]
            ],
            [
                A[2][0] + B[2][0],
                A[2][1] + B[2][1],
                A[2][2] + B[2][2]
            ]
        ];
        return C;

    },
    createI3: function () {

        return [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    },

    /**
     * 
     * @param {*} A 
     * @param {*} B 
     * @returns 
     */
    prodMatrices3: function (A, B) {


        let C = [
            [
                A[0][0] * B[0][0] +
                A[0][1] * B[1][0] +
                A[0][2] * B[2][0]
                ,

                A[0][0] * B[0][1] +
                A[0][1] * B[1][1] +
                A[0][2] * B[2][1]
                ,
                A[0][0] * B[0][2] +
                A[0][1] * B[1][2] +
                A[0][2] * B[2][2]


            ],
            /////////////
            [
                A[1][0] * B[0][0] +
                A[1][1] * B[1][0] +
                A[1][2] * B[2][0]
                ,

                A[1][0] * B[0][1] +
                A[1][1] * B[1][1] +
                A[1][2] * B[2][1]
                ,
                A[1][0] * B[0][2] +
                A[1][1] * B[1][2] +
                A[1][2] * B[2][2]


            ],
            //////////////
            [
                A[2][0] * B[0][0] +
                A[2][1] * B[1][0] +
                A[2][2] * B[2][0]
                ,

                A[2][0] * B[0][1] +
                A[2][1] * B[1][1] +
                A[2][2] * B[2][1]
                ,
                A[2][0] * B[0][2] +
                A[2][1] * B[1][2] +
                A[2][2] * B[2][2]


            ]

        ];
        return C;

    },


    /**
     * Implements the product of a Matrix A with a vector  v in R3.
     * 
     *  A 3x3
     *  v 3 x 1,  column vector
     * 
     *  Result:  v'  3 x 1 vector.
     * 
     *   Av= v'
     * 
     * @param {*} A 
     * @param {*} v 
     * @returns 
     */
    prodMatrix3WVector: function (A, v) {


        let C =
            [
                A[0][0] * v[0] +
                A[0][1] * v[1] +
                A[0][2] * v[2]
                ,

                A[1][0] * v[0] +
                A[1][1] * v[1] +
                A[1][2] * v[2]
                ,
                A[2][0] * v[0] +
                A[2][1] * v[1] +
                A[2][2] * v[2]

            ];
        //        console.log('Product MAtrix w Vector ')
        //      console.log(C)
        return C;

    },


    /**
     * Implements the product of a Matrix A with a vector  v in RN.
     * 
     *  A:  n x n
     *  v:  n x 1,  column vector
     * 
     *  Result:  v'  n x 1 vector, column vector. 
     * 
     *  This can be daist chained for products of different operations
     * 
     * 
     * 
     *  vAv
     * 
     *   Av= v'
     * 
     * @param {*} A 
     * @param {*} v 
     * @returns 
     */
    prodMatrixNVectorN: function (A, v) {

        //checking lengths of A and B

        //matrices are stored in rows 
        if (!this.isMatrix(A)) {
            console.log('ERROR: A is not a matrix')
            return null;
        }
        if (!this.isVector(v)) {
            console.log('ERROR: v is not a vector')
            return null;
        }

        let dim = v.length;

        let sameDim = true;
        let rows = A.length;

        for (let row = 0; row < rows; row++) {

            sameDim = (sameDim && (A[row].length == dim))
        }

        let outputVector = [];
        if (sameDim) {
            let cols = A[0].length;
            for (let row = 0; row < rows; row++) {
                let currentRow = A[row];
                let currentEntry = 0;
                for (let col = 0; col < cols; col++) {
                    currentEntry += currentRow[col] * v[col];
                }
                outputVector[row] = currentEntry;//must be the same for matrix multiplication
            }
        }

        return C;

    },
    /**
     * Computes the arbitrary product of two matrices A and B
     * 
     * Dimensions must agree     AB, so 
     * A m x n
     * B n x p
     * 
     * result is an m x p matrix as array [[row1_1,row1_p] ,... ,[rowm_1 , rowm_p]];
     * 
     * @param {*} A 
     * @param {*} B 
     * @returns 
     */
    prodMatrix: function (A, B) {

        //checking lengths of A and B

        //matrices are stored in rows 

        if (!this.isMatrix(A)) {
            console.log('ERROR: A is not a matrix')
            return null;
        }

        if (!this.isMatrix(B)) {
            console.log('ERROR: B is not a matrix')
            return null;
        }


        let rowsA = A.length;
        let rowsB = B.length;

        let colsA = A[0].length;
        let colsB = B[0].length;

        if (colsA != rowsB) {
            console.log(`ERROR prodMatrix: Inconpatible dimensions A: ${rowsA} x ${colsA}  vs  ${rowsB} x ${colsB}.   Inner dimensions different.`);
            return null;
        }

        let outputMatrix = [];

        for (let row = 0; row < rowsA; row++) {
            outputMatrix.push([])
            //let tmpvec=A[row];
            for (let col = 0; col < colsB; col++) {
                let currentValue = 0;

                for (let cur_row = 0; cur_row < rowsB; cur_row++) {
                    currentValue += A[row][cur_row] * B[cur_row][col];
                }
                //console.log(row + ' ' + col + ' ' + currentValue)
                outputMatrix[row][col] = currentValue;
            }

        }
        return outputMatrix;




    },


    /**
     *  Product of two vectors u,v.
     *  u row vector, v column vector
     *  Result: a 1x1 vector or scalar   [result]
     * @param {*} u 
     * @param {*} v 
     * @returns 
     */
    prodVectorNVectorN: function (u, v) {


        if (!this.isVector(u)) {
            console.log('ERROR: u is not a vector')
            console.log(u)
            return null;
        }

        if (!this.isVector(v)) {
            console.log('ERROR: v is not a vector')
            console.log(v)
            return null;
        }

        let outputVector = [];
        if (u.length == v.length) {
            let result = 0;
            for (let i = 0; i < u.length; i++) {

                result += u[i] * v[i];
            }
            outputVector[0] = result;
        }

        return outputVector;//1x1 vector []

    },

    isVector: function (array) {
        return !Array.isArray(array[0])
    },

    isMatrix: function (array) {
        return Array.isArray(array[0])
    },

    /**
     * Function to transpose a matrix or vector.
     * 
     * Vectors are expressed as a single row, so they are row vectors.
     * 
     * Rows become columns and require a new scrambling, so i,j becomes j.i
     * 
     * @param {*} matrix 
     * @returns 
     */
    transpose: function (matrix) {

        let transpose = [];
        for (let row = 0; row < matrix.length; row++) {
            //transpose.push([]);
            for (let column = 0; column < matrix[row].length; column++) {
                if (transpose[column] == null) {
                    transpose.push([]);
                }
                transpose[column][row] = matrix[row][column]
            }

        }
        return transpose;
    },

    vector2Matrix: function (v) {

        return [v];
    },

    /**
     * Center a pointcloud at the middle of the bounding box and compute area based on 2d
     */
    centerAtOrigin: function (pointsArray) {
        let a = 0;

    },
    /**
     * Takes a set of points and consider only the 2d projection of the pointcloud into the ground
    */
    computeArea: function (pointsArray) {

        let b = 0;

    },

    getOrthogonalVectorArray: function (v1, v2) {
        let un = [v1.x, v1.y, v1.z];
        let vn = [v2.x, v2.y, v2.z];

        return this.getOrthogonalVector(un, vn);

        /*
                let xn = (un[1] * vn[2]) - (vn[1] * un[2]);
        //        let yn = (un[0] * vn[2]) - vn[0] * un[2];
                let yn = (un[2] * vn[0]) - (vn[2] * un[0]);
                let zn = (un[0] * vn[1]) - (vn[0] * un[1]);
        
                //debera normalizarse?
                let norm = mathjs.sqrt(xn * xn + yn * yn + zn * zn)
        
                let normal = [xn / norm, yn / norm, zn / norm]
        
                return normal;
        */

    },
    getOrthogonalVector: function (v1, v2) {
        let un = [v1[0], v1[1], v1[2]];
        let vn = [v2[0], v2[1], v2[2]];


        let xn = (un[1] * vn[2]) - (vn[1] * un[2]);
        //        let yn = un[0] * vn[2] - vn[0] * un[2];//estaba mal
        let yn = (un[2] * vn[0]) - (vn[2] * un[0]);

        let zn = un[0] * vn[1] - vn[0] * un[1];

        //debera normalizarse?
        let norm = mathjs.sqrt((xn * xn) + (yn * yn) + (zn * zn))

        let normal = [xn / norm, yn / norm, zn / norm]

        return normal;


    },

    //proyects a vector into the XY plane
    getXYOrientation(v1) {

    },


    /**
     * My attempt to convert a java version of line plane intersection taken from wolfram
     * 
     *    https://mathworld.wolfram.com/Line-PlaneIntersection.html

    * Check also https://mathworld.wolfram.com/Plane-PlaneIntersection.html
     * 
     * This works with an arbitrary line an a plane
     * 
     * 
     * @param {*} planePoint1 
     * @param {*} planePoint2 
     * @param {*} planePoint3 
     * @param {*} linePoint1 
     * @param {*} linePoint2
     */
    computeLinePlaneIntersection(planePoint1, planePoint2, planePoint3, linePoint1, linePoint2) {


        let p1 = planePoint1;
        let p2 = planePoint2;
        let p3 = planePoint3;
        let l1 = linePoint1;
        let l2 = linePoint2;
        /*
        double upperPartValues[][] = 	
            {{1.0,1.0,1.0,1.0},
                {p1.x,p2.x,p3.x,l1.x},
                {p1.y,p2.y,p3.y,l1.y},
                {p1.z,p2.z,p3.z,l1.z}};
*/

        let upperPart = mathjs.matrix(
            [[1.0, 1.0, 1.0, 1.0],
            [p1.x, p2.x, p3.x, l1.x],
            [p1.y, p2.y, p3.y, l1.y],
            [p1.z, p2.z, p3.z, l1.z]]);

        //		Jama.Matrix upperPart= new Jama.Matrix(upperPartValues);

        //		System.out.println(upperPart.get(3, 2));
        upperPart = mathjs.transpose(upperPart);

        /*
        double lowerPartValues[][] = 	
                        {{1.0,1.0,1.0,0.0},
                        {p1.x,p2.x,p3.x,l2.x - l1.x},
                        {p1.y,p2.y,p3.y,l2.y - l1.y},
                        {p1.z,p2.z,p3.z,l2.z - l1.z}};
        */

        let lowerPart = mathjs.matrix(
            [[1.0, 1.0, 1.0, 0.0],
            [p1.x, p2.x, p3.x, l2.x - l1.x],
            [p1.y, p2.y, p3.y, l2.y - l1.y],
            [p1.z, p2.z, p3.z, l2.z - l1.z]]
        );

        //		Jama.Matrix lowerPart= new Jama.Matrix(lowerPartValues);
        lowerPart = mathjs.transpose(lowerPart);

        let up = mathjs.det(upperPart);//may produce numeric errors

        let low = mathjs.det(lowerPart);//may produce numeric errors

        let t = -up / low;

        let x = l1.x + (l2.x - l1.x) * t;
        let y = l1.y + (l2.y - l1.y) * t;
        let z = l1.z + (l2.z - l1.z) * t;

        //        let point = [x,y,z];
        let point = { x: x, y: y, z: z };

        return point;


    },



    /**
     * Obtains the intersection between two planes: a line.

*    Points are at the world position in JSON FORMAT, 
*  Normals are relative to the position.

        * 
     * 
     * Plane 1 is defined as  P1=p11,p12,p13   and a ortgogonalnormal to thar point  N1=n11,n12,n13
     * Plane 2 is defined as  P2=p21,p22,p23   and a normal to thar point  N2=n21,n22,n23
     * 
     * ******** WARNING I WAS RECEIVING POINT BUT NOT PLANES, I REQURE PLANE TO PROJECT INTO PLANE

     * Result is given by a point P3 and a normal to N3

     * Algorithm works as follows: N3 = N1 X N2, in direction of the intersection line, however the point has to be found.

     * The coordinate of the point is computed by solving the sides of the triangle formed by

        P1,P2p,P3.    P2p is the proyected point P2 into the N1N2 plane.
        
        The 


        The solution is obtained by solving the ASA triangle (Angle1, Side, Angle2)

        Known Values: 
        Side_c = Distance_P1P2p ,    
        Angle_sC= Angle N1N2


        Missing Values:
        Angle_B= Angle_N1_P1P2p,
        Angle_A= Angle_N2_P1P2p        
        Using Sine's Law,  a/SinA  = b/SinB  = c/SinC

        Side_b= b=Angle_C*(Side_c*Sin(Angle_B))
        Side_a= c=Angle_C*(Side_c*Sin(Angle_A))


        Finally, the intersection point is computed as  
        P1 + N2*side_b 
        or  
        P2p + N1*side_a

        To compute another  point in the line, is computed as 
        P2 +  N1*side_b
        or
        P1 +  N2*side_b


     * 
     * 
     * @param {*} p11 
     * @param {*} p12 
     * @param {*} p13 
     * @param {*} p21 
     * @param {*} p22 
     * @param {*} p23 
     */
    compute2PlanesIntersectionOLd(P1, P2, N1, N2) {
        console.log('compute2PlanesIntersection()   Requires Objects')
        //        console.log(P1)
        //        console.log(P2)
        //        console.log(N1)
        //s        console.log(N2)

        //            Must compute the points onf the plane
        let P1_at_planeN1N2 = { x: P1.x, y: P1.y, z: P1.z };
        let P2_at_planeN1N2 = { x: P1.x + N1.x, y: P1.y + N1.y, z: P1.z + N1.z };
        let P3_at_planeN1N2 = { x: P1.x + N2.x, y: P1.y + N2.y, z: P1.z + N2.z };

        console.log(P1_at_planeN1N2)
        console.log(P2_at_planeN1N2)
        console.log(P3_at_planeN1N2)
        //projected pooint p2 into N1N2 //

        //requires three points and two for the line
        let n1 = [N1.x, N1.y, N1.z];
        let n2 = [N2.x, N2.y, N2.z];
        console.log(N1)
        console.log(N2)

        let n3 = this.getOrthogonalVectorArray(N1, N2);//array  
        let N3 = { x: n3[0], y: n3[1], z: n3[2] }

        console.log('Showing Normal to Plane of normals')
        console.log(n3);
        console.log(N3);

        let LINEatN1N2 = {
            p1: { x: P2.x, y: P2.y, z: P2.z },
            p2: { x: P2.x + N3.x, y: P2.y + N3.y, z: P2.z + N3.z }
        };

        //ok

        /*
        let P2p = this.computeLinePlaneIntersection(
             [P1_at_planeN1N2[0],P1_at_planeN1N2[1],P1_at_planeN1N2[2]], 
             [P2_at_planeN1N2[0],P2_at_planeN1N2[1],P2_at_planeN1N2[2]], 
             [P3_at_planeN1N2[0],P3_at_planeN1N2[1],P3_at_planeN1N2[2]],//plane
             [line.p1[0],line.p1[1],line.p1[2]]  ,
             [line.p2[0],line.p2[1],line.p2[2]] 
             );
*/


        let P2p = this.computeLinePlaneIntersection(
            P1_at_planeN1N2, P2_at_planeN1N2, P3_at_planeN1N2,//plane
            LINEatN1N2.p1,
            LINEatN1N2.p2
        );




        let side_c = mathjs.sqrt(
            (P2p.x - P1.x) * (P2p.x - P1.x) +
            (P2p.y - P1.y) * (P2p.y - P1.y) +
            (P2p.z - P1.z) * (P2p.z - P1.z)
        );

        console.log('Side c')
        console.log(side_c);

        //computing angles
        //Angle_B= Angle_N1_P1P2p,
        //Angle_A= Angle_N2_P1P2p

        //normal vector ar ok, but the actual point P1 must be moved to zero




        let Angle_D = this.computeAngleBetweenVectors(n1, n2);//Angle C

        console.log('Angle C')

        if (Angle_C > Math.PI) {
            Angle_C = Angle_C - Math.PI;
        }
        console.log(Angle_C * (180 / Math.PI));
        //this is 
        let vectorP1P2p = [
            P2p.x - P1.x,
            P2p.y - P1.y,
            P2p.z - P1.z
        ];

        let vectorP2pP1 = [
            P1.x - P2p.x,
            P1.y - P2p.y,
            P1.z - P2p.z
        ];

        vectorP1P2pMAg = mathjs.sqrt(

            (vectorP1P2p[0] * vectorP1P2p[0]) +
            (vectorP1P2p[1] * vectorP1P2p[1]) +
            (vectorP1P2p[2] * vectorP1P2p[2])

        );

        vectorP1P2p = [
            vectorP1P2p[0] / vectorP1P2pMAg,
            vectorP1P2p[1] / vectorP1P2pMAg,
            vectorP1P2p[2] / vectorP1P2pMAg];


        vectorP1P2p = [
            vectorP2pP1[0] / vectorP1P2pMAg,
            vectorP2pP1[1] / vectorP1P2pMAg,
            vectorP2pP1[2] / vectorP1P2pMAg];






        console.log('Vector P1 P2p')
        console.log(vectorP1P2p)
        console.log('Vector  P2p P1')
        console.log(vectorP2pP1)

        let Angle_A = this.computeAngleBetweenVectors(vectorP2pP1, n2);//Angle A
        console.log('Angle A')
        if (Angle_A > Math.PI) {
            Angle_A = Angle_A - Math.PI;
        }
        console.log(Angle_A * (180 / Math.PI));
        ////////////////////////////////////////////////////////
        let Angle_B = Math.PI - Angle_C - Angle_A;

        console.log('Angle B')
        console.log(Angle_B * (180 / Math.PI));



        let side_a = (side_c * mathjs.sin(Angle_A)) / mathjs.sin(Angle_C);
        console.log('Side a')
        console.log(side_a)

        let side_b = (side_c * mathjs.sin(Angle_B)) / mathjs.sin(Angle_C);
        console.log('Side b')
        console.log(side_b)




        //ahora hay que calcular los puntos en la interseccion para obtener los limites de ambos

        n2_l = mathjs.sqrt(n2[0] * n2[0] + n2[1] * n2[1] + n2[2] * n2[2])
        n2 = [n2[0] / n2_l, n2[1] / n2_l, n2[2] / n2_l];

        n1_l = mathjs.sqrt(n1[0] * n1[0] + n1[1] * n1[1] + n1[2] * n1[2])
        n1 = [n1[0] / n1_l, n1[1] / n1_l, n1[2] / n1_l];


        let pointAtInt = {
            x: P1.x - (n2[0] * side_b),
            y: P1.y - (n2[1] * side_b),
            z: P1.z - (n2[2] * side_b),
        }

        let intersection = {
            P1: P1_at_planeN1N2,
            P2: P2p,
            IntersectionPoint: pointAtInt,
            Direction: N3
        }



        return intersection;

    },

    /**
     * Version actualizada para calcular la interseccion.
     * 
     * Primero proyectar un pointo en el plano n1n2
     * Calcular el vector c, en ambas direcciones.
     * 
     * 
     * 
     * @param {*} Plane1 
     * @param {*} Plane2 
     * @param {*} N1 
     * @param {*} N2 
     * @returns 
     */
    computePlanesIntersection(Plane1, Plane2, N1, N2) {
        let x = 0;
        let y = 1;
        let z = 2;
        console.log('computePlanesIntersection()   Requires Objects. Plane1 Plane2 N1 N2')

        //            Must compute the points onf the plane
        //plane N1N2
        let P1_at_planeN1N2 = [Plane1.p0[x], Plane1.p0[y], Plane1.p0[z]];
        let P2_at_planeN1N2 = [Plane1.p0[x] + N1.x, Plane1.p0[y] + N1.y, Plane1.p0[z] + N1.z];
        let P3_at_planeN1N2 = [Plane1.p0[x] + N2.x, Plane1.p0[y] + N2.y, Plane1.p0[z] + N2.z];



        console.log('////////////////////////////////////////////////////////////////////////////');

        console.log('Plano Generador');
        console.log(Plane1)
        console.log(Plane2)
        console.log(P1_at_planeN1N2)
        console.log(P2_at_planeN1N2)
        console.log(P3_at_planeN1N2)
        //projected pooint p2 into N1N2 //

        //requires three points and two for the line
        let n1 = [N1.x, N1.y, N1.z];
        let n2 = [N2.x, N2.y, N2.z];
        console.log('////////////////////////////////////////////////////////////////////////////');

        console.log('Normales empleadas');
        //        console.log(N1)
        //        console.log(N2)
        console.log(n1)
        console.log(n2)



        let n3 = this.getOrthogonalVector(n1, n2);//array  
        let N3 = { x: n3[0], y: n3[1], z: n3[2] }

        console.log('Showing Normal to N1xN2')
        console.log(n3);
        //        console.log(N3);



        ///probablemente esta mal esto porque la proyeccion no pitufa
        //se espera proyectar el punto p0 de plane 2 en el plano p1,p2,p3 en n1xn2


        //este vector 
        let P2pdata = this.projectVectorIntoPlane(
            [Plane2.p0[x], Plane2.p0[y], Plane2.p0[z]],
            [P1_at_planeN1N2[x], P1_at_planeN1N2[y], P1_at_planeN1N2[z]],
            [P2_at_planeN1N2[x], P2_at_planeN1N2[y], P2_at_planeN1N2[z]],
            [P3_at_planeN1N2[x], P3_at_planeN1N2[y], P3_at_planeN1N2[z]]
        );

        let P2p = P2pdata.projectedVector;


        console.log('Projected Point');

        console.log(P2p);
        console.log('Point 1 al n1n2')
        console.log(`drawPoint(${Plane1.p0[x]},${Plane1.p0[y]},${Plane1.p0[z]},0.25,0xff0000);`)
        console.log('Point2')
        console.log(`drawPoint(${Plane2.p0[x]},${Plane2.p0[y]},${Plane2.p0[z]},0.25,0xff0000);`)
        console.log('Point2 projected at  n1n2')
        console.log(`drawPoint(${P2p[x]},${P2p[y]},${P2p[z]},0.25,0xffff00);`)



        //this is vector going from p1 to p2p, local coords
        let vectorP1P2p = [
            P2p[x] - Plane1.p0[x],
            P2p[y] - Plane1.p0[y],
            P2p[z] - Plane1.p0[z]
        ];

        let vectorP2pP1 = [
            Plane1.p0[x] - P2p[x],
            Plane1.p0[y] - P2p[y],
            Plane1.p0[z] - P2p[z]
        ];


        console.log(`drawLine2p([${P2p}],[${Plane1.p0}],0x00ff00);`)


        let vectorP1P2pMAg = mathjs.sqrt(

            (vectorP1P2p[0] * vectorP1P2p[0]) +
            (vectorP1P2p[1] * vectorP1P2p[1]) +
            (vectorP1P2p[2] * vectorP1P2p[2])

        );

        let side_c = vectorP1P2pMAg;//sidec


        //calculamos la distancia del vector entre puntos sobre n1n2

        console.log('Side c')
        console.log(side_c);

        // proyectar normales directamente esta mal porque no considera su direccion.


        //unicamente falta calcular angulos entre normales y vectores para saber si estan oriendatos correctamente las nomales

        //angles must be centered aronud zero
        let angleN1_c = this.computeAngleBetweenVectors(n1, vectorP1P2p);
        let angleN2_c = this.computeAngleBetweenVectors(n2, vectorP2pP1);
        console.log('angleN1_c: ' + angleN1_c);
        //        console.log(angleN1_c);
        console.log('angleN2_c:' + angleN2_c);
        //        console.log(angleN2_c);

        console.log('++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++');
        console.log('Normals... ');

        if (angleN1_c > (mathjs.pi / 2)) {
            console.log('Flipping N1')
            //flip normal direction
            n1 = [-n1[x], -n1[y], -n1[z]]
            angleN1_c = this.computeAngleBetweenVectors(n1, vectorP1P2p);
        } else {
            console.log('N1 angle OK')
        }

        console.log(`drawLine(${P1_at_planeN1N2[x]},${P1_at_planeN1N2[y]},${P1_at_planeN1N2[z]},${n1[0]},${n1[1]},${n1[2]},${2},0x00ff00);`);
        if (angleN2_c > (mathjs.pi / 2)) {
            //flip normal direction
            console.log('Flipping N2')
            n2 = [-n2[x], -n2[y], -n2[z]]
            angleN2_c = this.computeAngleBetweenVectors(n2, vectorP2pP1);

        } else {
            console.log('N2 angle OK')
        }
        console.log(`drawLine(${P2p[0]},${P2p[1]},${P2p[2]},${n2[0]},${n2[1]},${n2[2]},${2},0x00ff00);`);
        //now normals are in the inner angle


        //now projecting p1p2p into P2 and P2pP1 into p1, so angles can be computed between c and projectinos
        let c_proj_p1 = this.projectVectorIntoPlane(
            [P2p[x], P2p[y], P2p[z]],
            [Plane1.p0[x], Plane1.p0[y], Plane1.p0[z]],
            [Plane1.p1[x], Plane1.p1[y], Plane1.p1[z]],
            [Plane1.p2[x], Plane1.p2[y], Plane1.p2[z]],
        ).projectedVector;

        let c_proj_p2 = this.projectVectorIntoPlane(
            [Plane1.p0[x], Plane1.p0[y], Plane1.p0[z]],
            [P2p[x], P2p[y], P2p[z]],
            [Plane2.p1[x], Plane2.p1[y], Plane2.p1[z]],
            [Plane2.p2[x], Plane2.p2[y], Plane2.p2[z]],
        ).projectedVector;



        console.log('Projected Lines');
        console.log(`drawLine2p([${Plane1.p0}],[${c_proj_p1}],0x00ff00);`)
        console.log(`drawLine2p([${P2p}],[${c_proj_p2}],0x00ff00);`)
        //falta normalizar estos vectores
        //<<<<<<<<<<<<<<<<<----- normalizar para multiplicar por la distanca

        ///////////////////////////

        //            computing angles: Ais on p1 and angle B on p2p


        console.log('Checking angles c_proj_p1');
        console.log(`drawPoint(${P1_at_planeN1N2[x]},${P1_at_planeN1N2[y]},${P1_at_planeN1N2[z]},0.25,0xff0000);`)

        console.log(`drawPoint(${c_proj_p1[x]},${c_proj_p1[y]},${c_proj_p1[z]},0.25,0xff0000);`)
        //        console.log(`drawPoint(${vectorP1P2p[x]},${vectorP1P2p[y]},${vectorP1P2p[z]},0.25,0xff0000);`)
        console.log(`drawPoint(${P2p[x]},${P2p[y]},${P2p[z]},0.25,0xff0000);`)



        console.log('Checking angles c_proj_p2');
        console.log(`drawPoint(${P2p[x]},${P2p[y]},${P2p[z]},0.25,0x0000FF);`)

        console.log(`drawPoint(${c_proj_p2[x]},${c_proj_p2[y]},${c_proj_p2[z]},0.25,0x0000ff);`)
        console.log(`drawPoint(${P1_at_planeN1N2[x]},${P1_at_planeN1N2[y]},${P1_at_planeN1N2[z]},0.25,0x0000ff);`)


        //this recenters things around the starting point
        let angleA = this.computeAngleBetweenVectors(
            [c_proj_p1[x] - P1_at_planeN1N2[x], c_proj_p1[y] - P1_at_planeN1N2[y], c_proj_p1[z] - P1_at_planeN1N2[z]],
            [P2p[x] - P1_at_planeN1N2[x], P2p[y] - P1_at_planeN1N2[y], P2p[z] - P1_at_planeN1N2[z]]);

        let angleB = this.computeAngleBetweenVectors(
            [c_proj_p2[x] - P2p[x], c_proj_p2[y] - P2p[y], c_proj_p2[z] - P2p[z]],
            [P1_at_planeN1N2[x] - P2p[x], P1_at_planeN1N2[y] - P2p[y], P1_at_planeN1N2[z] - P2p[z]]
        );




        let angleC = mathjs.pi - angleA - angleB;

        console.log('Angles: A B C')
        console.log(angleA * (180 / Math.PI));
        console.log(angleB * (180 / Math.PI));
        console.log(angleC * (180 / Math.PI));





        let side_a = (side_c * mathjs.sin(angleA)) / mathjs.sin(angleC);
        console.log('Side a')
        console.log(side_a)

        let side_b = (side_c * mathjs.sin(angleB)) / mathjs.sin(angleC);
        console.log('Side b')
        console.log(side_b)



        //ahora hay que calcular los puntos en la interseccion para obtener los limites de ambos

        //se utiliza la proyeccion de c_p1, c_p2 , se hace unitario y se utiliza el valor de side_a y side_b

        /*
                n2_length = mathjs.sqrt(n2[0] * n2[0] + n2[1] * n2[1] + n2[2] * n2[2])
                n2 = [n2[0] / n2_length, n2[1] / n2_length, n2[2] / n2_length];
        
                n1_l = mathjs.sqrt(n1[0] * n1[0] + n1[1] * n1[1] + n1[2] * n1[2])
                n1 = [n1[0] / n1_l, n1[1] / n1_l, n1[2] / n1_l];
        */
        let mag = mathjs.sqrt(
            ((c_proj_p1[x] - P1_at_planeN1N2[x]) * (c_proj_p1[x] - P1_at_planeN1N2[x])) +
            ((c_proj_p1[y] - P1_at_planeN1N2[y]) * (c_proj_p1[y] - P1_at_planeN1N2[y])) +
            ((c_proj_p1[z] - P1_at_planeN1N2[z]) * (c_proj_p1[z] - P1_at_planeN1N2[z]))
        );

        let dir = [(c_proj_p1[x] - P1_at_planeN1N2[x]) / mag, (c_proj_p1[y] - P1_at_planeN1N2[y]) / mag, (c_proj_p1[z] - P1_at_planeN1N2[z]) / mag]

        let pointAtInt = [
            Plane1.p0[x] + (dir[0] * side_b),
            Plane1.p0[y] + (dir[1] * side_b),
            Plane1.p0[z] + (dir[2] * side_b),
        ]

        let intersection = {
            P1: P1_at_planeN1N2,
            P2: P2p,
            IntersectionPoint: pointAtInt,
            Direction: n3
        }



        return intersection;

    }
}


let test = false;
if (test) {

    let vector = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    console.log(vector)
    math3d.computeBBOX(vector)

    console.log(math3d.createI3());

    console.log(math3d.sumMatrices3(math3d.createI3(), math3d.createI3()));

    let matriz = [[2, 4, 6], [2, 4, 6], [2, 4, 6]];
    console.log(matriz)
    console.log(math3d.sumMatrices3(matriz, math3d.createI3()));



    let matrix2 = [[2, 0, 0], [0, 2, 0], [0, 0, 1]];
    console.log(matriz)
    console.log(math3d.prodMatrices3(matriz, math3d.createI3()));

    //testing rodriguez formula
    /** 
    console.log('Testing Rodriguez Formula,  (1,0,0) around (0,1,0) should point to (0,0,-1)  ')
    let vector_o =[1.0,0,0];
    let rotationVector=[0,1.0,0]
    let angle=1.5707963267948966192313216916398;
    let res=math3d.rotateAroundVectorRodriguez(vector_o,rotationVector,angle)
    console.log(res)
     
     
    console.log('Testing Rodriguez Formula, (0,0,1) around (1,0,0) should point to (0,-1,0) ')
     vector_o =[0,0,1];
     rotationVector=[1,0,0]
     angle=1.5707963267948966192313216916398;;
     res=math3d.rotateAroundVectorRodriguez(vector_o,rotationVector,angle)
    console.log(res)
    */

    /*
    console.log('Testing Rodriguez Formula, (0,1,0) around (1,0,0) at -1.5707963267948966192313216916398 should point to (0,0,1) ')
    vector_o = [0, 1, 0];
    rotationVector = [1, 0, 0]
    angle = 1.5707963267948966192313216916398;
    res = math3d.rotateAroundVectorRodriguez(vector_o, rotationVector, angle)
    */
    //console.log(res)



    ////////testing the projection of 3d vector into plane xy
    //

    console.log('----PROJECT VECTOR INTO PLANE-------------------------------')
    let proj = 0;
    //proj = math3d.projectVectorIntoPlane([0, 1, 1], [0, 0, 0], [1, 0, 1], [0, 1, 1]);
    console.log(proj)

    console.log('-----------------------------------')
    console.log('----PROJECT VECTOR INTO horozontal PLANE at z=1-------------------------------')
    //proj = math3d.projectVectorIntoPlane([2, 2, 2], [1, 1, 1], [2, -1, 1], [-1, 2, 1]);
    //console.log(proj)
    console.log('-----------------------------------')

    console.log('----PROJECT VECTOR INTO HORIZONTAL PLANE-------------------------------')
    //is the 
    //proj = math3d.projectVectorIntoPlane([2, 2, 2], [0, 0, 0], [1, 0, 0], [0, 1, 0]);
    //console.log(proj)
    console.log('-----------------------------------')

    console.log('----PROJECT VECTOR INTO normal REAL-------------------------------')
    //is the 
    proj = math3d.projectVectorIntoPlane(
        [476734.75, 2133139.7, 2507.15],
        [476740.45, 2133139.87, 2506.09],
        [476740.44437474426, 2133139.873370689, 2505.0900215027546],
        [476740.7780005665, 2133139.8936660322, 2507.034381039258]);
    console.log(proj)
    console.log('-----------------------------------')




    console.log('Testing MAtrix Product')
    let matA = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    console.log(matA)
    console.log(math3d.prodMatrix(matA, matA));
    console.log('-----------------------------------------------')
    matB = [[2, 0, 0], [0, 3, 0], [0, 0, 4]];
    matC = [[5, 0, 0], [0, 6, 0], [0, 0, 7]];
    console.log(matB)
    console.log(matC)
    console.log(math3d.prodMatrix(matB, matC));
    console.log('-----------------------------------------------')
    matB = [[1, 1, 1], [1, 1, 1], [1, 1, 1]];
    matC = [[1, 1, 1], [1, 1, 1], [1, 1, 1]];
    console.log(matB)
    console.log(matC)
    console.log(math3d.prodMatrix(matB, matC));

    console.log('-----------------------------------------------')
    matB = [[2, 1, 1], [1, 2, 1], [1, 1, 2]];
    matC = [[3, 1, 1], [1, 3, 1], [1, 1, 3]];
    console.log(matB)
    console.log(matC)
    console.log(math3d.prodMatrix(matB, matC));


    console.log('-----------------------------------------------')
    matB = [[2, 1, 1]];
    matC = [[3, 1, 1], [1, 3, 1], [1, 1, 3]];
    console.log(matB)
    console.log(matC)
    console.log(math3d.prodMatrix(matB, matC));

    console.log('-----------------------------------------------')

    matC = [[3, 1, 1], [1, 3, 1], [1, 1, 3]];
    matB = [[2, 1, 1]];

    console.log(matC)
    console.log(matB)
    console.log(math3d.prodMatrix(matC, matB));

    console.log('-----------------------------------------------')

    matC = [[3, 1, 1], [1, 3, 1], [1, 1, 3]];
    matB = [[2], [1], [1]];

    console.log(matC)
    console.log(matB)
    console.log(math3d.prodMatrix(matC, matB));


    console.log('-----------------------------------------------')
    console.log('TRANSPOSE')

    matC = [[1, 2, 3], [4, 5, 6], [7, 8, 9]];
    console.log(matC)
    console.log(math3d.transpose(matC));

    console.log('-----------------------------------------------')
    console.log('TRANSPOSE')

    matC = [[1, 2, 3], [4, 5, 6]];
    console.log(matC)
    console.log(math3d.transpose(matC));

    console.log('-----------------------------------------------')
    console.log('TEsting MATHJS invert')
    matC = [[2, 0, 0], [0, 5, 0], [0, 0, 10]];
    console.log(matC)
    console.log(' invert')

    let matCinv = mathjs.inv(matC);
    console.log(matCinv);
    console.log('TEsting my matrix multiplication')

    console.log(math3d.prodMatrix(matCinv, matC));
    console.log('TEsting mathjs multiplication')
    console.log(mathjs.multiply(matCinv, matC));


    console.log('-------COMPUTE PLANE 2 DISTANCE by projection----------------------------')
    //   proj = math3d.computePoint2PlaneDistance([0, 1, 1], [0, 0, 0], [1, 0, 1], [0, 1, 1]);
    proj = math3d.computePoint2PlaneDistance([0, 1, 1], [0, 0, 1], [1, 0, 1], [0, 1, 2]);

    console.log(proj)
    console.log('-----------------------------------')


    console.log('-------POint PLANE INTERSECTION----------------------------')

    let p1 = { x: 3, y: 0, z: 0 };
    let p2 = { x: 0, y: 0, z: 0 };
    let p3 = { x: 0, y: 4, z: 0 };

    let l1 = { x: 2, y: 2, z: 2 };
    let l2 = { x: 2, y: 2, z: 1 };

    let point = math3d.computeLinePlaneIntersection(p1, p2, p3, l1, l2);

    console.log("Intersection Point: >> " + point.x + " , " + point.y + " , " + point.z);

    console.log('------- Angle between Vector----------------------------')

    console.log('the angle is the same irrespective of the order')

    let v1 = [1, 0, 1];
    let v2 = [1, 0, -1];

    console.log('angle at 90')

    let res = math3d.computeAngleBetweenVectors(v1, v2);
    console.log('Angle v1 v2:')
    console.log(res)


    res = math3d.computeAngleBetweenVectors(v2, v1);
    console.log('Angle v2 v1:')
    console.log(res)

    v1 = [1, 0, 1];
    v2 = [1, 0, -1];

    console.log('angle less than 90 degrees: 45')
    v1 = [1, 0, 0.5];
    v2 = [1, 0, 0];

    res = math3d.computeAngleBetweenVectors(v1, v2);
    console.log('Angle v1 v2:')
    console.log(res)


    res = math3d.computeAngleBetweenVectors(v2, v1);
    console.log('Angle v2 v1:')
    console.log(res)


    console.log('angle more than 90 degrees')
    v1 = [1, 0, 2];
    v2 = [1, 0, -2];

    res = math3d.computeAngleBetweenVectors(v1, v2);
    console.log('Angle v1 v2:')
    console.log(res)


    res = math3d.computeAngleBetweenVectors(v2, v1);
    console.log('Angle v2 v1:')
    console.log(res)



    console.log('------- 2 PLANES INTERSECTION----------------------------')

    //simple example with planes 

    console.log('Tomando planos a una normal en punto p1 o p2');
    p1 = [4, 0, 4];
    p2 = [-3, 2, 3];

    console.log('POint1')
    console.log(p1)
    console.log('POint2')
    console.log(p2)

    let o1 = math3d.getOrthogonalVector(p1, [p1[0] + mathjs.random(), p1[1] + mathjs.random(), p1[2] + mathjs.random()])
    let o2 = math3d.getOrthogonalVector(p1, o1);

    let plane1 = {
        p0: p1,
        p1: o1,
        p2: o2
    }

    let o3 = math3d.getOrthogonalVector(p2, [p2[0] + mathjs.random(), p2[1] + mathjs.random(), p2[2] + mathjs.random()])
    let o4 = math3d.getOrthogonalVector(p2, o3);


    let plane2 = {
        p0: p2,
        p1: o3,
        p2: o4
    }





    let N1 = { x: -1, y: 0, z: 1 };
    let N2 = { x: 1, y: 0, z: 1 };
    console.log('N1')
    console.log(N1)
    console.log('N2')
    console.log(N2)

    intersection = math3d.computePlanesIntersection(plane1, plane2, N1, N2)

    console.log("Intersection Point @ line: >> " + intersection.IntersectionPoint.x + " , " + intersection.IntersectionPoint.y + " , " + intersection.IntersectionPoint.z);
    console.log("-------------------------------------------------------------------------------------------------------------------");
    /*
        p1 = { x: 2, y: 0, z: 1 };
        p2 = { x: 1, y: 2, z: 2 };
    
    
        N1 = { x: 0, y: 0, z: 1 };
        N2 = { x: 1, y: 0, z: 0 };
    
        intersection = math3d.computePlanesIntersection(p1, p2, N1, N2)
    
        console.log("Intersection  line @ point: >> " + intersection.IntersectionPoint.x + " , " + intersection.IntersectionPoint.y + " , " + intersection.IntersectionPoint.z);
    */
    console.log("-------------------------------------------------------------------------------------------------------------------");

}