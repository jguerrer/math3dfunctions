
//start date:   16/06/2021
//npx lws --stack  lws-body-parser lws-static lws-cors spatial_functions_server.js   -p 8001

console.log('SPATIAL FUNCTIONS SERVER V0.1');
console.log('A collection of spatial operators basedon web services, Js and storage on Postgres/PGpointcloud. ');
console.log('Results are: true/false , numerical, or another pointcloud. Outputs can be further stored back.');

console.log('At this point, objects are stored either as a 1)  PGPoint Cloud table or a 2) plain xyz table or 3) geometry table');
console.log('Signatures on the functions denote the actual data source');
console.log('Server is implementd on KOA, LWS  and plugins');
console.log('V0.1');



//codigo de conexion con PGPROMISE
const { spatialFunctions } = require('./spatial_functions')

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
//const { GPU } = require('gpu.js');
//const gpu = new GPU();

//var fsout = require('file-system');
//const { max } = require('ramda');
//const { off } = require('process');
//const { json, null } = require('mathjs');

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

//let dbconnection = connection;
//const db = pgp(dbconnection);


/** 
 * Spatial functions are pointwise (P) and voxelwise  (VX), but always between a collection of points sharing the same SegmentID
 * 
 * Basic operations to describe objects interactions are involve  Meet (M)   Touch (T) Intersects (I)
 * 
 * Directional Operations also describe interactions on a given direction, requiring a canonical orientation.
 * Above Object, Below Object,  Above Height, Below Height  
 * 
 * Structuring functions and datastructures are required to store and model the actual objects based on rules/relationships
 * Datastructures are graph based and functions include  AddNode(), setParent(), removeParent(), addChildren(), removeChildren()
 * 
 * The most relevant functions are the PArtial Order Relationships, which require an ordering function. 
 * 
 * The idea is to have several ordering functions which can help to describe/order and structure objects.
 * Size: As planes are the basic modeling item, it is based on the actual enclosing BBOX, Area or Convexhull (2D) embedded in (3d)
 * 
 * Height: Planes have a minimum and maximum z value. Connected version orders the connected planes given a height.
 * 
 * Distance, from a given plane. Traversing via BFS te set of connected planes, a mix of distance is used to distinguish  the distance of each.
 * 
 * --- A first implementation is the traversing BFS function, based on conecctedness  and a tolerance.
 * 
*/


/////////////////

/*
const cellify = gpu.createKernel(function (a, min, cellsize) {
    let mat = 0;//el objeto de regreso
    //mat=0;
    mat = Math.floor((a[this.thread.x] - min) / cellsize);//this requires to be created as an array and integer

    return mat;
});


*/

