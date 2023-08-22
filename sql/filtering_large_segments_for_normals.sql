---select * from cgeo_180209_11m_22012020_5cm_fix_attributes where nx is not   null
--select nx,ny,nz from cgeo_180209_11m_22012020_5cm_fix_attributes where segment_id=4
with list as(
select distinct(id_rand_4_merged) ids, count(*) count from cgeo_180209_11m_22012020_5cm_fix_segmented group by id_rand_4_merged order by ids    
)

select * from list where count < 50 order by ids


--update cgeo_180209_11m_22012020_5cm_fix_attributes set nx=0,ny=0,nz=0;

select * from cgeo_180209_11m_22012020_5cm_fix_attributes where ny <>0
