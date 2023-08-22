alter table tiles_tlal_4c32w_46 add column geom geometry;
update tiles_tlal_4c32w_46 set geom= st_makepoint(x,y,z);
CREATE INDEX  tiles_tlal_4c32w_46_geom_idx ON  tiles_tlal_4c32w_46 USING gist(geom);