let serverSpatialFunctions = {
    //register: [],



    querySegmentByCoordinatesService: async function (ctx) {

        console.log("-------------------------------");

        console.log("GET querySegmentByCoordinatesService");
        console.log('URL: ' + ctx.request.url)//mostrar la ruta completa de la peticion
        console.log('QUERY STRING: ' + ctx.request.querystring);//el querystring pero como una cadena
        console.log('METHOD: ' + ctx.request.method)//el querystring pero como una cadena

        var parametros = ctx.request.query;//el query como un objeto
        console.log(parametros);
        //aqui vamos a utilizar algunos parametros

        Object.keys(parametros).forEach(element => {
            console.log(parametros[element])

        });
        //    console.log(ctx)

        if (parametros.length == 0) {
            ctx.body = 'No parameters...   use segmentid=xxx'
            return;
        }


        //data is truncated to two decimals, so fix it

        let x = parametros['x'];
        let y = parametros['y'];
        let z = parametros['z'];
        let xColumn = 'x';
        let yColumn = 'y';
        let zColumn = 'z';

        let decimals = 2;

        let table = parametros['source'];
        let columnID = parametros['columnid'];
        let classID = parametros['classid'];


        config = { table: table, segmentColumn: columnID };
        let results = await spatialFunctions.querySegmentByCoordinates(config.table, config.segmentColumn, xColumn, yColumn, zColumn, x, y, z, decimals, 0);
        //refer to measure panel for quick implementation over the query button

        ctx.body = JSON.stringify(results);
        //{ 'segmentid1': s1, 'segmentid2': s2, 's1_above_s2': results, 'offset': offset };
    },

   
    /**
     * Variant to compute normal based on ransac estimation.
     * @param {*} ctx 
     * @returns 
     */
     querySegmentRANSACNormalAtCoordinatesServiceBAD: async function (ctx) {

        console.log("-------------------------------");

        console.log("GET querySegmentRANSACNormalAtCoordinatesService");
        console.log('URL: ' + ctx.request.url)//mostrar la ruta completa de la peticion
        console.log('QUERY STRING: ' + ctx.request.querystring);//el querystring pero como una cadena
        console.log('METHOD: ' + ctx.request.method)//el querystring pero como una cadena

        var parametros = ctx.request.query;//el query como un objeto
        console.log(parametros);
        //aqui vamos a utilizar algunos parametros

        Object.keys(parametros).forEach(element => {
            console.log(parametros[element])

        });
        //    console.log(ctx)

        if (parametros.length == 0) {
            ctx.body = 'No parameters...   use segmentid=xxx'
            return;
        }


        //data is truncated to two decimals, so fix it

        let x = parametros['x'];
        let y = parametros['y'];
        let z = parametros['z'];
        let xColumn = 'x';
        let yColumn = 'y';
        let zColumn = 'z';

        let table= parametros['source'];
        let columnid= parametros['columnid'];
        let classid= parametros['classid'];


        let decimals = 2;
        //        config = { table: 'cgeo_180209_11m_22012020_5cm_fix_segmented', segmentColumn: 'id_rand_4_merged' };
        config = {
            table: table,
            column: columnid,
            maxDist: 0.10,
            maxIterations: 10000
           // segmentID: 242133
        };

        let segments = await spatialFunctions.querySegmentByCoordinates(config.table, config.column, xColumn, yColumn, zColumn, x, y, z, decimals, 0);
        console.log('SEGMENT BY COORDIANTES')
        console.log(segments)
        //refer to measure panel for quick implementation over the query button

        //////////////////hasta aqui obtuve el numero de segmento


        /////////////ransac section
        if (segments.segments.length == 0) {
            return;
        }
        config.segmentID = segments.segments[0];

        //get all points in a segment
        let results = await spatialFunctions.getSegmentXYZ(config.table, config.column, config.segmentID, {},);
        //console.log(results);

        console.log(results.length);

        //debia tomar un aleatorio

        let porigin = parseInt(Math.random() * results.length);

        let origin = results[porigin]

        /////////////
        //translating
        let movetozero = true;
        if (movetozero) {
            for (let i = 0; i < results.length; i++) {
                //results[i][0] = (results[i][0] - origin[0]);
                //results[i][1] = (results[i][1]- origin[1]);
                //results[i][2] = (results[i][2] - origin[2]);


                results[i] = [
                    (results[i][0] - origin[0]),
                    (results[i][1] - origin[1]),
                    (results[i][2] - origin[2])]
            }
        }

        //this funcion is table independant
        let rplane = await spatialFunctions.findRansacPlane(results, config.maxDist, config.maxIterations);
        console.log('NORMAL');
        let normal = mathf3d.getOrthogonalVector2Plane(rplane.p0, rplane.p1, rplane.p2);
        console.log(normal)

        rplane['normal'] = normal;
        let bestIndex = rplane.index;
        rplane['origin'] = [results[bestIndex][0] + origin[0], results[bestIndex][1] + origin[1], results[bestIndex][2] + origin[2]];

        console.log('POSITION');
        console.log(origin);

        console.log('PLANE');
        console.log(rplane);



        console.log(`drawPlane([${origin}] , [${rplane.p0}],[${rplane.p1}],[${rplane.p2}],10)`)
        console.log(rplane.histogram)
        //tendria que mostrar
        ctx.body = JSON.stringify(rplane);//toto para dibujar un plano y la normal
        //{ 'segmentid1': s1, 'segmentid2': s2, 's1_above_s2': results, 'offset': offset };
    },




    /**
     * Variant to compute normal based on ransac estimation.
     * @param {*} ctx 
     * @returns 
     */
    querySegmentRANSACNormalAtCoordinatesService: async function (ctx) {

        console.log("-------------------------------");

        console.log("GET querySegmentRANSACNormalAtCoordinatesService");
        console.log('URL: ' + ctx.request.url)//mostrar la ruta completa de la peticion
        console.log('QUERY STRING: ' + ctx.request.querystring);//el querystring pero como una cadena
        console.log('METHOD: ' + ctx.request.method)//el querystring pero como una cadena

        var parametros = ctx.request.query;//el query como un objeto
        console.log(parametros);
        //aqui vamos a utilizar algunos parametros

        Object.keys(parametros).forEach(element => {
            console.log(parametros[element])

        });
        //    console.log(ctx)

        if (parametros.length == 0) {
            ctx.body = 'No parameters...   use segmentid=xxx'
            return;
        }


        //data is truncated to two decimals, so fix it

        let x = parametros['x'];
        let y = parametros['y'];
        let z = parametros['z'];
        let xColumn = 'x';
        let yColumn = 'y';
        let zColumn = 'z';

        let table= parametros['source'];
        let columnid= parametros['columnid'];
        let classid= parametros['classid'];


        let decimals = 2;
        //        config = { table: 'cgeo_180209_11m_22012020_5cm_fix_segmented', segmentColumn: 'id_rand_4_merged' };
        config = {
            table: table,
            column: columnid,
            maxDist: 0.10,
            maxIterations: 2000
           // segmentID: 242133
        };

        let segments = await spatialFunctions.querySegmentByCoordinates(config.table, config.column, xColumn, yColumn, zColumn, x, y, z, decimals, 0);
        console.log('SEGMENT BY COORDIANTES')
        console.log(segments)
        //refer to measure panel for quick implementation over the query button

        //////////////////hasta aqui obtuve el numero de segmento


        /////////////ransac section
        if (segments.segments.length == 0) {
            return;
        }
        config.segmentID = segments.segments[0];

        //get all points in a segment
        let results = await spatialFunctions.getSegmentXYZ(config.table, config.column, config.segmentID, {},);
        //console.log(results);

        console.log(results.length);

        //debia tomar un aleatorio

        let porigin = parseInt(Math.random() * results.length);

        let origin = results[porigin]

        /////////////
        //translating
        let movetozero = true;
        if (movetozero) {
            for (let i = 0; i < results.length; i++) {
                //results[i][0] = (results[i][0] - origin[0]);
                //results[i][1] = (results[i][1]- origin[1]);
                //results[i][2] = (results[i][2] - origin[2]);


                results[i] = [
                    (results[i][0] - origin[0]),
                    (results[i][1] - origin[1]),
                    (results[i][2] - origin[2])]
            }
        }

        //this funcion is table independant
        let rplane = await spatialFunctions.findRansacPlane(results, config.maxDist, config.maxIterations);
        console.log('NORMAL');
        let normal = mathf3d.getOrthogonalVector2Plane(rplane.p0, rplane.p1, rplane.p2);
        console.log(normal)

        rplane['normal'] = normal;
        let bestIndex = rplane.index;
        rplane['origin'] = [results[bestIndex][0] + origin[0], results[bestIndex][1] + origin[1], results[bestIndex][2] + origin[2]];

        console.log('POSITION');
        console.log(origin);

        console.log('PLANE');
        console.log(rplane);



        console.log(`drawPlane([${origin}] , [${rplane.p0}],[${rplane.p1}],[${rplane.p2}],10)`)
        console.log(rplane.histogram)
        //tendria que mostrar
        ctx.body = JSON.stringify(rplane);//toto para dibujar un plano y la normal
        //{ 'segmentid1': s1, 'segmentid2': s2, 's1_above_s2': results, 'offset': offset };
    },

    /**
     * Variant to compute normal based on ransac estimation.
     * @param {*} ctx 
     * @returns 
     */
    querySegmentsIntersectionLineService: async function (ctx) {

        console.log("-------------------------------");

        console.log("GET querySegmentsIntersectionLineService");
        console.log('URL: ' + ctx.request.url)//mostrar la ruta completa de la peticion
        console.log('QUERY STRING: ' + ctx.request.querystring);//el querystring pero como una cadena
        console.log('METHOD: ' + ctx.request.method)//el querystring pero como una cadena

        var parametros = ctx.request.query;//el query como un objeto
        console.log(parametros);
        //aqui vamos a utilizar algunos parametros

        Object.keys(parametros).forEach(element => {
            console.log(parametros[element])

        });
        //    console.log(ctx)

        if (parametros.length == 0) {
            ctx.body = 'No parameters...   use segmentid=xxx'
            return;
        }

        let segment1 = parametros['segment1'];
        let segment2 = parametros['segment2'];


        // let decimals = 2;
        //        config = { table: 'cgeo_180209_11m_22012020_5cm_fix_segmented', segmentColumn: 'id_rand_4_merged' };
        config = {
            table: 'cgeo_180209_11m_22012020_5cm_fix_segmented',
            column: 'id_rand_4_merged',
            maxDist: 0.05,
            maxIterations: 10000,
            segmentID: 242133
        };
        //taking two segments from a table and find the intersection line/segment
        let intersection = await spatialFunctions.compute2PlaneIntersectionSegment(
            segment1,
            segment2,
            config.maxIterations,
            config.maxDist,
            config.table,
            config.column);

        console.log(`DONE COMPUTING INTERSECTION`);

        console.log(`Planes intersect @ ${intersection.point.x} , ${intersection.point.y}, ${intersection.point.z}      
        Normal:${intersection.direction.x} , ${intersection.direction.y} , ${intersection.direction.z}`);



        //necesitamos 

        //  console.log(`drawPlane([${origin}] , [${rplane.p0}],[${rplane.p1}],[${rplane.p2}],10)`)
        ctx.body = JSON.stringify(intersection);//linea de interseccion anclada a la interseccion

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
        register.push(`<a href=querySegmentsIntersectionLine?segment1=98810&segment2=467002> querySegmentsIntersectionLine   </a><br>`);




        for (let entry in register) {
            console.log('--- ' + register[entry])
            html += register[entry] + '<br>';
        }

        console.log(this)

        html += '</hr></body>';
        ctx.body = html;
    },

    // finish module exports of spatial functions

    //http://127.0.0.1:8002/getConnectedComponents?segmentid=417380
    getConnectedSegmentsService: async function (ctx) {

        console.log("-------------------------------");

        console.log("GET getConnectedSegmentsService");
        console.log('URL: ' + ctx.request.url)//mostrar la ruta completa de la peticion
        console.log('QUERY STRING: ' + ctx.request.querystring);//el querystring pero como una cadena
        console.log('METHOD: ' + ctx.request.method)//el querystring pero como una cadena

        var parametros = ctx.request.query;//el query como un objeto
        console.log(parametros);
        //aqui vamos a utilizar algunos parametros

        Object.keys(parametros).forEach(element => {
            console.log(parametros[element])

        });
        //    console.log(ctx)

        if (parametros.length == 0) {
            ctx.body = 'No parameters...   use segmentid=xxx'
            return;
        }
        console.log(parametros)
        let sid = parametros['segmentid']
        let maxvoxelsize = parametros['maxvoxelsize']
        let minvoxelsize = parametros['minvoxelsize']
        let cellsize = parametros['cellsize']
        let table = parametros['source'];
        let columnID = parametros['columnid'];
        let classID = parametros['classid'];



        if (!cellsize) {
            cellsize = 0.2;
        }
        console.log(sid)
        // se usa la columna de merged para corregir las coas 
        config = { table: table, column: columnID, cellsize: cellsize, segmentID: sid, excluded: [329939] };
        //            config = { table: 'cgeo_180209_11m_22012020_5cm_fix_segmented', column: 'id_rand_4', cellsize: 0.2 ,segmentID: 98810};


        //full fledged query
        //        let results = await spatialFunctions.getConnectedSegments(config.table, config.segmentID, config.column, config.excluded, config.cellsize);
        //limited query

        if (maxvoxelsize == null)
            maxvoxelsize = 1000000;

        if (minvoxelsize == null)
            minvoxelsize = 1;


        let results = await spatialFunctions.getConnectedSegmentsFast(config.table, config.segmentID, config.column, config.excluded, config.cellsize, minvoxelsize, maxvoxelsize, classID);

        
        //spatialFunctions.getConnectedSegments()
        ctx.body = results;
    }
    ,

    /**
     * DEvuelve los segmentos conectados y los voxeles como la diagonal de cada bbox.
     * @param {*} ctx 
     * @returns 
     */
    getConnectedSegmentsVoxelService: async function (ctx) {

        console.log("-------------------------------");

        console.log("GET getConnectedSegmentsVoxelService");
        console.log('URL: ' + ctx.request.url)//mostrar la ruta completa de la peticion
        console.log('QUERY STRING: ' + ctx.request.querystring);//el querystring pero como una cadena
        console.log('METHOD: ' + ctx.request.method)//el querystring pero como una cadena

        var parametros = ctx.request.query;//el query como un objeto
        console.log(parametros);
        //aqui vamos a utilizar algunos parametros

        Object.keys(parametros).forEach(element => {
            console.log(parametros[element])

        });
        //    console.log(ctx)

        if (parametros.length == 0) {
            ctx.body = 'No parameters...   use segmentid=xxx'
            return;
        }

        let sid = parametros['segmentid']
        let maxvoxelsize = parametros['maxvoxelsize']
        let minvoxelsize = parametros['minvoxelsize']
        let cellsize = parametros['cellsize']

        let table = parametros['source']
        let columnID = parametros['columnid']
        let classID = parametros['classid']



        if (cellsize == null) {
            cellsize = 0.2;
        }
        console.log(sid)
        // se usa la columna de merged para corregir las coas 
        config = { table: 'cgeo_180209_11m_22012020_5cm_fix_segmented', column: 'id_rand_4_merged', cellsize: cellsize, segmentID: sid, excluded: [329939] };
        //            config = { table: 'cgeo_180209_11m_22012020_5cm_fix_segmented', column: 'id_rand_4', cellsize: 0.2 ,segmentID: 98810};


        //full fledged query
        //        let results = await spatialFunctions.getConnectedSegments(config.table, config.segmentID, config.column, config.excluded, config.cellsize);
        //limited query

        if (maxvoxelsize == null)
            maxvoxelsize = 1000000;

        if (minvoxelsize == null)
            minvoxelsize = 1;


        let results = await spatialFunctions.getConnectedSegment(config.table, config.segmentID, config.column, config.excluded, config.cellsize, minvoxelsize, maxvoxelsize);


        //spatialFunctions.getConnectedSegments()
        ctx.body = results;
    }
    ,



    getConnectedSegmentsBelowService: async function (ctx) {

        console.log("--*--*--*--*--*--*--*--*--*--*-**----------");

        console.log("GET getConnectedSegmentsBelowService");
        console.log('URL: ' + ctx.request.url)//mostrar la ruta completa de la peticion
        console.log('QUERY STRING: ' + ctx.request.querystring);//el querystring pero como una cadena
        console.log('METHOD: ' + ctx.request.method)//el querystring pero como una cadena

        var parametros = ctx.request.query;//el query como un objeto
        console.log(parametros);
        //aqui vamos a utilizar algunos parametros

        Object.keys(parametros).forEach(element => {
            console.log(parametros[element])

        });
        //    console.log(ctx)

        if (parametros.length == 0) {
            ctx.body = 'No parameters...   use segmentid=xxx'
            return;
        }

        let sid = parametros['segmentid']
        let maxvoxelsize = parametros['maxvoxelsize']
        let minvoxelsize = parametros['minvoxelsize']
        let cellsize = parametros['cellsize']
        let table = parametros['source']
        let columnID = parametros['columnid']
        let classID = parametros['classid']


        if (cellsize == null) {
            cellsize = 0.2;
        }
        console.log(sid)
        // se usa la columna de merged para corregir las coas 
        config = { table: table, column: columnID, cellsize: cellsize, segmentID: sid, excluded: [329939] };
        //            config = { table: 'cgeo_180209_11m_22012020_5cm_fix_segmented', column: 'id_rand_4', cellsize: 0.2 ,segmentID: 98810};


        //full fledged query
        //        let results = await spatialFunctions.getConnectedSegments(config.table, config.segmentID, config.column, config.excluded, config.cellsize);
        //limited query

        if (maxvoxelsize == null)
            maxvoxelsize = 1000000;

        if (minvoxelsize == null)
            minvoxelsize = 1;

        let results = await spatialFunctions.getConnectedSegmentsFast(config.table, config.segmentID, config.column, config.excluded, config.cellsize, minvoxelsize, maxvoxelsize, classID);

//        let results = await spatialFunctions.getConnectedSegmentsFast(config.table, config.segmentID, config.column, config.excluded, config.cellsize, minvoxelsize, maxvoxelsize, classID);


        let below = []
        for (let i = 0; i < results.length; i++) {
            let segment = results[i].connectedSegment;
            console.log('Testing Direction below ' + segment)

            let above = await spatialFunctions.computeS1AboveS2VoxelHalfspaceFlexible(config.table, config.segmentID, segment, config.column, config.cellsize, config.offset);
            if (above) {
                below.push(results[i]);
            }
            else { console.log('Not Below: ' + results[i].connectedSegment) }
        }
        console.log(`Found ${below.length}  out of ${results.length} are below ${config.segmentID}`)

        //spatialFunctions.getConnectedSegments()
        ctx.body = below;
    },

    getConnectedSegmentsAboveService: async function (ctx) {

        console.log("--*--*--*--*--*--*--*--*--*--*-**----------");

        console.log("GET getConnectedSegmentsAboveService");
        console.log('URL: ' + ctx.request.url)//mostrar la ruta completa de la peticion
        console.log('QUERY STRING: ' + ctx.request.querystring);//el querystring pero como una cadena
        console.log('METHOD: ' + ctx.request.method)//el querystring pero como una cadena

        var parametros = ctx.request.query;//el query como un objeto
        console.log(parametros);
        //aqui vamos a utilizar algunos parametros

        Object.keys(parametros).forEach(element => {
            console.log(parametros[element])

        });
        //    console.log(ctx)

        if (parametros.length == 0) {
            ctx.body = 'No parameters...   use segmentid=xxx'
            return;
        }

        let sid = parametros['segmentid']
        let maxvoxelsize = parametros['maxvoxelsize']
        let minvoxelsize = parametros['minvoxelsize']
        let cellsize = parametros['cellsize']
        let table = parametros['source']
        let columnID = parametros['columnid']
        let classID = parametros['classid']


        if (cellsize == null) {
            cellsize = 0.2;
        }
        console.log(sid)
        // se usa la columna de merged para corregir las coas 
        console.log('PARAMETROS FOR ABOVE')        
        console.log(parametros)
        console.log('------------------')        

        config = { table: table, column: columnID, cellsize: cellsize, segmentID: sid, excluded: [329939] };
        //            config = { table: 'cgeo_180209_11m_22012020_5cm_fix_segmented', column: 'id_rand_4', cellsize: 0.2 ,segmentID: 98810};


        //full fledged query
        //        let results = await spatialFunctions.getConnectedSegments(config.table, config.segmentID, config.column, config.excluded, config.cellsize);
        //limited query

        if (maxvoxelsize == null)
            maxvoxelsize = 1000000;

        if (minvoxelsize == null)
            minvoxelsize = 1;
        console.log(config);
        let results = await spatialFunctions.getConnectedSegmentsFast(config.table, config.segmentID, config.column, config.excluded, config.cellsize, minvoxelsize, maxvoxelsize, classID);

//        let results = await spatialFunctions.getConnectedSegmentsFast(config.table, config.segmentID, config.column, config.excluded, config.cellsize, minvoxelsize, maxvoxelsize, classID);


        let below = []
        for (let i = 0; i < results.length; i++) {
            let segment = results[i].connectedSegment;
            console.log('Testing Direction ABOVE ' + segment)

            let isbelow = await spatialFunctions.computeS1BelowS2VoxelHalfspaceFlexible(config.table, config.segmentID, segment, config.column, config.cellsize, config.offset);
            if (isbelow) {
                below.push(results[i]);
            }
            else { console.log('Not Below: ' + results[i].connectedSegment) }
        }
        console.log(`Found ${below.length}  out of ${results.length} are above ${config.segmentID}`)

        //spatialFunctions.getConnectedSegments()
        ctx.body = below;
    },

    getConnectedSegmentsAboveServiceBAD: async function (ctx) {

        console.log("--*--*--*--*--*--*--*--*--*--*-**----------");
        console.log("--*--*--*--*--*--*--*--*--*--*-**----------");
        console.log("--*--*--*--*--*--*--*--*--*--*-**----------");

        console.log("--*--*--*--*--*--*--*--*--*--*-**----------");


        console.log("GET getConnectedSegmentsAboveService");
        console.log('URL: ' + ctx.request.url)//mostrar la ruta completa de la peticion
        console.log('QUERY STRING: ' + ctx.request.querystring);//el querystring pero como una cadena
        console.log('METHOD: ' + ctx.request.method)//el querystring pero como una cadena

        var parametros = ctx.request.query;//el query como un objeto
        console.log(parametros);
        //aqui vamos a utilizar algunos parametros

        Object.keys(parametros).forEach(element => {
            console.log(parametros[element])

        });
        //    console.log(ctx)

        if (parametros.length == 0) {
            ctx.body = 'No parameters...   use segmentid=xxx'
            return;
        }

        let sid = parametros['segmentid']
        let maxvoxelsize = parametros['maxvoxelsize']
        let minvoxelsize = parametros['minvoxelsize']
        let cellsize = parametros['cellsize']
        let table = parametros['source']
        let columnID = parametros['columnid']
        let classID = parametros['classid']

        if (cellsize == null) {
            cellsize = 0.2;
        }
        console.log(sid)
        // se usa la columna de merged para corregir las coas 
        config = { table: table, column: columnID, cellsize: cellsize, segmentID: sid, excluded: [329939] };
        //            config = { table: 'cgeo_180209_11m_22012020_5cm_fix_segmented', column: 'id_rand_4', cellsize: 0.2 ,segmentID: 98810};


        //full fledged query
        //        let results = await spatialFunctions.getConnectedSegments(config.table, config.segmentID, config.column, config.excluded, config.cellsize);
        //limited query

        if (maxvoxelsize == null)
            maxvoxelsize = 1000000;

        if (minvoxelsize == null)
            minvoxelsize = 1;


        let results = await spatialFunctions.getConnectedSegmentsFast(config.table, config.segmentID, config.column, config.excluded, config.cellsize, minvoxelsize, maxvoxelsize, classID);


        let aboveSegments = []
        for (let i = 0; i < results.length; i++) {
            let segment = results[i].connectedSegment;
            console.log('Testing Direction below ' + segment)

            let below = await spatialFunctions.computeS1BelowS2VoxelHalfspaceFlexible(config.table, config.segmentID, segment, config.column, config.cellsize, config.offset);
            if (below) {
                aboveSegments.push(results[i]);
            }
            else { console.log('Not ABove: ' + results[i].connectedSegment) }
        }
        console.log(`Found ${aboveSegments.length}  out of ${results.length} are above ${config.segmentID}`)

        //spatialFunctions.getConnectedSegments()
        ctx.body = aboveSegments;
    },


    /////////////////rest service for computing voxel size
    computeSegmentVoxelSpaceService: async function (ctx) {

        console.log("-------------------------------");

        console.log("GET computeSegmentVoxelSpaceService");
        console.log('URL: ' + ctx.request.url)//mostrar la ruta completa de la peticion
        console.log('QUERY STRING: ' + ctx.request.querystring);//el querystring pero como una cadena
        console.log('METHOD: ' + ctx.request.method)//el querystring pero como una cadena

        var parametros = ctx.request.query;//el query como un objeto
        console.log(parametros);
        //aqui vamos a utilizar algunos parametros

        Object.keys(parametros).forEach(element => {
            console.log(parametros[element])

        });
        //    console.log(ctx)

        if (parametros.length == 0) {
            ctx.body = 'No parameters...   use segmentid=xxx'
            return;
        }

        let sid = parametros['segmentid']
        let cellsize = parametros['cellsize']

        console.log(sid)
        config = { table: 'cgeo_180209_11m_22012020_5cm_fix_segmented', column: 'id_rand_4', cellsize: cellsize, segmentID: sid };
        //            config = { table: 'cgeo_180209_11m_22012020_5cm_fix_segmented', column: 'id_rand_4', cellsize: 0.2 ,segmentID: 98810};
        let results = await spatialFunctions.computeSegmentVoxelSpace_geom(config.table, config.segmentID, config.column, config.cellsize);
        //spatialFunctions.getConnectedSegments()
        ctx.body = { 'segmentid': sid, 'space': results };
    }
    ,

    /////////////////rest service for computing voxel size
    computeS1AboveS2VoxelService: async function (ctx) {

        console.log("-------------------------------");

        console.log("GET computeS1AboveS2SegmentServiceHalspaceFlexible");
        console.log('URL: ' + ctx.request.url)//mostrar la ruta completa de la peticion
        console.log('QUERY STRING: ' + ctx.request.querystring);//el querystring pero como una cadena
        console.log('METHOD: ' + ctx.request.method)//el querystring pero como una cadena

        var parametros = ctx.request.query;//el query como un objeto
        console.log(parametros);
        //aqui vamos a utilizar algunos parametros

        Object.keys(parametros).forEach(element => {
            console.log(parametros[element])

        });
        //    console.log(ctx)

        if (parametros.length == 0) {
            ctx.body = 'No parameters...   use segmentid=xxx'
            return;
        }


        let s1 = parametros['segmentid1']
        let s2 = parametros['segmentid2']
        let cellsize = parametros['cellsize'] != null ? parametros['cellsize'] : 0.1;
        //        let offset = parametros['offset'] != null ? parametros['offset'] : 0.0;

        //    console.log(sid)

        //config = { table: 'cgeo_180209_11m_22012020_5cm_fix_segmented', column: 'id_rand_2', segmentID_1: 23926, segmentID_2: 14310, cellsize: 0.10, offset: 1 };
        //computeS1AboveS2Voxel(config.table, config.segmentID_1, config.segmentID_2, config.column, config.cellsize, config.offset);


        config = { table: 'cgeo_180209_11m_22012020_5cm_fix_segmented', column: 'id_rand_4_merged', segmentID_1: s1, segmentID_2: s2, cellsize: cellsize, offset: offset };
        let results = await spatialFunctions.computeS1AboveS2VoxelHalfspaceFlexible(config.table, config.segmentID_1, config.segmentID_2, config.column, config.cellsize, config.offset);


        ctx.body = { 'segmentid1': s1, 'segmentid2': s2, 's1_above_s2': results, 'offset': offset };
    }

    ,


    mergeSegmentsService: async function (ctx) {

        console.log("-------------------------------");

        console.log('All the segments in an list will be merged to the first id');
        console.log("GET mergeSegmentsService?segments=[1,2,3,4,5,6]");
        console.log('URL: ' + ctx.request.url)//mostrar la ruta completa de la peticion
        console.log('QUERY STRING: ' + ctx.request.querystring);//el querystring pero como una cadena
        console.log('METHOD: ' + ctx.request.method)//el querystring pero como una cadena

        var parametros = ctx.request.query;//el query como un objeto
        console.log(parametros);
        //aqui vamos a utilizar algunos parametros

        Object.keys(parametros).forEach(element => {
            console.log(parametros[element])

        });
        //    console.log(ctx)

        if (parametros.length == 0) {
            ctx.body = 'No parameters...   use segmentid=xxx'
            return;
        }


        //data is truncated to two decimals, so fix it

        let segments = parametros['segments'];

        //merging
        config = {

            pointstable: 'cgeo_180209_11m_22012020_5cm_fix_segmented',//la tabla de puntos
            segmentcolumn: 'id_rand_4',//la columna original
            targetcolumn: 'id_rand_4_merged',//


            attributestable: 'cgeo_180209_11m_22012020_5cm_fix_attributes',
            attributescolumn: 'segment_id',
        };

        let idsArray = segments.split(',');//temporal


        let results = await spatialFunctions.mergeSegments(config.pointstable, idsArray, config.targetcolumn, config.segmentcolumn, config.attributestable, config.attributescolumn);

        //en la tabla de merged ya estaran todos los puntos


        ctx.body = JSON.stringify(results);

    },
    /**For a given segment, set the corresponding class to a new value, propagating attribute table  */
    changeSegmentClassService: async function (ctx) {

        console.log("-------------------------------");

        console.log('The segments class number will be changed in segment and attibute table');
        console.log("GET changeSegmentClassService?segmentid=2&class=4");
        console.log('URL: ' + ctx.request.url)//mostrar la ruta completa de la peticion
        console.log('QUERY STRING: ' + ctx.request.querystring);//el querystring pero como una cadena
        console.log('METHOD: ' + ctx.request.method)//el querystring pero como una cadena

        var parametros = ctx.request.query;//el query como un objeto
        console.log(parametros);
        //aqui vamos a utilizar algunos parametros

        Object.keys(parametros).forEach(element => {
            console.log(parametros[element])

        });
        //    console.log(ctx)

        if (parametros.length == 0) {
            ctx.body = 'No parameters...   use segmentid=xxx&class=yy'
            return;
        }


        //data is truncated to two decimals, so fix it

        let segmentid = parametros['segmentid'];
        let newClass = parametros['class'];

        //merging
        let configSegmentTable = {

            table: 'cgeo_180209_11m_22012020_5cm_fix_segmented',//la tabla de puntos
            segmentColumn: 'id_rand_4_merged',//
            classColumn: 'c2'

        };
        let configAttributeTable = {
            table: 'cgeo_180209_11m_22012020_5cm_fix_attributes',
            segmentColumn: 'segment_id',
            classColumn: 'c2'

        };



        let results = await spatialFunctions.changeSegmentClass(
            segmentid, newClass,
            configSegmentTable.table, configSegmentTable.segmentColumn, configSegmentTable.classColumn,
            configAttributeTable.table, configAttributeTable.segmentColumn, configAttributeTable.classColumn,
        );

        //en la tabla de merged ya estaran todos los puntos
        console.log('done')

        ctx.body = JSON.stringify(results);

    }



}



