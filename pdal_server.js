
//start date:   29/01/2022
//npx lws --stack  lws-body-parser lws-static lws-cors pdal_server.js   -p 8003

console.log('PDAL FUNCTIONS SERVER V0.1');
console.log('A collection of web services and functions to operate with pdal, Js and storage on Postgres/PGpointcloud. ');
console.log('KOA WEbserver and/or commandline version.');

console.log('Signatures on the functions denote the actual data source');
console.log('Server is implementd on KOA, LWS  and plugins');
console.log('V0.1');


const initOptions = {/* initialization options */ };
const pgp = require('pg-promise')(initOptions);
//const consultas = require('./spatialFunctions');
//const { exec } = require('child_process');
//var mathf3d = require('./MathFunctions3D');//ya se esta importando
const math = require('mathjs')

//var lineReader = require('line-reader');  
const lineByLine = require('n-readlines');

//const planefit=require('best-fitting-plane')



//from node-las
//const jBinary = require('jbinary');
//const R = require('ramda');
//const L_read = require('./lib/read');
//const L_toJSON = require('./lib/toJSON');
//const L_toGeoJSON = require('./lib/toGeoJSON');
//const L_toTXT = require('./lib/toTXT');
//const L_write = require('./lib/write');
///const { filterBinary } = require('./lib/filter');
//const { sampleBinary } = require('./lib/sample');
//const L_binaryTypeset = require('./lib/binaryTypeset');


var fs = require('fs');
const { Console, table } = require('console');
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

const connectionTlalpan = {
    host: 'localhost',
    port: 5432,
    database: 'curvas_tlalpan',
    user: 'postgres',
    password: 'postgresdb'
};

