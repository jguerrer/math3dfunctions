let files = [
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
            'tiles_tlal_4c32w_3.las',
            'tiles_tlal_4c32w_30.las',
            'tiles_tlal_4c32w_31.las',
            'tiles_tlal_4c32w_33.las',
            'tiles_tlal_4c32w_34.las',
            'tiles_tlal_4c32w_35.las',
            'tiles_tlal_4c32w_36.las',
            'tiles_tlal_4c32w_37.las',
            'tiles_tlal_4c32w_38.las',
            'tiles_tlal_4c32w_39.las',
            'tiles_tlal_4c32w_4.las',
            'tiles_tlal_4c32w_41.las',
            'tiles_tlal_4c32w_42.las',
            'tiles_tlal_4c32w_43.las',
            'tiles_tlal_4c32w_44.las',
            'tiles_tlal_4c32w_45.las',
            'tiles_tlal_4c32w_46.las',
            'tiles_tlal_4c32w_47.las',
            'tiles_tlal_4c32w_5.las',
            'tiles_tlal_4c32w_50.las',
            'tiles_tlal_4c32w_51.las',
            'tiles_tlal_4c32w_52.las',
            'tiles_tlal_4c32w_53.las',
            'tiles_tlal_4c32w_54.las',
            'tiles_tlal_4c32w_55.las',
            'tiles_tlal_4c32w_58.las',
            'tiles_tlal_4c32w_59.las',
            'tiles_tlal_4c32w_6.las',
            'tiles_tlal_4c32w_60.las',
            'tiles_tlal_4c32w_61.las',
            'tiles_tlal_4c32w_62.las',
            'tiles_tlal_4c32w_63.las',
            'tiles_tlal_4c32w_68.las',
            'tiles_tlal_4c32w_69.las',
            'tiles_tlal_4c32w_7.las',
            'tiles_tlal_4c32w_70.las',
            'tiles_tlal_4c32w_71.las',
            'tiles_tlal_4c32w_8.las'

        ];



        let dropTable = true;

        for (let i = 0; i < files.length; i++) {
            let table = files[i].substring(0, files[i].length - 4);


          //este script genera los indices auxiliares y las columnas necesarias para operar, en particular la triangulacion del buffer
            let script=
            `
--            alter table ${table} add column geom geometry;
--            update ${table} set geom= st_makepoint(x,y,z);
--            CREATE INDEX  ${table}_id_idx ON  ${table} USING btree(id);

--            CREATE INDEX  ${table}_geom_idx ON  ${table} USING gist(geom);
--            CREATE INDEX  ${table}_class_idx ON  ${table} USING btree(classification);
--            select (st_dump(ST_ConstrainedDelaunayTriangles(st_collect(geom)))).geom into ${table}_tri   from ${table} where classification = 2;
            CREATE INDEX  ${table}_tri_geom_sidx ON  ${table} USING gist(geom);

            `;

         


            //para cortar la tesela con el grid

            let index=table.split('_');
            index=index[index.length -1]
            let script3=`
            CREATE INDEX  ${table}_tri_cut_geom_idx ON  ${table}_tri_cut USING gist(geom);
            --select st_intersection(st_setsrid(tin.geom,32614),tile.geom) geom into ${table}_tri_cut from  ${table}_tri tin ,  tiles3km_tlalpan tile  where   tile.id=${index};
            `;
            //solo faltaria calcular las isolineas

            let addindices=`alter table ${table}_tri_cut add column tid serial;`;
            

            let createTINFixed=`
            update  ${table}_tri set geom=st_setsrid(geom,32614);
            drop  table  if exists ${table}_tri_cut cascade;
            drop  table  if exists ${table}_tri_points cascade;
            drop  table  if exists ${table}_final cascade;
            with intersected as (
                select 
                    st_intersection(a1.geom,tile.geom) inter ,                      tile.geom tiled,                      tile.id tiledid
                from 
                  tiles3km_tlalpan tile,                   ${table}_tri a1 
                  where   st_intersects(a1.geom,tile.geom) and tile.id=${index}
                  )                
                select (st_dumppoints(inter)).geom 
                into ${table}_tri_points                 from intersected                 where st_within( inter,tiled); 
                --ahora rehacemos el delaunay
              select (st_dump(ST_ConstrainedDelaunayTriangles(st_collect(geom)))).geom into ${table}_final   from ${table}_tri_points;
            `; 

            console.log(createTINFixed);
        }



