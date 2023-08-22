
//start date:   16/06/2021
//npx lws --stack  lws-body-parser lws-static lws-cors spatial_functions_server.js   

console.log('PDAL  FUNCTIONS SERVER V0.1');
console.log('IS a gateway to make calls to PDAL ');
console.log('Data is streamed from postgis and postgres');
console.log('Results vary depending on the operation but mostly is for interacting with other software.');
console.log('Server is implementd on KOA, LWS  and plugins');
console.log('V0.1');

//codigo de conexion con PGPROMISE

const initOptions = {/* initialization options */ };
const pgp = require('pg-promise')(initOptions);
//const consultas = require('./spatialFunctions');
const { exec } = require('child_process');
//var mathf3d = require('./MathFunctions3D');//ya se esta importando
const math = require('mathjs')
var fs = require('fs');




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
const { formatWithOptions } = require('util');
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

let dbconnection = connection;
const db = pgp(dbconnection);


/** 
* PDAL gateway is a way of interacting with pdal by creating json pipelines so they can be streamed .

* The first need is to process the covariance features from postgres and postgis tables so light clients can interact in realtime with the results from potree or other stuff


*/


/////////////////


let pdalFunctions = module.exports = {


     featureset:{
        anisotropy: 'Anisotropy',
        demantke: 'DemantkeVerticality',
        density: 'Density',
        eigentropy: 'Eigenentropy',
        linearity: 'Linearity',
        omnivariance: 'Omnivariance',
        planarity: 'Planarity',
        scattering: 'Scattering',
        eigenvaluesum: 'EigenvalueSum',
        surfacevariation: 'SurfaceVariation',
        verticality: 'Verticality',
        all: 'all'

    },

    /**
     * TODO, not defined yet or use the covariance 
     */


    getCovarianceFeatures: async function (table, column_id, segment_id, knn, threads, featureser) {

        let querySegment = `
            select x,y,z,id  from ${table} where ${column_id} = ${segment_id}  
        `;
        console.log(querySegment);
        let results = await db.any(querySegment, {});//esperamos los resultados de la consulta con await

        console.log('Query DOne  ' + results.length + ' results')

        //habra que pasarle esto a pdal como buffer o texto o no se como

        let rand= math.randomInt(1000000) ;
        let datafilename= 'pdal_' + rand + '.txt';
        let temporaryTXTFile = fs.createWriteStream(datafilename);
        temporaryTXTFile.write('X,Y,Z,ID\n');

        for (let i = 0; i < results.length; i++) {
            //AQUI VACIAMOS LOS DATOS
            temporaryTXTFile.write( results[i].x + ',' + results[i].y + ',' + results[i].z + ',' + results[i].id + '\n');

        }

        let jsonfilename= 'pdal_' + rand + '.json';
        let temporaryJSONfile = fs.createWriteStream(   jsonfilename)     ;
        

        let pipelineJSON = `[
            {
                "type":"readers.text",
                "filename":"${datafilename}",
                "header":"x,y,z,id",
                "skip":1
            },
        
            {
                "type":"filters.covariancefeatures",
                "knn":10,
                "threads": 4,
                "feature_set": "Linearity,Planarity,Scattering,Verticality,Dimensionality"
            },
        
        
            {
                "type":"writers.text",
                "filename":"${datafilename}.covariance.txt",
                "format":"csv"
        
            }
        ]
        `;

        temporaryJSONfile.write(pipelineJSON.toString());
        let commandline="C:\\OSGeo4W\\bin\\pdal pipeline --verbose 8 -i " + jsonfilename;
        console.log(commandline);
        exec(commandline, (error, stdout, stderr) => {
            if (error) {
                console.log(`error ${error.message} `);
                return;
            }

            if (stderr) {
                console.log(`stderr ${stderr} `);
                return;
            }
            console.log(`--------------`);

            console.log(`stdout ${stdout} `);
        });

    }


};

async function main() {

    let arguments = process.argv
    let parameters = [];

    arguments.forEach(function (val, index, array) {
        parameters[val] = true;//debe guardar el store

    });
    let operation1 = arguments[2];
    let ids = arguments[3];
    let store = parameters['store'] ? true : false;;
    let config;

    if (operation1 == "getpdalcov") {
        console.log("***********************************************************")
        console.log(" ")
        config = { table: 'cgeo_180209_11m_22012020_5cm_fix_segmented', segmentID: 98810, columns: 'id_rand_4' };


        //computeTouchesVoxels('centrogeo_segmented_tmp', 1459346,1459668, 0.25);//true
        if (ids != null) config.segmentID = ids;
        let result = pdalFunctions.getCovarianceFeatures(config.table, config.segmentID, config.columns);
        //console.log("OUTPUT: " + result + " Voxels @ cell size  " + config.cellsize)

    }






}

main();