const connectionTeresoTlalpan = {
    host: '192.168.0.101',
    port: 5434,
    database: 'centrogeo_tlalpan',
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
//const db = pgp(dbconnection);

const db = pgp(connection);
//const db = pgp(connectionTeresoTlalpan);



/** 
 * 
 * Set of bindings created to integrate pdal analysis function or filters into my work, so no files are required to analyze or feed manually.
 * 
 * 

*/


/////////////////


let PDALFunctions = module.exports = {
    register: [],



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
        config = { table: 'cgeo_180209_11m_22012020_5cm_fix_segmented', segmentColumn: 'id_rand_4_merged' };
        let results = await spatialFunctions.querySegmentByCoordinates(config.table, config.segmentColumn, xColumn, yColumn, zColumn, x, y, z, decimals, 0);
        //refer to measure panel for quick implementation over the query button

        ctx.body = JSON.stringify(results);
        //{ 'segmentid1': s1, 'segmentid2': s2, 's1_above_s2': results, 'offset': offset };
    },


    /**
     * Binding to interact with pdal.filters.normal via temporary files. Results are returned as a json or array.
     * Point data is either stored as json or array   
    */


    tmpDirectory: 'pdal_tmp',
    filtersNormalPArameters: { knn: 8, viewpoint: [0, 0, 200000], always_up: false, refine: false, 'where': '', 'where_mrge': '' },

    /**
     * 
     * @param {*} points 
     * @param {*} header 
     * @param {*} knn 
     * @param {*} viewpoint 
     * @param {*} alwaysup 
     * @param {*} refine 
     * @param {*} where 
     * @param {*} where_merge 
     */
    filtersPDAL: async function (points, header, knn, viewpoint, alwaysup, refine, where, where_merge) {


        //creating a data file as imput from memory 
        let randomID = math.random(10000000)
        let inputFileName = `${this.tmpDirectory}\\pdal_filters_normal_input_${randomID}.txt`;
        let inputJSONFileName = `${this.tmpDirectory}\\pdal_filters_normal_input_json_${randomID}.json`;

        let outputFileName = `${this.tmpDirectory}\\pdal_filters_normal_output_${randomID}.csv`;
        //        let header = '';

        console.log("FILTER.NORMALS")
        console.log(header)
        console.log(inputFileName)
        console.log(outputFileName)

        let inputFile = fs.createWriteStream(inputFileName);
        //let outputJSONFile = fs.createWriteStream(inputJSONFileName);

        let headerSize = header.length;
        let headerjson = "";
        inputFile.write(header[0])
        headerjson = header[0]
        //let headerText += header[0];
        for (let i = 1; i < header.length; i++) {
            inputFile.write(',' + header[i]);
            headerjson += ',' + header[i];
            //header += ',' + header[i];
            //console.log(header);
        }
        inputFile.write('\n');
        console.log('Writing Data')
        let line = ''
        for (let i = 0; i < points.length; i++) {

            //console.log(i + ' ' + points[i])
            line = points[i][header[0]];


            for (let item = 1; item < headerSize; item++) {
                line += ',' + points[i][header[item]];
            }
            line += '\n';
            inputFile.write(line);
        }

        //AQUI DEBE ESTAR HECHO EL POINTS

        //creating the json file

        let reader = {
            "type": "readers.text",
            "filename": inputFileName,
            "header": headerjson,
            "skip": 1
        };

        let optimalNeighborhood = {
            "type": "filters.optimalneighborhood",
            "min_k": 8,
            "max_k": 50
        };

        let normals = {
            "type": "filters.normal",
            "knn": knn
        };


        let eigen = {
            "type": "filters.eigenvalues",
            "knn": knn
        };


        let covarianceFeatures = {
            "type": "filters.covariancefeatures",
            "knn": knn,
            "threads": 2,
            "feature_set": "Linearity,Planarity,Scattering,Verticality"
        };

        let kmeans =
        {
            "type": "filters.lloydkmeans",
            "k": knn,
            "maxiters": 20,
            "dimensions": "Normalx,Normaly,Normalz"
        }


        let planeFit = {
            "type": "filters.planefit",
            "knn": knn
        }

        let reciprocity = {
            "type": "filters.reciprocity",
            "knn": knn
        }

        //with default values
        let coplanar = {
            "type": "filters.approximatecoplanar",
            "knn": knn,
            "thresh1": 25,
            "thresh2": 6
        }


        let writer = {
            "type": "writers.text",
            "filename": `${outputFileName}`,
            "format": "csv"
        };


        let pipeline = {
            "pipeline":
                [
                    reader,
                    //optimalNeighborhood,
                    normals,
                    //eigen,
                    //                    covarianceFeatures,
                    //                    kmeans,
                    //                    planeFit,
                    //                    reciprocity,
                    //                    coplanar,
                    writer

                ]
        };

        console.log(pipeline)
        fs.writeFileSync(inputJSONFileName, JSON.stringify(pipeline))





        await this.execPDALPipeline2(inputJSONFileName);
        console.log('Process Finished')


        let extractNormalAverage = function (data, params) {
            let header = params['header'];

            console.log(`FUNC: extractNotmalAverage   `)
            console.log(header)
            console.log(data.length)
            console.log(data)


            let x = 0;
            let y = 0;
            let z = 0;
            for (i = 0; i < data.length; i++) {
                //console.log(i);
                let record = data[i];
                x += Number(record[header['NormalX']])
                y += Number(record[header['NormalY']]);
                z += Number(record[header['NormalZ']]);
                console.log(x + ' ' + y + ' ' + z)
            }
            x = x / data.length;
            y = y / data.length;
            z = z / data.length;
            console.log([x, y, z])
            return [x, y, z];
        };

        let res = this.readPDALCSVNProcess(outputFileName, extractNormalAverage);

        console.log(res);

        console.log('Done Executing')

    },

    /**
     * Deprecated
     * Reads a pdal txt file to extract data. May be expensive but no worried yet.
     * @param {*} inputFile 
     */
    readPDALCSVNProcessOld: async function (inputFile, process, params) {
        console.log('************************ readPDALCSVNProcess')

        //        let csvFile = fs.createReadStream(inputFileName);
        //csvFile.read
        console.log('INPUT FILE: ' + inputFile)
        let data = [];//where to return things 
        let header = [];

        let first = true;

        let cb = function (val) { console.log('callback') };
        let results;
        await lineReader.eachLine(inputFile, async function (line) {

            //console.log('************* line' + line + ' ' + last)
            //header 

            //console.log(line);
            let currentLine = line.split(',')

            if (first) {

                //                console.log('HEADER:' + line)

                console.log('HEADER LENGTH ' + currentLine.length)
                //columnn name based
                for (let i = 0; i < currentLine.length; i++) {


                    header[currentLine[i].split('"')[1]] = i;
                }
                //console.log(header);

                first = false;
            } else {
                // console.log('LINE ' +line)
                data.push(currentLine);
            }
            ////////////////////////////////




        }).then(function (err) {

            console.log('then')
            console.log(header);
            results = process(header, data);//a parameter

        }

        );



        console.log('After exec: ')


    },

    readPDALCSVNProcess: async function (inputFile, process, params) {
        console.log(`************************ *****************************************************`)

        console.log(`************************ readPDALCSVNProcess ${inputFile} ${process} ${params}`)

        //        let csvFile = fs.createReadStream(inputFileName);
        //csvFile.read
        console.log('INPUT FILE: ' + inputFile)
        let data = [];//where to return things 
        let header = [];

        let first = true;

        let results;

        const reader = new lineByLine(inputFile);

        let line;
        //        let lineNumber = 0;
        while (line = reader.next()) {

            let currentLine = line.toString('ascii').split(',')

            if (first) {

                //                console.log('HEADER:' + line)

                //console.log('HEADER LENGTH ' + currentLine.length)
                //columnn name based
                for (let i = 0; i < currentLine.length; i++) {


                    header[currentLine[i].split('"')[1]] = i;
                }
                console.log(header);

                first = false;
            } else {
                // console.log('LINE ' +line)
                data.push(currentLine);//need t split by comma
                //console.log(currentLine);
            }




        }

        //console.log('************* line' + line + ' ' + last)
        //header 

        //console.log(line);

        ////////////////////////////////


        console.log('+++++++++++++++++++++++++++++++++++++++');

        console.log(header);
        console.log(params);

        params['header'] = header;
        console.log('PROCESSING.............................');

        results = process( data,params);//a function for processing data
        console.log('PROCESSING..........................DONE');

        console.log('+++++++++++++++++++++++++++++++++++++++');

        console.log('PROCESS SVN: ' + results);
        console.log('After exec: ')
        return results;







    },


    //deprecated, no se puede esperar bien
    execPDALPipeline: async function (jsonPipeline) {
        var spawn = require('child_process').spawn;
        //       var prc = spawn('pdal', [' pipeline ', ' -v 8 ', ' --stdin ', `${jsonPipeline}`]);
        var prc = spawn('pdal', [`pipeline -v 8 -i ${jsonPipeline}`]);

        //noinspection JSUnresolvedFunction
        prc.stdout.setEncoding('utf8');
        prc.stdout.on('data', function (data) {
            // var str = data.toString()
            //var lines = str.split(/(\r?\n)/g);
            //console.log(lines.join(""));
            console.log(data)
        });

        prc.on('close', function (code) {
            console.log('process exit code ' + code);
        });
    },

    /**
     * Implementa la ejecucion de un pipeline de pdal completamente configurado en con rutas absolutas
     */
    execPDALPipeline2: async function (jsonPipeline) {
        try {
            console.log('************************ EXEC PDAL PIPELINE')
            console.log(`pdal pipeline -v 8 -i ${jsonPipeline}`);
            let child = require('child_process').exec(`pdal pipeline -v 8 -i ${jsonPipeline}`)
            /*
            ,
                function callback(error, stdout, stderr) {
                    if (error) {
                        console.log('--------------- errorv-----------');
                        console.log(error);
    
                    }
                    if (stdout) {
                        console.log('--------------- stdout -----------');
                        console.log(stdout);
                    }
                    if (stderr) {
                        console.log('--------------- stderr-----------');
                        console.log(stderr);
                    }
                }
                */




            await new Promise((resolve) => {
                child.on('close', resolve)
            })
            console.log('After exec: ')

        } catch (e) {
            console.log(e);
        }

    },

    /**
     * For an explicit set of points, aplies a filter to compute normals based on aknn neighborhood and returns the averaged normal
     * 
     * 
     * @param {*} points 
     * @param {*} header 
     * @param {*} knn 
     * @param {*} viewpoint 
     * @param {*} alwaysup 
     * @param {*} refine 
     * @param {*} where 
     * @param {*} where_merge 
     */
    filterNormalsPDAL: async function (points, header, knn, viewpoint, alwaysup, refine, where, where_merge) {


        //creating a data file as imput from memory 
        let randomID = math.random(10000000)
        let inputFileName = `${this.tmpDirectory}\\pdal_filters_normal_input_${randomID}.txt`;
        let inputJSONFileName = `${this.tmpDirectory}\\pdal_filters_normal_input_json_${randomID}.json`;

        let outputFileName = `${this.tmpDirectory}\\pdal_filters_normal_output_${randomID}.csv`;
        //        let header = '';

        console.log("FILTER.NORMALS")
        console.log(header)
        console.log(inputFileName)
        console.log(outputFileName)

        let inputFile = fs.createWriteStream(inputFileName);
        //let outputJSONFile = fs.createWriteStream(inputJSONFileName);

        let headerSize = header.length;
        let headerjson = "";
        inputFile.write(header[0])
        headerjson = header[0]
        //let headerText += header[0];
        for (let i = 1; i < header.length; i++) {
            inputFile.write(',' + header[i]);
            headerjson += ',' + header[i];
            //header += ',' + header[i];
            //console.log(header);
        }
        inputFile.write('\n');
        console.log('Writing Data')
        let line = ''
        for (let i = 0; i < points.length; i++) {

            //console.log(i + ' ' + points[i])
            line = points[i][header[0]];


            for (let item = 1; item < headerSize; item++) {
                line += ',' + points[i][header[item]];
            }
            line += '\n';
            inputFile.write(line);
        }

        //AQUI DEBE ESTAR HECHO EL POINTS

        //creating the json file

        let reader = {
            "type": "readers.text",
            "filename": inputFileName,
            "header": headerjson,
            "skip": 1
        };

        let normals = {
            "type": "filters.normal",
            "knn": knn
        };


        let writer = {
            "type": "writers.text",
            "filename": `${outputFileName}`,
            "format": "csv"
        };


        let pipeline = {
            "pipeline":
                [
                    reader,
                    normals,
                    writer

                ]
        };

        console.log(pipeline)
        fs.writeFileSync(inputJSONFileName, JSON.stringify(pipeline))

        await this.execPDALPipeline2(inputJSONFileName);
        console.log('Process Finished')

        //compute the normals and pass it as a function
        let funct = function ( data,parameters) {
            console.log('NORMALIZING DATA FUNCTION')
            let header=parameters['header'];
            console.log(header);
            let x = 0;
            let y = 0;
            let z = 0;
            console.log('DATA SIZE: '  + data.length)
            for (i = 0; i < data.length; i++) {
                 let record = data[i];
/*
                 console.log(record)
                 console.log(header['NormalX']);
                 console.log(header['NormalY']);
                 console.log(header['NormalZ']);
*/
                x += Number(record[header['NormalX']])
                y += Number(record[header['NormalY']]);
                z += Number(record[header['NormalZ']]);
                //console.log(x + ' ' + y + ' ' + z)
            }

            let nlength = math.sqrt((x * x) + (y * y) + (z + z))
            x = x / nlength;
            y = y / nlength;
            z = z / nlength;
            console.log([x, y, z])
            return [x, y, z];
        };

        //esto no esta esperando
        let res = this.readPDALCSVNProcess(outputFileName, funct,[]);//dontforget the params
        console.log('RES after readPDALCSVNProcess: ' + res);

        console.log('Done Executing FiltersNormal')
        return res;

    },


    filterCovarianceFeaturesPDAL: async function (points, header, knn) {


        //creating a data file as imput from memory 
        let randomID = math.random(10000000)
        let inputFileName = `${this.tmpDirectory}\\pdal_filters_covariance_input_${randomID}.txt`;
        let inputJSONFileName = `${this.tmpDirectory}\\pdal_filters_covariance_input_json_${randomID}.json`;

        let outputFileName = `${this.tmpDirectory}\\pdal_filters_covariance_output_${randomID}.csv`;
        //        let header = '';

        console.log("FILTER.COVARIANCEFEATURES")
        console.log(header)
        console.log(inputFileName)
        console.log(outputFileName)

        let inputFile = fs.createWriteStream(inputFileName);
        //let outputJSONFile = fs.createWriteStream(inputJSONFileName);

        let headerSize = header.length;
        let headerjson = "";
        inputFile.write(header[0])
        headerjson = header[0]
        //let headerText += header[0];
        for (let i = 1; i < header.length; i++) {
            inputFile.write(',' + header[i]);
            headerjson += ',' + header[i];
            //header += ',' + header[i];
            //console.log(header);
        }
        inputFile.write('\n');
        console.log('Writing Data')
        let line = ''
        for (let i = 0; i < points.length; i++) {

            //console.log(i + ' ' + points[i])
            line = points[i][header[0]];


            for (let item = 1; item < headerSize; item++) {
                line += ',' + points[i][header[item]];
            }
            line += '\n';
            inputFile.write(line);
        }

        //AQUI DEBE ESTAR HECHO EL POINTS

        //creating the json file

        let reader = {
            "type": "readers.text",
            "filename": inputFileName,
            "header": headerjson,
            "skip": 1
        };

        let normals = {
            "type": "filters.normal",
            "knn": knn
        };


        let covarianceFeatures = {
            "type": "filters.covariancefeatures",
            "knn": knn,
            "threads": 4,
            "feature_set": "Planarity,Scattering,Verticality,Linearity"
        };

        let writer = {
            "type": "writers.text",
            "filename": `${outputFileName}`,
            "format": "csv"
        };


        let pipeline = {
            "pipeline":
                [
                    reader,
                    covarianceFeatures,
                    writer

                ]
        };

        console.log(pipeline)
        fs.writeFileSync(inputJSONFileName, JSON.stringify(pipeline))

        await this.execPDALPipeline2(inputJSONFileName);
        console.log('Process Finished')

        //compute the normals and pass it as a function
        let avgCovarianceFeatures = async function (header, data) {
            let planarity = 0;
            let scattering = 0;
            let verticality = 0;
            let linearity = 0;

            for (i = 0; i < data.length; i++) {
                //console.log(i);
                let record = data[i];
                planarity += Number(record[header['Planarity']])
                scattering += Number(record[header['Scattering']]);
                verticality += Number(record[header['Verticality']]);
                linearity += Number(record[header['Linearity']]);
                //console.log(x + ' ' + y + ' ' + z)
            }
            planarity = planarity / data.length;
            scattering = scattering / data.length;
            verticality = verticality / data.length;
            linearity = linearity / data.length;

            let result = { planarity: planarity, scattering: scattering, verticality: verticality, linearity: linearity };
            console.log(result)
            return result;
        };

        let avgCovarianceFeaturesHist = async function (header, data) {
            let planarity = [];
            let scattering = [];
            let verticality = [];
            let linearity = [];

            for (let i = 0; i < 10; i++) {
                planarity[i] = 0;
                scattering[i] = 0;
                verticality[i] = 0;
                linearity[i] = 0;
            }
            for (i = 0; i < data.length; i++) {
                //console.log(i);
                let record = data[i];

                let p = Math.round(Number(record[header['Planarity']]) * 10)
                if (!planarity[p]) { planarity[p] = 0; }
                planarity[p] += 1;

                let s = Math.round(Number(record[header['Scattering']]) * 10)
                if (!scattering[s]) { scattering[s] = 0; }
                scattering[s] += 1;

                let v = Math.round(Number(record[header['Verticality']]) * 10)
                if (!verticality[v]) { verticality[v] = 0; }
                verticality[v] += 1

                let l = Math.round(Number(record[header['Linearity']]) * 10);
                if (!linearity[l]) { linearity[l] = 0; }
                linearity[l] += 1;
                //console.log(x + ' ' + y + ' ' + z)
            }
            //podria normalizar
            /*
            for (let i = 0; i < 10; i++) {
                planarity[i] =  planarity[i] / data.length;
                scattering[i] = scattering[i] / data.length;
                verticality[i] = verticality[i] / data.length;
                linearity[i] = linearity[i] / data.length;
            }
*/
            let result = { planarity: planarity, scattering: scattering, verticality: verticality, linearity: linearity };
            console.log(result)
            return result;
        };

        let res = await this.readPDALCSVNProcess(outputFileName, avgCovarianceFeaturesHist);
        //        let res = await this.readPDALCSVNProcess(outputFileName, avgCovarianceFeatures);

        console.log(res);

        console.log('Done Executing FiltersCovarianceFeaturesAVG')
        return res;
    },



    filterPlaneFitPDAL: async function (points, header, knn, threads, threshold) {


        //creating a data file as imput from memory 
        let randomID = math.random(10000000)
        let inputFileName = `${this.tmpDirectory}\\pdal_filters_planefit_input_${randomID}.txt`;
        let inputJSONFileName = `${this.tmpDirectory}\\pdal_filters_planefit_input_json_${randomID}.json`;
        let outputFileName = `${this.tmpDirectory}\\pdal_filters_planefit_output_${randomID}.csv`;
        //        let header = '';

        if (threads == null)
            threads = 2;
        if (threshold == null)
            threshold = 0.1;//everythong below this is within the plane    

        console.log("FILTER.PLANEFIT")
        console.log(header)
        console.log(inputFileName)
        console.log(outputFileName)

        let inputFile = fs.createWriteStream(inputFileName);
        //let outputJSONFile = fs.createWriteStream(inputJSONFileName);

        let headerSize = header.length;
        let headerjson = "";
        inputFile.write(header[0])
        headerjson = header[0]
        //let headerText += header[0];
        for (let i = 1; i < header.length; i++) {
            inputFile.write(',' + header[i]);
            headerjson += ',' + header[i];
            //header += ',' + header[i];
            //console.log(header);
        }
        inputFile.write('\n');
        console.log('Writing Data')
        let line = ''
        for (let i = 0; i < points.length; i++) {

            //console.log(i + ' ' + points[i])
            line = points[i][header[0]];


            for (let item = 1; item < headerSize; item++) {
                line += ',' + points[i][header[item]];
            }
            line += '\n';
            inputFile.write(line);
        }

        //AQUI DEBE ESTAR HECHO EL POINTS

        //creating the json file

        let reader = {
            "type": "readers.text",
            "filename": inputFileName,
            "header": headerjson,
            "skip": 1
        };

        let planeFit = {
            "type": "filters.planefit",
            "knn": knn
        }

        let writer = {
            "type": "writers.text",
            "filename": `${outputFileName}`,
            "format": "csv"
        };


        let pipeline = {
            "pipeline":
                [
                    reader,
                    planeFit,
                    writer

                ]
        };

        console.log(pipeline)
        fs.writeFileSync(inputJSONFileName, JSON.stringify(pipeline))

        await this.execPDALPipeline2(inputJSONFileName);
        console.log('Process Finished')

        //filter the points and return only those below threshold
        let filterPoints = async function (header, data) {

            let planepoints = []
            let leftpoints = []
            for (i = 0; i < data.length; i++) {
                //console.log(i);
                let record = data[i];
                if (Number(record[header['PlaneFit']] < Number(threshold))) {
                    planepoints.push(record)
                } else {
                    leftpoints.push(record)
                }

            }

            //nos quedamos con un listado o los puntos? tal vez los indices de los puntos
            let result = { inside: planepoints, outside: leftpoints };
            //            console.log(result)
            return result;
        };



        let res = await this.readPDALCSVNProcess(outputFileName, filterPoints);
        //        let res = await this.readPDALCSVNProcess(outputFileName, avgCovarianceFeatures);

        //console.log(res);

        console.log('Done Executing FiltersCovarianceFeaturesAVG')
        return res;
    },

    /////////////////////////////////////////////////////
    // reading a las file, filtering , creating a CSV and and importing  into postgres/postgis  for further processing/segmentation/classification,  
    importLAS2PostgresKNN: async function (inputlasfile, tablename, knn) {
        console.log('importLAS2PostgresKNN');

        //1) crear un json para procesar el archivo las y aplicar algun filtro/proceso
        //2) procesar en csv, leerlo e importarlo en postgres/postgis, 
        //3) aplicar algun proceso de clasificacion en clases establecidas
        //4) agrupar por conectividad y clase
        //5) resegmentar verticales e inclinados por orientacion
        //6) ya se tiene listo el dataset


        //creating a data file as  
        let randomID = math.random(10000000);
        //let inputFileName = `${this.tmpDirectory}\\pdal_filters_input_${randomID}.txt`;
        let inputJSONFileName = `${this.tmpDirectory}\\pdal_filters_input_json_${randomID}.json`;
        let outputFileName = `${this.tmpDirectory}\\pdal_filters_output_${randomID}.csv`;//for reimporting



        let reader = {
            "type": "readers.las",
            "filename": inputlasfile,

        };


        let optimalNeighborhood = {
            "type": "filters.optimalneighborhood",
            "min_k": knn * 1,
            "max_k": knn * 2
        };

        //este es relevante para calculos posteriores y para que no ocurran errores
        let normals = {
            "type": "filters.normal",
            "knn": knn,
            "refine": true//,
            //"always_up":true

        };


        let eigen = {
            "type": "filters.eigenvalues",
            "knn": knn,
            "normalize": true
        };

        let covarianceFeatures = {
            "type": "filters.covariancefeatures",
            "knn": knn,
            "threads": 8,
            "feature_set": "Linearity,Planarity,Scattering,Verticality,SurfaceVariation,Anisotropy,DemantkeVerticality,Omnivariance,EigenvalueSum"
        };

        let kmeans =
        {
            "type": "filters.lloydkmeans",
            "k": knn,
            "maxiters": 20,
            "dimensions": "Normalx,Normaly,Normalz"
        }

        let planeFit = {
            "type": "filters.planefit",
            "knn": knn
        }

        let reciprocity = {
            "type": "filters.reciprocity",
            "knn": knn
        }

        //with default values
        let coplanar = {
            "type": "filters.approximatecoplanar",
            "knn": knn,
            "thresh1": 25,
            "thresh2": 6
        }

        let writer = {
            "type": "writers.text",
            "filename": `${outputFileName}`,
            "format": "csv"
        };

        let pipeline = {
            "pipeline":
                [
                    reader,
                    eigen,
                    normals,
                    optimalNeighborhood,
                    covarianceFeatures,
                    //                    kmeans,
                    //                    planeFit,
                    //                    reciprocity,
                    //                    coplanar,
                    writer

                ]
        };

        console.log(pipeline)
        //writing json file pipeline
        fs.writeFileSync(inputJSONFileName, JSON.stringify(pipeline));

        await this.execPDALPipeline2(inputJSONFileName);
        console.log('PDAL Process Finished')
        console.log(`WRitten @ ${outputFileName}`)


        //in this case, a simple function  for inserting SQL is donde

        let insertSQL = async function (data, params) {
            //sql fields
            let fields = {
                "id": 'bigserial',
                "X": 'double precision',
                "Y": 'double precision',
                "Z": 'double precision',
                "Intensity": 'integer',
                "ReturnNumber": 'integer',
                "NumberOfReturns": 'integer',
                "ScanDirectionFlag": 'double precision',
                "EdgeOfFlightLine": 'double precision',
                "Classification": 'integer',
                "ScanAngleRank": 'integer',
                "UserData": 'integer',
                "PointSourceId": 'integer',
                "Red": 'integer',
                "Green": 'integer',
                "Blue": 'integer',
                "NormalX": 'double precision',
                "NormalY": 'double precision',
                "NormalZ": 'double precision',
                "Curvature": 'double precision',

                "Anisotropy": 'double precision',
                "DemantkeVerticality": 'double precision',
                //"Density": 'double precision',
                //"Eigenentropy": 'double precision',
                "Linearity": 'double precision',
                "Omnivariance": 'double precision',
                "Planarity": 'double precision',
                "Scattering": 'double precision',
                "EigenvalueSum": 'double precision',
                "SurfaceVariation": 'double precision',
                "Verticality": 'double precision',

                "OptimalKNN": 'double precision',// para comenzar con la primera clasificacion
                "OptimalRadius": 'double precision',// para comenzar con la primera clasificacion

                "Eigenvalue0": 'double precision',
                "Eigenvalue1": 'double precision',
                "Eigenvalue2": 'double precision',

                //empezamos con los campos adicionales
                "id_rand": 'integer',
                "class_1": 'integer',// para comenzar con la primera clasificacion
                "gpstime": 'character varying'// para comenzar con la primera clasificacion

            };

            let header = params['header'];

            //esto viene del header



            let table = params['table']

            let batchSize = 5000;
            let sqlCreateTable = `DROP TABLE IF EXISTS ${table};CREATE TABLE ${table} (`;

            let fieldnames = Object.keys(fields);
            let i = 0;

            //filling inserts  and create table
            sqlCreateTable += `${fieldnames[i].toLowerCase()} ${fields[fieldnames[i]]} `;
            for (i = 1; i < fieldnames.length; i++) {
                sqlCreateTable += `, ${fieldnames[i].toLowerCase()} ${fields[fieldnames[i]]} `;
            }
            sqlCreateTable += `);`
            ////////////////
            console.log(sqlCreateTable);
            await db.any(sqlCreateTable, {});//intentando crear la tabla


            //////////////////////////////////////
            //procedding with the values to insert
            i = 0;

            let csvkeys = Object.keys(header);
            let sqlInsert = `INSERT INTO ${table} (`
            sqlInsert += `${csvkeys[i].toLowerCase()} `;

            for (i = 1; i < csvkeys.length; i++) {
                sqlInsert += `, ${csvkeys[i].toLowerCase()} `;
            }
            sqlInsert += `) VALUES `


            console.log(sqlInsert);

            let fill = true;
            ///////////////////////
            //
            if (fill) {

                //filling data values in  blocks
                let batch = [];
                for (i = 0; i < data.length; i++) {//each record

                    let values = '(';
                    let j = 0;
                    let record = data[i]
                    values += `${Number(record[header[csvkeys[j]]])} `

                    for (j = 1; j < csvkeys.length; j++) {
                        values += `, ${Number(record[header[csvkeys[j]]])}`
                    }
                    values += ')';
                    batch.push(values);

                    //si ya se juntan los 5000
                    if ((batch.length == batchSize) || (i == data.length - 1)) {
                        //commit the  insert;
                        let sqlcommit = sqlInsert;
                        sqlcommit += batch[0];
                        for (let k = 1; k < batch.length; k++) {
                            sqlcommit += `,${batch[k]}`
                        }
                        sqlcommit += ';'
                        await db.any(sqlcommit, {});//inserting a batch of batchsize
                        batch = [];//resetting 
                    }

                }
            }
            ////////////////////
            return data.length;
        };

        let params = { table: tablename }
        let res = this.readPDALCSVNProcess(outputFileName, insertSQL, params);

        console.log(res);

        console.log('Done Executing')

    },

    importLAS2PostgresPlain: async function (inputlasfile, tablename, dropTable) {
        console.log('importLAS2PostgresPlain');
        //1) crear un json para procesar el archivo las y aplicar algun filtro/proceso
        //2) procesar en csv, leerlo e importarlo en postgres/postgis, 
        //3) aplicar algun proceso de clasificacion en clases establecidas
        //4) agrupar por conectividad y clase
        //5) resegmentar verticales e inclinados por orientacion
        //6) ya se tiene listo el dataset


        //creating a data file as  
        let randomID = math.random(10000000);
        //let inputFileName = `${this.tmpDirectory}\\pdal_filters_input_${randomID}.txt`;
        let inputJSONFileName = `${this.tmpDirectory}\\pdal_filters_input_json_${randomID}.json`;
        let outputFileName = `${this.tmpDirectory}\\pdal_filters_output_${randomID}.csv`;//for reimporting



        let reader = {
            "type": "readers.las",
            "filename": inputlasfile,

        };



        let writer = {
            "type": "writers.text",
            "filename": `${outputFileName}`,
            "format": "csv"
        };

        let pipeline = {
            "pipeline":
                [
                    reader,
                    writer

                ]
        };

        // console.log(pipeline)
        //writing json file pipeline
        fs.writeFileSync(inputJSONFileName, JSON.stringify(pipeline));

        await this.execPDALPipeline2(inputJSONFileName);
        console.log('PDAL Process Finished')
        console.log(`WRitten @ ${outputFileName}`)


        //in this case, a simple function  for inserting SQL is donde

        let insertSQL = async function (data, params) {
            //sql fields
            let fields = {
                "id": 'bigserial',
                "X": 'double precision',
                "Y": 'double precision',
                "Z": 'double precision',
                "Intensity": 'integer',
                "ReturnNumber": 'integer',
                "NumberOfReturns": 'integer',
                "ScanDirectionFlag": 'double precision',
                "EdgeOfFlightLine": 'double precision',
                "Classification": 'integer',
                "ScanAngleRank": 'integer',
                "UserData": 'integer',
                "PointSourceId": 'integer',
                "GpsTime": 'character varying',
                "Red": 'integer',
                "Green": 'integer',
                "Blue": 'integer',
                "NormalX":'double precision',
                "NormalY":'double precision',
                "NormalZ":'double precision',

                "Linearity":'double precision',
                "Planarity":'double precision',
                "Verticality":'double precision',
                "Scattering":'double precision',
                "Curvature":'double precision'

            };

            let header = params['header'];

            //esto viene del header



            let table = params['table']

            let batchSize = 50000;


            if (dropTable) {
                console.log('DROPING ' + table)
                let sqlCreateTable = `DROP TABLE IF EXISTS ${table};CREATE TABLE ${table} (`;

                let fieldnames = Object.keys(fields);
                let i = 0;

                //filling inserts  and create table
                sqlCreateTable += `${fieldnames[i].toLowerCase()} ${fields[fieldnames[i]]} `;
                for (i = 1; i < fieldnames.length; i++) {
                    sqlCreateTable += `, ${fieldnames[i].toLowerCase()} ${fields[fieldnames[i]]} `;
                }
                sqlCreateTable += `);`
                ////////////////
                console.log(sqlCreateTable);
                await db.any(sqlCreateTable, {});//intentando crear la tabla

            }

            //////////////////////////////////////
            //procedding with the values to insert


            let csvkeys = Object.keys(header);
            let sqlInsert = `INSERT INTO ${table} (`
            sqlInsert += `${csvkeys[0].toLowerCase()} `;

            for (let i = 1; i < csvkeys.length; i++) {
                sqlInsert += `, ${csvkeys[i].toLowerCase()} `;
            }
            sqlInsert += `) VALUES `


            console.log(sqlInsert);

            let fill = true;
            ///////////////////////
            //
            if (fill) {

                //filling data values in  blocks
                let batch = [];
                console.log('INSERTING ' + data.length);
                for (let r = 0; r < data.length; r++) {//each record

                    let values = '(';
                    let j = 0;
                    let record = data[r]
                    values += `${Number(record[header[csvkeys[j]]])} `

                    for (j = 1; j < csvkeys.length; j++) {
                        values += `, ${Number(record[header[csvkeys[j]]])}`
                    }
                    values += ')';
                    batch.push(values);

                    //si ya se juntan los 5000 o si llega al final
                    if ((batch.length == batchSize) || (r == (data.length - 1))) {

                        console.log('Done inserting batch of ' + batch.length + ' elements of ' + r + '/' + data.length);



                        //commit the  insert;
                        let sqlcommit = sqlInsert;
                        sqlcommit += batch[0];
                        for (let k = 1; k < batch.length; k++) {
                            sqlcommit += `,${batch[k]}`
                        }
                        sqlcommit += ';'
                        await db.none(sqlcommit, {});//inserting a batch of batchsize
                        batch = [];//resetting 

                    }//else, keep adding

                }
                console.log('Done reading...')
            }
            ////////////////////
            return data.length;
        };

        let params = { table: tablename }
        let res = await this.readPDALCSVNProcess(outputFileName, insertSQL, params);
        //aparentemente no se espera y bloquea todo
        console.log(res);

        console.log('Done Executing')

    },


    /////////////////////////////////////////////////////////////////////////////////////////////////////
    //funcion para lws y koa, extraen los datos directo de la db
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

    //http://127.0.0.1:8002/pdal/filtersNormalAVGService?segmentid=417380&knn=50
    filtersNormalAVGService: async function (ctx) {

        console.log("-------------------------------");

        console.log("GET filtersNormalAVGService");
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
        let knn = parametros['knn'] ? parametros['knn'] : 50;


        console.log(sid)
        // se usa la columna de merged para corregir las coas 
        config = { table: 'cgeo_180209_11m_22012020_5cm_fix_segmented', column: 'id_rand_4_merged', knn: 50 };
        let fields = ' x, y, z ';
        let segmentQuery = `SELECT ${fields} FROM ${config.table} WHERE ${config.column} = ${sid}`

        let points = await db.any(segmentQuery, {});

        //not used yet
        let always_up = false;
        let viewpoint = { x: 0, y: 0, z: 0 };
        refine = true;
        //let knn = 8;
        let header = ['x', 'y', 'z'];

        //por alguna razon no espera
        let result = await PDALFunctions.filterNormalsPDAL(points, header, knn, viewpoint, always_up, refine, null, null)

        console.log("OUTPUT: " + result)

        let results = { segmentid: sid, numPoints: points.length, nx: result[0], ny: result[1], nz: result[2] };

        ctx.body = JSON.stringify(results);//so it can be further processed into potree
    },

    //http://127.0.0.1:8002/getConnectedComponents?segmentid=417380
    filtersCovarianceFeaturesAVGService: async function (ctx) {

        console.log("-------------------------------");

        console.log("GET filtersCovarianceFeaturesAVGService");
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
        let knn = parametros['knn']


        console.log(sid)
        // se usa la columna de merged para corregir las coas 
        config = { table: 'cgeo_180209_11m_22012020_5cm_fix_segmented', column: 'id_rand_4_merged', knn: 50 };
        let fields = ' x, y, z ';
        let segmentQuery = `SELECT ${fields} FROM ${config.table} WHERE ${config.column} = ${sid}`

        let points = await db.any(segmentQuery, {});

        let header = ['x', 'y', 'z'];
        //not used yet
        let always_up = false;
        let viewpoint = { x: 0, y: 0, z: 0 };
        refine = true;
        //let knn = 8;

        let result = await PDALFunctions.filterCovarianceFeaturesPDAL(points, header, knn)

        console.log("OUTPUT: " + result)

        let results = {
            segmentid: sid, numPoints: points.length,
            planarity: result['planarity'],
            linearity: result['linearity'],
            verticality: result['verticality'],
            scattering: result['scattering']
        };

        ctx.body = JSON.stringify(results);//so it can be further processed into potree
    }






}




