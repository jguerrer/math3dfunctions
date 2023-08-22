

const initOptions = {/* initialization options */ };
const pgp = require('pg-promise')(initOptions);
//const consultas = require('./spatialFunctions');
//const { exec } = require('child_process');
var mathf3d = require('./MathFunctions3D');//ya se esta importando
const math = require('mathjs')

//const planefit=require('best-fitting-plane')




var fs = require('fs');
const { Console, table } = require('console');


///////////para acelerar algunos procesos tardados como la interseccion, que depende de hacer cosas con arreglos
const { performance } = require('perf_hooks');


const connection = {
    host: 'localhost',
    port: 5432,
    database: 'points311',
    user: 'postgres',
    password: 'postgresdb'
};
const intranetConnection = {
    host: '192.168.0.114',
    port: 5433,
    database: 'points',
    user: 'postgres',
    password: 'postgresdb'
};
const remoteConnection = {
    host: 'mapster.com.mx',
    port: 2345,
    database: 'points',
    user: 'postgres',
    password: 'postgresdb'
};

let dbconnection = connection;
const db = pgp(dbconnection);


let spatialFunctions = {
    register: [],


    /**
     * Given a table, column and coordinates, discover the closes segment.
     * Returns an array of found segments. Typically use the first one.
     * @param {*} table 
     * @param {*} segmentColumn 
     * @param {*} xColumn 
     * @param {*} yColumn 
     * @param {*} zColumn 
     * @param {*} x 
     * @param {*} y 
     * @param {*} z 
     * @param {*} decimals 
     * @param {*} radius 
     * @returns 
     */
    querySegmentByCoordinates: async function (table, segmentColumn, xColumn, yColumn, zColumn, x, y, z, decimals, radius) {


        console.log(x + ' ' + y + ' ' + z + ' ' + decimals)
        if (decimals) {
            x = Number(x).toFixed(decimals);
            y = Number(y).toFixed(decimals);
            z = Number(z).toFixed(decimals);

        }


        let getDataQuery = `SELECT * FROM ${table} WHERE 
        ${xColumn} = ${x} AND 
        ${yColumn} = ${y} AND 
        ${zColumn} = ${z} 
          ;`;
        //may get one or more, but mostly is one point
        console.log(getDataQuery);


        let results = await db.any(getDataQuery, {});//esperamos los resultados de la consulta con await

        console.log('Query DOne  ' + results.length + ' results')

        let foundSegments = { 'queryPoint': [xColumn, yColumn, zColumn], segments: [] };

        for (let i = 0; i < results.length; i++) {

            foundSegments.segments.push(results[i][segmentColumn]);//solo guardamos la informacion del segmento
        }


        console.log(`Found ${foundSegments.segments.length} segments @ ${x} , ${y}, ${z}`);

        return foundSegments;

    },

    //se termino implementando en pdal, pero esta devuelve la informacion de la tabla
    //pendiente por terminar



    /**
     * Check for a given segment, pointwise, the distance between all points and a random plane within the segment.
     * 
     * 
     * TODO : OVERRIDEN by RANSAN IMPLEMENTATION. jUST ADD AN EVALUATION.
     * 
     */
    checkSegmentPlanarity: async function (table, column_id, segment_id, radius, tolerance) {

        let querySegmentNeighborhod =
            `with origin as (
            select * from ${table} where ${column_id} = ${segment_id}  )

            select origin.id oid, others.id  otid, 
            
            origin.x ox, origin.y oy ,origin.z oz,
            others.x otx, others.y oty , others.z otz, 
            origin.${column_id} , others.${column_id},

            st_distance(origin.geom,others.geom) 
        from ${table} others, origin  
        where ST_3DDWithin ( origin.geom , others.geom , ${radius}) 
        and others.${column_id} = ${segment_id}  
        and  others.id != origin.id  order by origin.id , st_distance
        `;
        console.log(querySegmentNeighborhod);


        let results = await db.any(querySegmentNeighborhod, {});//esperamos los resultados de la consulta con await

        console.log('Query DOne  ' + results.length + ' results')
        //van a ocurrid varias cosas, primero 

        //para cada origen, guardar los vecinos, }
        //luego calcular si son planos cada cacho

        let neighboroods = [];

        for (let i = 0; i < results.length; i++) {

            let result = results[i];
            if (neighboroods[result.oid] == null) {
                //console.log(result.oid)
                neighboroods[result.oid] = [];
                neighboroods[result.oid].push(result.ox);
                neighboroods[result.oid].push(result.oy);
                neighboroods[result.oid].push(result.oz);
            }
            neighboroods[result.oid].push(result.otx);
            neighboroods[result.oid].push(result.oty);
            neighboroods[result.oid].push(result.otz);
            // console.log('.')


        }


        console.log('Done extracting neighborhoods ' + neighboroods.length);

        //ahora revisando las chunches.

        //aproximadamente para 25 cm da 11 vecinos  

        //ahora si, revisamos si tiene al menos cuatro puntos, si si, entonces tomamos el origen 
        //que es el primero y lso dos ultimos


        let keys = Object.keys(neighboroods);
        let resultsPerPoint = [];
        let outside = [];
        let inside = [];


        let processedPoints = [];//aqui se lleva registro de donde si se ha agregado el punto, pero el problema
        //es que un punto puede aparecer en dos o mas segmentos y aparecer como valido o como no

        //toma puntos aleatorios , p0,p1,p2. dentro del segmeto para definir el plano y checar la distancia de cada punto a dicho plano

        for (let i = 0; i < keys.length; i++) {

            let len = neighboroods[keys[i]].length;
            let numitems = len / 3;

            let p0 = neighboroods[keys[i]].slice(0, 3);
            // console.log(p0)

            let p1 = neighboroods[keys[i]].slice(len - 6, len - 3);
            // console.log(p1)

            let p2 = neighboroods[keys[i]].slice(len - 3, len);
            // console.log(p2)

            let planeResults = []
            for (let j = 1; j < numitems - 2; j++) {

                let point = neighboroods[keys[i]].slice(j * 3, j * 3 + 3);
                let res = mathf3d.projectVectorIntoPlane(point, p0, p1, p2);
                //console.log(res);
                planeResults.push(res);


                //esto esta mal porque depende del punto, uno puede estar dentro o fuera de un plano

                if (res.normalDistance > tolerance) {
                    //                    console.log(res.normalDistance)
                    outside[point[0] + ',' + point[1] + ',' + point[2]] = true;

                } else {
                    inside[point[0] + ',' + point[1] + ',' + point[2]] = true;
                }


            }



            //en este punto, tenemos 
            resultsPerPoint[keys[i]] = planeResults;//guardamos un arreglo de jsons

        }




        let fuera = Object.keys(outside);
        let dentro = Object.keys(inside);
        let writeout = fs.createWriteStream(segment_id + '_above_' + tolerance + '_' + radius + '.txt');
        let writein = fs.createWriteStream(segment_id + '_within_' + tolerance + '_' + radius + '.txt');


        for (let i = 0; i < fuera.length; i++) {
            //                console.log(fuera[i]);
            writeout.write(fuera[i] + '\n');
        }

        for (let i = 0; i < dentro.length; i++) {
            //            console.log(dentro[i]);
            writein.write(dentro[i] + '\n');
        }

        //console.log(resultsPerPoint);
        //todo add a check for planarity

    },

    /**
     * 
     * Finds a plane using ransac. 
     * 
     * Points come in array [{x,y,z}]
     * Point does not have to be centered around zero, as the 
     * 
     * Given the nature of the surfaces, ransac results  are measured by distance, but only a plane returned:
     * 
     * [0.5Distance, TargetDistance,  1.5maxDistance,.. 0.5Increments   ... 0,3maxDistance]
     * 
     * 
     * 
     * 
     * returns  rplane={bestPlane:[p0,p1,p2], histogram:[], index: int; totalPoints: total,}
     * 
     * 
     * p0,p1,p2 the vectors supporting the plane
     * Histogram the counting of point within certain distance.
     * 
     * index, the index point used for reference as p0, si it is returned.
     * 
     * @param {*} points 
     * @param {*} maxDistance 
     * @param {*} maxIterations 
     */
    findRansacPlane: async function (points, maxDistance, maxIterations, getHistogram) {

        //        if(!getHistogram)    getHistogram=false;
        //
        
        //console.log('finding RANSAC plane')
        
        //       let bestP0index = 0;
        //preparar la iteracion y la evaluacion
        //todo esta centrado en cero

        if(points.length == 3){
            let bestPlane = { p0: points[0], p1: points[1], p2: points[2] };
            bestPlane.index = 0;//which is p0

            bestPlane.histogram = histogram;
            bestPlane.totalpoints = 3;
            bestPlane.origin = points[0];//redundante, porque eta en p0
            return bestPlane;

        }


        let increment = 0.5
        let intervals = [];
        let buckets = 20;
        let histogram = []
        //mi incremento indica que laposicion 1 es la indicada como objetivo
        for (let i = 0; i < buckets; i++) {
            intervals[i] = maxDistance * increment;
            //console.log(`Bucket @: ${intervals[i]}`)
            increment = increment + 0.5;
            histogram.push(0);
            //=[maxDistance/2, maxDistance,maxDistance*1.5,maxDistance*2,maxDistance*3,maxDistance*4,maxDistance*5]
        }

        ;//solo para el elemento ganador porque es muy caro

        let bestInliers = 0;

        let curriteration = 0;
        let totalPoints = points.length;

        //requires a plane defined by 3 points

        let currentPlane = { p0: [0, 0, 0], p1: [0, 0, 0], p2: [0, 0, 0] };
        let bestPlane = { p0: [0, 0, 0], p1: [0, 0, 0], p2: [0, 0, 0] };
        let totalInliers = 0;//3 by default

        let counter = 0;
//        while ((curriteration < maxIterations) || (totalInliers > (totalPoints * 0.95))) {
        while ((curriteration < maxIterations) || (totalInliers < (totalPoints * 0.95))) {


            if (counter % 1000 == 0) {
             //   console.log(counter)
            }
            counter++;
            //taking random points
            let p0 = parseInt(Math.random() * totalPoints);//index
            let p1 = parseInt(Math.random() * totalPoints);
            let p2 = parseInt(Math.random() * totalPoints);

            currentPlane.p0 = points[p0];
            currentPlane.p1 = points[p1];
            currentPlane.p2 = points[p2];

            //find the inliers
            totalInliers = 0;//3 by default

            //evaluate all points
            for (let i = 0; i < totalPoints; i++) {

                //compute the normal distance to that plane, i.e. 
                //project a point into a plane and compute that distance
                if (i == p0) continue;
                if (i == p1) continue;
                if (i == p2) continue;
                //compute the distance to the given plane and a point

                let res = mathf3d.computePoint2PlaneDistance(
                    points[i],
                    points[p0], points[p1], points[p2]
                )

                //si esta dentro de la distancia, se cuenta como inlier
                if (res.normalDistance < maxDistance) {
                    totalInliers++;//
                } else {
                    /*
                    console.log('DIST:' + res.normalDistance)
                    console.log('POINT:')

                    console.log(points[i] )
                    console.log('PLANE POINTS:')
                    console.log(points[p0] )
                    console.log(points[p1] )
                    console.log(points[p2] )
                    console.log('----------------------------------')
*/

                    //queda fuera++
                }
            }
            //console.log(totalInliers);

            // si tengo mas puntos dentro que en el mejor de los casos
            //estos tres puntos son los mejores indices del plano
            if (totalInliers > bestInliers) {
                bestInliers = totalInliers;//increases
                //entonces este plano es candidato
                bestPlane.p0 = currentPlane.p0;//candidatos
                bestPlane.p1 = currentPlane.p1;
                bestPlane.p2 = currentPlane.p2;
                bestP0index = p0;//guardamos el indice al mejor p0

                //console.log(`Iteration: ${curriteration}  Inliers: ${totalInliers}   PerCENT: ${(totalInliers / totalPoints) * 100.0} %  ... NEW BEST`)
            } else {
                //no se hace nada
            }


            curriteration++;
            //console.log(curriteration)
        }

        /////////////////////////////creamos el histograma para el mejor caso, pero se podria omitir
        //let getHistogram = false;//caro porque se vuelve a ejecutar para un plano, aunque es la ultima ve que se calcula
        if (getHistogram) {
            for (let i = 0; i < totalPoints; i++) {

                //compute the normal distance to that plane, i.e. 
                //project a point into a plane and compute that distance

                let res = mathf3d.computePoint2PlaneDistance(
                    points[i],
                    bestPlane.p0, bestPlane.p1, bestPlane.p2
                )

                //computing histogram
                for (let i = 0; i < intervals.length; i++) {
                    if (res.normalDistance < intervals[i]) {
                        histogram[i]++;
                        i = intervals.length;
                    }
                }
                //if(res.normalDistance > intervals[intervals.length]){


            }
        }

        //compute again the distance, but just for the winner

        //normalizing bet plane vectors
        /*
        let p0length = Math.sqrt((bestPlane.p0[0] * bestPlane.p0[0]) + (bestPlane.p0[1] * bestPlane.p0[1]) + (bestPlane.p0[2] * bestPlane.p0[2]));
        let p1length = Math.sqrt((bestPlane.p1[0] * bestPlane.p1[0]) + (bestPlane.p1[1] * bestPlane.p1[1]) + (bestPlane.p1[2] * bestPlane.p1[2]));
        let p2length = Math.sqrt((bestPlane.p2[0] * bestPlane.p2[0]) + (bestPlane.p2[1] * bestPlane.p2[1]) + (bestPlane.p2[2] * bestPlane.p2[2]));
*/
        let p0length = 1;
        let p1length = 1;
        let p2length = 1;

        //aparentemente lo normalizo
        /*
        bestPlane.p0 = [bestPlane.p0[0] / p0length, bestPlane.p0[1] / p0length, bestPlane.p0[2] / p0length];
        bestPlane.p1 = [bestPlane.p1[0] / p1length, bestPlane.p1[1] / p1length, bestPlane.p1[2] / p1length];
        bestPlane.p2 = [bestPlane.p2[0] / p2length, bestPlane.p2[1] / p2length, bestPlane.p2[2] / p2length];
*/
        bestPlane.p0 = [bestPlane.p0[0] / p0length, bestPlane.p0[1] / p0length, bestPlane.p0[2] / p0length];
        bestPlane.p1 = [bestPlane.p1[0] / p1length, bestPlane.p1[1] / p1length, bestPlane.p1[2] / p1length];
        bestPlane.p2 = [bestPlane.p2[0] / p2length, bestPlane.p2[1] / p2length, bestPlane.p2[2] / p2length];

        bestPlane.index = bestP0index;//which is p0

        bestPlane.histogram = histogram;
        bestPlane.totalpoints = totalPoints;
        bestPlane.origin = points[bestP0index];//redundante, porque eta en p0

        return bestPlane;


    },

    findRansacPlaneAsync: async function (points, maxDistance, maxIterations, getHistogram) {

        //        if(!getHistogram)    getHistogram=false;
        console.log('finding RANSAC plane')
        //       let bestP0index = 0;
        //preparar la iteracion y la evaluacion
        //todo esta centrado en cero
        let increment = 0.5
        let intervals = [];
        let buckets = 20;
        let histogram = []
        //mi incremento indica que laposicion 1 es la indicada como objetivo
        for (let i = 0; i < buckets; i++) {
            intervals[i] = maxDistance * increment;
            increment = increment + 0.5;
            histogram.push(0);
            //=[maxDistance/2, maxDistance,maxDistance*1.5,maxDistance*2,maxDistance*3,maxDistance*4,maxDistance*5]
        }

        ;//solo para el elemento ganador porque es muy caro

        let bestInliers = 0;

        let curriteration = 0;
        let totalPoints = points.length;

        //requires a plane defined by 3 points

        let currentPlane = { p0: [0, 0, 0], p1: [0, 0, 0], p2: [0, 0, 0] };
        let bestPlane = { p0: [0, 0, 0], p1: [0, 0, 0], p2: [0, 0, 0] };
        let totalInliers = 0;//3 by default

        let counter = 0;
        while ((curriteration < maxIterations) || (totalInliers > (totalPoints * 0.95))) {

            if (counter % 1000 == 0) console.log(counter)
            counter++;
            //taking random points
            let p0 = parseInt(Math.random() * totalPoints);//index
            let p1 = parseInt(Math.random() * totalPoints);
            let p2 = parseInt(Math.random() * totalPoints);

            currentPlane.p0 = points[p0]
            currentPlane.p1 = points[p1];
            currentPlane.p2 = points[p2];



            //find the inliers
            totalInliers = 0;//3 by default

            //evaluate all points sequential
            let seq = true;
            if (seq) {
                for (let i = 0; i < totalPoints; i++) {

                    //compute the normal distance to that plane, i.e. 
                    //project a point into a plane and compute that distance
                    if (i == p0) continue;
                    if (i == p1) continue;
                    if (i == p2) continue;
                    //compute the distance to the given plane and a point


                    //here we accelerte the computations



                    let res = mathf3d.computePoint2PlaneDistance(
                        points[i],
                        points[p0], points[p1], points[p2]
                    )

                    //si esta dentro de la distancia, se cuenta como inlier
                    if (res.normalDistance < maxDistance) {
                        totalInliers++;//
                    } else {
                        //console.log('DIST:' + res.normalDistance)
                        //queda fuera++
                    }
                }

            } else {

            }


            //console.log(totalInliers);

            // si tengo mas puntos dentro que en el mejor de los casos
            //estos tres puntos son los mejores indices del plano
            if (totalInliers > bestInliers) {
                bestInliers = totalInliers;//increases
                //entonces este plano es candidato
                bestPlane.p0 = currentPlane.p0;//candidatos
                bestPlane.p1 = currentPlane.p1;
                bestPlane.p2 = currentPlane.p2;
                bestP0index = p0;//guardamos el indice al mejor p0

                console.log(`Iteration: ${curriteration}  Inliers: ${(totalInliers / totalPoints) * 100.0}%  ... NEW BEST`)
            } else {
                //no se hace nada
            }


            curriteration++;
            //console.log(curriteration)
        }

        /////////////////////////////creamos el histograma para el mejor caso, pero se podria omitir
        //let getHistogram = false;//caro porque se vuelve a ejecutar para un plano, aunque es la ultima ve que se calcula
        if (getHistogram) {
            for (let i = 0; i < totalPoints; i++) {

                //compute the normal distance to that plane, i.e. 
                //project a point into a plane and compute that distance

                let res = mathf3d.computePoint2PlaneDistance(
                    points[i],
                    bestPlane.p0, bestPlane.p1, bestPlane.p2
                )

                //computing histogram
                for (let i = 0; i < intervals.length; i++) {
                    if (res.normalDistance < intervals[i]) {
                        histogram[i]++;
                        i = intervals.length;
                    }
                }
                //if(res.normalDistance > intervals[intervals.length]){


            }
        }

        //compute again the distance, but just for the winner

        //normalizing bet plane vectors
        /*
        let p0length = Math.sqrt((bestPlane.p0[0] * bestPlane.p0[0]) + (bestPlane.p0[1] * bestPlane.p0[1]) + (bestPlane.p0[2] * bestPlane.p0[2]));
        let p1length = Math.sqrt((bestPlane.p1[0] * bestPlane.p1[0]) + (bestPlane.p1[1] * bestPlane.p1[1]) + (bestPlane.p1[2] * bestPlane.p1[2]));
        let p2length = Math.sqrt((bestPlane.p2[0] * bestPlane.p2[0]) + (bestPlane.p2[1] * bestPlane.p2[1]) + (bestPlane.p2[2] * bestPlane.p2[2]));
*/
        let p0length = 1;
        let p1length = 1;
        let p2length = 1;

        //aparentemente lo normalizo
        /*
        bestPlane.p0 = [bestPlane.p0[0] / p0length, bestPlane.p0[1] / p0length, bestPlane.p0[2] / p0length];
        bestPlane.p1 = [bestPlane.p1[0] / p1length, bestPlane.p1[1] / p1length, bestPlane.p1[2] / p1length];
        bestPlane.p2 = [bestPlane.p2[0] / p2length, bestPlane.p2[1] / p2length, bestPlane.p2[2] / p2length];
*/
        bestPlane.p0 = [bestPlane.p0[0] / p0length, bestPlane.p0[1] / p0length, bestPlane.p0[2] / p0length];
        bestPlane.p1 = [bestPlane.p1[0] / p1length, bestPlane.p1[1] / p1length, bestPlane.p1[2] / p1length];
        bestPlane.p2 = [bestPlane.p2[0] / p2length, bestPlane.p2[1] / p2length, bestPlane.p2[2] / p2length];

        bestPlane.index = bestP0index;//which is p0

        bestPlane.histogram = histogram;
        bestPlane.totalpoints = totalPoints;
        bestPlane.origin = points[bestP0index];//redundante, porque eta en p0

        return bestPlane;


    },


    /**
     * 
     *  For a given table, SegmentID and Cell Size, returns the voxel count of the corresponding voxel representation.
     *  Cell Size is floor inclusive and ceil exclusive.
     *  In terms of db queries, requires two calls, One to estimate the bounding box and the second to actually retrieve the points and perform the counting.
     * 
     *  This version performs over a table based on 3D point geometries  (POSTGIS). 
     * 
     * @param {*} table 
     * @param {*} segmentID 
     * @param {*} cellsize 
     */
    computeSegmentVoxelSpace_geom: async function (table, segmentID, column, cellsize) {
        //    this.register.push('computeSegmentVoxelSpace_geom');
        // things should be returned as bin, laz or las
        //las is the easiest


        //console.log(" computeSegmentVoxelSpace(): ");

        let query = `SELECT min(x) minx,min(y) miny,min(z) minz,max(x) maxx,max(y) maxy,max(z) maxz ,count(${column}) count FROM ${table} WHERE ${column} = ${segmentID} `;
        //console.log(query);
        let minx, miny, maxx, maxy, minz, maxz, total;

        try {
            let resultados = await db.any(query, {});//esperamos los resultados de la consulta con await
            let numPoints = resultados[0].count;

            //console.log("Total Points: " + numPoints);


            //solo si coincide el registro, se devuelven resultados
            for (let i = 0; i < resultados.length; i++) {
                let resultado_i = resultados[i];
                /*
                            console.log(resultados[0].minx);
                            console.log(resultados[0].miny);
                            console.log(resultados[0].minz);
                            console.log(resultados[0].maxx);
                            console.log(resultados[0].maxy);
                            console.log(resultados[0].maxz);
                */
                minx = resultados[0].minx;
                miny = resultados[0].miny;
                minz = resultados[0].minz;

                maxx = resultados[0].maxx;
                maxy = resultados[0].maxy;
                maxz = resultados[0].maxz;

            }
            //);


            let query2 = `SELECT x,y,z FROM ${table} WHERE ${column} = ${segmentID} `;
            //console.log(query2);
            let resultados2 = await db.any(query2, {});//esperamos los resultados de la consulta con await
            let total = 0;

            //        hacemos un  hash
            minx = Math.floor(minx);
            miny = Math.floor(miny);
            minz = Math.floor(minz);

            maxx = Math.floor(maxx);
            maxy = Math.floor(maxy);
            maxz = Math.floor(maxz);

            //no es muy relevante
            sizex = maxx - minx;
            sizey = maxy - miny;
            sizez = maxz - minz;


            let idx;
            let idy;
            let idz;
            let voxels = [];


            for (let i = 0; i < resultados2.length; i++) {
                //        resultados2.forEach(function (resultado_i) {
                //console.log(resultado_i)
                let resultado_i = resultados2[i];
                idx = Math.floor((resultado_i.x - minx) / cellsize);
                idy = Math.floor((resultado_i.y - miny) / cellsize);
                idz = Math.floor((resultado_i.z - minz) / cellsize);

                let key = `${idx}_${idy}_${idz}`;
                //console.log(key);
                //console.log(voxels[key] == null)
                if (voxels[key] == null) {
                    voxels[key] = 1;
                } else {
                    voxels[key] += 1;
                }
                //console.log("NEW " + voxels[key]);

            }
            //);
            let numVoxels = Object.keys(voxels).length
            //console.log("VOXELS: " + numVoxels);
            //console.log("Densidad: " + Object.keys(voxels).length / numPoints)
            return numVoxels;

        } catch (exception) {
            console.log(exception)
        }

    },

    drawVector: async function (v, id) {

        let length = 20.0;
        let l = 0;
        while (l < length) {
            console.log(v[0] * l + ',' + v[1] * l + ',' + v[2] * l + ',' + id);
            l = l + 0.1;
        }
    },




    /**
     * Takes a set of points described by a table, segment ID and a column as identifier, and rotates the set of points so it lays down horizontal.
     * Further calculations are easier as the z axis is easier to perform calculations.
     * 
     * 1 reads the points 
     * 2 gets the normal vector of the segment
     * 3 computes an orthogonal vector to the plane, i.e. a vector inside the assuming plane.Also taken from the companion table
     * 4 Translates the points to the origin taking an initial point, the first.
     * 5 Computes the orthogonal vector parallel to the x,y, axes and use it as the rotation vector.
     * 6 Computes the rotation angle between the normal and the projection to the x,y plane. Vertical planes do not apply directly.
     * 7 rotates the set of points and move them back to the origin of the orinigal poin cloud, for comparasion purposes.
     * 
     * WARNING: EXPERIMENTAL AND HARDCODED
     * 
     * @param {*} table 
     * @param {*} column 
     *  * @param {*} segmentID 
    
     * @returns 
     */
    flip2Horizontal: async function (table, column, segmentID) {
        // things should be returned as bin, laz or las
        //las is the easiest


        //console.log(" computeSegmentVoxelSpace(): ");

        let pointsxyz = [];
        let rotatedPointxXYZ = [];
        let pointsnxyz = [];

        let getPointsQuery = `SELECT x, y, z, nx , ny, nz  
    FROM ${table} WHERE ${column} = ${segmentID} `;
        //console.log(getPointsQuery);
        //let minx, miny, maxx, maxy, minz, maxz, total;


        //1-)  get all points
        try {
            let resultados = await db.any(getPointsQuery, {});//esperamos los resultados de la consulta con await
            //let numPoints = resultados[0].count;
            let anchorX = 0.0;
            let anchorY = 0.0;
            let anchorZ = 0.0;

            //console.log('Getting points ' + resultados.length);

            //tomamos el primer punto
            let i = 0;
            if (resultados.length > 1) {

                let resultado_i = resultados[i];

                anchorX = resultado_i.x;
                anchorY = resultado_i.y;
                anchorZ = resultado_i.z;

                pointsxyz.push(resultado_i.x)
                pointsxyz.push(resultado_i.y)
                pointsxyz.push(resultado_i.z)


                pointsnxyz.push(resultado_i.nx)
                pointsnxyz.push(resultado_i.ny)
                pointsnxyz.push(resultado_i.nz)


                for (i = 1; i < resultados.length; i++) {
                    /*
                                console.log(resultados[0].x);
                                console.log(resultados[0].y);
                                console.log(resultados[0].z);
                    */
                    resultado_i = resultados[i];

                    pointsxyz.push(resultado_i.x)
                    pointsxyz.push(resultado_i.y)
                    pointsxyz.push(resultado_i.z)


                    pointsnxyz.push(resultado_i.nx)
                    pointsnxyz.push(resultado_i.ny)
                    pointsnxyz.push(resultado_i.nz)


                }
            }


            // 2-)  Get the normal vector, either compute it or sgtored from the attribute table
            let attributeTable = 'cgeo_180209_11m_22012020_5cm_fix_attributes';
            let attributeIdColumn = 'segment_id';
            //let attributeIdColumn='segment_id';

            let getNormalVectorQuery = `SELECT  segment_id, nx,ny,nz,  c2,status, npoints, "planeArea", projected_xy_area FROM ${attributeTable} WHERE ${attributeIdColumn} = ${segmentID} `;
            //console.log(getNormalVectorQuery);
            let resultados2 = await db.any(getNormalVectorQuery, {});//esperamos los resultados de la consulta con await
            let total = 0;



            //only one result might appear

            let nx = 0.0;
            let ny = 0.0;
            let nz = 0.0;
            let c2 = 0.0;
            let npoints = 0;
            let status = 'discarded';
            let planeArea = 0.0;
            let proected_xy_area = 0.0;

            console.log('Getting attributes ' + resultados2.length);

            for (let i = 0; i < resultados2.length; i++) {
                console.log(resultados2[i])
                nx = resultados2[i].nx;
                ny = resultados2[i].ny;
                nz = resultados2[i].nz;

                c2 = resultados2[i].c2;
                status = resultados2[i].status;
                console.log('C2: ' + c2)
                console.log('status: ' + status)

            }

            //3-)  compute normal vector. DOne on 2)

            //4) Translate points around zero
            console.log('translating points ' + pointsxyz.length);
            let j = 1;
            for (let i = 0; i < pointsxyz.length;) {
                pointsxyz[i] = pointsxyz[i] - anchorX; i++;
                pointsxyz[i] = pointsxyz[i] - anchorY; i++;
                pointsxyz[i] = pointsxyz[i] - anchorZ; i++;
                //console.log(j+ ',' + pointsxyz[i-3]+ ','+ pointsxyz[i-2] + ',' + pointsxyz[i-1]);
                j++

            }
            //done translating to zero at anchor point

            // 5)  Computes the orthogonal vector parallel to the x,y, axes and use it as the rotation vector.


            //inclinado: el vector normal  ayuda a determinar direcciones. La proyeccion en xy  de la normal  ayuda a determinal el ortogonal a la normal

            let rotationVector = [];
            let rotationAngle = 0.0;//radians

            if (c2 == 1) {//si es horizontal, entonces, valdra la pena que el otro vector de referencia sea el xy
            }

            if (c2 > 1) {//si es inclinado, cualquier otro vector puede funcionar

                //get the xy projection to the normal

                let nx_xy = nx;
                let ny_xy = ny;
                let nz_xy = 0.0;//vive en el plano horizontal.

                //ahora obtenemos el ortogonal a la normal y la proyeccion

                //requerimos tres puntos, el origen , la normal y la proyeccion xy
                console.log('rotating points 3d ' + pointsxyz.length);


                //            rotationVector = mathf3d.orthogonalVector2PointsInPlaneArray([0, 0, 0], [nx, ny, nz], [nx_xy, ny_xy, nz_xy]);

                //el vector de rotacion no esta del todo alineado a la normal a 90
                let lastPointIndex = pointsxyz.length;
                console.log('LAST POINT INDEX: ' + lastPointIndex);
                console.log('LAST POINT: ' + [pointsxyz[lastPointIndex - 3], pointsxyz[lastPointIndex - 2], pointsxyz[lastPointIndex - 1]]);

                //            rotationVector = mathf3d.orthogonalVector2PointsInPlaneArray([nx, ny, nz],[0, 0, 0],  [pointsxyz[lastPointIndex-3], pointsxyz[lastPointIndex-2],0]);

                let rotLength = math.sqrt(
                    (pointsxyz[lastPointIndex - 3] * pointsxyz[lastPointIndex - 3]) +
                    (pointsxyz[lastPointIndex - 2] * pointsxyz[lastPointIndex - 2])
                )
                rotationVector = [pointsxyz[lastPointIndex - 3] / rotLength, pointsxyz[lastPointIndex - 2] / rotLength, 0];


                rotationAngle = mathf3d.computeAngleBetweenVectors([0, 0, 1], [nx, ny, nz]);


                rotatedPointxXYZ = mathf3d.rotateAroundVectorRodriguez(pointsxyz, rotationVector, rotationAngle);




                for (let i = 0; i < pointsxyz.length;) {

                    console.log(pointsxyz[i] + ',' + pointsxyz[i + 1] + ',' + pointsxyz[i + 2] + ',' + 1);
                    i += 3;

                }
                for (let i = 0; i < pointsxyz.length;) {

                    console.log(pointsnxyz[i] + ',' + pointsnxyz[i + 1] + ',' + pointsnxyz[i + 2] + ',' + 0);
                    i += 3;

                }
                drawVector([nx, ny, nz], 2);
                drawVector(rotationVector, 3);
                drawVector([nx_xy, ny_xy, nz_xy], 4);
                drawVector([0, 0, 1], 5);//eje z




                console.log(rotatedPointxXYZ.length)
                for (let i = 0; i < rotatedPointxXYZ.length;) {
                    console.log(rotatedPointxXYZ[i][0] + ',' + rotatedPointxXYZ[i][1] + ',' + rotatedPointxXYZ[i][2] + ',' + 6);
                    i = i + 3;
                }



            }

            //regresando a la posicion oficial
            /** 
                    console.log('translating back points ' + pointsxyz.length);
                    for (let i = 0; i < pointsxyz.length;) {
                        pointsxyz[i] = pointsxyz[i] + anchorX; i++;
                        pointsxyz[i] = pointsxyz[i] + anchorY; i++;
                        pointsxyz[i] = pointsxyz[i] + anchorZ; i++;
            
                    }
            */


        } catch (exception) {
            console.log("error " + exception)
        }
    },


    /**
     * 
     *  For a given table, SegmentID and Cell Size, returns recursively the connected segments.
     * status: on progress
     * Depends on: computeTouchesVoxel
     * 
     * Implemented in postgres as and V8 as v_v8_find_intersections but also here.
     * 
     * Also shows for each segment, their size in voxels.
     * 
     
     * 
     * @param {*} table 
     * @param {*} segmentID 
     * @param {*} column 
     
     * @param {*} cellsize 
    
        returns  An 
     */
    getConnectedSegments: async function (table, segmentID, segment_column, class_column, excluded, cellsize, minsize, filter) {
        console.log(" getConnectedSegments: ");

        //find using bboxes as geometries on the db, the segments connected using voxel conectivity.
        //as such, the a bboxes are considered and stored into the DB to compute the connectivity, one meter rounded or so, to help with different  cell sizes

        // 1- find the segments within the bounding box and //later
        // 2- compute which ones have intersections,   //doable
        // 3- return the segment_id of the neighbours
        // 4- PErform further analisys 


        //how to create a bounding box



        try {

            if (!minsize) {
                minsize = 1;
            }

            //let jointquery = `SELECT min(x) minx,min(y) miny,min(z) minz,max(x) maxx,max(y) maxy,max(z) maxz ,count(*) count FROM ${table} WHERE ${column} in (${segmentID1} , ${segmentID2}) `;


            //ell bbox del rasgo origen
            let queryBBOX = `SELECT min(x) minx, min(y) miny, min(z) minz , max(x) maxx,max(y) maxy,max(z) maxz ,count(*) count,  max(${class_column}) segment_type  FROM ${table} WHERE ${segment_column} = ${segmentID} ; `;


                        console.log(queryBBOX);
            segmentType = 0;
            origin = {};

            //primero hay que guardar los datos del segmento esperado
            let resultados = await db.any(queryBBOX, {});//esperamos los resultados de la consulta con await
            let numPoints = resultados[0].count;

            //solo si coincide el registro, se devuelven resultados
            for (let i = 0; i < resultados.length; i++) {
                let resultado_i = resultados[i];
                /*
                            console.log(resultados[0].minx);
                            console.log(resultados[0].miny);
                            console.log(resultados[0].minz);
                            console.log(resultados[0].maxx);
                            console.log(resultados[0].maxy);
                            console.log(resultados[0].maxz);
                */
                origin.minx = resultados[0].minx;
                origin.miny = resultados[0].miny;
                origin.minz = resultados[0].minz;

                origin.maxx = resultados[0].maxx;
                origin.maxy = resultados[0].maxy;
                origin.maxz = resultados[0].maxz;
                segmentType = resultados[0].segment_type;

            }
            //);

            others = `${segmentID}`;
            for (let i = 0; i < excluded.length; i++) {
                others += `,${excluded[i]}`
            }

            //esto podria ahorrarse 
            if (!filter) {
                filter = '';//no null filters, no further checks
            }
            let queryOthersBBOX = `SELECT min(x) minx, min(y) miny, min(z) minz , max(x) maxx,max(y) maxy,max(z) maxz , ${segment_column} ${segment_column} , ${class_column} classification , count(*) npoints from ${table}  
            where ${segment_column} not in (${others})  ${filter}  
            group by ${segment_column} ,${class_column} ;`;//obtenemos los datos de dicho segmento

            /** */
            console.log(queryOthersBBOX);
            let resultados2 = await db.any(queryOthersBBOX, {});//esperamos los resultados de la consulta con await
            let total = 0;



            //verificamos si los otros bboxes intersectan el mio, y asi los procesamos
            let intersected = [];
            let surfaceType = [];

            for (let i = 0; i < resultados2.length; i++) {
                //checking bbox intersection, a lot of ifs, mostly in short circuit
                if (resultados2[i].npoints > minsize) {
                    if ((resultados2[i].minx > origin.maxx) || (resultados2[i].maxx < origin.minx)) {
                        //              intersected[resultados2[i][column]]=0;
                        //console.log('Discarded '+ resultados2[i][column])
                        continue;
                    }

                    if ((resultados2[i].miny > origin.maxy) || (resultados2[i].maxy < origin.miny)) {
                        //console.log('Discarded '+ resultados2[i][column])
                        //               intersected[resultados2[i][column]]=0;
                        continue;
                    }

                    if ((resultados2[i].minz > origin.maxz) || (resultados2[i].maxz < origin.minz)) {
                        //console.log('Discarded '+ resultados2[i][column])
                        //                intersected[resultados2[i][column]]=0;
                        continue;
                    }
                    //console.log('--> '+resultados2[i][column]);
                    intersected.push(Number([resultados2[i][segment_column]]));//true at the beginning   bbox simple intersection
                    surfaceType.push(Number([resultados2[i]['classification']]));//
                }
            }


            /////hacemos un offset con cada intersectado para verificar o, usamos la funcion existente

            let connectedSegments = [];

            let originVoxelCount = await this.computeSegmentVoxelSpace_geom(table, segmentID, segment_column, cellsize);

            for (let i = 0; i < intersected.length; i++) {//check only if bbox works

                //        console.log('Checking ' + segmentID + ' ' + intersected[i])

                let connectedSegmentVoxelCount = await this.computeSegmentVoxelSpace_geom(table, intersected[i], segment_column, cellsize);

                let voxelIntersections = await this.computeS1IntersectsS2Voxel(table, segmentID, intersected[i], segment_column, cellsize);

                if (voxelIntersections.intersections > 0) {
                    //console.log('Segment: ' + intersected[i] + ' Type: ' + segmentType + '_' + surfaceType[i] + ' VSizes: ' + originVoxelCount + ' _ ' + connectedSegmentVoxelCount + ' @IntersectedVoxels: ' + voxelIntersections);
                    connectedSegments.push({ origin: segmentID, originType: segmentType, originVoxelCount: originVoxelCount, connectedSegment: intersected[i], connectedType: surfaceType[i], intersectedVoxels: voxelIntersections, connectedvoxelcount: connectedSegmentVoxelCount });


                }

            }
            return connectedSegments;


        } catch (exception) {
            console.log(exception)
            return [];
        }

    },


    //findConnectedSegments but avoids getting additional segment information for speed sake
    getConnectedSegmentsFast: async function (table, segmentID, column, excluded, cellsize, minvoxelsize, maxvoxelsize, classID) {
        console.log(" getConnectedSegmentsFast: ");

        //find using bboxes as geometries on the db, the segments connected using voxel conectivity.
        //as such, the a bboxes are considered and stored into the DB to compute the connectivity, one meter rounded or so, to help with different  cell sizes

        // 1- find the segments within the bounding box and //later
        // 2- compute which ones have intersections,   //doable
        // 3- return the segment_id of the neighbours
        // 4- PErform further analisys 


        //how to create a bounding box



        try {

            //let jointquery = `SELECT min(x) minx,min(y) miny,min(z) minz,max(x) maxx,max(y) maxy,max(z) maxz ,count(*) count FROM ${table} WHERE ${column} in (${segmentID1} , ${segmentID2}) `;


            //ell bbox del rasgo origen

            let queryBBOX = `SELECT min(x) minx, min(y) miny, min(z) minz , 
            max(x) maxx, max(y) maxy,max(z) maxz ,
            count(*) count,  max(${classID}) segment_type  
            FROM ${table} WHERE ${column} = ${segmentID} ; `;
            console.log(queryBBOX);

            segmentType = 0;
            origin = {};

            //primero hay que guardar los datos del segmento esperado
            let resultados = await db.any(queryBBOX, {});//esperamos los resultados de la consulta con await
            let numPoints = resultados[0].count;


            //get the bbox of the origin segment
            for (let i = 0; i < resultados.length; i++) {
                let resultado_i = resultados[i];
                /*
                            console.log(resultados[0].minx);console.log(resultados[0].miny);console.log(resultados[0].minz);
                            console.log(resultados[0].maxx);console.log(resultados[0].maxy);console.log(resultados[0].maxz);
                */
                origin.minx = resultados[0].minx;
                origin.miny = resultados[0].miny;
                origin.minz = resultados[0].minz;

                origin.maxx = resultados[0].maxx;
                origin.maxy = resultados[0].maxy;
                origin.maxz = resultados[0].maxz;
                segmentType = resultados[0].segment_type;
            }

            others = `${segmentID}`;
            for (let i = 0; i < excluded.length; i++) {
                others += `,${excluded[i]}`
            }

            //esto podria ahorrarse si se tuviera un bbox u otra cosa
            //            let queryOthersBBOX = `SELECT min(x) minx, min(y) miny, min(z) minz , max(x) maxx,max(y) maxy,max(z) maxz , ${column} ${column} , c2 classification from ${table}  where ${column} not in (${others}) group by ${column} ,classification order by ${column};`;//obtenemos los datos de dicho segmento

            let queryOthersBBOX = `SELECT min(x) minx, min(y) miny, min(z) minz , max(x) maxx,max(y) maxy,max(z) maxz , ${column} ${column} , ${classID} classification from ${table} 
             where ${column} not in (${others}) group by ${column} ,${classID} order by ${column};`;//obtenemos los datos de dicho segmento
            console.log('others bbox');

            console.log(queryOthersBBOX);


            let resultados2 = await db.any(queryOthersBBOX, {});//esperamos los resultados de la consulta con await
            let total = 0;



            //verificamos si los otros bboxes intersectan el mio, y asi los procesamos
            let intersected = [];
            let surfaceType = [];

            //puedo acelerarlo con indices de postgres

            //comparamos bboxes para evitar conversiones
            for (let i = 0; i < resultados2.length; i++) {
                //checking bbox intersection, a lot of ifs, mostly in short circuit

                //console.log('Others ' + i);

                if ((resultados2[i].minx > origin.maxx) || (resultados2[i].maxx < origin.minx)) {
                    //              intersected[resultados2[i][column]]=0;
                    //console.log('Discarded '+ resultados2[i][column])
                    continue;
                }

                if ((resultados2[i].miny > origin.maxy) || (resultados2[i].maxy < origin.miny)) {
                    //console.log('Discarded '+ resultados2[i][column])
                    //               intersected[resultados2[i][column]]=0;
                    continue;
                }

                if ((resultados2[i].minz > origin.maxz) || (resultados2[i].maxz < origin.minz)) {
                    //console.log('Discarded '+ resultados2[i][column])
                    //                intersected[resultados2[i][column]]=0;
                    continue;
                }
                //console.log('--> '+resultados2[i][column]);
                intersected.push(Number([resultados2[i][column]]));//true at the beginning   bbox simple intersection
                surfaceType.push(Number([resultados2[i]['classification']]))
            }





            let connectedSegments = [];//listado de lo que coincide en el bbox y ahora se probará
            let originVoxelCount = await this.computeSegmentVoxelSpace_geom(table, segmentID, column, cellsize);//tamaño del origen


            let counter = 0;
            console.log('TestingVoxelIntersectionFast')
            for (let i = 0; i < intersected.length; i++) {

                //        console.log('Checking ' + segmentID + ' ' + intersected[i])

                //Este si es medular para determinal la interseccion
                //se puede acelerar si evitamos hacer  todo temporal


                //este proceso es caro pero ya se redujo por el overhead de pedir muchos datos
                let voxelIntersections = await this.computeS1IntersectsS2VoxelFast(table, segmentID, intersected[i], column, cellsize);

                if (voxelIntersections > 0) {

                    //podria ser opcional si es que se guarda en la tabla
                    let connectedSegmentVoxelCount//=1;//just to make it faster to query
                        = await this.computeSegmentVoxelSpace_geom(table, intersected[i], column, cellsize);//lo puedo aplicar solo para los que conectan
                    counter++;
                    //let conne

                    //adding only with a given size
                    if (connectedSegmentVoxelCount >= minvoxelsize && connectedSegmentVoxelCount <= maxvoxelsize) {
                        //console.log('Segment: ' + intersected[i] + ' Type: ' + segmentType + '_' + surfaceType[i] + ' VSizes: ' + originVoxelCount + ' _ ' + connectedSegmentVoxelCount + ' @IntersectedVoxels: ' + voxelIntersections);
                        connectedSegments.push({ origin: segmentID, originType: segmentType, originVoxelCount: originVoxelCount, connectedSegment: intersected[i], connectedType: surfaceType[i], intersectedVoxels: voxelIntersections, connectedvoxelcount: connectedSegmentVoxelCount });
                    }

                }

            }
            console.log('Found ' + counter)
            return connectedSegments;


        } catch (exception) {
            console.log(exception)
            return [];
        }

    },

    /****************************************************************************** */
    /**
     * Checks if two segments are connected for a give cellsize.
     * HAs errors
     * @param {*} table 
     * @param {*} segmentID1 
     * @param {*} segmentID2 
     * @param {*} column 
     * @param {*} cellsize 
     * @returns 
     */


    /**return numbers */
    checkConnectedSegments: async function (table, segmentID1, segmentID2, column, cellsize) {
        //console.log(" checkConnectedSegments: ");
        try {


            let voxelIntersections = await this.computeS1IntersectsS2Voxel(table, segmentID1, segmentID2, column, cellsize);
            //  if (voxelIntersections.intersections > 0) {
            return voxelIntersections.intersections;
            //  } else {
            return { voxel };
            //}

        } catch (exception) {
            console.log(exception)
        }

    },

    ////////////
    /**
     * Returns a set of segments id, one or meny
     * 
     * @param {*} table 
     * @param {*} column 
     * @param {*} excluded 
     * @param {*} cellsize 
     * @returns Aray of ids under a given condition
     */
    getSegmentsID: async function (table, column, excluded, cellsize) {
        console.log(" getSegmentsID");
        try {

            //ell bbox del rasgo origen
            if (excluded == null) excluded = '';//avoid
            let query = `SELECT ${column} sid  FROM ${table}  ${excluded};  `;
            console.log(query);
            let resultados = await db.any(query, {});//esperamos los resultados de la consulta con await

            let segmentList = [];
            //solo si coincide el registro, se devuelven resultados
            for (let i = 0; i < resultados.length; i++) {
                segmentList.push(resultados[i].sid);
            }


            return segmentList;


        } catch (exception) {
            console.log(exception)
        }

    },



    /**
     * Returns all the points in a segment as an array of  [x,y,z] points.
     * 
     * @param {*} table 
     * @param {*} column 
     * @param {*} excluded 
     * @param {*} cellsize 
     * @returns Aray of ids under a given condition
     */
    getSegmentXYZ: async function (table, column, segmentID, excluded) {
        console.log(" getSegmentsID");
        try {

            //ell bbox del rasgo origen
            if (excluded == null) excluded = '';//avoid
            let query = `SELECT x,y,z  FROM ${table} WHERE ${column} = ${segmentID} ;  `;
            console.log(query);
            let resultados = await db.any(query, {});//esperamos los resultados de la consulta con await
            let points = [];
            //solo si coincide el registro, se devuelven resultados
            for (let i = 0; i < resultados.length; i++) {
                points.push([resultados[i].x, resultados[i].y, resultados[i].z]);
            }
            return points;

        } catch (exception) {
            console.log(exception)
        }

    },





    /**
     * 
     * Receives a temporal vxel representation where
     * 
     * {voxel=[[key,value],[key,value]]   bbox=[xmin,ymin,zmin,xmax,yman,xmax]
     * 
     * The cells must be iterated so if a cell has less than x neighbours, it collapses, otherwise, is preserved.
     * 
     * The issue here is how to define the neoghborhoods, as 6 or 14 or more. 
     * 
     * @param {voxel} voxel
     * @param {neighboorhood type} voxel 
     * 
     */
    erodeSegmentVoxel(voxelJSON, neighborhoodType) {

        let originVoxel = []
        //dumping data into a hash
        //just storing where is a voxel
        voxelJSON.voxel.forEach(entry => {


            //            originVoxel[entry[0]]=entry[1];//reinserting things
            originVoxel[entry[0]] = 1;//alternative value for counting
        });

        let destinationVoxel = [];

        //CHECKING_CONECTEDNESS

        let key, key_x, key_y, key_z;
        //para cada entrada del arreglo del voxel, revisamos sus vecindades para ver si se erosiona en 3d

        voxelJSON.voxel.forEach(entry => {
            key = entry[0].split('_');//using the key
            key_x = key[0];
            key_y = key[1];
            key_z = key[2];

            //dependiendo de la vecindad considerada, se analiza

            //se revisa con vecindad de 14
            //la mayoria se considera la mitad mas uno
            let counter = 0;

            if (neighborhoodType == 6) {

                counter =
                    originVoxel[(key_x) + '_' + (key_y) + '_' + (key_z + 1)] +
                    originVoxel[(key_x) + '_' + (key_y) + '_' + (key_z - 1)] +

                    originVoxel[(key_x) + '_' + (key_y + 1) + '_' + (key_z)] +
                    originVoxel[(key_x) + '_' + (key_y - 1) + '_' + (key_z)] +

                    originVoxel[(key_x + 1) + '_' + (key_y) + '_' + (key_z)] +
                    originVoxel[(key_x - 1) + '_' + (key_y) + '_' + (key_z)];

                if (counter > 2) {//mas de dos se queda
                    destinationVoxel[key_x + '_' + key_y + '_' + key_z] = 1;//nos quedamos solo con lo que sobrevive
                    //ha formas mas faciles de transportar esto, solo con las llaves
                }

            }

            if (neighborhoodType == 18) {

                counter =
                    originVoxel[(key_x) + '_' + (key_y) + '_' + (key_z + 1)] +
                    originVoxel[(key_x) + '_' + (key_y) + '_' + (key_z - 1)] +

                    originVoxel[(key_x) + '_' + (key_y + 1) + '_' + (key_z)] +
                    originVoxel[(key_x) + '_' + (key_y - 1) + '_' + (key_z)] +

                    originVoxel[(key_x + 1) + '_' + (key_y) + '_' + (key_z)] +
                    originVoxel[(key_x - 1) + '_' + (key_y) + '_' + (key_z)] +

                    ////
                    originVoxel[(key_x + 1) + '_' + (key_y + 1) + '_' + (key_z)] +
                    originVoxel[(key_x - 1) + '_' + (key_y + 1) + '_' + (key_z)] +
                    originVoxel[(key_x + 1) + '_' + (key_y - 1) + '_' + (key_z)] +
                    originVoxel[(key_x - 1) + '_' + (key_y - 1) + '_' + (key_z)] +


                    originVoxel[(key_x + 1) + '_' + (key_y) + '_' + (key_z + 1)] +
                    originVoxel[(key_x - 1) + '_' + (key_y) + '_' + (key_z + 1)] +
                    originVoxel[(key_x + 1) + '_' + (key_y) + '_' + (key_z - 1)] +
                    originVoxel[(key_x - 1) + '_' + (key_y) + '_' + (key_z - 1)] +

                    originVoxel[(key_x) + '_' + (key_y + 1) + '_' + (key_z + 1)] +
                    originVoxel[(key_x) + '_' + (key_y + 1) + '_' + (key_z - 1)] +
                    originVoxel[(key_x) + '_' + (key_y - 1) + '_' + (key_z + 1)] +
                    originVoxel[(key_x) + '_' + (key_y - 1) + '_' + (key_z - 1)]




                    ;

                if (counter > 4) {
                    destinationVoxel[key_x + '_' + key_y + '_' + key_z] = 1;//nos quedamos solo con lo que sobrevive
                }



            }

            if (neighborhoodType == 26) {//a  27 neighborhood

                counter =
                    originVoxel[(key_x) + '_' + (key_y) + '_' + (key_z + 1)] +
                    originVoxel[(key_x) + '_' + (key_y) + '_' + (key_z - 1)] +

                    originVoxel[(key_x) + '_' + (key_y + 1) + '_' + (key_z)] +
                    originVoxel[(key_x) + '_' + (key_y - 1) + '_' + (key_z)] +

                    originVoxel[(key_x + 1) + '_' + (key_y) + '_' + (key_z)] +
                    originVoxel[(key_x - 1) + '_' + (key_y) + '_' + (key_z)] +
                    //6
                    ////
                    originVoxel[(key_x + 1) + '_' + (key_y + 1) + '_' + (key_z)] +
                    originVoxel[(key_x - 1) + '_' + (key_y + 1) + '_' + (key_z)] +
                    originVoxel[(key_x + 1) + '_' + (key_y - 1) + '_' + (key_z)] +
                    originVoxel[(key_x - 1) + '_' + (key_y - 1) + '_' + (key_z)] +


                    originVoxel[(key_x + 1) + '_' + (key_y) + '_' + (key_z + 1)] +
                    originVoxel[(key_x - 1) + '_' + (key_y) + '_' + (key_z + 1)] +
                    originVoxel[(key_x + 1) + '_' + (key_y) + '_' + (key_z - 1)] +
                    originVoxel[(key_x - 1) + '_' + (key_y) + '_' + (key_z - 1)] +

                    originVoxel[(key_x) + '_' + (key_y + 1) + '_' + (key_z + 1)] +
                    originVoxel[(key_x) + '_' + (key_y + 1) + '_' + (key_z - 1)] +
                    originVoxel[(key_x) + '_' + (key_y - 1) + '_' + (key_z + 1)] +
                    originVoxel[(key_x) + '_' + (key_y - 1) + '_' + (key_z - 1)]
                    +
                    //8 todas las esquinas

                    originVoxel[(key_x + 1) + '_' + (key_y + 1) + '_' + (key_z + 1)] +
                    originVoxel[(key_x + 1) + '_' + (key_y + 1) + '_' + (key_z - 1)] +
                    originVoxel[(key_x + 1) + '_' + (key_y - 1) + '_' + (key_z + 1)] +
                    originVoxel[(key_x + 1) + '_' + (key_y - 1) + '_' + (key_z - 1)] +


                    originVoxel[(key_x - 1) + '_' + (key_y + 1) + '_' + (key_z + 1)] +
                    originVoxel[(key_x - 1) + '_' + (key_y + 1) + '_' + (key_z - 1)] +
                    originVoxel[(key_x - 1) + '_' + (key_y - 1) + '_' + (key_z + 1)] +
                    originVoxel[(key_x - 1) + '_' + (key_y - 1) + '_' + (key_z - 1)]


                if (counter > 7) {
                    destinationVoxel[key_x + '_' + key_y + '_' + key_z] = 1;//nos quedamos solo con lo que sobrevive
                }
            }



        });//end of foreach voxel

        return destinationVoxel;//regresamos el voxel erosionado, solo las llaves


    },


    /**
     * For two given plane segments, it computes it they touch (meet/intersect) based on a voxel representation.
     * The actual positions or points are not computed but the ocurrence of points from both segments on the same voxel.
     * The number of voxels is returned as an integer
     * 
     * 0 : No intersection
     * n: Intersection at one on more voxels. This gives the strength of the intersection for a given cell size.
     * At this stage is considered with repetitions
     * 
     * @param {*} table 
     * @param {*} segmentID1 
     * @param {*} segmentID2 
     * @param {*} cellsize 
     */

    computeS1IntersectsS2Voxel: async function (table, segmentID1, segmentID2, column, cellsize) {
        // things should be returned as bin, laz or las
        //las is the easiest

        /*
            console.log(" computeTouchesVoxels(): ");
            console.log(column)
            console.log(segmentID1)
            console.log(segmentID2)
            console.log(cellsize)
        */
        //let query1 = `SELECT min(x) minx,min(y) miny,min(z) minz,max(x) maxx,max(y) maxy,max(z) maxz ,count(segment) count FROM ${table} WHERE segment = ${segmentID1} `;
        //let query2 = `SELECT min(x) minx,min(y) miny,min(z) minz,max(x) maxx,max(y) maxy,max(z) maxz ,count(segment) count FROM ${table} WHERE segment = ${segmentID2} `;

        //si realmente no se tocan, es muy caro
        let jointquery = `SELECT min(x) minx,min(y) miny,min(z) minz,max(x) maxx,max(y) maxy,max(z) maxz ,count(*) count FROM ${table} WHERE ${column} in (${segmentID1} , ${segmentID2}) `;

        //console.log(query1);
        //console.log(query2);

        //console.log(jointquery);


        let minx, miny, maxx, maxy, minz, maxz, total;

        try {
            let resultados1 = await db.any(jointquery, {});//esperamos los resultados de la consulta con await

            resultados1.forEach(function (resultado_i) {

                minx = resultados1[0].minx;
                miny = resultados1[0].miny;
                minz = resultados1[0].minz;

                maxx = resultados1[0].maxx;
                maxy = resultados1[0].maxy;
                maxz = resultados1[0].maxz;

            });
            /*
                    resultados2.forEach(function (resultado_i) {
                        
                        minx = resultados[0].minx;
                        miny = resultados[0].miny;
                        minz = resultados[0].minz;
            
                        maxx = resultados[0].maxx;
                        maxy = resultados[0].maxy;
                        maxz = resultados[0].maxz;
            
                    });
            */
            minx = Math.floor(minx);
            miny = Math.floor(miny);
            minz = Math.floor(minz);

            maxx = Math.floor(maxx);
            maxy = Math.floor(maxy);
            maxz = Math.floor(maxz);

            //no es muy relevante
            sizex = maxx - minx;
            sizey = maxy - miny;
            sizez = maxz - minz;


            //podria hacer en un solo query, el llenar esto de la misma manera,
            //si existe un 
            let query3 = `SELECT x,y,z FROM ${table} WHERE ${column} = ${segmentID1} `;
            let query4 = `SELECT x,y,z FROM ${table} WHERE ${column} = ${segmentID2} `;
            let idx;
            let idy;
            let idz;
            let voxels = [];
            //        let intvoxels = [];
            //console.log(query2);
            let resultados3 = await db.any(query3, {});//esperamos los resultados de la consulta con await
            resultados3.forEach(function (resultado_i) {
                //console.log(resultado_i)
                idx = Math.floor((resultado_i.x - minx) / cellsize);
                idy = Math.floor((resultado_i.y - miny) / cellsize);
                idz = Math.floor((resultado_i.z - minz) / cellsize);

                let key = `${idx}_${idy}_${idz}`;
                //console.log(key);
                //console.log(voxels[key] == null)

                voxels[key] = 1;//se indica que es el primer objeto

            });

            let intcounter = 0;//number of intersected voxels
            let intersects = false;
            let resultados4 = await db.any(query4, {});//esperamos los resultados de la consulta con await


            //si habia un uno, entonces significa que el objeto uno estaba presente alli y se codifica 3 para indicar ambos
            //si no hay nada, entonces es el objeto 2 el que debe estar
            //si esta 3, entonces ya se intersectaron y no se sigue contando


            resultados4.forEach(function (resultado_i) {
                //console.log(resultado_i)
                idx = Math.floor((resultado_i.x - minx) / cellsize);
                idy = Math.floor((resultado_i.y - miny) / cellsize);
                idz = Math.floor((resultado_i.z - minz) / cellsize);

                let key = `${idx}_${idy}_${idz}`;
                //console.log(key);
                //console.log(voxels[key] == null)

                if (voxels[key] == 1) {
                    //significa que ya se intersectaron y se coloca un dos, aunque deberia marcar donde se intersectan
                    voxels[key] = 3;//hay interseccion, 2 solo el modelo 2 esta alli
                    //intvoxels[]=;
                    intcounter += 1;//Counts the intersectedVoxels only once
                    intersects = true;
                }
                if (voxels[key] == 3) {
                    //significa que ya se intersectaron y se coloca un dos, aunque deberia marcar donde se intersectan
                    //intcounter += 1;ya no contamos
                }
                else {
                    voxels[key] = 2;
                }
            }
            );

            //debia regresar los voxeles interectados. 


                    console.log("Intersectan: " + intersects);
                    console.log("Num Voxeles Intersectados : " + intcounter)
            let results = { intersections: intcounter, voxels: [] };

            return results;
        } catch (exception) {
            console.log(exception)
        }

    },

    /**
     * For two given plane segments, it computes it they touch (meet/intersect) based on a voxel representation.
     * The actual positions or points are not computed but the ocurrence of points from both segments on the same voxel.
     * The number of voxels is returned as an integer
     * 
     * 0 : No intersection
     * n: Intersection at one on more voxels. This gives the strength of the intersection for a given cell size.
     * At this stage is considered with repetitions
     * 
     * @param {*} table 
     * @param {*} segmentID1 
     * @param {*} segmentID2 
     * @param {*} cellsize 
     */

    getS1IntersectsS2Voxels: async function (table, segmentID1, segmentID2, column, cellsize) {
        // things should be returned as bin, laz or las
        //las is the easiest

        /*
            console.log(" computeTouchesVoxels(): ");
            console.log(column)
            console.log(segmentID1)
            console.log(segmentID2)
            console.log(cellsize)
        */
        //let query1 = `SELECT min(x) minx,min(y) miny,min(z) minz,max(x) maxx,max(y) maxy,max(z) maxz ,count(segment) count FROM ${table} WHERE segment = ${segmentID1} `;
        //let query2 = `SELECT min(x) minx,min(y) miny,min(z) minz,max(x) maxx,max(y) maxy,max(z) maxz ,count(segment) count FROM ${table} WHERE segment = ${segmentID2} `;

        //si realmente no se tocan, es muy caro
        let jointquery = `SELECT min(x) minx,min(y) miny,min(z) minz,max(x) maxx,max(y) maxy,max(z) maxz ,count(*) count FROM ${table} WHERE ${column} in (${segmentID1} , ${segmentID2}) `;
        let voxel = {};//un voxel se va a definir por su bbox, es decir, el punto del voxel y todos mas cell size.
        let voxels = [];
        //console.log(query1);
        //console.log(query2);

        //console.log(jointquery);


        let minx, miny, maxx, maxy, minz, maxz, total;

        try {
            let resultados1 = await db.any(jointquery, {});//esperamos los resultados de la consulta con await

            resultados1.forEach(function (resultado_i) {

                minx = resultados1[0].minx;
                miny = resultados1[0].miny;
                minz = resultados1[0].minz;

                maxx = resultados1[0].maxx;
                maxy = resultados1[0].maxy;
                maxz = resultados1[0].maxz;

            });
            /*
                    resultados2.forEach(function (resultado_i) {
                        
                        minx = resultados[0].minx;
                        miny = resultados[0].miny;
                        minz = resultados[0].minz;
            
                        maxx = resultados[0].maxx;
                        maxy = resultados[0].maxy;
                        maxz = resultados[0].maxz;
            
                    });
            */
            minx = Math.floor(minx);
            miny = Math.floor(miny);
            minz = Math.floor(minz);

            maxx = Math.floor(maxx);
            maxy = Math.floor(maxy);
            maxz = Math.floor(maxz);

            //no es muy relevante
            sizex = maxx - minx;
            sizey = maxy - miny;
            sizez = maxz - minz;


            let query3 = `SELECT x,y,z FROM ${table} WHERE ${column} = ${segmentID1} `;
            let query4 = `SELECT x,y,z FROM ${table} WHERE ${column} = ${segmentID2} `;
            let idx;
            let idy;
            let idz;
            let voxels = [];
            //        let intvoxels = [];
            //console.log(query2);
            let resultados3 = await db.any(query3, {});//esperamos los resultados de la consulta con await
            resultados3.forEach(function (resultado_i) {
                //console.log(resultado_i)
                idx = Math.floor((resultado_i.x - minx) / cellsize);
                idy = Math.floor((resultado_i.y - miny) / cellsize);
                idz = Math.floor((resultado_i.z - minz) / cellsize);

                let key = `${idx}_${idy}_${idz}`;
                //console.log(key);
                //console.log(voxels[key] == null)

                voxels[key] = 1;//se indica que es el primer objeto

            });

            let intcounter = 0;//number of intersected voxels
            let intersects = false;
            let resultados4 = await db.any(query4, {});//esperamos los resultados de la consulta con await


            //si habia un uno, entonces significa que el objeto uno estaba presente alli y se codifica 3 para indicar ambos
            //si no hay nada, entonces es el objeto 2 el que debe estar
            //si esta 3, entonces ya se intersectaron y no se sigue contando


            resultados4.forEach(function (resultado_i) {
                //console.log(resultado_i)
                idx = Math.floor((resultado_i.x - minx) / cellsize);
                idy = Math.floor((resultado_i.y - miny) / cellsize);
                idz = Math.floor((resultado_i.z - minz) / cellsize);

                let key = `${idx}_${idy}_${idz}`;
                //console.log(key);
                //console.log(voxels[key] == null)

                if (voxels[key] == 1) { //significa interseccion, se coloca un 3
                    voxels[key] = 3;//
                    //intvoxels[]=;
                    intcounter += 1;//Counts the intersected Voxels only once
                    intersects = true;
                    voxels.push({ pmin: [resultado_i.x, resultado_i.y, resultado_i.z], pmax: [resultado_i.x + cellsize, resultado_i.y + cellsize, resultado_i.z + cellsize] });


                }
                if (voxels[key] == 3) {
                    //significa que ya se intersectaron y se coloca un dos, aunque deberia marcar donde se intersectan
                    //intcounter += 1;ya no contamos
                }
                else {
                    voxels[key] = 2;//only for model 2
                }
            }
            );

            //debia regresar los voxeles interectados. 


            //        console.log("Intersectan: " + intersects);
            //        console.log("NUm Voxeles Intersectados : " + intcounter)
            let results = { intersections: intcounter, voxels: voxels };

            return results;
        } catch (exception) {
            console.log(exception)
        }

    },


    computeS1IntersectsS2VoxelFast: async function (table, segmentID1, segmentID2, column, cellsize) {

        let jointquery = `SELECT min(x) minx,min(y) miny,min(z) minz,max(x) maxx,max(y) maxy,max(z) maxz ,count(*) count FROM ${table} WHERE ${column} in (${segmentID1} , ${segmentID2}) `;

        //console.log(query1);
        //console.log(query2);

        //console.log(jointquery);


        let minx, miny, maxx, maxy, minz, maxz, total;

        try {
            let resultados1 = await db.any(jointquery, {});//esperamos los resultados de la consulta con await

            resultados1.forEach(function (resultado_i) {

                minx = resultados1[0].minx;
                miny = resultados1[0].miny;
                minz = resultados1[0].minz;

                maxx = resultados1[0].maxx;
                maxy = resultados1[0].maxy;
                maxz = resultados1[0].maxz;

            });
            /*
                    resultados2.forEach(function (resultado_i) {
                        
                        minx = resultados[0].minx;
                        miny = resultados[0].miny;
                        minz = resultados[0].minz;
            
                        maxx = resultados[0].maxx;
                        maxy = resultados[0].maxy;
                        maxz = resultados[0].maxz;
            
                    });
            */
            minx = Math.floor(minx);
            miny = Math.floor(miny);
            minz = Math.floor(minz);

            maxx = Math.floor(maxx);
            maxy = Math.floor(maxy);
            maxz = Math.floor(maxz);

            //no es muy relevante
            sizex = maxx - minx;
            sizey = maxy - miny;
            sizez = maxz - minz;


            let query3 = `SELECT x,y,z FROM ${table} WHERE ${column} = ${segmentID1} `;
            let query4 = `SELECT x,y,z FROM ${table} WHERE ${column} = ${segmentID2} `;
            let idx;
            let idy;
            let idz;
            let voxels = [];
            //        let intvoxels = [];
            //console.log(query2);
            let resultados3 = await db.any(query3, {});//esperamos los resultados de la consulta con await
            resultados3.forEach(function (resultado_i) {
                //console.log(resultado_i)
                idx = Math.floor((resultado_i.x - minx) / cellsize);
                idy = Math.floor((resultado_i.y - miny) / cellsize);
                idz = Math.floor((resultado_i.z - minz) / cellsize);

                let key = `${idx}_${idy}_${idz}`;
                //console.log(key);
                //console.log(voxels[key] == null)

                voxels[key] = 1;//se indica que es el primer objeto

            });

            let intcounter = 0;//number of intersected voxels
            let intersects = false;
            let resultados4 = await db.any(query4, {});//esperamos los resultados de la consulta con await


            //si habia un uno, entonces significa que el objeto uno estaba presente alli y se codifica 3 para indicar ambos
            //si no hay nada, entonces es el objeto 2 el que debe estar
            //si esta 3, entonces ya se intersectaron y no se sigue contando


            resultados4.forEach(function (resultado_i) {
                //console.log(resultado_i)
                idx = Math.floor((resultado_i.x - minx) / cellsize);
                idy = Math.floor((resultado_i.y - miny) / cellsize);
                idz = Math.floor((resultado_i.z - minz) / cellsize);

                let key = `${idx}_${idy}_${idz}`;
                //console.log(key);
                //console.log(voxels[key] == null)

                if (voxels[key] == 1) {
                    //significa que ya se intersectaron y se coloca un dos, aunque deberia marcar donde se intersectan
                    voxels[key] = 3;//hay interseccion, 2 solo el modelo 2 esta alli
                    //intvoxels[]=;
                    intcounter += 1;//Counts the intersectedVoxels only once
                    intersects = true;
                    return intcounter;//a quick hack to break at the first intersection
                }
                if (voxels[key] == 3) {
                    //significa que ya se intersectaron y se coloca un dos, aunque deberia marcar donde se intersectan
                    //intcounter += 1;ya no contamos
                }
                else {
                    voxels[key] = 2;
                }
            }
            );

            //        console.log("Intersectan: " + intersects);
            //        console.log("NUm Voxeles Intersectados : " + intcounter)
            return intcounter;
        } catch (exception) {
            console.log(exception)
        }

    },

    //la implementacion mas rapida deberia hacerse con puntos e indices ya creados
    computeS1IntersectsS2VoxelFaster: async function (table, segmentID1, segmentID2, column, cellsize) {

        //podria usarse el atributo y reducir un poco
        let jointquery = `SELECT min(x) minx,min(y) miny,min(z) minz,max(x) maxx,max(y) maxy,max(z) maxz ,count(*) count FROM ${table} WHERE ${column} in (${segmentID1} , ${segmentID2}) `;

        let minx, miny, maxx, maxy, minz, maxz, total;

        try {

            let start = performance.now();

            let resultados1 = await db.any(jointquery, {});//esperamos los resultados de la consulta con await
            let end = performance.now();
            console.log('************  IntersectsFaster@jointquery ' + (end - start))
            start = end;
            resultados1.forEach(function (resultado_i) {

                minx = resultados1[0].minx;
                miny = resultados1[0].miny;
                minz = resultados1[0].minz;

                maxx = resultados1[0].maxx;
                maxy = resultados1[0].maxy;
                maxz = resultados1[0].maxz;

            });
            /*
                    resultados2.forEach(function (resultado_i) {
                        
                        minx = resultados[0].minx;
                        miny = resultados[0].miny;
                        minz = resultados[0].minz;
            
                        maxx = resultados[0].maxx;
                        maxy = resultados[0].maxy;
                        maxz = resultados[0].maxz;
            
                    });
            */
            minx = Math.floor(minx);
            miny = Math.floor(miny);
            minz = Math.floor(minz);

            maxx = Math.floor(maxx);
            maxy = Math.floor(maxy);
            maxz = Math.floor(maxz);

            //no es muy relevante
            sizex = maxx - minx;
            sizey = maxy - miny;
            sizez = maxz - minz;


            let query3 = `SELECT x,y,z FROM ${table} WHERE ${column} = ${segmentID1} `;//muy repetitivo
            let query4 = `SELECT x,y,z FROM ${table} WHERE ${column} = ${segmentID2} `;
            let idx;
            let idy;
            let idz;
            let voxels = [];
            //        let intvoxels = [];
            //console.log(query2);

            start = end;
            let resultados3 = await db.any(query3, {});//esperamos los resultados de la consulta con await
            end = performance.now();
            console.log('************  IntersectsFaster@query1 ' + (end - start))

            start = end;

            let GPUArrayX = new Array(resultados3.length)
            let GPUArrayY = new Array(resultados3.length)
            let GPUArrayZ = new Array(resultados3.length)


            let size = resultados3.length;
            console.log('Array Size:' + size)
            for (let i = 0; i < resultados3.length; i++) {

                GPUArrayX[i] = resultados3[i].x;
                GPUArrayY[i] = resultados3[i].y;
                GPUArrayZ[i] = resultados3[i].z;

            }


            cellify.setOutput([size]);
            GPUArrayX = cellify(GPUArrayX, minx, cellsize);
            GPUArrayY = cellify(GPUArrayY, miny, cellsize);
            GPUArrayZ = cellify(GPUArrayZ, minz, cellsize);

            let key;
            for (let i = 0; i < GPUArrayX.length; i++) {
                let key = `${GPUArrayX[i]}_${GPUArrayY[i]}_${GPUArrayZ[i]}`;
                //console.log(key);
                //console.log(voxels[key] == null)

                voxels[key] = 1;//se indica que es el primer objeto
            }


            //
            /*
                        resultados3.forEach(function (resultado_i) {
                            //console.log(resultado_i)
                            idx = Math.floor((resultado_i.x - minx) / cellsize);
                            idy = Math.floor((resultado_i.y - miny) / cellsize);
                            idz = Math.floor((resultado_i.z - minz) / cellsize);
            
                            let key = `${idx}_${idy}_${idz}`;
                            //console.log(key);
                            //console.log(voxels[key] == null)
            
                            voxels[key] = 1;//se indica que es el primer objeto
            
                        });
            */


            end = performance.now();
            console.log('************  IntersectsFaster@query1@indexing ' + (end - start))


            let intcounter = 0;//number of intersected voxels
            let intersects = false;


            start = end;
            let resultados4 = await db.any(query4, {});//esperamos los resultados de la consulta con await
            end = performance.now();
            console.log('************  IntersectsFaster@query2 ' + (end - start))


            //si habia un uno, entonces significa que el objeto uno estaba presente alli y se codifica 3 para indicar ambos
            //si no hay nada, entonces es el objeto 2 el que debe estar
            //si esta 3, entonces ya se intersectaron y no se sigue contando

            start = end;
            resultados4.forEach(function (resultado_i) {
                //console.log(resultado_i)
                idx = Math.floor((resultado_i.x - minx) / cellsize);
                idy = Math.floor((resultado_i.y - miny) / cellsize);
                idz = Math.floor((resultado_i.z - minz) / cellsize);

                let key = `${idx}_${idy}_${idz}`;
                //console.log(key);
                //console.log(voxels[key] == null)

                if (voxels[key] == 1) {
                    //significa que ya se intersectaron y se coloca un dos, aunque deberia marcar donde se intersectan
                    voxels[key] = 3;//hay interseccion, 2 solo el modelo 2 esta alli
                    //intvoxels[]=;
                    intcounter += 1;//Counts the intersectedVoxels only once, only returned once
                    intersects = true;
                    return intcounter;//a quick hack to break at the first intersection
                }

            }
            );
            end = performance.now();
            console.log('************  IntersectsFaster@query2@indexing ' + (end - start))
            //        console.log("Intersectan: " + intersects);
            //        console.log("NUm Voxeles Intersectados : " + intcounter)
            return intcounter;
        } catch (exception) {
            console.log(exception)
        }

    },


    /**
     *  Spatial/Directional operators.
     *  Given two  segments, suposedly flat, computes if S1 is above S2. 
     *  Is asumed the directionality as the Z vector.
     * 
    *   Based on Borrman concrpt for halfspace , where A defines an horizontal limit between halspace and acts as a boundari for above and below.

    *   All the points are projected or added to the Z axis, so a count is performed  into three segments
    
        A: Reference Segment
        B: Target SEgment
        C: Intersected vertical range between A and B. The totl number of elements is sum.
        AboveC: The vertical range  (AboveC_min_z , AboveC_max_z]  higher than Cz
        BelowC: The vertical range  [BelowC_min_z , BelowC_max_z)  lower than Cz    

        Sum AboveC= The total number of points or weight of the segment part above C

        Sum BelowC= The total number of points (or weight) of the segment part below C

        If Sum_AboveA > Sum_BelowB, then A is considered above B,
        False otherwise.
        C is considered as a boundary

            The result is an auxiliary json
            {result:true|false, operation: AaboveB, SumAbove:Number, SumC: Number, SumBelow:Number}

        Notes: A is considered horizontal, but if not, a wider band is created and may disrupt the numbers. 
        Finer attention could be used only at the intersected voxels, instead of the complete Reference Surface.    

            This can be futher refined to split vertical surfaces or others.

     * 
     * @param {*} table 
     * @param {*} segmentID1 
     * @param {*} segmentID2 
     * @param {*} column 
     * @param {*} cellsize 
     * @param {*} offset 
     * 
     * 

     */
    //OK done
    computeS1AboveS2VoxelHalfspaceFlexible: async function (table, segmentID1, segmentID2, column, cellsize, offset) {
        // things should be returned as bin, laz or las
        //las is the easiest

        console.log(" ---------------------------------------------------------------------- ");

                console.log(" computeS1AboveS2VoxelHalfspaceFlexible(): ");
                console.log('S1:' + segmentID1)
                console.log('S2: ' + segmentID2)
                console.log('column_id_ ' + column)
                console.log('cellsize ' + cellsize)
                console.log('offset ' + offset);//deoping it
        

        //a common  bbox for hashing
        let jointquery = `SELECT min(x) minx, min(y) miny, min(z) minz,max(x) maxx,max(y) maxy,max(z) maxz ,count(*) count FROM ${table} WHERE ${column} in (${segmentID1} , ${segmentID2}) `;
        // console.log(jointquery);
        let minx, miny, maxx, maxy, minz, maxz, total;

        try {
            let resultados1 = await db.any(jointquery, {});//esperamos los resultados de la consulta con await

            //solo hay un resultado
            resultados1.forEach(function (resultado_i) {

                minx = resultados1[0].minx;
                miny = resultados1[0].miny;
                minz = resultados1[0].minz;

                maxx = resultados1[0].maxx;
                maxy = resultados1[0].maxy;
                maxz = resultados1[0].maxz;

            });


            //integer aligned
            minx = Math.floor(minx);
            miny = Math.floor(miny);
            minz = Math.floor(minz);

            maxx = Math.floor(maxx);
            maxy = Math.floor(maxy);
            maxz = Math.floor(maxz);

            //no es muy relevante, pero es entero
            sizex = maxx - minx;
            sizey = maxy - miny;
            sizez = maxz - minz;

            //console.log('[ ' + minx + ' , ' + maxx + ']')
            //console.log('[ ' + miny + ' , ' + maxy + ']')
            //console.log('[ ' + minz + ' , ' + maxz + ']')



            //individual items
            let query3 = `SELECT x,y,z FROM ${table} WHERE ${column} = ${segmentID1} `;
            let query4 = `SELECT x,y,z FROM ${table} WHERE ${column} = ${segmentID2} `;
            //            let idx;
            //            let idy;
            let idz;


            let voxels_z = [];

            //console.log(query3);
            //console.log(query4);


            //let key = `${idx}_${idy}_${idz}`;

            //The reference segment is projected on the Z axis at the given cell size
            //creating the Az range
            let resultados3 = await db.any(query3, {});//esperamos los resultados de la consulta con await

            let maxc_idz = 0;//always positive
            let minc_idz = Math.floor((maxz - minz) / cellsize); //higest than the rest
            console.log('Z BOUNDS ' + maxc_idz + ' ' + minc_idz);
            //static



            //
            for (let i = 0; i < resultados3.length; i++) {

                idz = Math.floor((resultados3[i].z - minz) / cellsize);
                voxels_z[idz] = 1;//voxel occupied               
            }


            let above = false;
            let aboveCCount = 0;
            let belowCCount = 0;

            let resultados4 = await db.any(query4, {});//esperamos los resultados de la consulta con await
            //creating the C range, so the AboveC and BelowC ranges are calculated
            //for each compared point, where intersected, a min and max value are computed.



            let bCount = resultados4.length;


            for (let i = 0; i < resultados4.length; i++) {

                idz = Math.floor((resultados4[i].z - minz) / cellsize);
                if (voxels_z[idz] == 1) {

                    //computing range of C relative
                    if (idz < minc_idz) {
                        minc_idz = idz;
                    }
                    if (idz > maxc_idz) {
                        maxc_idz = idz;
                    }

                    voxels_z[idz] = 2;//skipping next value, so speeding up

                }

            }//end resultados 4


            for (let i = 0; i < resultados4.length; i++) {
                idz = Math.floor((resultados4[i].z - minz) / cellsize);

                if (idz < minc_idz) {
                    belowCCount++;
                }

                if (idz > maxc_idz) {
                    aboveCCount++;
                }
            }



            if (belowCCount > aboveCCount) {
                above = true;//the only way to produce true
            }

            let intersectsCCount = bCount - (aboveCCount + belowCCount);

            console.log(" S1 is Above S2? : " + above)

                 console.log(`Counts: AboveA: ${aboveCCount}  IntersectsA: ${intersectsCCount} BelowA ${belowCCount}`)
            return above;//simple return if s1 is above s2 at a given offset
            //tal vez devolver los voxeles para visualizacio

        } catch (exception) {
            console.log(exception)
        }

    },

    computeS1BelowS2VoxelHalfspaceFlexible: async function (table, segmentID1, segmentID2, column, cellsize, offset) {
        // things should be returned as bin, laz or las
        //las is the easiest

        console.log(" ---------------------------------------------------------------------- ");

        console.log(" computeS1BelowS2VoxelHalfspaceFlexible(): ");
        console.log('TABLE:' + table)
        console.log('S1:' + segmentID1)
        console.log('S2:' + segmentID2)
        console.log('column_id_ ' + column)
        console.log('cellsize ' + cellsize)
        console.log('offset ' + offset);//deoping it


        //a common  bbox for hashing
        let jointquery = `SELECT min(x) minx, min(y) miny, min(z) minz,max(x) maxx,max(y) maxy,max(z) maxz ,count(*) count FROM ${table} WHERE ${column} in (${segmentID1} , ${segmentID2}) `;
        console.log(jointquery);
        let minx, miny, maxx, maxy, minz, maxz, total;

        try {
            let resultados1 = await db.any(jointquery, {});//esperamos los resultados de la consulta con await

            //solo hay un resultado
            resultados1.forEach(function (resultado_i) {

                minx = resultados1[0].minx;
                miny = resultados1[0].miny;
                minz = resultados1[0].minz;

                maxx = resultados1[0].maxx;
                maxy = resultados1[0].maxy;
                maxz = resultados1[0].maxz;

            });


            //integer aligned
            minx = Math.floor(minx);
            miny = Math.floor(miny);
            minz = Math.floor(minz);

            maxx = Math.floor(maxx);
            maxy = Math.floor(maxy);
            maxz = Math.floor(maxz);

            //no es muy relevante, pero es entero
            sizex = maxx - minx;
            sizey = maxy - miny;
            sizez = maxz - minz;

            console.log('[ ' + minx + ' , ' + maxx + ']')
            console.log('[ ' + miny + ' , ' + maxy + ']')
            console.log('[ ' + minz + ' , ' + maxz + ']')



            //individual items
            let query3 = `SELECT z FROM ${table} WHERE ${column} = ${segmentID1} `;
            let query4 = `SELECT z FROM ${table} WHERE ${column} = ${segmentID2} `;
            //            let idx;
            //            let idy;
            let idz;


            let voxels_z = [];

            console.log(query3);
            console.log(query4);


            //let key = `${idx}_${idy}_${idz}`;

            //The reference segment is projected on the Z axis at the given cell size
            //creating the Az range
            let resultados3 = await db.any(query3, {});//esperamos los resultados de la consulta con await

            let maxc_idz = 0;//always positive
            let minc_idz = Math.floor((maxz - minz) / cellsize); //higest than the rest
            //static



            //
            for (let i = 0; i < resultados3.length; i++) {

                idz = Math.floor((resultados3[i].z - minz) / cellsize);
                voxels_z[idz] = 1;//voxel occupied               
            }


            let below = false;
            let aboveCCount = 0;
            let belowCCount = 0;

            let resultados4 = await db.any(query4, {});//esperamos los resultados de la consulta con await
            //creating the C range, so the AboveC and BelowC ranges are calculated
            //for each compared point, where intersected, a min and max value are computed.



            let bCount = resultados4.length;


            for (let i = 0; i < resultados4.length; i++) {

                idz = Math.floor((resultados4[i].z - minz) / cellsize);
                if (voxels_z[idz] == 1) {

                    //computing range of C relative
                    if (idz < minc_idz) {
                        minc_idz = idz;
                    }
                    if (idz > maxc_idz) {
                        maxc_idz = idz;
                    }
                    voxels_z[idz] == 2;
                }

            }//end resultados 4


            for (let i = 0; i < resultados4.length; i++) {
                idz = Math.floor((resultados4[i].z - minz) / cellsize);

                if (idz < minc_idz) {
                    belowCCount++;
                }

                if (idz > maxc_idz) {
                    aboveCCount++;
                }
            }



            if (belowCCount < aboveCCount) {
                below = true;//the only way to produce true
            }

            let intersectsCCount = bCount - (aboveCCount + belowCCount);

            console.log(" S1 is Below S2? : " + below)

            console.log(`Counts: AboveA: ${aboveCCount}  IntersectsA: ${intersectsCCount} BelowA ${belowCCount}`)
            return below;//simple return if s1 is above s2 at a given offset
            //tal vez devolver los voxeles para visualizacio

        } catch (exception) {
            console.log(exception)
        }

    },

    /*
        Spatial/Directional operators.
        *  Given two  segments, suposedly flat, computes if S1 is above S2. 
        *  Is asumed the directionality as the Z vector.
        * 
       *   Based on Borrman concrpt for halfspace , where A defines an horizontal limit between halspace and acts as a boundari for above and below.
    
       *   All the points are projected or added to the Z axis, so a count is performed  into three segments
       
           A: Reference Segment
           B: Target SEgment
           C: Intersected vertical range between A and B. The totl number of elements is sum.
           AboveC: The vertical range  (AboveC_min_z , AboveC_max_z]  higher than Cz
           BelowC: The vertical range  [BelowC_min_z , BelowC_max_z)  lower than Cz    
    
           Sum AboveC= The total number of points or weight of the segment part above C
    
           Sum BelowC= The total number of points (or weight) of the segment part below C
    
           If Sum_AboveA > Sum_BelowB, then A is considered above B,
           False otherwise.
           C is considered as a boundary
    
               The result is an auxiliary json
               {result:true|false, operation: AaboveB, SumAbove:Number, SumC: Number, SumBelow:Number}
    
           Notes: A is considered horizontal, but if not, a wider band is created and may disrupt the numbers. 
           Finer attention could be used only at the intersected voxels, instead of the complete Reference Surface.    
    
               This can be futher refined to split vertical surfaces or others.
    
            It return a three value vector  with num of s2 points [above, intersection, below]   S1
    
            This is used by the overal directional operator above and blow
    
        * 
        * @param {*} table 
        * @param {*} segmentID1 
        * @param {*} segmentID2 
        * @param {*} column 
        * @param {*} cellsize 
        * @param {*} offset 
        * 
        * 
    
        */
    computeS1S2VerticalPositionVoxelHalfspaceFlexible: async function (table, segmentID1, segmentID2, column, cellsize, offset) {
        // things should be returned as bin, laz or las
        //las is the easiest

        /*
        console.log(" computeS1S2VerticalPositionVoxelHalfspaceFlexible(): ");
        console.log('S1:' + segmentID1)
        console.log('S2:' + segmentID2)
        console.log('column_id_ ' + column)
        console.log('cellsize ' + cellsize)
        console.log('offset ' + offset);//deoping it
*/

        //a common  bbox for hashing
        let jointquery = `SELECT min(x) minx, min(y) miny, min(z) minz,max(x) maxx,max(y) maxy,max(z) maxz ,count(*) count FROM ${table} WHERE ${column} in (${segmentID1} , ${segmentID2}) `;
        console.log(jointquery);
        let minx, miny, maxx, maxy, minz, maxz, total;

        try {
            let resultados1 = await db.any(jointquery, {});//esperamos los resultados de la consulta con await

            //solo hay un resultado
            resultados1.forEach(function (resultado_i) {

                minx = resultados1[0].minx;
                miny = resultados1[0].miny;
                minz = resultados1[0].minz;

                maxx = resultados1[0].maxx;
                maxy = resultados1[0].maxy;
                maxz = resultados1[0].maxz;

            });


            //integer aligned
            minx = Math.floor(minx);
            miny = Math.floor(miny);
            minz = Math.floor(minz);

            maxx = Math.floor(maxx);
            maxy = Math.floor(maxy);
            maxz = Math.floor(maxz);

            //no es muy relevante, pero es entero
            sizex = maxx - minx;
            sizey = maxy - miny;
            sizez = maxz - minz;
            /*
                        console.log('[ ' + minx + ' , ' + maxx + ']')
                        console.log('[ ' + miny + ' , ' + maxy + ']')
                        console.log('[ ' + minz + ' , ' + maxz + ']')
            */


            //individual items
            let query3 = `SELECT z FROM ${table} WHERE ${column} = ${segmentID1} `;
            let query4 = `SELECT z FROM ${table} WHERE ${column} = ${segmentID2} `;
            //            let idx;
            //            let idy;
            let idz;


            let voxels_z = [];

            
            console.log(query3);
            console.log(query4);


            //let key = `${idx}_${idy}_${idz}`;

            //The reference segment is projected on the Z axis at the given cell size
            //creating the Az range
            let resultados3 = await db.any(query3, {});//esperamos los resultados de la consulta con await

            let maxc_idz = 0;//always positive
            let minc_idz = Math.floor((maxz - minz) / cellsize); //higest than the rest
            //static



            //fill the voxel counter on the z value
            for (let i = 0; i < resultados3.length; i++) {

                idz = Math.floor((resultados3[i].z - minz) / cellsize);
                voxels_z[idz] = 1;//voxel occupied               
            }


            //let below = false;
            let aboveCCount = 0;
            let belowCCount = 0;

            let resultados4 = await db.any(query4, {});//esperamos los resultados de la consulta con await
            //creating the C range, so the AboveC and BelowC ranges are calculated
            //for each compared point, where intersected, a min and max value are computed.



            let bCount = resultados4.length;


            for (let i = 0; i < resultados4.length; i++) {

                idz = Math.floor((resultados4[i].z - minz) / cellsize);
                if (voxels_z[idz] == 1) {//if segment2 intersects with segment1

                    //computing min and maximum of the intersection
                    if (idz < minc_idz) {
                        minc_idz = idz;
                    }
                    if (idz > maxc_idz) {
                        maxc_idz = idz;
                    }
                    voxels_z[idz] = 2;//ya no va a entrar, porque la z ya se utilizó . Re
                }


            }//end resultados 4fs1above


            //contando cuales estan debajo y cuales ariba
            for (let i = 0; i < resultados4.length; i++) {
                idz = Math.floor((resultados4[i].z - minz) / cellsize);

                if (idz < minc_idz) {
                    belowCCount++;
                }

                if (idz > maxc_idz) {
                    aboveCCount++;
                }
            }




            let intersectsCCount = bCount - (aboveCCount + belowCCount);

            let verticalPosition = {
                s1: segmentID1, s2: segmentID2,
                abovePoints: aboveCCount, intersectionPoints: intersectsCCount, belowPoints: belowCCount
            }


            console.log(` S2 points distribution : Above:${verticalPosition.abovePoints} Intersection:${verticalPosition.intersectionPoints} Below:${verticalPosition.belowPoints} `)

            //            console.log(`Counts: AboveA: ${aboveCCount}  IntersectsA: ${intersectsCCount} BelowA ${belowCCount}`)
            return verticalPosition;//simple return if s1 is above s2 at a given offset

        } catch (exception) {
            console.log(exception)
        }

    },



    computeS1AboveS2VoxelBak: async function (table, segmentID1, segmentID2, column, cellsize, offset) {
        // things should be returned as bin, laz or las
        //las is the easiest


        console.log(" computeS1AboveS2Voxel(): ");
        console.log('S1:' + segmentID1)
        console.log('S2:' + segmentID2)
        console.log('column_id_ ' + column)
        console.log('cellsize ' + cellsize)
        console.log('offset ' + offset);//deoping it


        //a common  bbox for hashing
        let jointquery = `SELECT min(x) minx, min(y) miny, min(z) minz,max(x) maxx,max(y) maxy,max(z) maxz ,count(*) count FROM ${table} WHERE ${column} in (${segmentID1} , ${segmentID2}) `;
        console.log(jointquery);
        let minx, miny, maxx, maxy, minz, maxz, total;

        try {
            let resultados1 = await db.any(jointquery, {});//esperamos los resultados de la consulta con await

            //solo hay un resultado
            resultados1.forEach(function (resultado_i) {

                minx = resultados1[0].minx;
                miny = resultados1[0].miny;
                minz = resultados1[0].minz;

                maxx = resultados1[0].maxx;
                maxy = resultados1[0].maxy;
                maxz = resultados1[0].maxz;

            });


            //integer aligned
            minx = Math.floor(minx);
            miny = Math.floor(miny);
            minz = Math.floor(minz);

            maxx = Math.floor(maxx);
            maxy = Math.floor(maxy);
            maxz = Math.floor(maxz);

            //no es muy relevante, pero es entero
            sizex = maxx - minx;
            sizey = maxy - miny;
            sizez = maxz - minz;

            console.log('[ ' + minx + ' , ' + maxx + ']')
            console.log('[ ' + miny + ' , ' + maxy + ']')
            console.log('[ ' + minz + ' , ' + maxz + ']')



            //individual items
            let query3 = `SELECT * FROM ${table} WHERE ${column} = ${segmentID1} `;
            let query4 = `SELECT * FROM ${table} WHERE ${column} = ${segmentID2} `;
            let idx;
            let idy;
            let idz;
            let voxels_xy = [];

            console.log(query3);
            console.log(query4);


            //let key = `${idx}_${idy}_${idz}`;

            //The reference segment is onli considered on the Z axis
            let resultados3 = await db.any(query3, {});//esperamos los resultados de la consulta con await
            resultados3.forEach(function (resultado_i) {
                //console.log(resultado_i)
                idx = Math.floor((resultado_i.x - minx) / cellsize);//having a relative position
                idy = Math.floor((resultado_i.y - miny) / cellsize);
                idz = Math.floor((resultado_i.z - minz) / cellsize);
                let keyS1_xy = `${idx}_${idy}`;


                //console.log(key);
                //console.log(voxels[key] == null)

                if (voxels_xy[keyS1_xy] == null) {
                    voxels_xy[keyS1_xy] = []//se indica que es el primer objeto
                }
                voxels_xy[keyS1_xy][idz] = idz;//to identify its s1


            });


            //let intersects = false;
            let results_xy = [];
            let above = false;
            //let below=false;
            let resultados4 = await db.any(query4, {});//esperamos los resultados de la consulta con await

            //cambiar por un for
            resultados4.forEach(function (resultado_i) {
                //console.log(resultado_i)
                idx = Math.floor((resultado_i.x - minx) / cellsize);
                idy = Math.floor((resultado_i.y - miny) / cellsize);
                idz = Math.floor((resultado_i.z - minz) / cellsize);

                let keyS2_xy = `${idx}_${idy}`;
                //console.log(key);
                //console.log(voxels[key] == null)
                let xy_position = voxels_xy[keyS2_xy];
                if (xy_position != null) {//if a value exist on the same x,y vxel address, then the z value is comapred at voxel level
                    xy_position.forEach(zValue => {
                        //console.log( idz  + ' <= '+  zValue + ' ' + (idz <= zValue) )
                        if (idz <= zValue) {
                            if (idz + offset <= zValue) {
                                above = true;
                                results_xy[keyS2_xy] = 1;
                                let key = keyS2_xy.split('_');
                                console.log((idx * cellsize + minx) + '_' + (idy * cellsize + miny) + '_' + (idz * cellsize + minz));

                            }
                            //outputs the position of the cell

                        }
                    })//quick short    
                }
                else {
                    //console.log('Not intersected...')
                }



            }
            );


            let counter = 0;

            let places = Object.keys(results_xy);
            places.forEach(key => {

                counter++

            })


            console.log(" S1 is Above S2? : " + above + ' @  ' + counter)
            return above;//simple return if s1 is above s2 at a given offset
            //tal vez devolver los voxeles para visualizacio

        } catch (exception) {
            console.log(exception)
        }

    },


    /**
     *  Spatial/Directional operators.
     *  Given two flat segments, computes if S1 is higher tan S2. 
     * The basic semantic is, if at least a  % of points of S1 are higher than the voxels  of S2 with a given offset returns true.
     * False otherwise. Default percentage: 100%. Default Offset: cellsize 
     *  
     * The purpose is to describe if a plane segment is higher than  another within a relative distance regardless of their horizontal intersection.
     *
     * No plane projection is considered ,as no intersection on horizontal plane is required.
     * 
     * return  { operation: 'higherThan', s1: s1ID, s2:s2ID, result: true|false , offset: cellsize, target_percentage: 100% , higher: x%,  equal: y% , lower: z%  }
     * 
     * @param {*} table 
     * @param {*} segmentID1 
     * @param {*} segmentID2 
     * @param {*} column 
     * @param {*} cellsize 
     * @param {*} offset 
     * @param {*} percent
     * 
     * Returns a json object with various results and metrics
     * 
     *  { result: true|false , s1_z_bounds:[minS1_z, maxS1_z], s2_z_bounds:[mins2_z,maxs2_z] ,
     *       percentAbove: higher or equal than 'percent',  offset: if percentAbove == 100% ? min_s1_z - max_s1_z  : 0 otherwise,  offset: (if result is true)  }

    * Working mode, for a common bbox check if s1 voxels are higher than s2 voxels, i.e.  

    * check bboxes  to see if z1 is higher than z2  => true
    Find the minimum / maximum  value for each segment  [s1min, s1max], [s2min,s2max], 

    * otherwise, insert into z hash both segments, to find 
    [s3min,s3max]
 
    * 1 for first segment alone, 
    * 2 for segment2 alone
    * 3 if S1 and S2 are on the same z height  

    *  There are strange cases due to discrete natur that

        1 1 1 1 1 1 2 1 3 3 3 3 3 3 3 2 1 3 2 1 2 2 2 2 2 2 2 2 2 2 2 2 2 2 
    * 
    *  The meaning is count from the bottom until a different value exists, that is the % below, then count from the top to the bottom until a different value exists,that is the percentage
    * 
    *   The remaining interval is the  considered intersection
    * 
    * 
    * 
    *  
    * 
    */
    //OK done , if the highest z of s1 is higher than s2, pointwise

    computeS1HigherThanS2Voxel: async function (table, segmentID1, segmentID2, column, cellsize, offset, percent) {
        // things should be returned as bin, laz or las
        //las is the easiest


        console.log(" computeS1HigherThanS2Voxel(): ");
        console.log('S1:' + segmentID1)
        console.log('S2:' + segmentID2)
        console.log('column_id_ ' + column)
        console.log('cellsize ' + cellsize)
        console.log('offset ' + offset)
        console.log('percent ' + percent)

        let zjointbounds = `SELECT  
        min(x) minx ,max(x) maxx, 
        min(y) miny ,max(y) maxy , 
        min(z) minz ,max(z) maxz ,
        count(*) total ,
        id_rand_4 segment_id
        FROM ${table} WHERE ${column} in (${segmentID1} , ${segmentID2}) 
        group by ${column} `;

        console.log(zjointbounds);
        let minx, miny, maxx, maxy, minz, maxz, total;

        let bounds = [];



        try {
            let resultados1 = await db.any(zjointbounds, {});//esperamos los resultados de la consulta con await
            //solo hay un resultado
            resultados1.forEach(function (resultado_i) {

                console.log(resultado_i);
                bounds[resultado_i.segment_id] = {
                    minx: resultado_i.minx,
                    maxx: resultado_i.maxx,

                    miny: resultado_i.miny,
                    maxy: resultado_i.maxy,

                    minz: resultado_i.minz,
                    maxz: resultado_i.maxz,
                    total: resultado_i.total

                };

            });//enf foreach


            //integer aligned
            minx = Math.floor(Math.min(bounds[segmentID1].minx, bounds[segmentID2].minx));
            maxx = Math.ceil(Math.max(bounds[segmentID1].maxx, bounds[segmentID2].maxx));

            miny = Math.floor(Math.min(bounds[segmentID1].miny, bounds[segmentID2].miny));
            maxy = Math.ceil(Math.max(bounds[segmentID1].maxy, bounds[segmentID2].maxy));

            minz = Math.floor(Math.min(bounds[segmentID1].minz, bounds[segmentID2].minz));
            maxz = Math.ceil(Math.max(bounds[segmentID1].maxz, bounds[segmentID2].maxz));

            //no es muy relevante, pero es entero
            sizex = maxx - minx;
            sizey = maxy - miny;
            sizez = maxz - minz;

            console.log('[ ' + minx + ' , ' + maxx + ' , ' + miny + ' , ' + maxy + ' , ' + minz + ' , ' + maxz + ']')



            ////////////hasta este punto tenemos los limites individuales, pero el asunto es determinar donde se intersectan, es decir

            // s1 es mayor que s2 si

            //   s1_z_max > s2_z_max

            // lo que deja por determinar lo siguiente la relacion entre s2 y s1

            //queda saber si 

            // s2 esta  1) s1 separado de s2   2) limitrofes  3) s2 dentro del rango de s1

            // 1) ocurre si  s1_z_min > s2_z_max 
            // 2) ocurre si s1_z_min = s2_z_max & z2_z_min <= s1_z_min
            // 3)  ocurre si  s1_z_min < s2_z_min ,


            //el otro caso es si s1 no es mas alto que s2 que implica que 



            console.log('>>>>> Is  Higher Strict? :' + (bounds[segmentID1].maxz > bounds[segmentID2].maxz))


            //lo siguiente es considerarlo en modo voxel,

            //responder la pregunta es facil, solo hay que ver si en el ultimo voxel superior esta s1 o s2
            // lo otro es determinar  su grado de interseccion vertical


            //individual items
            let querys1 = `SELECT x,y,z FROM ${table} WHERE ${column} = ${segmentID1} `;
            let querys2 = `SELECT x,y,z FROM ${table} WHERE ${column} = ${segmentID2} `;
            let idx, idy, idz;
            let voxels_z = [];
            let voxels_xy = [];

            let voxels_count = [];

            console.log(querys1);
            console.log(querys2);

            let s1voxel_count = 0;
            let s2voxel_count = 0;
            let s3voxel_count = 0;


            //confronting individual results , first dunmping s1
            let resultados3 = await db.any(querys1, {});//esperamos los resultados de la consulta con await
            resultados3.forEach(function (resultado_i) {
                //console.log(resultado_i)
                idx = Math.floor((resultado_i.x - minx) / cellsize);
                idy = Math.floor((resultado_i.y - miny) / cellsize);
                idz = Math.floor((resultado_i.z - minz) / cellsize);
                let keyS1_xyz = `${idx}_${idy}_${idz}`;//to perform voxel count, at the voxel, store number of points
                let keyS1_z = idz;


                voxels_z[keyS1_z] = 1;
                if (voxels_count[keyS1_xyz] == null) {
                    voxels_count[keyS1_xyz] = 1;
                    s1voxel_count++;
                }
                //voxels_count[keyS1_xyz] = voxels_count[keyS1_xyz] + 1;//increase the counter for s1

            });

            console.log('end3')

            let resultados4 = await db.any(querys2, {});//esperamos los resultados de la consulta con await

            //cambiar por un for
            resultados4.forEach(function (resultado_i) {

                //console.log(resultado_i)
                idx = Math.floor((resultado_i.x - minz) / cellsize);
                idy = Math.floor((resultado_i.y - minz) / cellsize);
                idz = Math.floor((resultado_i.z - minz) / cellsize);


                let keyS2_xyz = `${idx}_${idy}_${idz}`;//to perform voxel count, at the voxel, store number of points
                let keyS2_z = idz;

                if (voxels_count[keyS2_xyz] == null) {
                    voxels_count[keyS2_xyz] = 2;
                    s2voxel_count++;
                }

                if (voxels_count[keyS2_xyz] == 1) {
                    voxels_count[keyS2_xyz] = 3;
                    s3voxel_count++;
                }

                //if 3, do nothing, already counted the voxel



                if (voxels_z[keyS2_z] == null) {
                    voxels_xy[keyS2_z] = 2;
                }
                if (voxels_z[keyS2_z] == 1) {
                    voxels_xy[keyS2_z] = 3;
                }



                //ahora tengo que contar cuantos voxeles son comunes y cuantos no

                //hay tres casos, pero en particular hay que contar



                /////////////////
                // hay que detecar donde empieza el segmento dos y donde el uno, que pudo hacerse desde el bbox, pero
                // lo relevante es  entregar resultados de traslape y porcentajes


                ////////////////requerimos dos pasadas, uno para detectar la interseccion y de alli restar
                let keys = Object.keys(voxels_z);
                //hayq eu revisar si no es s1

                let firstIntersectionZ;
                let lastIntersectionZ


                //for (i = 1; i < keys.length; i++) {

                //console.log(keys[i] + ' ' + voxels[keys[i]])

                //si el actual es mayor que el ultimo, es que hay interseccion y current se actualiza a 3 y

                //   if ( voxels[keys[i] == 3   ){
                //se detecta la interseccion
                //   }




                //}


            }
            );//end of for each

            console.log('end4')

            //IS S1 IS HIGHER THAN S2, THEN THE ARRAY MUST BE LIKE
            //  2 2 2 2 2 2 3 3 3 3 3 3 1 1 1 1 1 1 , OR IN PERCENTAGE    30, 40, 30
            let keys_z = Object.keys(voxels_z)



            console.log('Voxels Z length ' + voxels_z.length);




            console.log('Higher THAN Results: S1: ' + segmentID1 + ' S2: ' + segmentID2);
            console.log('Higher count: S1: ' + s1voxel_count + ' S2: ' + s2voxel_count + ' S3:' + s3voxel_count);


            console.log(" S1 is Above S2? : " + above + ' @  ' + counter);

            let results = { 'name': 's1HigherThanS2', 'result': false, bounds: [minx, maxx, miny, maxy, minz, maxz,] };


            return results;
            //simple return if s1 is above s2 at a given offset
            //tal vez devolver los voxeles para visualizacio

        } catch (exception) {
            console.log(exception)
        }

    },


    //////////////// sort segments, or at least iterae and compute all segment sizes
    //iterate over all segments and compute their absolute size in voxels, h or v,
    enumarateSegmentSizes: async function (table, column, cellsize) {
        // things should be returned as bin, laz or las
        //las is the easiest


        console.log("enumerate sizes");
        console.log('column_id_ ' + column)
        console.log('cellsie ' + cellsize)

        let sizes = [];
        let segmentsQuery = `SELECT distinct(${column}) segment_id FROM ${table} order by segment_id`;
        console.log(segmentsQuery);

        try {
            let resultados1 = await db.any(segmentsQuery, {});//esperamos los resultados de la consulta con await


            for (let i = 0; i < resultados1.length; i++) {

                let res = resultados1[i]
                sizes[res.segment_id] = await computeSegmentVoxelSpace_geom(table, res.segment_id, column, cellsize);

            }


            let keys = Object.keys(sizes)
            console.log('INSERT INTO cgeo_180209_11m_22012020_5cm_fix_orderings  (segment_id, nvoxels_020) VALUES ')
            let comma = '';
            for (i = 0; i < keys.length; i++) {
                console.log(`${comma}( ${keys[i]} , ${sizes[keys[i]]} )`);
                comma = ',';
            }
            console.log(';')


        } catch (exception) {
            console.log(exception)
        }

    },




    /**
     *  * Count the number of voxels spread across horizontal direction for a given segment. (0,..., n]
     *  ** this depends on a given direction. For vertical planes, is easy, just use the orthogonal to vertical across plane
        ** for inclined planes, also ortogonal, nut may give different results.
        * horizontal planes are not 
    * @param {*} table 
     * @param {*} segmentID1 
     * @param {*} segmentID2 
     * @param {*} column 
     * @param {*} cellsize 
     * @param {*} offset 
     */


    computeHSizeVoxel: async function (table, segmentID1, column, cellsize, vector) {
        // things should be returned as bin, laz or las
        //las is the easiest


        console.log(" computeS1AboveS2Voxel(): ");
        console.log(segmentID1)
        console.log(segmentID2)
        console.log(column)
        console.log(cellsize)
        console.log(offset)


        //let query1 = `SELECT min(x) minx,min(y) miny,min(z) minz,max(x) maxx,max(y) maxy,max(z) maxz ,count(segment) count FROM ${table} WHERE segment = ${segmentID1} `;
        //let query2 = `SELECT min(x) minx,min(y) miny,min(z) minz,max(x) maxx,max(y) maxy,max(z) maxz ,count(segment) count FROM ${table} WHERE segment = ${segmentID2} `;

        //si realmente no se tocan, es muy caro
        //se encuentra el bounding box conjunto.
        let jointquery = `SELECT min(x) minx, min(y) miny, min(z) minz,max(x) maxx,max(y) maxy,max(z) maxz ,count(*) count FROM ${table} WHERE ${column} in (${segmentID1} , ${segmentID2}) `;

        //console.log(query1);
        //console.log(query2);
        console.log(jointquery);


        let minx, miny, maxx, maxy, minz, maxz, total;

        try {
            let resultados1 = await db.any(jointquery, {});//esperamos los resultados de la consulta con await

            //solo hay un resultado
            resultados1.forEach(function (resultado_i) {

                minx = resultados1[0].minx;
                miny = resultados1[0].miny;
                minz = resultados1[0].minz;

                maxx = resultados1[0].maxx;
                maxy = resultados1[0].maxy;
                maxz = resultados1[0].maxz;

            });
            /*
                    resultados2.forEach(function (resultado_i) {
                        
                        minx = resultados[0].minx;
                        miny = resultados[0].miny;
                        minz = resultados[0].minz;
            
                        maxx = resultados[0].maxx;
                        maxy = resultados[0].maxy;
                        maxz = resultados[0].maxz;
            
                    });
            */

            //integer aligned
            minx = Math.floor(minx);
            miny = Math.floor(miny);
            minz = Math.floor(minz);

            maxx = Math.floor(maxx);
            maxy = Math.floor(maxy);
            maxz = Math.floor(maxz);

            //no es muy relevante
            sizex = maxx - minx;
            sizey = maxy - miny;
            sizez = maxz - minz;


            //individual items
            let query3 = `SELECT x,y,z FROM ${table} WHERE ${column} = ${segmentID1} `;
            let query4 = `SELECT x,y,z FROM ${table} WHERE ${column} = ${segmentID2} `;
            let idx;
            let idy;
            let idz;
            let voxels = [];
            let intvoxels = [];
            //console.log(query2);
            let resultados3 = await db.any(query3, {});//esperamos los resultados de la consulta con await
            resultados3.forEach(function (resultado_i) {
                //console.log(resultado_i)
                idx = Math.floor((resultado_i.x - minx) / cellsize);
                idy = Math.floor((resultado_i.y - miny) / cellsize);
                idz = Math.floor((resultado_i.z - minz) / cellsize);

                let key = `${idx}_${idy}_${idz}`;
                //console.log(key);
                //console.log(voxels[key] == null)

                voxels[key] = 1;//se indica que es el primer objeto

            });

            let intcounter = 0;
            let intersects = false;
            let resultados4 = await db.any(query4, {});//esperamos los resultados de la consulta con await

            resultados4.forEach(function (resultado_i) {
                //console.log(resultado_i)
                idx = Math.floor((resultado_i.x - minx) / cellsize);
                idy = Math.floor((resultado_i.y - miny) / cellsize);
                idz = Math.floor((resultado_i.z - minz) / cellsize);

                let key = `${idx}_${idy}_${idz}`;
                //console.log(key);
                //console.log(voxels[key] == null)

                if (voxels[key] == 1) {
                    //significa que ya se intersectaron y se coloca un dos, aunque deberia marcar donde se intersectan
                    voxels[key] = 3;//hay interseccion, 2 solo el modelo 2 esta alli
                    //intvoxels[]=;
                    intcounter += 1;
                    intersects = true;
                }
                if (voxels[key] == 3) {
                    //significa que ya se intersectaron y se coloca un dos, aunque deberia marcar donde se intersectan
                    intcounter += 1;
                }
                else {
                    voxels[key] = 2;
                }
            }
            );

            console.log("Intersectan: " + intersects);
            console.log("NUm Voxeles Intersectados: " + intcounter)

        } catch (exception) {
            console.log(exception)
        }

    },
    /**
     * Count the number of voxels spread across vertical direction for a given segment. (0,..., n]
     * @param {*} table 
     * @param {*} segmentID1 
     * @param {*} segmentID2 
     * @param {*} column 
     * @param {*} cellsize 
     * @param {*} offset 
     */
    computeVSizeVoxel: async function (table, segmentID1, column, cellsize) {
        // things should be returned as bin, laz or las
        //las is the easiest


        console.log(" computeVSizeVoxel(): ");
        console.log(segmentID1)
        console.log(segmentID2)
        console.log(column)
        console.log(cellsize)
        console.log(offset)


        //let query1 = `SELECT min(x) minx,min(y) miny,min(z) minz,max(x) maxx,max(y) maxy,max(z) maxz ,count(segment) count FROM ${table} WHERE segment = ${segmentID1} `;
        //let query2 = `SELECT min(x) minx,min(y) miny,min(z) minz,max(x) maxx,max(y) maxy,max(z) maxz ,count(segment) count FROM ${table} WHERE segment = ${segmentID2} `;

        //si realmente no se tocan, es muy caro
        //se encuentra el bounding box conjunto.
        let jointquery = `SELECT min(x) minx, min(y) miny, min(z) minz,max(x) maxx,max(y) maxy,max(z) maxz ,count(*) count FROM ${table} WHERE ${column} in (${segmentID1} , ${segmentID2}) `;

        //console.log(query1);
        //console.log(query2);
        console.log(jointquery);


        let minx, miny, maxx, maxy, minz, maxz, total;

        try {
            let resultados1 = await db.any(jointquery, {});//esperamos los resultados de la consulta con await

            //solo hay un resultado
            resultados1.forEach(function (resultado_i) {

                minx = resultados1[0].minx;
                miny = resultados1[0].miny;
                minz = resultados1[0].minz;

                maxx = resultados1[0].maxx;
                maxy = resultados1[0].maxy;
                maxz = resultados1[0].maxz;

            });
            /*
                    resultados2.forEach(function (resultado_i) {
                        
                        minx = resultados[0].minx;
                        miny = resultados[0].miny;
                        minz = resultados[0].minz;
            
                        maxx = resultados[0].maxx;
                        maxy = resultados[0].maxy;
                        maxz = resultados[0].maxz;
            
                    });
            */

            //integer aligned
            minx = Math.floor(minx);
            miny = Math.floor(miny);
            minz = Math.floor(minz);

            maxx = Math.floor(maxx);
            maxy = Math.floor(maxy);
            maxz = Math.floor(maxz);

            //no es muy relevante
            sizex = maxx - minx;
            sizey = maxy - miny;
            sizez = maxz - minz;


            //individual items
            let query3 = `SELECT x,y,z FROM ${table} WHERE ${column} = ${segmentID1} `;
            let query4 = `SELECT x,y,z FROM ${table} WHERE ${column} = ${segmentID2} `;
            let idx;
            let idy;
            let idz;
            let voxels = [];
            let intvoxels = [];
            //console.log(query2);
            let resultados3 = await db.any(query3, {});//esperamos los resultados de la consulta con await
            resultados3.forEach(function (resultado_i) {
                //console.log(resultado_i)
                idx = Math.floor((resultado_i.x - minx) / cellsize);
                idy = Math.floor((resultado_i.y - miny) / cellsize);
                idz = Math.floor((resultado_i.z - minz) / cellsize);

                let key = `${idx}_${idy}_${idz}`;
                //console.log(key);
                //console.log(voxels[key] == null)

                voxels[key] = 1;//se indica que es el primer objeto

            });

            let intcounter = 0;
            let intersects = false;
            let resultados4 = await db.any(query4, {});//esperamos los resultados de la consulta con await

            resultados4.forEach(function (resultado_i) {
                //console.log(resultado_i)
                idx = Math.floor((resultado_i.x - minx) / cellsize);
                idy = Math.floor((resultado_i.y - miny) / cellsize);
                idz = Math.floor((resultado_i.z - minz) / cellsize);

                let key = `${idx}_${idy}_${idz}`;
                //console.log(key);
                //console.log(voxels[key] == null)

                if (voxels[key] == 1) {
                    //significa que ya se intersectaron y se coloca un dos, aunque deberia marcar donde se intersectan
                    voxels[key] = 3;//hay interseccion, 2 solo el modelo 2 esta alli
                    //intvoxels[]=;
                    intcounter += 1;
                    intersects = true;
                }
                if (voxels[key] == 3) {
                    //significa que ya se intersectaron y se coloca un dos, aunque deberia marcar donde se intersectan
                    intcounter += 1;
                }
                else {
                    voxels[key] = 2;
                }
            }
            );

            console.log("Intersectan: " + intersects);
            console.log("NUm Voxeles Intersectados: " + intcounter)

        } catch (exception) {
            console.log(exception)
        }

    },


    /**
     * Start of a partial order operator based on specific attrbiutes
     * @param {*} table 
     * @param {*} segmentID1 
     * @param {*} segmentID1 
     * @param {*} column 
     * @param {*} cellsize 
     */
    compare: async function (table, segmentID1, segmentID1, column, cellsize) {

    },

    /**
     * The absolute height of the segment Voxelwise , i.e., the maximin z value of the voxel minus the minimu z value
     * 
     * @param {*} table 
     * @param {*} segmentID1 
     * @param {*} segmentID2 
     * @param {*} column 
     * @param {*} cellsize 
     * @param {*} offset 
     */
    computeHeightVoxel: async function (table, segmentID1, column, cellsize) {
        // things should be returned as bin, laz or las
        //las is the easiest


        console.log(" computeS1AboveS2Voxel(): ");
        console.log(segmentID1)
        console.log(segmentID2)
        console.log(column)
        console.log(cellsize)
        console.log(offset)


        //let query1 = `SELECT min(x) minx,min(y) miny,min(z) minz,max(x) maxx,max(y) maxy,max(z) maxz ,count(segment) count FROM ${table} WHERE segment = ${segmentID1} `;
        //let query2 = `SELECT min(x) minx,min(y) miny,min(z) minz,max(x) maxx,max(y) maxy,max(z) maxz ,count(segment) count FROM ${table} WHERE segment = ${segmentID2} `;

        //si realmente no se tocan, es muy caro
        //se encuentra el bounding box conjunto.
        let jointquery = `SELECT min(x) minx, min(y) miny, min(z) minz,max(x) maxx,max(y) maxy,max(z) maxz ,count(*) count FROM ${table} WHERE ${column} in (${segmentID1} , ${segmentID2}) `;

        //console.log(query1);
        //console.log(query2);
        console.log(jointquery);


        let minx, miny, maxx, maxy, minz, maxz, total;

        try {
            let resultados1 = await db.any(jointquery, {});//esperamos los resultados de la consulta con await

            //solo hay un resultado
            resultados1.forEach(function (resultado_i) {

                minx = resultados1[0].minx;
                miny = resultados1[0].miny;
                minz = resultados1[0].minz;

                maxx = resultados1[0].maxx;
                maxy = resultados1[0].maxy;
                maxz = resultados1[0].maxz;

            });
            /*
                    resultados2.forEach(function (resultado_i) {
                        
                        minx = resultados[0].minx;
                        miny = resultados[0].miny;
                        minz = resultados[0].minz;
            
                        maxx = resultados[0].maxx;
                        maxy = resultados[0].maxy;
                        maxz = resultados[0].maxz;
            
                    });
            */

            //integer aligned
            minx = Math.floor(minx);
            miny = Math.floor(miny);
            minz = Math.floor(minz);

            maxx = Math.floor(maxx);
            maxy = Math.floor(maxy);
            maxz = Math.floor(maxz);

            //no es muy relevante
            sizex = maxx - minx;
            sizey = maxy - miny;
            sizez = maxz - minz;


            //individual items
            let query3 = `SELECT x,y,z FROM ${table} WHERE ${column} = ${segmentID1} `;
            let query4 = `SELECT x,y,z FROM ${table} WHERE ${column} = ${segmentID2} `;
            let idx;
            let idy;
            let idz;
            let voxels = [];
            let intvoxels = [];
            //console.log(query2);
            let resultados3 = await db.any(query3, {});//esperamos los resultados de la consulta con await
            resultados3.forEach(function (resultado_i) {
                //console.log(resultado_i)
                idx = Math.floor((resultado_i.x - minx) / cellsize);
                idy = Math.floor((resultado_i.y - miny) / cellsize);
                idz = Math.floor((resultado_i.z - minz) / cellsize);

                let key = `${idx}_${idy}_${idz}`;
                //console.log(key);
                //console.log(voxels[key] == null)

                voxels[key] = 1;//se indica que es el primer objeto

            });

            let intcounter = 0;
            let intersects = false;
            let resultados4 = await db.any(query4, {});//esperamos los resultados de la consulta con await

            resultados4.forEach(function (resultado_i) {
                //console.log(resultado_i)
                idx = Math.floor((resultado_i.x - minx) / cellsize);
                idy = Math.floor((resultado_i.y - miny) / cellsize);
                idz = Math.floor((resultado_i.z - minz) / cellsize);

                let key = `${idx}_${idy}_${idz}`;
                //console.log(key);
                //console.log(voxels[key] == null)

                if (voxels[key] == 1) {
                    //significa que ya se intersectaron y se coloca un dos, aunque deberia marcar donde se intersectan
                    voxels[key] = 3;//hay interseccion, 2 solo el modelo 2 esta alli
                    //intvoxels[]=;
                    intcounter += 1;
                    intersects = true;
                }
                if (voxels[key] == 3) {
                    //significa que ya se intersectaron y se coloca un dos, aunque deberia marcar donde se intersectan
                    intcounter += 1;
                }
                else {
                    voxels[key] = 2;
                }
            }
            );

            console.log("Intersectan: " + intersects);
            console.log("NUm Voxeles Intersectados: " + intcounter)

        } catch (exception) {
            console.log(exception)
        }

    },




    //funcion para lws y koa
    getInfoService: async function (ctx) {

        console.log("GET getInfo");
        console.log(ctx.request.url)//mostrar la ruta completa de la peticion
        console.log(ctx.request.querystring)//el querystring pero como una cadena
        console.log(ctx.request.method)//el querystring pero como una cadena

        var parametros = ctx.request.query;//el query como un objeto

        //aqui vamos a utilizar algunos parametros

        let html = '<html><head></head><body> <h1>' +
            ' SPATIAL FUNCTIONS SERVER v.0.1<br>';
        //chafa pa mostrar funciones, porque no se como sacarlo
        register = [];
        register.push(`<a href=getConnectedSegments?segmentid=98810&cellsize=0.2> getConnectedComponents </a><br>`);
        register.push(`<a href=computeConnectedVoxelSpace?segmentid=98810&cellsize=0.2> computeSegmentVoxelSpace </a><br>`);

        //
        register.push(`<a href=computeS1AboveS2Voxel?segmentid1=23926&segmentid2=14310&cellsize=0.1&offset=0.0> computeS1AboveS2Segment  ==> FALSE</a><br>`);
        register.push(`<a href=computeS1AboveS2Voxel?segmentid1=98810&segmentid2=467002&cellsize=0.1&offset=0.0> computeS1AboveS2Segment  ==> TRUE </a><br>`);




        for (let entry in register) {
            console.log('--- ' + register[entry])
            html += register[entry] + '<br>';
        }



        html += '</hr></body>';
        ctx.body = html;
    },

    // finish module exports of spatial functions






    //intento de reparar o unir segmentos por razones arbitrarias.

    //se toma una lista de segmentos y se conserva el primer elemento como referencia
    mergeSegments: async function (segmentTable, segmentList, targetColumn, segmentColumn, attributeTable, attributeColumn) {
        //en la tabla de segmentos, hay una columna nueva id_rand_4_merged
        //los objetos mezclados contienen un id existente
        //
        //SObran dos opciones

        //2) se actualiza la tabla de atributos , como resultado de una consulta para reflejar los elementos nuevos mas grandes y 
        // los elementos absorbidos se catalogan como merged en status
        //  c2 se conserva
        // se actualizan los voxeles
        //se actualizan los bboxes
        // las interacciones se deberian de volver a actualizar reduciendo 

        console.log('Lista: ' + segmentList);
        let mainSegment = segmentList[0];
        console.log('MAIN SEGMENT ' + mainSegment + ' ' + typeof (mainSegment));
        let mergedSegments = '(';
        mergedSegments += segmentList[1];
        for (let i = 2; i < segmentList.length; i++) {
            mergedSegments += ',' + segmentList[i];
        }
        mergedSegments += ')'
        //id_rand_4_merged = id_rand_4
        //guardamos en id_rand_4_merged  = main segment
        let mergeSegmentsSQL1 = `UPDATE ${segmentTable} set ${targetColumn} = ${mainSegment} where ${segmentColumn} in ${mergedSegments};`
        let mergeSegmentsSQL2 = `UPDATE ${segmentTable} set ${targetColumn} = ${mainSegment} where ${targetColumn} in ${mergedSegments};`;//propaga lo ya modificado
        console.log(mergeSegmentsSQL1);
        console.log(mergeSegmentsSQL2);

        await db.any(mergeSegmentsSQL1, {});
        await db.any(mergeSegmentsSQL2, {});


        console.log('*************************************************\n');
        let statusColumn = 'status';
        //para actualizar la tabla de atributos ocurre lo siguiente
        // nos interesa borrar los elementos mezclados y actualizar el segmento receptor
        let updateSegmentAttributesSQL = `
        with bbox as (select min(x) minx, min(y) miny, min(z) minz, max(x) maxx, max(y) maxy, max(z) maxz , count(*) npoints  from ${segmentTable} where ${segmentColumn}=${mainSegment})
        UPDATE ${attributeTable} set minx=bbox.minx, miny=bbox.miny , minz=bbox.minz ,maxx=bbox.maxx ,maxy=bbox.maxy ,  maxz=bbox.maxz , nvoxels_020=v_v8_voxelcount('${segmentTable}','${segmentColumn}', ${mainSegment}, 0.2  )  from bbox where ${attributeColumn} = ${mainSegment};`

        //console.log(updateSegmentAttributesSQL);

        await db.any(updateSegmentAttributesSQL, {});

    },

    /**
     * For a given segmentID a new class is assigned and propagated to the attribute table
     */
    changeSegmentClass: async function (segmentID, newSegmentClass,
        segmentTable, segmentColumn, classColumn,
        attributeTable, attributeSegmentColumn, attributeClassColumn) {

        let updateClassSegmentSQL = `UPDATE ${segmentTable} set ${classColumn} = ${newSegmentClass} where ${segmentColumn} = ${segmentID};`
        let updateAttributeClassSegmentSQL = `UPDATE ${attributeTable} set ${attributeClassColumn} = ${newSegmentClass} where ${attributeSegmentColumn} = ${segmentID};`

        console.log(updateClassSegmentSQL);
        console.log(updateAttributeClassSegmentSQL);

        await db.any(updateClassSegmentSQL, {});
        await db.any(updateAttributeClassSegmentSQL, {});

    }


    /**
     *   //compute the ransac of two planes, so the normal and plane points are available
        //compute the intersection line
        //propose a segment based on the intersection

        //  ********************-------------***************s

        // maybe fix the underlying plane

     */
    ,
    compute2PlaneIntersectionSegment: async function (segmentID1, segmentID2, ransacTrials, planeTolerance,
        segmentTable, segmentColumn
    ) {
        let x = 0;
        let y = 1;
        let z = 2;

        console.log(`*****************************************************************`);
        console.log(`*****************************************************************`);
        console.log(`*****************************************************************`);
        console.log(`*****************************************************************`);

        console.log(`SPATIAL_FUNTIONS.compute2PlaneIntersectionSegment`);

        console.log('-----------------------------------------------------------------------------------------------------')
        let segment1 = await spatialFunctions.getSegmentXYZ(segmentTable, segmentColumn, segmentID1, {},);//arrays
        console.log('-----------------------------------------------------------------------------------------------------')
        let segment2 = await spatialFunctions.getSegmentXYZ(segmentTable, segmentColumn, segmentID2, {},);
        console.log('-----------------------------------------------------------------------------------------------------')

        console.log(`Segment 1: ${segmentID1} #points: ${segment1.length}`);
        console.log(`Segment 2: ${segmentID1} #points: ${segment2.length}`);

        //TAKE A COMMON RANDOM POINT AS ORIGIN FOR ZERO TRANSLATION, 


        let porigin1 = parseInt(Math.random() * segment1.length);
        let origin1 = segment1[porigin1]
        console.log(`Taking a Segment1: ${origin1}  random point as offset Reference`)
        console.log(origin1)

        //creating the own offset for segment2
        let porigin2 = parseInt(Math.random() * segment2.length);
        let origin2 = segment2[porigin2]
        console.log(`Taking a Segment2: ${origin2}  random point as offset Reference`)
        console.log(origin2)



        /////////////
        //translating to zero around named origin, a common point
        let movetozero = false;
        console.log(`Translating segments around zero`)
        if (movetozero) {
            for (let i = 0; i < segment1.length; i++) {
                segment1[i] = [
                    (segment1[i][0] - origin1[0]),
                    (segment1[i][1] - origin1[1]),
                    (segment1[i][2] - origin1[2])]
            }
            ///////////////////// moving both segments to zero for computations
            for (let i = 0; i < segment2.length; i++) {
                segment2[i] = [
                    (segment2[i][0] - origin2[0]),
                    (segment2[i][1] - origin2[1]),
                    (segment2[i][2] - origin2[2])]
            }

        }



        ////////////////ransac for plane 1
        console.log('-----------------------------------------------------------------------------------------------------')
        //ransac done at 
        console.log('Computing ransac plane ' + segmentID1)
        //debo revisar si requiere que los puntos sean trasladados al origen, pero creo que para cada interacion se require ese cambio
        //los puntos no requiren transladarse al origen porque lo hacen en cada calculo de distancia  de punto a plano.

        //por eso los puntos de rplane seran en coordenadas globales.
        let rplane1 = await spatialFunctions.findRansacPlane(segment1, planeTolerance, ransacTrials, true);
        console.log('PLANE');
        console.log(rplane1);
        console.log('NORMAL');
        console.log(mathf3d.getOrthogonalVector2Plane(rplane1.p0, rplane1.p1, rplane1.p2));
        console.log('CENTER COORDINATE');
        console.log(rplane1.origin);//revisar este dato, no esta bien, debia ser el punto de origen del plano o p0

        /*
                console.log(`drawPlane(
                     [${origin1[0] + rplane1.origin[0]} , ${origin1[1] + rplane1.origin[1]} , ${origin1[2] + rplane1.origin[2]}] ,
                     [${rplane1.p0}],
                     [${rplane1.p1}],
                     [${rplane1.p2}],
                     10)`
                );//revisar el origen
        */
        //origin point and three points over the plane
        console.log(`drawPlane(
            [${rplane1.origin[0]} , ${rplane1.origin[1]} , ${rplane1.origin[2]}] ,
            [${rplane1.p0}],
            [${rplane1.p1}],
            [${rplane1.p2}],
            10)`
        );//revisar el origen


        console.log(rplane1.histogram)

        ////////////////ransac for plane 2
        console.log('-----------------------------------------------------------------------------------------------------')

        console.log('Computing ransac plane ' + segmentID2)
        let rplane2 = await spatialFunctions.findRansacPlane(segment2, planeTolerance, ransacTrials, true);
        console.log('PLANE');
        console.log(rplane2);
        console.log('NORMAL');
        console.log(mathf3d.getOrthogonalVector2Plane(rplane2.p0, rplane2.p1, rplane2.p2));
        console.log('CENTER COORDINATE');
        console.log(rplane2.origin);//revisar este dato, no esta bien

        console.log(`drawPlane(
            [${rplane2.origin[0]} , ${rplane2.origin[1]} , ${rplane2.origin[2]}] ,
            [${rplane2.p0}],
            [${rplane2.p1}],
            [${rplane2.p2}],
            10)`
        );//revisar el origen        console.log(rplane2.histogram)


        ///////////////////////////////////

        console.log('------- 2 PLANES INTERSECTION----------------------------')
        //requires two points within the plane and their normals

        //taking any point from the ransac plane found, p0 ussually


        //realmente no se require que se normalizen, pero habra que ver como hacerlo si nomver a cero

        ///////////////////
        //los puntos son puntos en worldcoordinates o local
        /*
         let P1 = {
             x: origin1[0] + rplane1.p0[0],
             y: origin1[1] + rplane1.p0[1],
             z: origin1[2] + rplane1.p0[2]
         };
 
 
         let P2 = {
             x: origin2[0] + rplane2.p0[0],
             y: origin2[0] + rplane2.p0[1],
             z: origin2[0] + rplane2.p0[2]
         };
 */
        let P1 = {
            x: rplane1.p0[0],
            y: rplane1.p0[1],
            z: rplane1.p0[2]
        };


        let P2 = {
            x: rplane2.p0[0],
            y: rplane2.p0[1],
            z: rplane2.p0[2]
        };

        //wrong, must be planes
        console.log('POint1')
        console.log(P1)
        console.log('POint2')
        console.log(P2)

        //copmuting normal to each plane, esto puede estar mal

        let n1 = mathf3d.getOrthogonalVector2Plane(rplane1.p0, rplane1.p1, rplane1.p2);
        let n2 = mathf3d.getOrthogonalVector2Plane(rplane2.p0, rplane2.p1, rplane2.p2);

        //uppercase is object, lowercase is array

        let N1 = { x: n1[0], y: n1[1], z: n1[2] };
        let N2 = { x: n2[0], y: n2[1], z: n2[2] };
        console.log('N1')
        console.log(N1)
        console.log('N2')
        console.log(N2)

        console.log('Plane Normals N1 N2 at P1');
        console.log(`drawLine(${P1.x},${P1.y},${P1.z},${N1.x},${N1.y},${N1.z},5,0x0000ff);`)
        console.log(`drawLine(${P1.x},${P1.y},${P1.z},${N2.x},${N2.y},${N2.z},5,0x00ff00);`)
        //        ${P2.x},${P2.y},${P2.z},
        console.log('Plane Normals N1 N2 at P2');
        console.log(`drawLine(${P2.x},${P2.y},${P2.z},${N1.x},${N1.y},${N1.z},5,0x0000ff);`)
        console.log(`drawLine(${P2.x},${P2.y},${P2.z},${N2.x},${N2.y},${N2.z},5,0x00ff00);`)



        //returns a point object
        ////////////////////// points are in world coordinates. 
        //I had an issue , points are not enough, plane must be passed

        //        intersection = mathf3d.compute2PlanesIntersection(P1, P2, N1, N2)
        intersection = mathf3d.computePlanesIntersection(rplane1, rplane2, N1, N2)

        //intersection is made of   intersection={point:{}, direction:{}}

        //        console.log("Intersection Point @ line: >> " + intersection.point.x + " , " + intersection.point.y + " , " + intersection.point.z);

        //el punto es relatico al punto de origen
        //        console.log
        //        intersection.point.x+=rplane1.origin.x;
        //        intersection.point.y+=rplane1.origin.y;
        //        intersection.point.z+=rplane1.origin.z;

        console.log("Intersection Point @ line: >> " + intersection.IntersectionPoint[x] + " , " + intersection.IntersectionPoint[y] + " , " + intersection.IntersectionPoint[z]);

        console.log("Direction Vector @ line: >> " + intersection.Direction[x] + " , " + intersection.Direction[y] + " , " + intersection.Direction[z]);
        console.log(`drawLine(${intersection.IntersectionPoint[x]} ,${intersection.IntersectionPoint[y]} ,${intersection.IntersectionPoint[z]} ,
            ${intersection.Direction[x]} , ${intersection.Direction[y]} , ${intersection.Direction[z]},100,0x00ffff);`)

        //esta mal, debe obtenerse de la inerseccion
        console.log(`drawTriangle(
            [${intersection.P1[x]}, ${intersection.P1[y]} , ${intersection.P1[z]}] ,
            [${intersection.P2[x]} , ${intersection.P2[y]} , ${intersection.P2[z]}] ,
            [${intersection.IntersectionPoint[x]} ,${intersection.IntersectionPoint[y]} ,${intersection.IntersectionPoint[z]}] );`
        );


        return intersection;//point and vector

    },


    compute2PlaneIntersectionSegmentBak: async function (segmentID1, segmentID2, ransacTrials, planeTolerance,
        segmentTable, segmentColumn
    ) {
        let x = 0;
        let y = 1;
        let z = 2;

        console.log(`*****************************************************************`);
        console.log(`*****************************************************************`);
        console.log(`*****************************************************************`);
        console.log(`*****************************************************************`);

        console.log(`SPATIAL_FUNTIONS.compute2PlaneIntersectionSegment`);

        console.log('-----------------------------------------------------------------------------------------------------')
        let segment1 = await spatialFunctions.getSegmentXYZ(segmentTable, segmentColumn, segmentID1, {},);//arrays
        console.log('-----------------------------------------------------------------------------------------------------')
        let segment2 = await spatialFunctions.getSegmentXYZ(segmentTable, segmentColumn, segmentID2, {},);
        console.log('-----------------------------------------------------------------------------------------------------')

        console.log(`Segment 1: ${segmentID1} #points: ${segment1.length}`);
        console.log(`Segment 2: ${segmentID1} #points: ${segment2.length}`);

        //TAKE A COMMON RANDOM POINT AS ORIGIN FOR ZERO TRANSLATION, 


        let porigin1 = parseInt(Math.random() * segment1.length);
        let origin1 = segment1[porigin1]
        console.log(`Taking a Segment1: ${origin1}  random point as offset Reference`)
        console.log(origin1)

        //creating the own offset for segment2
        let porigin2 = parseInt(Math.random() * segment2.length);
        let origin2 = segment2[porigin2]
        console.log(`Taking a Segment2: ${origin2}  random point as offset Reference`)
        console.log(origin2)



        /////////////
        //translating to zero around named origin, a common point
        let movetozero = false;
        console.log(`Translating segments around zero`)
        if (movetozero) {
            for (let i = 0; i < segment1.length; i++) {
                segment1[i] = [
                    (segment1[i][0] - origin1[0]),
                    (segment1[i][1] - origin1[1]),
                    (segment1[i][2] - origin1[2])]
            }
            ///////////////////// moving both segments to zero for computations
            for (let i = 0; i < segment2.length; i++) {
                segment2[i] = [
                    (segment2[i][0] - origin2[0]),
                    (segment2[i][1] - origin2[1]),
                    (segment2[i][2] - origin2[2])]
            }

        }



        ////////////////ransac for plane 1
        console.log('-----------------------------------------------------------------------------------------------------')
        //ransac done at 
        console.log('Computing ransac plane ' + segmentID1)
        //debo revisar si requiere que los puntos sean trasladados al origen, pero creo que para cada interacion se require ese cambio
        //los puntos no requiren transladarse al origen porque lo hacen en cada calculo de distancia  de punto a plano.

        //por eso los puntos de rplane seran en coordenadas globales.
        let rplane1 = await spatialFunctions.findRansacPlane(segment1, planeTolerance, ransacTrials, true);
        console.log('PLANE');
        console.log(rplane1);
        console.log('NORMAL');
        console.log(mathf3d.getOrthogonalVector2Plane(rplane1.p0, rplane1.p1, rplane1.p2));
        console.log('CENTER COORDINATE');
        console.log(rplane1.origin);//revisar este dato, no esta bien, debia ser el punto de origen del plano o p0

        /*
                console.log(`drawPlane(
                     [${origin1[0] + rplane1.origin[0]} , ${origin1[1] + rplane1.origin[1]} , ${origin1[2] + rplane1.origin[2]}] ,
                     [${rplane1.p0}],
                     [${rplane1.p1}],
                     [${rplane1.p2}],
                     10)`
                );//revisar el origen
        */
        //origin point and three points over the plane
        console.log(`drawPlane(
            [${rplane1.origin[0]} , ${rplane1.origin[1]} , ${rplane1.origin[2]}] ,
            [${rplane1.p0}],
            [${rplane1.p1}],
            [${rplane1.p2}],
            10)`
        );//revisar el origen


        console.log(rplane1.histogram)

        ////////////////ransac for plane 2
        console.log('-----------------------------------------------------------------------------------------------------')

        console.log('Computing ransac plane ' + segmentID2)
        let rplane2 = await spatialFunctions.findRansacPlane(segment2, planeTolerance, ransacTrials, true);
        console.log('PLANE');
        console.log(rplane2);
        console.log('NORMAL');
        console.log(mathf3d.getOrthogonalVector2Plane(rplane2.p0, rplane2.p1, rplane2.p2));
        console.log('CENTER COORDINATE');
        console.log(rplane2.origin);//revisar este dato, no esta bien

        console.log(`drawPlane(
            [${rplane2.origin[0]} , ${rplane2.origin[1]} , ${rplane2.origin[2]}] ,
            [${rplane2.p0}],
            [${rplane2.p1}],
            [${rplane2.p2}],
            10)`
        );//revisar el origen        console.log(rplane2.histogram)


        ///////////////////////////////////

        console.log('------- 2 PLANES INTERSECTION----------------------------')
        //requires two points within the plane and their normals

        //taking any point from the ransac plane found, p0 ussually


        //realmente no se require que se normalizen, pero habra que ver como hacerlo si nomver a cero

        ///////////////////
        //los puntos son puntos en worldcoordinates o local
        /*
         let P1 = {
             x: origin1[0] + rplane1.p0[0],
             y: origin1[1] + rplane1.p0[1],
             z: origin1[2] + rplane1.p0[2]
         };
 
 
         let P2 = {
             x: origin2[0] + rplane2.p0[0],
             y: origin2[0] + rplane2.p0[1],
             z: origin2[0] + rplane2.p0[2]
         };
 */
        let P1 = {
            x: rplane1.p0[0],
            y: rplane1.p0[1],
            z: rplane1.p0[2]
        };


        let P2 = {
            x: rplane2.p0[0],
            y: rplane2.p0[1],
            z: rplane2.p0[2]
        };

        //wrong, must be planes
        console.log('POint1')
        console.log(P1)
        console.log('POint2')
        console.log(P2)

        //copmuting normal to each plane

        let n1 = mathf3d.getOrthogonalVector2Plane(rplane1.p0, rplane1.p1, rplane1.p2);
        let n2 = mathf3d.getOrthogonalVector2Plane(rplane2.p0, rplane2.p1, rplane2.p2);

        //uppercase is object, lowercase is array

        let N1 = { x: n1[0], y: n1[1], z: n1[2] };
        let N2 = { x: n2[0], y: n2[1], z: n2[2] };
        console.log('N1')
        console.log(N1)
        console.log('N2')
        console.log(N2)

        console.log('Plane Normals N1 N2');
        console.log(`drawLine(${P1.x},${P1.y},${P1.z},${N1.x},${N1.y},${N1.z},5);`)
        console.log(`drawLine(${P2.x},${P2.y},${P2.z},${N2.x},${N2.y},${N2.z},5);`)

        //returns a point object
        ////////////////////// points are in world coordinates. 
        //I had an issue , points are not enough, plane must be passed

        //        intersection = mathf3d.compute2PlanesIntersection(P1, P2, N1, N2)
        intersection = mathf3d.computePlanesIntersection(rplane1, rplane2, N1, N2)

        //intersection is made of   intersection={point:{}, direction:{}}

        //        console.log("Intersection Point @ line: >> " + intersection.point.x + " , " + intersection.point.y + " , " + intersection.point.z);

        //el punto es relatico al punto de origen
        //        console.log
        //        intersection.point.x+=rplane1.origin.x;
        //        intersection.point.y+=rplane1.origin.y;
        //        intersection.point.z+=rplane1.origin.z;

        console.log("Intersection Point @ line: >> " + intersection.IntersectionPoint[x] + " , " + intersection.IntersectionPoint[y] + " , " + intersection.IntersectionPoint[z]);

        console.log("Direction Vector @ line: >> " + intersection.Direction[x] + " , " + intersection.Direction[y] + " , " + intersection.Direction[z]);
        console.log(`drawLine(${intersection.IntersectionPoint[x]} ,${intersection.IntersectionPoint[y]} ,${intersection.IntersectionPoint[z]} ,
            ${intersection.Direction[x]} , ${intersection.Direction[y]} , ${intersection.Direction[z]},100);`)

        //esta mal, debe obtenerse de la inerseccion
        console.log(`drawTriangle(
            [${intersection.P1[x]}, ${intersection.P1[y]} , ${intersection.P1[z]}] ,
            [${intersection.P2[x]} , ${intersection.P2[y]} , ${intersection.P2[z]}] ,
            [${intersection.IntersectionPoint[x]} ,${intersection.IntersectionPoint[y]} ,${intersection.IntersectionPoint[z]}] );`
        );


        return intersection;//point and vector

    }



}

module.exports = { spatialFunctions }