//codigo para el levantar el servidor HTTP
//el servidor debe contar con una ruta y una funcion que genera la respuesta
//las rutas se describen empleando las expresiones regulares de express : https://expressjs.com/en/guide/routing.html
//aunque para los fines didacticos, se emplean rutas estaticas

//ver el ejemplo basado en rest en
//https://github.com/lwsjs/local-web-server/wiki/How-to-prototype-a-REST-API

class SpatialFunctionsServer {





    constructor() {
        console.log('Starting SPATIAL FUNCTIONS SERVER...');
    }

    middleware() {//koa AND LWS BASED
        const router = require('koa-route')

        const endpoints = [

          


            router.get('/', serverSpatialFunctions.getInfoService),
            router.get('/getConnectedSegmentsBelow*', serverSpatialFunctions.getConnectedSegmentsBelowService),
            router.get('/getConnectedSegmentsAbove*', serverSpatialFunctions.getConnectedSegmentsAboveService),
            router.get('/getConnectedSegments_*', serverSpatialFunctions.getConnectedSegmentsService),
            router.get('/getConnectedSegmentsVoxel_*', serverSpatialFunctions.getConnectedSegmentsVoxelService),

            router.get('/computeConnectedVoxelSpace*', serverSpatialFunctions.computeSegmentVoxelSpaceService),
            router.get('/computeS1AboveS2Voxel*', serverSpatialFunctions.computeS1AboveS2VoxelService),
            //            router.get('/traverseSegment*',spatialFunctions.computeS1AboveS2VoxelService)

            router.get('/queryCoordinate*', serverSpatialFunctions.querySegmentByCoordinatesService),
            router.get('/mergeSegments*', serverSpatialFunctions.mergeSegmentsService),
            router.get('/changeSegmentClass*', serverSpatialFunctions.changeSegmentClassService),

           // router.get('/queryNormalAtCoordinate*', serverSpatialFunctions.querySegmentNormalAtCoordinatesService),//get the segment and get the avg normal or pdals
         
            router.get('/queryRANSACNormalAtCoordinate*', serverSpatialFunctions.querySegmentRANSACNormalAtCoordinatesService),//get the segment and get the avg normal or pdals


            router.get('/querySegmentsIntersectionLine*', serverSpatialFunctions.querySegmentsIntersectionLineService),//get the segment and get the avg normal or pdals


            router.post('/growRegionAtTriangleRANSAC*', serverSpatialFunctions.growRegionAtTriangleRANSAC),


            //this is expensive. From a triangle, computes the ransac plane and performs a region growing phase based on connectivity and plane
            //1, the points are used to compute the plane.
            //2, For a given plane and radius, a set of points is extracted


        ];
        return endpoints;
    }
}






//console.log('Running SpatialFunctionsServer with .. .' + dbconnection.database + "@" + dbconnection.host);
module.exports = SpatialFunctionsServer;