//codigo para el levantar el servidor HTTP
//el servidor debe contar con una ruta y una funcion que genera la respuesta
//las rutas se describen empleando las expresiones regulares de express : https://expressjs.com/en/guide/routing.html
//aunque para los fines didacticos, se emplean rutas estaticas

//ver el ejemplo basado en rest en
//https://github.com/lwsjs/local-web-server/wiki/How-to-prototype-a-REST-API

class PDALFunctionsServer {



    constructor() {
        console.log('Starting...');
    }

    middleware() {//koa AND LWS BASED
        const router = require('koa-route')

        const endpoints = [
            //The Server listens for requests on 
            //            router.get('/clouds/*/cloud.js', postCloudJS),//devuelve el archivo clsouroudjs basado en el bbox de la tabla especificada en el path despues de clouds/
            //llamada a una funcion para dado un segmento, calcualr su espacio en voxeles, de donde se puede tererminar si esta distribuido uniforme o no
            //    router.post('/clouds/*/data/r/*', getSegmentVoxelSpace),//devuelve un listado de nubes


            router.get('/', PDALFunctions.getInfoService),
            router.get('/pdal/filtersNormalAVG*', PDALFunctions.filtersNormalAVGService),//receives a set of points and process it internally, returning the enhanced dataset
            router.get('/pdal/filtersCovarianceFeaturesAVG*', PDALFunctions.filtersCovarianceFeaturesAVGService)//receives a set of points and process it internally, returning the enhanced dataset




        ];
        return endpoints;
    }
}






