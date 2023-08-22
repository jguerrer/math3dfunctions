const {spatialFunctions} = require('./spatial_functions.js')

/*
 Funcion para ejecucion en linea de comandos de clasificacion
*/
async function main() {


    console.log("Server starts with:  npx lws --stack  lws-static lws-cors spatial_functions_server.js")
    console.log(`Stanalone classification starts with:


    
    node --max-old-space-size=4096 spatial_functions_server.js computeSegmentVoxelSpace_geom table segmentID cellsize (meters)
    
    # check if two planes touch at oue on more voxel
    node --max-old-space-size=4096 spatial_functions_server.js computeS1IntersectsS2Voxels

    # check if s1  planes is above s2 completely at voxel
    node --max-old-space-size=4096 spatial_functions_server.js isS1AboveS2      

    node --max-old-space-size=4096 spatial_functions_server.js enumerateSizes      

    node --max-old-space-size=4096 spatial_functions_server.js getConnectedSegments      


    `);
    console.log("Running with parameters");

    let arguments = process.argv
    let parameters = [];

    arguments.forEach(function (val, index, array) {
        //    console.log(index + ': ' + val);

        parameters[val] = true;//debe guardar el store

    });
    let operation1 = arguments[2];
    let ids = arguments[3];
    let store = parameters['store'] ? true : false;;




    let config;

    if (operation1 == "computeSegmentVoxelSpace_geom") {
        console.log("***********************************************************")
        console.log(" ")
        config = { table: 'cgeo_180209_11m_22012020_5cm_fix_segmented', segmentID: 98810, columns: 'id_rand_4', cellsize: 0.20 };
        //computeTouchesVoxels('centrogeo_segmented_tmp', 1459346,1459668, 0.25);//true
        if (ids != null) config.segmentID = ids;
        let result = spatialFunctions.computeSegmentVoxelSpace_geom(config.table, config.segmentID, config.columns, config.cellsize);
        console.log("OUTPUT: " + result + " Voxels @ cell size  " + config.cellsize)

    }

    ///////////////////////////
    if (operation1 == "computeS1IntersectsS2Voxels") {
        console.log("***********************************************************")
        console.log(" ")
        console.log("OUTPUT:  Number of Voxels @ cell size ")
        //config={table:'cgeo_180209_11m_22012020_5cm_fix_segmented', segmentID: 72397, cellsize: 0.25};
        //computeTouchesVoxels('centrogeo_segmented_tmp', 1459346,1459668, 0.25);//true
        config = { table: 'cgeo_180209_11m_22012020_5cm_fix_segmented', column: 'id_rand_4', segmentID_1: 30100, segmentID_2: 290696, cellsize: 0.40 };

        spatialFunctions.computeS1IntersectsS2Voxel(config.table, config.segmentID_1, config.segmentID_2, config.column, config.cellsize);
    }


    if (operation1 == "isS1AboveS2") {
        console.log("***********************************************************")
        console.log(" ")
        //            console.log("OUTPUT:  Number of Voxels @ cell size ")
        //config={table:'cgeo_180209_11m_22012020_5cm_fix_segmented', segmentID: 72397, cellsize: 0.25};
        //computeTouchesVoxels('centrogeo_segmented_tmp', 1459346,1459668, 0.25);//true
        //  config = { table: 'cgeo_180209_11m_22012020_5cm_fix_segmented', column: 'id_rand_2', segmentID_1: 72397, segmentID_2: 72397, cellsize: 0.10 , offset: 1};
        //  computeS1AboveS2Voxel(config.table, config.segmentID_1, config.segmentID_2, config.column, config.cellsize,config.offset);
        //should be false

        //config = { table: 'cgeo_180209_11m_22012020_5cm_fix_segmented', column: 'id_rand_4', segmentID_1: 23926, segmentID_2: 14310, cellsize: 0.10, offset: 1 };
        //spatialFunctions.computeS1AboveS2Voxel(config.table, config.segmentID_1, config.segmentID_2, config.column, config.cellsize, config.offset);



        //true1111
        config = { table: 'cgeo_180209_11m_22012020_5cm_fix_segmented', column: 'id_rand_4_merged', segmentID_1: 30100, segmentID_2: 290696, cellsize: 0.2, offset: 0 };
        let s1 = arguments[3];
        let s2 = arguments[4];

        if (s1) config.segmentID_1 = s1
        if (s2) config.segmentID_2 = s2
        spatialFunctions.computeS1AboveS2VoxelHalfspaceFlexible(config.table, config.segmentID_1, config.segmentID_2, config.column, config.cellsize, config.offset);

    }


    if (operation1 == "isS1HigherS2") {
        console.log("***********************************************************")
        console.log(" ")
        //            console.log("OUTPUT:  Number of Voxels @ cell size ")
        //config={table:'cgeo_180209_11m_22012020_5cm_fix_segmented', segmentID: 72397, cellsize: 0.25};
        //computeTouchesVoxels('centrogeo_segmented_tmp', 1459346,1459668, 0.25);//true
        //  config = { table: 'cgeo_180209_11m_22012020_5cm_fix_segmented', column: 'id_rand_2', segmentID_1: 72397, segmentID_2: 72397, cellsize: 0.10 , offset: 1};
        //  computeS1AboveS2Voxel(config.table, config.segmentID_1, config.segmentID_2, config.column, config.cellsize,config.offset);
        //should be false

        //config = { table: 'cgeo_180209_11m_22012020_5cm_fix_segmented', column: 'id_rand_4', segmentID_1: 23926, segmentID_2: 14310, cellsize: 0.10, offset: 1 };
        //spatialFunctions.computeS1AboveS2Voxel(config.table, config.segmentID_1, config.segmentID_2, config.column, config.cellsize, config.offset);


        //true1111
        config = { table: 'cgeo_180209_11m_22012020_5cm_fix_segmented', column: 'id_rand_4', segmentID_1: 98810, segmentID_2: 467002, cellsize: 1.0, offset: 0 };
        spatialFunctions.computeS1HigherThanS2Voxel(config.table, config.segmentID_1, config.segmentID_2, config.column, config.cellsize, config.offset);

    }


    if (operation1 == "enumerateSizes") {
        console.log("***********************************************************")
        console.log(" ")
        console.log("OUTPUT:  Number of Voxels per segment for all db ")
        //config={table:'cgeo_180209_11m_22012020_5cm_fix_segmented', segmentID: 72397, cellsize: 0.25};
        //computeTouchesVoxels('centrogeo_segmented_tmp', 1459346,1459668, 0.25);//true
        //  
        config = { table: 'cgeo_180209_11m_22012020_5cm_fix_segmented', column: 'id_rand_4', cellsize: 0.2 };
        spatialFunctions.enumarateSegmentSizes(config.table, config.column, config.cellsize);

    }

    if (operation1 == "getConnectedSegments") {
        console.log("***********************************************************")
        console.log(" The connectedness is based on the voxel interaction. To speed things up, spatial indices could be used on the DB based on BBOX.    ")
        console.log("OUTPUT:  The ID of the neighbouring segments for a given segment id ")

        //            config = { table: 'cgeo_180209_11m_22012020_5cm_fix_segmented', column: 'id_rand_4', cellsize: 0.2 ,segmentID: 88321};

        //            config = { table: 'cgeo_180209_11m_22012020_5cm_fix_segmented', column: 'id_rand_4', cellsize: 0.2 ,segmentID: 98810};
        config = { table: 'cgeo_180209_11m_22012020_5cm_fix_segmented', column: 'id_rand_4_merged', cellsize: 2, segmentID: 320875 };

        storeConfig = { table: 'cgeo_180209_11m_22012020_5cm_fix_grammar_table', column_id: 'segment_id', column_store: 'interactions' }
        //            config = { table: 'cgeo_180209_11m_22012020_5cm_fix_segmented', column: 'id_rand_4', cellsize: 0.2 ,segmentID: 98810};
        if (ids != null) config.segmentID = ids;

        let results = await
            spatialFunctions.getConnectedSegments(config.table, config.segmentID, config.column, {}, config.cellsize);
        console.log(results)

        if (store != null) {
            console.log('Storing Results into grammar table')

            //custom SQL

            if (results.length > 0) {
                let origin = results[0].origin;
                console.log(results[0]);
                let storeNonTerminalsSQL = `insert into ${storeConfig.table} (symbol_type,symbol,json_info)`

                let neighborhood = []


                let neighbor = results[0]
                console.log(neighbor.connectedSegment)
                let values = '';
                if (origin < neighbor.connectedSegment) {
                    values = origin + '_' + neighbor.connectedSegment;
                } else {
                    values = neighbor.connectedSegment + '_' + origin;
                }
                storeNonTerminalsSQL = storeNonTerminalsSQL + ` VALUES( 'nt', '${values}', '${JSON.stringify(neighbor)}') `;

                for (let i = 1; i < results.length; i++) {
                    //neighbor = 
                    console.log(results[i].connectedSegment)
                    //                    neighborhood.push(neighbor.connectedSegment)
                    let newvalues = '';
                    if (origin < results[i].connectedSegment) {
                        newvalues = origin + '_' + results[i].connectedSegment;
                    } else {
                        newvalues = results[i].connectedSegment + '_' + origin;
                    }
                    storeNonTerminalsSQL = storeNonTerminalsSQL + `,( 'nt', '${newvalues}' ,'${JSON.stringify(results[i])}')`;

                }
                storeNonTerminalsSQL = storeNonTerminalsSQL + ';';
                console.log(storeNonTerminalsSQL);


                //`update ${storeConfig.table} set ${storeConfig.column_store} = array[${neighborhood}] WHERE ${storeConfig.column_id} = ${origin} ; `;


                //console.log(storeSQL);
                //primero hay que guardar los datos del segmento esperado
                await db.any(storeNonTerminalsSQL, {});//esperamos los resultados de la consulta con await
            }
        }


    }

    if (operation1 == "flip2horizontal") {
        console.log("***********************************************************");
        console.log(" rotates points to the horizontal    ");

        console.log("INPUT:  segment_id & column name ");
        console.log("OUTPUT:  The rotated points to horizontal plane, normal is computed form ransac ");

        config = {
            table: 'cgeo_180209_11m_22012020_5cm_fix_segmented',
            objectstable: 'cgeo_180209_11m_22012020_5cm_fix_segmented',
            column: 'id_rand_4', segmentID: 88321
        };
        flip2Horizontal(config.table, config.column, config.segmentID);

    }


    if (operation1 == 'checkUnderSegmentation') {
        console.log("***********************************************************");
        console.log(" checks for a given segment if after intersecting with other segments, is splitted ");

        config = { table: 'cgeo_180209_11m_22012020_5cm_fix_attributes', column: 'segment_id', segmentID: 0 };



        //maxing a cross product.

        //        let segmentsId = `select ${config.column} from ${config.table} where 'status is null';`

        //HACIENDO EL CROSS PORODUTT

        //    flip2Horizontal(config.table, config.column, config.segmentID);
    }

    if (operation1 == 'storeAllConnections') {

        //1 obtener todos los segmentos
        //2 buscar y almacenar los demas segmentos por medio de getConnectedSegments
        config = {
            attrbiutestable: 'cgeo_180209_11m_22012020_5cm_fix_attributes',
            attributescolumn: 'segment_id',
            //            condition: ' WHERE status is null AND nvoxels_020 > 10 order by segment_id asc;',//la inicial
            condition: ' WHERE status is null AND npoints > 10 order by segment_id asc;',//para filtrar
            purpose: 'connect cell 0.5',

            pointstable: 'cgeo_180209_11m_22012020_5cm_fix_segmented',
            pointscolumn: 'id_rand_4',
            cellsize: 1.0
        };

        storeConfig = { table: 'cgeo_180209_11m_22012020_5cm_fix_grammar_table', column_id: 'segment_id', column_store: 'interactions' }



        let condition = config.condition;
        let segmentList = await spatialFunctions.getSegmentsID(config.attrbiutestable, config.attributescolumn, condition, config.cellsize);
        console.log('Processing ' + segmentList.length);
        for (let i = 0; i < segmentList.length; i++) {


            //////////////////////////

            let results = await spatialFunctions.getConnectedSegments(config.pointstable, segmentList[i], config.pointscolumn, [329939], config.cellsize);//conectedness
            //console.log(results)

            //console.log('Storing Results into grammar table')

            if (results.length > 0) {
                let origin = results[0].origin;//extract the json origin value

                let storeNonTerminalsSQL = `insert into ${storeConfig.table} (origin, symbol_type,symbol,json_info,purpose)`

                ////////// storing the first element
                //let connectedSegment = results[0].connectedSegment;
                //console.log(neighbor)
                let values = '';
                if (origin < results[0].connectedSegment) { values = origin + '_' + results[0].connectedSegment; }
                else { values = results[0].connectedSegment + '_' + origin; }
                storeNonTerminalsSQL = storeNonTerminalsSQL + ` VALUES( ${origin},'nt', '${values}' , '${JSON.stringify(results[0])}' ,'${config.purpose}')`;
                ///////////////// storing the rest if any
                for (let i = 1; i < results.length; i++) {
                    //let neighbor = results[i]
                    console.log(results[i].connectedSegment)
                    values = '';
                    if (origin < results[i].connectedSegment) { values = origin + '_' + results[i].connectedSegment; }
                    else { values = results[i].connectedSegment + '_' + origin; }
                    storeNonTerminalsSQL = storeNonTerminalsSQL + `,( ${origin}, 'nt', '${values}' , '${JSON.stringify(results[i])}' ,'${config.purpose}')`;

                }
                storeNonTerminalsSQL = storeNonTerminalsSQL + ';';
                console.log(storeNonTerminalsSQL);

                await db.any(storeNonTerminalsSQL, {});//esperamos los resultados de la consulta con await
                console.log('Done inserting ' + origin);


                ///////////////////////////
            }




        }

    }

    if (operation1 == 'checkSegmentPlanarity') {


        console.log('Check Segment Planarity')
        // funcionalidad para tomar un segmento de la base de datos y encontrar que tan plano es,
        //esto se hace verificando para un punto, tomar otros dos, y empezar a encontrar la diferencia de los restos del plano.

        config = {
            attributestable: 'cgeo_180209_11m_22012020_5cm_fix_attributes',
            attributescolumn: 'segment_id',

            pointstable: 'cgeo_180209_11m_22012020_5cm_fix_segmented',
            pointscolumn: 'id_rand_4',
            segmentId: 23679,
            radius: 0.2,
            tolerance: 0.05

        };


        if (ids != null) {
            config.segmentId = ids;//overriding the default segmentid
        }
        storeConfig = { table: 'cgeo_180209_11m_22012020_5cm_fix_grammar_table', column_id: 'segment_id', column_store: 'interactions' }

        spatialFunctions.checkSegmentPlanarity(config.pointstable, config.pointscolumn, config.segmentId, config.radius, config.tolerance);

        ///////////////////////////
    }


    if (operation1 == "mergeSegments") {
        console.log('EXAMPLE_: node spatial_functions_server.js mergeSegments 72,147,175 ')
        console.log(ids);
        config = {

            pointstable: 'cgeo_180209_11m_22012020_5cm_fix_segmented',
            segmentcolumn: 'id_rand_4',
            targetcolumn: 'id_rand_4_merged',
            segmentIds: 23679,
            //            radius:0.2,
            //            tolerance:0.05

            attributestable: 'cgeo_180209_11m_22012020_5cm_fix_attributes',
            attributescolumn: 'segment_id',
        };

        let idsArray = ids.split(',');//temporal


        spatialFunctions.mergeSegments(config.pointstable, idsArray, config.targetcolumn, config.segmentcolumn, config.attributestable, config.attributescolumn);


    }

    if (operation1 == "queryCoordinate") {
        console.log('EXAMPLE_: node spatial_functions_server.js queryCoordinate 476749.950,2133118.740,2495.329')

        config = {

            //476749.950 : 2133118.740 : 2495.329
            pointstable: 'cgeo_180209_11m_22012020_5cm_fix_segmented',
            segmentcolumn: 'id_rand_4',
            xColumn: 'x',
            yColumn: 'y',
            zColumn: 'z',
            decimals: 2

        };

        let coordsArray = ids.split(',');//temporal
        x = coordsArray[0];
        y = coordsArray[1];
        z = coordsArray[2];


        spatialFunctions.querySegmentByCoordinates(config.pointstable, config.segmentcolumn, config.xColumn, config.yColumn, config.zColumn, x, y, z, config.decmals, 0);


    }


    /**  Has isues with the function, doesnt work for vertical planes as is given as function */
    if (operation1 == "fitPlane") {
        console.log("***********************************************************")
        console.log(" Testing th fittnes of a plane using LEast Squares NPM instead (no ransac)")
        console.log("OUTPUT:  The equation of the fitted plane")


        config = { table: 'cgeo_180209_11m_22012020_5cm_fix_segmented', column: 'id_rand_4_merged', cellsize: 2, segmentID: 320875 };


        if (ids != null) config.segmentID = ids;

        let results = await spatialFunctions.getSegmentXYZ(config.table, config.column, config.segmentID, {},);
        //console.log(results);

        console.log(results.length);

        let origin = { x: results[0].x, y: results[0].y, z: results[0].z }

        /////////////
        //translating
        let movetozero = false;
        if (movetozero) {
            for (let i = 0; i < results.length; i++) {
                results[i].x = (results[i].x - origin.x);
                results[i].y = (results[i].y - origin.y);
                results[i].z = (results[i].z - origin.z);
            }
        }

        const bestfit = require('best-fitting-plane')

        let fit = bestfit.LSE(results);
        let length = math.sqrt(fit.A * fit.A + fit.B * fit.B + fit.C * fit.C)
        let fitnormal = { A: fit.A / length, B: fit.B / length, C: fit.C / length }
        console.log('RESULT: Normal Vector:');
        console.log(fitnormal);





    }

    if (operation1 == "fitPlaneRansac") {
        console.log("***********************************************************")
        console.log(" Testing th fittnes of a plane using RANSAC")
        console.log("OUTPUT:  The equation of the found plane")


        //config = { table: 'cgeo_180209_11m_22012020_5cm_fix_segmented', column: 'id_rand_4_merged', maxDist: 0.3, maxIterations: 10000, segmentID: 320875 };
        config = { table: 'cgeo_180209_11m_22012020_5cm_fix_segmented', column: 'id_rand_4_merged', maxDist: 0.20, maxIterations: 5000, segmentID: 242133 };


        if (ids != null) config.segmentID = ids;

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

        let rplane = await spatialFunctions.findRansacPlane(results, config.maxDist, config.maxIterations);
        console.log('PLANE');
        console.log(rplane);
        console.log('NORMAL');
        console.log(mathf3d.getOrthogonalVector2Plane(rplane.p0, rplane.p1, rplane.p2));
        console.log('POSITION');
        console.log(origin);

        console.log(`drawPlane([${origin}] , [${rplane.p0}],[${rplane.p1}],[${rplane.p2}],10)`)
        console.log(rplane.histogram)
        //tendria que mostrar

    }


    if (operation1 == "exportTable") {

        //let offset= 10000;
        let limit = 100000;
        let table = 'cgeo_180209_11m_22012020_5cm_fix_segmented';
        let exportData = fs.createWriteStream(`${table}.export.txt`);

        let res = await db.any(`select count(*) size from ${table} where c2 < 4 and enabled = true  ;`, {});//esperamos los resultados de la consulta con await
        let size = res[0].size;
        console.log('EXPORT TABLE. Records: ' + size)

        let header = 'x,y,z,nx,ny,nz,id_rand_4,id_rand_4_merged,c2'
        exportData.write(header + '\n');
        for (let offset = 0; offset < size; offset = offset + 100000) {

            let query = `SELECT ${header} FROM cgeo_180209_11m_22012020_5cm_fix_segmented where c2 < 4   and enabled = true  order by id_rand_4 LIMIT ${limit} OFFSET ${offset};`
            console.log(query)
            let result = await db.any(query, {});//esperamos los resultados de la consulta con await
            for (i = 0; i < result.length; i++) {
                exportData.write(`${result[i]['x']},${result[i]['y']},${result[i]['z']},${result[i]['nx']},${result[i]['ny']},${result[i]['nz']},${result[i]['id_rand_4']},${result[i]['id_rand_4_merged']},${result[i]['c2']}\n`);
            }




        }


    }

    ///////////////


    if (operation1 == "computeRANSACNormalsNStore") {


        console.log("***********************************************************")
        console.log("Computing RANSAC plane to specific segment and updating attribute data")
        console.log("OUTPUT:  updated normal plane")


        //config = { table: 'cgeo_180209_11m_22012020_5cm_fix_segmented', column: 'id_rand_4_merged', maxDist: 0.3, maxIterations: 10000, segmentID: 320875 };
        config = {
            table: 'cgeo_180209_11m_22012020_5cm_fix_segmented',
            column: 'id_rand_4_merged',
            maxDist: 0.20,
            maxIterations: 5000,
            segmentID: 242133,

            objectsTable: 'cgeo_180209_11m_22012020_5cm_fix_attributes',
            objectTableStoreColumn: 'segment_id'
        };

        if (ids != null) config.segmentID = ids;



        //get all xyz  points in a segment id, at a table, with a column name
        let results = await spatialFunctions.getSegmentXYZ(config.table, config.column, config.segmentID, {},);
        console.log('SEGMENT ID: ' + config.segmentID);
        console.log('SEGMENT SIZE: ' + results.length);//number of points

        //debia tomar un aleatorio

        let porigin = parseInt(Math.random() * results.length);//pick a point within the segment //double check
        let origin = results[porigin]

        /////////////
        //translating to zero around that point
        let movetozero = true;
        if (movetozero) {
            for (let i = 0; i < results.length; i++) {
                results[i] = [
                    (results[i][0] - origin[0]),
                    (results[i][1] - origin[1]),
                    (results[i][2] - origin[2])]
            }
        }

        let rplane = await spatialFunctions.findRandsacPlane(results, config.maxDist, config.maxIterations);
        console.log('PLANE');
        console.log(rplane);

        console.log('NORMAL');
        let newNormal = mathf3d.getOrthogonalVector2Plane(rplane.p0, rplane.p1, rplane.p2);
        console.log(newNormal);//array


        console.log('POSITION');
        console.log(origin);

        //something for potree custom function
        //plane defined for a given coordinate and three vectors
        //origin is set on world coordinates, 
        console.log(`drawPlane([${origin}] , [${rplane.p0}],[${rplane.p1}],[${rplane.p2}],10)`)
        console.log(rplane.histogram)
        //tendria que mostrar


        //storing segment normal in attrbiute table
        console.log('STORING NORMAL INFORMATION')
        let storestring = `update ${config.objectsTable} set nx= ${newNormal[0]}, ny= ${newNormal[1]}, nz= ${newNormal[2]} where ${config.objectTableStoreColumn}=${config.segmentID} `;
        await db.none(storestring);
        console.log('Done ')
    }

    if (operation1 == "updateAllNormalsRANSACNStore") {

        //takes all segments with more than 50 points and computes a normal and stores in the attribute table
        console.log("***********************************************************")
        console.log("Computing RANSAC plane to specific segment and updating attribute data")
        console.log("OUTPUT:  updated normal plane")


        //config = { table: 'cgeo_180209_11m_22012020_5cm_fix_segmented', column: 'id_rand_4_merged', maxDist: 0.3, maxIterations: 10000, segmentID: 320875 };
        config = {
            table: 'cgeo_180209_11m_22012020_5cm_fix_segmented',
            column: 'id_rand_4_merged',
            maxDist: 0.20,
            maxIterations: 5000,
            segmentID: 242133,

            objectsTable: 'cgeo_180209_11m_22012020_5cm_fix_attributes',
            objectTableStoreColumn: 'segment_id'
        };

        //        if (ids != null) config.segmentID = ids;


        let allSegmentsID = `
        with list as(
            select distinct(${config.column}) ids, count(*) count from ${config.table} group by ${config.column} order by ids    
            )
            
            select * from list where count > 50 order by ids;
        `;
            console.log(allSegmentsID)
        let ids = await db.any(allSegmentsID, {});

        for (let r = 0; r < ids.length; r++) {

            config.segmentID=ids[r]['ids'];
            console.log('----------->' + config.segmentID)
            //get all xyz  points in a segment id, at a table, with a column name
            let results = await spatialFunctions.getSegmentXYZ(config.table, config.column, config.segmentID, {},);
            console.log('SEGMENT ID: ' + config.segmentID);
            console.log('SEGMENT SIZE: ' + results.length);//number of points

            //debia tomar un aleatorio

            let porigin = parseInt(Math.random() * results.length);//pick a point within the segment //double check
            let origin = results[porigin]

            /////////////
            //translating to zero around that point
            let movetozero = true;
            if (movetozero) {
                for (let i = 0; i < results.length; i++) {
                    results[i] = [
                        (results[i][0] - origin[0]),
                        (results[i][1] - origin[1]),
                        (results[i][2] - origin[2])]
                }
            }

            let rplane = await spatialFunctions.findRandsacPlane(results, config.maxDist, config.maxIterations);
            console.log('PLANE');
            console.log(rplane);

            console.log('NORMAL');
            let newNormal = mathf3d.getOrthogonalVector2Plane(rplane.p0, rplane.p1, rplane.p2);
            console.log(newNormal);//array


            console.log('POSITION');
            console.log(origin);

            //something for potree custom function
            console.log(`drawPlane([${origin}] , [${rplane.p0}],[${rplane.p1}],[${rplane.p2}],10)`)
            console.log(rplane.histogram)
            //tendria que mostrar


            //storing segment normal in attrbiute table
            console.log('STORING NORMAL INFORMATION')
            let storestring = `update ${config.objectsTable} set nx= ${newNormal[0]}, ny= ${newNormal[1]}, nz= ${newNormal[2]} where ${config.objectTableStoreColumn}=${config.segmentID} `;
            await db.none(storestring);
            console.log('Done ')
        }

    }

    if (operation1 == "findIntersection") {
        console.log("***********************************************************")

        console.log("Finding intersection of ransac planes. A triangle is drawn from an origin point to a projected point on the other plane. A line accross the line is drawn")
        console.log("OUTPUT: LINE AT INTERSECTION")


        //config = { table: 'cgeo_180209_11m_22012020_5cm_fix_segmented', column: 'id_rand_4_merged', maxDist: 0.3, maxIterations: 10000, segmentID: 320875 };
        config = {
            table: 'cgeo_180209_11m_22012020_5cm_fix_segmented',
            column: 'id_rand_4_merged',
            maxDist: 0.05,
            maxIterations: 10000,
            segmentID1: 98810,
//            segmentID1: 145279,
//            segmentID1:417380,

            segmentID2: 430978,
//            segmentID2: 467002,
  //          segmentID2: 216447,
//            segmentID2: 19864,


            objectsTable: 'cgeo_180209_11m_22012020_5cm_fix_attributes',
            objectTableStoreColumn: 'segment_id'
        };

        spatialFunctions.compute2PlaneIntersectionSegment(config.segmentID1,config.segmentID2,config.maxIterations,config.maxDist,config.table,config.column)

    }
};//end of main class with tests


main();
module.exports ={main};

