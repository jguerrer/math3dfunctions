var fs = require('fs');

let files = [
  'tiles_tlal_4c32w_3.las',
  'tiles_tlal_4c32w_4.las',
  'tiles_tlal_4c32w_5.las',
  'tiles_tlal_4c32w_6.las',
  'tiles_tlal_4c32w_7.las',
  'tiles_tlal_4c32w_8.las',
  'tiles_tlal_4c32w_11.las',
  'tiles_tlal_4c32w_12.las',
  'tiles_tlal_4c32w_13.las',
  'tiles_tlal_4c32w_14.las',
  'tiles_tlal_4c32w_15.las',
  'tiles_tlal_4c32w_19.las',
  'tiles_tlal_4c32w_20.las',
  'tiles_tlal_4c32w_21.las',
  'tiles_tlal_4c32w_22.las',
  'tiles_tlal_4c32w_23.las',
  'tiles_tlal_4c32w_25.las',
  'tiles_tlal_4c32w_26.las',
  'tiles_tlal_4c32w_27.las',
  'tiles_tlal_4c32w_28.las',
  'tiles_tlal_4c32w_29.las',
  'tiles_tlal_4c32w_30.las',
  'tiles_tlal_4c32w_31.las',
  'tiles_tlal_4c32w_33.las',
  'tiles_tlal_4c32w_34.las',
  'tiles_tlal_4c32w_35.las',
  'tiles_tlal_4c32w_36.las',
  'tiles_tlal_4c32w_37.las',
  'tiles_tlal_4c32w_38.las',
  'tiles_tlal_4c32w_39.las',
  'tiles_tlal_4c32w_41.las',
  'tiles_tlal_4c32w_42.las',
  'tiles_tlal_4c32w_43.las',
  'tiles_tlal_4c32w_44.las',
  'tiles_tlal_4c32w_45.las',
  'tiles_tlal_4c32w_46.las',
  'tiles_tlal_4c32w_47.las',
  'tiles_tlal_4c32w_50.las',
  'tiles_tlal_4c32w_51.las',
  'tiles_tlal_4c32w_52.las',
  'tiles_tlal_4c32w_53.las',
  'tiles_tlal_4c32w_54.las',
  'tiles_tlal_4c32w_55.las',
  'tiles_tlal_4c32w_58.las',
  'tiles_tlal_4c32w_59.las',
  'tiles_tlal_4c32w_60.las',
  'tiles_tlal_4c32w_61.las',
  'tiles_tlal_4c32w_62.las',
  'tiles_tlal_4c32w_63.las',
  'tiles_tlal_4c32w_68.las',
  'tiles_tlal_4c32w_69.las',
  'tiles_tlal_4c32w_70.las',
  'tiles_tlal_4c32w_71.las'

];

//creamos un script adicional para refiltrar los las, quitar mas ruido y conservar solo el gnd

let pdal_bat_script='';
let pdal_Script_file = fs.createWriteStream('filter_pdal_tlalpan.bat');




for (let i = 0; i < files.length; i++) {
  let name = files[i].substring(0, files[i].length - 4);//el nombre de el archivo sin extension
  let index = name.split('_');//dividimos por underscore
  index = index[index.length - 1];

  pdal_bat_script+=`pdal pipeline ${name}.json -v 8\n`;
  let jsonfile = fs.createWriteStream(name+'.json');


  //each file is refiltered with a larger cell and smaller thresholds
  //console.log('[');

  let pdalSCRIPT = `
    [
            {
                "type":"readers.las",
                "filename":"${files[i]}"
              },
              
              {
                  "type":"filters.smrf",
                  "cell":8.0,
                  "scalar":1.25,
                  "slope":0.25,
                  "threshold":0.3,
                  "window":32.0
              },
              {
                  "type":"filters.outlier",
                  "method":"statistical",
                  "mean_k":8,
                  "multiplier":2.0
              },
              {
                "type":"filters.range",
                "limits":"Classification[2:2]"
              }
              ,
              {
                "type":"writers.las",
                "filename":"${name}_fgnd.las"
              }
            ]
            `;

  //console.log(pdalSCRIPT);
           
  jsonfile.write(pdalSCRIPT);

}//each 

pdal_Script_file.write(pdal_bat_script)

;