console.log('Running PDALFunctionsServer with .. .' + dbconnection.database + "@" + dbconnection.host);
module.exports = PDALFunctionsServer;



/*
 Commandline functions for pdal
*/
async function main() {


    console.log(`Server startup:
    
        npx lws --stack  lws-static lws-cors pdal_server.js
        
        `)

    console.log(`Stanalone classification starts with:    
    
          node --max-old-space-size=4096 pdal_server.js computeSegmentVoxelSpace_geom table segmentID cellsize (meters)
    
  


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

    if (operation1 == "getSegmentNormals") {
        console.log("***********************************************************")
        console.log("********* GET SEGMENT NORMALS ******************************")
        config = { table: 'cgeo_180209_11m_22012020_5cm_fix_segmented', segmentID: 98810, column: 'id_rand_4_merged', cellsize: 0.20 };
        if (ids != null) config.segmentID = ids;
        //  


        if (ids) {
            config.segmentID = ids;
        }


        let knn = arguments[4] ? arguments[4] : 50;;



        let segmentQuery = `SELECT * FROM ${config.table} WHERE ${config.column}=${config.segmentID}`;
        console.log(segmentQuery);
        let results = await db.any(segmentQuery, {});
        let header = ['id', 'x', 'y', 'z'];

        let always_up = false;
        let viewpoint = { x: 0, y: 0, z: 0 };
        refine = true;
        //let knn = 8;
        let result = await PDALFunctions.filterNormalsPDAL(results, header, knn, always_up, viewpoint, refine, null, null);
        console.log("OUTPUT: " + result)

    }

    if (operation1 == "readCSV") {
        console.log('READ CSV')
        if (arguments[3]) {
            let ids = arguments[3];

        }

        let funct = async function (header, data) {
            let x = 0;
            let y = 0;
            let z = 0;

            for (i = 0; i < data.length; i++) {
                //console.log(i);
                let record = data[i];
                x += Number(record[header['NormalX']])
                y += Number(record[header['NormalY']]);
                z += Number(record[header['NormalZ']]);
                //console.log(x + ' ' + y + ' ' + z)
            }
            x = x / data.length;
            y = y / data.length;
            z = z / data.length;
            console.log([x, y, z])
            return [x, y, z];
        };

        PDALFunctions.readPDALCSVNProcess(ids, funct, params);
    }

    if (operation1 == "filterPlaneFit") {
        console.log("***********************************************************")
        console.log("********* filterPlaneFit  segmentid  knn threshold(0-1.0)******************************")
        config = { table: 'cgeo_180209_11m_22012020_5cm_fix_segmented', segmentID: 98810, column: 'id_rand_4_merged' };
        if (ids != null) config.segmentID = ids;
        //  




        let knn = arguments[4] ? arguments[4] : 50;;
        let threshold = arguments[5] ? arguments[5] : 0.1;




        let segmentQuery = `SELECT * FROM ${config.table} WHERE ${config.column}=${config.segmentID}`;
        console.log(segmentQuery);
        let results = await db.any(segmentQuery, {});
        let header = ['id', 'x', 'y', 'z'];

        let threads = 4;
        //let knn = 30;
        let result = await PDALFunctions.filterPlaneFitPDAL(results, header, knn, threads, threshold);
        //me debe regresar un listado con datos dentro y fuera
        //console.log("OUTPUT: " + result)
        /*
                console.log('---------------------');
                console.log('ID,x,y,z,dist')
                for (let i = 0; i < result.inside.length; i++) {
                    console.log(result.inside[i][0] + ',', Number(result.inside[i][1]) + ',', Number(result.inside[i][2]) + ',', Number(result.inside[i][3]) + ',', Number(result.inside[i][4]))
                }
                */
        //exporting for python arrays
        let xarray = 'xs=[' + result.inside[0][1];
        let yarray = 'ys=[' + result.inside[0][2];
        let zarray = 'zs=[' + result.inside[0][3];
        for (let i = 1; i < result.inside.length; i++) {
            xarray += ',' + Number(result.inside[i][1]);
            yarray += ',' + Number(result.inside[i][2]);
            zarray += ',' + Number(result.inside[i][3]);
        }

        xarray += ']';
        yarray += ']';
        zarray += ']';
        console.log(xarray)
        console.log(yarray)
        console.log(zarray)

        /*
        console.log ('------------- OUTSIDE ---------------')
        console.log('ID,x,y,z,dist')
        for (let i=0; i < result.outside.length; i++){
            console.log(result.outside[i][0] + ',',Number(result.outside[i][1]) + ',',Number(result.outside[i][2]) + ',',Number( result.outside[i][3]) + ',', Number(result.outside[i][4] ))
        }
*/


    }

    if (operation1 == "insertLAS") {
        console.log("***** insertLAS ******************************************************")
        console.log(`usage:  node  insertLAS <LASFILE> <tablename> >  `)

        //let lasfile = arguments[3];
        //let table = arguments[3] ? arguments[4] : arguments[3].replace('.las', '_las');
        let filename = arguments[3];
        let table = arguments[4];

        //let knn = arguments[5] ? arguments[5] : 50;;

        //console.log(`RUNING  insertLAS ${lasfile} ${table}   `)


        //    importLAS2Postgres: function (inputlasfile, filters, knn, db, tablename) {

        


           /* 'tiles_tlal_4c32w_filt_11.las',
            'tiles_tlal_4c32w_filt_12.las',
            'tiles_tlal_4c32w_filt_13.las',
            'tiles_tlal_4c32w_filt_14.las',
            'tiles_tlal_4c32w_filt_15.las',
            'tiles_tlal_4c32w_filt_19.las',
            'tiles_tlal_4c32w_filt_20.las',
            'tiles_tlal_4c32w_filt_21.las',
            'tiles_tlal_4c32w_filt_22.las',
            'tiles_tlal_4c32w_filt_23.las',
            'tiles_tlal_4c32w_filt_25.las',
            'tiles_tlal_4c32w_filt_26.las',
            'tiles_tlal_4c32w_filt_27.las',
            'tiles_tlal_4c32w_filt_28.las',
            'tiles_tlal_4c32w_filt_29.las',
            'tiles_tlal_4c32w_filt_3.las',
            'tiles_tlal_4c32w_filt_30.las',
            'tiles_tlal_4c32w_filt_31.las',
            'tiles_tlal_4c32w_filt_33.las',
            'tiles_tlal_4c32w_filt_34.las',
            'tiles_tlal_4c32w_filt_35.las',
            'tiles_tlal_4c32w_filt_36.las',
            'tiles_tlal_4c32w_filt_37.las',
            'tiles_tlal_4c32w_filt_38.las',
            'tiles_tlal_4c32w_filt_39.las',
            'tiles_tlal_4c32w_filt_4.las',
            'tiles_tlal_4c32w_filt_41.las',
            'tiles_tlal_4c32w_filt_42.las',
            'tiles_tlal_4c32w_filt_43.las',
            'tiles_tlal_4c32w_filt_44.las',
            'tiles_tlal_4c32w_filt_45.las',
            'tiles_tlal_4c32w_filt_46.las',
            'tiles_tlal_4c32w_filt_47.las',
            'tiles_tlal_4c32w_filt_5.las',
            'tiles_tlal_4c32w_filt_50.las',
            'tiles_tlal_4c32w_filt_51.las',
            'tiles_tlal_4c32w_filt_52.las',
            'tiles_tlal_4c32w_filt_53.las',
            'tiles_tlal_4c32w_filt_54.las',
            'tiles_tlal_4c32w_filt_55.las',
            'tiles_tlal_4c32w_filt_58.las',
            'tiles_tlal_4c32w_filt_59.las',
            'tiles_tlal_4c32w_filt_6.las',
            'tiles_tlal_4c32w_filt_60.las',
            'tiles_tlal_4c32w_filt_61.las',
            'tiles_tlal_4c32w_filt_62.las',
            'tiles_tlal_4c32w_filt_63.las',
            'tiles_tlal_4c32w_filt_68.las',
            'tiles_tlal_4c32w_filt_69.las',
            'tiles_tlal_4c32w_filt_7.las',
            'tiles_tlal_4c32w_filt_70.las',
            'tiles_tlal_4c32w_filt_71.las',
            'tiles_tlal_4c32w_filt_8.las' */
            
        let files=['UNAM-000090_norm_cov_knn30.las'];
        let dropTable = true;


        if (filename) {
            console.log('*****************************\nINSERTING SINGLE FILE')
            console.log(filename);
//            let table = filename.substring(0, filename.length - 4);
            //let table = filename.substring(0, filename.length - 4);
            console.log(`inserting  ${filename} into ${table}`)
            let result = await PDALFunctions.importLAS2PostgresPlain(`${filename}`, `${table}`, dropTable);
            dropTable = true;

        } else {
            console.log('RUNNING IN BATCH MODE')

            //        D:\CENTROGEO_seleccion_tlalpan\LiDAR\tiles_4km_renamed
            for (let i = 0; i < files.length; i++) {
                let table = files[i].substring(0, files[i].length - 4);
                let path=`D:\\CENTROGEO_seleccion_tlalpan\\LiDAR\\tiles_3k_tlal_filt`
                console.log(`inserting  ${path}\\${files[i]} into ${table}`)

                let result = await PDALFunctions.importLAS2PostgresPlain(`${path}\\${files[i]}`, `${files[i].substring(0, files[i].length - 4)}`, dropTable);
                dropTable = true;
            }

        }
    }


}

main();

